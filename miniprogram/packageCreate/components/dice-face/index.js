/**
 * 点阵骰子组件
 * 使用3x3网格渲染真实骰面圆点
 */

// 骰子点数对应的圆点坐标（3x3网格，0=无点，1=有点）
var DICE_DOTS = {
  1: [[0,0,0],[0,1,0],[0,0,0]],
  2: [[0,0,1],[0,0,0],[1,0,0]],
  3: [[0,0,1],[0,1,0],[1,0,0]],
  4: [[1,0,1],[0,0,0],[1,0,1]],
  5: [[1,0,1],[0,1,0],[1,0,1]],
  6: [[1,0,1],[1,0,1],[1,0,1]]
}

Component({
  properties: {
    // 骰子点数 1-6
    value: {
      type: Number,
      value: 1,
      observer: function(newVal) {
        this.updateDots(newVal)
      }
    },
    // 是否正在滚动
    rolling: {
      type: Boolean,
      value: false
    },
    // 骰子尺寸（rpx）
    size: {
      type: Number,
      value: 80
    }
  },

  data: {
    dots: DICE_DOTS[1],
    dotSize: 16
  },

  lifetimes: {
    attached: function() {
      this.updateDots(this.data.value)
      this.calcDotSize()
    }
  },

  methods: {
    updateDots: function(value) {
      var dots = DICE_DOTS[value] || DICE_DOTS[1]
      this.setData({ dots: dots })
    },

    calcDotSize: function() {
      // 圆点大小为骰子尺寸的约20%
      var dotSize = Math.floor(this.data.size * 0.2)
      this.setData({ dotSize: dotSize })
    }
  }
})
