/**
 * 云开发工具类（角色系统版本）
 * 读操作：云函数优先 → 失败降级读本地缓存
 * 写操作：写本地缓存（立即生效）→ 入同步队列 → 尝试云函数同步
 */

var auth = require('./auth.js')
var childStorage = require('./child-storage.js')
var syncQueue = require('./sync-queue.js')

// ===== 数据隔离级别枚举 =====
var ISOLATION_LEVEL = {
  FAMILY: 'family',      // 家庭级：familyId
  CHILD: 'child',        // 孩子级：familyId + childId（当前默认）
  MEMBER: 'member'       // 成员级：familyId + memberId
}

// ===== 单例文档隔离级别枚举 =====
var SINGLETON_ISOLATION = {
  FAMILY: 'family',      // familyId + key
  CHILD: 'child',        // familyId + childId + key（当前默认）
  MEMBER: 'member'       // familyId + memberId + key
}

// ===== 墓碑 key 常量表 =====
var TOMBSTONE_KEYS = {
  drawings: 'deletedDrawingIds',
  notes: 'deletedNoteIds',
  brushingRecords: 'deletedBrushingIds',
  habitRecords: 'deletedHabitRecordIds',
  stallProducts: 'deletedStallProductIds',
  stallSales: 'deletedStallSaleIds',
  accountBooks: 'deletedBookIds',
  bookEntries: 'deletedEntryIds',
  gameRecords: 'deletedGameRecordIds'
}

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

// ===== 存储 key 获取函数（根据隔离级别）=====

/**
 * 根据隔离级别获取存储 key
 * @param {Object} config
 * @param {string} config.storageKey - 基础存储 key
 * @param {string} [config.isolation='child'] - 隔离级别
 * @returns {string} 最终存储 key
 */
function getStorageKey(config) {
  var member = auth.getMember()
  var isolation = config.isolation || ISOLATION_LEVEL.CHILD
  
  switch (isolation) {
    case ISOLATION_LEVEL.FAMILY:
      return config.storageKey + '_family_' + (member ? member.familyId : '')
    case ISOLATION_LEVEL.CHILD:
      return config.storageKey
    case ISOLATION_LEVEL.MEMBER:
      return config.storageKey + '_member_' + (member ? member._id : '')
    default:
      return config.storageKey
  }
}

/**
 * 根据隔离级别获取墓碑 key
 * @param {Object} config
 * @param {string} config.deletedKey - 基础墓碑 key
 * @param {string} [config.isolation='child'] - 隔离级别
 * @returns {string} 最终墓碑 key
 */
function getTombstoneKey(config) {
  var member = auth.getMember()
  var isolation = config.isolation || ISOLATION_LEVEL.CHILD
  
  switch (isolation) {
    case ISOLATION_LEVEL.FAMILY:
      return config.deletedKey + '_family_' + (member ? member.familyId : '')
    case ISOLATION_LEVEL.CHILD:
      return config.deletedKey
    case ISOLATION_LEVEL.MEMBER:
      return config.deletedKey + '_member_' + (member ? member._id : '')
    default:
      return config.deletedKey
  }
}

/**
 * 标记记录为已同步
 * @param {string} storageKey - 本地存储 key
 * @param {string} id - 记录 ID
 */
function markRecordSynced(storageKey, id) {
  var list = childStorage.get(storageKey) || []
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      list[i].synced = true
      list[i].lastSyncAt = new Date().toISOString()
      break
    }
  }
  childStorage.set(storageKey, list)
}

/**
 * 更新本地记录的指定字段
 * @param {string} storageKey - 本地存储 key
 * @param {string} id - 记录 ID
 * @param {string} field - 字段名
 * @param {*} value - 字段值
 */
function updateLocalRecord(storageKey, id, field, value) {
  var list = childStorage.get(storageKey) || []
  for (var i = 0; i < list.length; i++) {
    if (list[i].id === id) {
      list[i][field] = value
      break
    }
  }
  childStorage.set(storageKey, list)
}

/**
 * 乐观锁比较：云端 updatedAt 比本地新时返回 true
 * @param {string} cloudUpdatedAt - 云端更新时间
 * @param {string} localUpdatedAt - 本地更新时间
 * @returns {boolean} 是否应该使用云端数据
 */
function shouldUseCloud(cloudUpdatedAt, localUpdatedAt) {
  if (!cloudUpdatedAt) return true  // 云端无时间戳（旧数据），兼容使用
  if (!localUpdatedAt) return true  // 本地无时间戳，使用云端
  return new Date(cloudUpdatedAt).getTime() > new Date(localUpdatedAt).getTime()
}

// ===== 单例文档云端读写 =====
// 单例数据（习惯定义、学习进度、设置、成就、刷牙故事/角色/积分/装饰、摆摊设置等）
// 统一通过 upsertSingleton/getSingleton 同步：云端 _id 由 familyId + childId + key
// 复合生成，确保不同家庭、不同孩子各自独立，互不覆盖。
// 支持三种隔离级别：家庭级（childId=''）、孩子级（childId=当前孩子）、成员级（memberId=当前成员）
function callUpsertSingleton(collection, key, data, childId, memberId) {
  var callData = {
    action: 'upsertSingleton',
    collection: collection,
    key: key,
    childId: childId !== undefined ? childId : auth.getCurrentChildId(),
    data: data || {}
  }
  // 如果传入了 memberId，添加到请求中
  if (memberId) {
    callData.memberId = memberId
  }
  return wx.cloud.callFunction({
    name: 'record',
    data: callData
  })
}

