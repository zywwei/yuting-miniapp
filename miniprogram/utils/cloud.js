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

// ===== 单例文档云端读写 =====
// 单例数据（习惯定义、学习进度、设置、成就、刷牙故事/角色/积分/装饰、摆摊设置等）
// 统一通过 upsertSingleton/getSingleton 同步：云端 _id 由 familyId + childId + key
// 复合生成，确保不同家庭、不同孩子各自独立，互不覆盖。
function callUpsertSingleton(collection, key, data) {
  return wx.cloud.callFunction({
    name: 'record',
    data: {
      action: 'upsertSingleton',
      collection: collection,
      key: key,
      childId: auth.getCurrentChildId(),
      data: data || {}
    }
  })
}

function callGetSingleton(collection, key) {
  return wx.cloud.callFunction({
    name: 'record',
    data: {
      action: 'getSingleton',
      collection: collection,
      key: key,
      childId: auth.getCurrentChildId()
    }
  })
}

// 单例文档入队（离线时走同步队列，联网后由 flush 调 upsertSingleton 重试）
function enqueueSingleton(collection, key, data) {
  syncQueue.enqueue({
    id: 'singleton_' + collection + '_' + key,
    action: 'upsertSingleton',
    collection: collection,
    data: data || {},
    extra: { key: key, childId: auth.getCurrentChildId() }
  })
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

// ===== 通用墓碑操作（供 game-cloud 等模块复用，按 key 隔离）=====
// 读取指定 key 下的已删除 ID 列表（自动清理过期墓碑）
function getDeletedIdsByKey(key) {
  var tombstones = cleanExpiredTombstones(key)
  return extractTombstoneIds(tombstones)
}

// 向指定 key 追加一个已删除 ID
function addDeletedIdByKey(key, id) {
  if (!id) return
  var tombstones = cleanExpiredTombstones(key)
  var exists = tombstones.some(function(item) {
    return (typeof item === 'string' ? item : item.id) === id
  })
  if (!exists) {
    tombstones.push({ id: id, ts: Date.now() })
    childStorage.set(key, tombstones)
  }
}

// 清除指定 key 下的某个墓碑
function removeTombstoneByKey(key, id) {
  removeTombstone(key, id)
}

// ===== 画作 =====

async function uploadDrawing(tempFilePath, drawing) {
  var meta = getRecordMeta()
  var record = {
    ...drawing,
    ...meta,
    likes: [],
    synced: false  // 标记为未同步
  }

  var util = require('./util.js')
  // 先把图片落到持久化目录，保证本地一定能展示
  var savedPath = await util.saveImageToPersistent(tempFilePath)
  record.imagePath = savedPath

  // 写入本地缓存（立即生效，离线可见）
  var localDrawings = childStorage.get('drawings') || []
  localDrawings.unshift(record)
  childStorage.set('drawings', localDrawings)

  // 云端不可用：入队等待联网后重试（含图片上传任务）
  if (!isCloudReady() || !db()) {
    syncQueue.enqueue({
      id: drawing.id,
      action: 'add',
      collection: 'drawings',
      data: record,
      uploadImages: [{
        field: 'imagePath',
        localPath: savedPath,
        cloudPath: 'drawings/' + drawing.id + '.png'
      }]
    })
    return savedPath
  }

  try {
    var cloudPath = 'drawings/' + drawing.id + '.png'
    var uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: tempFilePath })

    record.cloudFileID = uploadRes.fileID
    record.imagePath = uploadRes.fileID
    record.synced = true  // 标记为已同步

    // 同步成功后回写本地缓存的图片路径为 fileID
    var afterDrawings = childStorage.get('drawings') || []
    for (var i = 0; i < afterDrawings.length; i++) {
      if (afterDrawings[i].id === drawing.id) {
        afterDrawings[i] = record
        break
      }
    }
    childStorage.set('drawings', afterDrawings)

    try {
      await wx.cloud.callFunction({
        name: 'record',
        data: { action: 'add', collection: 'drawings', data: record }
      })
    } catch (e) {
      // 云函数调用失败：入队重试（图片已传，仅重试记录入库）
      syncQueue.enqueue({
        id: drawing.id,
        action: 'add',
        collection: 'drawings',
        data: record,
        uploadImages: []
      })
    }

    return uploadRes.fileID
  } catch (err) {
    console.warn('云端上传失败，已入队等待重试:', err)
    // 图片上传或前置步骤失败：入队重试，联网后由 syncQueue 补传
    syncQueue.enqueue({
      id: drawing.id,
      action: 'add',
      collection: 'drawings',
      data: record,
      uploadImages: [{
        field: 'imagePath',
        localPath: savedPath,
        cloudPath: 'drawings/' + drawing.id + '.png'
      }]
    })
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

      // 构建云端数据映射
      var cloudMap = {}
      cloudList.forEach(function(d) {
        if (d && d.id && !deletedSet[d.id]) {
          cloudMap[d.id] = d
        }
      })

      // 合并策略：
      // 1. 云端有的数据 → 使用云端数据
      // 2. 云端没有但本地有且 synced!=true → 保留（新添加未同步）
      // 3. 云端没有但本地有且 synced=true → 不保留（已被其他设备合法删除）
      var merged = []
      var mergedIds = {}

      // 先添加云端数据
      cloudList.forEach(function(d) {
        if (d && d.id && !deletedSet[d.id]) {
          merged.push(d)
          mergedIds[d.id] = true
        }
      })

      // 再添加本地独有数据（仅保留未同步的，已同步但云端缺失的说明已被其他设备删除）
      localDrawings.forEach(function(d) {
        if (d && d.id && !mergedIds[d.id] && !deletedSet[d.id] && !d.synced) {
          merged.push(d)
          mergedIds[d.id] = true
        }
      })

      // 自愈：本地未同步的记录补传到云端（synced=true 的不补传，可能已被其他设备合法删除）
      selfHealDrawings(cloudList, localDrawings, deletedSet)

      // 按创建时间倒序排序
      merged.sort(function(a, b) {
        return new Date(b.createTime || 0) - new Date(a.createTime || 0)
      })

      // 用合并结果更新本地缓存
      childStorage.set('drawings', merged)

      // 云端仍存在但本地已删除的记录：立即尝试删除，失败则入队重试（避免墓碑过期后孤儿记录复活）
      cloudList.forEach(function(d) {
        if (d && d.id && deletedSet[d.id]) {
          wx.cloud.callFunction({
            name: 'record',
            data: { action: 'remove', collection: 'drawings', id: d.id }
          }).then(function(res) {
            if (res.result && res.result.code === 0) {
              removeTombstone(DELETED_DRAWINGS_KEY, d.id)
            }
          }).catch(function() {
            // 失败入队，由 syncQueue 重试，确保云端记录最终被删除
            syncQueue.enqueue({
              id: 'remove_drawing_' + d.id,
              action: 'remove',
              collection: 'drawings',
              extra: { id: d.id }
            })
          })
        }
      })

      return merged
    }
  } catch (err) {
    console.warn('云端读取失败，使用本地缓存:', err)
  }

  return localDrawings
}

