/**
 * 成就系统
 * 管理成就的解锁、进度追踪和展示
 * 支持分类、稀有度、进度条
 */

var learnData = require('./learn-data.js')
var util = require('./util.js')
var habitManager = require('./habit-manager.js')

// 成就总数常量（用于 legend 成就的 maxProgress）
var TOTAL_ACHIEVEMENTS = 40

// 稀有度定义
var RARITY = {
  common: { name: '普通', color: '#4CAF50', bg: '#E8F5E9' },
  rare: { name: '稀有', color: '#2196F3', bg: '#E3F2FD' },
  legendary: { name: '传说', color: '#FF9800', bg: '#FFF3E0' }
}

// 成就定义
var ACHIEVEMENTS = [
  // ===== 刷牙成就 =====
  { id: 'brush_3', icon: '🦷', title: '刷牙新手', desc: '连续刷牙3天', category: 'habit', rarity: 'common',
    condition: function(data) { return data.brushingStreak >= 3 },
    progress: function(data) { return Math.min(data.brushingStreak, 3) }, maxProgress: 3 },
  { id: 'brush_7', icon: '🥇', title: '刷牙达人', desc: '连续刷牙7天', category: 'habit', rarity: 'common',
    condition: function(data) { return data.brushingStreak >= 7 },
    progress: function(data) { return Math.min(data.brushingStreak, 7) }, maxProgress: 7 },
  { id: 'brush_30', icon: '🏆', title: '刷牙冠军', desc: '连续刷牙30天', category: 'habit', rarity: 'rare',
    condition: function(data) { return data.brushingStreak >= 30 },
    progress: function(data) { return Math.min(data.brushingStreak, 30) }, maxProgress: 30 },

  // ===== 习惯打卡成就 =====
  { id: 'habit_3', icon: '🎯', title: '习惯入门', desc: '连续完成任意习惯3天', category: 'habit', rarity: 'common',
    condition: function(data) { return data.habitMaxStreak >= 3 },
    progress: function(data) { return Math.min(data.habitMaxStreak, 3) }, maxProgress: 3 },
  { id: 'habit_7', icon: '💪', title: '习惯达人', desc: '连续完成任意习惯7天', category: 'habit', rarity: 'common',
    condition: function(data) { return data.habitMaxStreak >= 7 },
    progress: function(data) { return Math.min(data.habitMaxStreak, 7) }, maxProgress: 7 },
  { id: 'habit_30', icon: '🏅', title: '习惯大师', desc: '连续完成任意习惯30天', category: 'habit', rarity: 'rare',
    condition: function(data) { return data.habitMaxStreak >= 30 },
    progress: function(data) { return Math.min(data.habitMaxStreak, 30) }, maxProgress: 30 },
  { id: 'habit_all_day', icon: '✅', title: '全勤小达人', desc: '一天内完成所有习惯', category: 'habit', rarity: 'rare',
    condition: function(data) { return data.allHabitsDoneToday },
    progress: function(data) { return data.allHabitsDoneToday ? 1 : 0 }, maxProgress: 1 },
  { id: 'habit_100', icon: '💯', title: '百次打卡', desc: '累计打卡100次', category: 'habit', rarity: 'rare',
    condition: function(data) { return data.totalHabitRecords >= 100 },
    progress: function(data) { return Math.min(data.totalHabitRecords, 100) }, maxProgress: 100 },

  // ===== 识字成就 =====
  { id: 'cards_10', icon: '📖', title: '识字入门', desc: '认识10个汉字', category: 'learn', rarity: 'common',
    condition: function(data) { return data.cardsLearned >= 10 },
    progress: function(data) { return Math.min(data.cardsLearned, 10) }, maxProgress: 10 },
  { id: 'cards_50', icon: '📚', title: '识字能手', desc: '认识50个汉字', category: 'learn', rarity: 'common',
    condition: function(data) { return data.cardsLearned >= 50 },
    progress: function(data) { return Math.min(data.cardsLearned, 50) }, maxProgress: 50 },
  { id: 'cards_100', icon: '🎓', title: '识字大师', desc: '认识100个汉字', category: 'learn', rarity: 'rare',
    condition: function(data) { return data.cardsLearned >= 100 },
    progress: function(data) { return Math.min(data.cardsLearned, 100) }, maxProgress: 100 },
  { id: 'cards_all_120', icon: '👑', title: '汉字全通', desc: '学完全部120个汉字', category: 'learn', rarity: 'legendary',
    condition: function(data) { return data.cardsLearned >= 120 },
    progress: function(data) { return Math.min(data.cardsLearned, 120) }, maxProgress: 120 },

  // ===== 古诗成就 =====
  { id: 'poems_5', icon: '📜', title: '诗歌入门', desc: '背诵5首古诗', category: 'learn', rarity: 'common',
    condition: function(data) { return data.poemsMemorized >= 5 },
    progress: function(data) { return Math.min(data.poemsMemorized, 5) }, maxProgress: 5 },
  { id: 'poems_10', icon: '🎭', title: '诗歌达人', desc: '背诵10首古诗', category: 'learn', rarity: 'common',
    condition: function(data) { return data.poemsMemorized >= 10 },
    progress: function(data) { return Math.min(data.poemsMemorized, 10) }, maxProgress: 10 },
  { id: 'poems_25', icon: '🏅', title: '诗歌大师', desc: '背诵全部25首古诗', category: 'learn', rarity: 'legendary',
    condition: function(data) { return data.poemsMemorized >= 25 },
    progress: function(data) { return Math.min(data.poemsMemorized, 25) }, maxProgress: 25 },

  // ===== 数字学习成就 =====
  { id: 'numbers_10', icon: '🔢', title: '数字入门', desc: '学习10个数字', category: 'learn', rarity: 'common',
    condition: function(data) { return data.numbersLearned >= 10 },
    progress: function(data) { return Math.min(data.numbersLearned, 10) }, maxProgress: 10 },
  { id: 'numbers_50', icon: '🔟', title: '数字能手', desc: '学习50个数字', category: 'learn', rarity: 'common',
    condition: function(data) { return data.numbersLearned >= 50 },
    progress: function(data) { return Math.min(data.numbersLearned, 50) }, maxProgress: 50 },
  { id: 'numbers_100', icon: '💯', title: '数字大师', desc: '学完全部100个数字', category: 'learn', rarity: 'rare',
    condition: function(data) { return data.numbersLearned >= 100 },
    progress: function(data) { return Math.min(data.numbersLearned, 100) }, maxProgress: 100 },

  // ===== 英语学习成就 =====
  { id: 'english_10', icon: '🔤', title: '英语入门', desc: '学习10个英语单词', category: 'learn', rarity: 'common',
    condition: function(data) { return data.englishLearned >= 10 },
    progress: function(data) { return Math.min(data.englishLearned, 10) }, maxProgress: 10 },
  { id: 'english_30', icon: '📝', title: '英语能手', desc: '学习30个英语单词', category: 'learn', rarity: 'common',
    condition: function(data) { return data.englishLearned >= 30 },
    progress: function(data) { return Math.min(data.englishLearned, 30) }, maxProgress: 30 },
  { id: 'english_56', icon: '🌍', title: '英语大师', desc: '学完全部56个英语单词', category: 'learn', rarity: 'rare',
    condition: function(data) { return data.englishLearned >= 56 },
    progress: function(data) { return Math.min(data.englishLearned, 56) }, maxProgress: 56 },

  // ===== 学习综合成就 =====
  { id: 'learn_all', icon: '🌟', title: '学习全能', desc: '四个学习模块各学过至少1个', category: 'learn', rarity: 'rare',
    condition: function(data) { return data.cardsLearned >= 1 && data.poemsMemorized >= 1 && data.numbersLearned >= 1 && data.englishLearned >= 1 },
    progress: function(data) { return (data.cardsLearned >= 1 ? 1 : 0) + (data.poemsMemorized >= 1 ? 1 : 0) + (data.numbersLearned >= 1 ? 1 : 0) + (data.englishLearned >= 1 ? 1 : 0) }, maxProgress: 4 },

  // ===== 画画成就 =====
  { id: 'draw_1', icon: '🎨', title: '第一幅画', desc: '画第一幅画', category: 'special', rarity: 'common',
    condition: function(data) { return data.drawingsCount >= 1 },
    progress: function(data) { return Math.min(data.drawingsCount, 1) }, maxProgress: 1 },
  { id: 'draw_5', icon: '🖌️', title: '绘画入门', desc: '画5幅画', category: 'special', rarity: 'common',
    condition: function(data) { return data.drawingsCount >= 5 },
    progress: function(data) { return Math.min(data.drawingsCount, 5) }, maxProgress: 5 },
  { id: 'draw_20', icon: '🖼️', title: '绘画达人', desc: '画20幅画', category: 'special', rarity: 'rare',
    condition: function(data) { return data.drawingsCount >= 20 },
    progress: function(data) { return Math.min(data.drawingsCount, 20) }, maxProgress: 20 },
  { id: 'draw_50', icon: '🏆', title: '绘画大师', desc: '画50幅画', category: 'special', rarity: 'legendary',
    condition: function(data) { return data.drawingsCount >= 50 },
    progress: function(data) { return Math.min(data.drawingsCount, 50) }, maxProgress: 50 },

  // ===== 笔记成就 =====
  { id: 'notes_1', icon: '✏️', title: '第一篇笔记', desc: '写第一篇笔记', category: 'special', rarity: 'common',
    condition: function(data) { return data.notesCount >= 1 },
    progress: function(data) { return Math.min(data.notesCount, 1) }, maxProgress: 1 },
  { id: 'notes_3', icon: '📝', title: '笔记入门', desc: '写3篇笔记', category: 'special', rarity: 'common',
    condition: function(data) { return data.notesCount >= 3 },
    progress: function(data) { return Math.min(data.notesCount, 3) }, maxProgress: 3 },
  { id: 'notes_10', icon: '📓', title: '笔记达人', desc: '写10篇笔记', category: 'special', rarity: 'common',
    condition: function(data) { return data.notesCount >= 10 },
    progress: function(data) { return Math.min(data.notesCount, 10) }, maxProgress: 10 },
  { id: 'notes_30', icon: '📖', title: '笔记大师', desc: '写30篇笔记', category: 'special', rarity: 'rare',
    condition: function(data) { return data.notesCount >= 30 },
    progress: function(data) { return Math.min(data.notesCount, 30) }, maxProgress: 30 },

  // ===== 故事冒险成就 =====
  { id: 'story_ch1', icon: '⚔️', title: '初出茅庐', desc: '完成第1章故事', category: 'story', rarity: 'common',
    condition: function(data) { return data.storyChapter >= 2 || data.storyRound >= 2 },
    progress: function(data) { return (data.storyChapter >= 2 || data.storyRound >= 2) ? 1 : 0 }, maxProgress: 1 },
  { id: 'story_round2', icon: '🔄', title: '二周目', desc: '进入第2轮冒险', category: 'story', rarity: 'rare',
    condition: function(data) { return data.storyRound >= 2 },
    progress: function(data) { return data.storyRound >= 2 ? 1 : 0 }, maxProgress: 1 },
  { id: 'story_10_enemies', icon: '🐉', title: '怪物猎人', desc: '累计击败10个敌人', category: 'story', rarity: 'rare',
    condition: function(data) { return data.totalEnemiesDefeated >= 10 },
    progress: function(data) { return Math.min(data.totalEnemiesDefeated, 10) }, maxProgress: 10 },
  { id: 'story_3_rounds', icon: '🏰', title: '冒险老手', desc: '完成3轮冒险', category: 'story', rarity: 'legendary',
    condition: function(data) { return data.storyRound >= 3 },
    progress: function(data) { return Math.min(data.storyRound, 3) }, maxProgress: 3 },

  // ===== 特殊成就 =====
  { id: 'early_bird', icon: '🐦', title: '早起鸟儿', desc: '早上7点前完成打卡', category: 'special', rarity: 'rare',
    condition: function(data) { return data.hasEarlyBird },
    progress: function(data) { return data.hasEarlyBird ? 1 : 0 }, maxProgress: 1 },
  { id: 'night_owl', icon: '🦉', title: '夜猫子', desc: '晚上9点后完成打卡', category: 'special', rarity: 'common',
    condition: function(data) { return data.hasNightOwl },
    progress: function(data) { return data.hasNightOwl ? 1 : 0 }, maxProgress: 1 },
  { id: 'weekend_warrior', icon: '🎉', title: '周末战士', desc: '周末完成所有习惯', category: 'special', rarity: 'rare',
    condition: function(data) { return data.weekendWarrior },
    progress: function(data) { return data.weekendWarrior ? 1 : 0 }, maxProgress: 1 },

  // ===== 综合成就 =====
  { id: 'all_rounder', icon: '⭐', title: '全面发展', desc: '每个模块都有记录', category: 'special', rarity: 'rare',
    condition: function(data) { return data.brushingStreak >= 1 && data.cardsLearned >= 1 && data.drawingsCount >= 1 && data.notesCount >= 1 },
    progress: function(data) { return (data.brushingStreak >= 1 ? 1 : 0) + (data.cardsLearned >= 1 ? 1 : 0) + (data.drawingsCount >= 1 ? 1 : 0) + (data.notesCount >= 1 ? 1 : 0) }, maxProgress: 4 },
  { id: 'super_star', icon: '🌟', title: '超级之星', desc: '解锁15个成就', category: 'special', rarity: 'rare',
    condition: function(data) { return data.unlockedCount >= 15 },
    progress: function(data) { return Math.min(data.unlockedCount, 15) }, maxProgress: 15 },
  { id: 'legend', icon: '👑', title: '传说之子', desc: '解锁全部成就', category: 'special', rarity: 'legendary',
    condition: function(data) { return data.unlockedCount >= TOTAL_ACHIEVEMENTS },
    progress: function(data) { return Math.min(data.unlockedCount, TOTAL_ACHIEVEMENTS) }, maxProgress: TOTAL_ACHIEVEMENTS }
]

