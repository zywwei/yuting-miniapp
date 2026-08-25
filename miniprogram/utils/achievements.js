/**
 * 成就系统
 * 管理成就的解锁、进度追踪和展示
 * 支持分类、稀有度、进度条
 */

var learnData = require('./learn-data.js')
var util = require('./util.js')
var habitManager = require('./habit-manager.js')
var childStorage = require('./child-storage.js')
var achievementsData = require('./achievements-data.js')

var RARITY = achievementsData.RARITY
var ACHIEVEMENTS = achievementsData.ACHIEVEMENTS

// ===== 数据采集 =====

// 计算习惯打卡相关数据
var getHabitExtraData = function() {
  var records = childStorage.get('habitRecords') || []
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
    var streak = util.calcBrushingStreak(typeMap[type])
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

// 获取故事系统数据（累计击败敌人数跨轮次计算）
var getStoryExtraData = function() {
  var story = childStorage.get('brushingStory') || {}
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

// 获取摆摊额外数据
var getStallExtraData = function() {
  var sales = childStorage.get('stallSales') || []
  var products = childStorage.get('stallProducts') || []
  var totalRevenue = 0
  var totalProfit = 0

  // 构建商品当前成本价映射（供无快照的老订单 fallback）
  var productCostMap = {}
  for (var i = 0; i < products.length; i++) {
    productCostMap[products[i].id] = products[i].costPrice || 0
  }

  // 使用订单快照成本价计算利润（与 stall-manager 口径一致）
  for (var i = 0; i < sales.length; i++) {
    var sale = sales[i]
    totalRevenue += sale.total || 0
    var discount = sale.discount || 10
    for (var j = 0; j < sale.items.length; j++) {
      var item = sale.items[j]
      var costPrice = item.costPrice || productCostMap[item.productId] || 0
      var itemRevenue = discount < 10
        ? Math.round((item.subtotal || 0) * discount / 10 * 100) / 100
        : (item.subtotal || 0)
      totalProfit += itemRevenue - costPrice * (item.quantity || 0)
    }
  }

  return {
    stallSalesCount: sales.length,
    stallTotalRevenue: Math.round(totalRevenue * 100) / 100,
    stallTotalProfit: Math.round(totalProfit * 100) / 100,
    stallProductTypes: products.length
  }
}

// 获取游戏额外数据
var getGameExtraData = function() {
  // 猜拳数据
  var rpsStats = childStorage.get('rpsStats') || {}
  var rpsStory = childStorage.get('rpsStory') || {}
  var rpsChallenge = childStorage.get('rpsChallenge') || {}

  // 骰子数据
  var diceStats = childStorage.get('diceStats') || {}
  var diceMissions = childStorage.get('diceMissions') || []

  // 俄罗斯方块数据
  var tetrisStats = childStorage.get('tetrisStats') || {}
  var tetrisAdventure = childStorage.get('tetrisAdventure') || {}
  var tetrisPuzzle = childStorage.get('tetrisPuzzle') || {}

  // G6：飞行棋数据（此前缺失导致 6 条成就永远无法解锁）
  var diceFlight = childStorage.get('diceFlight') || {}
  var flightStats = diceFlight.stats || {}
  var flightRecords = diceFlight.records || []

  return {
    // G6：飞行棋统计
    flightWins: flightStats.wins || 0,
    flightPerfect: flightRecords.some(function(r) { return r.result === 'win' && (r.planesFinished || 0) === 4 && !(r.planesKnocked > 0) }) ? 1 : 0,
    flightSpeedWin: flightRecords.some(function(r) { return r.result === 'win' && (r.rounds || 99) <= 20 }) ? 1 : 0,
    flightItemMaster: flightRecords.some(function(r) { return (r.itemsUsed || 0) >= 3 }) ? 1 : 0,
    flightHardWin: flightRecords.some(function(r) { return r.result === 'win' && r.difficulty === 'hard' }) ? 1 : 0,

    rpsWins: rpsStats.wins || 0,
    rpsTotalGames: rpsStats.totalGames || 0,
    rpsBestStreak: rpsStats.bestStreak || 0,
    rpsStoryDone: (rpsStory.currentChapter || 1) > 7,
    rpsChallengeLevel: rpsChallenge.currentLevel || 1,
    rpsChallengeStars: rpsChallenge.totalStars || 0,
    diceWins: diceStats.wins || 0,
    diceTotalGames: diceStats.totalGames || 0,
    diceBestStreak: diceStats.bestStreak || 0,
    diceLeopardCount: diceStats.leopardCount || 0,
    diceMissionsDone: diceMissions.length,
    tetrisGames: tetrisStats.totalGames || 0,
    tetrisTotalLines: tetrisStats.totalLines || 0,
    tetrisBestScore: tetrisStats.bestScore || 0,
    tetrisBestLevel: tetrisStats.bestLevel || 0,
    tetrisTetrisCount: tetrisStats.tetrisCount || 0,
    tetrisAdventureDone: (tetrisAdventure.currentChapter || 1) > 7,
    tetrisPuzzleLevels: tetrisPuzzle.currentLevel ? tetrisPuzzle.currentLevel - 1 : 0,
    tetrisPuzzleStars: tetrisPuzzle.totalStars || 0,
    gameTotalPlays: (rpsStats.totalGames || 0) + (diceStats.totalGames || 0) + (tetrisStats.totalGames || 0)
  }
}

// 获取当前完整数据
var getCurrentData = function(records) {
  var drawings = childStorage.get('drawings') || []
  var notes = childStorage.get('notes') || []

  // 刷牙连续天数（使用传入的记录或本地记录）
  var brushingStats = util.getBrushingStats(records)

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

  // 摆摊额外数据
  var stallData = getStallExtraData()

  // 游戏额外数据
  var gameData = getGameExtraData()

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
    totalEnemiesDefeated: storyData.totalEnemiesDefeated,
    stallSalesCount: stallData.stallSalesCount,
    stallTotalRevenue: stallData.stallTotalRevenue,
    stallTotalProfit: stallData.stallTotalProfit,
    stallProductTypes: stallData.stallProductTypes,
    rpsWins: gameData.rpsWins,
    rpsTotalGames: gameData.rpsTotalGames,
    rpsBestStreak: gameData.rpsBestStreak,
    rpsStoryDone: gameData.rpsStoryDone,
    rpsChallengeLevel: gameData.rpsChallengeLevel,
    rpsChallengeStars: gameData.rpsChallengeStars,
    diceWins: gameData.diceWins,
    diceTotalGames: gameData.diceTotalGames,
    diceBestStreak: gameData.diceBestStreak,
    diceLeopardCount: gameData.diceLeopardCount,
    diceMissionsDone: gameData.diceMissionsDone,
    tetrisGames: gameData.tetrisGames,
    tetrisTotalLines: gameData.tetrisTotalLines,
    tetrisBestScore: gameData.tetrisBestScore,
    tetrisBestLevel: gameData.tetrisBestLevel,
    tetrisTetrisCount: gameData.tetrisTetrisCount,
    tetrisAdventureDone: gameData.tetrisAdventureDone,
    tetrisPuzzleLevels: gameData.tetrisPuzzleLevels,
    tetrisPuzzleStars: gameData.tetrisPuzzleStars,
    gameTotalPlays: gameData.gameTotalPlays
  }
}

// ===== 核心 API =====

// 获取已解锁成就
var getUnlockedAchievements = function() {
  return childStorage.get('achievements') || []
}

// 检查并解锁新成就
var checkAchievements = function(records) {
  var data = getCurrentData(records)
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
      childStorage.set('achievements', allUnlocked)
      var cloud = require('./cloud.js')
      cloud.uploadAchievements(allUnlocked).catch(function() {})
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

// 异步版本：先同步云端数据再检查成就
var checkAchievementsAsync = async function() {
  var cloud = require('./cloud.js')
  var records = await cloud.fetchBrushingRecords()
  return checkAchievements(records)
}

// 从云端拉取成就并合并到本地（解决多设备成就不同步问题）
// 合并策略：以 id 去重，同一成就保留更早的 unlockedAt（首次解锁时间）
var syncAchievementsFromCloud = async function() {
  var cloud = require('./cloud.js')
  var cloudAchievements = await cloud.fetchAchievements()
  if (!cloudAchievements || cloudAchievements.length === 0) {
    return getUnlockedAchievements()
  }

  var local = getUnlockedAchievements()
  var mergedMap = {}

  // 先放本地
  local.forEach(function(a) {
    if (a && a.id) mergedMap[a.id] = a
  })

  // 再合并云端：同 id 取更早的解锁时间
  cloudAchievements.forEach(function(a) {
    if (!a || !a.id) return
    var existing = mergedMap[a.id]
    if (!existing) {
      mergedMap[a.id] = a
    } else {
      // 保留更早的解锁时间，其余字段以已有为准
      var existTime = existing.unlockedAt ? new Date(existing.unlockedAt).getTime() : Infinity
      var cloudTime = a.unlockedAt ? new Date(a.unlockedAt).getTime() : Infinity
      if (cloudTime < existTime) {
        mergedMap[a.id] = a
      }
    }
  })

  var merged = []
  for (var key in mergedMap) {
    merged.push(mergedMap[key])
  }
  // 按解锁时间排序
  merged.sort(function(a, b) {
    return new Date(a.unlockedAt || 0) - new Date(b.unlockedAt || 0)
  })

  // 仅在发生变化时回写，避免无谓写入
  if (merged.length !== local.length) {
    childStorage.set('achievements', merged)
    // 合并后若本地新增了云端成就，回传一份到云端保持一致
    cloud.uploadAchievements(merged).catch(function() {})
  }

  return merged
}

module.exports = {
  RARITY: RARITY,
  ACHIEVEMENTS: ACHIEVEMENTS,
  checkAchievements: checkAchievements,
  checkAchievementsAsync: checkAchievementsAsync,
  syncAchievementsFromCloud: syncAchievementsFromCloud,
  getUnlockedAchievements: getUnlockedAchievements,
  getAllAchievements: getAllAchievements,
  getAchievementsByCategory: getAchievementsByCategory,
  getAchievementStats: getAchievementStats,
  getRecentUnlocked: getRecentUnlocked,
  getRarityInfo: getRarityInfo
}
