/**
 * 离线同步队列
 * 写操作先入队列，联网时自动通过云函数同步到云端
 * 支持图片两阶段同步：先上传图片获取fileID，再同步记录
 */

var QUEUE_KEY = 'syncQueue'
var FAILED_KEY = 'syncFailed'
var SEQ_KEY = 'syncQueueSeq'

var MAX_RETRIES = 5

// 自增序号，作为队列项的内部主键，避免同 id 操作互相覆盖
function nextSeq() {
  var seq = wx.getStorageSync(SEQ_KEY) || 0
  seq = seq + 1
  wx.setStorageSync(SEQ_KEY, seq)
  return seq
}

function getQueue() {
  return wx.getStorageSync(QUEUE_KEY) || []
}

function saveQueue(queue) {
  wx.setStorageSync(QUEUE_KEY, queue)
}

function getFailed() {
  return wx.getStorageSync(FAILED_KEY) || []
}

function saveFailed(failed) {
  wx.setStorageSync(FAILED_KEY, failed)
}

function enqueue(operation) {
  var queue = getQueue()
  queue.push({
    seq: nextSeq(),  // 内部主键，唯一标识一条队列项
    id: operation.id,
    action: operation.action,
    collection: operation.collection,
    data: operation.data,
    uploadImages: operation.uploadImages || [],
    // 交互类操作（点赞/评论）的额外参数：targetType、targetId、content 等
    extra: operation.extra || null,
    funcName: operation.funcName || '',  // 指定云函数名（interaction/record），空则按 collection 推断
    timestamp: Date.now(),
    retries: 0
  })
  saveQueue(queue)
}

// 按 id 移除队列项（兼容旧调用，会移除所有同 id 项）
function dequeue(id) {
  var queue = getQueue()
  var filtered = queue.filter(function(item) { return item.id !== id })
  saveQueue(filtered)
}

// 更新队列中某 id 项的 data（用于图片部分成功后回写已传 fileID）
function updateData(id, data) {
  var queue = getQueue()
  var updated = false
  for (var i = 0; i < queue.length; i++) {
    if (queue[i].id === id) {
      queue[i].data = data
      updated = true
      // 不 break：更新所有同 id 项（通常只有一条）
    }
  }
  if (updated) saveQueue(queue)
  return updated
}

function markAsFailed(item) {
  var queue = getQueue()
  // 按 seq 精确移除，避免误删同 id 的其他项
  var filtered = queue.filter(function(q) { return q.seq !== item.seq })
  saveQueue(filtered)

  var failed = getFailed()
  failed.push(item)
  saveFailed(failed)
}

function setNestedValue(obj, field, value) {
  var parts = field.replace(/\[(\d+)\]/g, '.$1').split('.')
  var current = obj
  for (var i = 0; i < parts.length - 1; i++) {
    current = current[parts[i]]
    if (!current) return
  }
  current[parts[parts.length - 1]] = value
}

// 读取 item.data 中某字段的当前值（用于判断图片是否已传成功）
function getNestedValue(obj, field) {
  var parts = field.replace(/\[(\d+)\]/g, '.$1').split('.')
  var current = obj
  for (var i = 0; i < parts.length; i++) {
    if (current == null) return undefined
    current = current[parts[i]]
  }
  return current
}

async function flush() {
  var queue = getQueue()
  if (queue.length === 0) return

  if (!wx.cloud) return

  var succeededSeqs = []
  var changedItems = []  // 因图片上传成功而需要回写队列的项

  for (var i = 0; i < queue.length; i++) {
    var item = queue[i]
    var itemChanged = false
    try {
      if (item.uploadImages && item.uploadImages.length > 0) {
        for (var j = 0; j < item.uploadImages.length; j++) {
          var img = item.uploadImages[j]
          // 跳过已上传成功的图片（字段值已是 cloud:// 开头）
          var currentVal = getNestedValue(item.data, img.field)
          if (typeof currentVal === 'string' && currentVal.indexOf('cloud://') === 0) {
            continue
          }
          try {
            var uploadRes = await wx.cloud.uploadFile({
              cloudPath: img.cloudPath,
              filePath: img.localPath
            })
            setNestedValue(item.data, img.field, uploadRes.fileID)
            itemChanged = true
          } catch (imgErr) {
            console.warn('图片上传失败:', img.localPath, imgErr)
            // 部分成功也要回写已传的 fileID，避免下次重传已成功的图
            if (itemChanged) changedItems.push(item)
            throw imgErr
          }
        }
      }

      // 确定云函数名：优先用 funcName，否则按 collection 推断（comments/likes 走 interaction）
      var funcName = item.funcName || (item.collection === 'comments' || item.collection === 'likes' ? 'interaction' : 'record')
      // 组装 callFunction 的 data：基础字段 + 交互类 extra
      var callData = {
        action: item.action,
        collection: item.collection,
        id: item.id
      }
      if (item.data !== undefined) callData.data = item.data
      if (item.extra) {
        // 把 extra 中的字段合并进去（targetType、targetId、content 等）
        Object.keys(item.extra).forEach(function(k) {
          callData[k] = item.extra[k]
        })
      }
      await wx.cloud.callFunction({
        name: funcName,
        data: callData
      })

      succeededSeqs.push(item.seq)
    } catch (err) {
      console.warn('同步失败:', item.id, err)
      item.retries = (item.retries || 0) + 1
      if (itemChanged && succeededSeqs.indexOf(item.seq) < 0) {
        changedItems.push(item)
      }
      if (item.retries >= MAX_RETRIES) {
        markAsFailed(item)
      }
    }
  }

  // 移除已成功的项；changedItems 中的项已原地修改 item.data，保留在 remaining 中
  if (succeededSeqs.length > 0 || changedItems.length > 0) {
    var remaining = queue.filter(function(item) {
      return succeededSeqs.indexOf(item.seq) < 0
    })
    saveQueue(remaining)
  }
}

var _syncing = false

async function flushSafe() {
  if (_syncing) return
  _syncing = true
  try {
    await flush()
  } catch (err) {
    console.warn('同步队列执行异常:', err)
  }
  _syncing = false
}

function startAutoSync() {
  wx.onNetworkStatusChange(function(res) {
    if (res.isConnected) {
      flushSafe()
    }
  })
  flushSafe()
}

function getPendingCount() {
  return getQueue().length
}

function getFailedItems() {
  return getFailed()
}

function retryFailed(id) {
  var failed = getFailed()
  var item = null
  var remaining = []
  for (var i = 0; i < failed.length; i++) {
    if (failed[i].id === id) {
      item = failed[i]
    } else {
      remaining.push(failed[i])
    }
  }
  saveFailed(remaining)

  if (item) {
    item.retries = 0
    var queue = getQueue()
    queue.push(item)
    saveQueue(queue)
    flushSafe()
  }
}

function clearFailed() {
  wx.removeStorageSync(FAILED_KEY)
}

module.exports = {
  enqueue: enqueue,
  dequeue: dequeue,
  updateData: updateData,
  flush: flushSafe,
  startAutoSync: startAutoSync,
  getPendingCount: getPendingCount,
  getFailedItems: getFailedItems,
  retryFailed: retryFailed,
  clearFailed: clearFailed
}
