/**
 * 统计管理器
 * 管理学习统计数据
 */

var childStorage = require('../../utils/child-storage.js')

/**
 * 获取学习统计
 */
var getStats = function() {
  var progress = childStorage.get('learnProgress') || {}
  var logs = childStorage.get('learnLogs') || []
  
  var totalLearned = 0
  var byModule = {}

  // 统计各模块学习数量
  Object.keys(progress).forEach(function(module) {
    var count = Object.keys(progress[module] || {}).length
    if (count > 0) {
      byModule[module] = count
      totalLearned += count
    }
  })

  return {
    totalLearned: totalLearned,
    byModule: byModule,
    streak: calculateStreak(logs),
    todayLearned: getTodayLearned(logs)
  }
}

/**
 * 计算连续学习天数
 */
var calculateStreak = function(logs) {
  if (logs.length === 0) return 0

  var today = new Date().toDateString()
  var streak = 0
  var currentDate = new Date()

  for (var i = 0; i < 365; i++) {
    var dateStr = currentDate.toDateString()
    var hasLog = logs.some(function(log) {
      return new Date(log.time).toDateString() === dateStr
    })

    if (hasLog) {
      streak++
    } else if (i > 0) {
      break
    }

    currentDate.setDate(currentDate.getDate() - 1)
  }

  return streak
}

/**
 * 获取今日学习数量
 */
var getTodayLearned = function(logs) {
  var today = new Date().toDateString()
  return logs.filter(function(log) {
    return new Date(log.time).toDateString() === today
  }).length
}

module.exports = {
  getStats: getStats
}
