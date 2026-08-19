Component({
  options: {
    virtualHost: true,
    styleIsolation: 'apply-shared'
  },

  properties: {
    // 页面 showCriticalEffect（battle-manager 通过先关后开的 nextTick 重建本组件以重播动画）
    show: { type: Boolean, value: false },
    // 暴击动画配置 { color, emoji, name }（页面 critAnim）
    anim: { type: Object, value: null },
    // 页面 currentSkin.glowColor
    glowColor: { type: String, value: '' },
    particles: { type: Array, value: [] }
  }
})
