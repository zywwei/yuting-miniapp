var diceManager = require('../../../../utils/dice-manager.js')
var diceUtils = require('../../../../utils/dice-utils.js')
var achievements = getApp().globalData.achievements
var beep = getApp().globalData.beep

Page({
  data: {
    phase: 'select', // select, player1Roll, player2Roll, playing, result
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
    showConfetti: false,
    
    // 中间大骰子动画
    showCenterDice: false,
    centerDiceValues: [1],
    centerDiceRolling: false
  },

  onLoad: function() {
    this.gameStartTime = 0
    this.rollTimer = null
  },

  onUnload: function() {
    // 清理定时器
    if (this.rollTimer) {
      clearInterval(this.rollTimer)
      this.rollTimer = null
    }
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
    var firstPhase = this.data.playMode === 'parent' ? 'player1Roll' : 'playing'

    beep.playBeep('start')

    this.setData({
      phase: firstPhase,
      player1Wins: 0,
      player2Wins: 0,
      roundHistory: [],
      gameResult: '',
      player1Dice: [],
      player2Dice: [],
      showConfetti: false,
      showCenterDice: false,
      player1Sum: 0,
      player2Sum: 0
    })
    this.gameStartTime = Date.now()
  },

  // 亲子模式 - 玩家1投掷
  rollDicePlayer1: function() {
    if (this.data.isAnimating) return
    this.setData({ isAnimating: true })
    
    this.animateDiceRoll('player1')
  },

  // 亲子模式 - 玩家2投掷
  rollDicePlayer2: function() {
    if (this.data.isAnimating) return
    this.setData({ isAnimating: true })
    
    this.animateDiceRoll('player2')
  },

  // 人机模式投掷
  rollDice: function() {
    if (this.data.isAnimating) return
    this.setData({ isAnimating: true })
    
    this.animateDiceRoll('both')
  },

  // 通用骰子动画
  animateDiceRoll: function(target) {
    var that = this
    var diceCount = this.data.diceCount
    
    // 初始化中间骰子数组
    var initValues = []
    for (var i = 0; i < diceCount; i++) {
      initValues.push(1)
    }
    
    // 显示中间大骰子
    this.setData({
      showCenterDice: true,
      centerDiceRolling: true,
      centerDiceValues: initValues
    })
    
    beep.playBeep('diceRoll')
    
    var rollCount = 0
    this.rollTimer = setInterval(function() {
      // 生成临时随机值
      var tempValues = []
      for (var i = 0; i < diceCount; i++) {
        tempValues.push(Math.floor(Math.random() * 6) + 1)
      }
      that.setData({ centerDiceValues: tempValues })
      
      rollCount++
      if (rollCount >= 10) {
        clearInterval(that.rollTimer)
        that.rollTimer = null
        
        // 生成最终结果
        var finalDice = diceManager.rollDice(diceCount)
        
        // 停止滚动，显示最终点数
        that.setData({
          centerDiceRolling: false,
          centerDiceValues: finalDice
        })
        
        beep.playBeep('diceSettle')
        
        // 延迟后将结果移到玩家区域
        setTimeout(function() {
          that.setData({ showCenterDice: false })
          
          if (target === 'player1') {
            var player1Special = diceManager.checkSpecialCombination(finalDice)
            var player1Sum = diceManager.calculateSum(finalDice)
            
            that.setData({
              player1Dice: finalDice,
              player1Sum: player1Sum,
              player1Special: player1Special,
              isAnimating: false,
              phase: 'player2Roll'
            })
            
            wx.vibrateShort({ type: 'light' })
            
          } else if (target === 'player2') {
            var player2Special = diceManager.checkSpecialCombination(finalDice)
            var player2Sum = diceManager.calculateSum(finalDice)
            
            that.setData({
              player2Dice: finalDice,
              player2Sum: player2Sum,
              player2Special: player2Special
            })
            
            // 判定结果
            that.resolveRound()
            
          } else {
            // 人机模式 - 使用动画结果作为player1，生成player2结果
            var player1Dice = finalDice
            var player2Dice = diceManager.rollDice(diceCount)
            
            var player1Special = diceManager.checkSpecialCombination(player1Dice)
            var player2Special = diceManager.checkSpecialCombination(player2Dice)
            var player1Sum = diceManager.calculateSum(player1Dice)
            var player2Sum = diceManager.calculateSum(player2Dice)
            
            that.setData({
              player1Dice: player1Dice,
              player2Dice: player2Dice,
              player1Sum: player1Sum,
              player2Sum: player2Sum,
              player1Special: player1Special,
              player2Special: player2Special
            })
            
            // 判定结果
            that.resolveRound()
          }
        }, 500)
      }
    }, 100)
  },

  // 通用回合判定
  resolveRound: function() {
    var player1Special = this.data.player1Special
    var player2Special = this.data.player2Special
    var player1Sum = this.data.player1Sum
    var player2Sum = this.data.player2Sum

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

    // 确定赢家名称
    var player1Name = this.data.playMode === 'parent' ? '玩家1' : '你'
    var player2Name = this.data.playMode === 'parent' ? '玩家2' : 'AI'
    var winnerName = result === 'win' ? player1Name : player2Name
    var resultInfo = diceUtils.formatResult(result, winnerName)

    var player1Wins = this.data.player1Wins
    var player2Wins = this.data.player2Wins

    if (result === 'win') player1Wins++
    else if (result === 'lose') player2Wins++

    var roundHistory = this.data.roundHistory.concat([{
      player1: this.data.player1Dice,
      player2: this.data.player2Dice,
      result: result
    }])

    var gameResult = ''
    var gameResultText = ''

    if (player1Wins >= this.data.winsRequired) {
      gameResult = 'win'
      gameResultText = player1Name + '获胜！'
    } else if (player2Wins >= this.data.winsRequired) {
      gameResult = 'lose'
      gameResultText = player2Name + '获胜！'
    }

    this.setData({
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
      showConfetti: result === 'win'
    })

    // 音效反馈
    if (result === 'win') {
      beep.playBeep('win')
      wx.vibrateShort({ type: 'medium' })
    } else if (result === 'lose') {
      beep.playBeep('lose')
      wx.vibrateShort({ type: 'light' })
    }

    // 更新特殊组合统计
    if (player1Special) {
      diceManager.updateStatsForSpecialCombination(player1Special.type)
    }

    // 整局结束时保存记录
    if (gameResult) {
      this.endGame()
    }

    var that = this
    setTimeout(function() {
      that.setData({ showConfetti: false })
    }, 1500)
  },

  nextRound: function() {
    var nextPhase = 'playing'
    if (this.data.playMode === 'parent') {
      nextPhase = 'player1Roll'
    }

    this.setData({
      phase: nextPhase,
      player1Dice: [],
      player2Dice: [],
      roundResult: '',
      roundResultText: '',
      roundResultIcon: '',
      player1Special: null,
      player2Special: null,
      showConfetti: false,
      player1Sum: 0,
      player2Sum: 0,
      showCenterDice: false
    })
  },

  endGame: function() {
    var duration = this.gameStartTime ? Math.floor((Date.now() - this.gameStartTime) / 1000) : 0

    var record = {
      gameType: 'dice',
      mode: 'compare',
      playMode: this.data.playMode,
      result: this.data.gameResult,
      score: this.data.player1Wins + ' - ' + this.data.player2Wins,
      duration: duration,
      participants: [],
      diceCount: this.data.diceCount,
      rounds: this.data.roundHistory
    }

    diceManager.saveGameRecord(record)

    // 检查成就
    var newAchievements = achievements.checkAchievements()
    if (newAchievements.length > 0) {
      beep.playBeep('achievement')
    }
  },

  playAgain: function() {
    this.startGame()
  },

  goBack: function() {
    wx.navigateBack()
  }
})
