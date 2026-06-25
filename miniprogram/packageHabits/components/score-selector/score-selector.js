const SCORE_LABELS = ['加油哦', '还不错', '很好', '非常好', '超级棒！']

Component({
  properties: {
    value: { type: Number, value: 5 },
    showLabel: { type: Boolean, value: true },
    size: { type: String, value: 'normal' }
  },

  data: {
    scoreLabel: '超级棒！'
  },

  observers: {
    'value': function(val) {
      this.setData({
        scoreLabel: SCORE_LABELS[Math.min(val - 1, 4)] || '超级棒！'
      })
    }
  },

  methods: {
    selectScore(e) {
      const score = e.currentTarget.dataset.score
      this.triggerEvent('change', { score })
    }
  }
})
