/**
 * 云开发工具类
 * 统一管理云端数据库和云存储操作
 * 本地缓存 + 云端同步（离线也能用）
 * 云开发不可用时自动降级到本地存储
 */

// 并发锁，防止 fetchBrushingRecords 竞态条件
let _fetchBrushingLock = null

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
        createTime: record.createTime,
        // 计时器专属字段
        points: record.points || 0,
        completedAreas: record.completedAreas || [],
        duration: record.duration || 0,
        fromTimer: record.fromTimer || false,
        // 故事系统字段
        chapterId: record.chapterId || null,
        enemyId: record.enemyId || null,
        damageDealt: record.damageDealt || 0,
        expGained: record.expGained || 0,
        // 贴纸数据
        stickers: record.stickers || []
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
 * 从云端获取刷牙记录（带并发锁，防止竞态条件）
 */
async function fetchBrushingRecords() {
  // 云端不可用时直接返回本地数据，不走锁逻辑
  if (!isCloudReady() || !db()) {
    return wx.getStorageSync('brushingRecords') || []
  }

  // 如果已有请求在进行中，等待其完成后返回缓存结果
  if (_fetchBrushingLock) {
    await _fetchBrushingLock
    return wx.getStorageSync('brushingRecords') || []
  }

  // 创建锁
  let releaseLock
  _fetchBrushingLock = new Promise(resolve => { releaseLock = resolve })

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
  } finally {
    // 释放锁（先释放Promise再清引用）
    releaseLock()
    _fetchBrushingLock = null
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
    if (img && !img.startsWith('cloud://')) {
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
          const cloudPath = `brushing/${target.id}_${i}_${Date.now()}.jpg`
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
  // 先更新本地
  const localRecords = wx.getStorageSync('brushingRecords') || []
  const updatedRecords = localRecords.map(r => {
    if (r.id === id) {
      return { ...r, ...updates }
    }
    return r
  })
  wx.setStorageSync('brushingRecords', updatedRecords)

  // 再同步云端
  if (isCloudReady() && db()) {
    try {
      await db().collection('brushingRecords').doc(id).update({ data: updates })
    } catch (err) {
      console.warn('云端更新失败:', err)
    }
  }
}

// ===== 笔记相关 =====

/**
 * 上传笔记到云端（含图片）
 */
async function uploadNote(note) {
  if (!isCloudReady() || !db()) {
    return localOnlyNote(note)
  }
  try {
    const cloudImageIDs = []
    const images = note.images || []
    for (let i = 0; i < images.length; i++) {
      const img = images[i]
      if (img && !img.startsWith('cloud://')) {
        const cloudPath = `notes/${note.id}_${i}.jpg`
        const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: img })
        cloudImageIDs.push(uploadRes.fileID)
      } else if (img) {
        cloudImageIDs.push(img)
      }
    }

    // 上传语音
    let cloudVoiceID = note.voice || ''
    if (note.voice && !note.voice.startsWith('cloud://')) {
      const voicePath = `notes/${note.id}_voice.aac`
      const voiceRes = await wx.cloud.uploadFile({ cloudPath: voicePath, filePath: note.voice })
      cloudVoiceID = voiceRes.fileID
    }

    await db().collection('notes').add({
      data: {
        _id: note.id,
        type: note.type || 'diary',
        title: note.title,
        content: note.content || '',
        mood: note.mood || 'happy',
        tags: note.tags || [],
        images: cloudImageIDs,
        voice: cloudVoiceID,
        createTime: note.createTime
      }
    })

    return cloudImageIDs
  } catch (err) {
    console.warn('笔记云端上传失败，使用本地存储:', err)
    return localOnlyNote(note)
  }
}

/**
 * 从云端获取笔记列表
 */
async function fetchNotes() {
  if (!isCloudReady() || !db()) {
    return wx.getStorageSync('notes') || []
  }
  try {
    const res = await db().collection('notes')
      .orderBy('createTime', 'desc')
      .limit(200)
      .get()

    wx.setStorageSync('notes', res.data)
    return res.data
  } catch (err) {
    console.warn('笔记云端读取失败，使用本地缓存:', err)
    return wx.getStorageSync('notes') || []
  }
}

/**
 * 更新云端笔记
 */
