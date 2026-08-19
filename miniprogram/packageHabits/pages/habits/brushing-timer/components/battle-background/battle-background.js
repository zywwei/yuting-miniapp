Component({
  options: {
    // virtualHost：不引入额外 DOM 层级，页面布局与拆分前一致
    virtualHost: true,
    // 页面样式继续命中组件内节点（皮肤 class 的后代选择器 .timer-container.skin-* .battle-aura 等）
    styleIsolation: 'apply-shared'
  },

  properties: {
    isRunning: { type: Boolean, value: false }
  }
})
