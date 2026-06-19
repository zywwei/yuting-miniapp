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

    var avgOrder = stats.totalOrders > 0 ? Math.round(stats.totalRevenue / stats.totalOrders) : 0

    var maxRevenue = 0
    for (var i = 0; i < stats.topProducts.length; i++) {
      if (stats.topProducts[i].revenue > maxRevenue) {
        maxRevenue = stats.topProducts[i].revenue
      }
    }
    for (var i = 0; i < stats.topProducts.length; i++) {
      stats.topProducts[i].percent = maxRevenue > 0 ? Math.round(stats.topProducts[i].revenue / maxRevenue * 100) : 0
    }

    var profitMargin = stats.totalRevenue > 0 ? Math.round(stats.totalProfit / stats.totalRevenue * 100) : 0
    var dailySales = this.getDailySales(sales, this.data.currentTab)
    var categoryStats = this.getCategoryStats(sales, products)

    this.setData({
      stats: stats,
      avgOrder: '¥' + avgOrder,
      profitMargin: profitMargin,
      dailySales: dailySales,
      categoryStats: categoryStats
    })

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

      ctx.clearRect(0, 0, width, height)

      if (!dailySales || dailySales.length === 0) return

      var maxVal = 0
      dailySales.forEach(function(d) {
        if (d.revenue > maxVal) maxVal = d.revenue
      })
      // Round up to nice number with dynamic adjustment
      if (maxVal <= 0) {
        maxVal = 10
      } else {
        var magnitude = Math.pow(10, Math.floor(Math.log10(maxVal)))
        var normalized = maxVal / magnitude
        if (normalized <= 1) maxVal = magnitude
        else if (normalized <= 2) maxVal = magnitude * 2
        else if (normalized <= 5) maxVal = magnitude * 5
        else maxVal = magnitude * 10
      }

      var padding = { top: 20, right: 10, bottom: 30, left: 40 }
      var chartW = width - padding.left - padding.right
      var chartH = height - padding.top - padding.bottom
      var barW = chartW / dailySales.length * 0.6
      var gap = chartW / dailySales.length * 0.4

      // Draw grid lines
      ctx.strokeStyle = '#e0e0e0'
      ctx.lineWidth = 0.5
      for (var i = 0; i <= 4; i++) {
        var gy = padding.top + chartH * (1 - i / 4)
        ctx.beginPath()
        ctx.setLineDash([3, 3])
        ctx.moveTo(padding.left, gy)
        ctx.lineTo(width - padding.right, gy)
        ctx.stroke()
        ctx.setLineDash([])

        var labelVal = maxVal * i / 4
        var labelText = labelVal >= 1000 ? (labelVal / 1000).toFixed(1) + 'k' : Math.round(labelVal)
        ctx.fillStyle = '#bbb'
        ctx.font = '9px sans-serif'
        ctx.textAlign = 'right'
        ctx.fillText('¥' + labelText, padding.left - 5, gy + 3)
      }

      // Draw bars
      for (var i = 0; i < dailySales.length; i++) {
        var d = dailySales[i]
        var barH = (d.revenue / maxVal) * chartH
        var x = padding.left + (chartW / dailySales.length) * i + gap / 2
        var y = padding.top + chartH - barH

        var gradient = ctx.createLinearGradient(x, y, x, y + barH)
        gradient.addColorStop(0, '#FF6B8A')
        gradient.addColorStop(1, '#FF9AAB')
        ctx.fillStyle = gradient

        // Draw bar without roundRect
        ctx.beginPath()
        ctx.moveTo(x, y)
        ctx.lineTo(x + barW, y)
        ctx.lineTo(x + barW, y + barH)
        ctx.lineTo(x, y + barH)
        ctx.fill()

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
      var width = 375
      var height = 667

      canvas.width = width * dpr
      canvas.height = height * dpr
      ctx.scale(dpr, dpr)

      var stats = that.data.stats
      var categoryStats = that.data.categoryStats

      // Background gradient
      var bgGradient = ctx.createLinearGradient(0, 0, 0, height)
      bgGradient.addColorStop(0, '#FF6B8A')
      bgGradient.addColorStop(0.3, '#FF9AAB')
      bgGradient.addColorStop(1, '#FFB6C1')
      ctx.fillStyle = bgGradient
      ctx.fillRect(0, 0, width, height)

      // White card
      ctx.fillStyle = '#fff'
      roundRect(ctx, 16, 16, width - 32, height - 32, 20)
      ctx.fill()

      // Title
      ctx.fillStyle = '#FF6B8A'
      ctx.font = 'bold 24px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('🏪 营业报告', width / 2, 60)

      // Date
      ctx.fillStyle = '#999'
      ctx.font = '13px sans-serif'
      var today = new Date()
      ctx.fillText(today.getFullYear() + '年' + (today.getMonth() + 1) + '月' + today.getDate() + '日', width / 2, 82)

      // Divider
      ctx.strokeStyle = '#f0f0f0'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(30, 95)
      ctx.lineTo(width - 30, 95)
      ctx.stroke()

      // Stats cards - row 1
      var cardY = 110
      var cardH = 70
      var cardGap = 10
      var cardW = (width - 52) / 3

      // Revenue card
      ctx.fillStyle = '#FFF5F7'
      roundRect(ctx, 16, cardY, cardW, cardH, 10)
      ctx.fill()
      ctx.fillStyle = '#FF6B8A'
      ctx.font = 'bold 22px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('¥' + stats.totalRevenue, 16 + cardW / 2, cardY + 30)
      ctx.fillStyle = '#999'
      ctx.font = '11px sans-serif'
      ctx.fillText('累计销售', 16 + cardW / 2, cardY + 52)

      // Profit card
      ctx.fillStyle = '#E8F5E9'
      roundRect(ctx, 16 + cardW + cardGap, cardY, cardW, cardH, 10)
      ctx.fill()
      ctx.fillStyle = '#4CAF50'
      ctx.font = 'bold 22px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('¥' + stats.totalProfit, 16 + cardW + cardGap + cardW / 2, cardY + 30)
      ctx.fillStyle = '#999'
      ctx.font = '11px sans-serif'
      ctx.fillText('累计利润', 16 + cardW + cardGap + cardW / 2, cardY + 52)

      // Orders card
      ctx.fillStyle = '#E3F2FD'
      roundRect(ctx, 16 + (cardW + cardGap) * 2, cardY, cardW, cardH, 10)
      ctx.fill()
      ctx.fillStyle = '#2196F3'
      ctx.font = 'bold 22px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(stats.totalOrders + '', 16 + (cardW + cardGap) * 2 + cardW / 2, cardY + 30)
      ctx.fillStyle = '#999'
      ctx.font = '11px sans-serif'
      ctx.fillText('总订单', 16 + (cardW + cardGap) * 2 + cardW / 2, cardY + 52)

      // Stats cards - row 2
      var cardY2 = cardY + cardH + 12

      // Streak card
      ctx.fillStyle = '#FFF3E0'
      roundRect(ctx, 16, cardY2, cardW, cardH, 10)
      ctx.fill()
      ctx.fillStyle = '#FF9800'
      ctx.font = 'bold 22px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(stats.streakDays + '天', 16 + cardW / 2, cardY2 + 30)
      ctx.fillStyle = '#999'
      ctx.font = '11px sans-serif'
      ctx.fillText('连续营业', 16 + cardW / 2, cardY2 + 52)

      // Level card
      ctx.fillStyle = '#F3E5F5'
      roundRect(ctx, 16 + cardW + cardGap, cardY2, cardW, cardH, 10)
      ctx.fill()
      ctx.fillStyle = '#9C27B0'
      ctx.font = 'bold 22px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('Lv.' + stats.level, 16 + cardW + cardGap + cardW / 2, cardY2 + 30)
      ctx.fillStyle = '#999'
      ctx.font = '11px sans-serif'
      ctx.fillText('摊位等级', 16 + cardW + cardGap + cardW / 2, cardY2 + 52)

      // Avg order card
      ctx.fillStyle = '#E0F2F1'
      roundRect(ctx, 16 + (cardW + cardGap) * 2, cardY2, cardW, cardH, 10)
      ctx.fill()
      ctx.fillStyle = '#009688'
      ctx.font = 'bold 22px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('¥' + that.data.avgOrder.replace('¥', ''), 16 + (cardW + cardGap) * 2 + cardW / 2, cardY2 + 30)
      ctx.fillStyle = '#999'
      ctx.font = '11px sans-serif'
      ctx.fillText('平均客单价', 16 + (cardW + cardGap) * 2 + cardW / 2, cardY2 + 52)

      // Divider 2
      var divY = cardY2 + cardH + 20
      ctx.strokeStyle = '#f0f0f0'
      ctx.beginPath()
      ctx.moveTo(30, divY)
      ctx.lineTo(width - 30, divY)
      ctx.stroke()

      // Today section
      var todayY = divY + 25
      ctx.fillStyle = '#333'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('📅 今日概况', 28, todayY)

      var todayCardY = todayY + 15
      var todayCardW = (width - 52) / 2

      ctx.fillStyle = '#FFF5F7'
      roundRect(ctx, 16, todayCardY, todayCardW, 50, 8)
      ctx.fill()
      ctx.fillStyle = '#FF6B8A'
      ctx.font = 'bold 20px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('¥' + stats.todayRevenue, 16 + todayCardW / 2, todayCardY + 25)
      ctx.fillStyle = '#999'
      ctx.font = '10px sans-serif'
      ctx.fillText('今日销售额', 16 + todayCardW / 2, todayCardY + 42)

      ctx.fillStyle = '#E3F2FD'
      roundRect(ctx, 16 + todayCardW + 10, todayCardY, todayCardW, 50, 8)
      ctx.fill()
      ctx.fillStyle = '#2196F3'
      ctx.font = 'bold 20px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText(stats.todayOrders + '', 16 + todayCardW + 10 + todayCardW / 2, todayCardY + 25)
      ctx.fillStyle = '#999'
      ctx.font = '10px sans-serif'
      ctx.fillText('今日订单', 16 + todayCardW + 10 + todayCardW / 2, todayCardY + 42)

      // Divider 3
      var div2Y = todayCardY + 65
      ctx.strokeStyle = '#f0f0f0'
      ctx.beginPath()
      ctx.moveTo(30, div2Y)
      ctx.lineTo(width - 30, div2Y)
      ctx.stroke()

      // Top products
      var topY = div2Y + 25
      ctx.fillStyle = '#333'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('🏆 热销商品 Top5', 28, topY)

      if (stats.topProducts && stats.topProducts.length > 0) {
        for (var i = 0; i < Math.min(5, stats.topProducts.length); i++) {
          topY += 28
          var p = stats.topProducts[i]

          // Rank circle
          ctx.fillStyle = i === 0 ? '#FF6B8A' : i === 1 ? '#FF9800' : i === 2 ? '#FFC107' : '#E0E0E0'
          ctx.beginPath()
          ctx.arc(38, topY - 4, 10, 0, Math.PI * 2)
          ctx.fill()
          ctx.fillStyle = '#fff'
          ctx.font = 'bold 10px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText((i + 1) + '', 38, topY)

          // Product name
          ctx.fillStyle = '#333'
          ctx.font = '13px sans-serif'
          ctx.textAlign = 'left'
          ctx.fillText(p.name, 55, topY)

          // Revenue
          ctx.fillStyle = '#FF6B8A'
          ctx.font = 'bold 13px sans-serif'
          ctx.textAlign = 'right'
          ctx.fillText('¥' + p.revenue, width - 28, topY)

          // Progress bar
          var barX = 55
          var barY2 = topY + 6
          var barW2 = width - 83 - 60
          var barH2 = 4
          ctx.fillStyle = '#f0f0f0'
          ctx.beginPath()
          ctx.moveTo(barX, barY2)
          ctx.lineTo(barX + barW2, barY2)
          ctx.lineTo(barX + barW2, barY2 + barH2)
          ctx.lineTo(barX, barY2 + barH2)
          ctx.fill()

          var progressW = barW2 * (p.percent / 100)
          ctx.fillStyle = '#FF6B8A'
          ctx.beginPath()
          ctx.moveTo(barX, barY2)
          ctx.lineTo(barX + progressW, barY2)
          ctx.lineTo(barX + progressW, barY2 + barH2)
          ctx.lineTo(barX, barY2 + barH2)
          ctx.fill()
        }
      } else {
        topY += 30
        ctx.fillStyle = '#999'
        ctx.font = '12px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('暂无销售数据', width / 2, topY)
      }

      // Divider 4
      var div3Y = topY + 35
      ctx.strokeStyle = '#f0f0f0'
      ctx.beginPath()
      ctx.moveTo(30, div3Y)
      ctx.lineTo(width - 30, div3Y)
      ctx.stroke()

      // Category stats
      var catY = div3Y + 25
      ctx.fillStyle = '#333'
      ctx.font = 'bold 16px sans-serif'
      ctx.textAlign = 'left'
      ctx.fillText('📦 分类统计', 28, catY)

      if (categoryStats && categoryStats.length > 0) {
        for (var i = 0; i < Math.min(5, categoryStats.length); i++) {
          catY += 28
          var c = categoryStats[i]

          ctx.fillStyle = '#333'
          ctx.font = '12px sans-serif'
          ctx.textAlign = 'left'
          ctx.fillText(c.name, 28, catY)

          // Bar
          var barX = 90
          var barW3 = width - 180
          ctx.fillStyle = '#f0f0f0'
          ctx.beginPath()
          ctx.moveTo(barX, catY - 5)
          ctx.lineTo(barX + barW3, catY - 5)
          ctx.lineTo(barX + barW3, catY - 1)
          ctx.lineTo(barX, catY - 1)
          ctx.fill()

          var progressW = barW3 * (c.percent / 100)
          ctx.fillStyle = '#4CAF50'
          ctx.beginPath()
          ctx.moveTo(barX, catY - 5)
          ctx.lineTo(barX + progressW, catY - 5)
          ctx.lineTo(barX + progressW, catY - 1)
          ctx.lineTo(barX, catY - 1)
          ctx.fill()

          ctx.fillStyle = '#FF6B8A'
          ctx.font = 'bold 11px sans-serif'
          ctx.textAlign = 'right'
          ctx.fillText('¥' + c.revenue, width - 28, catY)
        }
      }

      // Footer
      ctx.fillStyle = '#ccc'
      ctx.font = '10px sans-serif'
      ctx.textAlign = 'center'
      ctx.fillText('— 钰婷成长小助手 —', width / 2, height - 30)

      // Convert to image
      setTimeout(function() {
        try {
          wx.canvasToTempFilePath({
            canvas: canvas,
            destWidth: width * 2,
            destHeight: height * 2,
            success: function(res) {
              that.setData({ posterPath: res.tempFilePath })
              wx.hideLoading()
            },
            fail: function(err) {
              console.warn('生成海报失败:', err)
              wx.hideLoading()
              wx.showToast({ title: '生成失败', icon: 'none', duration: 2000 })
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
    var that = this
    wx.shareAppMessage({
      title: '🏪 我的小铺 - 营业报告',
      path: '/pages/create/stall/stats/stats',
      imageUrl: that.data.posterPath || '',
      success: function() {
        wx.showToast({ title: '分享成功', icon: 'success' })
        that.closePoster()
      },
      fail: function(err) {
        console.warn('分享失败:', err)
      }
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
