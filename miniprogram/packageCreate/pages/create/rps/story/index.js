var rpsManager = require('../../../../utils/rps-manager.js')
var rpsUtils = require('../../../../utils/rps-utils.js')
var achievements = getApp().globalData.achievements
var beep = getApp().globalData.beep
var gameEconomy = require('../../../../utils/game-economy.js')

Page({
  data: {
    iconMap: rpsManager.ICON_TO_IMAGE,
    phase: 'intro', // intro, battle, victory, defeat, ending, shop
    currentChapter: 1,
    chapterInfo: null,
    player1Wins: 0,
    player2Wins: 0,
    coins: 0,
    items: [],
    playerItems: {},
    shopItems: [],
    storyProgress: null,
    battleHistory: [],
    player1Choice: '',
    player2Choice: '',
    player1Icon: '',
    player2Icon: '',
    roundResult: '',
    roundResultText: '',
    roundResultIcon: '',
    isAnimating: false,
    showConfetti: false,
    usedItems: [],
    clashType: '',
    clashText: '',
    clashWinner: 0,
    brokenIcon: ''
  },

  onLoad: function() {
    // 迁移旧金币数据
    gameEconomy.migrateOldCoins()
    this.loadStory()
  },

  loadStory: function() {
    var progress = rpsManager.getStoryProgress()
    var chapterIndex = progress.currentChapter - 1

    // 通关检测：所有章节完成后进入结局
    if (chapterIndex >= rpsManager.STORY_CHAPTERS.length) {
      this.setData({
        phase: 'ending',
        storyProgress: progress,
        coins: gameEconomy.getCoins(),
        playerItems: rpsManager.getPlayerItems()
      })
      return
    }

    var chapterInfo = rpsManager.STORY_CHAPTERS[chapterIndex]

    this.setData({
      storyProgress: progress,
      currentChapter: progress.currentChapter,
      chapterInfo: chapterInfo,
      coins: gameEconomy.getCoins(),
      items: progress.items,
      playerItems: rpsManager.getPlayerItems(),
      playerItemsList: this.buildPlayerItemsList(rpsManager.getPlayerItems())
    })
  },

  // 构建已拥有道具列表（WXML不支持Object.keys）
  buildPlayerItemsList: function(playerItems) {
    var list = []
    var shopItems = rpsManager.getStoryItems()
    for (var i = 0; i < shopItems.length; i++) {
      var item = shopItems[i]
      if (playerItems[item.id] && playerItems[item.id] > 0) {
        list.push({
          id: item.id,
          icon: item.icon,
          name: item.name,
          count: playerItems[item.id]
        })
      }
    }
    return list
  },

  // E14：回合开始前预生成 AI 出拳；持有透视镜时提前展示并消耗，
  // 使道具真正影响玩家的选择（原实现胜负已定后才提示，等于白买）
  _prepareNextRound: function() {
    var difficulty = this.data.chapterInfo ? this.data.chapterInfo.difficulty : 'normal'
    this._pendingAiChoice = rpsManager.aiChoice(difficulty, this.data.battleHistory)

    if (this.data.hasSpyGlass) {
      this.setData({ hasSpyGlass: false })
      rpsManager.useItem('spy_glass', this.data.storyProgress)
      wx.showToast({
        title: '🔮 预知：AI 将出「' + (rpsManager.CHOICE_NAMES[this._pendingAiChoice] || '?') + '」',
        icon: 'none',
        duration: 2000
      })
    }
  },

  startBattle: function() {
    beep.playBeep('start')

    // 检查拥有的道具
    var playerItems = rpsManager.getPlayerItems()

    this.setData({
      phase: 'battle',
      player1Wins: 0,
      player2Wins: 0,
      battleHistory: [],
      roundResult: '',
      player1Choice: '',
      player2Choice: '',
      player1Icon: '',
      player2Icon: '',
      hasLuckyCharm: (playerItems['lucky_charm'] || 0) > 0,
      hasSpyGlass: (playerItems['spy_glass'] || 0) > 0,
      hasSkipCard: (playerItems['skip'] || 0) > 0,
      hasShield: (playerItems['shield'] || 0) > 0,
      clashType: '',
      clashText: '',
      clashWinner: 0
    })

    // E14：预生成首回合 AI 出拳（含透视镜提示）
    this._prepareNextRound()
  },

  // 跳过卡效果：跳过一局算平局
  useSkipCard: function() {
    if (!this.data.hasSkipCard || this.data.isAnimating) return

    rpsManager.useItem('skip', this.data.storyProgress)

    var battleHistory = this.data.battleHistory.concat([{
      player1: 'skip',
      player2: 'skip',
      result: 'draw'
    }])

    this.setData({
      hasSkipCard: false,
      roundResult: 'draw',
      roundResultText: '跳过',
      roundResultIcon: '⏭️',
      battleHistory: battleHistory
    })

    beep.playBeep('tick')
    wx.vibrateShort({ type: 'light' })

    var that = this
    setTimeout(function() {
      that.setData({ roundResult: '' })
      // 检查是否需要继续
      if (that.data.player1Wins >= that.data.chapterInfo.winsRequired) {
        that.victory()
      } else if (that.data.player2Wins >= that.data.chapterInfo.winsRequired) {
        that.defeat()
      } else {
        // E14：为下一回合预生成 AI 出拳（含透视镜提示）
        that._prepareNextRound()
      }
    }, 1000)
  },

  // 护盾效果：失败时抵消一次
  useShieldEffect: function() {
    if (!this.data.hasShield) return false
    this.setData({ hasShield: false })
    rpsManager.useItem('shield', this.data.storyProgress)
    return true
  },

  playerChoice: function(e) {
    if (this.data.isAnimating) return

    var choice = e.currentTarget.dataset.choice
    var difficulty = this.data.chapterInfo.difficulty

    // 幸运符效果：AI使用随机策略（难度变化后需重新预生成 AI 出拳）
    if (this.data.hasLuckyCharm) {
      difficulty = 'simple'
      this.setData({ hasLuckyCharm: false })
      rpsManager.useItem('lucky_charm', this.data.storyProgress)
      this._pendingAiChoice = rpsManager.aiChoice(difficulty, this.data.battleHistory)
    }

    // E14：使用回合开始前预生成的 AI 出拳
    var aiChoice = this._pendingAiChoice || rpsManager.aiChoice(difficulty, this.data.battleHistory)
    var result = rpsManager.judge(choice, aiChoice)
    var resultInfo = rpsUtils.formatResult(result)
    var clashType = rpsUtils.getClashType(choice, aiChoice, result)
    var brokenIcon = clashType ? rpsManager.BROKEN_IMAGE[result === 'win' ? aiChoice : choice] : ''
    var clashText = rpsUtils.getClashText(choice, aiChoice, result)

    // 更新对战历史（用于AI学习）
    var battleHistory = this.data.battleHistory.concat([{
      player1: choice,
      player2: aiChoice,
      result: result
    }])

    var player1Wins = this.data.player1Wins
    var player2Wins = this.data.player2Wins

    if (result === 'win') player1Wins++
    else if (result === 'lose') player2Wins++

    // 第一步：双方手势亮相，清空上回合克制动画
    this.setData({
      isAnimating: true,
      player1Choice: choice,
      player2Choice: aiChoice,
      player1Icon: rpsManager.CHOICE_ICONS[choice],
      player2Icon: rpsManager.CHOICE_ICONS[aiChoice],
      roundResult: '',
      clashType: '',
      clashText: '',
      clashWinner: 0
    })

    beep.playBeep('rpsShoot')

    var that = this
    setTimeout(function() {
      // 第二步：克制对决爆发
      that.setData({
        player1Wins: player1Wins,
        player2Wins: player2Wins,
        roundResult: result,
        roundResultText: clashText || resultInfo.text,
        roundResultIcon: resultInfo.icon,
        battleHistory: battleHistory,
        clashType: clashType,
        clashText: clashText,
        clashWinner: result === 'win' ? 1 : 2,
        brokenIcon: brokenIcon
      })

      // 命中时刻的反馈
      if (result === 'win') {
        beep.playBeep('win')
        wx.vibrateShort({ type: 'medium' })
      } else if (result === 'lose') {
        beep.playBeep('lose')
        wx.vibrateShort({ type: 'light' })
      }
    }, 320)

    setTimeout(function() {
      that.setData({ isAnimating: false })

      // 检查是否达成胜利/失败条件
      if (player1Wins >= that.data.chapterInfo.winsRequired) {
        that.victory()
      } else if (player2Wins >= that.data.chapterInfo.winsRequired) {
        that.defeat()
      }
    }, 1100)
  },

  victory: function() {
    var progress = this.data.storyProgress
    var currentChapter = progress.currentChapter
    progress.defeatedEnemies.push(this.data.chapterInfo.enemy)
    progress.totalEnemiesDefeated++
    progress.currentChapter++

    // 使用统一金币系统
    var rewardCoins = this.data.chapterInfo.reward.coins
    gameEconomy.addCoins(rewardCoins, '故事模式第' + currentChapter + '章通关')

    // 检查是否通关所有章节
    var isEnding = progress.currentChapter > rpsManager.STORY_CHAPTERS.length

    if (isEnding) {
      // 通关结局：更新轮次，不再继续递增章节
      progress.storyRound = (progress.storyRound || 1) + 1
    }

    rpsManager.saveStoryProgress(progress)

    // 保存游戏记录
    var record = {
      gameType: 'rps',
      mode: 'story',
      playMode: 'ai',
      result: 'win',
      score: this.data.player1Wins + ' - ' + this.data.player2Wins,
      duration: 0,
      participants: [],
      rounds: this.data.battleHistory,
      chapter: currentChapter,
      enemy: this.data.chapterInfo.enemy
    }
    rpsManager.saveGameRecord(record)

    // 检查成就
    var newAchievements = achievements.checkAchievements()
    if (newAchievements.length > 0) {
      beep.playBeep('achievement')
    }

    beep.playBeep('complete')

    if (isEnding) {
      this.setData({
        phase: 'ending',
        coins: gameEconomy.getCoins(),
        showConfetti: true
      })
    } else {
      this.setData({
        phase: 'victory',
        coins: gameEconomy.getCoins(),
        showConfetti: true
      })
    }

    var that = this
    setTimeout(function() {
      that.setData({ showConfetti: false })
    }, 2000)
  },

  defeat: function() {
    // 护盾效果：失败时抵消，不扣失败次数
    if (this.useShieldEffect()) {
      beep.playBeep('tick')
      wx.showToast({ title: '🛡️ 护盾抵消了失败！', icon: 'none' })
      return
    }

    beep.playBeep('lose')
    wx.vibrateShort({ type: 'light' })
    this.setData({ phase: 'defeat' })
  },

  nextChapter: function() {
    this.loadStory()
    this.setData({ phase: 'intro' })
  },

  // 通关结局：再玩一轮
  restartStory: function() {
    var progress = this.data.storyProgress
    progress.currentChapter = 1
    progress.defeatedEnemies = []
    progress.totalEnemiesDefeated = 0
    rpsManager.saveStoryProgress(progress)

    this.loadStory()
    this.setData({ phase: 'intro', showConfetti: false })
  },

  retryBattle: function() {
    this.startBattle()
  },

  // 道具商店
  openShop: function() {
    var shopItems = rpsManager.getStoryItems()
    this.setData({
      phase: 'shop',
      shopItems: shopItems
    })
  },

  closeShop: function() {
    this.setData({ phase: 'intro' })
  },

  buyItem: function(e) {
    var itemId = e.currentTarget.dataset.id
    var result = rpsManager.buyItem(itemId)

    if (result.success) {
      beep.playBeep('complete')
      wx.showToast({ title: '购买成功！', icon: 'success' })
      this.setData({
        coins: gameEconomy.getCoins(),
        playerItems: rpsManager.getPlayerItems()
      })
    } else {
      wx.showToast({ title: result.msg, icon: 'none' })
    }
  },

  goBack: function() {
    wx.navigateBack()
  }
})