async function updateNoteInCloud(id, updates) {
  if (!isCloudReady() || !db()) return
  try {
    const data = {}
    if (updates.title !== undefined) data.title = updates.title
    if (updates.content !== undefined) data.content = updates.content
    if (updates.mood !== undefined) data.mood = updates.mood
    if (updates.tags !== undefined) data.tags = updates.tags
    if (updates.type !== undefined) data.type = updates.type

    // 处理图片上传
    if (updates.images) {
      const cloudImageIDs = []
      for (let i = 0; i < updates.images.length; i++) {
        const img = updates.images[i]
        if (img && !img.startsWith('cloud://')) {
          const cloudPath = `notes/${id}_${i}.jpg`
          const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: img })
          cloudImageIDs.push(uploadRes.fileID)
        } else if (img) {
          cloudImageIDs.push(img)
        }
      }
      data.images = cloudImageIDs
    }

    await db().collection('notes').doc(id).update({ data })
  } catch (err) {
    console.warn('笔记云端更新失败:', err)
  }
}

/**
 * 删除云端笔记
 */
async function removeNote(id) {
  if (isCloudReady() && db()) {
    try {
      const doc = await db().collection('notes').doc(id).get().catch(() => null)
      const images = (doc && doc.data && doc.data.images) || []
      const fileList = images.filter(img => img && img.startsWith('cloud://'))
      if (doc && doc.data && doc.data.voice && doc.data.voice.startsWith('cloud://')) {
        fileList.push(doc.data.voice)
      }

      await db().collection('notes').doc(id).remove()
      if (fileList.length > 0) {
        await wx.cloud.deleteFile({ fileList })
      }
    } catch (err) {
      console.warn('笔记云端删除失败:', err)
    }
  }
}

// 笔记本地保存
async function localOnlyNote(note) {
  return []
}

// ===== 成就相关 =====

/**
 * 保存成就到云端
 */
async function uploadAchievements(achievements) {
  if (!isCloudReady() || !db()) return
  try {
    await db().collection('achievements').doc('user_achievements').set({
      data: {
        list: achievements,
        updateTime: new Date().toISOString()
      }
    })
  } catch (err) {
    console.warn('成就云端保存失败:', err)
  }
}

/**
 * 从云端获取成就
 */
