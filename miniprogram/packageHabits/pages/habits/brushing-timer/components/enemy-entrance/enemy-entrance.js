Component({
  options: {
    virtualHost: true,
    styleIsolation: 'apply-shared'
  },

  properties: {
    // 出场动画阶段 0=无 1=暗幕 2=VS 3=怪物碑落 4=名字展示
    phase: { type: Number, value: 0 },
    // 出场动画类名（随机）
    animClass: { type: String, value: '' },
    enemy: { type: Object, value: null }
  }
})
