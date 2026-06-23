var rpsManager = require('../../../../utils/rps-manager.js')

Page({
  data: {
    phase: 'menu', // menu, playing, levelComplete, gameOver
    currentLevel: 1,
    lives: 3,
    bestLevel: 1,
    levelConfig: null,
    player1Wins: 0,
    player2Wins: 0,
    player1Choice: '',
    player2Choice: '',
    player1Icon: '✊',
    player2Icon: '✊',
    roundResult: '',
    isAnimating: false,
    roundHistory: []
  },

  onLoad: function() {
    this.loadProgress()
  },

  loadProgress: function() {
    var progress = rpsManager.getChallengeProgress()
    this.setData({
      currentLevel: progress.currentLevel,
      lives: progress.lives,
      bestLevel: progress.bestLevel
    })
  },

  startLevel: function() {
    var levelConfig = {
      level: this.data.currentLevel,
      winsRequired: Math.min(this.data.currentLevel, 5),
      difficulty: this.data.currentLevel <= 3 ? 'simple' : this.data.currentLevel <= 6 ? 'medium' : 'hard'
    }

    this.setData({
      phase: 'playing',
      levelConfig: levelConfig,
      player1Wins: 0,
      player2Wins: 0,
      roundHistory: []
    })
  },

  playerChoice: function(e) {
    if (this.data.isAnimating) return

    var choice = e.currentTarget.dataset.choice
    var aiChoice = rpsManager.aiChoice(this.data.levelConfig.difficulty, this.data.roundHistory)
    var result = rpsManager.judge(choice, aiChoice)

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
      roundHistory: roundHistory
    })

    var that = this
    setTimeout(function() {
      that.setData({ isAnimating: false })

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
    progress.currentLevel = this.data.currentLevel + 1
    progress.bestLevel = Math.max(progress.bestLevel, progress.currentLevel)
    rpsManager.saveChallengeProgress(progress)

    this.setData({
      phase: 'levelComplete',
      currentLevel: progress.currentLevel,
      bestLevel: progress.bestLevel
    })
  },

  levelFailed: function() {
    var progress = rpsManager.getChallengeProgress()
    progress.lives--
    progress.totalAttempts++
    rpsManager.saveChallengeProgress(progress)

    if (progress.lives <= 0) {
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
