Component({
  properties: {
    data: {
      type: Array,
      value: []
    },
    labels: {
      type: Array,
      value: []
    },
    title: {
      type: String,
      value: ''
    },
    type: {
      type: String,
      value: 'bar' // bar or line
    }
  },

  data: {
    canvasWidth: 300,
    canvasHeight: 200
  },

  lifetimes: {
    attached: function() {
      this.drawChart()
    }
  },

  observers: {
    'data': function() {
      this.drawChart()
    }
  },

  methods: {
    drawChart: function() {
      var query = this.createSelectorQuery()
      query.select('#chartCanvas')
        .fields({ node: true, size: true })
        .exec(function(res) {
          if (!res || !res[0]) return

          var canvas = res[0].node
          var ctx = canvas.getContext('2d')
          var width = res[0].width
          var height = res[0].height

          // 设置canvas尺寸
          var dpr = wx.getWindowInfo().pixelRatio || 2
          canvas.width = width * dpr
          canvas.height = height * dpr
          ctx.scale(dpr, dpr)

          this.setData({ canvasWidth: width, canvasHeight: height })

          // 清空画布
          ctx.clearRect(0, 0, width, height)

          var data = this.data.data || []
          var labels = this.data.labels || []

          if (data.length === 0) return

          // 绘制图表
          if (this.data.type === 'bar') {
            this.drawBarChart(ctx, width, height, data, labels)
          } else {
            this.drawLineChart(ctx, width, height, data, labels)
          }
        }.bind(this))
    },

    drawBarChart: function(ctx, width, height, data, labels) {
      var padding = { top: 20, right: 20, bottom: 40, left: 40 }
      var chartWidth = width - padding.left - padding.right
      var chartHeight = height - padding.top - padding.bottom

      var maxValue = Math.max.apply(null, data) || 1
      var barWidth = chartWidth / data.length * 0.8
      var barGap = chartWidth / data.length * 0.2

      // 绘制柱子
      var colors = ['#42A5F5', '#66BB6A', '#FFA726', '#EF5350', '#AB47BC', '#26C6DA', '#FF7043', '#8D6E63']
      for (var i = 0; i < data.length; i++) {
        var barHeight = (data[i] / maxValue) * chartHeight
        var x = padding.left + i * (barWidth + barGap) + barGap / 2
        var y = padding.top + chartHeight - barHeight

        ctx.fillStyle = colors[i % colors.length]
        ctx.fillRect(x, y, barWidth, barHeight)

        // 绘制标签
        if (labels[i]) {
          ctx.fillStyle = '#666'
          ctx.font = '10px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(labels[i], x + barWidth / 2, height - 10)
        }

        // 绘制数值
        ctx.fillStyle = '#333'
        ctx.font = 'bold 10px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText(data[i], x + barWidth / 2, y - 5)
      }
    },

    drawLineChart: function(ctx, width, height, data, labels) {
      var padding = { top: 20, right: 20, bottom: 40, left: 40 }
      var chartWidth = width - padding.left - padding.right
      var chartHeight = height - padding.top - padding.bottom

      var maxValue = Math.max.apply(null, data) || 1
      var stepX = chartWidth / (data.length - 1 || 1)

      // 绘制线条
      ctx.beginPath()
      ctx.strokeStyle = '#42A5F5'
      ctx.lineWidth = 2

      for (var i = 0; i < data.length; i++) {
        var x = padding.left + i * stepX
        var y = padding.top + chartHeight - (data[i] / maxValue) * chartHeight

        if (i === 0) {
          ctx.moveTo(x, y)
        } else {
          ctx.lineTo(x, y)
        }
      }
      ctx.stroke()

      // 绘制数据点
      for (var i = 0; i < data.length; i++) {
        var x = padding.left + i * stepX
        var y = padding.top + chartHeight - (data[i] / maxValue) * chartHeight

        ctx.beginPath()
        ctx.arc(x, y, 4, 0, Math.PI * 2)
        ctx.fillStyle = '#42A5F5'
        ctx.fill()

        // 绘制标签
        if (labels[i]) {
          ctx.fillStyle = '#666'
          ctx.font = '10px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText(labels[i], x, height - 10)
        }
      }
    }
  }
})
