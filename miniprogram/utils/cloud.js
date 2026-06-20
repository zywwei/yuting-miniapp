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

// ===== 墓碑清理配置 =====
var TOMBSTONE_TTL_DAYS = 30 // 墓碑保留30天

// 清理过期墓碑（超过30天的记录）
function cleanExpiredTombstones(key) {
  var tombstones = childStorage.get(key) || []
  var now = Date.now()
  var ttlMs = TOMBSTONE_TTL_DAYS * 24 * 60 * 60 * 1000
  
  // 兼容旧格式（纯ID数组）和新格式（带时间戳的对象数组）
  var cleaned = tombstones.filter(function(item) {
    if (typeof item === 'string') {
      // 旧格式：保留（无法判断时间）
      return true
    }
    // 新格式：检查是否过期
    return (now - item.ts) < ttlMs
  })
  
  childStorage.set(key, cleaned)
  return cleaned
}

// 获取墓碑中的ID列表（兼容新旧格式）
function extractTombstoneIds(tombstones) {
  return tombstones.map(function(item) {
    return typeof item === 'string' ? item : item.id
  })
}

// ===== 已删除画作的墓碑清单（按孩子隔离）=====
// 用于解决：删除后 fetchDrawings 合并云端数据时把已删除记录又拉回来的问题
var DELETED_DRAWINGS_KEY = 'deletedDrawingIds'

function getDeletedDrawingIds() {
  var tombstones = cleanExpiredTombstones(DELETED_DRAWINGS_KEY)
  return extractTombstoneIds(tombstones)
}

function addDeletedDrawingId(id) {
  if (!id) return
  var tombstones = cleanExpiredTombstones(DELETED_DRAWINGS_KEY)
  var exists = tombstones.some(function(item) {
    return (typeof item === 'string' ? item : item.id) === id
  })
  if (!exists) {
    tombstones.push({ id: id, ts: Date.now() })
    childStorage.set(DELETED_DRAWINGS_KEY, tombstones)
  }
}

// ===== 已删除笔记的墓碑清单（按孩子隔离）=====
var DELETED_NOTES_KEY = 'deletedNoteIds'

function getDeletedNoteIds() {
  var tombstones = cleanExpiredTombstones(DELETED_NOTES_KEY)
  return extractTombstoneIds(tombstones)
}

function addDeletedNoteId(id) {
  if (!id) return
  var tombstones = cleanExpiredTombstones(DELETED_NOTES_KEY)
  var exists = tombstones.some(function(item) {
    return (typeof item === 'string' ? item : item.id) === id
  })
  if (!exists) {
    tombstones.push({ id: id, ts: Date.now() })
    childStorage.set(DELETED_NOTES_KEY, tombstones)
  }
}

// ===== 已删除刷牙记录的墓碑清单（按孩子隔离）=====
var DELETED_BRUSHING_KEY = 'deletedBrushingIds'

function getDeletedBrushingIds() {
  var tombstones = cleanExpiredTombstones(DELETED_BRUSHING_KEY)
  return extractTombstoneIds(tombstones)
}

function addDeletedBrushingId(id) {
  if (!id) return
  var tombstones = cleanExpiredTombstones(DELETED_BRUSHING_KEY)
  var exists = tombstones.some(function(item) {
    return (typeof item === 'string' ? item : item.id) === id
  })
  if (!exists) {
    tombstones.push({ id: id, ts: Date.now() })
    childStorage.set(DELETED_BRUSHING_KEY, tombstones)
  }
}

// ===== 已删除摆摊商品的墓碑清单 =====
var DELETED_STALL_PRODUCTS_KEY = 'deletedStallProductIds'

function getDeletedStallProductIds() {
  var tombstones = cleanExpiredTombstones(DELETED_STALL_PRODUCTS_KEY)
  return extractTombstoneIds(tombstones)
}

function addDeletedStallProductId(id) {
  if (!id) return
  var tombstones = cleanExpiredTombstones(DELETED_STALL_PRODUCTS_KEY)
  var exists = tombstones.some(function(item) {
    return (typeof item === 'string' ? item : item.id) === id
  })
  if (!exists) {
    tombstones.push({ id: id, ts: Date.now() })
    childStorage.set(DELETED_STALL_PRODUCTS_KEY, tombstones)
  }
}

// ===== 已删除摆摊销售的墓碑清单 =====
var DELETED_STALL_SALES_KEY = 'deletedStallSaleIds'