// 数据自愈：将本地有但云端缺失的画作补传到云端
// 对图片是本地路径的记录，先上传图片再入库；已是 fileID 的直接入库
function selfHealDrawings(cloudList, localDrawings, deletedSet) {
  deletedSet = deletedSet || {}
  var cloudIds = {}
  cloudList.forEach(function(d) {
    if (d && d.id) cloudIds[d.id] = true
  })
  localDrawings.forEach(function(d) {
    // 已删除的、或云端已有的、或已同步过的，都不补传
    // synced=true 的记录如果云端缺失，说明被其他设备合法删除，不应复活
    if (d && d.id && !cloudIds[d.id] && !deletedSet[d.id] && !d.synced) {
      // 图片已是云端 fileID，直接补传记录
      if (d.imagePath && d.imagePath.startsWith('cloud://')) {
        wx.cloud.callFunction({
          name: 'record',
          data: { action: 'add', collection: 'drawings', data: d }
        }).catch(function() {})
      } else if (d.imagePath) {
        // 图片是本地路径，先上传图片再入库
        var cloudPath = 'drawings/' + d.id + '.png'
        var localPath = d.imagePath  // 保存原本地路径用于回写定位
        wx.cloud.uploadFile({ cloudPath: cloudPath, filePath: localPath }).then(function(uploadRes) {
          var fileID = uploadRes.fileID
          var healed = Object.assign({}, d, { cloudFileID: fileID, imagePath: fileID, synced: true })
          return wx.cloud.callFunction({
            name: 'record',
            data: { action: 'add', collection: 'drawings', data: healed }
          }).then(function() { return fileID })
        }).then(function(fileID) {
          // 补传成功后回写本地缓存：imagePath 由本地路径更新为 fileID
          var cur = childStorage.get('drawings') || []
          for (var i = 0; i < cur.length; i++) {
            if (cur[i].id === d.id && cur[i].imagePath === localPath) {
              cur[i].cloudFileID = fileID
              cur[i].imagePath = fileID
              cur[i].synced = true
              break
            }
          }
          childStorage.set('drawings', cur)
        }).catch(function(err) {
          console.warn('画作自愈补传失败:', d.id, err)
        })
      }
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
      console.warn('云端更新名称失败，已入队重试:', err)
      // 入队重试，联网后由 syncQueue 自动同步
      syncQueue.enqueue({
        id: 'update_drawing_' + id,
        action: 'update',
        collection: 'drawings',
        data: { name: newName },
        extra: { id: id }
      })
    }
  }
}

// ===== 刷牙打卡 =====

async function uploadBrushingRecord(record) {
  var meta = getRecordMeta()
  var fullRecord = {
    ...record,
    ...meta,
    likes: [],
    synced: false  // 标记为未同步
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
    // 逐张上传图片，每张成功后立即回写本地与 fullRecord，避免部分失败时丢失已传 fileID
    for (var k = 0; k < uploadImages.length; k++) {
      var img2 = uploadImages[k]
      try {
        var uploadRes = await wx.cloud.uploadFile({
          cloudPath: img2.cloudPath,
          filePath: img2.localPath
        })
        fullRecord.images[k] = uploadRes.fileID
        if (k === 0) fullRecord.imagePath = uploadRes.fileID
        // 回写本地缓存
        var tmpRecs = childStorage.get('brushingRecords') || []
        for (var ti = 0; ti < tmpRecs.length; ti++) {
          if (tmpRecs[ti].id === record.id) {
            tmpRecs[ti].images[k] = uploadRes.fileID
            if (k === 0) tmpRecs[ti].imagePath = uploadRes.fileID
            break
          }
        }
        childStorage.set('brushingRecords', tmpRecs)
      } catch (imgErr) {
        // 单张失败：把已传成功的 fileID 更新到队列项，抛出触发整体重试（flush 会跳过已传的图）
        console.warn('刷牙图片上传失败:', img2.localPath, imgErr)
        syncQueue.updateData(record.id, fullRecord)
        throw imgErr
      }
    }
    await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'add', collection: 'brushingRecords', data: fullRecord }
    })
    syncQueue.dequeue(record.id, 'add')

    // 同步成功，标记 synced=true
    var localRecords = childStorage.get('brushingRecords') || []
    for (var i = 0; i < localRecords.length; i++) {
      if (localRecords[i].id === record.id) {
        localRecords[i].synced = true
        break
      }
    }
    childStorage.set('brushingRecords', localRecords)
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

      var merged = mergeAndHeal('brushingRecords', 'brushingRecords', localRecords, cloudList, deletedSet, function(r) {
        return {
          ...r,
          id: r.id || r._id,
          imagePath: r.cloudFileID || r.imagePath || '',
          images: r.images || (r.cloudFileID ? [r.cloudFileID] : [])
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
      console.warn('云端更新失败，已入队重试:', err)
      syncQueue.enqueue({
        id: 'update_brushing_' + target.id,
        action: 'update',
        collection: 'brushingRecords',
        data: updates,
        extra: { id: target.id }
      })
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
      console.warn('云端更新失败，已入队重试:', err)
      syncQueue.enqueue({
        id: 'update_brushing_' + id,
        action: 'update',
        collection: 'brushingRecords',
        data: updates,
        extra: { id: id }
      })
    }
  }
}

// ===== 笔记 =====

async function uploadNote(note) {
  var meta = getRecordMeta()
  var record = {
    ...note,
    ...meta,
    likes: [],
    synced: false  // 标记为未同步
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
    // 逐个上传媒体（图片/语音），每个成功后立即回写本地与 record，避免部分失败时丢失已传 fileID
    for (var k = 0; k < uploadImages.length; k++) {
      var img = uploadImages[k]
      try {
        var uploadRes = await wx.cloud.uploadFile({
          cloudPath: img.cloudPath,
          filePath: img.localPath
        })
        // 按 field 正确回写（voice 或 images[n]）
        setMediaField(record, img.field, uploadRes.fileID)
        // 回写本地缓存
        var tmpNotes = childStorage.get('notes') || []
        for (var ti = 0; ti < tmpNotes.length; ti++) {
          if (tmpNotes[ti].id === note.id) {
            setMediaField(tmpNotes[ti], img.field, uploadRes.fileID)
            break
          }
        }
        childStorage.set('notes', tmpNotes)
      } catch (imgErr) {
        console.warn('笔记媒体上传失败:', img.localPath, imgErr)
        syncQueue.updateData(note.id, record)
        throw imgErr
      }
    }
    await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'add', collection: 'notes', data: record }
    })
    syncQueue.dequeue(note.id, 'add')

    // 同步成功，标记 synced=true
    var localNotes = childStorage.get('notes') || []
    for (var i = 0; i < localNotes.length; i++) {
      if (localNotes[i].id === note.id) {
        localNotes[i].synced = true
        break
      }
    }
    childStorage.set('notes', localNotes)
  } catch (err) {
    console.warn('笔记同步失败，已入队列:', err)
  }

  return localImages
}

