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
    const cloudImageIDs = []

    // 上传多张图片到云存储
    const images = record.images || (record.imagePath ? [record.imagePath] : [])
    for (let i = 0; i < images.length; i++) {
      const img = images[i]
      if (img && !img.startsWith('cloud://')) {
        const cloudPath = `brushing/${record.id}_${i}.jpg`
        const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: img })
        cloudImageIDs.push(uploadRes.fileID)
        if (i === 0) cloudFileID = uploadRes.fileID
      } else if (img) {
        cloudImageIDs.push(img)
        if (i === 0) cloudFileID = img
      }
    }

    // 写入云数据库
    await db().collection('brushingRecords').add({
      data: {
        _id: record.id,
        date: record.date,
        timeOfDay: record.timeOfDay,
        cloudFileID: cloudFileID || record.imagePath,
        images: cloudImageIDs,
        score: record.score,
        note: record.note,
        createTime: record.createTime
      }
    })

    // 更新本地缓存
    const localRecords = wx.getStorageSync('brushingRecords') || []
    localRecords.unshift({
      ...record,
      imagePath: cloudFileID || record.imagePath,
      images: cloudImageIDs.length > 0 ? cloudImageIDs : images
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

    // 合并本地未同步的记录（本地有但云端没有的）
    const cloudRecords = (res.data || []).map(r => ({
      ...r,
      id: r.id || r._id,
      imagePath: r.cloudFileID || r.imagePath || '',
      images: r.images || (r.cloudFileID ? [r.cloudFileID] : [])
    }))
    const localRecords = wx.getStorageSync('brushingRecords') || []
    const cloudIds = new Set(cloudRecords.map(r => r.id || r._id))
    const unsynced = localRecords.filter(r => !cloudIds.has(r.id))

    const all = [...unsynced, ...cloudRecords]

    // 按 date+timeOfDay 去重，优先保留 fromTimer 的记录
    const dedupMap = {}
    all.forEach(r => {
      const key = `${r.date}_${r.timeOfDay}`
      const existing = dedupMap[key]
      if (!existing || (r.fromTimer && !existing.fromTimer)) {
        dedupMap[key] = r
      }
    })

    const merged = Object.values(dedupMap)
      .sort((a, b) => new Date(b.createTime) - new Date(a.createTime))

    wx.setStorageSync('brushingRecords', merged)
    return merged
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
      // 先获取记录以拿到 images 数组
      const doc = await db().collection('brushingRecords').doc(id).get().catch(() => null)
      const images = (doc && doc.data && doc.data.images) || []
      const fileList = images.filter(img => img && img.startsWith('cloud://'))

      await db().collection('brushingRecords').doc(id).remove()
      if (fileList.length > 0) {
        await wx.cloud.deleteFile({ fileList })
      }
    } catch (err) {
      console.warn('云端删除失败:', err)
    }
  }
  // 同时删除本地
  const util = require('./util.js')
  util.deleteBrushingRecord(id)
}

/**
 * 更新已有刷牙记录（补拍照片等场景）
 * @param {string} timeOfDay - 'morning' | 'evening'
 * @param {object} updates - 要更新的字段，如 { imagePath: '...' }
 */
async function updateBrushingRecord(timeOfDay, updates) {
  const util = require('./util.js')
  const today = util.getTodayStr()

  // 更新本地 storage
  const localRecords = wx.getStorageSync('brushingRecords') || []
  const target = localRecords.find(r => r.date === today && r.timeOfDay === timeOfDay)
  if (!target) throw new Error('未找到对应记录')

  // 持久化图片数组
  let savedImages = updates.images || []
  for (let i = 0; i < savedImages.length; i++) {
    const img = savedImages[i]
    if (img && !img.startsWith(wx.env.USER_DATA_PATH) && !img.startsWith('cloud://')) {
      savedImages[i] = await util.saveImageToPersistent(img)
    }
  }

  // 更新本地记录
  const updatedRecords = localRecords.map(r => {
    if (r.date === today && r.timeOfDay === timeOfDay) {
      return { ...r, ...updates, imagePath: savedImages[0] || updates.imagePath, images: savedImages }
    }
    return r
  })
  wx.setStorageSync('brushingRecords', updatedRecords)

  // 同步更新云端
  if (isCloudReady() && db()) {
    try {
      const cloudImageIDs = []
      for (let i = 0; i < savedImages.length; i++) {
        const img = savedImages[i]
        if (img && !img.startsWith('cloud://')) {
          const cloudPath = `brushing/${target.id}_${i}.jpg`
          const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: img })
          cloudImageIDs.push(uploadRes.fileID)
        } else if (img) {
          cloudImageIDs.push(img)
        }
      }

      const finalRecords = updatedRecords.map(r => {
        if (r.date === today && r.timeOfDay === timeOfDay) {
          return { ...r, imagePath: cloudImageIDs[0] || r.imagePath, images: cloudImageIDs.length > 0 ? cloudImageIDs : savedImages }
        }
        return r
      })
      wx.setStorageSync('brushingRecords', finalRecords)

      await db().collection('brushingRecords').doc(target.id).update({
        data: {
          cloudFileID: cloudImageIDs[0] || '',
          images: cloudImageIDs
        }
      })
    } catch (err) {
      console.warn('云端更新失败，本地已更新:', err)
    }
  }
}