function getDeletedStallSaleIds() {
  var tombstones = cleanExpiredTombstones(DELETED_STALL_SALES_KEY)
  return extractTombstoneIds(tombstones)
}

function addDeletedStallSaleId(id) {
  if (!id) return
  var tombstones = cleanExpiredTombstones(DELETED_STALL_SALES_KEY)
  var exists = tombstones.some(function(item) {
    return (typeof item === 'string' ? item : item.id) === id
  })
  if (!exists) {
    tombstones.push({ id: id, ts: Date.now() })
    childStorage.set(DELETED_STALL_SALES_KEY, tombstones)
  }
}

// 清除指定墓碑（删除成功后调用）
function removeTombstone(key, id) {
  var tombstones = childStorage.get(key) || []
  tombstones = tombstones.filter(function(item) {
    return (typeof item === 'string' ? item : item.id) !== id
  })
  childStorage.set(key, tombstones)
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
  var localDrawings = childStorage.get('drawings') || []

  // 一次性迁移：将旧的全局 drawings 数据合并到按孩子隔离的存储
  localDrawings = migrateLegacyDrawings(localDrawings)

  var member = auth.getMember()
  if (!member) return localDrawings

  if (!isCloudReady()) {
    return localDrawings
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
      var cloudList = res.result.data.list || []
      var deletedIds = getDeletedDrawingIds()
      var deletedSet = {}
      deletedIds.forEach(function(id) { deletedSet[id] = true })

      // 合并云端与本地数据（以 id 去重），避免任一方缺失导致画作丢失
      var mergedMap = {}
      localDrawings.forEach(function(d) {
        if (d && d.id && !deletedSet[d.id]) mergedMap[d.id] = d
      })
      cloudList.forEach(function(d) {
        if (d && d.id && !deletedSet[d.id]) mergedMap[d.id] = d
      })
      var merged = []
      for (var key in mergedMap) {
        merged.push(mergedMap[key])
      }

      // 按创建时间倒序排序
      merged.sort(function(a, b) {
        return new Date(b.createTime || 0) - new Date(a.createTime || 0)
      })

      // 用合并结果更新本地缓存
      childStorage.set('drawings', merged)

      // 云端仍存在但本地已删除的记录，再次尝试删除
      cloudList.forEach(function(d) {
        if (d && d.id && deletedSet[d.id]) {
          wx.cloud.callFunction({
            name: 'record',
            data: { action: 'remove', collection: 'drawings', id: d.id }
          }).catch(function() {})
        }
      })

      // 将本地独有（云端缺失）的记录补传到云端，实现数据自愈
      selfHealDrawings(cloudList, localDrawings, deletedSet)

      return merged
    }
  } catch (err) {
    console.warn('云端读取失败，使用本地缓存:', err)
  }

  return localDrawings
}

// 数据自愈：将本地有但云端缺失的画作补传到云端
function selfHealDrawings(cloudList, localDrawings, deletedSet) {
  deletedSet = deletedSet || {}
  var cloudIds = {}
  cloudList.forEach(function(d) {
    if (d && d.id) cloudIds[d.id] = true
  })
  localDrawings.forEach(function(d) {
    // 已删除的、或云端已有的，都不补传
    if (d && d.id && !cloudIds[d.id] && !deletedSet[d.id]) {
      // 补传缺失的记录到云端（失败静默，不影响读取）
      wx.cloud.callFunction({
        name: 'record',
        data: { action: 'add', collection: 'drawings', data: d }
      }).catch(function() {})
    }
  })
}

// 一次性迁移：将旧的全局 drawings（迁移到孩子隔离存储前）合并进来
function migrateLegacyDrawings(childScopedDrawings) {
  var legacy = wx.getStorageSync('drawings')
  if (!legacy || !Array.isArray(legacy) || legacy.length === 0) {
    return childScopedDrawings
  }

  // 以 id 去重合并
  var mergedMap = {}
  childScopedDrawings.forEach(function(d) {
    if (d && d.id) mergedMap[d.id] = d
  })
  legacy.forEach(function(d) {
    if (d && d.id && !mergedMap[d.id]) mergedMap[d.id] = d
  })

  var merged = []
  for (var key in mergedMap) {
    merged.push(mergedMap[key])
  }
  merged.sort(function(a, b) {
    return new Date(b.createTime || 0) - new Date(a.createTime || 0)
  })

  // 写入按孩子隔离的存储，并清除旧的全局数据
  childStorage.set('drawings', merged)
  try { wx.removeStorageSync('drawings') } catch (e) {}

  return merged
}