function callGetSingleton(collection, key, childId, memberId) {
  var callData = {
    action: 'getSingleton',
    collection: collection,
    key: key,
    childId: childId !== undefined ? childId : auth.getCurrentChildId()
  }
  // 如果传入了 memberId，添加到请求中
  if (memberId) {
    callData.memberId = memberId
  }
  return wx.cloud.callFunction({
    name: 'record',
    data: callData
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

// ===== 已删除笔记的墓碑清单（家庭级，不按孩子隔离）=====
var DELETED_NOTES_KEY = 'deletedNoteIds'

function getDeletedNoteIds() {
  var tombstones = cleanExpiredTombstones(DELETED_NOTES_KEY)
  return extractTombstoneIds(tombstones)
}

// ===== 已删除刷牙记录的墓碑清单（按孩子隔离）=====
var DELETED_BRUSHING_KEY = 'deletedBrushingIds'

function getDeletedBrushingIds() {
  var tombstones = cleanExpiredTombstones(DELETED_BRUSHING_KEY)
  return extractTombstoneIds(tombstones)
}

// ===== 已删除摆摊商品的墓碑清单 =====
var DELETED_STALL_PRODUCTS_KEY = 'deletedStallProductIds'

function getDeletedStallProductIds() {
  var tombstones = cleanExpiredTombstones(DELETED_STALL_PRODUCTS_KEY)
  return extractTombstoneIds(tombstones)
}

// ===== 已删除摆摊销售的墓碑清单 =====
var DELETED_STALL_SALES_KEY = 'deletedStallSaleIds'

function getDeletedStallSaleIds() {
  var tombstones = cleanExpiredTombstones(DELETED_STALL_SALES_KEY)
  return extractTombstoneIds(tombstones)
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

      var merged = []
      var mergedIds = {}

      cloudList.forEach(function(d) {
        if (d && d.id && !deletedSet[d.id]) {
          merged.push(d)
          mergedIds[d.id] = true
        }
      })

      localDrawings.forEach(function(d) {
        if (d && d.id && !mergedIds[d.id] && !deletedSet[d.id] && !d.synced) {
          merged.push(d)
        }
      })

      selfHealDrawings(cloudList, localDrawings, deletedSet)

      merged.sort(function(a, b) {
        return new Date(b.createTime || 0) - new Date(a.createTime || 0)
      })

      childStorage.set('drawings', merged)

      cloudList.forEach(function(d) {
        if (d && d.id && deletedSet[d.id]) {
          wx.cloud.callFunction({
            name: 'record',
            data: { action: 'remove', collection: 'drawings', id: d.id }
          }).then(function(res) {
            if (res.result && res.result.code === 0) {
              removeTombstone(DELETED_DRAWINGS_KEY, d.id)
            }
          }).catch(function(err) {
            console.warn('画作云端删除同步失败:', d.id, err)
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
        }).catch(function(err) { console.warn('画作补传失败:', d.id, err) })
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
  addDeletedIdByKey(DELETED_DRAWINGS_KEY, id)

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
      var savedPath = await util.saveImageToPersistent(img)
      localImages.push(savedPath)
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
        // 图片上传失败，不保存到云端，只保留本地，入队等待重试
        syncQueue.enqueue({
          id: record.id,
          action: 'add',
          collection: 'brushingRecords',
          data: fullRecord,
          uploadImages: uploadImages
        })
        return fullRecord.imagePath
      }
    }
    
    // 图片全部上传成功后，保存到云端
    await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'add', collection: 'brushingRecords', data: fullRecord }
    })

    // 同步成功，标记 synced=true
    localRecords = childStorage.get('brushingRecords') || []
    for (var i = 0; i < localRecords.length; i++) {
      if (localRecords[i].id === record.id) {
        localRecords[i].synced = true
        break
      }
    }
    childStorage.set('brushingRecords', localRecords)
  } catch (err) {
    console.warn('[刷牙上传] 云端保存失败:', err)
    // 云端保存失败，入队等待重试（此时图片已是云端路径）
    syncQueue.enqueue({
      id: record.id,
      action: 'add',
      collection: 'brushingRecords',
      data: fullRecord,
      uploadImages: []
    })
  }

  return fullRecord.imagePath
}

