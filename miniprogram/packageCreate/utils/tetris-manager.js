/**
 * 俄罗斯方块业务逻辑管理器
 * 负责：存档、记录保存、金币奖励、统计更新
 */

var childStorage = getApp().globalData.childStorage
var gameCloud = require('./game-cloud.js')
var gameEconomy = require('./game-economy.js')
var tetrisUtils = require('./tetris-utils.js')

// ===== 存档管理 =====

function saveProgress(data) {
  childStorage.set('tetrisSave', data)
}

function loadProgress() {
  return childStorage.get('tetrisSave') || null
}

function clearProgress() {
  childStorage.remove('tetrisSave')
}

// ===== 游戏记录 =====

function saveGameRecord(record) {
  record.id = record.id || tetrisUtils.generateId()
  record.gameType = 'tetris'
  record.createTime = record.createTime || new Date().toISOString()
  gameCloud.uploadGameRecord(record).catch(function(err) {
    console.warn('tetris record sync failed:', err)
  })
  return record
}

// ===== 金币奖励 =====

function rewardCoins(amount, reason) {
  if (amount > 0) {
    gameEconomy.addCoins(amount, reason)
  }
  return amount
}

function spendCoins(amount, reason) {
  return gameEconomy.spendCoins(amount, reason)
}

function getCoins() {
  return gameEconomy.getCoins()
}

// ===== 统计数据 =====

function getStats() {
  var defaults = {
    totalGames: 0,
    totalScore: 0,
    totalLines: 0,
    bestScore: 0,
    bestLines: 0,
    bestLevel: 0,
    currentStreak: 0,
    bestStreak: 0,
    totalDuration: 0,
    tetrisCount: 0,
    lastPlayed: '',
    modeStats: {
      classic: { games: 0, bestScore: 0, bestLines: 0 },
      adventure: { games: 0, chaptersCleared: 0, monstersDefeated: 0 },
      puzzle: { games: 0, levelsCleared: 0, starsTotal: 0 }
    }
  }
  var stats = childStorage.get('tetrisStats') || {}
  for (var key in defaults) {
    if (stats[key] === undefined) {
      stats[key] = defaults[key]
    }
  }
  if (!stats.modeStats) {
    stats.modeStats = defaults.modeStats
  }
  return stats
}

function updateStats(mode, result) {
  var stats = getStats()
  stats.totalGames++
  stats.totalDuration += result.duration || 0
  stats.lastPlayed = new Date().toISOString()

  if (result.score > stats.bestScore) stats.bestScore = result.score
  if (result.lines > stats.bestLines) stats.bestLines = result.lines
  if (result.level > stats.bestLevel) stats.bestLevel = result.level
  stats.totalScore += result.score || 0
  stats.totalLines += result.lines || 0
  stats.tetrisCount += result.tetrisCount || 0

  if (!stats.modeStats) {
    stats.modeStats = {}
  }
  if (!stats.modeStats[mode]) {
    stats.modeStats[mode] = { games: 0, bestScore: 0, bestLines: 0 }
  }
  stats.modeStats[mode].games++
  if (result.score > (stats.modeStats[mode].bestScore || 0)) {
    stats.modeStats[mode].bestScore = result.score
  }
  if (result.lines > (stats.modeStats[mode].bestLines || 0)) {
    stats.modeStats[mode].bestLines = result.lines
  }

  if (mode === 'adventure') {
    if (result.monsterDefeated) {
      stats.modeStats.adventure.monstersDefeated = (stats.modeStats.adventure.monstersDefeated || 0) + 1
    }
    if (result.chapterCleared) {
      stats.modeStats.adventure.chaptersCleared = (stats.modeStats.adventure.chaptersCleared || 0) + 1
    }
  }

  if (mode === 'puzzle') {
    stats.modeStats.puzzle.levelsCleared = (stats.modeStats.puzzle.levelsCleared || 0) + 1
    stats.modeStats.puzzle.starsTotal = (stats.modeStats.puzzle.starsTotal || 0) + (result.stars || 0)
  }

  childStorage.set('tetrisStats', stats)
  return stats
}

// ===== 冒险模式进度 =====

function getAdventureProgress() {
  return childStorage.get('tetrisAdventure') || {
    currentChapter: 1,
    defeatedMonsters: [],
    items: { bomb: 0, freeze: 0, rainbow: 0, undo: 0 }
  }
}

function saveAdventureProgress(progress) {
  childStorage.set('tetrisAdventure', progress)
}

function defeatMonster(chapter) {
  var progress = getAdventureProgress()
  if (progress.defeatedMonsters.indexOf(chapter) < 0) {
    progress.defeatedMonsters.push(chapter)
  }
  if (chapter >= progress.currentChapter) {
    progress.currentChapter = chapter + 1
  }
  saveAdventureProgress(progress)
  return progress
}

function getItems() {
  var progress = getAdventureProgress()
  return progress.items || { bomb: 0, freeze: 0, rainbow: 0, undo: 0 }
}

function buyItem(itemId) {
  var item = null
  for (var i = 0; i < tetrisUtils.ADVENTURE_ITEMS.length; i++) {
    if (tetrisUtils.ADVENTURE_ITEMS[i].id === itemId) {
      item = tetrisUtils.ADVENTURE_ITEMS[i]
      break
    }
  }
  if (!item) return false
  if (!spendCoins(item.price, '购买道具:' + item.name)) return false

  var progress = getAdventureProgress()
  if (!progress.items) progress.items = { bomb: 0, freeze: 0, rainbow: 0, undo: 0 }
  progress.items[itemId] = (progress.items[itemId] || 0) + 1
  saveAdventureProgress(progress)
  return true
}

function useItem(itemId) {
  var progress = getAdventureProgress()
  if (!progress.items || (progress.items[itemId] || 0) <= 0) return false
  progress.items[itemId]--
  saveAdventureProgress(progress)
  return true
}

// ===== 拼图模式进度 =====

function getPuzzleProgress() {
  return childStorage.get('tetrisPuzzle') || {
    currentLevel: 1,
    starsMap: {},
    totalStars: 0
  }
}

function savePuzzleProgress(progress) {
  childStorage.set('tetrisPuzzle', progress)
}

function completePuzzleLevel(levelId, stars) {
  var progress = getPuzzleProgress()
  var oldStars = progress.starsMap[levelId] || 0
  if (stars > oldStars) {
    progress.starsMap[levelId] = stars
    progress.totalStars = progress.totalStars - oldStars + stars
  }
  if (levelId >= progress.currentLevel) {
    progress.currentLevel = levelId + 1
  }
  savePuzzleProgress(progress)
  return progress
}

// ===== 游戏设置 =====

function getSettings() {
  return childStorage.get('tetrisSettings') || {
    soundEnabled: true
  }
}

function saveSettings(settings) {
  childStorage.set('tetrisSettings', settings)
}

module.exports = {
  saveProgress: saveProgress,
  loadProgress: loadProgress,
  clearProgress: clearProgress,
  saveGameRecord: saveGameRecord,
  rewardCoins: rewardCoins,
  spendCoins: spendCoins,
  getCoins: getCoins,
  getStats: getStats,
  updateStats: updateStats,
  getAdventureProgress: getAdventureProgress,
  saveAdventureProgress: saveAdventureProgress,
  defeatMonster: defeatMonster,
  getItems: getItems,
  buyItem: buyItem,
  useItem: useItem,
  getPuzzleProgress: getPuzzleProgress,
  savePuzzleProgress: savePuzzleProgress,
  completePuzzleLevel: completePuzzleLevel,
  getSettings: getSettings,
  saveSettings: saveSettings
}
