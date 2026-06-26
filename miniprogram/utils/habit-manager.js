/**
 * 习惯管理工具
 * 管理习惯的增删改查和打卡记录
 */

var util = require('./util.js')
var childStorage = require('./child-storage.js')
var cloud = require('./cloud.js')

// 获取所有习惯（默认 + 自定义）
var getAllHabits = function() {
  var customHabits = childStorage.get('habits') || []
  var defaultHabits = [
    { type: 'early_up', name: '早起', icon: '🌅', color: '#FF9800', target: 1, group: 'sleep' },
    { type: 'early_sleep', name: '早睡', icon: '🌙', color: '#7C4DFF', target: 1, group: 'sleep' },
    { type: 'nap', name: '午睡', icon: '😴', color: '#00BCD4', target: 1, group: 'sleep' },
    { type: 'brushing', name: '刷牙', icon: '🦷', color: '#4CAF50', target: 2, group: 'health' },
    { type: 'wash_hands', name: '洗手', icon: '🧼', color: '#03A9F4', target: 3, group: 'health' },
    { type: 'drink', name: '喝水', icon: '💧', color: '#00BCD4', target: 8, group: 'health' },
    { type: 'eat_breakfast', name: '吃早餐', icon: '🥣', color: '#FF9800', target: 1, group: 'life' },
    { type: 'eat_lunch', name: '吃午餐', icon: '🍱', color: '#4CAF50', target: 1, group: 'life' },
    { type: 'eat_dinner', name: '吃晚餐', icon: '🍛', color: '#FF5722', target: 1, group: 'life' },
    { type: 'tidy', name: '整理玩具', icon: '🧸', color: '#9C27B0', target: 1, group: 'life' },
    { type: 'housework', name: '做家务', icon: '🧹', color: '#795548', target: 1, group: 'life' },
    { type: 'reading', name: '阅读', icon: '📖', color: '#2196F3', target: 1, group: 'learn' },
    { type: 'exercise', name: '运动', icon: '🏃', color: '#FF5722', target: 1, group: 'learn' },
    { type: 'polite', name: '礼貌用语', icon: '🙏', color: '#4CAF50', target: 3, group: 'learn' }
  ]
  var customOnly = customHabits.filter(function(h) { return h.type === 'custom' })
  return defaultHabits.concat(customOnly)
}

// 获取今日习惯完成情况
var getTodayHabits = function() {
  var today = util.getTodayStr()
  var habits = getAllHabits()
  var records = childStorage.get('habitRecords') || []

  return habits.map(function(habit) {
    var todayRecords = records.filter(function(r) {
      return r.date === today && r.type === habit.type
    })
    var done = todayRecords.length
    var target = habit.target || 1
    return {
      type: habit.type,
      name: habit.name,
      icon: habit.icon,
      color: habit.color,
      done: done,
      target: target,
      completed: done >= target,
      progress: Math.min(done / target, 1)
    }
  })
}

// 添加打卡记录
// 通过 cloud.uploadHabitRecord 统一写本地 + 入队 + 同步云端，
// 避免出现"只存本地不上云"的数据，与各页面打卡入口保持一致行为。
var addRecord = function(type) {
  var today = util.getTodayStr()

  var newRecord = {
    id: util.generateId(),
    type: type,
    date: today,
    time: new Date().toTimeString().slice(0, 5),
    createTime: new Date().toISOString()
  }

  // cloud 层负责写入本地缓存与云端同步（离线时自动入队重试）
  cloud.uploadHabitRecord(newRecord).catch(function() {})
  return newRecord
}

// 获取习惯统计
var getHabitStats = function(type) {
  var records = childStorage.get('habitRecords') || []
  var habitRecords = records.filter(function(r) { return r.type === type })

  var total = habitRecords.length
  var streak = calcStreak(habitRecords)
  var weekRate = calcWeekRate(habitRecords)

  return { total: total, streak: streak, weekRate: weekRate }
}

// 计算连续天数
var calcStreak = function(records) {
  if (records.length === 0) return 0

  var dateSet = {}
  records.forEach(function(r) { dateSet[r.date] = true })
  var dates = Object.keys(dateSet).sort().reverse()
  var streak = 0

  for (var i = 0; i < dates.length; i++) {
    var expectedDate = new Date()
    expectedDate.setDate(expectedDate.getDate() - i)
    var year = expectedDate.getFullYear()
    var month = String(expectedDate.getMonth() + 1).padStart(2, '0')
    var day = String(expectedDate.getDate()).padStart(2, '0')
    var expectedStr = year + '-' + month + '-' + day

    if (dates[i] === expectedStr) {
      streak++
    } else {
      break
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

  var completedDays = 0
  for (var i = 0; i < 7; i++) {
    var d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    var year = d.getFullYear()
    var month = String(d.getMonth() + 1).padStart(2, '0')
    var day = String(d.getDate()).padStart(2, '0')
    var dateStr = year + '-' + month + '-' + day
    if (records.some(function(r) { return r.date === dateStr })) {
      completedDays++
    }
  }

  return Math.round((completedDays / 7) * 100)
}

// 添加自定义习惯
var addCustomHabit = function(habit) {
  var habits = childStorage.get('habits') || []
  var newHabit = {
    id: util.generateId(),
    type: 'custom',
    name: habit.name,
    icon: habit.icon,
    color: habit.color || '#FF6B8A',
    target: habit.target || 1,
    createTime: new Date().toISOString()
  }
  habits.push(newHabit)
  childStorage.set('habits', habits)
  return newHabit
}

// 删除自定义习惯
var deleteCustomHabit = function(id) {
  var habits = childStorage.get('habits') || []
  var filtered = habits.filter(function(h) { return h.id !== id })
  childStorage.set('habits', filtered)
}

module.exports = {
  getAllHabits: getAllHabits,
  getTodayHabits: getTodayHabits,
  addRecord: addRecord,
  getHabitStats: getHabitStats,
  addCustomHabit: addCustomHabit,
  deleteCustomHabit: deleteCustomHabit
}
