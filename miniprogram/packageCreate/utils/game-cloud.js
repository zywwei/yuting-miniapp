/**
 * 游戏数据云端同步
 * 只记录基础记录（游戏时间、胜负结果、参与人员）
 * 详细统计在本地计算
 * 
 * 使用 cloud.js 的工厂函数实现，保持向后兼容
 */

var auth = getApp().globalData.auth
var childStorage = getApp().globalData.childStorage
var syncQueue = getApp().globalData.syncQueue
var cloud = getApp().globalData.cloud

// 从 cloud.js 获取工厂函数和枚举
var ISOLATION_LEVEL = cloud.ISOLATION_LEVEL
var createListFetcher = cloud.createListFetcher
var createUploader = cloud.createUploader
var createRemover = cloud.createRemover

function getStorageKey(gameType) {
  var map = { rps: 'rpsRecords', dice: 'diceRecords', tetris: 'tetrisRecords' }
  return map[gameType] || 'rpsRecords'
}

function getStatsKey(gameType) {
  var map = { rps: 'rpsStats', dice: 'diceStats', tetris: 'tetrisStats' }
  return map[gameType] || 'rpsStats'
}

// 为每种游戏类型创建 fetch 函数（使用独立的墓碑 key，避免误过滤）
var fetchFunctions = {
  rps: createListFetcher({
    collection: 'gameRecords',
    storageKey: 'rpsRecords',
    deletedKey: 'deletedRpsRecordIds',
    isolation: ISOLATION_LEVEL.FAMILY,  // 家庭级共享
    pageSize: 200,
    hasImage: false,
    gameType: 'rps'
  }),
  dice: createListFetcher({
    collection: 'gameRecords',
    storageKey: 'diceRecords',
    deletedKey: 'deletedDiceRecordIds',
    isolation: ISOLATION_LEVEL.FAMILY,
    pageSize: 200,
    hasImage: false,
    gameType: 'dice'
  }),
  tetris: createListFetcher({
    collection: 'gameRecords',
    storageKey: 'tetrisRecords',
    deletedKey: 'deletedTetrisRecordIds',
    isolation: ISOLATION_LEVEL.FAMILY,
    pageSize: 200,
    hasImage: false,
    gameType: 'tetris'
  })
}

// 为每种游戏类型创建 upload 函数
var uploadFunctions = {
  rps: createUploader({
    collection: 'gameRecords',
    storageKey: 'rpsRecords',
    isolation: ISOLATION_LEVEL.FAMILY
  }),
  dice: createUploader({
    collection: 'gameRecords',
    storageKey: 'diceRecords',
    isolation: ISOLATION_LEVEL.FAMILY
  }),
  tetris: createUploader({
    collection: 'gameRecords',
    storageKey: 'tetrisRecords',
    isolation: ISOLATION_LEVEL.FAMILY
  })
}

// 为每种游戏类型创建 remove 函数（使用独立的墓碑 key）
var removeFunctions = {
  rps: createRemover({
    collection: 'gameRecords',
    storageKey: 'rpsRecords',
    deletedKey: 'deletedRpsRecordIds',
    isolation: ISOLATION_LEVEL.FAMILY
  }),
  dice: createRemover({
    collection: 'gameRecords',
    storageKey: 'diceRecords',
    deletedKey: 'deletedDiceRecordIds',
    isolation: ISOLATION_LEVEL.FAMILY
  }),
  tetris: createRemover({
    collection: 'gameRecords',
    storageKey: 'tetrisRecords',
    deletedKey: 'deletedTetrisRecordIds',
    isolation: ISOLATION_LEVEL.FAMILY
  })
}

// 上传游戏记录（只上传基础数据）
function uploadGameRecord(record) {
  var gameType = record.gameType
  if (!uploadFunctions[gameType]) {
    console.warn('未知的游戏类型:', gameType)
    return Promise.resolve()
  }
  
  // 使用工厂函数创建的 upload 函数
  return uploadFunctions[gameType](record)
}

