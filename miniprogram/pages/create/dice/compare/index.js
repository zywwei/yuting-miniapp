var diceManager = require('../../../../utils/dice-manager.js')
var diceUtils = require('../../../../utils/dice-utils.js')

Page({
  data: {
    phase: 'select', // select, playing, result
    playMode: '', // parent, ai
    diceCount: 1,
    player1Dice: [],
    player2Dice: [],
    player1Sum: 0,
    player2Sum: 0,
    player1Special: null,
    player2Special: null,
    roundResult: '',
    roundResultText: '',
    roundResultIcon: '',
    gameResult: '',
    gameResultText: '',
    player1Wins: 0,
    player2Wins: 0,
    maxRounds: 3,
    winsRequired: 2,
    isAnimating: false,
    roundHistory: [],
    isRolling: false
  },

  onLoad: function() {
    // 初始化
  },

  selectMode: function(e) {
    var mode = e.currentTarget.dataset.mode
    this.setData({ playMode: mode })
  },

  selectDiceCount: function(e) {
    var count = parseInt(e.currentTarget.dataset.count)
    this.setData({ diceCount: count })
  },

  startGame: function() {
    this.setData({
      phase: 'playing',
      player1Wins: 0,
      player2Wins: 0,
      roundHistory: [],
      gameResult: '',
      player1Dice: [],
      player2Dice: []
    })
  },

  rollDice: function() {
    if (this.data.isAnimating) return

    this.setData({ isAnimating: true, isRolling: true })

    var that = this
    var diceCount = this.data.diceCount

    // 摇骰子动画
    var rollCount = 0
    var rollInterval = setInterval(function() {
      var tempDice = []
      for (var i = 0; i < diceCount; i++) {
        tempDice.push(Math.floor(Math.random() * 6) + 1)
      }
      that.setData({ player1Dice: tempDice })
      
      rollCount++
      if (rollCount >= 10) {
        clearInterval(rollInterval)
        
        // 最终结果
        var player1Dice = diceManager.rollDice(diceCount)
        var player1Special = diceManager.checkSpecialCombination(player1Dice)
        var player1Sum = diceManager.calculateSum(player1Dice)

        var player2Dice = []
        if (that.data.playMode === 'ai') {
          player2Dice = diceManager.rollDice(diceCount)
        } else {
          // 亲子模式：随机生成对手结果
          player2Dice = diceManager.rollDice(diceCount)
        }
        var player2Special = diceManager.checkSpecialCombination(player2Dice)
        var player2Sum = diceManager.calculateSum(player2Dice)

        // 特殊组合优先
        var result = 'draw'
        if (player1Special && !player2Special) {
          result = 'win'
        } else if (!player1Special && player2Special) {
          result = 'lose'
        } else if (player1Special && player2Special) {
          result = player1Sum > player2Sum ? 'win' : player1Sum < player2Sum ? 'lose' : 'draw'
        } else {
          result = player1Sum > player2Sum ? 'win' : player1Sum < player2Sum ? 'lose' : 'draw'
        }

        var resultInfo = diceUtils.formatResult(result)

        var player1Wins = that.data.player1Wins
        var player2Wins = that.data.player2Wins

        if (result === 'win') player1Wins++
        else if (result === 'lose') player2Wins++

        var roundHistory = that.data.roundHistory.concat([{
          player1: player1Dice,
          player2: player2Dice,
          result: result
        }])

        var gameResult = ''
        var gameResultText = ''

        if (player1Wins >= that.data.winsRequired) {
          gameResult = 'win'
          gameResultText = '恭喜胜利！'
        } else if (player2Wins >= that.data.winsRequired) {
          gameResult = 'lose'
          gameResultText = '再接再厉！'
        }

        that.setData({
          player1Dice: player1Dice,
          player2Dice: player2Dice,
          player1Sum: player1Sum,
          player2Sum: player2Sum,
          player1Special: player1Special,
          player2Special: player2Special,
          player1Wins: player1Wins,
          player2Wins: player2Wins,
          roundResult: result,
          roundResultText: resultInfo.text,
          roundResultIcon: resultInfo.icon,
          gameResult: gameResult,
          gameResultText: gameResultText,
          roundHistory: roundHistory,
          phase: 'result',
          isAnimating: false,
          isRolling: false
        })

        // 振动反馈
        if (result === 'win') {
          wx.vibrateShort({ type: 'medium' })
        } else if (result === 'lose') {
          wx.vibrateShort({ type: 'light' })
        }

        // 更新特殊组合统计
        if (player1Special) {
          diceManager.updateStatsForSpecialCombination(player1Special.type)
        }
      }
    }, 100)
  },

  nextRound: function() {
    this.setData({
      phase: 'playing',
      player1Dice: [],
      player2Dice: [],
      roundResult: '',
      roundResultText: '',
      roundResultIcon: '',
      player1Special: null,
      player2Special: null
    })
  },

  endGame: function() {
    var record = {
      gameType: 'dice',
      mode: 'compare',
      playMode: this.data.playMode,
      result: this.data.gameResult,
      score: this.data.player1Wins + ' - ' + this.data.player2Wins,
      duration: 0,
      participants: [],
      diceCount: this.data.diceCount,
      rounds: this.data.roundHistory
    }

    diceManager.saveGameRecord(record)

    this.setData({
      phase: 'select',
      player1Wins: 0,
      player2Wins: 0,
      roundHistory: [],
      gameResult: ''
    })
  },

  playAgain: function() {
    this.startGame()
  },

  goBack: function() {
    wx.navigateBack()
  }
})