async function removeDrawing(id) {
  // 记录墓碑，防止 fetchDrawings 合并时把已删除记录拉回来
  addDeletedDrawingId(id)

  // 从本地缓存删除
  childStorage.set('drawings', (childStorage.get('drawings') || []).filter(function(d) { return d.id !== id }))

  // 尝试删除云端记录
  if (isCloudReady()) {
    try {
      var res = await wx.cloud.callFunction({
        name: 'record',
        data: { action: 'remove', collection: 'drawings', id: id }
      })
      // 只有云端删除成功后，才清除墓碑
      if (res.result && res.result.code === 0) {
        removeTombstone(DELETED_DRAWINGS_KEY, id)
      }
    } catch (err) {
      console.warn('云端删除失败:', err)
    }
  }
}

async function updateDrawingName(id, newName) {
  // 更新本地缓存
  var drawings = childStorage.get('drawings') || []
  drawings = drawings.map(function(d) {
    if (d.id === id) return { ...d, name: newName }
    return d
  })
  childStorage.set('drawings', drawings)
  
  // 更新云端
  if (isCloudReady()) {
    try {
      await wx.cloud.callFunction({
        name: 'record',
        data: { action: 'update', collection: 'drawings', id: id, data: { name: newName } }
      })
    } catch (err) {
      console.warn('云端更新名称失败:', err)
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
  var localRecords = childStorage.get('brushingRecords') || []
  var member = auth.getMember()
  if (!member) return localRecords

  if (!isCloudReady()) {
    return localRecords
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
      var cloudList = res.result.data.list || []
      var deletedIds = getDeletedBrushingIds()
      var deletedSet = {}
      deletedIds.forEach(function(id) { deletedSet[id] = true })

      // 合并云端与本地数据（以 id 去重），避免任一方缺失导致记录丢失
      var mergedMap = {}
      localRecords.forEach(function(r) {
        if (r && r.id && !deletedSet[r.id]) mergedMap[r.id] = r
      })
      cloudList.forEach(function(r) {
        if (r && r.id && !deletedSet[r.id] && !deletedSet[r._id]) {
          mergedMap[r.id] = {
            ...r,
            id: r.id || r._id,
            imagePath: r.cloudFileID || r.imagePath || '',
            images: r.images || (r.cloudFileID ? [r.cloudFileID] : [])
          }
        }
      })

      var merged = []
      for (var key in mergedMap) {
        merged.push(mergedMap[key])
      }

      // 按创建时间倒序排序
      merged.sort(function(a, b) {
        return new Date(b.createTime || 0) - new Date(a.createTime || 0)
      })

      childStorage.set('brushingRecords', merged)

      // 云端仍存在但本地已删除的记录，再次尝试删除
      cloudList.forEach(function(r) {
        if (r && r.id && (deletedSet[r.id] || deletedSet[r._id])) {
          wx.cloud.callFunction({
            name: 'record',
            data: { action: 'remove', collection: 'brushingRecords', id: r.id }
          }).catch(function() {})
        }
      })

      return merged
    }
  } catch (err) {
    console.warn('云端读取失败，使用本地缓存:', err)
  }

  return localRecords
}

async function removeBrushingRecord(id) {
  // 记录墓碑，防止 fetchBrushingRecords 合并时把已删除记录拉回来
  addDeletedBrushingId(id)

  // 从本地缓存删除
  childStorage.set('brushingRecords', (childStorage.get('brushingRecords') || []).filter(function(r) { return r.id !== id }))

  // 尝试删除云端记录
  if (isCloudReady()) {
    try {
      var res = await wx.cloud.callFunction({
        name: 'record',
        data: { action: 'remove', collection: 'brushingRecords', id: id }
      })
      // 只有云端删除成功后，才清除墓碑
      if (res.result && res.result.code === 0) {
        removeTombstone(DELETED_BRUSHING_KEY, id)
      }
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
  var localNotes = childStorage.get('notes') || []
  var member = auth.getMember()
  if (!member) return localNotes

  if (!isCloudReady()) {
    return localNotes
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
      var cloudList = res.result.data.list || []
      var deletedIds = getDeletedNoteIds()
      var deletedSet = {}
      deletedIds.forEach(function(id) { deletedSet[id] = true })

      // 合并云端与本地数据（以 id 去重），避免任一方缺失导致笔记丢失
      var mergedMap = {}
      localNotes.forEach(function(n) {
        if (n && n.id && !deletedSet[n.id]) mergedMap[n.id] = n
      })
      cloudList.forEach(function(n) {
        if (n && n.id && !deletedSet[n.id] && !deletedSet[n._id]) {
          mergedMap[n.id] = n
        }
      })

      var merged = []
      for (var key in mergedMap) {
        merged.push(mergedMap[key])
      }

      // 按创建时间倒序排序
      merged.sort(function(a, b) {
        return new Date(b.createTime || 0) - new Date(a.createTime || 0)
      })

      childStorage.set('notes', merged)

      // 云端仍存在但本地已删除的记录，再次尝试删除
      cloudList.forEach(function(n) {
        if (n && n.id && (deletedSet[n.id] || deletedSet[n._id])) {
          wx.cloud.callFunction({
            name: 'record',
            data: { action: 'remove', collection: 'notes', id: n.id }
          }).catch(function() {})
        }
      })

      return merged
    }
  } catch (err) {
    console.warn('笔记云端读取失败，使用本地缓存:', err)
  }

  return localNotes
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
  // 记录墓碑，防止 fetchNotes 合并时把已删除记录拉回来
  addDeletedNoteId(id)

  // 从本地缓存删除
  childStorage.set('notes', (childStorage.get('notes') || []).filter(function(n) { return n.id !== id && n._id !== id }))

  // 尝试删除云端记录
  if (isCloudReady()) {
    try {
      var res = await wx.cloud.callFunction({
        name: 'record',
        data: { action: 'remove', collection: 'notes', id: id }
      })
      // 只有云端删除成功后，才清除墓碑
      if (res.result && res.result.code === 0) {
        removeTombstone(DELETED_NOTES_KEY, id)
      }
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
  var localProducts = childStorage.get('stallProducts') || []
  if (!isCloudReady()) return localProducts
  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'list', collection: 'stallProducts', childId: auth.getCurrentChildId() }
    })
    if (res.result.code === 0) {
      var cloudList = res.result.data.list || []
      var deletedIds = getDeletedStallProductIds()
      var deletedSet = {}
      deletedIds.forEach(function(id) { deletedSet[id] = true })

      // 合并云端与本地数据（以 id 去重），避免任一方缺失导致商品丢失
      var mergedMap = {}
      localProducts.forEach(function(p) {
        if (p && p.id && !deletedSet[p.id]) mergedMap[p.id] = p
      })
      cloudList.forEach(function(p) {
        if (p && p.id && !deletedSet[p.id] && !deletedSet[p._id]) {
          mergedMap[p.id] = p
        }
      })

      var merged = []
      for (var key in mergedMap) {
        merged.push(mergedMap[key])
      }

      childStorage.set('stallProducts', merged)

      // 云端仍存在但本地已删除的记录，再次尝试删除
      cloudList.forEach(function(p) {
        if (p && p.id && (deletedSet[p.id] || deletedSet[p._id])) {
          wx.cloud.callFunction({
            name: 'record',
            data: { action: 'remove', collection: 'stallProducts', id: p.id }
          }).catch(function() {})
        }
      })

      return merged
    }
  } catch (err) {
    console.warn('云端读取摆摊商品失败:', err)
  }
  return childStorage.get('stallProducts') || []
}

