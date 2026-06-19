/**
 * 云开发工具类（角色系统版本）
 * 读操作：云函数优先 → 失败降级读本地缓存
 * 写操作：写本地缓存（立即生效）→ 入同步队列 → 尝试云函数同步
 */

var auth = require('./auth.js')
var childStorage = require('./child-storage.js')
var syncQueue = require('./sync-queue.js')

var isCloudReady = function() {
  try {
    return typeof wx.cloud !== 'undefined' && wx.cloud
  } catch (e) {
    return false
  }
}

var db = function() {
  if (!isCloudReady()) return null
  try { return wx.cloud.database() } catch (e) { return null }
}

function getRecordMeta() {
  var member = auth.getMember()
  var childId = auth.getCurrentChildId()
  return {
    familyId: member ? member.familyId : '',
    childId: childId,
    createdBy: member ? member._id : '',
    createdByName: member ? member.roleName : ''
  }
}

// ===== 画作 =====

async function uploadDrawing(tempFilePath, drawing) {
  var meta = getRecordMeta()
  var record = {
    ...drawing,
    ...meta,
    likes: []
  }

  if (!isCloudReady() || !db()) {
    var util = require('./util.js')
    var savedPath = await util.saveImageToPersistent(tempFilePath)
    record.imagePath = savedPath
    var localDrawings = childStorage.get('drawings') || []
    localDrawings.unshift(record)
    childStorage.set('drawings', localDrawings)
    return savedPath
  }

  try {
    var cloudPath = 'drawings/' + drawing.id + '.png'
    var uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: tempFilePath })

    record.cloudFileID = uploadRes.fileID
    record.imagePath = uploadRes.fileID

    var localDrawings = childStorage.get('drawings') || []
    localDrawings.unshift(record)
    childStorage.set('drawings', localDrawings)

    syncQueue.enqueue({
      id: drawing.id,
      action: 'add',
      collection: 'drawings',
      data: record,
      uploadImages: []
    })

    try {
      await wx.cloud.callFunction({
        name: 'record',
        data: { action: 'add', collection: 'drawings', data: record }
      })
      syncQueue.dequeue(drawing.id)
    } catch (e) {}

    return uploadRes.fileID
  } catch (err) {
    console.warn('云端上传失败，使用本地存储:', err)
    var util = require('./util.js')
    var savedPath = await util.saveImageToPersistent(tempFilePath)
    record.imagePath = savedPath
    var localDrawings = childStorage.get('drawings') || []
    localDrawings.unshift(record)
    childStorage.set('drawings', localDrawings)
    return savedPath
  }
}

async function fetchDrawings() {
  var member = auth.getMember()
  if (!member) return childStorage.get('drawings') || []

  if (!isCloudReady()) {
    return childStorage.get('drawings') || []
  }

  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: {
        action: 'list',
        collection: 'drawings',
        childId: auth.getCurrentChildId(),
        page: 1,
        pageSize: 100
      }
    })

    if (res.result.code === 0) {
      var list = res.result.data.list || []
      childStorage.set('drawings', list)
      return list
    }
  } catch (err) {
    console.warn('云端读取失败，使用本地缓存:', err)
  }

  return childStorage.get('drawings') || []
}

async function removeDrawing(id) {
  childStorage.set('drawings', (childStorage.get('drawings') || []).filter(function(d) { return d.id !== id }))

  if (isCloudReady()) {
    try {
      await wx.cloud.callFunction({
        name: 'record',
        data: { action: 'remove', collection: 'drawings', id: id }
      })
    } catch (err) {
      console.warn('云端删除失败:', err)
    }
  }
}

// ===== 刷牙打卡 =====

