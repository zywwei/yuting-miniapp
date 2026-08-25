var rpsManager = require('../../../../utils/rps-manager.js')
var rpsUtils = require('../../../../utils/rps-utils.js')
var childStorage = getApp().globalData.childStorage

Page({
  data: {
    iconMap: rpsManager.ICON_TO_IMAGE,
    phase: 'select', // select, playing, player1Select, player2Select, result
    playMode: '', // parent, ai
    difficulty: 'simple',
    currentPlayer: 1, // 当前选择的玩家（亲子模式）
    player1Choice: '',
    player2Choice: '',
    player1Icon: '✊',
    player2Icon: '✊',
    player1Wins: 0,
    player2Wins: 0,
    roundResult: '',
    roundResultText: '',
    roundResultIcon: '',
    gameResult: '',
    gameResultText: '',
    isAnimating: false,
    countdown: 0,
    roundHistory: [],
    maxRounds: 3,
    winsRequired: 2,
    showShockwave: false,
    showScreenShake: false,
    showParticles: false,
    clashType: '',
    clashText: '',
    clashWinner: 0,
    brokenIcon: ''
  },

  onLoad: function(options) {
    if (options.mode) {
      this.setData({ playMode: options.mode })
    }
    this.gameStartTime = 0
    this.animTimer = null
  },

  onUnload: function() {
    // 清理定时器（E1：含倒计时句柄）
    if (this.animTimer) {
      clearInterval(this.animTimer)
      this.animTimer = null
    }
    if (this._countdownTimer) {
      clearInterval(this._countdownTimer)
      this._countdownTimer = null
    }
  },

  selectMode: function(e) {
    var mode = e.currentTarget.dataset.mode
    if (mode === 'parent' || mode === 'parentRandom') {
      // 亲子模式直接开始游戏
      this.setData({ playMode: mode })
      this.startGame()
    } else {
      // 人机模式需要选择难度
      this.setData({ playMode: mode })
    }
  },

  selectDifficulty: function(e) {
    var difficulty = e.currentTarget.dataset.difficulty
    this.setData({ 
      difficulty: difficulty, 
      phase: 'playing',
      currentPlayer: 1
    })
  },

  startGame: function() {
    var phase = 'playing'
    if (this.data.playMode === 'parent') {
      phase = 'player1Select'
    } else if (this.data.playMode === 'parentRandom') {
      phase = 'randomPlaying'
    }
    this._resultSaved = false // E2：新一局重置保存标志

    this.setData({
      phase: phase,
      player1Wins: 0,
      player2Wins: 0,
      roundHistory: [],
      gameResult: '',
      gameResultText: '',
      player1Choice: '',
      player2Choice: '',
      player1Icon: '',
      player2Icon: '',
      roundResult: '',
      roundResultText: '',
      roundResultIcon: '',
      showConfetti: false,
      scoreChanged: false,
      currentPlayer: 1,
      clashType: '',
      clashText: '',
      clashWinner: 0
    })
    this.gameStartTime = Date.now()
  },

  // 亲子模式：玩家选择出拳
  playerSelectChoice: function(e) {
    if (this.data.isAnimating) return

    var choice = e.currentTarget.dataset.choice
    
    if (this.data.playMode === 'parent') {
      // 亲子模式
      if (this.data.currentPlayer === 1) {
        // 玩家1选择完毕，直接切换到玩家2
        this.setData({
          player1Choice: choice,
          currentPlayer: 2
        })
      } else {
        // 玩家2选择完毕，显示结果
        this.setData({
          player2Choice: choice
        })
        this.showParentResult(choice)
      }
    }
  },

  // 亲子模式：显示结果
  showParentResult: function(player2Choice) {
    var player1Choice = this.data.player1Choice
    var result = rpsManager.judge(player1Choice, player2Choice)
    var resultInfo = rpsUtils.formatResult(result)
    var clashType = rpsUtils.getClashType(player1Choice, player2Choice, result)
    var clashText = rpsUtils.getClashText(player1Choice, player2Choice, result)
    var brokenIcon = clashType ? rpsManager.BROKEN_IMAGE[result === 'win' ? player2Choice : player1Choice] : ''

    // 亲子模式下玩家2赢也显示庆祝表情
    if (result === 'lose') {
      resultInfo.icon = '🎉'
    }

    var player1Wins = this.data.player1Wins
    var player2Wins = this.data.player2Wins

    if (result === 'win') player1Wins++
    else if (result === 'lose') player2Wins++

    var roundHistory = this.data.roundHistory.concat([{
      player1: player1Choice,
      player2: player2Choice,
      result: result
    }])

    var gameResult = ''
    var gameResultText = ''

    if (player1Wins >= this.data.winsRequired) {
      gameResult = 'win'
      gameResultText = '玩家1胜利！'
    } else if (player2Wins >= this.data.winsRequired) {
      gameResult = 'lose'
      gameResultText = '玩家2胜利！'
    }

    this.setData({
      player1Icon: rpsManager.CHOICE_ICONS[player1Choice],
      player2Icon: rpsManager.CHOICE_ICONS[player2Choice],
      player1Wins: player1Wins,
      player2Wins: player2Wins,
      roundResult: result,
      roundResultText: resultInfo.text,
      roundResultIcon: resultInfo.icon,
      gameResult: gameResult,
      gameResultText: gameResultText,
      roundHistory: roundHistory,
      phase: 'result',
      isAnimating: true,
      showConfetti: result !== 'draw',
      scoreChanged: true,
      clashType: clashType,
      clashText: clashText,
      clashWinner: result === 'win' ? 1 : 2,
      brokenIcon: brokenIcon
    })

    // 振动反馈
    if (result === 'win') {
      wx.vibrateShort({ type: 'medium' })
    } else if (result === 'lose') {
      wx.vibrateShort({ type: 'light' })
    }

    // 保存游戏记录（亲子模式整局结束时）
    if (gameResult) {
      var record = {
        gameType: 'rps',
        mode: 'classic',
        playMode: 'parent',
        result: gameResult,
        score: rpsUtils.formatScore(player1Wins, player2Wins),
        duration: this.gameStartTime ? Math.floor((Date.now() - this.gameStartTime) / 1000) : 0,
        participants: [],
        rounds: roundHistory
      }
      rpsManager.saveGameRecord(record)
    }

    var that = this
    setTimeout(function() {
      that.setData({ isAnimating: false, showConfetti: false, scoreChanged: false })
    }, 1500)
  },

  // 亲子随机模式：随机出拳
  startRandomBattle: function() {
    if (this.data.isAnimating) return

    // 设置动画状态
    this.setData({ isAnimating: true })

    // 随机动画
    var that = this
    var choices = rpsManager.CHOICES
    var choiceIcons = rpsManager.CHOICE_ICONS
    var animCount = 0
    this.animTimer = setInterval(function() {
      // 随机显示图标
      var randomChoice = choices[Math.floor(Math.random() * 3)]
      
      if (that.data.currentPlayer === 1) {
        that.setData({ player1Icon: choiceIcons[randomChoice] })
      } else {
        that.setData({ player2Icon: choiceIcons[randomChoice] })
      }
      
      animCount++
      if (animCount >= 8) {
        clearInterval(that.animTimer)
        that.animTimer = null
        
        // 最终结果
        var choice = choices[Math.floor(Math.random() * 3)]
        
        if (that.data.currentPlayer === 1) {
          // 玩家1随机出拳，切换到玩家2
          that.setData({
            player1Choice: choice,
            player1Icon: choiceIcons[choice],
            currentPlayer: 2,
            isAnimating: false
          })
          wx.vibrateShort({ type: 'light' })
        } else {
          // 玩家2随机出拳，显示结果
          that.setData({
            player2Choice: choice,
            player2Icon: choiceIcons[choice]
          })
          that.showRandomResult(choice)
        }
      }
    }, 100)
  },

  // 亲子随机模式：显示结果
  showRandomResult: function(player2Choice) {
    var player1Choice = this.data.player1Choice
    var result = rpsManager.judge(player1Choice, player2Choice)
    var resultInfo = rpsUtils.formatResult(result)
    var clashType = rpsUtils.getClashType(player1Choice, player2Choice, result)
    var clashText = rpsUtils.getClashText(player1Choice, player2Choice, result)
    var brokenIcon = clashType ? rpsManager.BROKEN_IMAGE[result === 'win' ? player2Choice : player1Choice] : ''

    // 亲子模式下玩家2赢也显示庆祝表情
    if (result === 'lose') {
      resultInfo.icon = '🎉'
    }

    var player1Wins = this.data.player1Wins
    var player2Wins = this.data.player2Wins

    if (result === 'win') player1Wins++
    else if (result === 'lose') player2Wins++

    var roundHistory = this.data.roundHistory.concat([{
      player1: player1Choice,
      player2: player2Choice,
      result: result
    }])

    var gameResult = ''
    var gameResultText = ''

    if (player1Wins >= this.data.winsRequired) {
      gameResult = 'win'
      gameResultText = '玩家1胜利！'
    } else if (player2Wins >= this.data.winsRequired) {
      gameResult = 'lose'
      gameResultText = '玩家2胜利！'
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
      roundFinished: true,
      isAnimating: true,
      showConfetti: result !== 'draw',
      clashType: clashType,
      clashText: clashText,
      clashWinner: result === 'win' ? 1 : 2,
      brokenIcon: brokenIcon
    })

    // 如果游戏结束，保存记录
    if (gameResult) {
      var record = {
        gameType: 'rps',
        mode: 'classic',
        playMode: 'parentRandom',
        result: gameResult,
        score: rpsUtils.formatScore(player1Wins, player2Wins),
        duration: this.gameStartTime ? Math.floor((Date.now() - this.gameStartTime) / 1000) : 0,
        participants: [],
        rounds: roundHistory
      }
      rpsManager.saveGameRecord(record)
    }

    // 振动反馈
    if (result === 'win') {
      wx.vibrateShort({ type: 'medium' })
    } else if (result === 'lose') {
      wx.vibrateShort({ type: 'light' })
    }

    var that = this
    setTimeout(function() {
      that.setData({ isAnimating: false, showConfetti: false })
    }, 1500)
  },

  // 人机模式：玩家选择出拳
  aiPlayerChoice: function(e) {
    if (this.data.isAnimating) return

    var choice = e.currentTarget.dataset.choice
    var player2Choice = rpsManager.aiChoice(this.data.difficulty, this.data.roundHistory)

    this.setData({
      isAnimating: true,
      player1Choice: choice,
      player1Icon: rpsManager.CHOICE_ICONS[choice],
      player2Icon: '',
      roundResult: '',
      roundResultText: '',
      roundResultIcon: '',
      clashType: '',
      clashText: '',
      clashWinner: 0
    })

    // 倒计时动画
    this.startCountdown(choice, player2Choice)
  },

  startCountdown: function(player1Choice, player2Choice) {
    var that = this
    var count = 3

    that.setData({ countdown: count })

    // E1：倒计时句柄挂到 this，onUnload 统一清理（原为局部变量泄漏）
    this._countdownTimer = setInterval(function() {
      count--
      if (count > 0) {
        that.setData({ countdown: count })
      } else {
        clearInterval(this._countdownTimer)
        this._countdownTimer = null
        that.setData({ countdown: 0 })
        that.showResult(player1Choice, player2Choice)
      }
    }.bind(that), 800)
  },

  showResult: function(player1Choice, player2Choice) {
    var result = rpsManager.judge(player1Choice, player2Choice)
    var resultInfo = rpsUtils.formatResult(result)
    var clashType = rpsUtils.getClashType(player1Choice, player2Choice, result)
    var clashText = rpsUtils.getClashText(player1Choice, player2Choice, result)
    var brokenIcon = clashType ? rpsManager.BROKEN_IMAGE[result === 'win' ? player2Choice : player1Choice] : ''

    var player1Wins = this.data.player1Wins
    var player2Wins = this.data.player2Wins

    if (result === 'win') player1Wins++
    else if (result === 'lose') player2Wins++

    var roundHistory = this.data.roundHistory.concat([{
      player1: player1Choice,
      player2: player2Choice,
      result: result
    }])

    var gameResult = ''
    var gameResultText = ''

    if (player1Wins >= this.data.winsRequired) {
      gameResult = 'win'
      gameResultText = '恭喜胜利！'
    } else if (player2Wins >= this.data.winsRequired) {
      gameResult = 'lose'
      gameResultText = '再接再厉！'
    }

    // 根据模式设置正确的 phase
    var nextPhase = 'playing'
    if (this.data.playMode === 'parentRandom') {
      nextPhase = 'randomPlaying'
    }

    this.setData({
      player2Choice: player2Choice,
      player2Icon: rpsManager.CHOICE_ICONS[player2Choice],
      player1Wins: player1Wins,
      player2Wins: player2Wins,
      roundResult: result,
      roundResultText: clashText || resultInfo.text,
      roundResultIcon: resultInfo.icon,
      gameResult: gameResult,
      gameResultText: gameResultText,
      roundHistory: roundHistory,
      phase: nextPhase,
      showConfetti: result !== 'draw',
      scoreChanged: true,
      showShockwave: true,
      showScreenShake: true,
      showParticles: true,
      clashType: clashType,
      clashText: clashText,
      clashWinner: result === 'win' ? 1 : 2,
      brokenIcon: brokenIcon
    })

    // E2：整局结束立即保存人机模式战绩（原实现仅 endGame 按钮触发，
    // 点「再来一局」或直接返回均丢失整局记录）
    if (gameResult && !this._resultSaved) {
      this._resultSaved = true
      rpsManager.saveGameRecord({
        gameType: 'rps',
        mode: 'classic',
        playMode: 'ai',
        result: gameResult,
        score: rpsUtils.formatScore(this.data.player1Wins, this.data.player2Wins),
        duration: this.gameStartTime ? Math.floor((Date.now() - this.gameStartTime) / 1000) : 0,
        participants: [],
        rounds: roundHistory
      })
    }

    // 清除动画效果
    var that = this
    setTimeout(function() {
      that.setData({
        showShockwave: false,
        showScreenShake: false,
        showParticles: false
      })
    }, 600)

    // 振动反馈
    if (result === 'win') {
      wx.vibrateShort({ type: 'medium' })
    } else if (result === 'lose') {
      wx.vibrateShort({ type: 'light' })
    }

    var that = this
    setTimeout(function() {
      that.setData({ isAnimating: false, showConfetti: false, scoreChanged: false })
    }, 1500)
  },

  nextRound: function() {
    var nextPhase = 'playing'
    if (this.data.playMode === 'parent') {
      nextPhase = 'player1Select'
    } else if (this.data.playMode === 'parentRandom') {
      nextPhase = 'randomPlaying'
    }
    
    this.setData({
      phase: nextPhase,
      player1Choice: '',
      player2Choice: '',
      player1Icon: '',
      player2Icon: '',
      roundResult: '',
      roundResultText: '',
      roundResultIcon: '',
      gameResult: '',
      gameResultText: '',
      roundFinished: false,
      currentPlayer: 1,
      clashType: '',
      clashText: '',
      clashWinner: 0
    })
  },

  // 亲子随机模式：再玩一次
  playRandomAgain: function() {
    this.setData({
      player1Choice: '',
      player2Choice: '',
      player1Icon: '',
      player2Icon: '',
      roundResult: '',
      roundResultText: '',
      roundResultIcon: '',
      gameResult: '',
      gameResultText: '',
      roundFinished: false,
      currentPlayer: 1,
      clashType: '',
      clashText: '',
      clashWinner: 0
    })
  },

  endGame: function() {
    // E2：showResult 已即时保存；此处仅兜底（如极端情况下未保存）
    if (this.data.gameResult && this.data.playMode === 'ai' && !this._resultSaved) {
      this._resultSaved = true
      var record = {
        gameType: 'rps',
        mode: 'classic',
        playMode: 'ai',
        result: this.data.gameResult,
        score: rpsUtils.formatScore(this.data.player1Wins, this.data.player2Wins),
        duration: this.gameStartTime ? Math.floor((Date.now() - this.gameStartTime) / 1000) : 0,
        participants: [],
        rounds: this.data.roundHistory
      }
      rpsManager.saveGameRecord(record)
    }

    // 返回上一页
    wx.navigateBack()
  },

  playAgain: function() {
    this.startGame()
  },

  goBack: function() {
    wx.navigateBack()
  }
})