// 按 field 字符串（如 'images[2]' 或 'voice'）设置对象中的媒体值
function setMediaField(obj, field, value) {
  if (field.indexOf('[') >= 0) {
    // images[n] 形式
    var match = field.match(/^(\w+)\[(\d+)\]$/)
    if (match) {
      var arr = obj[match[1]] || []
      arr[parseInt(match[2], 10)] = value
      obj[match[1]] = arr
    }
  } else {
    obj[field] = value
  }
}

// 通用自愈：本地存在但云端缺失的"未同步"记录补传到云端，防止创建后同步失败导致数据丢失。
// 依赖 record 云函数 addRecord 按客户端 id 幂等去重，补传不会产生重复记录。
// 注意：synced=true 但云端缺失的记录不补传（可能被其他设备合法删除），由删除逻辑处理。
var SELF_HEAL_MAX = 5

function selfHealRecords(collection, localList, cloudIdSet, deletedSet) {
  if (!isCloudReady()) return
  var count = 0
  localList.forEach(function(r) {
    if (count >= SELF_HEAL_MAX) return
    if (r && r.id && !r.synced && !cloudIdSet[r.id] && !deletedSet[r.id]) {
      wx.cloud.callFunction({
        name: 'record',
        data: { action: 'add', collection: collection, data: r }
      }).catch(function(err) { console.warn('自愈补传失败:', r.id, err) })
      count++
    }
  })
}

// 通用合并+自愈+排序+存储+墓碑重试（抽取自 fetchBrushingRecords/fetchNotes/fetchHabitRecords 共用逻辑，防止策略漂移）
function mergeAndHeal(collection, storageKey, localList, cloudList, deletedSet, transformCloudItem) {
  var merged = []
  var mergedIds = {}

  // 先添加云端数据
  cloudList.forEach(function(item) {
    if (item && item.id && !deletedSet[item.id]) {
      merged.push(transformCloudItem ? transformCloudItem(item) : item)
      mergedIds[item.id] = true
    }
  })

  // 再添加本地独有数据：仅保留未同步的（新创建的），已同步但云端缺失的视为被其他设备删除
  localList.forEach(function(r) {
    if (r && r.id && !mergedIds[r.id] && !deletedSet[r.id] && !r.synced) {
      merged.push(r)
    }
  })

  // 自愈：本地未同步的记录补传到云端
  var cloudIdSet = {}
  cloudList.forEach(function(r) { if (r && r.id) cloudIdSet[r.id] = true })
  selfHealRecords(collection, localList, cloudIdSet, deletedSet)

  // 按创建时间倒序排序
  merged.sort(function(a, b) {
    return new Date(b.createTime || 0) - new Date(a.createTime || 0)
  })

  childStorage.set(storageKey, merged)

  // 云端仍存在但本地已删除的记录，再次尝试删除
  cloudList.forEach(function(item) {
    if (item && item.id && (deletedSet[item.id] || deletedSet[item._id])) {
      wx.cloud.callFunction({
        name: 'record',
        data: { action: 'remove', collection: collection, id: item.id }
      }).catch(function() {})
    }
  })

  return merged
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

      // 构建云端数据映射
      var cloudMap = {}
      cloudList.forEach(function(n) {
        if (n && n.id && !deletedSet[n.id]) {
          cloudMap[n.id] = n
        }
      })

      var merged = mergeAndHeal('notes', 'notes', localNotes, cloudList, deletedSet)

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
      console.warn('笔记云端更新失败，已入队重试:', err)
      syncQueue.enqueue({
        id: 'update_note_' + id,
        action: 'update',
        collection: 'notes',
        data: updates,
        extra: { id: id }
      })
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
      // 单例：成就按"家庭+孩子"隔离存储
      await callUpsertSingleton('achievements', 'user_achievements', { list: achievements })
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
    var res = await callGetSingleton('achievements', 'user_achievements')
    if (res.result.code === 0 && res.result.data) {
      var list = res.result.data.list || []
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
    likes: [],
    synced: false  // 标记为未同步
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
    // 逐张上传图片，每张成功后立即回写本地与 fullRecord，避免部分失败时丢失已传 fileID
    for (var k = 0; k < uploadImages.length; k++) {
      var img = uploadImages[k]
      try {
        var uploadRes = await wx.cloud.uploadFile({
          cloudPath: img.cloudPath,
          filePath: img.localPath
        })
        fullRecord.images[k] = uploadRes.fileID
        if (k === 0) fullRecord.imagePath = uploadRes.fileID
        var tmpRecs = childStorage.get('habitRecords') || []
        for (var ti = 0; ti < tmpRecs.length; ti++) {
          if (tmpRecs[ti].id === record.id) {
            tmpRecs[ti].images[k] = uploadRes.fileID
            if (k === 0) tmpRecs[ti].imagePath = uploadRes.fileID
            break
          }
        }
        childStorage.set('habitRecords', tmpRecs)
      } catch (imgErr) {
        console.warn('习惯图片上传失败:', img.localPath, imgErr)
        syncQueue.updateData(record.id, fullRecord)
        throw imgErr
      }
    }
    await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'add', collection: 'habitRecords', data: fullRecord }
    })
    syncQueue.dequeue(record.id, 'add')

    // 同步成功，标记 synced=true
    var localRecords = childStorage.get('habitRecords') || []
    for (var i = 0; i < localRecords.length; i++) {
      if (localRecords[i].id === record.id) {
        localRecords[i].synced = true
        break
      }
    }
    childStorage.set('habitRecords', localRecords)
  } catch (err) {
    console.warn('习惯记录同步失败，已入队列:', err)
  }

  return fullRecord.imagePath
}

// 已删除习惯记录的墓碑清单（按孩子隔离）
var DELETED_HABIT_RECORDS_KEY = 'deletedHabitRecordIds'