async function removeStallProduct(id) {
  // 记录墓碑，防止 fetchStallProducts 合并时把已删除记录拉回来
  addDeletedStallProductId(id)

  // 从本地缓存删除
  childStorage.set('stallProducts', (childStorage.get('stallProducts') || []).filter(function(p) { return p.id !== id }))

  // 尝试删除云端记录
  if (!isCloudReady()) return
  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'remove', collection: 'stallProducts', id: id }
    })
    // 只有云端删除成功后，才清除墓碑
    if (res.result && res.result.code === 0) {
      removeTombstone(DELETED_STALL_PRODUCTS_KEY, id)
    }
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
  var localSales = childStorage.get('stallSales') || []
  if (!isCloudReady()) return localSales
  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'list', collection: 'stallSales', childId: auth.getCurrentChildId() }
    })
    if (res.result.code === 0) {
      var cloudList = res.result.data.list || []
      var deletedIds = getDeletedStallSaleIds()
      var deletedSet = {}
      deletedIds.forEach(function(id) { deletedSet[id] = true })

      // 合并云端与本地数据（以 id 去重），避免任一方缺失导致销售记录丢失
      var mergedMap = {}
      localSales.forEach(function(s) {
        if (s && s.id && !deletedSet[s.id]) mergedMap[s.id] = s
      })
      cloudList.forEach(function(s) {
        if (s && s.id && !deletedSet[s.id] && !deletedSet[s._id]) {
          mergedMap[s.id] = s
        }
      })

      var merged = []
      for (var key in mergedMap) {
        merged.push(mergedMap[key])
      }

      childStorage.set('stallSales', merged)

      // 云端仍存在但本地已删除的记录，再次尝试删除
      cloudList.forEach(function(s) {
        if (s && s.id && (deletedSet[s.id] || deletedSet[s._id])) {
          wx.cloud.callFunction({
            name: 'record',
            data: { action: 'remove', collection: 'stallSales', id: s.id }
          }).catch(function() {})
        }
      })

      return merged
    }
  } catch (err) {
    console.warn('云端读取销售记录失败:', err)
  }
  return localSales
}