async function fetchAchievements() {
  if (!isCloudReady() || !db()) {
    return wx.getStorageSync('achievements') || []
  }
  try {
    const res = await db().collection('achievements').doc('user_achievements').get()
    if (res.data && res.data.list) {
      wx.setStorageSync('achievements', res.data.list)
      return res.data.list
    }
    return wx.getStorageSync('achievements') || []
  } catch (err) {
    console.warn('成就云端读取失败，使用本地缓存:', err)
    return wx.getStorageSync('achievements') || []
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
  if (!isCloudReady() || !db()) return
  try {
    // 同步画作
    const localDrawings = wx.getStorageSync('drawings') || []
    for (const d of localDrawings) {
      if (!d.cloudFileID && d.imagePath) {
        try {
          await db().collection('drawings').doc(d.id).set({
            data: { cloudFileID: d.imagePath, name: d.name, mode: d.mode, createTime: d.createTime }
          })
        } catch (e) {}
      }
    }

    // 同步刷牙记录
    const localRecords = wx.getStorageSync('brushingRecords') || []
    for (const r of localRecords) {
      try {
        await db().collection('brushingRecords').doc(r.id).set({
          data: { date: r.date, timeOfDay: r.timeOfDay, cloudFileID: r.imagePath || '', images: r.images || [], score: r.score, note: r.note, createTime: r.createTime }
        })
      } catch (e) {}
    }

    // 同步笔记
    const notes = wx.getStorageSync('notes') || []
    for (const n of notes) {
      try {
        await db().collection('notes').doc(n.id).set({
          data: { type: n.type, title: n.title, content: n.content, mood: n.mood, tags: n.tags, images: n.images || [], voice: n.voice || '', createTime: n.createTime }
        })
      } catch (e) {}
    }

    // 同步成就
    const achievements = wx.getStorageSync('achievements') || []
    if (achievements.length > 0) {
      try {
        await db().collection('achievements').doc('user_achievements').set({
          data: { list: achievements, updateTime: new Date().toISOString() }
        })
      } catch (e) {}
    }

    // 同步习惯定义
    const habits = wx.getStorageSync('habits') || []
    try {
      await db().collection('userSettings').doc('habits').set({
        data: { list: habits, updateTime: new Date().toISOString() }
      })
    } catch (e) {}

    // 同步学习进度
    const learnProgress = wx.getStorageSync('learnProgress') || {}
    try {
      await db().collection('userSettings').doc('learnProgress').set({
        data: { ...learnProgress, updateTime: new Date().toISOString() }
      })
    } catch (e) {}

    // 同步设置
    const settings = wx.getStorageSync('settings') || {}
    try {
      await db().collection('userSettings').doc('settings').set({
        data: { ...settings, updateTime: new Date().toISOString() }
      })
    } catch (e) {}

    // 同步故事进度
    const story = wx.getStorageSync('brushingStory')
    if (story) {
      try {
        await db().collection('userSettings').doc('brushingStory').set({
          data: { ...story, updateTime: new Date().toISOString() }
        })
      } catch (e) {}
    }

    // 同步积分
    const points = wx.getStorageSync('totalBrushPoints') || 0
    try {
      await db().collection('userSettings').doc('totalBrushPoints').set({
        data: { value: points, updateTime: new Date().toISOString() }
      })
    } catch (e) {}

    // 同步装饰
    const decorations = wx.getStorageSync('toothDecorations') || []
    try {
      await db().collection('userSettings').doc('toothDecorations').set({
        data: { list: decorations, updateTime: new Date().toISOString() }
      })
    } catch (e) {}

    console.log('全量同步完成')
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
  const localRecord = { ...record, imagePath: savedPath, images: savedImages.length > 0 ? savedImages : record.images }
  const records = wx.getStorageSync('habitRecords') || []
  records.unshift(localRecord)
  wx.setStorageSync('habitRecords', records)
  return savedPath
}

// ===== 习惯定义相关 =====

async function uploadHabits(habits) {
  if (!isCloudReady() || !db()) return
  try {
    await db().collection('userSettings').doc('habits').set({
      data: { list: habits, updateTime: new Date().toISOString() }
    })
  } catch (err) {
    console.warn('习惯定义云端保存失败:', err)
  }
}

async function fetchHabits() {
  if (!isCloudReady() || !db()) {
    return wx.getStorageSync('habits') || []
  }
  try {
    const res = await db().collection('userSettings').doc('habits').get()
    if (res.data && res.data.list) {
      wx.setStorageSync('habits', res.data.list)
      return res.data.list
    }
    return wx.getStorageSync('habits') || []
  } catch (err) {
    console.warn('习惯定义云端读取失败:', err)
    return wx.getStorageSync('habits') || []
  }
}

// ===== 学习进度相关 =====

async function uploadLearnProgress(progress) {
  if (!isCloudReady() || !db()) return
  try {
    await db().collection('userSettings').doc('learnProgress').set({
      data: { ...progress, updateTime: new Date().toISOString() }
    })
  } catch (err) {
    console.warn('学习进度云端保存失败:', err)
  }
}

async function fetchLearnProgress() {
  if (!isCloudReady() || !db()) {
    return wx.getStorageSync('learnProgress') || {}
  }
  try {
    const res = await db().collection('userSettings').doc('learnProgress').get()
    if (res.data) {
      const { _id, updateTime, ...progress } = res.data
      wx.setStorageSync('learnProgress', progress)
      return progress
    }
    return wx.getStorageSync('learnProgress') || {}
  } catch (err) {
    console.warn('学习进度云端读取失败:', err)
    return wx.getStorageSync('learnProgress') || {}
  }
}

// ===== 设置相关 =====

async function uploadSettings(settings) {
  if (!isCloudReady() || !db()) return
  try {
    await db().collection('userSettings').doc('settings').set({
      data: { ...settings, updateTime: new Date().toISOString() }
    })
  } catch (err) {
    console.warn('设置云端保存失败:', err)
  }
}

async function fetchSettings() {
  if (!isCloudReady() || !db()) {
    return wx.getStorageSync('settings') || {}
  }
  try {
    const res = await db().collection('userSettings').doc('settings').get()
    if (res.data) {
      const { _id, updateTime, ...settings } = res.data
      wx.setStorageSync('settings', settings)
      return settings
    }
    return wx.getStorageSync('settings') || {}
  } catch (err) {
    console.warn('设置云端读取失败:', err)
    return wx.getStorageSync('settings') || {}
  }
}

// ===== 故事冒险进度 =====

async function uploadBrushingStory(story) {
  if (!isCloudReady() || !db()) return
  try {
    await db().collection('userSettings').doc('brushingStory').set({
      data: { ...story, updateTime: new Date().toISOString() }
    })
  } catch (err) {
    console.warn('故事进度云端保存失败:', err)
  }
}

async function fetchBrushingStory() {
  if (!isCloudReady() || !db()) {
    return null
  }
  try {
    const res = await db().collection('userSettings').doc('brushingStory').get()
    if (res.data) {
      const { _id, updateTime, ...story } = res.data
      wx.setStorageSync('brushingStory', story)
      return story
    }
    return null
  } catch (err) {
    return null
  }
}

// ===== 刷牙角色头像 =====

async function uploadBrushingAvatar(avatar) {
  if (!isCloudReady() || !db()) return
  try {
    let avatarData = avatar
    if (avatar.imagePath && !avatar.imagePath.startsWith('cloud://')) {
      const uploadRes = await wx.cloud.uploadFile({
        cloudPath: `brushing/avatar.png`,
        filePath: avatar.imagePath
      })
      avatarData = { ...avatar, imagePath: uploadRes.fileID }
    }
    await db().collection('userSettings').doc('brushingAvatar').set({
      data: { ...avatarData, updateTime: new Date().toISOString() }
    })
  } catch (err) {
    console.warn('角色头像云端保存失败:', err)
  }
}

async function fetchBrushingAvatar() {
  if (!isCloudReady() || !db()) {
    return null
  }
  try {
    const res = await db().collection('userSettings').doc('brushingAvatar').get()
    if (res.data) {
      const { _id, updateTime, ...avatar } = res.data
      wx.setStorageSync('brushingAvatar', avatar)
      return avatar
    }
    return null
  } catch (err) {
    return null
  }
}

// ===== 刷牙积分和装饰 =====

async function uploadBrushPoints(points) {
  if (!isCloudReady() || !db()) return
  try {
    await db().collection('userSettings').doc('totalBrushPoints').set({
      data: { value: points, updateTime: new Date().toISOString() }
    })
  } catch (err) {
    console.warn('积分云端保存失败:', err)
  }
}

async function fetchBrushPoints() {
  if (!isCloudReady() || !db()) {
    return wx.getStorageSync('totalBrushPoints') || 0
  }
  try {
    const res = await db().collection('userSettings').doc('totalBrushPoints').get()
    if (res.data && res.data.value !== undefined) {
      wx.setStorageSync('totalBrushPoints', res.data.value)
      return res.data.value
    }
    return 0
  } catch (err) {
    return wx.getStorageSync('totalBrushPoints') || 0
  }
}

async function uploadToothDecorations(decorations) {
  if (!isCloudReady() || !db()) return
  try {
    await db().collection('userSettings').doc('toothDecorations').set({
      data: { list: decorations, updateTime: new Date().toISOString() }
    })
  } catch (err) {
    console.warn('装饰云端保存失败:', err)
  }
}

async function fetchToothDecorations() {
  if (!isCloudReady() || !db()) {
    return wx.getStorageSync('toothDecorations') || []
  }
  try {
    const res = await db().collection('userSettings').doc('toothDecorations').get()
    if (res.data && res.data.list) {
      wx.setStorageSync('toothDecorations', res.data.list)
      return res.data.list
    }
    return []
  } catch (err) {
    return wx.getStorageSync('toothDecorations') || []
  }
}

module.exports = {
  isCloudReady,
  uploadDrawing, fetchDrawings, removeDrawing,
  uploadBrushingRecord, fetchBrushingRecords, removeBrushingRecord,
  updateBrushingRecord, updateBrushingRecordById,
  uploadHabitRecord,
  uploadNote, fetchNotes, updateNoteInCloud, removeNote,
  uploadAchievements, fetchAchievements,
  uploadHabits, fetchHabits,
  uploadLearnProgress, fetchLearnProgress,
  uploadSettings, fetchSettings,
  uploadBrushingStory, fetchBrushingStory,
  uploadBrushingAvatar, fetchBrushingAvatar,
  uploadBrushPoints, fetchBrushPoints,
  uploadToothDecorations, fetchToothDecorations,
  syncLocalToCloud
}