// ===== 数据采集 =====

// 计算习惯打卡相关数据
var getHabitExtraData = function() {
  var records = wx.getStorageSync('habitRecords') || []
  var today = util.getTodayStr()

  // 获取所有习惯类型
  var allHabits = habitManager.getAllHabits()

  // 计算每个习惯的连续天数，取最大值
  var maxStreak = 0
  var typeMap = {}
  records.forEach(function(r) {
    if (!typeMap[r.type]) typeMap[r.type] = []
    typeMap[r.type].push(r)
  })
  Object.keys(typeMap).forEach(function(type) {
    var streak = calcStreakFromRecords(typeMap[type])
    if (streak > maxStreak) maxStreak = streak
  })

  // 今日是否完成所有习惯
  var todayRecords = records.filter(function(r) { return r.date === today })
  var todayTypes = {}
  todayRecords.forEach(function(r) { todayTypes[r.type] = true })
  var allDone = allHabits.length > 0 && allHabits.every(function(h) { return todayTypes[h.type] })

  // 是否有早起打卡（7点前）
  var hasEarlyBird = records.some(function(r) {
    return r.time && r.time < '07:00'
  })

  // 是否有晚间打卡（21点后）
  var hasNightOwl = records.some(function(r) {
    return r.time && r.time >= '21:00'
  })

  // 周末是否完成所有习惯
  var weekendWarrior = false
  var now = new Date()
  var dayOfWeek = now.getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    var weekendToday = todayRecords.map(function(r) { return r.type })
    var uniqueTypes = weekendToday.filter(function(v, i, a) { return a.indexOf(v) === i })
    weekendWarrior = allHabits.length > 0 && uniqueTypes.length >= allHabits.length
  }

  return {
    habitMaxStreak: maxStreak,
    allHabitsDoneToday: allDone,
    totalHabitRecords: records.length,
    hasEarlyBird: hasEarlyBird,
    hasNightOwl: hasNightOwl,
    weekendWarrior: weekendWarrior
  }
}