async function uploadBrushingRecord(record) {
  var meta = getRecordMeta()
  var fullRecord = {
    ...record,
    ...meta,
    likes: []
  }

  var images = record.images || (record.imagePath ? [record.imagePath] : [])
  var localImages = []

  for (var i = 0; i < images.length; i++) {
    var img = images[i]
    if (img && !img.startsWith('cloud://')) {
      var util = require('./util.js')
      localImages.push(await util.saveImageToPersistent(img))
    } else {
      localImages.push(img)
    }
  }

  fullRecord.images = localImages
  fullRecord.imagePath = localImages[0] || record.imagePath

  var localRecords = childStorage.get('brushingRecords') || []
  localRecords.unshift(fullRecord)
  childStorage.set('brushingRecords', localRecords)

  var uploadImages = []
  for (var j = 0; j < localImages.length; j++) {
    if (localImages[j] && !localImages[j].startsWith('cloud://')) {
      uploadImages.push({
        field: 'images[' + j + ']',
        localPath: localImages[j],
        cloudPath: 'brushing/' + record.id + '_' + j + '.jpg'
      })
    }
  }

  syncQueue.enqueue({
    id: record.id,
    action: 'add',
    collection: 'brushingRecords',
    data: fullRecord,
    uploadImages: uploadImages
  })

  try {
    var syncedData = { ...fullRecord }
    for (var k = 0; k < uploadImages.length; k++) {
      var img2 = uploadImages[k]
      var uploadRes = await wx.cloud.uploadFile({
        cloudPath: img2.cloudPath,
        filePath: img2.localPath
      })
      syncedData.images[k] = uploadRes.fileID
    }
    await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'add', collection: 'brushingRecords', data: syncedData }
    })
    syncQueue.dequeue(record.id)
  } catch (err) {
    console.warn('刷牙记录同步失败，已入队列:', err)
  }

  return fullRecord.imagePath
}

async function fetchBrushingRecords() {
  var member = auth.getMember()
  if (!member) return childStorage.get('brushingRecords') || []

  if (!isCloudReady()) {
    return childStorage.get('brushingRecords') || []
  }

  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: {
        action: 'list',
        collection: 'brushingRecords',
        childId: auth.getCurrentChildId(),
        page: 1,
        pageSize: 200
      }
    })

    if (res.result.code === 0) {
      var list = (res.result.data.list || []).map(function(r) {
        return {
          ...r,
          id: r.id || r._id,
          imagePath: r.cloudFileID || r.imagePath || '',
          images: r.images || (r.cloudFileID ? [r.cloudFileID] : [])
        }
      })
      childStorage.set('brushingRecords', list)
      return list
    }
  } catch (err) {
    console.warn('云端读取失败，使用本地缓存:', err)
  }

  return childStorage.get('brushingRecords') || []
}

async function removeBrushingRecord(id) {
  childStorage.set('brushingRecords', (childStorage.get('brushingRecords') || []).filter(function(r) { return r.id !== id }))

  if (isCloudReady()) {
    try {
      await wx.cloud.callFunction({
        name: 'record',
        data: { action: 'remove', collection: 'brushingRecords', id: id }
      })
    } catch (err) {
      console.warn('云端删除失败:', err)
    }
  }
}

async function updateBrushingRecord(timeOfDay, updates) {
  var util = require('./util.js')
  var today = util.getTodayStr()
  var localRecords = childStorage.get('brushingRecords') || []
  var target = null

  for (var i = 0; i < localRecords.length; i++) {
    if (localRecords[i].date === today && localRecords[i].timeOfDay === timeOfDay) {
      target = localRecords[i]
      break
    }
  }

  if (!target) throw new Error('未找到对应记录')

  var updatedRecords = localRecords.map(function(r) {
    if (r.date === today && r.timeOfDay === timeOfDay) {
      return { ...r, ...updates }
    }
    return r
  })
  childStorage.set('brushingRecords', updatedRecords)

  if (isCloudReady()) {
    try {
      await wx.cloud.callFunction({
        name: 'record',
        data: { action: 'update', collection: 'brushingRecords', id: target.id, data: updates }
      })
    } catch (err) {
      console.warn('云端更新失败:', err)
    }
  }
}

async function updateBrushingRecordById(id, updates) {
  var localRecords = childStorage.get('brushingRecords') || []
  var updatedRecords = localRecords.map(function(r) {
    if (r.id === id) return { ...r, ...updates }
    return r
  })
  childStorage.set('brushingRecords', updatedRecords)

  if (isCloudReady()) {
    try {
      await wx.cloud.callFunction({
        name: 'record',
        data: { action: 'update', collection: 'brushingRecords', id: id, data: updates }
      })
    } catch (err) {
      console.warn('云端更新失败:', err)
    }
  }
}

