var rpsManager = require('../../../../utils/rps-manager.js')
var rpsUtils = require('../../../../utils/rps-utils.js')
var achievements = getApp().globalData.achievements
var beep = getApp().globalData.beep

// AI对手配置（8强，难度递增）
var AI_OPPONENTS = [
  { name: '小明', icon: '😊', difficulty: 'simple' },
  { name: '小红', icon: '😄', difficulty: 'simple' },
  { name: '阿强', icon: '😎', difficulty: 'medium' },
  { name: '阿美', icon: '🤗', difficulty: 'medium' },
  { name: '大师兄', icon: '🧐', difficulty: 'hard' },
  { name: '二师兄', icon: '😏', difficulty: 'hard' },
  { name: '魔王', icon: '👹', difficulty: 'master' }
]

Page({
  data: {
    phase: 'bracket', // bracket, matchIntro, match, matchResult, champion
    currentRound: 0, // 0=8强, 1=4强, 2=决赛
    roundNames: ['8强赛', '半决赛', '决赛'],
    currentOpponent: null,
    playerWins: 0,
    opponentWins: 0,
    playerChoice: '',
    opponentChoice: '',
    playerIcon: '',
    opponentIcon: '',
    roundResult: '',
    roundResultText: '',
    roundResultIcon: '',
    matchResult: '',
    isAnimating: false,
    showConfetti: false,
    winsRequired: 2,
    // 对阵图
    bracket: [],
    // 统计
    totalPlayed: 0,
    championCount: 0
  },

  onLoad: function() {
    this.loadStats()
    this.initBracket()
  },

  loadStats: function() {
    var record = rpsManager.getTournamentRecord()
    this.setData({
      totalPlayed: record.totalPlayed || 0,
      championCount: record.championCount || 0
    })
  },

  initBracket: function() {
    // 生成8强对阵图
    var bracket = [
      { round: '8强赛', matches: [
        { player1: { name: '我', icon: '👤', isPlayer: true }, player2: AI_OPPONENTS[0], winner: null },
        { player1: AI_OPPONENTS[1], player2: AI_OPPONENTS[2], winner: null },
        { player1: AI_OPPONENTS[3], player2: AI_OPPONENTS[4], winner: null },
        { player1: AI_OPPONENTS[5], player2: AI_OPPONENTS[6], winner: null }
      ]},
      { round: '半决赛', matches: [
        { player1: null, player2: null, winner: null },
        { player1: null, player2: null, winner: null }
      ]},
      { round: '决赛', matches: [
        { player1: null, player2: null, winner: null }
      ]}
    ]

    this.setData({
      bracket: bracket,
      currentRound: 0,
      phase: 'bracket'
    })
  },

  startMatch: function() {
    var round = this.data.currentRound
    var bracket = this.data.bracket
    var match = bracket[round].matches[0] // 玩家总是在第一场

    var opponent = match.player2
    this.setData({
      currentOpponent: opponent,
      phase: 'matchIntro',
      playerWins: 0,
      opponentWins: 0,
      roundResult: '',
      matchResult: ''
    })
  },

  beginBattle: function() {
    beep.playBeep('start')
    this.setData({ phase: 'match' })
  },

  playerChoiceAction: function(e) {
    if (this.data.isAnimating) return

    var choice = e.currentTarget.dataset.choice
    var opponent = this.data.currentOpponent
    var aiChoice = rpsManager.aiChoice(opponent.difficulty, [])
    var result = rpsManager.judge(choice, aiChoice)
    var resultInfo = rpsUtils.formatResult(result)

    var playerWins = this.data.playerWins
    var opponentWins = this.data.opponentWins

    if (result === 'win') playerWins++
    else if (result === 'lose') opponentWins++

    this.setData({
      isAnimating: true,
      playerChoice: choice,
      opponentChoice: aiChoice,
      playerIcon: rpsManager.CHOICE_ICONS[choice],
      opponentIcon: rpsManager.CHOICE_ICONS[aiChoice],
      playerWins: playerWins,
      opponentWins: opponentWins,
      roundResult: result,
      roundResultText: resultInfo.text,
      roundResultIcon: resultInfo.icon,
      showConfetti: result === 'win'
    })

    beep.playBeep('rpsShoot')

    var that = this
    setTimeout(function() {
      that.setData({ isAnimating: false, showConfetti: false })

      if (result === 'win') {
        beep.playBeep('win')
        wx.vibrateShort({ type: 'medium' })
      } else if (result === 'lose') {
        beep.playBeep('lose')
        wx.vibrateShort({ type: 'light' })
      }

      // 检查比赛是否结束
      if (playerWins >= that.data.winsRequired) {
        that.matchEnd('win')
      } else if (opponentWins >= that.data.winsRequired) {
        that.matchEnd('lose')
      }
    }, 1000)
  },

  matchEnd: function(result) {
    var round = this.data.currentRound
    var bracket = this.data.bracket

    // 更新对阵图
    var match = bracket[round].matches[0]
    match.winner = result === 'win' ? match.player1 : match.player2

    if (result === 'win') {
      beep.playBeep('complete')
    }

    this.setData({
      matchResult: result,
      phase: 'matchResult',
      bracket: bracket,
      showConfetti: result === 'win'
    })

    var that = this
    setTimeout(function() {
      that.setData({ showConfetti: false })
    }, 2000)
  },

  nextMatch: function() {
    var round = this.data.currentRound
    var bracket = this.data.bracket

    if (round >= 2) {
      // 决赛结束，检查是否夺冠
      if (this.data.matchResult === 'win') {
        this.champion()
      } else {
        this.tournamentEnd()
      }
      return
    }

    // 晋级到下一轮
    var nextRound = round + 1
    var nextMatch = bracket[nextRound].matches[0]

    // 玩家晋级
    nextMatch.player1 = bracket[round].matches[0].winner

    // 模拟另一侧的AI对战
    if (round === 0) {
      // 8强赛：模拟3场AI对战（matches[1], [2], [3]）
      var m1 = bracket[0].matches[1]
      m1.winner = Math.random() > 0.5 ? m1.player1 : m1.player2
      var m2 = bracket[0].matches[2]
      m2.winner = Math.random() > 0.5 ? m2.player1 : m2.player2
      var m3 = bracket[0].matches[3]
      m3.winner = Math.random() > 0.5 ? m3.player1 : m3.player2

      // 半决赛另一侧：match[2]胜者 vs match[3]胜者
      var semiOther = bracket[1].matches[1]
      semiOther.player1 = m2.winner
      semiOther.player2 = m3.winner
      semiOther.winner = Math.random() > 0.5 ? semiOther.player1 : semiOther.player2

      // 玩家半决赛对手：match[1]胜者
      nextMatch.player2 = m1.winner
    } else if (round === 1) {
      // 半决赛：另一侧已在round=0时模拟完成
      var otherMatch = bracket[1].matches[1]
      nextMatch.player2 = otherMatch.winner
    }

    this.setData({
      currentRound: nextRound,
      bracket: bracket,
      phase: 'bracket',
      matchResult: '',
      roundResult: ''
    })
  },

  champion: function() {
    var record = rpsManager.getTournamentRecord()
    record.totalPlayed = (record.totalPlayed || 0) + 1
    record.championCount = (record.championCount || 0) + 1
    record.bestRound = 3
    rpsManager.saveTournamentRecord(record)

    // 保存游戏记录
    var gameRecord = {
      gameType: 'rps',
      mode: 'tournament',
      playMode: 'ai',
      result: 'win',
      score: '冠军',
      duration: 0,
      participants: []
    }
    rpsManager.saveGameRecord(gameRecord)

    // 检查成就
    achievements.checkAchievements()

    beep.playBeep('achievement')

    this.setData({
      phase: 'champion',
      showConfetti: true,
      championCount: record.championCount,
      totalPlayed: record.totalPlayed
    })

    var that = this
    setTimeout(function() {
      that.setData({ showConfetti: false })
    }, 3000)
  },

  tournamentEnd: function() {
    var record = rpsManager.getTournamentRecord()
    record.totalPlayed = (record.totalPlayed || 0) + 1
    record.bestRound = Math.max(record.bestRound || 0, this.data.currentRound + 1)
    rpsManager.saveTournamentRecord(record)

    this.setData({
      totalPlayed: record.totalPlayed
    })
  },

  restart: function() {
    this.initBracket()
    this.setData({
      matchResult: '',
      roundResult: '',
      currentOpponent: null
    })
  },

  goBack: function() {
    wx.navigateBack()
  }
})
