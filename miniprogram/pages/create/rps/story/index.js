var rpsManager = require('../../../../utils/rps-manager.js')

Page({
  data: {
    phase: 'intro', // intro, battle, victory, defeat
    currentChapter: 1,
    chapterInfo: null,
    player1Wins: 0,
    player2Wins: 0,
    coins: 0,
    items: [],
    storyProgress: null
  },

  onLoad: function() {
    this.loadStory()
  },

  loadStory: function() {
    var progress = rpsManager.getStoryProgress()
    var chapterInfo = rpsManager.STORY_CHAPTERS[progress.currentChapter - 1]

    this.setData({
      storyProgress: progress,
      currentChapter: progress.currentChapter,
      chapterInfo: chapterInfo,
      coins: progress.coins,
      items: progress.items
    })
  },

  startBattle: function() {
    this.setData({
      phase: 'battle',
      player1Wins: 0,
      player2Wins: 0
    })
  },

  playerChoice: function(e) {
    var choice = e.currentTarget.dataset.choice
    var aiChoice = rpsManager.aiChoice(this.data.chapterInfo.difficulty, [])
    var result = rpsManager.judge(choice, aiChoice)

    var player1Wins = this.data.player1Wins
    var player2Wins = this.data.player2Wins

    if (result === 'win') player1Wins++
    else if (result === 'lose') player2Wins++

    this.setData({
      player1Wins: player1Wins,
      player2Wins: player2Wins
    })

    if (player1Wins >= this.data.chapterInfo.winsRequired) {
      this.victory()
    } else if (player2Wins >= this.data.chapterInfo.winsRequired) {
      this.defeat()
    }
  },

  victory: function() {
    var progress = this.data.storyProgress
    progress.coins += this.data.chapterInfo.reward.coins
    progress.defeatedEnemies.push(this.data.chapterInfo.enemy)
    progress.totalEnemiesDefeated++
    progress.currentChapter++
    rpsManager.saveStoryProgress(progress)

    this.setData({
      phase: 'victory',
      coins: progress.coins
    })
  },

  defeat: function() {
    this.setData({ phase: 'defeat' })
  },

  nextChapter: function() {
    this.loadStory()
    this.setData({ phase: 'intro' })
  },

  retryBattle: function() {
    this.startBattle()
  },

  goBack: function() {
    wx.navigateBack()
  }
})