// ===== 笔记 =====

async function uploadNote(note) {
  var meta = getRecordMeta()
  var record = {
    ...note,
    ...meta,
    likes: []
  }

  var images = note.images || []
  var localImages = []
  for (var i = 0; i < images.length; i++) {
    if (images[i] && !images[i].startsWith('cloud://')) {
      var util = require('./util.js')
      localImages.push(await util.saveImageToPersistent(images[i]))
    } else {
      localImages.push(images[i])
    }
  }

  var localVoice = note.voice || ''
  if (localVoice && !localVoice.startsWith('cloud://')) {
    var util2 = require('./util.js')
    localVoice = await util2.saveImageToPersistent(localVoice)
  }

  record.images = localImages
  record.voice = localVoice

  var localNotes = childStorage.get('notes') || []
  localNotes.unshift(record)
  childStorage.set('notes', localNotes)

  var uploadImages = []
  for (var j = 0; j < localImages.length; j++) {
    if (localImages[j] && !localImages[j].startsWith('cloud://')) {
      uploadImages.push({
        field: 'images[' + j + ']',
        localPath: localImages[j],
        cloudPath: 'notes/' + note.id + '_' + j + '.jpg'
      })
    }
  }

  if (localVoice && !localVoice.startsWith('cloud://')) {
    uploadImages.push({
      field: 'voice',
      localPath: localVoice,
      cloudPath: 'notes/' + note.id + '_voice.aac'
    })
  }

  syncQueue.enqueue({
    id: note.id,
    action: 'add',
    collection: 'notes',
    data: record,
    uploadImages: uploadImages
  })

  try {
    var syncedData = { ...record }
    for (var k = 0; k < uploadImages.length; k++) {
      var img = uploadImages[k]
      var uploadRes = await wx.cloud.uploadFile({
        cloudPath: img.cloudPath,
        filePath: img.localPath
      })
      if (img.field === 'voice') {
        syncedData.voice = uploadRes.fileID
      } else {
        syncedData.images[k] = uploadRes.fileID
      }
    }
    await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'add', collection: 'notes', data: syncedData }
    })
    syncQueue.dequeue(note.id)
  } catch (err) {
    console.warn('笔记同步失败，已入队列:', err)
  }

  return localImages
}

async function fetchNotes() {
  var member = auth.getMember()
  if (!member) return childStorage.get('notes') || []

  if (!isCloudReady()) {
    return childStorage.get('notes') || []
  }

  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: {
        action: 'list',
        collection: 'notes',
        childId: auth.getCurrentChildId(),
        page: 1,
        pageSize: 200
      }
    })

    if (res.result.code === 0) {
      var list = res.result.data.list || []
      childStorage.set('notes', list)
      return list
    }
  } catch (err) {
    console.warn('笔记云端读取失败，使用本地缓存:', err)
  }

  return childStorage.get('notes') || []
}

async function updateNoteInCloud(id, updates) {
  var localNotes = childStorage.get('notes') || []
  var updatedNotes = localNotes.map(function(n) {
    if (n.id === id || n._id === id) return { ...n, ...updates }
    return n
  })
  childStorage.set('notes', updatedNotes)

  if (isCloudReady()) {
    try {
      await wx.cloud.callFunction({
        name: 'record',
        data: { action: 'update', collection: 'notes', id: id, data: updates }
      })
    } catch (err) {
      console.warn('笔记云端更新失败:', err)
    }
  }
}

async function removeNote(id) {
  childStorage.set('notes', (childStorage.get('notes') || []).filter(function(n) { return n.id !== id && n._id !== id }))

  if (isCloudReady()) {
    try {
      await wx.cloud.callFunction({
        name: 'record',
        data: { action: 'remove', collection: 'notes', id: id }
      })
    } catch (err) {
      console.warn('笔记云端删除失败:', err)
    }
  }
}

// ===== 成就 =====

