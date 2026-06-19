var stallManager = require('../../../../utils/stall-manager.js')

Page({
  data: {
    stats: {},
    avgOrder: '¥0',
    posterPath: '',
    currentTab: 'week',
    dailySales: [],
    categoryStats: [],
    profitMargin: 0
  },

  onLoad: function() {
    this.loadData()
  },

  onShow: function() {
    this.loadData()
  },

  loadData: function() {
    var stats = stallManager.getStats()
    var sales = stallManager.getSales()
    var products = stallManager.getProducts()

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

    // Calculate profit margin
    var profitMargin = stats.totalRevenue > 0 ? Math.round(stats.totalProfit / stats.totalRevenue * 100) : 0

    // Get daily sales data
    var dailySales = this.getDailySales(sales, this.data.currentTab)

    // Get category stats
    var categoryStats = this.getCategoryStats(sales, products)

    this.setData({
      stats: stats,
      avgOrder: '¥' + avgOrder,
      profitMargin: profitMargin,
      dailySales: dailySales,
      categoryStats: categoryStats
    })

    // Draw chart after data is set
    setTimeout(function() {
      this.drawSalesChart(dailySales)
    }.bind(this), 100)
  },

  switchTab: function(e) {
    var tab = e.currentTarget.dataset.tab
    this.setData({ currentTab: tab })
    var sales = stallManager.getSales()
    var dailySales = this.getDailySales(sales, tab)
    this.setData({ dailySales: dailySales })
    setTimeout(function() {
      this.drawSalesChart(dailySales)
    }.bind(this), 100)
  },

  getDailySales: function(sales, tab) {
    var days = tab === 'week' ? 7 : 30
    var result = []
    var today = new Date()

    for (var i = days - 1; i >= 0; i--) {
      var d = new Date(today)
      d.setDate(d.getDate() - i)
      var dateStr = this.formatDate(d)
      var daySales = sales.filter(function(s) { return s.date === dateStr })
      var revenue = daySales.reduce(function(sum, s) { return sum + (s.total || 0) }, 0)
      var orders = daySales.length

      result.push({
        date: dateStr,
        label: (d.getMonth() + 1) + '/' + d.getDate(),
        revenue: revenue,
        orders: orders
      })
    }

    return result
  },

  getCategoryStats: function(sales, products) {
    var categories = {}
    var productMap = {}
    products.forEach(function(p) { productMap[p.id] = p })

    sales.forEach(function(sale) {
      sale.items.forEach(function(item) {
        var product = productMap[item.productId]
        var category = product ? product.category : '其他'
        if (!categories[category]) {
          categories[category] = { name: category, revenue: 0, quantity: 0 }
        }
        categories[category].revenue += item.subtotal || 0
        categories[category].quantity += item.quantity || 0
      })
    })

    var result = Object.values(categories).sort(function(a, b) { return b.revenue - a.revenue })
    var maxRev = result.length > 0 ? result[0].revenue : 1
    result.forEach(function(c) {
      c.percent = Math.round(c.revenue / maxRev * 100)
    })

    return result
  },

  drawSalesChart: function(dailySales) {
    var query = this.createSelectorQuery()
    query.select('#salesChart').fields({ node: true, size: true }).exec(function(res) {
      if (!res || !res[0] || !res[0].node) return

      var canvas = res[0].node
      var ctx = canvas.getContext('2d')
      var dpr = wx.getSystemInfoSync().pixelRatio
      var width = res[0].width || 300
      var height = res[0].height || 150

      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)

      // Clear
      ctx.clearRect(0, 0, width, height)

      if (!dailySales || dailySales.length === 0) return

      var maxVal = 0
      dailySales.forEach(function(d) {
        if (d.revenue > maxVal) maxVal = d.revenue
      })
      if (maxVal === 0) maxVal = 1

      var padding = { top: 20, right: 10, bottom: 30, left: 40 }
      var chartW = width - padding.left - padding.right
      var chartH = height - padding.top - padding.bottom
      var barW = chartW / dailySales.length * 0.6
      var gap = chartW / dailySales.length * 0.4

      // Draw grid lines
      ctx.strokeStyle = '#f0f0f0'
      ctx.lineWidth = 1
      for (var i = 0; i <= 4; i++) {
        var gy = padding.top + chartH * (1 - i / 4)
        ctx.beginPath()
        ctx.moveTo(padding.left, gy)
        ctx.lineTo(width - padding.right, gy)
        ctx.stroke()

        // Y axis labels
        ctx.fillStyle = '#999'
        ctx.font = '10px sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText('¥' + Math.round(maxVal * i / 4), padding.left - 5, gy + 3)
      }

      // Draw bars
      for (var i = 0; i < dailySales.length; i++) {
        var d = dailySales[i]
        var barH = (d.revenue / maxVal) * chartH
        var x = padding.left + (chartW / dailySales.length) * i + gap / 2
        var y = padding.top + chartH - barH

        // Bar gradient
        var gradient = ctx.createLinearGradient(x, y, x, y + barH)
        gradient.addColorStop(0, '#FF6B8A')
        gradient.addColorStop(1, '#FF9AAB')
        ctx.fillStyle = gradient

        // Draw rounded bar
        ctx.beginPath()
        var radius = Math.min(barW / 2, 4)
        ctx.moveTo(x + radius, y)
        ctx.lineTo(x + barW - radius, y)
        ctx.quadraticCurveTo(x + barW, y, x + barW, y + radius)
        ctx.lineTo(x + barW, y + barH)
        ctx.lineTo(x, y + barH)
        ctx.lineTo(x, y + radius)
        ctx.quadraticCurveTo(x, y, x + radius, y)
        ctx.fill()

        // X axis labels (show every other for readability)
        if (dailySales.length <= 7 || i % 2 === 0) {
          ctx.fillStyle = '#999'
          ctx.font = '10px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(d.label, x + barW / 2, height - 10)
        }
      }
    })
  },

  formatDate: function(date) {
    var y = date.getFullYear()
    var m = String(date.getMonth() + 1).padStart(2, '0')
    var d = String(date.getDate()).padStart(2, '0')
    return y + '-' + m + '-' + d
  },

  generatePoster: function() {
    var that = this
    wx.showLoading({ title: '生成中...' })

    // 绘制圆角矩形
    function roundRect(ctx, x, y, w, h, r) {
      ctx.beginPath()
      ctx.moveTo(x + r, y)
      ctx.lineTo(x + w - r, y)
      ctx.arcTo(x + w, y, x + w, y + r, r)
      ctx.lineTo(x + w, y + h - r)
      ctx.arcTo(x + w, y + h, x + w - r, y + h, r)
      ctx.lineTo(x + r, y + h)
      ctx.arcTo(x, y + h, x, y + h - r, r)
      ctx.lineTo(x, y + r)
      ctx.arcTo(x, y, x + r, y, r)
      ctx.closePath()
    }

    var query = this.createSelectorQuery()
    query.select('#posterCanvas').fields({ node: true, size: true }).exec(function(res) {
      if (!res || !res[0] || !res[0].node) {
        wx.hideLoading()
        wx.showToast({ title: '获取画布失败', icon: 'none' })
        return
      }

      var canvas = res[0].node
      var ctx = canvas.getContext('2d')
      var dpr = wx.getSystemInfoSync().pixelRatio
      var width = 300
      var height = 500

      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)

      // Background gradient
      var bgGradient = ctx.createLinearGradient(0, 0, 0, height)
      bgGradient.addColorStop(0, '#FF6B8A')
      bgGradient.addColorStop(1, '#FFB6C1')
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, width, height)

      // White card
      ctx.fillStyle = '#fff'
      roundRect(ctx, 16, 16, width - 32, height - 32, 16)
      ctx.fill()

      // Title
      ctx.fillStyle = '#FF6B8A'
      ctx.font = 'bold 20px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('🏪 营业报告', width / 2, 55)

      // Date
      ctx.fillStyle = '#999'
      ctx.font = '12px sans-serif'
      var today = new Date()
      ctx.fillText(today.getFullYear() + '年' + (today.getMonth() + 1) + '月' + today.getDate() + '日', width / 2, 75)

      // Stats cards
      var stats = that.data.stats
      var cardY = 95
      var cardH = 55
      var cardGap = 8
      var cardW = (width - 48) / 3

      // Revenue card
      ctx.fillStyle = '#FFF5F7'
      roundRect(ctx, 16, cardY, cardW, cardH, 8)
      ctx.fill()
      ctx.fillStyle = '#FF6B8A'
      ctx.font = 'bold 18px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('¥' + stats.totalRevenue, 16 + cardW / 2, cardY + 25)
      ctx.fillStyle = '#999'
      ctx.font = '10px sans-serif'
      ctx.fillText('累计销售', 16 + cardW / 2, cardY + 45)

      // Profit card
      ctx.fillStyle = '#E8F5E9'
      roundRect(ctx, 16 + cardW + cardGap, cardY, cardW, cardH, 8)
      ctx.fill()
      ctx.fillStyle = '#4CAF50'
      ctx.font = 'bold 18px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('¥' + stats.totalProfit, 16 + cardW + cardGap + cardW / 2, cardY + 25)
      ctx.fillStyle = '#999'
      ctx.font = '10px sans-serif'
      ctx.fillText('累计利润', 16 + cardW + cardGap + cardW / 2, cardY + 45)

      // Orders card
      ctx.fillStyle = '#E3F2FD'
      roundRect(ctx, 16 + (cardW + cardGap) * 2, cardY, cardW, cardH, 8)
      ctx.fill()
      ctx.fillStyle = '#2196F3'
      ctx.font = 'bold 18px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(stats.totalOrders + '', 16 + (cardW + cardGap) * 2 + cardW / 2, cardY + 25)
      ctx.fillStyle = '#999'
      ctx.font = '10px sans-serif'
      ctx.fillText('总订单', 16 + (cardW + cardGap) * 2 + cardW / 2, cardY + 45)

      // Top products
      if (stats.topProducts && stats.topProducts.length > 0) {
        var topY = cardY + cardH + 25
        ctx.fillStyle = '#333'
        ctx.font = 'bold 14px sans-serif'
        ctx.textAlign = 'left'
        ctx.fillText('🏆 热销商品', 28, topY)

        for (var i = 0; i < Math.min(5, stats.topProducts.length); i++) {
          topY += 25
          var p = stats.topProducts[i]
          ctx.fillStyle = '#FF6B8A'
          ctx.font = 'bold 12px sans-serif'
          ctx.fillText((i + 1) + '', 28, topY)
          ctx.fillStyle = '#333'
          ctx.font = '12px sans-serif'
          ctx.fillText(p.name, 45, topY)
          ctx.fillStyle = '#FF6B8A'
          ctx.textAlign = 'right'
          ctx.fillText('¥' + p.revenue, width - 28, topY)
          ctx.textAlign = 'left'
        }
      }

      // Footer
      ctx.fillStyle = '#ccc'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('— 钰婷成长小助手 —', width / 2, height - 28)

      // Convert to image
      setTimeout(function() {
        try {
          wx.canvasToTempFilePath({
            canvas: canvas,
            success: function(res) {
              that.setData({ posterPath: res.tempFilePath })
              wx.hideLoading()
            },
            fail: function(err) {
              console.warn('生成海报失败:', err)
              wx.hideLoading()
              wx.showToast({ title: '生成失败: ' + (err.errMsg || ''), icon: 'none', duration: 2000 })
            }
          })
        } catch (e) {
          console.warn('canvasToTempFilePath异常:', e)
          wx.hideLoading()
          wx.showToast({ title: '生成异常', icon: 'none' })
        }
      }, 300)
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