// 从记录计算连续天数
var calcStreakFromRecords = function(records) {
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

// 获取故事系统数据（累计击败敌人数跨轮次计算）
var getStoryExtraData = function() {
  var story = wx.getStorageSync('brushingStory') || {}
  var CHAPTER_COUNT = 7

  // 计算累计击败敌人数：已完成轮次 * 每轮章节数 + 当前轮已击败数
  var completedRounds = (story.round || 1) - 1
  var currentRoundDefeated = (story.defeatedEnemies || []).length
  var totalEnemiesDefeated = completedRounds * CHAPTER_COUNT + currentRoundDefeated

  return {
    storyChapter: story.currentChapter || 1,
    storyRound: story.round || 1,
    totalEnemiesDefeated: totalEnemiesDefeated
  }
}

// 获取当前完整数据
var getCurrentData = function() {
  var drawings = wx.getStorageSync('drawings') || []
  var notes = wx.getStorageSync('notes') || []

  // 刷牙连续天数
  var brushingStats = util.getBrushingStats()

  // 学习进度
  var cardsLearned = learnData.getCardsLearnedCount()
  var poemsMemorized = learnData.getPoemsMemorizedCount()
  var numbersLearned = learnData.getNumbersLearnedCount()
  var englishLearned = learnData.getEnglishLearnedCount()

  // 已解锁成就数量
  var unlocked = getUnlockedAchievements()
  var unlockedCount = unlocked.length

  // 习惯额外数据
  var habitData = getHabitExtraData()

  // 故事额外数据
  var storyData = getStoryExtraData()

  return {
    brushingStreak: brushingStats.streak,
    cardsLearned: cardsLearned,
    poemsMemorized: poemsMemorized,
    numbersLearned: numbersLearned,
    englishLearned: englishLearned,
    drawingsCount: drawings.length,
    notesCount: notes.length,
    unlockedCount: unlockedCount,
    habitMaxStreak: habitData.habitMaxStreak,
    allHabitsDoneToday: habitData.allHabitsDoneToday,
    totalHabitRecords: habitData.totalHabitRecords,
    hasEarlyBird: habitData.hasEarlyBird,
    hasNightOwl: habitData.hasNightOwl,
    weekendWarrior: habitData.weekendWarrior,
    storyChapter: storyData.storyChapter,
    storyRound: storyData.storyRound,
    totalEnemiesDefeated: storyData.totalEnemiesDefeated
  }
}

// ===== 核心 API =====

// 获取已解锁成就
var getUnlockedAchievements = function() {
  return wx.getStorageSync('achievements') || []
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
        category: achievement.category,
        rarity: achievement.rarity,
        unlockedAt: new Date().toISOString()
      })
    }
  })

  if (newAchievements.length > 0) {
    var allUnlocked = unlocked.concat(newAchievements)
    try {
      wx.setStorageSync('achievements', allUnlocked)
    } catch (e) {
      console.error('保存成就数据失败:', e)
    }
  }

  return newAchievements
}

