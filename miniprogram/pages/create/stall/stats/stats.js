var stallManager = require('../../../../utils/stall-manager.js')

Page({
  data: {
    stats: {},
    avgOrder: '¥0',
    posterPath: ''
  },

  onLoad: function() {
    this.loadData()
  },

  onShow: function() {
    this.loadData()
  },

  loadData: function() {
    var stats = stallManager.getStats()

    // Calculate average order value
    var avgOrder = stats.totalOrders > 0 ? Math.round(stats.totalRevenue / stats.totalOrders) : 0

    // Calculate percentages for top products
    var maxRevenue = 0
    for (var i = 0; i < stats.topProducts.length; i++) {
      if (stats.topProducts[i].revenue > maxRevenue) {
        maxRevenue = stats.topProducts[i].revenue
      }
    }
    for (var i = 0; i < stats.topProducts.length; i++) {
      stats.topProducts[i].percent = maxRevenue > 0 ? Math.round(stats.topProducts[i].revenue / maxRevenue * 100) : 0
    }

    this.setData({
      stats: stats,
      avgOrder: '¥' + avgOrder
    })
  },

  generatePoster: function() {
    var that = this
    wx.showLoading({ title: '生成中...' })

    var query = this.createSelectorQuery()
    query.select('#posterCanvas').fields({ node: true, size: true }).exec(function(res) {
      if (!res || !res[0] || !res[0].node) {
        wx.hideLoading()
        wx.showToast({ title: '生成失败', icon: 'none' })
        return
      }

      var canvas = res[0].node
      var ctx = canvas.getContext('2d')
      var dpr = wx.getSystemInfoSync().pixelRatio
      var width = 300
      var height = 400

      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)

      // Background
      var gradient = ctx.createLinearGradient(0, 0, 0, height)
      gradient.addColorStop(0, '#FF6B8A')
      gradient.addColorStop(1, '#FF9AAB')
      ctx.fillStyle = gradient
      ctx.fillRect(0, 0, width, height)

      // White card
      ctx.fillStyle = '#fff'
      ctx.beginPath()
      ctx.roundRect(20, 20, width - 40, height - 40, 16)
      ctx.fill()

      // Title
      ctx.fillStyle = '#FF6B8A'
      ctx.font = 'bold 18px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('🏪 我的小铺 - 营业报告', width / 2, 60)

      // Stats
      var stats = that.data.stats
      ctx.fillStyle = '#333'
      ctx.font = 'bold 14px sans-serif'
      ctx.textAlign = 'left'

      var y = 100
      ctx.fillText('累计销售额：¥' + stats.totalRevenue, 40, y)
      y += 30
      ctx.fillText('累计利润：¥' + stats.totalProfit, 40, y)
      y += 30
      ctx.fillText('总订单数：' + stats.totalOrders, 40, y)
      y += 30
      ctx.fillText('今日销售额：¥' + stats.todayRevenue, 40, y)
      y += 30
      ctx.fillText('今日订单：' + stats.todayOrders, 40, y)

      // Top products
      if (stats.topProducts && stats.topProducts.length > 0) {
        y += 20
        ctx.fillStyle = '#FF6B8A'
        ctx.font = 'bold 14px sans-serif'
        ctx.fillText('🏆 热销商品 Top5', 40, y)

        ctx.fillStyle = '#666'
        ctx.font = '12px sans-serif'
        for (var i = 0; i < Math.min(5, stats.topProducts.length); i++) {
          y += 25
          var p = stats.topProducts[i]
          ctx.fillText((i + 1) + '. ' + p.name + '  x' + p.quantity + '  ¥' + p.revenue, 50, y)
        }
      }

      // Footer
      ctx.fillStyle = '#999'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('钰婷成长小助手', width / 2, height - 35)

      // Convert to image
      setTimeout(function() {
        wx.canvasToTempFilePath({
          canvas: canvas,
          success: function(res) {
            that.setData({ posterPath: res.tempFilePath })
            wx.hideLoading()
          },
          fail: function(err) {
            console.warn('生成海报失败:', err)
            wx.hideLoading()
            wx.showToast({ title: '生成失败', icon: 'none' })
          }
        })
      }, 100)
    })
  },

  closePoster: function() {
    this.setData({ posterPath: '' })
  },

  savePoster: function() {
    var that = this
    if (!this.data.posterPath) return

    wx.saveImageToPhotosAlbum({
      filePath: this.data.posterPath,
      success: function() {
        wx.showToast({ title: '已保存到相册', icon: 'success' })
        that.closePoster()
      },
      fail: function(err) {
        if (err.errMsg.indexOf('auth deny') >= 0 || err.errMsg.indexOf('authorize') >= 0) {
          wx.showModal({
            title: '需要授权',
            content: '请在设置中允许保存图片到相册',
            success: function(res) {
              if (res.confirm) {
                wx.openSetting()
              }
            }
          })
        }
      }
    })
  },

  sharePoster: function() {
    // 分享到好友
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage']
    })
  },

  onShareAppMessage: function() {
    return {
      title: '🏪 我的小铺 - 营业报告',
      path: '/pages/create/stall/stats/stats',
      imageUrl: this.data.posterPath || ''
    }
  }
})