function getDeletedHabitRecordIds() {
  var tombstones = cleanExpiredTombstones(DELETED_HABIT_RECORDS_KEY)
  return extractTombstoneIds(tombstones)
}

function addDeletedHabitRecordId(id) {
  if (!id) return
  var tombstones = cleanExpiredTombstones(DELETED_HABIT_RECORDS_KEY)
  var exists = tombstones.some(function(item) {
    return (typeof item === 'string' ? item : item.id) === id
  })
  if (!exists) {
    tombstones.push({ id: id, ts: Date.now() })
    childStorage.set(DELETED_HABIT_RECORDS_KEY, tombstones)
  }
}

async function fetchHabitRecords() {
  var localRecords = childStorage.get('habitRecords') || []
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
        collection: 'habitRecords',
        childId: auth.getCurrentChildId(),
        page: 1,
        pageSize: 500
      }
    })

    if (res.result.code === 0) {
      var cloudList = res.result.data.list || []
      var deletedIds = getDeletedHabitRecordIds()
      var deletedSet = {}
      deletedIds.forEach(function(id) { deletedSet[id] = true })

      var merged = mergeAndHeal('habitRecords', 'habitRecords', localRecords, cloudList, deletedSet, function(r) {
        return {
          ...r,
          id: r.id || r._id,
          imagePath: r.cloudFileID || r.imagePath || '',
          images: r.images || (r.cloudFileID ? [r.cloudFileID] : [])
        }
      })

      return merged
    }
  } catch (err) {
    console.warn('习惯记录云端读取失败，使用本地缓存:', err)
  }

  return localRecords
}

async function removeHabitRecord(id) {
  addDeletedHabitRecordId(id)

  childStorage.set('habitRecords', (childStorage.get('habitRecords') || []).filter(function(r) { return r.id !== id }))

  if (isCloudReady()) {
    try {
      var res = await wx.cloud.callFunction({
        name: 'record',
        data: { action: 'remove', collection: 'habitRecords', id: id }
      })
      if (res.result && res.result.code === 0) {
        removeTombstone(DELETED_HABIT_RECORDS_KEY, id)
      }
    } catch (err) {
      console.warn('习惯记录云端删除失败:', err)
    }
  }
}

// ===== 习惯定义 =====

