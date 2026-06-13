/**
 * 云开发工具类
 * 统一管理云端数据库和云存储操作
 * 本地缓存 + 云端同步（离线也能用）
 * 云开发不可用时自动降级到本地存储
 */

// 检查云开发是否可用
const isCloudReady = () => {
  try {
    return typeof wx.cloud !== 'undefined' && wx.cloud
  } catch (e) {
    return false
  }
}

const db = () => {
  if (!isCloudReady()) return null
  try { return wx.cloud.database() } catch (e) { return null }
}

// ===== 画作相关 =====

/**
 * 上传画作到云端
 * @param {string} tempFilePath - 临时文件路径
 * @param {object} drawing - 画作信息
 */
async function uploadDrawing(tempFilePath, drawing) {
  // 云不可用时直接走本地存储
  if (!isCloudReady() || !db()) {
    return localOnly(drawing, tempFilePath)
  }
  try {
    // 上传图片到云存储
    const cloudPath = `drawings/${drawing.id}.png`
    const uploadRes = await wx.cloud.uploadFile({
      cloudPath,
      filePath: tempFilePath
    })

    // 写入云数据库
    await db().collection('drawings').add({
      data: {
        _id: drawing.id,
        cloudFileID: uploadRes.fileID,
        name: drawing.name,
        mode: drawing.mode,
        createTime: drawing.createTime
      }
    })

    // 同时更新本地缓存
    const localDrawings = wx.getStorageSync('drawings') || []
    localDrawings.unshift({
      ...drawing,
      imagePath: uploadRes.fileID // 用云端 fileID 替代本地路径
    })
    wx.setStorageSync('drawings', localDrawings)

    return uploadRes.fileID
  } catch (err) {
    console.warn('云端上传失败，使用本地存储:', err)
    // 降级：保存到本地
    const util = require('./util.js')
    const savedPath = await util.saveImageToPersistent(tempFilePath)
    const localDrawing = { ...drawing, imagePath: savedPath }
    util.saveDrawing(localDrawing)
    return savedPath
  }
}

/**
 * 从云端获取画作列表
 */
async function fetchDrawings() {
  if (!isCloudReady() || !db()) {
    return wx.getStorageSync('drawings') || []
  }
  try {
    const res = await db().collection('drawings')
      .orderBy('createTime', 'desc')
      .limit(100)
      .get()

    // 更新本地缓存
    wx.setStorageSync('drawings', res.data)
    return res.data
  } catch (err) {
    console.warn('云端读取失败，使用本地缓存:', err)
    return wx.getStorageSync('drawings') || []
  }
}

/**
 * 删除云端画作
 */
async function removeDrawing(id) {
  if (isCloudReady() && db()) {
    try {
      await db().collection('drawings').doc(id).remove()
      await wx.cloud.deleteFile({ fileList: [`drawings/${id}.png`] })
    } catch (err) {
      console.warn('云端删除失败:', err)
    }
  }
  // 同时删除本地
  const util = require('./util.js')
  util.deleteDrawing(id)
}

// ===== 刷牙打卡相关 =====

/**
 * 上传刷牙打卡记录到云端
 */
async function uploadBrushingRecord(record) {
  if (!isCloudReady() || !db()) {
    return localOnlyBrushing(record)
  }
  try {
    let cloudFileID = ''

    // 如果有照片，先上传到云存储
    if (record.imagePath && !record.imagePath.startsWith('cloud://')) {
      const cloudPath = `brushing/${record.id}.jpg`
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath,
        filePath: record.imagePath
      })
      cloudFileID = uploadRes.fileID
    }

    // 写入云数据库
    await db().collection('brushingRecords').add({
      data: {
        _id: record.id,
        date: record.date,
        timeOfDay: record.timeOfDay,
        cloudFileID: cloudFileID || record.imagePath,
        score: record.score,
        note: record.note,
        createTime: record.createTime
      }
    })

    // 更新本地缓存
    const localRecords = wx.getStorageSync('brushingRecords') || []
    localRecords.unshift({
      ...record,
      imagePath: cloudFileID || record.imagePath
    })
    wx.setStorageSync('brushingRecords', localRecords)

    return cloudFileID || record.imagePath
  } catch (err) {
    console.warn('云端上传失败，使用本地存储:', err)
    // 降级：保存到本地
    const util = require('./util.js')
    let savedPath = record.imagePath
    if (record.imagePath && !record.imagePath.startsWith(wx.env.USER_DATA_PATH)) {
      savedPath = await util.saveImageToPersistent(record.imagePath)
    }
    const localRecord = { ...record, imagePath: savedPath }
    util.saveBrushingRecord(localRecord)
    return savedPath
  }
}

