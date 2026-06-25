var rpsManager = require('../../../../utils/rps-manager.js')
var rpsUtils = require('../../../../utils/rps-utils.js')
var achievements = getApp().globalData.achievements
var beep = getApp().globalData.beep
var gameEconomy = require('../../../../utils/game-economy.js')

Page({
  data: {
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
    usedItems: []
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
      hasShield: (playerItems['shield'] || 0) > 0
    })
  },

  // 跳过卡效果：跳过一局算平局
  useSkipCard: function() {
    if (!this.data.hasSkipCard || this.data.isAnimating) return

    rpsManager.useItem('skip', this.data.storyProgress)

    var roundHistory = this.data.roundHistory.concat([{
      player1: 'skip',
      player2: 'skip',
      result: 'draw'
    }])

    this.setData({
      hasSkipCard: false,
      roundResult: 'draw',
      roundResultText: '跳过',
      roundResultIcon: '⏭️',
      roundHistory: roundHistory
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

    // 幸运符效果：AI使用随机策略
    if (this.data.hasLuckyCharm) {
      difficulty = 'simple'
      this.setData({ hasLuckyCharm: false })
      rpsManager.useItem('lucky_charm', this.data.storyProgress)
    }

    var aiChoice = rpsManager.aiChoice(difficulty, this.data.battleHistory)
    var result = rpsManager.judge(choice, aiChoice)
    var resultInfo = rpsUtils.formatResult(result)

    // 透视镜效果：显示AI出拳提示
    if (this.data.hasSpyGlass) {
      wx.showToast({ title: 'AI出了' + rpsManager.CHOICE_NAMES[aiChoice], icon: 'none', duration: 1500 })
      this.setData({ hasSpyGlass: false })
      rpsManager.useItem('spy_glass', this.data.storyProgress)
    }

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

    this.setData({
      isAnimating: true,
      player1Choice: choice,
      player2Choice: aiChoice,
      player1Icon: rpsManager.CHOICE_ICONS[choice],
      player2Icon: rpsManager.CHOICE_ICONS[aiChoice],
      player1Wins: player1Wins,
      player2Wins: player2Wins,
      roundResult: result,
      roundResultText: resultInfo.text,
      roundResultIcon: resultInfo.icon,
      battleHistory: battleHistory
    })

    // 音效
    beep.playBeep('rpsShoot')

    var that = this
    setTimeout(function() {
      that.setData({ isAnimating: false })

      // 音效反馈
      if (result === 'win') {
        beep.playBeep('win')
        wx.vibrateShort({ type: 'medium' })
      } else if (result === 'lose') {
        beep.playBeep('lose')
        wx.vibrateShort({ type: 'light' })
      }

      // 检查是否达成胜利/失败条件
      if (player1Wins >= that.data.chapterInfo.winsRequired) {
        that.victory()
      } else if (player2Wins >= that.data.chapterInfo.winsRequired) {
        that.defeat()
      }
    }, 800)
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