async function uploadAchievements(achievements) {
  childStorage.set('achievements', achievements)

  if (isCloudReady()) {
    try {
      await wx.cloud.callFunction({
        name: 'record',
        data: {
          action: 'add',
          collection: 'achievements',
          data: { _id: 'user_achievements', list: achievements }
        }
      })
    } catch (err) {
      console.warn('成就云端保存失败:', err)
    }
  }
}

async function fetchAchievements() {
  var member = auth.getMember()
  if (!member) return childStorage.get('achievements') || []

  if (!isCloudReady()) {
    return childStorage.get('achievements') || []
  }

  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: {
        action: 'list',
        collection: 'achievements',
        childId: auth.getCurrentChildId(),
        page: 1,
        pageSize: 1
      }
    })

    if (res.result.code === 0 && res.result.data.list.length > 0) {
      var list = res.result.data.list[0].list || []
      childStorage.set('achievements', list)
      return list
    }
  } catch (err) {
    console.warn('成就云端读取失败:', err)
  }

  return childStorage.get('achievements') || []
}

// ===== 习惯打卡 =====

async function uploadHabitRecord(record) {
  var meta = getRecordMeta()
  var fullRecord = {
    ...record,
    ...meta,
    likes: []
  }

  var images = record.images || (record.imagePath ? [record.imagePath] : [])
  var localImages = []
  for (var i = 0; i < images.length; i++) {
    if (images[i] && !images[i].startsWith('cloud://')) {
      var util = require('./util.js')
      localImages.push(await util.saveImageToPersistent(images[i]))
    } else {
      localImages.push(images[i])
    }
  }

  fullRecord.images = localImages
  fullRecord.imagePath = localImages[0] || record.imagePath

  var localRecords = childStorage.get('habitRecords') || []
  localRecords.unshift(fullRecord)
  childStorage.set('habitRecords', localRecords)

  var uploadImages = []
  for (var j = 0; j < localImages.length; j++) {
    if (localImages[j] && !localImages[j].startsWith('cloud://')) {
      uploadImages.push({
        field: 'images[' + j + ']',
        localPath: localImages[j],
        cloudPath: 'habits/' + record.id + '_' + j + '.jpg'
      })
    }
  }

  syncQueue.enqueue({
    id: record.id,
    action: 'add',
    collection: 'habitRecords',
    data: fullRecord,
    uploadImages: uploadImages
  })

  try {
    var syncedData = { ...fullRecord }
    for (var k = 0; k < uploadImages.length; k++) {
      var img = uploadImages[k]
      var uploadRes = await wx.cloud.uploadFile({
        cloudPath: img.cloudPath,
        filePath: img.localPath
      })
      syncedData.images[k] = uploadRes.fileID
    }
    await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'add', collection: 'habitRecords', data: syncedData }
    })
    syncQueue.dequeue(record.id)
  } catch (err) {
    console.warn('习惯记录同步失败，已入队列:', err)
  }

  return fullRecord.imagePath
}

// ===== 习惯定义 =====

async function uploadHabits(habits) {
  childStorage.set('habits', habits)

  if (isCloudReady()) {
    try {
      await wx.cloud.callFunction({
        name: 'record',
        data: {
          action: 'add',
          collection: 'userSettings',
          data: { _id: 'habits', list: habits }
        }
      })
    } catch (err) {
      console.warn('习惯定义云端保存失败:', err)
    }
  }
}

async function fetchHabits() {
  var member = auth.getMember()
  if (!member) return childStorage.get('habits') || []

  if (!isCloudReady()) {
    return childStorage.get('habits') || []
  }

  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: {
        action: 'list',
        collection: 'userSettings',
        childId: auth.getCurrentChildId(),
        page: 1,
        pageSize: 10
      }
    })

    if (res.result.code === 0 && res.result.data.list.length > 0) {
      var habitsDoc = res.result.data.list.find(function(d) { return d._id && d._id.indexOf('habits') >= 0 })
      if (habitsDoc && habitsDoc.list) {
        childStorage.set('habits', habitsDoc.list)
        return habitsDoc.list
      }
    }
  } catch (err) {
    console.warn('习惯定义云端读取失败:', err)
  }

  return childStorage.get('habits') || []
}

