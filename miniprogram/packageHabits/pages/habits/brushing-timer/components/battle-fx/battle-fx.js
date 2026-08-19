Component({
  options: {
    virtualHost: true,
    styleIsolation: 'apply-shared'
  },

  properties: {
    // 命中特效（常驻DOM，hidden 控制避免反复创建销毁——勿改为 wx:if）
    showAttackEffect: { type: Boolean, value: false },
    attackEffectX: { type: Number, value: 50 },
    attackEffectY: { type: Number, value: 50 },
    attackDamage: { type: Number, value: 0 },
    isCritical: { type: Boolean, value: false },
    explosionParticles: { type: Array, value: [] },
    // 斩击
    showSlash: { type: Boolean, value: false },
    slashClass: { type: String, value: '' },
    // 命中冲击环
    showHitRing: { type: Boolean, value: false },
    hitRingColor: { type: String, value: '#FF6B8A' },
    // 能量波
    showBeam: { type: Boolean, value: false },
    beamEmoji: { type: String, value: '💗' },
    trailAngle: { type: Number, value: 0 },
    toothbrushX: { type: Number, value: 15 },
    toothbrushY: { type: Number, value: 50 },
    // 攻击喝声
    showAttackCry: { type: Boolean, value: false },
    attackCryText: { type: String, value: '' },
    // 连击
    showCombo: { type: Boolean, value: false },
    comboText: { type: String, value: '' },
    // 皮肤颜色（页面 currentSkin.trailColor）
    skinTrailColor: { type: String, value: '' }
  }
})
