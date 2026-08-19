Component({
  options: {
    virtualHost: true,
    styleIsolation: 'apply-shared'
  },

  properties: {
    // 奖励星星布尔数组 [true, false, ...]
    stars: { type: Array, value: [] },
    // 当前奖励文案
    text: { type: String, value: '' }
  }
})