// ===== 学习进度 =====

async function uploadLearnProgress(progress) {
  childStorage.set('learnProgress', progress)

  if (isCloudReady()) {
    try {
      await wx.cloud.callFunction({
        name: 'record',
        data: {
          action: 'add',
          collection: 'userSettings',
          data: { _id: 'learnProgress', ...progress }
        }
      })
    } catch (err) {
      console.warn('学习进度云端保存失败:', err)
    }
  }
}

async function fetchLearnProgress() {
  var member = auth.getMember()
  if (!member) return childStorage.get('learnProgress') || {}

  if (!isCloudReady()) {
    return childStorage.get('learnProgress') || {}
  }

  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: {
        action: 'list',
        collection: 'userSettings',
        childId: auth.getCurrentChildId(),
        page: 1,
        pageSize: 10
      }
    })

    if (res.result.code === 0 && res.result.data.list.length > 0) {
      var progressDoc = res.result.data.list.find(function(d) { return d._id && d._id.indexOf('learnProgress') >= 0 })
      if (progressDoc) {
        var { _id, familyId, childId, createdBy, createdByName, likes, createTime, ...progress } = progressDoc
        childStorage.set('learnProgress', progress)
        return progress
      }
    }
  } catch (err) {
    console.warn('学习进度云端读取失败:', err)
  }

  return childStorage.get('learnProgress') || {}
}

// ===== 设置 =====

async function uploadSettings(settings) {
  childStorage.set('settings', settings)

  if (isCloudReady()) {
    try {
      await wx.cloud.callFunction({
        name: 'record',
        data: {
          action: 'add',
          collection: 'userSettings',
          data: { _id: 'settings', ...settings }
        }
      })
    } catch (err) {
      console.warn('设置云端保存失败:', err)
    }
  }
}

async function fetchSettings() {
  var member = auth.getMember()
  if (!member) return childStorage.get('settings') || {}

  if (!isCloudReady()) {
    return childStorage.get('settings') || {}
  }

  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: {
        action: 'list',
        collection: 'userSettings',
        childId: auth.getCurrentChildId(),
        page: 1,
        pageSize: 10
      }
    })

    if (res.result.code === 0 && res.result.data.list.length > 0) {
      var settingsDoc = res.result.data.list.find(function(d) { return d._id === 'settings' })
      if (settingsDoc) {
        var { _id, familyId, childId, createdBy, createdByName, likes, createTime, ...settings } = settingsDoc
        childStorage.set('settings', settings)
        return settings
      }
    }
  } catch (err) {
    console.warn('设置云端读取失败:', err)
  }

  return childStorage.get('settings') || {}
}

// ===== 刷牙故事 =====

async function uploadBrushingStory(story) {
  childStorage.set('brushingStory', story)

  if (isCloudReady()) {
    try {
      await wx.cloud.callFunction({
        name: 'record',
        data: {
          action: 'add',
          collection: 'userSettings',
          data: { _id: 'brushingStory', ...story }
        }
      })
    } catch (err) {
      console.warn('故事进度云端保存失败:', err)
    }
  }
}

async function fetchBrushingStory() {
  var member = auth.getMember()
  if (!member) return null

  if (!isCloudReady()) {
    return childStorage.get('brushingStory') || null
  }

  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: {
        action: 'list',
        collection: 'userSettings',
        childId: auth.getCurrentChildId(),
        page: 1,
        pageSize: 10
      }
    })

    if (res.result.code === 0 && res.result.data.list.length > 0) {
      var storyDoc = res.result.data.list.find(function(d) { return d._id && d._id.indexOf('brushingStory') >= 0 })
      if (storyDoc) {
        var { _id, familyId, childId, createdBy, createdByName, likes, createTime, ...story } = storyDoc
        childStorage.set('brushingStory', story)
        return story
      }
    }
  } catch (err) {}

  return childStorage.get('brushingStory') || null
}

// ===== 刷牙角色 =====

