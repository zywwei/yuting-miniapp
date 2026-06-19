/**
 * 离线同步队列
 * 写操作先入队列，联网时自动通过云函数同步到云端
 * 支持图片两阶段同步：先上传图片获取fileID，再同步记录
 */

var QUEUE_KEY = 'syncQueue'
var FAILED_KEY = 'syncFailed'

var MAX_RETRIES = 5

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
    id: operation.id,
    action: operation.action,
    collection: operation.collection,
    data: operation.data,
    uploadImages: operation.uploadImages || [],
    timestamp: Date.now(),
    retries: 0
  })
  saveQueue(queue)
}

function dequeue(id) {
  var queue = getQueue()
  var filtered = queue.filter(function(item) { return item.id !== id })
  saveQueue(filtered)
}

function markAsFailed(item) {
  var queue = getQueue()
  var filtered = queue.filter(function(q) { return q.id !== item.id })
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

async function flush() {
  var queue = getQueue()
  if (queue.length === 0) return

  if (!wx.cloud) return

  var succeeded = []

  for (var i = 0; i < queue.length; i++) {
    var item = queue[i]
    try {
      if (item.uploadImages && item.uploadImages.length > 0) {
        for (var j = 0; j < item.uploadImages.length; j++) {
          var img = item.uploadImages[j]
          try {
            var uploadRes = await wx.cloud.uploadFile({
              cloudPath: img.cloudPath,
              filePath: img.localPath
            })
            setNestedValue(item.data, img.field, uploadRes.fileID)
          } catch (imgErr) {
            console.warn('图片上传失败:', img.localPath, imgErr)
            throw imgErr
          }
        }
      }

      var funcName = item.collection === 'comments' ? 'interaction' : 'record'
      await wx.cloud.callFunction({
        name: funcName,
        data: {
          action: item.action,
          collection: item.collection,
          data: item.data,
          id: item.id
        }
      })

      succeeded.push(item.id)
    } catch (err) {
      console.warn('同步失败:', item.id, err)
      item.retries = (item.retries || 0) + 1
      if (item.retries >= MAX_RETRIES) {
        markAsFailed(item)
      }
    }
  }

  if (succeeded.length > 0) {
    var remaining = queue.filter(function(item) {
      return succeeded.indexOf(item.id) < 0
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
  flush: flushSafe,
  startAutoSync: startAutoSync,
  getPendingCount: getPendingCount,
  getFailedItems: getFailedItems,
  retryFailed: retryFailed,
  clearFailed: clearFailed
}