async function uploadHabits(habits) {
  childStorage.set('habits', habits)

  if (isCloudReady()) {
    try {
      var now = new Date().toISOString()
      childStorage.set('habitsUpdatedAt', now)
      // 单例：习惯定义按"家庭+孩子"隔离存储
      await callUpsertSingleton('userSettings', 'habits', { list: habits, updatedAt: now })
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
    var res = await callGetSingleton('userSettings', 'habits')
    var habitsDoc = res.result.code === 0 ? res.result.data : null
    if (habitsDoc && habitsDoc.list) {
      // 乐观锁：仅当云端比本地更新时才覆盖，避免本地新改动被旧云端数据覆盖
      if (shouldUseCloud(habitsDoc.updatedAt, childStorage.get('habitsUpdatedAt'))) {
        childStorage.set('habits', habitsDoc.list)
        childStorage.set('habitsUpdatedAt', habitsDoc.updatedAt)
      }
      return childStorage.get('habits') || []
    }
  } catch (err) {
    console.warn('习惯定义云端读取失败:', err)
  }

  return childStorage.get('habits') || []
}

// 乐观锁比较：云端 updatedAt 比本地新（或本地无记录）时返回 true
function shouldUseCloud(cloudUpdatedAt, localUpdatedAt) {
  if (!cloudUpdatedAt) return true  // 云端无时间戳（旧数据），兼容使用
  if (!localUpdatedAt) return true  // 本地无时间戳，使用云端
  return new Date(cloudUpdatedAt).getTime() > new Date(localUpdatedAt).getTime()
}

// ===== 学习进度 =====

async function uploadLearnProgress(progress) {
  childStorage.set('learnProgress', progress)

  if (isCloudReady()) {
    try {
      var now = new Date().toISOString()
      childStorage.set('learnProgressUpdatedAt', now)
      // 单例：学习进度按"家庭+孩子"隔离存储
      await callUpsertSingleton('userSettings', 'learnProgress', { ...progress, updatedAt: now })
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
    var res = await callGetSingleton('userSettings', 'learnProgress')
    var progressDoc = res.result.code === 0 ? res.result.data : null
    if (progressDoc) {
      var cloudUpdatedAt = progressDoc.updatedAt
      var { _id, familyId, childId, skey, createdBy, createdByName, updatedBy, likes, createTime, updateTime, updatedAt, ...progress } = progressDoc
      // 乐观锁：仅云端更新时覆盖本地
      if (shouldUseCloud(cloudUpdatedAt, childStorage.get('learnProgressUpdatedAt'))) {
        childStorage.set('learnProgress', progress)
        childStorage.set('learnProgressUpdatedAt', cloudUpdatedAt)
      }
      return childStorage.get('learnProgress') || {}
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
      var now = new Date().toISOString()
      childStorage.set('settingsUpdatedAt', now)
      // 单例：设置按"家庭+孩子"隔离存储
      await callUpsertSingleton('userSettings', 'settings', { ...settings, updatedAt: now })
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
    var res = await callGetSingleton('userSettings', 'settings')
    var settingsDoc = res.result.code === 0 ? res.result.data : null
    if (settingsDoc) {
      var cloudUpdatedAt = settingsDoc.updatedAt
      var { _id, familyId, childId, skey, createdBy, createdByName, updatedBy, likes, createTime, updateTime, updatedAt, ...settings } = settingsDoc
      if (shouldUseCloud(cloudUpdatedAt, childStorage.get('settingsUpdatedAt'))) {
        childStorage.set('settings', settings)
        childStorage.set('settingsUpdatedAt', cloudUpdatedAt)
      }
      return childStorage.get('settings') || {}
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
      var now = new Date().toISOString()
      childStorage.set('brushingStoryUpdatedAt', now)
      // 单例：刷牙故事进度按"家庭+孩子"隔离存储
      await callUpsertSingleton('userSettings', 'brushingStory', { ...story, updatedAt: now })
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
    var res = await callGetSingleton('userSettings', 'brushingStory')
    var storyDoc = res.result.code === 0 ? res.result.data : null
    if (storyDoc) {
      var cloudUpdatedAt = storyDoc.updatedAt
      var { _id, familyId, childId, skey, createdBy, createdByName, updatedBy, likes, createTime, updateTime, updatedAt, ...story } = storyDoc
      if (shouldUseCloud(cloudUpdatedAt, childStorage.get('brushingStoryUpdatedAt'))) {
        childStorage.set('brushingStory', story)
        childStorage.set('brushingStoryUpdatedAt', cloudUpdatedAt)
      }
      return childStorage.get('brushingStory') || null
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
        // 头像云存储路径带上孩子维度，避免不同孩子的头像互相覆盖
        var avatarCloudPath = 'brushing/avatar_' + (auth.getCurrentChildId() || 'default') + '.png'
        var uploadRes = await wx.cloud.uploadFile({
          cloudPath: avatarCloudPath,
          filePath: avatar.imagePath
        })
        avatarData.imagePath = uploadRes.fileID
      }
      // 单例：刷牙角色按"家庭+孩子"隔离存储
      await callUpsertSingleton('userSettings', 'brushingAvatar', avatarData)
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
    var res = await callGetSingleton('userSettings', 'brushingAvatar')
    var avatarDoc = res.result.code === 0 ? res.result.data : null
    if (avatarDoc) {
      var { _id, familyId, childId, skey, createdBy, createdByName, updatedBy, likes, createTime, updateTime, updatedAt, ...avatar } = avatarDoc
      childStorage.set('brushingAvatar', avatar)
      return avatar
    }
  } catch (err) {}

  return childStorage.get('brushingAvatar') || null
}

// ===== 刷牙积分和装饰 =====

async function uploadBrushPoints(points) {
  childStorage.set('totalBrushPoints', points)

  if (isCloudReady()) {
    try {
      var now = new Date().toISOString()
      childStorage.set('totalBrushPointsUpdatedAt', now)
      // 单例：刷牙积分按"家庭+孩子"隔离存储
      await callUpsertSingleton('userSettings', 'totalBrushPoints', { value: points, updatedAt: now })
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
    var res = await callGetSingleton('userSettings', 'totalBrushPoints')
    var pointsDoc = res.result.code === 0 ? res.result.data : null
    if (pointsDoc && pointsDoc.value !== undefined) {
      // 乐观锁：仅云端更新时覆盖（积分取较大值，避免回退）
      if (shouldUseCloud(pointsDoc.updatedAt, childStorage.get('totalBrushPointsUpdatedAt'))) {
        var localPoints = childStorage.get('totalBrushPoints') || 0
        // 积分取较大值，防止本地已增加的积分被旧云端覆盖
        var finalPoints = Math.max(pointsDoc.value, localPoints)
        childStorage.set('totalBrushPoints', finalPoints)
        childStorage.set('totalBrushPointsUpdatedAt', pointsDoc.updatedAt)
      }
      return childStorage.get('totalBrushPoints') || 0
    }
  } catch (err) {}

  return childStorage.get('totalBrushPoints') || 0
}

async function uploadToothDecorations(decorations) {
  childStorage.set('toothDecorations', decorations)

  if (isCloudReady()) {
    try {
      var now = new Date().toISOString()
      childStorage.set('toothDecorationsUpdatedAt', now)
      // 单例：牙齿装饰按"家庭+孩子"隔离存储
      await callUpsertSingleton('userSettings', 'toothDecorations', { list: decorations, updatedAt: now })
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
    var res = await callGetSingleton('userSettings', 'toothDecorations')
    var decoDoc = res.result.code === 0 ? res.result.data : null
    if (decoDoc && decoDoc.list) {
      if (shouldUseCloud(decoDoc.updatedAt, childStorage.get('toothDecorationsUpdatedAt'))) {
        // 装饰是已购列表（只增不减），用并集合并避免丢失本地新购项
        var local = childStorage.get('toothDecorations') || []
        var mergedMap = {}
        decoDoc.list.forEach(function(d) { mergedMap[typeof d === 'string' ? d : d.id] = d })
        local.forEach(function(d) { var k = typeof d === 'string' ? d : d.id; if (!mergedMap[k]) mergedMap[k] = d })
        var merged = []
        for (var key in mergedMap) merged.push(mergedMap[key])
        childStorage.set('toothDecorations', merged)
        childStorage.set('toothDecorationsUpdatedAt', decoDoc.updatedAt)
      }
      return childStorage.get('toothDecorations') || []
    }
  } catch (err) {}

  return childStorage.get('toothDecorations') || []
}

// ===== 摆摊相关 =====

// 上传单个商品（带 _id 走 upsert，同 id 覆盖而非新建）
async function uploadStallProduct(product) {
  if (!isCloudReady()) return
  
  var productData = { ...product }
  
  // 如果 imagePath 是本地路径，先上传到云端
  if (productData.imagePath && !productData.imagePath.startsWith('cloud://')) {
    try {
      var util = require('./util.js')
      var savedPath = await util.saveImageToPersistent(productData.imagePath)
      var cloudPath = 'stall/products/' + product.id + '.png'
      var uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: savedPath })
      productData.imagePath = uploadRes.fileID
      
      // 更新本地缓存中的图片路径
      var localProducts = childStorage.get('stallProducts') || []
      for (var i = 0; i < localProducts.length; i++) {
        if (localProducts[i].id === product.id) {
          localProducts[i].imagePath = uploadRes.fileID
          break
        }
      }
      childStorage.set('stallProducts', localProducts)
    } catch (imgErr) {
      console.warn('商品图片上传失败:', imgErr)
      // 图片上传失败，入队列重试
      syncQueue.enqueue({ 
        id: productData.id, 
        action: 'add', 
        collection: 'stallProducts', 
        data: { _id: productData.id, ...productData },
        uploadImages: [{
          field: 'imagePath',
          localPath: productData.imagePath,
          cloudPath: 'stall/products/' + product.id + '.png'
        }]
      })
      return
    }
  }
  
  try {
    await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'add', collection: 'stallProducts', data: { _id: productData.id, ...productData } }
    })
    
    // 同步成功，标记 synced=true
    var localProducts = childStorage.get('stallProducts') || []
    for (var i = 0; i < localProducts.length; i++) {
      if (localProducts[i].id === product.id) {
        localProducts[i].synced = true
        break
      }
    }
    childStorage.set('stallProducts', localProducts)
  } catch (err) {
    console.warn('云端同步摆摊商品失败，入队列重试:', err)
    syncQueue.enqueue({ id: productData.id, action: 'add', collection: 'stallProducts', data: { _id: productData.id, ...productData } })
  }
}

async function fetchStallProducts() {
  var localProducts = childStorage.get('stallProducts') || []
  if (!isCloudReady()) return localProducts
  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'list', collection: 'stallProducts', childId: auth.getCurrentChildId(), pageSize: 100 }
    })
    if (res.result.code === 0) {
      var cloudList = res.result.data.list || []
      var deletedIds = getDeletedStallProductIds()
      var deletedSet = {}
      deletedIds.forEach(function(id) { deletedSet[id] = true })

      // 兼容旧格式：展开数组类型的文档
      var expandedList = []
      cloudList.forEach(function(item) {
        if (Array.isArray(item)) {
          item.forEach(function(p) { if (p && p.id) expandedList.push(p) })
        } else if (item && item.id) {
          expandedList.push(item)
        }
      })

      // 合并策略（过滤已删除的记录）
      var merged = []
      var mergedIds = {}

      // 先添加云端数据（排除已删除的）
      expandedList.forEach(function(p) {
        if (p && p.id && !deletedSet[p.id] && !deletedSet[p._id]) {
          merged.push(p)
          mergedIds[p.id] = true
        }
      })

      // 再添加本地独有数据（未同步到云端的）
      localProducts.forEach(function(p) {
        if (p && p.id && !mergedIds[p.id] && !deletedSet[p.id]) {
          if (!p.synced) {
            merged.push(p)
          }
        }
      })

      childStorage.set('stallProducts', merged)

      // 云端仍存在但本地已删除的记录，再次尝试删除
      expandedList.forEach(function(p) {
        if (p && p.id && deletedSet[p.id]) {
          wx.cloud.callFunction({
            name: 'record',
            data: { action: 'remove', collection: 'stallProducts', id: p._id || p.id }
          }).catch(function() {})
        }
      })

      // 清理云端旧格式的数组文档
      cleanLegacyArrayDocs('stallProducts', cloudList)

      return merged
    }
  } catch (err) {
    console.warn('云端读取摆摊商品失败:', err)
  }
  return localProducts
}