// 获取游戏记录
function fetchGameRecords(gameType) {
  if (!fetchFunctions[gameType]) {
    console.warn('未知的游戏类型:', gameType)
    return Promise.resolve([])
  }
  
  // 使用工厂函数创建的 fetch 函数
  return fetchFunctions[gameType]()
}

// 删除游戏记录（本地 + 云端 + 墓碑）
function removeGameRecord(gameType, id) {
  if (!removeFunctions[gameType]) {
    console.warn('未知的游戏类型:', gameType)
    return Promise.resolve(false)
  }
  
  // 使用工厂函数创建的 remove 函数
  return removeFunctions[gameType](id)
}

// 更新本地统计
function updateLocalStats(gameType, record) {
  var statsKey = getStatsKey(gameType)
  var stats = childStorage.get(statsKey) || {
    totalGames: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    currentStreak: 0,
    bestStreak: 0,
    bestScore: '',
    totalDuration: 0,
    modeStats: {},
    opponentStats: {},
    lastPlayed: ''
  }

  stats.totalGames++
  stats.totalDuration += record.duration || 0
  stats.lastPlayed = record.createTime

  // 俄罗斯方块使用独立的统计逻辑
  if (gameType === 'tetris') {
    stats.totalScore = (stats.totalScore || 0) + (record.score || 0)
    stats.totalLines = (stats.totalLines || 0) + (record.lines || 0)
    if ((record.score || 0) > (stats.bestScore || 0)) stats.bestScore = record.score
    if ((record.level || 0) > (stats.bestLevel || 0)) stats.bestLevel = record.level
    stats.tetrisCount = (stats.tetrisCount || 0) + (record.tetrisCount || 0)
    if (!stats.modeStats[record.mode]) {
      stats.modeStats[record.mode] = { games: 0, bestScore: 0, bestLines: 0 }
    }
    stats.modeStats[record.mode].games++
    if ((record.score || 0) > (stats.modeStats[record.mode].bestScore || 0)) {
      stats.modeStats[record.mode].bestScore = record.score
    }
    if ((record.lines || 0) > (stats.modeStats[record.mode].bestLines || 0)) {
      stats.modeStats[record.mode].bestLines = record.lines
    }
    childStorage.set(statsKey, stats)
    return stats
  }

  if (record.result === 'win') {
    stats.wins++
    stats.currentStreak++
    if (stats.currentStreak > stats.bestStreak) {
      stats.bestStreak = stats.currentStreak
    }
  } else if (record.result === 'lose') {
    stats.losses++
    stats.currentStreak = 0
  } else {
    stats.draws++
  }

  // 更新模式统计
  if (!stats.modeStats[record.mode]) {
    stats.modeStats[record.mode] = { games: 0, wins: 0, losses: 0, draws: 0 }
  }
  stats.modeStats[record.mode].games++
  if (record.result === 'win') stats.modeStats[record.mode].wins++
  else if (record.result === 'lose') stats.modeStats[record.mode].losses++
  else stats.modeStats[record.mode].draws++

  // 更新对手统计
  var opponentType = record.playMode || 'ai'
  if (!stats.opponentStats[opponentType]) {
    stats.opponentStats[opponentType] = { games: 0, wins: 0, losses: 0, draws: 0 }
  }
  stats.opponentStats[opponentType].games++
  if (record.result === 'win') stats.opponentStats[opponentType].wins++
  else if (record.result === 'lose') stats.opponentStats[opponentType].losses++
  else stats.opponentStats[opponentType].draws++

  childStorage.set(statsKey, stats)
  return stats
}

module.exports = {
  uploadGameRecord: uploadGameRecord,
  fetchGameRecords: fetchGameRecords,
  removeGameRecord: removeGameRecord,
  updateLocalStats: updateLocalStats,
  // 暴露工厂函数和配置，方便扩展
  fetchFunctions: fetchFunctions,
  uploadFunctions: uploadFunctions,
  removeFunctions: removeFunctions
}
