/**
 * 摇骰子工具函数
 */

// 骰子点数对应的点数图案
var DICE_DOTS = {
  1: [[1, 1]],
  2: [[0, 0], [2, 2]],
  3: [[0, 0], [1, 1], [2, 2]],
  4: [[0, 0], [0, 2], [2, 0], [2, 2]],
  5: [[0, 0], [0, 2], [1, 1], [2, 0], [2, 2]],
  6: [[0, 0], [0, 2], [1, 0], [1, 2], [2, 0], [2, 2]]
}

// 格式化游戏结果
function formatResult(result, winnerName) {
  var resultMap = {
    win: { text: (winnerName || '玩家1') + '赢了', icon: '🎉', color: '#4CAF50' },
    lose: { text: (winnerName || '玩家2') + '赢了', icon: '🎉', color: '#4CAF50' },
    draw: { text: '平局', icon: '🤝', color: '#FF9800' }
  }
  return resultMap[result] || resultMap.draw
}

// 格式化骰子点数
function formatDiceValue(value) {
  return DICE_DOTS[value] || []
}

// 格式化骰子数组
function formatDiceArray(dice) {
  return dice.map(function(val) {
    return { value: val, dots: DICE_DOTS[val] }
  })
}

// 计算胜率
function calculateWinRate(wins, total) {
  if (total === 0) return 0
  return Math.round((wins / total) * 100)
}

// 格式化时长
function formatDuration(seconds) {
  if (seconds < 60) return seconds + '秒'
  var minutes = Math.floor(seconds / 60)
  var secs = seconds % 60
  return minutes + '分' + (secs > 0 ? secs + '秒' : '')
}

// 获取特殊组合描述
function getSpecialCombinationDesc(combination) {
  if (!combination) return ''
  return combination.icon + ' ' + combination.name + ' (+' + combination.bonus + '分)'
}

// 获取任务类型名称
function getTaskTypeName(type) {
  var typeNames = {
    performance: '表演类',
    knowledge: '知识类',
    social: '互动类',
    creative: '创意类',
    challenge: '挑战类',
    reward: '奖励类'
  }
  return typeNames[type] || '其他'
}

// 获取任务类型颜色
function getTaskTypeColor(type) {
  var typeColors = {
    performance: '#E91E63',
    knowledge: '#2196F3',
    social: '#4CAF50',
    creative: '#FF9800',
    challenge: '#9C27B0',
    reward: '#FFD700'
  }
  return typeColors[type] || '#666'
}

// 生成统计数据摘要
function generateStatsSummary(stats) {
  if (!stats || stats.totalGames === 0) {
    return '还没有游戏记录哦！'
  }

  var winRate = calculateWinRate(stats.wins, stats.totalGames)
  var summary = '共' + stats.totalGames + '局，胜率' + winRate + '%'
  
  if (stats.leopardCount > 0) {
    summary += '，摇出' + stats.leopardCount + '次豹子'
  }
  
  return summary
}

// 获取最近战绩
function getRecentRecords(count) {
  var childStorage = require('/utils/child-storage.js')
  var records = childStorage.get('diceRecords') || []
  return records.slice(0, count || 5)
}

// 格式化对手名称
function formatOpponentName(playMode, opponentName) {
  if (playMode === 'ai') return 'AI对手'
  return opponentName || '家人'
}

module.exports = {
  DICE_DOTS: DICE_DOTS,
  formatResult: formatResult,
  formatDiceValue: formatDiceValue,
  formatDiceArray: formatDiceArray,
  calculateWinRate: calculateWinRate,
  formatDuration: formatDuration,
  getSpecialCombinationDesc: getSpecialCombinationDesc,
  getTaskTypeName: getTaskTypeName,
  getTaskTypeColor: getTaskTypeColor,
  generateStatsSummary: generateStatsSummary,
  getRecentRecords: getRecentRecords,
  formatOpponentName: formatOpponentName
}