async function uploadBrushingAvatar(avatar) {
  childStorage.set('brushingAvatar', avatar)

  if (isCloudReady()) {
    try {
      var avatarData = { ...avatar }
      if (avatar.imagePath && !avatar.imagePath.startsWith('cloud://')) {
        var uploadRes = await wx.cloud.uploadFile({
          cloudPath: 'brushing/avatar.png',
          filePath: avatar.imagePath
        })
        avatarData.imagePath = uploadRes.fileID
      }
      await wx.cloud.callFunction({
        name: 'record',
        data: {
          action: 'add',
          collection: 'userSettings',
          data: { _id: 'brushingAvatar', ...avatarData }
        }
      })
    } catch (err) {
      console.warn('角色头像云端保存失败:', err)
    }
  }
}

async function fetchBrushingAvatar() {
  var member = auth.getMember()
  if (!member) return null

  if (!isCloudReady()) {
    return childStorage.get('brushingAvatar') || null
  }

  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: {
        action: 'list',
        collection: 'userSettings',
        childId: auth.getCurrentChildId(),
        page: 1,
        pageSize: 10
      }
    })

    if (res.result.code === 0 && res.result.data.list.length > 0) {
      var avatarDoc = res.result.data.list.find(function(d) { return d._id && d._id.indexOf('brushingAvatar') >= 0 })
      if (avatarDoc) {
        var { _id, familyId, childId, createdBy, createdByName, likes, createTime, ...avatar } = avatarDoc
        childStorage.set('brushingAvatar', avatar)
        return avatar
      }
    }
  } catch (err) {}

  return childStorage.get('brushingAvatar') || null
}

// ===== 刷牙积分和装饰 =====

async function uploadBrushPoints(points) {
  childStorage.set('totalBrushPoints', points)

  if (isCloudReady()) {
    try {
      await wx.cloud.callFunction({
        name: 'record',
        data: {
          action: 'add',
          collection: 'userSettings',
          data: { _id: 'totalBrushPoints', value: points }
        }
      })
    } catch (err) {
      console.warn('积分云端保存失败:', err)
    }
  }
}

async function fetchBrushPoints() {
  var member = auth.getMember()
  if (!member) return childStorage.get('totalBrushPoints') || 0

  if (!isCloudReady()) {
    return childStorage.get('totalBrushPoints') || 0
  }

  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: {
        action: 'list',
        collection: 'userSettings',
        childId: auth.getCurrentChildId(),
        page: 1,
        pageSize: 10
      }
    })

    if (res.result.code === 0 && res.result.data.list.length > 0) {
      var pointsDoc = res.result.data.list.find(function(d) { return d._id && d._id.indexOf('totalBrushPoints') >= 0 })
      if (pointsDoc && pointsDoc.value !== undefined) {
        childStorage.set('totalBrushPoints', pointsDoc.value)
        return pointsDoc.value
      }
    }
  } catch (err) {}

  return childStorage.get('totalBrushPoints') || 0
}

async function uploadToothDecorations(decorations) {
  childStorage.set('toothDecorations', decorations)

  if (isCloudReady()) {
    try {
      await wx.cloud.callFunction({
        name: 'record',
        data: {
          action: 'add',
          collection: 'userSettings',
          data: { _id: 'toothDecorations', list: decorations }
        }
      })
    } catch (err) {
      console.warn('装饰云端保存失败:', err)
    }
  }
}

async function fetchToothDecorations() {
  var member = auth.getMember()
  if (!member) return childStorage.get('toothDecorations') || []

  if (!isCloudReady()) {
    return childStorage.get('toothDecorations') || []
  }

  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: {
        action: 'list',
        collection: 'userSettings',
        childId: auth.getCurrentChildId(),
        page: 1,
        pageSize: 10
      }
    })

    if (res.result.code === 0 && res.result.data.list.length > 0) {
      var decoDoc = res.result.data.list.find(function(d) { return d._id && d._id.indexOf('toothDecorations') >= 0 })
      if (decoDoc && decoDoc.list) {
        childStorage.set('toothDecorations', decoDoc.list)
        return decoDoc.list
      }
    }
  } catch (err) {}

  return childStorage.get('toothDecorations') || []
}

// ===== 摆摊相关 =====

