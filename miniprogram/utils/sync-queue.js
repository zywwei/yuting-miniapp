/**
 * 离线同步队列
 * 写操作先入队列，联网时自动通过云函数同步到云端
 * 支持图片两阶段同步：先上传图片获取fileID，再同步记录
 */

var auth = require('./auth.js')

var QUEUE_KEY = 'syncQueue'
var FAILED_KEY = 'syncFailed'
var SEQ_KEY = 'syncQueueSeq'

var MAX_RETRIES = 5
var MAX_QUEUE_SIZE = 1000 // 队列最大长度

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
  
  // 队列长度检查
  if (queue.length >= MAX_QUEUE_SIZE) {
    // 丢弃最旧的低优先级操作（保留删除操作，按时间戳找最旧的非删除操作）
    var oldestIdx = -1
    var oldestTs = Infinity
    for (var i = 0; i < queue.length; i++) {
      if (queue[i].action !== 'remove' && queue[i].timestamp < oldestTs) {
        oldestTs = queue[i].timestamp
        oldestIdx = i
      }
    }
    if (oldestIdx >= 0) {
      var removed = queue.splice(oldestIdx, 1)[0]
      console.warn('同步队列已满，丢弃最旧操作:', removed.id, removed.action)
    } else {
      console.warn('同步队列已满，所有操作都是删除操作，无法丢弃')
    }
  }
  
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

// 按 id 移除队列项；可选 action 仅移除指定操作类型，避免误删同 id 的其他操作
function dequeue(id, action) {
  var queue = getQueue()
  var filtered = queue.filter(function(item) {
    if (item.id !== id) return true
    // 指定了 action 时，仅移除匹配该 action 的项（如只移除 add，保留 update）
    if (action && item.action !== action) return true
    return false
  })
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

// 仅追加到 failed 列表（队列剔除统一由 flush 尾部重建完成，
// 修复：原实现先改存储再被 flush 末尾旧快照回写，导致失败项复活、failed 无限重复追加）
function appendToFailed(item) {
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
  var failedSeqs = []      // 本轮达到重试上限、需移入 failed 列表的 seq
  var failedItems = []     // 对应的完整队列项
  var snapshotRetries = {} // seq -> 本轮处理后的 retries（未达上限项也要持久化计数）
  var changedData = {}     // seq -> 图片上传成功后回写的最新 data

  for (var i = 0; i < queue.length; i++) {
    var item = queue[i]
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
            // 部分成功也要记录，落盘时回写 fileID 避免下次重传已成功的图
            changedData[item.seq] = item.data
          } catch (imgErr) {
            console.warn('图片上传失败:', img.localPath, imgErr)
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
      // P0-8 配套：离线重放也携带当前家庭，避免多家庭用户重试时写入第一个家庭
      // （云端兼容设计：未带 familyId 的旧队列项仍按旧行为处理，不会报错）
      callData.familyId = auth.getCurrentFamilyId()
      await wx.cloud.callFunction({
        name: funcName,
        data: callData
      })

      succeededSeqs.push(item.seq)
    } catch (err) {
      console.warn('同步失败:', item.id, err)
      item.retries = (item.retries || 0) + 1
      snapshotRetries[item.seq] = item.retries
      if (item.retries >= MAX_RETRIES) {
        failedSeqs.push(item.seq)
        failedItems.push(item)
      }
    }
  }

  // 统一以「存储中的最新队列」为骨架重建落盘（无条件执行，修复三个缺陷）：
  // a) 失败项不再被旧快照复活（按 seq 从 remaining 剔除）；
  // b) 全部失败时 retries 计数也持久化（原实现全失败不落盘导致无限重试）；
  // c) flush 执行期间的 enqueue/dequeue/updateData 结果保留在 latest 中不被覆盖。
  if (failedItems.length > 0) {
    failedItems.forEach(appendToFailed)
  }

  var latest = getQueue()
  var remaining = latest.filter(function(q) {
    return succeededSeqs.indexOf(q.seq) < 0 && failedSeqs.indexOf(q.seq) < 0
  })
  // 把本轮处理产生的最新状态（retries 计数、图片回写后的 data）合并回剩余项
  remaining.forEach(function(q) {
    if (snapshotRetries[q.seq] !== undefined) q.retries = snapshotRetries[q.seq]
    if (changedData[q.seq]) q.data = changedData[q.seq]
  })
  saveQueue(remaining)
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