async function removeStallProduct(id) {
  // 先记录墓碑，防止 fetch 时把已删除记录拉回来
  addDeletedStallProductId(id)

  // 从本地缓存删除
  childStorage.set('stallProducts', (childStorage.get('stallProducts') || []).filter(function(p) { return p.id !== id }))

  // 尝试删除云端记录
  if (!isCloudReady()) return true
  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'remove', collection: 'stallProducts', id: id }
    })
    // 云端删除成功后，清除墓碑
    if (res.result && res.result.code === 0) {
      removeTombstone(DELETED_STALL_PRODUCTS_KEY, id)
      return true
    } else {
      console.warn('云端删除失败:', res.result)
      return false
    }
  } catch (err) {
    console.warn('云端删除摆摊商品失败:', err)
    return false
  }
}

// 上传单条销售记录（带 _id 走 upsert）
async function uploadStallSale(sale) {
  if (!isCloudReady()) return
  try {
    await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'add', collection: 'stallSales', data: { _id: sale.id, ...sale } }
    })
    
    // 同步成功，标记 synced=true
    var localSales = childStorage.get('stallSales') || []
    for (var i = 0; i < localSales.length; i++) {
      if (localSales[i].id === sale.id) {
        localSales[i].synced = true
        break
      }
    }
    childStorage.set('stallSales', localSales)
  } catch (err) {
    console.warn('云端同步销售记录失败，入队列重试:', err)
    syncQueue.enqueue({ id: sale.id, action: 'add', collection: 'stallSales', data: { _id: sale.id, ...sale } })
  }
}

async function fetchStallSales() {
  var localSales = childStorage.get('stallSales') || []
  if (!isCloudReady()) return localSales
  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'list', collection: 'stallSales', childId: auth.getCurrentChildId(), pageSize: 100 }
    })
    if (res.result.code === 0) {
      var cloudList = res.result.data.list || []
      var deletedIds = getDeletedStallSaleIds()
      var deletedSet = {}
      deletedIds.forEach(function(id) { deletedSet[id] = true })

      // 兼容旧格式：展开数组类型的文档
      var expandedList = []
      cloudList.forEach(function(item) {
        if (Array.isArray(item)) {
          item.forEach(function(s) { if (s && s.id) expandedList.push(s) })
        } else if (item && item.id) {
          expandedList.push(item)
        }
      })

      // 合并策略（过滤已删除的记录）
      var merged = []
      var mergedIds = {}

      // 先添加云端数据（排除已删除的）
      expandedList.forEach(function(s) {
        if (s && s.id && !deletedSet[s.id] && !deletedSet[s._id]) {
          merged.push(s)
          mergedIds[s.id] = true
        }
      })

      // 再添加本地独有数据（未同步到云端的）
      localSales.forEach(function(s) {
        if (s && s.id && !mergedIds[s.id] && !deletedSet[s.id]) {
          if (!s.synced) {
            merged.push(s)
          }
        }
      })

      childStorage.set('stallSales', merged)

      // 云端仍存在但本地已删除的记录，再次尝试删除
      expandedList.forEach(function(s) {
        if (s && s.id && deletedSet[s.id]) {
          wx.cloud.callFunction({
            name: 'record',
            data: { action: 'remove', collection: 'stallSales', id: s._id || s.id }
          }).catch(function() {})
        }
      })

      // 清理云端旧格式的数组文档
      cleanLegacyArrayDocs('stallSales', cloudList)

      return merged
    }
  } catch (err) {
    console.warn('云端读取销售记录失败:', err)
  }
  return localSales
}

async function removeStallSale(id) {
  // 先记录墓碑，防止 fetch 时把已删除记录拉回来
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
    // 云端删除成功后，清除墓碑
    if (res.result && res.result.code === 0) {
      removeTombstone(DELETED_STALL_SALES_KEY, id)
    } else {
      console.warn('云端删除销售记录失败:', res.result)
    }
  } catch (err) {
    console.warn('云端删除销售记录失败:', err)
  }
}

// 上传摊位设置（用固定 _id 的 upsert 一步到位）
async function uploadStallSettings(settings) {
  childStorage.set('stallSettings', settings)
  if (!isCloudReady()) return
  try {
    var now = new Date().toISOString()
    childStorage.set('stallSettingsUpdatedAt', now)
    // 单例：摊位设置按"家庭+孩子"隔离存储
    await callUpsertSingleton('stallSettings', 'stall_settings', { ...settings, updatedAt: now })
  } catch (err) {
    console.warn('云端同步摊位设置失败，入队列重试:', err)
    enqueueSingleton('stallSettings', 'stall_settings', { ...settings, updatedAt: now })
  }
}