async function fetchBrushingRecords(date) {
  var localRecords = childStorage.get('brushingRecords') || []
  var member = auth.getMember()
  if (!member) return localRecords

  if (!isCloudReady()) {
    return localRecords
  }

  try {
    var queryData = {
      action: 'list',
      collection: 'brushingRecords',
      childId: auth.getCurrentChildId(),
      page: 1,
      pageSize: 200
    }
    // 如果指定了日期，只拉取该日期的数据
    if (date) {
      queryData.date = date
    }

    var res = await wx.cloud.callFunction({
      name: 'record',
      data: queryData
    })

    if (res.result.code === 0) {
      var cloudList = res.result.data.list || []
      var deletedIds = getDeletedBrushingIds()
      var deletedSet = {}
      deletedIds.forEach(function(id) { deletedSet[id] = true })

      var merged = mergeAndHeal('brushingRecords', 'brushingRecords', localRecords, cloudList, deletedSet, function(r) {
        // 优先使用云端路径，其次使用本地路径
        var images = r.images || []
        var imagePath = r.imagePath || ''
        var cloudFileID = r.cloudFileID || ''
        
        // 优先使用云端路径
        var firstImage = cloudFileID || imagePath || images[0] || ''
        
        return {
          ...r,
          id: r.id || r._id,
          imagePath: firstImage,
          images: images.length > 0 ? images : (firstImage ? [firstImage] : [])
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
  addDeletedIdByKey(DELETED_BRUSHING_KEY, id)

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

  // 上传图片到云存储
  var cloudUpdates = { ...updates }
  if (updates.images && Array.isArray(updates.images)) {
    var cloudImages = []
    for (var j = 0; j < updates.images.length; j++) {
      var img = updates.images[j]
      if (img && !img.startsWith('cloud://')) {
        try {
          var savedPath = await util.saveImageToPersistent(img)
          var cloudPath = 'brushing/' + target.id + '_update_' + j + '_' + Date.now() + '.jpg'
          var uploadRes = await wx.cloud.uploadFile({ cloudPath: cloudPath, filePath: savedPath })
          cloudImages.push(uploadRes.fileID)
        } catch (imgErr) {
          console.warn('[updateBrushingRecord] 图片上传失败:', img, imgErr)
          cloudImages.push(img)  // 上传失败保留原路径
        }
      } else {
        cloudImages.push(img)
      }
    }
    cloudUpdates.images = cloudImages
    cloudUpdates.imagePath = cloudImages[0] || ''
  }

  var updatedRecords = localRecords.map(function(r) {
    if (r.date === today && r.timeOfDay === timeOfDay) {
      return { ...r, ...cloudUpdates }
    }
    return r
  })
  childStorage.set('brushingRecords', updatedRecords)

  if (isCloudReady()) {
    try {
      await wx.cloud.callFunction({
        name: 'record',
        data: { action: 'update', collection: 'brushingRecords', id: target.id, data: cloudUpdates }
      })
    } catch (err) {
      console.warn('云端更新失败，已入队重试:', err)
      syncQueue.enqueue({
        id: 'update_brushing_' + target.id,
        action: 'update',
        collection: 'brushingRecords',
        data: cloudUpdates,
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

  // 已持久化或云端/网络路径无需再次落盘，避免重复持久化浪费本地存储
  function isPersisted(p) {
    return !p || typeof p !== 'string' ||
      p.indexOf('cloud://') === 0 ||
      p.indexOf('http') === 0 ||
      p.indexOf(wx.env.USER_DATA_PATH) === 0
  }

  var images = note.images || []
  var localImages = []
  for (var i = 0; i < images.length; i++) {
    if (!isPersisted(images[i])) {
      var util = require('./util.js')
      localImages.push(await util.saveImageToPersistent(images[i], 'note'))
    } else {
      localImages.push(images[i])
    }
  }

  var localVoice = note.voice || ''
  if (!isPersisted(localVoice)) {
    var util2 = require('./util.js')
    localVoice = await util2.saveImageToPersistent(localVoice, 'note')
  }

  record.images = localImages
  record.voice = localVoice

  // 不再重复添加到本地存储（noteManager.addNote已添加）
  // 只更新已有记录的图片路径
  var localNotes = childStorage.get('notes') || []
  for (var i = 0; i < localNotes.length; i++) {
    if (localNotes[i].id === note.id) {
      localNotes[i].images = localImages
      localNotes[i].voice = localVoice
      break
    }
  }
  childStorage.set('notes', localNotes)

  var uploadImages = []
  for (var j = 0; j < localImages.length; j++) {
    if (!isPersisted(localImages[j])) {
      uploadImages.push({
        field: 'images[' + j + ']',
        localPath: localImages[j],
        // 随机路径避免编辑替换时覆盖旧文件（旧文件由 updateRecord 差集清理）
        cloudPath: 'notes/' + note.id + '_' + Date.now() + '_' + j + '.jpg'
      })
    }
  }

  if (!isPersisted(localVoice)) {
    uploadImages.push({
      field: 'voice',
      localPath: localVoice,
      cloudPath: 'notes/' + note.id + '_voice_' + Date.now() + '.aac'
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
        // 图片上传失败不阻塞笔记记录上传，继续处理
      }
    }
    
    // 准备上传的数据（移除本地临时字段）
    var uploadData = {
      id: record.id,
      type: record.type,
      title: record.title,
      content: record.content,
      mood: record.mood,
      tags: record.tags,
      images: record.images,
      voice: record.voice,
      visibility: record.visibility,
      visibleTo: record.visibleTo,
      createTime: record.createTime,
      createdBy: record.createdBy,
      createdByName: record.createdByName
    }
    
    // 上传笔记记录到云端（即使图片上传失败也要尝试）
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'add', collection: 'notes', data: uploadData }
    })
    
    // 检查云函数返回值
    if (res.result && res.result.code === 0) {
      syncQueue.dequeue(note.id, 'add')

      // 同步成功，标记 synced=true
      localNotes = childStorage.get('notes') || []
      for (var i = 0; i < localNotes.length; i++) {
        if (localNotes[i].id === note.id) {
          localNotes[i].synced = true
          break
        }
      }
      childStorage.set('notes', localNotes)
    } else {
      console.warn('笔记同步失败，云函数返回错误:', res.result)
      syncQueue.updateData(note.id, record)
    }
  } catch (err) {
    console.warn('笔记同步失败，异常:', err)
    // 更新同步队列
    syncQueue.updateData(note.id, record)
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
    // 只补传从未成功同步过的记录（lastSyncAt 为空）
    // 如果 lastSyncAt 有值，说明曾经同步成功，后来被其他设备删除，不应补传
    if (r && r.id && !r.synced && !cloudIdSet[r.id] && !deletedSet[r.id] && !r.lastSyncAt) {
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

  // 先添加云端数据（标记为已同步，防止自愈误判）
  cloudList.forEach(function(item) {
    if (item && item.id && !deletedSet[item.id] && !deletedSet[item._id]) {
      var transformed = transformCloudItem ? transformCloudItem(item) : item
      transformed.synced = true
      transformed.lastSyncAt = transformed.lastSyncAt || new Date().toISOString()
      merged.push(transformed)
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
      }).catch(function(err) { console.warn('云端删除同步失败:', item.id, err) })
    }
  })

  return merged
}

// ===== 增强版 mergeAndHeal（支持图片自愈）=====

/**
 * 通用合并 + 自愈 + 排序 + 存储 + 墓碑重试
 * @param {string} collection - 集合名
 * @param {string} storageKey - 本地存储 key
 * @param {Array} localList - 本地数据
 * @param {Array} cloudList - 云端数据
 * @param {Object} deletedSet - 已删除 ID 集合
 * @param {Function} [transformCloudItem] - 云端数据转换函数
 * @param {string} [imageField] - 图片字段名（用于自愈时处理图片）
 * @returns {Array} 合并后的数据
 */
function mergeAndHealV2(collection, storageKey, localList, cloudList, deletedSet, transformCloudItem, imageField) {
  var merged = []
  var mergedIds = {}

  // 1. 先添加云端数据（标记为已同步，防止自愈误判）
  cloudList.forEach(function(item) {
    if (item && item.id && !deletedSet[item.id] && !deletedSet[item._id]) {
      var transformed = transformCloudItem ? transformCloudItem(item) : item
      transformed.synced = true
      transformed.lastSyncAt = transformed.lastSyncAt || new Date().toISOString()
      merged.push(transformed)
      mergedIds[item.id] = true
    }
  })

  // 2. 再添加本地独有数据：仅保留未同步的（新创建的）
  // 已同步但云端缺失的视为被其他设备删除，不保留
  localList.forEach(function(r) {
    if (r && r.id && !mergedIds[r.id] && !deletedSet[r.id] && !r.synced) {
      merged.push(r)
    }
  })

  // 3. 自愈：本地未同步的记录补传到云端
  var cloudIdSet = {}
  cloudList.forEach(function(r) { if (r && r.id) cloudIdSet[r.id] = true })
  
  if (imageField) {
    selfHealWithImages(collection, storageKey, localList, cloudIdSet, deletedSet, imageField)
  } else {
    selfHealRecords(collection, localList, cloudIdSet, deletedSet)
  }

  // 4. 按创建时间倒序排序
  merged.sort(function(a, b) {
    return new Date(b.createTime || 0) - new Date(a.createTime || 0)
  })

  // 5. 用合并结果更新本地缓存
  childStorage.set(storageKey, merged)

  // 6. 云端仍存在但本地已删除的记录，再次尝试删除
  cloudList.forEach(function(item) {
    if (item && item.id && (deletedSet[item.id] || deletedSet[item._id])) {
      wx.cloud.callFunction({
        name: 'record',
        data: { action: 'remove', collection: collection, id: item.id }
      }).catch(function(err) { console.warn('云端删除同步失败:', item.id, err) })
    }
  })

  return merged
}

/**
 * 带图片的自愈：补传未同步的记录（含图片上传）
 * @param {string} collection - 集合名
 * @param {string} storageKey - 本地存储 key
 * @param {Array} localList - 本地数据
 * @param {Object} cloudIdSet - 云端已存在 ID 集合
 * @param {Object} deletedSet - 已删除 ID 集合
 * @param {string} imageField - 图片字段名
 */
function selfHealWithImages(collection, storageKey, localList, cloudIdSet, deletedSet, imageField) {
  if (!isCloudReady()) return
  var count = 0
  localList.forEach(function(r) {
    if (count >= SELF_HEAL_MAX) return
    if (r && r.id && !r.synced && !cloudIdSet[r.id] && !deletedSet[r.id] && !r.lastSyncAt) {
      var imageData = r[imageField]
      
      if (imageData && typeof imageData === 'string' && !imageData.startsWith('cloud://')) {
        // 图片是本地路径，先上传图片再补传记录
        var cloudPath = collection + '/' + r.id + '.png'
        wx.cloud.uploadFile({ cloudPath: cloudPath, filePath: imageData })
          .then(function(uploadRes) {
            var healed = Object.assign({}, r, { 
              [imageField]: uploadRes.fileID,
              synced: true 
            })
            return wx.cloud.callFunction({
              name: 'record',
              data: { action: 'add', collection: collection, data: healed }
            })
          })
          .then(function() {
            // 补传成功后回写本地缓存
            var cur = childStorage.get(storageKey) || []
            for (var i = 0; i < cur.length; i++) {
              if (cur[i].id === r.id) {
                cur[i].synced = true
                break
              }
            }
            childStorage.set(storageKey, cur)
          })
          .catch(function(err) { console.warn('自愈补传失败:', r.id, err) })
      } else {
        // 图片已是云端 fileID 或无图片，直接补传记录
        wx.cloud.callFunction({
          name: 'record',
          data: { action: 'add', collection: collection, data: r }
        }).catch(function(err) { console.warn('自愈补传失败:', r.id, err) })
      }
      count++
    }
  })
}

// ===== 工厂函数 =====

/**
 * 创建列表型数据的 fetch 函数
 * @param {Object} config
 * @param {string} config.collection - 云函数集合名
 * @param {string} config.storageKey - 本地存储 key
 * @param {string} config.deletedKey - 墓碑存储 key
 * @param {string} [config.isolation='child'] - 隔离级别：'family'|'child'|'member'
 * @param {number} [config.pageSize=100] - 分页大小
 * @param {Function} [config.transformCloudItem] - 云端数据转换函数
 * @param {Function} [config.expandLegacyItem] - 旧格式展开函数
 * @param {Function} [config.migrateLegacy] - 旧数据迁移函数
 * @param {boolean} [config.hasImage=false] - 是否有图片字段
 * @param {string} [config.imageField] - 图片字段名（hasImage=true 时必填）
 * @param {string} [config.gameType] - 游戏类型（游戏模块专用）
 * @returns {Function} fetch 函数
 */
function createListFetcher(config) {
  var isolation = config.isolation || ISOLATION_LEVEL.CHILD
  
  return async function fetchList() {
    var storageKey = getStorageKey(config)
    var localList = childStorage.get(storageKey) || []
    
    // 一次性迁移旧格式数据
    if (config.migrateLegacy) {
      localList = config.migrateLegacy(localList)
    }
    
    var member = auth.getMember()
    if (!member) return localList
    if (!isCloudReady()) return localList
    
    try {
      // 根据隔离级别构建查询参数
      var queryParams = {
        action: 'list',
        collection: config.collection,
        page: 1,
        pageSize: config.pageSize || 100
      }
      
      switch (isolation) {
        case ISOLATION_LEVEL.FAMILY:
          queryParams.childId = ''
          break
        case ISOLATION_LEVEL.CHILD:
          queryParams.childId = auth.getCurrentChildId()
          break
        case ISOLATION_LEVEL.MEMBER:
          queryParams.childId = ''
          queryParams.memberId = member._id
          break
        default:
          queryParams.childId = auth.getCurrentChildId()
      }
      
      var res = await wx.cloud.callFunction({
        name: 'record',
        data: queryParams
      })
      
      if (res.result.code === 0) {
        var cloudList = res.result.data.list || []
        
        // 兼容旧格式：展开数组类型的文档
        if (config.expandLegacyItem) {
          cloudList = config.expandLegacyItem(cloudList)
        }
        
        // 游戏模块：本地过滤 gameType
        if (config.gameType) {
          cloudList = cloudList.filter(function(r) {
            return r && r.gameType === config.gameType
          })
        }
        
        // 获取墓碑
        var tombstoneKey = getTombstoneKey(config)
        var deletedIds = getDeletedIdsByKey(tombstoneKey)
        var deletedSet = {}
        deletedIds.forEach(function(id) { deletedSet[id] = true })
        
        // 通用合并 + 自愈
        return mergeAndHealV2(
          config.collection,
          storageKey,
          localList,
          cloudList,
          deletedSet,
          config.transformCloudItem,
          config.hasImage ? config.imageField : null
        )
      }
    } catch (err) {
      console.warn(config.collection + ' 云端读取失败，使用本地缓存:', err)
    }
    
    return localList
  }
}

/**
 * 创建上传操作函数（不带图片）
 * @param {Object} config
 * @param {string} config.collection - 云函数集合名
 * @param {string} config.storageKey - 本地存储 key
 * @param {string} [config.isolation='child'] - 隔离级别
 * @returns {Function} 上传函数
 */
function createUploader(config) {
  return async function uploadRecord(record) {
    var meta = getRecordMeta()
    var recordData = { 
      ...record, 
      ...meta, 
      synced: false 
    }
    
    var storageKey = getStorageKey(config)
    
    // 1. 写本地（立即生效）
    var localList = childStorage.get(storageKey) || []
    var existing = localList.findIndex(function(item) { return item.id === record.id })
    if (existing >= 0) {
      localList[existing] = { ...localList[existing], ...recordData }
    } else {
      localList.unshift(recordData)
    }
    childStorage.set(storageKey, localList)
    
    // 2. 同步云端
    if (!isCloudReady()) return
    
    try {
      await wx.cloud.callFunction({
        name: 'record',
        data: { 
          action: 'add', 
          collection: config.collection, 
          data: { _id: record.id, ...recordData } 
        }
      })
      
      // 3. 成功：标记已同步
      markRecordSynced(storageKey, record.id)
    } catch (err) {
      console.warn(config.collection + ' 同步失败，入队重试:', err)
      // 4. 失败：入队等待重试
      syncQueue.enqueue({ 
        id: record.id, 
        action: 'add', 
        collection: config.collection, 
        data: { _id: record.id, ...recordData } 
      })
    }
  }
}

/**
 * 创建带图片的上传操作函数（两阶段同步）
 * @param {Object} config
 * @param {string} config.collection - 云函数集合名
 * @param {string} config.storageKey - 本地存储 key
 * @param {string} config.imageField - 图片字段名
 * @param {string} config.cloudPathPrefix - 云存储路径前缀
 * @param {string} [config.isolation='child'] - 隔离级别
 * @param {boolean} [config.multiImage=false] - 是否支持多图
 * @returns {Function} 上传函数
 */
function createUploaderWithImage(config) {
  return async function uploadRecordWithImage(record, tempFilePaths) {
    var meta = getRecordMeta()
    var recordData = { 
      ...record, 
      ...meta, 
      synced: false 
    }
    
    var storageKey = getStorageKey(config)
    var util = require('./util.js')
    var images = Array.isArray(tempFilePaths) ? tempFilePaths : [tempFilePaths]
    var localImages = []
    
    // 1. 图片落到持久化目录（保证本地能展示）
    for (var i = 0; i < images.length; i++) {
      var savedPath = await util.saveImageToPersistent(images[i])
      localImages.push(savedPath)
    }
    
    if (config.multiImage) {
      recordData[config.imageField] = localImages
    } else {
      recordData[config.imageField] = localImages[0]
    }
    
    // 2. 写本地（立即生效）
    var localList = childStorage.get(storageKey) || []
    localList.unshift(recordData)
    childStorage.set(storageKey, localList)
    
    // 3. 入队（含图片上传任务，两阶段同步）
    var uploadImages = []
    for (var j = 0; j < localImages.length; j++) {
      uploadImages.push({
        field: config.multiImage ? config.imageField + '[' + j + ']' : config.imageField,
        localPath: localImages[j],
        cloudPath: config.cloudPathPrefix + record.id + '_' + j + '.png'
      })
    }
    
    syncQueue.enqueue({
      id: record.id,
      action: 'add',
      collection: config.collection,
      data: recordData,
      uploadImages: uploadImages
    })
    
    // 4. 尝试立即同步
    if (!isCloudReady()) return
    
    try {
      // 逐张上传图片，每张成功后立即回写本地与 recordData，避免部分失败时丢失已传 fileID
      for (var k = 0; k < uploadImages.length; k++) {
        var img = uploadImages[k]
        try {
          var uploadRes = await wx.cloud.uploadFile({ 
            cloudPath: img.cloudPath, 
            filePath: img.localPath 
          })
          
          if (config.multiImage) {
            recordData[config.imageField][k] = uploadRes.fileID
          } else {
            recordData[config.imageField] = uploadRes.fileID
          }
          
          // 回写本地缓存
          var tmpList = childStorage.get(storageKey) || []
          for (var ti = 0; ti < tmpList.length; ti++) {
            if (tmpList[ti].id === record.id) {
              if (config.multiImage) {
                tmpList[ti][config.imageField][k] = uploadRes.fileID
              } else {
                tmpList[ti][config.imageField] = uploadRes.fileID
              }
              break
            }
          }
          childStorage.set(storageKey, tmpList)
        } catch (imgErr) {
          // 单张失败：更新队列项，抛出触发整体重试
          console.warn('图片上传失败:', img.localPath, imgErr)
          syncQueue.updateData(record.id, recordData)
          throw imgErr
        }
      }
      
      // 再同步记录
      await wx.cloud.callFunction({
        name: 'record',
        data: { 
          action: 'add', 
          collection: config.collection, 
          data: { _id: record.id, ...recordData } 
        }
      })
      
      // 成功：标记已同步 + 从队列移除
      markRecordSynced(storageKey, record.id)
      syncQueue.dequeue(record.id, 'add')
    } catch (err) {
      console.warn(config.collection + ' 同步失败，等待重试:', err)
    }
  }
}

/**
 * 创建删除操作函数
 * @param {Object} config
 * @param {string} config.collection - 云函数集合名
 * @param {string} config.storageKey - 本地存储 key
 * @param {string} config.deletedKey - 墓碑存储 key
 * @param {string} [config.isolation='child'] - 隔离级别
 * @returns {Function} 删除函数
 */
function createRemover(config) {
  return async function removeRecord(id) {
    var tombstoneKey = getTombstoneKey(config)
    var storageKey = getStorageKey(config)
    
    // 1. 写入墓碑
    addDeletedIdByKey(tombstoneKey, id)
    
    // 2. 从本地缓存删除
    var localList = childStorage.get(storageKey) || []
    childStorage.set(storageKey, localList.filter(function(item) { 
      return item.id !== id 
    }))
    
    // 3. 尝试删除云端记录
    if (!isCloudReady()) return false
    
    try {
      var res = await wx.cloud.callFunction({
        name: 'record',
        data: { 
          action: 'remove', 
          collection: config.collection, 
          id: id 
        }
      })
      
      if (res.result && res.result.code === 0) {
        removeTombstoneByKey(tombstoneKey, id)
        return true
      }
    } catch (err) {
      console.warn('云端删除' + config.collection + '失败:', err)
    }
    
    return false
  }
}

// ===== 模块配置表 =====

var LIST_MODULE_CONFIGS = {
  // 孩子级隔离（当前默认）
  drawings: {
    collection: 'drawings',
    storageKey: 'drawings',
    deletedKey: 'deletedDrawingIds',
    isolation: ISOLATION_LEVEL.CHILD,
    pageSize: 100,
    hasImage: true,
    imageField: 'imagePath',
    cloudPathPrefix: 'drawings/'
  },
  notes: {
    collection: 'notes',
    storageKey: 'notes',
    deletedKey: 'deletedNoteIds',
    isolation: ISOLATION_LEVEL.CHILD,
    pageSize: 200,
    hasImage: false
  },
  brushingRecords: {
    collection: 'brushingRecords',
    storageKey: 'brushingRecords',
    deletedKey: 'deletedBrushingIds',
    isolation: ISOLATION_LEVEL.CHILD,
    pageSize: 200,
    hasImage: true,
    multiImage: true,
    imageField: 'images',
    cloudPathPrefix: 'brushing/',
    transformCloudItem: function(r) {
      return {
        ...r,
        id: r.id || r._id,
        imagePath: r.cloudFileID || r.imagePath || '',
        images: r.images || (r.cloudFileID ? [r.cloudFileID] : [])
      }
    }
  },
  habitRecords: {
    collection: 'habitRecords',
    storageKey: 'habitRecords',
    deletedKey: 'deletedHabitRecordIds',
    isolation: ISOLATION_LEVEL.CHILD,
    pageSize: 200,
    hasImage: true,
    imageField: 'images',
    cloudPathPrefix: 'habits/'
  },
  stallProducts: {
    collection: 'stallProducts',
    storageKey: 'stallProducts',
    deletedKey: 'deletedStallProductIds',
    isolation: ISOLATION_LEVEL.CHILD,
    pageSize: 100,
    hasImage: true,
    imageField: 'imagePath',
    cloudPathPrefix: 'stall/products/',
    expandLegacyItem: function(list) {
      var expanded = []
      list.forEach(function(item) {
        if (Array.isArray(item)) {
          item.forEach(function(p) { if (p && p.id) expanded.push(p) })
        } else if (item && item.id) {
          expanded.push(item)
        }
      })
      return expanded
    }
  },
  stallSales: {
    collection: 'stallSales',
    storageKey: 'stallSales',
    deletedKey: 'deletedStallSaleIds',
    isolation: ISOLATION_LEVEL.CHILD,
    pageSize: 100,
    hasImage: false,
    expandLegacyItem: function(list) {
      var expanded = []
      list.forEach(function(item) {
        if (Array.isArray(item)) {
          item.forEach(function(s) { if (s && s.id) expanded.push(s) })
        } else if (item && item.id) {
          expanded.push(item)
        }
      })
      return expanded
    }
  },
  accountBooks: {
    collection: 'accountBooks',
    storageKey: 'accountBooks',
    deletedKey: 'deletedBookIds',
    isolation: ISOLATION_LEVEL.CHILD,
    pageSize: 100,
    hasImage: false
  },
  bookEntries: {
    collection: 'bookEntries',
    storageKey: 'accountEntries',
    deletedKey: 'deletedEntryIds',
    isolation: ISOLATION_LEVEL.CHILD,
    pageSize: 100,
    hasImage: true,
    imageField: 'images',
    cloudPathPrefix: 'account/'
  },
  // 家庭级共享（游戏记录）
  gameRecords: {
    collection: 'gameRecords',
    storageKey: 'gameRecords',
    deletedKey: 'deletedGameRecordIds',
    isolation: ISOLATION_LEVEL.FAMILY,
    pageSize: 200,
    hasImage: false
  }
}

// ===== 单例型同步工厂 =====

/**
 * 创建单例型数据的同步函数
 * @param {Object} config
 * @param {string} config.collection - 云函数集合名
 * @param {string} config.key - 单例 key
 * @param {string} config.storageKey - 本地存储 key
 * @param {string} [config.isolation='child'] - 隔离级别：'family'|'child'|'member'
 * @param {boolean} [config.useOptimisticLock=true] - 是否使用乐观锁
 * @returns {Object} { upload, fetch } 函数
 */
function createSingletonSync(config) {
  var isolation = config.isolation || SINGLETON_ISOLATION.CHILD
  var useLock = config.useOptimisticLock !== false
  
  return {
    /**
     * 上传单例数据到云端
     * @param {Object} data - 要上传的数据
     */
    upload: async function uploadSingleton(data) {
      var storageKey = getStorageKey(config)
      
      // 1. 写本地（立即生效）
      childStorage.set(storageKey, data)
      
      if (!isCloudReady()) return
      
      try {
        var now = new Date().toISOString()
        childStorage.set(storageKey + 'UpdatedAt', now)
        
        // 根据隔离级别构建上传参数
        var childId = undefined
        var memberId = undefined
        
        switch (isolation) {
          case SINGLETON_ISOLATION.FAMILY:
            childId = ''
            break
          case SINGLETON_ISOLATION.CHILD:
            childId = auth.getCurrentChildId()
            break
          case SINGLETON_ISOLATION.MEMBER:
            childId = ''
            memberId = auth.getMember()._id
            break
        }
        
        // 2. 同步云端
        await callUpsertSingleton(config.collection, config.key, {
          ...data,
          updatedAt: now
        }, childId, memberId)
      } catch (err) {
        console.warn(config.key + ' 云端保存失败:', err)
        // 3. 失败入队离线重试
        enqueueSingleton(config.collection, config.key, data)
      }
    },
    
    /**
     * 从云端拉取单例数据
     * @returns {Object} 本地数据
     */
    fetch: async function fetchSingleton() {
      var storageKey = getStorageKey(config)
      var member = auth.getMember()
      if (!member) return childStorage.get(storageKey) || {}
      
      if (!isCloudReady()) {
        return childStorage.get(storageKey) || {}
      }
      
      try {
        // 根据隔离级别构建查询参数
        var childId = undefined
        var memberId = undefined
        
        switch (isolation) {
          case SINGLETON_ISOLATION.FAMILY:
            childId = ''
            break
          case SINGLETON_ISOLATION.CHILD:
            childId = auth.getCurrentChildId()
            break
          case SINGLETON_ISOLATION.MEMBER:
            childId = ''
            memberId = member._id
            break
        }
        
        var res = await callGetSingleton(config.collection, config.key, childId, memberId)
        var doc = res.result.code === 0 ? res.result.data : null
        
        if (doc) {
          var cloudUpdatedAt = doc.updatedAt
          
          // 提取纯数据（剥离元数据）
          var { _id, familyId, childId: cId, memberId: mId, skey, createdBy, createdByName, 
                updatedBy, likes, createTime, updateTime, updatedAt, ...data } = doc
          
          // 乐观锁：仅云端更新时覆盖本地
          if (!useLock || shouldUseCloud(cloudUpdatedAt, childStorage.get(storageKey + 'UpdatedAt'))) {
            childStorage.set(storageKey, data)
            childStorage.set(storageKey + 'UpdatedAt', cloudUpdatedAt)
          }
          
          return childStorage.get(storageKey) || {}
        }
      } catch (err) {
        console.warn(config.key + ' 云端读取失败:', err)
      }
      
      return childStorage.get(storageKey) || {}
    }
  }
}

// ===== 单例型模块配置表 =====

var SINGLETON_MODULE_CONFIGS = {
  // 孩子级隔离（当前默认）
  habits: {
    collection: 'userSettings',
    key: 'habits',
    storageKey: 'habits',
    isolation: SINGLETON_ISOLATION.CHILD,
    useOptimisticLock: true
  },
  learnProgress: {
    collection: 'userSettings',
    key: 'learnProgress',
    storageKey: 'learnProgress',
    isolation: SINGLETON_ISOLATION.CHILD,
    useOptimisticLock: true
  },
  settings: {
    collection: 'userSettings',
    key: 'settings',
    storageKey: 'settings',
    isolation: SINGLETON_ISOLATION.CHILD,
    useOptimisticLock: true
  },
  accountSettings: {
    collection: 'userSettings',
    key: 'accountSettings',
    storageKey: 'accountSettings',
    isolation: SINGLETON_ISOLATION.CHILD,
    useOptimisticLock: false
  },
  brushingStory: {
    collection: 'userSettings',
    key: 'brushingStory',
    storageKey: 'brushingStory',
    isolation: SINGLETON_ISOLATION.CHILD,
    useOptimisticLock: true
  },
  brushingAvatar: {
    collection: 'userSettings',
    key: 'brushingAvatar',
    storageKey: 'brushingAvatar',
    isolation: SINGLETON_ISOLATION.CHILD,
    useOptimisticLock: true
  },
  brushPoints: {
    collection: 'userSettings',
    key: 'brushPoints',
    storageKey: 'brushPoints',
    isolation: SINGLETON_ISOLATION.CHILD,
    useOptimisticLock: true
  },
  toothDecorations: {
    collection: 'userSettings',
    key: 'toothDecorations',
    storageKey: 'toothDecorations',
    isolation: SINGLETON_ISOLATION.CHILD,
    useOptimisticLock: true
  },
  aiSkills: {
    collection: 'userSettings',
    key: 'aiSkills',
    storageKey: 'aiSkills',
    isolation: SINGLETON_ISOLATION.CHILD,
    useOptimisticLock: true
  },
  stallSettings: {
    collection: 'userSettings',
    key: 'stallSettings',
    storageKey: 'stallSettings',
    isolation: SINGLETON_ISOLATION.CHILD,
    useOptimisticLock: true
  },
  stallChallenges: {
    collection: 'userSettings',
    key: 'stallChallenges',
    storageKey: 'stallChallenges',
    isolation: SINGLETON_ISOLATION.CHILD,
    useOptimisticLock: true
  },
  stallBusinessHours: {
    collection: 'userSettings',
    key: 'stallBusinessHours',
    storageKey: 'stallBusinessHours',
    isolation: SINGLETON_ISOLATION.CHILD,
    useOptimisticLock: true
  }
}

var notesStorageMigrated = false

// 一次性迁移：P1-1 修复后笔记改为家庭级存储，需把旧的 notes_<childId> / deletedNoteIds_<childId>
// 合并到全局 key，否则离线未同步到云端的笔记会因 key 变更而不可达（等同丢失）
function migrateNotesStorage() {
  if (notesStorageMigrated) return
  var children = auth.getChildren()
  if (!children || children.length === 0) return  // 孩子未加载，等下次 fetchNotes 再迁
  notesStorageMigrated = true
  try {
    var globalNotes = wx.getStorageSync('notes') || []
    var existingIds = {}
    globalNotes.forEach(function(n) { if (n && n.id) existingIds[n.id] = true })
    var notesChanged = false
    var globalTomb = wx.getStorageSync('deletedNoteIds') || []
    var tombSet = {}
    globalTomb.forEach(function(t) {
      var tid = typeof t === 'string' ? t : (t && t.id)
      if (tid) tombSet[tid] = true
    })
    var tombChanged = false
    children.forEach(function(c) {
      var cid = c.childId
      if (!cid) return
      var oldNotes = wx.getStorageSync('notes_' + cid)
      if (oldNotes && oldNotes.length > 0) {
        oldNotes.forEach(function(n) {
          if (n && n.id && !existingIds[n.id]) {
            globalNotes.push(n)
            existingIds[n.id] = true
            notesChanged = true
          }
        })
        wx.removeStorageSync('notes_' + cid)
      }
      var oldTomb = wx.getStorageSync('deletedNoteIds_' + cid)
      if (oldTomb && oldTomb.length > 0) {
        oldTomb.forEach(function(t) {
          var tid = typeof t === 'string' ? t : (t && t.id)
          if (tid && !tombSet[tid]) {
            globalTomb.push(t)
            tombSet[tid] = true
            tombChanged = true
          }
        })
        wx.removeStorageSync('deletedNoteIds_' + cid)
      }
    })
    if (notesChanged) wx.setStorageSync('notes', globalNotes)
    if (tombChanged) wx.setStorageSync('deletedNoteIds', globalTomb)
  } catch (e) {
    console.warn('笔记本地存储迁移失败:', e)
  }
}

async function fetchNotes() {
  migrateNotesStorage()
  var localNotes = childStorage.get('notes') || []
  var member = auth.getMember()
  if (!member) return localNotes

  if (!isCloudReady()) {
    return localNotes
  }

  try {
    var cloudList = []
    var page = 1
    var pageSize = 100
    // 分页循环拉取全部笔记，避免固定上限导致历史笔记丢失
    while (page <= 50) {  // 安全上限 5000 篇
      var res = await wx.cloud.callFunction({
        name: 'record',
        data: {
          action: 'list',
          collection: 'notes',
          childId: auth.getCurrentChildId(),
          page: page,
          pageSize: pageSize
        }
      })

      if (!res.result || res.result.code !== 0) {
        console.warn('fetchNotes: 云函数返回错误:', res.result && res.result.msg)
        if (page === 1) return localNotes  // 首页失败直接用本地
        break  // 后续页失败则用已拉取的部分
      }

      var batch = res.result.data.list || []
      cloudList = cloudList.concat(batch)
      if (batch.length < pageSize) break  // 没有更多了
      page++
    }

    var deletedIds = getDeletedNoteIds()
    var deletedSet = {}
    deletedIds.forEach(function(id) { deletedSet[id] = true })

    var merged = mergeAndHeal('notes', 'notes', localNotes, cloudList, deletedSet)

    return merged
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
  addDeletedIdByKey(DELETED_NOTES_KEY, id)

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

// 获取家庭成员列表（用于笔记权限选择）
async function getFamilyMembers() {
  var member = auth.getMember()
  if (!member) return []

  // 尝试从云函数获取
  if (isCloudReady()) {
    try {
      var res = await wx.cloud.callFunction({
        name: 'family',
        data: { action: 'getMembers', familyId: member.familyId }
      })
      if (res.result && res.result.code === 0) {
        var members = res.result.data || []
        // 缓存到本地
        try {
          wx.setStorageSync('cachedFamilyMembers', members)
        } catch (e) {}
        return members
      }
    } catch (err) {
      console.warn('获取家庭成员失败，尝试本地缓存:', err)
    }
  }

  // fallback：从本地缓存读取
  try {
    var cached = wx.getStorageSync('cachedFamilyMembers')
    if (cached && cached.length > 0) {
      return cached
    }
  } catch (e) {}

  // 最后尝试从myFamilies中提取
  var families = auth.getMyFamilies()
  if (families && families.length > 0) {
    var currentFamily = families.find(function(f) { return f.familyId === member.familyId })
    if (currentFamily && currentFamily.family && currentFamily.family.members) {
      return currentFamily.family.members
    }
  }

  return []
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

// ===== AI技能 =====

/**
 * 上传AI技能到云端（调用前需确保本地已保存）
 */
// 使用工厂函数创建AI技能模块的同步函数
var _aiSkillsSync = createSingletonSync(SINGLETON_MODULE_CONFIGS.aiSkills)

// 向后兼容：保留原有函数名
async function uploadAiSkills(skills) {
  return _aiSkillsSync.upload(skills)
}

async function fetchAiSkills() {
  return _aiSkillsSync.fetch()
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
    localRecords = childStorage.get('habitRecords') || []
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

// 使用工厂函数创建习惯定义模块的同步函数
var _habitsSync = createSingletonSync(SINGLETON_MODULE_CONFIGS.habits)

// 向后兼容：保留原有函数名
async function uploadHabits(habits) {
  return _habitsSync.upload(habits)
}

async function fetchHabits() {
  return _habitsSync.fetch()
}

// ===== 学习进度 =====

// 使用工厂函数创建学习进度模块的同步函数
var _learnProgressSync = createSingletonSync(SINGLETON_MODULE_CONFIGS.learnProgress)

// 向后兼容：保留原有函数名
async function uploadLearnProgress(progress) {
  return _learnProgressSync.upload(progress)
}

async function fetchLearnProgress() {
  return _learnProgressSync.fetch()
}

// ===== 设置 =====

// 使用工厂函数创建设置模块的同步函数
var _settingsSync = createSingletonSync(SINGLETON_MODULE_CONFIGS.settings)

// 向后兼容：保留原有函数名
async function uploadSettings(settings) {
  return _settingsSync.upload(settings)
}

async function fetchSettings() {
  return _settingsSync.fetch()
}

// ===== 刷牙故事 =====

// 使用工厂函数创建刷牙故事模块的同步函数
var _brushingStorySync = createSingletonSync(SINGLETON_MODULE_CONFIGS.brushingStory)

// 向后兼容：保留原有函数名
async function uploadBrushingStory(story) {
  return _brushingStorySync.upload(story)
}

async function fetchBrushingStory() {
  return _brushingStorySync.fetch()
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
  } catch (err) { console.warn('刷牙头像云端读取失败:', err) }

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
  } catch (err) { console.warn('刷牙积分云端读取失败:', err) }

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
  } catch (err) { console.warn('牙齿装饰云端读取失败:', err) }

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
      console.error('[商品上传] 图片上传失败详情:', productData.imagePath, JSON.stringify(imgErr))
      // 图片上传失败，只保留本地，不保存到云端
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
          }).catch(function(err) { console.warn('摆摊商品云端删除失败:', p.id, err) })
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
  addDeletedIdByKey(DELETED_STALL_PRODUCTS_KEY, id)

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
// 使用工厂函数创建销售模块的 fetch/upload/remove 函数
var _stallSalesFetcher = createListFetcher(LIST_MODULE_CONFIGS.stallSales)
var _stallSalesUploader = createUploader(LIST_MODULE_CONFIGS.stallSales)
var _stallSalesRemover = createRemover(LIST_MODULE_CONFIGS.stallSales)

// 向后兼容：保留原有函数名
async function uploadStallSale(sale) {
  return _stallSalesUploader(sale)
}

async function fetchStallSales() {
  return _stallSalesFetcher()
}

async function removeStallSale(id) {
  return _stallSalesRemover(id)
}

// 上传摊位设置（用固定 _id 的 upsert 一步到位）
// 使用工厂函数创建摆摊设置模块的同步函数
var _stallSettingsSync = createSingletonSync(SINGLETON_MODULE_CONFIGS.stallSettings)

// 向后兼容：保留原有函数名
async function uploadStallSettings(settings) {
  return _stallSettingsSync.upload(settings)
}

async function fetchStallSettings() {
  return _stallSettingsSync.fetch()
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

// 使用工厂函数创建摆摊挑战模块的同步函数
var _stallChallengesSync = createSingletonSync(SINGLETON_MODULE_CONFIGS.stallChallenges)

// 向后兼容：保留原有函数名
async function uploadStallChallenges(challenges) {
  return _stallChallengesSync.upload(challenges)
}

async function fetchStallChallenges() {
  return _stallChallengesSync.fetch()
}

// 使用工厂函数创建营业时间模块的同步函数
var _stallBusinessHoursSync = createSingletonSync(SINGLETON_MODULE_CONFIGS.stallBusinessHours)

// 向后兼容：保留原有函数名
async function uploadStallBusinessHours(hours) {
  return _stallBusinessHoursSync.upload(hours)
}

async function fetchStallBusinessHours() {
  return _stallBusinessHoursSync.fetch()
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

// 使用工厂函数创建记账账本模块的 fetch/upload/remove 函数
var _accountBooksFetcher = createListFetcher(LIST_MODULE_CONFIGS.accountBooks)
var _accountBooksUploader = createUploader(LIST_MODULE_CONFIGS.accountBooks)
var _accountBooksRemover = createRemover(LIST_MODULE_CONFIGS.accountBooks)

// 向后兼容：保留原有函数名
async function uploadAccountBook(book) {
  return _accountBooksUploader(book)
}

async function fetchAccountBooks() {
  return _accountBooksFetcher()
}

async function removeAccountBook(id) {
  return _accountBooksRemover(id)
}

// 使用工厂函数创建记账条目模块的 fetch/upload/remove 函数
var _bookEntriesFetcher = createListFetcher(LIST_MODULE_CONFIGS.bookEntries)
var _bookEntriesUploader = createUploader(LIST_MODULE_CONFIGS.bookEntries)
var _bookEntriesRemover = createRemover(LIST_MODULE_CONFIGS.bookEntries)

// 向后兼容：保留原有函数名
async function uploadBookEntry(entry) {
  return _bookEntriesUploader(entry)
}

async function fetchBookEntries() {
  return _bookEntriesFetcher()
}

async function removeBookEntry(id) {
  return _bookEntriesRemover(id)
}

// 使用工厂函数创建记账设置模块的同步函数
var _accountSettingsSync = createSingletonSync(SINGLETON_MODULE_CONFIGS.accountSettings)

// 向后兼容：保留原有函数名
async function uploadAccountSettings(settings) {
  return _accountSettingsSync.upload(settings)
}

async function fetchAccountSettings() {
  return _accountSettingsSync.fetch()
}

// ===== 图片压缩上传公共函数 =====
/**
 * 压缩图片后上传到云存储
 * @param {string} filePath - 本地文件路径
 * @param {string} cloudDir - 云存储目录
 * @returns {Promise<string>} 云文件ID
 */
async function uploadImageCompressed(filePath, cloudDir) {
  // 压缩图片
  var compressedPath = filePath
  try {
    var compressRes = await new Promise(function(resolve, reject) {
      wx.compressImage({
        src: filePath,
        quality: 80,
        success: resolve,
        fail: reject
      })
    })
    compressedPath = compressRes.tempFilePath
  } catch (e) {
    // 压缩失败时使用原图
    console.warn('图片压缩失败，使用原图:', e)
  }
  
  // 上传到云存储
  var cloudPath = (cloudDir || 'images') + '/' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) + '.jpg'
  var uploadRes = await wx.cloud.uploadFile({
    cloudPath: cloudPath,
    filePath: compressedPath
  })
  
  return uploadRes.fileID
}

/**
 * 上传图片（不压缩）
 * @param {string} filePath - 本地文件路径
 * @param {string} cloudDir - 云存储目录
 * @returns {Promise<string>} 云文件ID
 */
async function uploadImage(filePath, cloudDir) {
  var cloudPath = (cloudDir || 'images') + '/' + Date.now() + '_' + Math.random().toString(36).substr(2, 9) + '.jpg'
  var uploadRes = await wx.cloud.uploadFile({
    cloudPath: cloudPath,
    filePath: filePath
  })
  
  return uploadRes.fileID
}

module.exports = {
  // ===== 枚举和常量 =====
  ISOLATION_LEVEL: ISOLATION_LEVEL,
  SINGLETON_ISOLATION: SINGLETON_ISOLATION,
  TOMBSTONE_KEYS: TOMBSTONE_KEYS,
  
  // ===== 通用工具函数 =====
  isCloudReady: isCloudReady,
  getRecordMeta: getRecordMeta,
  getStorageKey: getStorageKey,
  getTombstoneKey: getTombstoneKey,
  markRecordSynced: markRecordSynced,
  updateLocalRecord: updateLocalRecord,
  shouldUseCloud: shouldUseCloud,
  
  // ===== 通用墓碑操作（供 game-cloud 等模块复用）=====
  getDeletedIdsByKey: getDeletedIdsByKey,
  addDeletedIdByKey: addDeletedIdByKey,
  removeTombstoneByKey: removeTombstoneByKey,
  
  // ===== 画作模块 =====
  uploadDrawing: uploadDrawing,
  fetchDrawings: fetchDrawings,
  removeDrawing: removeDrawing,
  updateDrawingName: updateDrawingName,
  
  // ===== 刷牙模块 =====
  uploadBrushingRecord: uploadBrushingRecord,
  fetchBrushingRecords: fetchBrushingRecords,
  removeBrushingRecord: removeBrushingRecord,
  updateBrushingRecord: updateBrushingRecord,
  updateBrushingRecordById: updateBrushingRecordById,
  
  // ===== 打卡模块 =====
  uploadHabitRecord: uploadHabitRecord,
  fetchHabitRecords: fetchHabitRecords,
  removeHabitRecord: removeHabitRecord,
  
  // ===== 笔记模块 =====
  uploadNote: uploadNote,
  fetchNotes: fetchNotes,
  updateNoteInCloud: updateNoteInCloud,
  removeNote: removeNote,
  getFamilyMembers: getFamilyMembers,
  
  // ===== 成就模块 =====
  uploadAchievements: uploadAchievements,
  fetchAchievements: fetchAchievements,
  
  // ===== 习惯定义 =====
  uploadHabits: uploadHabits,
  fetchHabits: fetchHabits,
  
  // ===== 学习进度 =====
  uploadLearnProgress: uploadLearnProgress,
  fetchLearnProgress: fetchLearnProgress,
  
  // ===== 设置 =====
  uploadSettings: uploadSettings,
  fetchSettings: fetchSettings,
  
  // ===== 刷牙故事 =====
  uploadBrushingStory: uploadBrushingStory,
  fetchBrushingStory: fetchBrushingStory,
  
  // ===== 刷牙角色 =====
  uploadBrushingAvatar: uploadBrushingAvatar,
  fetchBrushingAvatar: fetchBrushingAvatar,
  
  // ===== 刷牙积分 =====
  uploadBrushPoints: uploadBrushPoints,
  fetchBrushPoints: fetchBrushPoints,
  
  // ===== 牙齿装饰 =====
  uploadToothDecorations: uploadToothDecorations,
  fetchToothDecorations: fetchToothDecorations,
  
  // ===== 摆摊商品 =====
  uploadStallProduct: uploadStallProduct,
  fetchStallProducts: fetchStallProducts,
  removeStallProduct: removeStallProduct,
  
  // ===== 摆摊销售 =====
  uploadStallSale: uploadStallSale,
  fetchStallSales: fetchStallSales,
  removeStallSale: removeStallSale,
  
  // ===== 摆摊设置 =====
  uploadStallSettings: uploadStallSettings,
  fetchStallSettings: fetchStallSettings,
  
  // ===== 摆摊挑战 =====
  uploadStallChallenges: uploadStallChallenges,
  fetchStallChallenges: fetchStallChallenges,
  
  // ===== 营业时间 =====
  uploadStallBusinessHours: uploadStallBusinessHours,
  fetchStallBusinessHours: fetchStallBusinessHours,
  
  // ===== 迁移函数 =====
  migrateSingletonsToV2: migrateSingletonsToV2,
  
  // ===== 记账账本 =====
  uploadAccountBook: uploadAccountBook,
  fetchAccountBooks: fetchAccountBooks,
  removeAccountBook: removeAccountBook,
  
  // ===== 记账条目 =====
  uploadBookEntry: uploadBookEntry,
  fetchBookEntries: fetchBookEntries,
  removeBookEntry: removeBookEntry,
  
  // ===== 记账设置 =====
  uploadAccountSettings: uploadAccountSettings,
  fetchAccountSettings: fetchAccountSettings,
  
  // ===== AI技能 =====
  uploadAiSkills: uploadAiSkills,
  fetchAiSkills: fetchAiSkills,
  
  // ===== 图片上传工具 =====
  uploadImageCompressed: uploadImageCompressed,
  uploadImage: uploadImage,
  
  // ===== 工厂函数 =====
  createListFetcher: createListFetcher,
  createUploader: createUploader,
  createUploaderWithImage: createUploaderWithImage,
  createRemover: createRemover,
  createSingletonSync: createSingletonSync,
  mergeAndHealV2: mergeAndHealV2,
  selfHealWithImages: selfHealWithImages,
  
  // ===== 模块配置表 =====
  LIST_MODULE_CONFIGS: LIST_MODULE_CONFIGS,
  SINGLETON_MODULE_CONFIGS: SINGLETON_MODULE_CONFIGS
}
