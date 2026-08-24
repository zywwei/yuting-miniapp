/**
 * 统一进度管理
 * 管理所有学习模块的进度
 */

var childStorage = require('../../utils/child-storage.js')

/**
 * 获取学习进度
 */
var getProgress = function() {
  return childStorage.get('learnProgress') || {}
}

/**
 * 获取指定模块的学习数量
 * @param {string} module - 模块名称
 */
var getModuleProgress = function(module) {
  var progress = getProgress()
  return Object.keys(progress[module] || {}).length
}

/**
 * 标记为已学习
 * @param {string} module - 模块名称
 * @param {string} itemId - 学习项ID
 */
var markAsLearned = function(module, itemId) {
  var progress = getProgress()
  if (!progress[module]) progress[module] = {}
  if (!progress[module][itemId]) {
    progress[module][itemId] = {
      learnedAt: new Date().toISOString(),
      reviewCount: 0
    }
    childStorage.set('learnProgress', progress)
  }
  return progress[module][itemId]
}

/**
 * 检查是否已学习
 * @param {string} module - 模块名称
 * @param {string} itemId - 学习项ID
 */
var isLearned = function(module, itemId) {
  var progress = getProgress()
  return !!(progress[module] && progress[module][itemId])
}

/**
 * 记录学习日志
 * @param {string} type - 学习类型
 * @param {string} itemId - 学习项ID
 * @param {string} action - 动作类型
 * @param {string} [title] - 展示标题（可选，history 页直接显示）
 */
var addLearnLog = function(type, itemId, action, title) {
  var logs = childStorage.get('learnLogs') || []
  logs.push({
    type: type,
    itemId: itemId,
    action: action,
    title: title || itemId || '',
    time: new Date().toISOString()
  })
  // 保留最近1000条记录
  if (logs.length > 1000) {
    logs = logs.slice(-1000)
  }
  childStorage.set('learnLogs', logs)
}

module.exports = {
  getProgress: getProgress,
  getModuleProgress: getModuleProgress,
  markAsLearned: markAsLearned,
  isLearned: isLearned,
  addLearnLog: addLearnLog
}