async function fetchStallSettings() {
  if (!isCloudReady()) return childStorage.get('stallSettings') || null
  try {
    var res = await callGetSingleton('stallSettings', 'stall_settings')
    if (res.result.code === 0 && res.result.data) {
      var doc = res.result.data
      // 乐观锁：仅云端更新时覆盖本地
      if (shouldUseCloud(doc.updatedAt, childStorage.get('stallSettingsUpdatedAt'))) {
        var { _id, familyId, childId, skey, createdBy, createdByName, updatedBy, likes, createTime, updateTime, updatedAt, ...settings } = doc
        childStorage.set('stallSettings', settings)
        childStorage.set('stallSettingsUpdatedAt', doc.updatedAt)
        return settings
      }
      return childStorage.get('stallSettings') || null
    }
  } catch (err) {
    console.warn('云端读取摊位设置失败:', err)
  }
  return childStorage.get('stallSettings') || null
}

// 清理云端旧格式的数组文档（一次性迁移，旧 uploadStallProduct 传整个数组导致每条文档是数组快照）
async function cleanLegacyArrayDocs(collection, cloudList) {
  if (!isCloudReady()) return
  var legacyDocs = cloudList.filter(function(item) { return Array.isArray(item) })
  if (legacyDocs.length === 0) return
  for (var i = 0; i < legacyDocs.length; i++) {
    var doc = legacyDocs[i]
    try {
      await wx.cloud.callFunction({
        name: 'record',
        data: { action: 'remove', collection: collection, id: doc._id }
      })
    } catch (err) {
      console.warn('清理旧格式文档失败:', doc._id, err)
    }
  }
}

// ===== 摆摊挑战和营业时间 =====

async function uploadStallChallenges(challenges) {
  childStorage.set('stallDailyChallenges', challenges)
  if (!isCloudReady()) return
  try {
    var now = new Date().toISOString()
    childStorage.set('stallDailyChallengesUpdatedAt', now)
    // 单例：摊位挑战按"家庭+孩子"隔离存储
    await callUpsertSingleton('stallChallenges', 'stall_challenges', { ...challenges, updatedAt: now })
  } catch (err) {
    console.warn('云端同步挑战数据失败:', err)
  }
}

async function fetchStallChallenges() {
  if (!isCloudReady()) return childStorage.get('stallDailyChallenges') || null
  try {
    var res = await callGetSingleton('stallChallenges', 'stall_challenges')
    if (res.result.code === 0 && res.result.data) {
      var doc = res.result.data
      if (shouldUseCloud(doc.updatedAt, childStorage.get('stallDailyChallengesUpdatedAt'))) {
        var { _id, familyId, childId, skey, createdBy, createdByName, updatedBy, likes, createTime, updateTime, updatedAt, ...challenges } = doc
        childStorage.set('stallDailyChallenges', challenges)
        childStorage.set('stallDailyChallengesUpdatedAt', doc.updatedAt)
        return challenges
      }
      return childStorage.get('stallDailyChallenges') || null
    }
  } catch (err) {
    console.warn('云端读取挑战数据失败:', err)
  }
  return childStorage.get('stallDailyChallenges') || null
}

async function uploadStallBusinessHours(hours) {
  childStorage.set('stallBusinessHours', hours)
  if (!isCloudReady()) return
  try {
    var now = new Date().toISOString()
    childStorage.set('stallBusinessHoursUpdatedAt', now)
    // 单例：营业时间按"家庭+孩子"隔离存储
    await callUpsertSingleton('stallBusinessHours', 'stall_business_hours', { ...hours, updatedAt: now })
  } catch (err) {
    console.warn('云端同步营业时间失败:', err)
  }
}

async function fetchStallBusinessHours() {
  if (!isCloudReady()) return childStorage.get('stallBusinessHours') || null
  try {
    var res = await callGetSingleton('stallBusinessHours', 'stall_business_hours')
    if (res.result.code === 0 && res.result.data) {
      var doc = res.result.data
      if (shouldUseCloud(doc.updatedAt, childStorage.get('stallBusinessHoursUpdatedAt'))) {
        var { _id, familyId, childId, skey, createdBy, createdByName, updatedBy, likes, createTime, updateTime, updatedAt, ...hours } = doc
        childStorage.set('stallBusinessHours', hours)
        childStorage.set('stallBusinessHoursUpdatedAt', doc.updatedAt)
        return hours
      }
      return childStorage.get('stallBusinessHours') || null
    }
  } catch (err) {
    console.warn('云端读取营业时间失败:', err)
  }
  return childStorage.get('stallBusinessHours') || null
}

// ===== 单例文档一次性迁移（V2：固定 _id → 家庭+孩子复合 _id） =====
// 旧版本所有家庭/孩子共用固定 _id 的单例文档，存在跨家庭、跨孩子串号问题。
// 新版本改为复合 _id 隔离。迁移以本地（本就按孩子隔离、干净）数据为准，
// 重新 upsert 到云端复合 _id 文档。按孩子隔离的标志位确保每个孩子只迁移一次。
var SINGLETON_MIGRATION_FLAG = 'singletonMigratedV2'

async function migrateSingletonsToV2() {
  if (!isCloudReady()) return
  if (!auth.getMember()) return
  // 当前孩子已迁移过则跳过
  if (childStorage.get(SINGLETON_MIGRATION_FLAG)) return

  try {
    var tasks = []
    var achievements = childStorage.get('achievements')
    if (achievements && achievements.length) tasks.push(uploadAchievements(achievements))
    var habits = childStorage.get('habits')
    if (habits && habits.length) tasks.push(uploadHabits(habits))
    var learnProgress = childStorage.get('learnProgress')
    if (learnProgress && Object.keys(learnProgress).length) tasks.push(uploadLearnProgress(learnProgress))
    var settings = childStorage.get('settings')
    if (settings && Object.keys(settings).length) tasks.push(uploadSettings(settings))
    var brushingStory = childStorage.get('brushingStory')
    if (brushingStory) tasks.push(uploadBrushingStory(brushingStory))
    var brushingAvatar = childStorage.get('brushingAvatar')
    if (brushingAvatar) tasks.push(uploadBrushingAvatar(brushingAvatar))
    var brushPoints = childStorage.get('totalBrushPoints')
    if (brushPoints) tasks.push(uploadBrushPoints(brushPoints))
    var toothDecorations = childStorage.get('toothDecorations')
    if (toothDecorations && toothDecorations.length) tasks.push(uploadToothDecorations(toothDecorations))
    var stallSettings = childStorage.get('stallSettings')
    if (stallSettings) tasks.push(uploadStallSettings(stallSettings))
    var stallChallenges = childStorage.get('stallDailyChallenges')
    if (stallChallenges) tasks.push(uploadStallChallenges(stallChallenges))
    var stallBusinessHours = childStorage.get('stallBusinessHours')
    if (stallBusinessHours) tasks.push(uploadStallBusinessHours(stallBusinessHours))

    // 分批执行（每批最多 3 个），避免启动时并发过多拖慢首页
    for (var i = 0; i < tasks.length; i += 3) {
      await Promise.all(tasks.slice(i, i + 3))
    }
    // 标记当前孩子已完成迁移（按孩子隔离）
    childStorage.set(SINGLETON_MIGRATION_FLAG, true)
  } catch (err) {
    console.warn('单例数据迁移失败，下次启动将重试:', err)
  }
}

