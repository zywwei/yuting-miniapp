/**
 * 刷牙工具函数
 */

var dateUtils = require('./date-utils.js')
var childStorage = require('./child-storage.js')

// 获取刷牙记录
var getBrushingRecords = function() {
  return childStorage.get('brushingRecords') || []
}

// 保存刷牙记录
var saveBrushingRecord = function(record) {
  var records = getBrushingRecords()
  records.push(record)
  childStorage.set('brushingRecords', records)
}

// 删除刷牙记录
var deleteBrushingRecord = function(id) {
  var records = getBrushingRecords()
  var target = records.find(function(r) { return r.id === id })
  if (!target) return false

  var fs = wx.getFileSystemManager()
  if (target.imagePath && target.imagePath.startsWith(wx.env.USER_DATA_PATH)) {
    try { fs.unlinkSync(target.imagePath) } catch (e) {}
  }

  records = records.filter(function(r) { return r.id !== id })
  childStorage.set('brushingRecords', records)
  return true
}

// 计算连续刷牙天数（至少刷一次就算一天）
var calcBrushingStreak = function(records) {
  if (records.length === 0) return 0

  var dates = []
  var dateMap = {}
  records.forEach(function(r) {
    if (!dateMap[r.date]) {
      dateMap[r.date] = true
      dates.push(r.date)
    }
  })
  dates.sort(function(a, b) { return b.localeCompare(a) })

  var streak = 0
  for (var i = 0; i < dates.length; i++) {
    var currentDate = dates[i]
    var dayRecords = records.filter(function(r) { return r.date === currentDate })

    if (i === 0) {
      streak = dayRecords.length >= 1 ? 1 : 0
      if (dayRecords.length < 1) break
    } else {
      var prevDate = dates[i - 1]
      var cur = new Date(currentDate)
      var prev = new Date(prevDate)
      var diff = (prev - cur) / (1000 * 60 * 60 * 24)

      if (diff === 1 && dayRecords.length >= 1) {
        streak++
      } else {
        break
      }
    }
  }

  return streak
}

// 计算本周完成率
var calcWeekRate = function(records) {
  var now = new Date()
  var startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  var weekRecords = records.filter(function(r) {
    return new Date(r.date) >= startOfWeek
  })

  var completedDays = 0
  for (var i = 0; i <= now.getDay(); i++) {
    var d = new Date(startOfWeek)
    d.setDate(d.getDate() + i)
    var dateStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
    var dayRecords = weekRecords.filter(function(r) { return r.date === dateStr })
    if (dayRecords.length >= 2) completedDays++
  }

  return now.getDay() > 0 ? Math.round(completedDays / (now.getDay() + 1) * 100) : 0
}

// 获取刷牙统计
var getBrushingStats = function(records) {
  if (!records) records = getBrushingRecords()
  var today = dateUtils.getTodayStr()

  var todayCount = records.filter(function(r) { return r.date === today }).length

  var avgScore = records.length > 0
    ? parseFloat((records.reduce(function(sum, r) { return sum + (r.score || 0) }, 0) / records.length).toFixed(1))
    : 0

  var streak = calcBrushingStreak(records)
  var weekRate = calcWeekRate(records)

  return {
    todayCount: todayCount,
    avgScore: avgScore,
    streak: streak,
    weekRate: weekRate,
    totalRecords: records.length
  }
}

module.exports = {
  getBrushingRecords: getBrushingRecords,
  saveBrushingRecord: saveBrushingRecord,
  deleteBrushingRecord: deleteBrushingRecord,
  calcBrushingStreak: calcBrushingStreak,
  calcWeekRate: calcWeekRate,
  getBrushingStats: getBrushingStats
}