async function removeStallSale(id) {
  // 记录墓碑，防止 fetchStallSales 合并时把已删除记录拉回来
  addDeletedStallSaleId(id)

  // 从本地缓存删除
  childStorage.set('stallSales', (childStorage.get('stallSales') || []).filter(function(s) { return s.id !== id }))

  // 尝试删除云端记录
  if (!isCloudReady()) return
  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'remove', collection: 'stallSales', id: id }
    })
    // 只有云端删除成功后，才清除墓碑
    if (res.result && res.result.code === 0) {
      removeTombstone(DELETED_STALL_SALES_KEY, id)
    }
  } catch (err) {
    console.warn('云端删除销售记录失败:', err)
  }
}

async function uploadStallSettings(settings) {
  if (!isCloudReady()) return
  try {
    // 先尝试更新，如果不存在则添加
    await wx.cloud.callFunction({
      name: 'record',
      data: {
        action: 'update',
        collection: 'stallSettings',
        id: 'stall_settings',
        data: settings
      }
    })
  } catch (err) {
    // 如果更新失败（文档不存在），则添加
    try {
      await wx.cloud.callFunction({
        name: 'record',
        data: {
          action: 'add',
          collection: 'stallSettings',
          data: { _id: 'stall_settings', ...settings }
        }
      })
    } catch (addErr) {
      console.warn('云端同步摊位设置失败:', addErr)
    }
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

// ===== 摆摊挑战和营业时间 =====

async function uploadStallChallenges(challenges) {
  if (!isCloudReady()) return
  try {
    await wx.cloud.callFunction({
      name: 'record',
      data: {
        action: 'add',
        collection: 'stallChallenges',
        data: { _id: 'stall_challenges', ...challenges }
      }
    })
  } catch (err) {
    console.warn('云端同步挑战数据失败:', err)
  }
}

async function fetchStallChallenges() {
  if (!isCloudReady()) return null
  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'get', collection: 'stallChallenges' }
    })
    if (res.result.code === 0) {
      return res.result.data
    }
  } catch (err) {
    console.warn('云端读取挑战数据失败:', err)
  }
  return null
}

async function uploadStallBusinessHours(hours) {
  if (!isCloudReady()) return
  try {
    await wx.cloud.callFunction({
      name: 'record',
      data: {
        action: 'add',
        collection: 'stallBusinessHours',
        data: { _id: 'stall_business_hours', ...hours }
      }
    })
  } catch (err) {
    console.warn('云端同步营业时间失败:', err)
  }
}

async function fetchStallBusinessHours() {
  if (!isCloudReady()) return null
  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'get', collection: 'stallBusinessHours' }
    })
    if (res.result.code === 0) {
      return res.result.data
    }
  } catch (err) {
    console.warn('云端读取营业时间失败:', err)
  }
  return null
}

module.exports = {
  isCloudReady: isCloudReady,
  uploadDrawing: uploadDrawing,
  fetchDrawings: fetchDrawings,
  removeDrawing: removeDrawing,
  updateDrawingName: updateDrawingName,
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
  fetchStallSettings: fetchStallSettings,
  uploadStallChallenges: uploadStallChallenges,
  fetchStallChallenges: fetchStallChallenges,
  uploadStallBusinessHours: uploadStallBusinessHours,
  fetchStallBusinessHours: fetchStallBusinessHours
}
