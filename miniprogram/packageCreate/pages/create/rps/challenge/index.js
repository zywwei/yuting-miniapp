var rpsManager = require('../../../../utils/rps-manager.js')
var rpsUtils = require('../../../../utils/rps-utils.js')
var achievements = require('../../../../../utils/achievements.js')
var beep = require('../../../../../utils/beep.js')

Page({
  data: {
    phase: 'menu', // menu, playing, levelComplete, gameOver
    currentLevel: 1,
    lives: 3,
    bestLevel: 1,
    totalStars: 0,
    levelConfig: null,
    player1Wins: 0,
    player2Wins: 0,
    player1Choice: '',
    player2Choice: '',
    player1Icon: '✊',
    player2Icon: '✊',
    roundResult: '',
    isAnimating: false,
    roundHistory: [],
    showConfetti: false
  },

  onLoad: function() {
    this.loadProgress()
    this.gameStartTime = 0
  },

  onShow: function() {
    this.loadProgress()
  },

  loadProgress: function() {
    var progress = rpsManager.getChallengeProgress()
    this.setData({
      currentLevel: progress.currentLevel,
      lives: progress.lives,
      bestLevel: progress.bestLevel,
      totalStars: progress.totalStars || 0
    })
  },

  startLevel: function() {
    var levelConfig = {
      level: this.data.currentLevel,
      winsRequired: Math.min(this.data.currentLevel, 5),
      difficulty: this.data.currentLevel <= 3 ? 'simple' : this.data.currentLevel <= 6 ? 'medium' : 'hard'
    }

    beep.playBeep('start')

    this.setData({
      phase: 'playing',
      levelConfig: levelConfig,
      player1Wins: 0,
      player2Wins: 0,
      roundHistory: [],
      roundResult: '',
      player1Choice: '',
      player2Choice: '',
      player1Icon: '',
      player2Icon: '',
      showConfetti: false
    })
    this.gameStartTime = Date.now()
  },

  playerChoice: function(e) {
    if (this.data.isAnimating) return

    var choice = e.currentTarget.dataset.choice
    var aiChoice = rpsManager.aiChoice(this.data.levelConfig.difficulty, this.data.roundHistory)
    var result = rpsManager.judge(choice, aiChoice)
    var resultInfo = rpsUtils.formatResult(result)

    var player1Wins = this.data.player1Wins
    var player2Wins = this.data.player2Wins

    if (result === 'win') player1Wins++
    else if (result === 'lose') player2Wins++

    var roundHistory = this.data.roundHistory.concat([{
      player1: choice,
      player2: aiChoice,
      result: result
    }])

    this.setData({
      isAnimating: true,
      player1Choice: choice,
      player2Choice: aiChoice,
      player1Icon: rpsManager.CHOICE_ICONS[choice],
      player2Icon: rpsManager.CHOICE_ICONS[aiChoice],
      player1Wins: player1Wins,
      player2Wins: player2Wins,
      roundResult: result,
      roundHistory: roundHistory,
      showConfetti: result === 'win'
    })

    // 音效
    beep.playBeep('rpsShoot')

    var that = this
    setTimeout(function() {
      that.setData({ isAnimating: false, showConfetti: false })

      // 音效反馈
      if (result === 'win') {
        beep.playBeep('win')
        wx.vibrateShort({ type: 'medium' })
      } else if (result === 'lose') {
        beep.playBeep('lose')
        wx.vibrateShort({ type: 'light' })
      }

      if (player1Wins >= that.data.levelConfig.winsRequired) {
        that.levelComplete()
      } else if (player2Wins >= that.data.levelConfig.winsRequired) {
        that.levelFailed()
      }
    }, 1000)
  },

  levelComplete: function() {
    var progress = rpsManager.getChallengeProgress()
    if (progress.completedLevels.indexOf(this.data.currentLevel) < 0) {
      progress.completedLevels.push(this.data.currentLevel)
    }

    // B9修复：累加星级
    progress.totalStars = (progress.totalStars || 0) + this.data.levelConfig.winsRequired

    progress.currentLevel = this.data.currentLevel + 1
    progress.bestLevel = Math.max(progress.bestLevel, progress.currentLevel)
    rpsManager.saveChallengeProgress(progress)

    beep.playBeep('complete')

    // 检查成就
    var newAchievements = achievements.checkAchievements()
    if (newAchievements.length > 0) {
      beep.playBeep('achievement')
    }

    this.setData({
      phase: 'levelComplete',
      currentLevel: progress.currentLevel,
      bestLevel: progress.bestLevel,
      totalStars: progress.totalStars,
      showConfetti: true
    })

    var that = this
    setTimeout(function() {
      that.setData({ showConfetti: false })
    }, 1500)
  },

  levelFailed: function() {
    var progress = rpsManager.getChallengeProgress()
    progress.lives--
    progress.totalAttempts++
    rpsManager.saveChallengeProgress(progress)

    beep.playBeep('lose')
    wx.vibrateShort({ type: 'light' })

    if (progress.lives <= 0) {
      // B10修复：gameOver时保存游戏记录
      var record = {
        gameType: 'rps',
        mode: 'challenge',
        playMode: 'ai',
        result: 'gameOver',
        score: '第' + this.data.currentLevel + '关',
        duration: this.gameStartTime ? Math.floor((Date.now() - this.gameStartTime) / 1000) : 0,
        participants: [],
        rounds: this.data.roundHistory,
        level: this.data.currentLevel
      }
      rpsManager.saveGameRecord(record)

      this.setData({
        phase: 'gameOver',
        lives: 0
      })
    } else {
      this.setData({
        lives: progress.lives
      })
    }
  },

  nextLevel: function() {
    this.startLevel()
  },

  retryLevel: function() {
    this.startLevel()
  },

  resetGame: function() {
    var progress = {
      currentLevel: 1,
      lives: 3,
      bestLevel: this.data.bestLevel,
      totalStars: this.data.totalStars,
      totalAttempts: 0,
      completedLevels: []
    }
    rpsManager.saveChallengeProgress(progress)

    this.setData({
      phase: 'menu',
      currentLevel: 1,
      lives: 3
    })
  },

  goBack: function() {
    wx.navigateBack()
  }
})