// 获取所有成就（含解锁状态和进度）
var getAllAchievements = function() {
  var unlocked = getUnlockedAchievements()
  var unlockedIds = {}
  unlocked.forEach(function(a) { unlockedIds[a.id] = true })
  var data = getCurrentData()

  return ACHIEVEMENTS.map(function(a) {
    var isUnlocked = !!unlockedIds[a.id]
    var unlockedInfo = isUnlocked ? unlocked.filter(function(u) { return u.id === a.id })[0] : null
    return {
      id: a.id,
      icon: a.icon,
      title: a.title,
      desc: a.desc,
      category: a.category,
      rarity: a.rarity,
      rarityInfo: RARITY[a.rarity],
      unlocked: isUnlocked,
      unlockedAt: unlockedInfo ? unlockedInfo.unlockedAt : null,
      progress: a.progress(data),
      maxProgress: a.maxProgress,
      progressPercent: Math.round((a.progress(data) / a.maxProgress) * 100)
    }
  })
}

// 按分类获取成就
var getAchievementsByCategory = function(category) {
  var all = getAllAchievements()
  if (!category || category === 'all') return all
  return all.filter(function(a) { return a.category === category })
}

// 获取成就统计
var getAchievementStats = function() {
  var unlocked = getUnlockedAchievements()
  return {
    total: ACHIEVEMENTS.length,
    unlocked: unlocked.length,
    percentage: ACHIEVEMENTS.length > 0 ? Math.round((unlocked.length / ACHIEVEMENTS.length) * 100) : 0
  }
}

// 获取最近解锁的成就
var getRecentUnlocked = function(limit) {
  var unlocked = getUnlockedAchievements()
  return unlocked.slice(-(limit || 4)).reverse()
}

// 获取稀有度定义
var getRarityInfo = function(rarity) {
  return RARITY[rarity] || RARITY.common
}

module.exports = {
  RARITY: RARITY,
  ACHIEVEMENTS: ACHIEVEMENTS,
  checkAchievements: checkAchievements,
  getUnlockedAchievements: getUnlockedAchievements,
  getAllAchievements: getAllAchievements,
  getAchievementsByCategory: getAchievementsByCategory,
  getAchievementStats: getAchievementStats,
  getRecentUnlocked: getRecentUnlocked,
  getRarityInfo: getRarityInfo
}
