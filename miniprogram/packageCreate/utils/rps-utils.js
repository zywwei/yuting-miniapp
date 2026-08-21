/**
 * 剪刀石头布工具函数
 */

var rpsManager = require('./rps-manager.js')
var childStorage = getApp().globalData.childStorage

// 格式化游戏结果
function formatResult(result) {
  var resultMap = {
    win: { text: '胜利', icon: '🎉', color: '#4CAF50' },
    lose: { text: '失败', icon: '😢', color: '#F44336' },
    draw: { text: '平局', icon: '🤝', color: '#FF9800' }
  }
  return resultMap[result] || resultMap.draw
}

// 格式化比分
function formatScore(player1Wins, player2Wins) {
  return player1Wins + ' - ' + player2Wins
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

// 获取关卡配置
function getLevelConfig(level) {
  var configs = [
    { level: 1, winsRequired: 1, difficulty: 'simple', lives: 3 },
    { level: 2, winsRequired: 1, difficulty: 'simple', lives: 3 },
    { level: 3, winsRequired: 2, difficulty: 'simple', lives: 3 },
    { level: 4, winsRequired: 2, difficulty: 'medium', lives: 3 },
    { level: 5, winsRequired: 2, difficulty: 'medium', lives: 3 },
    { level: 6, winsRequired: 3, difficulty: 'medium', lives: 3 },
    { level: 7, winsRequired: 3, difficulty: 'hard', lives: 3 },
    { level: 8, winsRequired: 3, difficulty: 'hard', lives: 3 },
    { level: 9, winsRequired: 4, difficulty: 'hard', lives: 3 },
    { level: 10, winsRequired: 5, difficulty: 'master', lives: 3 }
  ]
  return configs[Math.min(level - 1, configs.length - 1)]
}

// 获取动画参数
function getAnimationParams(type) {
  var params = {
    countdown: {
      duration: 1000,
      timingFunction: 'ease-in-out'
    },
    shake: {
      duration: 300,
      timingFunction: 'ease-in-out'
    },
    result: {
      duration: 500,
      timingFunction: 'ease-out'
    },
    bounce: {
      duration: 400,
      timingFunction: 'ease-in-out'
    }
  }
  return params[type] || params.shake
}

// 获取克制对决类型：smash=石头砸剪刀 cut=剪刀剪布 wrap=布包石头
function getClashType(player1Choice, player2Choice, result) {
  if (!result || result === 'draw') return ''
  var winner = result === 'win' ? player1Choice : player2Choice
  var loser = result === 'win' ? player2Choice : player1Choice
  if (winner === 'rock' && loser === 'scissors') return 'smash'
  if (winner === 'scissors' && loser === 'paper') return 'cut'
  if (winner === 'paper' && loser === 'rock') return 'wrap'
  return ''
}

// 获取克制对决文案
function getClashText(player1Choice, player2Choice, result) {
  var map = {
    smash: '石头砸烂了剪刀！',
    cut: '剪刀剪碎了布！',
    wrap: '布包住了石头！'
  }
  return map[getClashType(player1Choice, player2Choice, result)] || ''
}

// 生成统计数据摘要
function generateStatsSummary(stats) {
  if (!stats || stats.totalGames === 0) {
    return '还没有游戏记录哦！'
  }

  var winRate = calculateWinRate(stats.wins, stats.totalGames)
  return '共' + stats.totalGames + '局，胜率' + winRate + '%，最佳连胜' + stats.bestStreak + '局'
}

// 获取最近战绩
function getRecentRecords(count) {
  var records = childStorage.get('rpsRecords') || []
  return records.slice(0, count || 5)
}

// 格式化对手名称
function formatOpponentName(playMode, opponentName) {
  if (playMode === 'ai') return 'AI对手'
  return opponentName || '家人'
}

module.exports = {
  formatResult: formatResult,
  formatScore: formatScore,
  calculateWinRate: calculateWinRate,
  formatDuration: formatDuration,
  getLevelConfig: getLevelConfig,
  getAnimationParams: getAnimationParams,
  generateStatsSummary: generateStatsSummary,
  getRecentRecords: getRecentRecords,
  formatOpponentName: formatOpponentName,
  getClashType: getClashType,
  getClashText: getClashText
}
