var beep = getApp().globalData.beep
var childStorage = getApp().globalData.childStorage
var gameEconomy = require('../../../../utils/game-economy.js')

// 转盘符号
var SYMBOLS = ['🍒', '🍋', '🍊', '🔔', '⭐', '7️⃣']
var SYMBOL_NAMES = ['樱桃', '柠檬', '橙子', '铃铛', '星星', '7']

// 赔率表
var PAYOUTS = {
  '7️⃣7️⃣7️⃣': { multiplier: 50, name: '超级大奖' },
  '⭐⭐⭐': { multiplier: 20, name: '大奖' },
  '🔔🔔🔔': { multiplier: 10, name: '中奖' },
  '🍒🍒🍒': { multiplier: 5, name: '小奖' },
  '🍋🍋🍋': { multiplier: 5, name: '小奖' },
  '🍊🍊🍊': { multiplier: 5, name: '小奖' }
}

// 理论概率（简化）
var THEORY_PROBS = {
  three_same: '2.78%',  // 1/36
  two_same: '41.67%',   // 15/36
  all_diff: '55.56%'    // 20/36
}

Page({
  data: {
    phase: 'ready', // ready, spinning, result
    reels: ['🍒', '🍋', '🍊'],
    isSpinning: false,
    spinCount: 0,
    betAmount: 10,
    balance: 0,
    lastResult: null,
    lastWin: 0,
    showWin: false,
    // 统计
    totalSpins: 0,
    totalWin: 0,
    threeSameCount: 0,
    twoSameCount: 0,
    allDiffCount: 0,
    threeSameRate: '0.0'
  },

  onLoad: function() {
    this.loadBalance()
    this.loadStats()
    this.spinTimer = null
  },

  onUnload: function() {
    // E7：动画进行中退出——按预生成结果立即结算，避免押注被白扣
    if (this.data.isSpinning && this._pendingFinalReels) {
      var result = this.calculateResult(this._pendingFinalReels)
      if (result.winAmount > 0) {
        gameEconomy.addCoins(result.winAmount, '抽奖中奖（退出结算）')
      }
      var stats = childStorage.get('diceSlots') || {}
      stats.totalSpins = (stats.totalSpins || 0) + 1
      stats.totalWin = (stats.totalWin || 0) + result.winAmount
      if (result.type === 'three_same') stats.threeSameCount = (stats.threeSameCount || 0) + 1
      else if (result.type === 'two_same') stats.twoSameCount = (stats.twoSameCount || 0) + 1
      else if (result.type === 'all_diff') stats.allDiffCount = (stats.allDiffCount || 0) + 1
      childStorage.set('diceSlots', stats)
      this._pendingFinalReels = null
    }

    // 清理定时器
    if (this.spinTimer) {
      clearInterval(this.spinTimer)
      this.spinTimer = null
    }
  },

  loadBalance: function() {
    this.setData({ balance: gameEconomy.getCoins() })
  },

  loadStats: function() {
    var stats = childStorage.get('diceSlots') || {}
    this.setData({
      totalSpins: stats.totalSpins || 0,
      totalWin: stats.totalWin || 0,
      threeSameCount: stats.threeSameCount || 0,
      twoSameCount: stats.twoSameCount || 0,
      allDiffCount: stats.allDiffCount || 0
    })
  },

  saveStats: function() {
    var stats = {
      totalSpins: this.data.totalSpins,
      totalWin: this.data.totalWin,
      threeSameCount: this.data.threeSameCount,
      twoSameCount: this.data.twoSameCount,
      allDiffCount: this.data.allDiffCount
    }
    childStorage.set('diceSlots', stats)
  },

  selectBet: function(e) {
    var amount = parseInt(e.currentTarget.dataset.amount)
    this.setData({ betAmount: amount })
  },

  spin: function() {
    if (this.data.isSpinning) return
    if (!gameEconomy.canAfford(this.data.betAmount)) {
      wx.showToast({ title: '金币不足！', icon: 'none' })
      return
    }

    // 扣除赌注
    gameEconomy.spendCoins(this.data.betAmount, '抽奖押注')
    var balance = gameEconomy.getCoins()

    // E7：预先确定最终结果——中途退出（onUnload）时可据此即时结算，
    // 避免押注已扣而结果永不产生
    var pendingFinal = []
    for (var p = 0; p < 3; p++) {
      pendingFinal.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
    }
    this._pendingFinalReels = pendingFinal
    this._pendingBet = this.data.betAmount

    this.setData({
      isSpinning: true,
      phase: 'spinning',
      balance: balance,
      showWin: false
    })

    beep.playBeep('diceRoll')

    var that = this
    var spinCount = 0

    // 转盘动画
    this.spinTimer = setInterval(function() {
      var reels = []
      for (var i = 0; i < 3; i++) {
        reels.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
      }
      that.setData({ reels: reels })

      spinCount++
      if (spinCount >= 15) {
        clearInterval(that.spinTimer)
        that.spinTimer = null

        // 最终结果（spin 时已预生成，中途退出也可据此结算）
        var finalReels = that._pendingFinalReels
        if (!finalReels || finalReels.length < 3) {
          finalReels = []
          for (var p = 0; p < 3; p++) {
            finalReels.push(SYMBOLS[Math.floor(Math.random() * SYMBOLS.length)])
          }
        }

        // 计算奖励
        var result = that.calculateResult(finalReels)

        beep.playBeep('diceSettle')

        that.setData({
          reels: finalReels,
          isSpinning: false,
          phase: 'result',
          lastResult: result,
          lastWin: result.winAmount,
          showWin: result.winAmount > 0,
          balance: balance + result.winAmount,
          totalSpins: that.data.totalSpins + 1,
          totalWin: that.data.totalWin + result.winAmount,
          threeSameCount: that.data.threeSameCount + (result.type === 'three_same' ? 1 : 0),
          twoSameCount: that.data.twoSameCount + (result.type === 'two_same' ? 1 : 0),
          allDiffCount: that.data.allDiffCount + (result.type === 'all_diff' ? 1 : 0),
          threeSameRate: that.calcThreeSameRate(that.data.threeSameCount + (result.type === 'three_same' ? 1 : 0), that.data.totalSpins + 1)
        })

        // 更新金币（使用统一金币系统）
        if (result.winAmount > 0) {
          gameEconomy.addCoins(result.winAmount, '抽奖中奖')
          var newBalance = gameEconomy.getCoins()
          that.setData({ balance: newBalance })

          beep.playBeep('win')
          wx.vibrateShort({ type: 'medium' })
        } else {
          beep.playBeep('lose')
        }

        that.saveStats()

        // E7：本轮已结算，清除待结算标记
        that._pendingFinalReels = null
        that._pendingBet = null
      }
    }, 100)
  },

  calculateResult: function(reels) {
    var s1 = reels[0], s2 = reels[1], s3 = reels[2]
    var key = s1 + s2 + s3

    // 三个相同
    if (s1 === s2 && s2 === s3) {
      var payout = PAYOUTS[key]
      if (payout) {
        return {
          type: 'three_same',
          name: payout.name,
          multiplier: payout.multiplier,
          winAmount: this.data.betAmount * payout.multiplier
        }
      }
      return {
        type: 'three_same',
        name: '中奖',
        multiplier: 3,
        winAmount: this.data.betAmount * 3
      }
    }

    // 两个相同
    if (s1 === s2 || s2 === s3 || s1 === s3) {
      return {
        type: 'two_same',
        name: '小奖',
        multiplier: 2,
        winAmount: this.data.betAmount * 2
      }
    }

    // 全不同
    return {
      type: 'all_diff',
      name: '未中奖',
      multiplier: 0,
      winAmount: 0
    }
  },

  continuePlay: function() {
    this.setData({
      phase: 'ready',
      showWin: false
    })
  },

  getTheoryProb: function() {
    return THEORY_PROBS
  },

  // WXML不支持.toFixed()，在JS中预计算
  calcThreeSameRate: function(count, total) {
    if (total === 0) return '0.0'
    return (count / total * 100).toFixed(1)
  },

  goBack: function() {
    wx.navigateBack()
  }
})