async function uploadStallProduct(product) {
  if (!isCloudReady()) return
  try {
    await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'add', collection: 'stallProducts', data: product }
    })
  } catch (err) {
    console.warn('云端同步摆摊商品失败:', err)
  }
}

async function fetchStallProducts() {
  if (!isCloudReady()) return childStorage.get('stallProducts') || []
  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'list', collection: 'stallProducts' }
    })
    if (res.result.code === 0) {
      var list = res.result.data.list || []
      childStorage.set('stallProducts', list)
      return list
    }
  } catch (err) {
    console.warn('云端读取摆摊商品失败:', err)
  }
  return childStorage.get('stallProducts') || []
}

async function removeStallProduct(id) {
  if (!isCloudReady()) return
  try {
    await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'remove', collection: 'stallProducts', id: id }
    })
  } catch (err) {
    console.warn('云端删除摆摊商品失败:', err)
  }
}

async function uploadStallSale(sale) {
  if (!isCloudReady()) return
  try {
    await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'add', collection: 'stallSales', data: sale }
    })
  } catch (err) {
    console.warn('云端同步销售记录失败:', err)
  }
}

async function fetchStallSales() {
  if (!isCloudReady()) return childStorage.get('stallSales') || []
  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'list', collection: 'stallSales' }
    })
    if (res.result.code === 0) {
      var list = res.result.data.list || []
      childStorage.set('stallSales', list)
      return list
    }
  } catch (err) {
    console.warn('云端读取销售记录失败:', err)
  }
  return childStorage.get('stallSales') || []
}

async function removeStallSale(id) {
  if (!isCloudReady()) return
  try {
    await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'remove', collection: 'stallSales', id: id }
    })
  } catch (err) {
    console.warn('云端删除销售记录失败:', err)
  }
}

async function uploadStallSettings(settings) {
  if (!isCloudReady()) return
  try {
    await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'update', collection: 'stallSettings', data: settings }
    })
  } catch (err) {
    console.warn('云端同步摊位设置失败:', err)
  }
}

async function fetchStallSettings() {
  if (!isCloudReady()) return null
  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'get', collection: 'stallSettings' }
    })
    if (res.result.code === 0) {
      return res.result.data
    }
  } catch (err) {
    console.warn('云端读取摊位设置失败:', err)
  }
  return null
}

module.exports = {
  isCloudReady: isCloudReady,
  uploadDrawing: uploadDrawing,
  fetchDrawings: fetchDrawings,
  removeDrawing: removeDrawing,
  uploadBrushingRecord: uploadBrushingRecord,
  fetchBrushingRecords: fetchBrushingRecords,
  removeBrushingRecord: removeBrushingRecord,
  updateBrushingRecord: updateBrushingRecord,
  updateBrushingRecordById: updateBrushingRecordById,
  uploadHabitRecord: uploadHabitRecord,
  uploadNote: uploadNote,
  fetchNotes: fetchNotes,
  updateNoteInCloud: updateNoteInCloud,
  removeNote: removeNote,
  uploadAchievements: uploadAchievements,
  fetchAchievements: fetchAchievements,
  uploadHabits: uploadHabits,
  fetchHabits: fetchHabits,
  uploadLearnProgress: uploadLearnProgress,
  fetchLearnProgress: fetchLearnProgress,
  uploadSettings: uploadSettings,
  fetchSettings: fetchSettings,
  uploadBrushingStory: uploadBrushingStory,
  fetchBrushingStory: fetchBrushingStory,
  uploadBrushingAvatar: uploadBrushingAvatar,
  fetchBrushingAvatar: fetchBrushingAvatar,
  uploadBrushPoints: uploadBrushPoints,
  fetchBrushPoints: fetchBrushPoints,
  uploadToothDecorations: uploadToothDecorations,
  fetchToothDecorations: fetchToothDecorations,
  uploadStallProduct: uploadStallProduct,
  fetchStallProducts: fetchStallProducts,
  removeStallProduct: removeStallProduct,
  uploadStallSale: uploadStallSale,
  fetchStallSales: fetchStallSales,
  removeStallSale: removeStallSale,
  uploadStallSettings: uploadStallSettings,
  fetchStallSettings: fetchStallSettings
}
