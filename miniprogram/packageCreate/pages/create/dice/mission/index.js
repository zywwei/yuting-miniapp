var diceManager = require('/packageCreate/utils/dice-manager.js')
var achievements = require('/utils/achievements.js')
var beep = require('/utils/beep.js')

Page({
  data: {
    phase: 'ready', // ready, rolling, task, done
    currentDice: 0,
    currentTask: null,
    isRolling: false,
    completedMissions: [],
    totalMissions: 30,
    completionRate: 0
  },

  onLoad: function() {
    this.loadMissions()
  },

  onShow: function() {
    this.loadMissions()
  },

  loadMissions: function() {
    var completedMissions = diceManager.getCompletedMissions()
    var completionRate = Math.round((completedMissions.length / this.data.totalMissions) * 100)

    this.setData({
      completedMissions: completedMissions,
      completionRate: completionRate
    })
  },

  rollDice: function() {
    if (this.data.isRolling) return

    this.setData({ isRolling: true, phase: 'rolling' })

    var that = this

    beep.playBeep('diceRoll')

    // 摇骰子动画
    var rollCount = 0
    var rollInterval = setInterval(function() {
      var tempDice = Math.floor(Math.random() * 6) + 1
      that.setData({ currentDice: tempDice })

      rollCount++
      if (rollCount >= 10) {
        clearInterval(rollInterval)
        beep.playBeep('diceSettle')

        // 最终结果
        var finalDice = Math.floor(Math.random() * 6) + 1
        var task = diceManager.getTaskByDice(finalDice)

        that.setData({
          currentDice: finalDice,
          currentTask: task,
          phase: 'task',
          isRolling: false
        })

        wx.vibrateShort({ type: 'medium' })
      }
    }, 100)
  },

  completeTask: function() {
    if (!this.data.currentTask) return

    var completedMissions = diceManager.completeMission(this.data.currentTask.id)
    var completionRate = Math.round((completedMissions.length / this.data.totalMissions) * 100)

    beep.playBeep('complete')

    this.setData({
      completedMissions: completedMissions,
      completionRate: completionRate,
      phase: 'done'
    })

    // 检查成就
    var newAchievements = achievements.checkAchievements()
    if (newAchievements.length > 0) {
      beep.playBeep('achievement')
    }

    wx.showToast({
      title: '任务完成！',
      icon: 'success'
    })
  },

  skipTask: function() {
    this.setData({
      phase: 'ready',
      currentTask: null,
      currentDice: 0
    })
  },

  playAgain: function() {
    this.setData({
      phase: 'ready',
      currentTask: null,
      currentDice: 0
    })
  },

  goBack: function() {
    wx.navigateBack()
  }
})