/**
 * 按 ID 更新刷牙记录字段（编辑评分/备注等场景）
 * @param {string} id - 记录 ID
 * @param {object} updates - 要更新的字段
 */
async function updateBrushingRecordById(id, updates) {
  if (isCloudReady() && db()) {
    try {
      await db().collection('brushingRecords').doc(id).update({ data: updates })
    } catch (err) {
      console.warn('云端更新失败:', err)
    }
  }
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
  // 持久化多图数组
  const savedImages = []
  for (const img of (record.images || [])) {
    if (img && !img.startsWith(wx.env.USER_DATA_PATH)) {
      savedImages.push(await util.saveImageToPersistent(img))
    } else if (img) {
      savedImages.push(img)
    }
  }
  const localRecord = { ...record, imagePath: savedPath, images: savedImages.length > 0 ? savedImages : record.images }
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
            images: r.images || [],
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

// ===== 习惯打卡相关 =====

/**
 * 上传习惯打卡记录到云端
 */
async function uploadHabitRecord(record) {
  if (!isCloudReady() || !db()) {
    return localOnlyHabit(record)
  }
  try {
    let cloudFileID = ''
    const cloudImageIDs = []

    // 上传多张图片到云存储
    const images = record.images || (record.imagePath ? [record.imagePath] : [])
    for (let i = 0; i < images.length; i++) {
      const img = images[i]
      if (img && !img.startsWith('cloud://')) {
        const cloudPath = `habits/${record.id}_${i}.jpg`
        const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: img })
        cloudImageIDs.push(uploadRes.fileID)
        if (i === 0) cloudFileID = uploadRes.fileID
      } else if (img) {
        cloudImageIDs.push(img)
        if (i === 0) cloudFileID = img
      }
    }

    // 写入云数据库
    await db().collection('habitRecords').add({
      data: {
        _id: record.id,
        type: record.type,
        date: record.date,
        cloudFileID: cloudFileID || record.imagePath,
        images: cloudImageIDs,
        score: record.score,
        note: record.note,
        createTime: record.createTime
      }
    })

    return cloudFileID || record.imagePath
  } catch (err) {
    console.warn('云端上传失败，使用本地存储:', err)
    return localOnlyHabit(record)
  }
}

// 习惯打卡本地保存
async function localOnlyHabit(record) {
  const util = require('./util.js')
  let savedPath = record.imagePath
  if (record.imagePath && !record.imagePath.startsWith(wx.env.USER_DATA_PATH)) {
    savedPath = await util.saveImageToPersistent(record.imagePath)
  }
  // 持久化多图数组
  const savedImages = []
  for (const img of (record.images || [])) {
    if (img && !img.startsWith(wx.env.USER_DATA_PATH)) {
      savedImages.push(await util.saveImageToPersistent(img))
    } else if (img) {
      savedImages.push(img)
    }
  }
  return savedPath
}

module.exports = {
  isCloudReady,
  uploadDrawing,
  fetchDrawings,
  removeDrawing,
  uploadBrushingRecord,
  fetchBrushingRecords,
  removeBrushingRecord,
  updateBrushingRecord,
  updateBrushingRecordById,
  uploadHabitRecord,
  syncLocalToCloud
}
