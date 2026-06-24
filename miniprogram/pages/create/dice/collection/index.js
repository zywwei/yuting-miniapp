Page({
  data: {
    games: [
      {
        id: 'flight',
        name: '飞行棋',
        icon: '✈️',
        desc: '经典飞行棋，掷骰前进',
        url: '/pages/create/dice/flight/index',
        status: 'available'
      },
      {
        id: 'monopoly',
        name: '大富翁',
        icon: '🏠',
        desc: '买地收租，成为首富',
        url: '/pages/create/dice/monopoly/index',
        status: 'coming_soon'
      }
    ]
  },

  goGame: function(e) {
    var game = e.currentTarget.dataset.game
    if (game.status === 'coming_soon') {
      wx.showToast({
        title: '即将推出，敬请期待！',
        icon: 'none'
      })
      return
    }
    wx.navigateTo({ url: game.url })
  },

  goBack: function() {
    wx.navigateBack()
  }
})