/**
 * 从云端获取刷牙记录
 */
async function fetchBrushingRecords() {
  if (!isCloudReady() || !db()) {
    return wx.getStorageSync('brushingRecords') || []
  }
  try {
    const res = await db().collection('brushingRecords')
      .orderBy('createTime', 'desc')
      .limit(200)
      .get()

    wx.setStorageSync('brushingRecords', res.data)
    return res.data
  } catch (err) {
    console.warn('云端读取失败，使用本地缓存:', err)
    return wx.getStorageSync('brushingRecords') || []
  }
}

/**
 * 删除云端刷牙记录
 */
async function removeBrushingRecord(id) {
  if (isCloudReady() && db()) {
    try {
      await db().collection('brushingRecords').doc(id).remove()
      await wx.cloud.deleteFile({ fileList: [`brushing/${id}.jpg`] })
    } catch (err) {
      console.warn('云端删除失败:', err)
    }
  }
  // 同时删除本地
  const util = require('./util.js')
  util.deleteBrushingRecord(id)
}

// ===== 本地降级函数（云不可用时使用） =====

// 画作本地保存
async function localOnly(drawing, tempFilePath) {
  const util = require('./util.js')
  const savedPath = await util.saveImageToPersistent(tempFilePath)
  const localDrawing = { ...drawing, imagePath: savedPath }
  util.saveDrawing(localDrawing)
  return savedPath
}

// 刷牙记录本地保存
async function localOnlyBrushing(record) {
  const util = require('./util.js')
  let savedPath = record.imagePath
  if (record.imagePath && !record.imagePath.startsWith(wx.env.USER_DATA_PATH)) {
    savedPath = await util.saveImageToPersistent(record.imagePath)
  }
  const localRecord = { ...record, imagePath: savedPath }
  util.saveBrushingRecord(localRecord)
  return savedPath
}

// ===== 同步工具 =====

/**
 * 同步本地数据到云端（首次连接时用）
 */
async function syncLocalToCloud() {
  try {
    // 同步画作
    const localDrawings = wx.getStorageSync('drawings') || []
    for (const d of localDrawings) {
      if (!d.cloudFileID && d.imagePath) {
        try {
          await db().collection('drawings').doc(d.id).set({
            data: {
              _id: d.id,
              cloudFileID: d.imagePath,
              name: d.name,
              mode: d.mode,
              createTime: d.createTime
            }
          })
        } catch (e) {}
      }
    }

    // 同步刷牙记录
    const localRecords = wx.getStorageSync('brushingRecords') || []
    for (const r of localRecords) {
      try {
        await db().collection('brushingRecords').doc(r.id).set({
          data: {
            _id: r.id,
            date: r.date,
            timeOfDay: r.timeOfDay,
            cloudFileID: r.imagePath || '',
            score: r.score,
            note: r.note,
            createTime: r.createTime
          }
        })
      } catch (e) {}
    }
  } catch (err) {
    console.warn('同步失败:', err)
  }
}

module.exports = {
  uploadDrawing,
  fetchDrawings,
  removeDrawing,
  uploadBrushingRecord,
  fetchBrushingRecords,
  removeBrushingRecord,
  syncLocalToCloud
}