// ===== 记账本 =====

var DELETED_BOOKS_KEY = 'deletedBookIds'
var DELETED_ENTRIES_KEY = 'deletedEntryIds'

function getDeletedBookIds() {
  return getDeletedIdsByKey(DELETED_BOOKS_KEY)
}

function addDeletedBookId(id) {
  addDeletedIdByKey(DELETED_BOOKS_KEY, id)
}

function getDeletedEntryIds() {
  return getDeletedIdsByKey(DELETED_ENTRIES_KEY)
}

function addDeletedEntryId(id) {
  addDeletedIdByKey(DELETED_ENTRIES_KEY, id)
}

async function uploadAccountBook(book) {
  if (!isCloudReady()) return
  try {
    await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'add', collection: 'accountBooks', data: { _id: book.id, ...book } }
    })
    var books = childStorage.get('accountBooks') || []
    for (var i = 0; i < books.length; i++) {
      if (books[i].id === book.id) {
        books[i].synced = true
        break
      }
    }
    childStorage.set('accountBooks', books)
  } catch (err) {
    console.warn('账本同步失败，入队重试:', err)
    syncQueue.enqueue({ id: book.id, action: 'add', collection: 'accountBooks', data: { _id: book.id, ...book } })
  }
}

async function fetchAccountBooks() {
  var localBooks = childStorage.get('accountBooks') || []
  if (!isCloudReady()) return localBooks
  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'list', collection: 'accountBooks', childId: '', page: 1, pageSize: 100 }
    })
    if (res.result.code === 0) {
      var cloudList = res.result.data.list || []
      if (cloudList.length === 0 && localBooks.length > 0) return localBooks
      var deletedIds = getDeletedBookIds()
      var deletedSet = {}
      deletedIds.forEach(function(id) { deletedSet[id] = true })
      var merged = mergeAndHeal('accountBooks', 'accountBooks', localBooks, cloudList, deletedSet)
      return merged
    }
  } catch (err) {
    console.warn('账本云端读取失败:', err)
  }
  return localBooks
}

async function removeAccountBook(id) {
  addDeletedBookId(id)
  childStorage.set('accountBooks', (childStorage.get('accountBooks') || []).filter(function(b) { return b.id !== id }))
  if (!isCloudReady()) return
  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'remove', collection: 'accountBooks', id: id }
    })
    if (res.result && res.result.code === 0) {
      removeTombstone(DELETED_BOOKS_KEY, id)
    }
  } catch (err) {
    console.warn('云端删除账本失败:', err)
  }
}

async function uploadBookEntry(entry) {
  if (!isCloudReady()) return
  try {
    await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'add', collection: 'bookEntries', data: { _id: entry.id, ...entry } }
    })
    var entries = childStorage.get('accountEntries') || []
    for (var i = 0; i < entries.length; i++) {
      if (entries[i].id === entry.id) {
        entries[i].synced = true
        break
      }
    }
    childStorage.set('accountEntries', entries)
  } catch (err) {
    console.warn('记账条目同步失败，入队重试:', err)
    syncQueue.enqueue({ id: entry.id, action: 'add', collection: 'bookEntries', data: { _id: entry.id, ...entry } })
  }
}

async function fetchBookEntries() {
  var localEntries = childStorage.get('accountEntries') || []
  if (!isCloudReady()) return localEntries
  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'list', collection: 'bookEntries', childId: '', page: 1, pageSize: 100 }
    })
    if (res.result.code === 0) {
      var cloudList = res.result.data.list || []
      if (cloudList.length === 0 && localEntries.length > 0) return localEntries
      var deletedIds = getDeletedEntryIds()
      var deletedSet = {}
      deletedIds.forEach(function(id) { deletedSet[id] = true })
      var merged = mergeAndHeal('bookEntries', 'accountEntries', localEntries, cloudList, deletedSet)
      return merged
    }
  } catch (err) {
    console.warn('记账条目云端读取失败:', err)
  }
  return localEntries
}

async function removeBookEntry(id) {
  addDeletedEntryId(id)
  childStorage.set('accountEntries', (childStorage.get('accountEntries') || []).filter(function(e) { return e.id !== id }))
  if (!isCloudReady()) return
  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'remove', collection: 'bookEntries', id: id }
    })
    if (res.result && res.result.code === 0) {
      removeTombstone(DELETED_ENTRIES_KEY, id)
    }
  } catch (err) {
    console.warn('云端删除记账条目失败:', err)
  }
}

async function uploadAccountSettings(settings) {
  if (!isCloudReady()) return
  try {
    var now = new Date().toISOString()
    await callUpsertSingleton('accountSettings', 'account_settings', { ...settings, updatedAt: now })
  } catch (err) {
    console.warn('记账设置同步失败:', err)
  }
}

async function fetchAccountSettings() {
  if (!isCloudReady()) return childStorage.get('accountSettings') || {}
  try {
    var res = await callGetSingleton('accountSettings', 'account_settings')
    if (res.result.code === 0 && res.result.data) {
      var data = res.result.data
      delete data._id
      delete data.familyId
      delete data.childId
      delete data.skey
      delete data.createdBy
      delete data.createdByName
      delete data.updatedBy
      delete data.likes
      delete data.createTime
      delete data.updateTime
      return data
    }
  } catch (err) {
    console.warn('记账设置云端读取失败:', err)
  }
  return childStorage.get('accountSettings') || {}
}

module.exports = {
  isCloudReady: isCloudReady,
  // 通用墓碑操作（供 game-cloud 等模块复用）
  getDeletedIdsByKey: getDeletedIdsByKey,
  addDeletedIdByKey: addDeletedIdByKey,
  removeTombstoneByKey: removeTombstoneByKey,
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
  fetchHabitRecords: fetchHabitRecords,
  removeHabitRecord: removeHabitRecord,
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
  fetchStallBusinessHours: fetchStallBusinessHours,
  migrateSingletonsToV2: migrateSingletonsToV2,
  uploadAccountBook: uploadAccountBook,
  fetchAccountBooks: fetchAccountBooks,
  removeAccountBook: removeAccountBook,
  uploadBookEntry: uploadBookEntry,
  fetchBookEntries: fetchBookEntries,
  removeBookEntry: removeBookEntry,
  uploadAccountSettings: uploadAccountSettings,
  fetchAccountSettings: fetchAccountSettings
}
