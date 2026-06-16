/**
 * 成就系统
 * 管理成就的解锁和展示
 */

var learnData = require('./learn-data.js')

// 成就定义
var ACHIEVEMENTS = [
  // 刷牙成就
  { id: 'brush_3', icon: '🦷', title: '刷牙新手', desc: '连续刷牙3天', condition: function(data) { return data.brushingStreak >= 3 } },
  { id: 'brush_7', icon: '🥇', title: '刷牙达人', desc: '连续刷牙7天', condition: function(data) { return data.brushingStreak >= 7 } },
  { id: 'brush_30', icon: '🏆', title: '刷牙冠军', desc: '连续刷牙30天', condition: function(data) { return data.brushingStreak >= 30 } },

  // 识字成就
  { id: 'cards_10', icon: '📖', title: '识字入门', desc: '认识10个汉字', condition: function(data) { return data.cardsLearned >= 10 } },
  { id: 'cards_50', icon: '📚', title: '识字能手', desc: '认识50个汉字', condition: function(data) { return data.cardsLearned >= 50 } },
  { id: 'cards_100', icon: '🎓', title: '识字大师', desc: '认识100个汉字', condition: function(data) { return data.cardsLearned >= 100 } },

  // 古诗成就
  { id: 'poems_5', icon: '📜', title: '诗歌入门', desc: '背诵5首古诗', condition: function(data) { return data.poemsMemorized >= 5 } },
  { id: 'poems_10', icon: '🎭', title: '诗歌达人', desc: '背诵10首古诗', condition: function(data) { return data.poemsMemorized >= 10 } },
  { id: 'poems_25', icon: '👑', title: '诗歌大师', desc: '背诵全部25首古诗', condition: function(data) { return data.poemsMemorized >= 25 } },

  // 画画成就
  { id: 'draw_5', icon: '🎨', title: '绘画入门', desc: '画5幅画', condition: function(data) { return data.drawingsCount >= 5 } },
  { id: 'draw_20', icon: '🖼️', title: '绘画达人', desc: '画20幅画', condition: function(data) { return data.drawingsCount >= 20 } },
  { id: 'draw_50', icon: '🏆', title: '绘画大师', desc: '画50幅画', condition: function(data) { return data.drawingsCount >= 50 } },

  // 笔记成就
  { id: 'notes_3', icon: '📝', title: '笔记入门', desc: '写3篇笔记', condition: function(data) { return data.notesCount >= 3 } },
  { id: 'notes_10', icon: '📓', title: '笔记达人', desc: '写10篇笔记', condition: function(data) { return data.notesCount >= 10 } },
  { id: 'notes_30', icon: '📖', title: '笔记大师', desc: '写30篇笔记', condition: function(data) { return data.notesCount >= 30 } },

  // 综合成就
  { id: 'all_rounder', icon: '⭐', title: '全面发展', desc: '每个模块都有记录', condition: function(data) { return data.brushingStreak >= 1 && data.cardsLearned >= 1 && data.drawingsCount >= 1 && data.notesCount >= 1 } },
  { id: 'super_star', icon: '🌟', title: '超级之星', desc: '解锁10个成就', condition: function(data) { return data.unlockedCount >= 10 } }
]

// 获取当前数据
var getCurrentData = function() {
  var records = wx.getStorageSync('habitRecords') || []
  var drawings = wx.getStorageSync('drawings') || []
  var notes = wx.getStorageSync('notes') || []

  // 计算连续刷牙天数
  var brushingRecords = records.filter(function(r) { return r.type === 'brushing' })
  var brushingStreak = calcStreak(brushingRecords)

  // 学习进度
  var cardsLearned = learnData.getCardsLearnedCount()
  var poemsMemorized = learnData.getPoemsMemorizedCount()

  // 已解锁成就数量
  var unlocked = getUnlockedAchievements()
  var unlockedCount = unlocked.length

  return {
    brushingStreak: brushingStreak,
    cardsLearned: cardsLearned,
    poemsMemorized: poemsMemorized,
    drawingsCount: drawings.length,
    notesCount: notes.length,
    unlockedCount: unlockedCount
  }
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

// 获取已解锁成就
var getUnlockedAchievements = function() {
  var unlocked = wx.getStorageSync('achievements') || []
  return unlocked
}

// 检查并解锁新成就
var checkAchievements = function() {
  var data = getCurrentData()
  var unlocked = getUnlockedAchievements()
  var unlockedIds = {}
  unlocked.forEach(function(a) { unlockedIds[a.id] = true })

  var newAchievements = []

  ACHIEVEMENTS.forEach(function(achievement) {
    if (!unlockedIds[achievement.id] && achievement.condition(data)) {
      newAchievements.push({
        id: achievement.id,
        icon: achievement.icon,
        title: achievement.title,
        desc: achievement.desc,
        unlockedAt: new Date().toISOString()
      })
    }
  })

  if (newAchievements.length > 0) {
    var allUnlocked = unlocked.concat(newAchievements)
    wx.setStorageSync('achievements', allUnlocked)
  }

  return newAchievements
}

// 获取所有成就（含解锁状态）
var getAllAchievements = function() {
  var unlocked = getUnlockedAchievements()
  var unlockedIds = {}
  unlocked.forEach(function(a) { unlockedIds[a.id] = true })

  return ACHIEVEMENTS.map(function(a) {
    return {
      id: a.id,
      icon: a.icon,
      title: a.title,
      desc: a.desc,
      unlocked: !!unlockedIds[a.id]
    }
  })
}

// 获取成就统计
var getAchievementStats = function() {
  var unlocked = getUnlockedAchievements()
  return {
    total: ACHIEVEMENTS.length,
    unlocked: unlocked.length,
    percentage: Math.round((unlocked.length / ACHIEVEMENTS.length) * 100)
  }
}

module.exports = {
  ACHIEVEMENTS: ACHIEVEMENTS,
  checkAchievements: checkAchievements,
  getUnlockedAchievements: getUnlockedAchievements,
  getAllAchievements: getAllAchievements,
  getAchievementStats: getAchievementStats
}
