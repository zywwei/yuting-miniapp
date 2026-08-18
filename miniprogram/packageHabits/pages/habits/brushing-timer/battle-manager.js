const { BATTLE_CONFIG, STORY_DIALOGUES, SLASH_EFFECTS } = require('./constants.js')

/**
 * 战斗系统管理器
 * 负责：攻击、暴击、连击、伤害计算、视觉效果
 */
class BattleManager {
  constructor(page) {
    this.page = page
    this._critAnimCycle = []
    this._critAnimIndex = 0
    this._comboTimer = null
    this._attackTimers = {}
    this._tauntTimer = null
    this._slashIndex = 0
  }

  /**
   * 初始化暴击动画轮转
   */
  initCritAnims() {
    this._critAnimCycle = BATTLE_CONFIG.CRIT_ENEMY_ANIMS.slice()
    for (let i = this._critAnimCycle.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this._critAnimCycle[i], this._critAnimCycle[j]] = [this._critAnimCycle[j], this._critAnimCycle[i]]
    }
    this._critAnimIndex = 0
  }

  /**
   * 获取下一个暴击动画
   */
  _nextCritAnim() {
    if (this._critAnimCycle.length === 0) this.initCritAnims()
    if (this._critAnimIndex >= this._critAnimCycle.length) {
      // 记录上一轮最后一个，避免新一轮第一个与它重复：
      // 连续两次暴击动画相同时 WXML class 不变，CSS 动画不会重播（敌人看起来没反应）
      const lastId = this._critAnimCycle[this._critAnimCycle.length - 1].id
      this._critAnimIndex = 0
      for (let i = this._critAnimCycle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this._critAnimCycle[i], this._critAnimCycle[j]] = [this._critAnimCycle[j], this._critAnimCycle[i]]
      }
      if (this._critAnimCycle.length > 1 && this._critAnimCycle[0].id === lastId) {
        const swapIdx = 1 + Math.floor(Math.random() * (this._critAnimCycle.length - 1));
        [this._critAnimCycle[0], this._critAnimCycle[swapIdx]] = [this._critAnimCycle[swapIdx], this._critAnimCycle[0]]
      }
    }
    return this._critAnimCycle[this._critAnimIndex++]
  }

  /**
   * 触发攻击动画（支持暴击、连击、皮肤专属特效、随机斩击）
   * @param {number} damage - 基础伤害
   * @returns {object} 攻击结果
   */
  triggerAttack(damage) {
    // 攻击序号：每次攻击递增，用于暴击全屏特效 nextTick 重建时的竞态防护
    this._attackSeq = (this._attackSeq || 0) + 1

    // 每次区域完成攻击都强制暴击（原 CRIT_RATE 15% 随机，孩子每刷完一个区域都该有强反馈）
    const isCritical = true
    const comboCount = this.page.data.comboCount + 1
    const comboBonus = Math.min(comboCount * BATTLE_CONFIG.COMBO_BONUS_PER_HIT, BATTLE_CONFIG.COMBO_MAX_BONUS)

    const x = 30 + Math.random() * 40
    const y = 30 + Math.random() * 40

    const { currentEnemy, enemyCurrentHp, currentSkin } = this.page.data
    const skin = currentSkin || {}

    const critAnim = isCritical
      ? BATTLE_CONFIG.CRIT_ANIMATIONS[Math.floor(Math.random() * BATTLE_CONFIG.CRIT_ANIMATIONS.length)]
      : null

    const critInfo = isCritical ? this._nextCritAnim() : null
    const critEnemyAnim = critInfo ? critInfo.id : ''
    const critName = critInfo ? critInfo.name : ''

    // 随机斩击动画（每次攻击随机一种）
    const slashEffect = SLASH_EFFECTS[Math.floor(Math.random() * SLASH_EFFECTS.length)]
    const slashClass = slashEffect.id

    const explosionParticles = []
    const particleCount = isCritical ? 16 : 8
    const defaultParticle = { particleEmoji: skin.particleEmoji || '💥', color: skin.trailColor || '#FF6B8A' }
    const anim = critAnim || defaultParticle
    for (let i = 0; i < particleCount; i++) {
      explosionParticles.push({
        id: 'p_' + i,
        type: isCritical ? 'crit' : 'normal',
        emoji: anim.particleEmoji,
        angle: (360 / particleCount) * i + Math.random() * 30,
        delay: Math.random() * 0.15,
        color: anim.color
      })
    }

    const trailAngle = Math.atan2(50 - this.page.data.toothbrushY, 50 - this.page.data.toothbrushX) * (180 / Math.PI)

    // 攻击喝声（皮肤专属）
    const attackCry = isCritical ? (skin.critCry || '暴击！') : (skin.attackCry || '嘿！')

    // 暴击全屏粒子（仅暴击时生成，非暴击给空数组）
    const critFullscreenParticles = []
    if (isCritical) {
      const critParticleCount = 12
      const critEmoji = skin.critParticle || anim.particleEmoji || '✨'
      const critColor = anim.color || skin.trailColor || '#FFD700'
      for (let i = 0; i < critParticleCount; i++) {
        critFullscreenParticles.push({
          id: 'cf_' + i,
          angle: (360 / critParticleCount) * i + Math.random() * 15,
          distance: 200 + Math.random() * 250,
          delay: Math.random() * 0.3,
          size: 40 + Math.random() * 40,
          color: critColor,
          emoji: critEmoji
        })
      }
    }

    // HP 只由主计时器按时间公式扣减（单一数据源），攻击仅做视觉表现；
    // 此处再扣血会被下一秒的时间公式覆盖，表现为 HP 条"回血"
    const enemyAngry = currentEnemy && (enemyCurrentHp / currentEnemy.hp) < BATTLE_CONFIG.ENEMY_ANGER_THRESHOLD

    this.page.setData({
      enemyShaking: true,
      isDashing: true,
      showAttackEffect: true,
      showTrail: true,
      attackEffectX: x,
      attackEffectY: y,
      attackDamage: damage,
      isCritical,
      isCriticalHit: isCritical,
      comboCount,
      showCombo: comboCount > 1,
      comboText: comboCount > 1 ? `${comboCount}连击！` : '',
      enemyAngry,
      explosionParticles,
      trailAngle,
      showCriticalEffect: false,  // 暴击全屏特效统一先关闭，由下方 nextTick 重建（保证动画重播）
      critAnim: null,
      critEnemyAnim,
      critName,
      // 新增特效
      showSlash: true,
      slashClass: slashClass,
      showHitRing: true,
      hitRingColor: skin.hitRingColor || '#FF6B8A',
      showBeam: true,
      beamEmoji: skin.beamEmoji || '💗',
      showAttackCry: true,
      attackCryText: attackCry,
      showScreenShake: true,
      critFullscreenParticles: [],
      // HP/enemyScale/isEnemyDefeated 不在此更新，统一由主计时器维护
    })

    // 暴击全屏特效：先销毁再于下一帧重建。
    // 若直接 setData(true)，当上次特效因故未被清理（连续暴击、重置残留等）时
    // wx:if 条件不变、节点不重建，已播完的 CSS 动画（forwards 定格 opacity:0）不会重播，
    // 表现为"有些暴击不触发全屏"。nextTick 强制销毁-重建可覆盖所有时序。
    if (isCritical) {
      const seq = this._attackSeq
      wx.nextTick(() => {
        // 期间若又发生了新攻击（含最后一击与 completeTimer 的毫秒级双攻击），以最新一次为准
        if (seq !== this._attackSeq || !this.page.data.isCritical) return
        this.page.setData({ showCriticalEffect: true, critAnim, critFullscreenParticles })
      })
    }

    // 暴击时怪物说威胁话语
    if (isCritical && currentEnemy && enemyCurrentHp > 0) {
      const hpRatio = enemyCurrentHp / currentEnemy.hp
      const taunts = hpRatio < 0.3 ? STORY_DIALOGUES.enemy_low_hp_taunt : STORY_DIALOGUES.enemy_crit_taunt
      const taunt = taunts[Math.floor(Math.random() * taunts.length)]

      // 显示和隐藏都登记到 _tauntTimer，destroy() 可统一清理，避免页面销毁后 setData
      if (this._tauntTimer) clearTimeout(this._tauntTimer)
      this._tauntTimer = setTimeout(() => {
        this.page.setData({ showEnemyTaunt: true, enemyTauntText: taunt })
        this._tauntTimer = setTimeout(() => {
          this.page.setData({ showEnemyTaunt: false })
        }, 2000)
      }, 300)
    }

    wx.vibrateShort({ type: isCritical ? 'heavy' : 'medium' })

    // 清理旧定时器
    Object.values(this._attackTimers).forEach(t => clearTimeout(t))
    this._attackTimers = {}

    // 250ms后停止冲刺
    this._attackTimers[0] = setTimeout(() => {
      this.page.setData({ isDashing: false, showTrail: false })
    }, 250)

    // 300ms后停止敌人震动并添加受击反应
    this._attackTimers[1] = setTimeout(() => {
      this.page.setData({ enemyShaking: false, enemyHitReact: true })
      // 受击反应复位也登记到 _attackTimers，destroy() 时可一并清理
      this._attackTimers.hitReact = setTimeout(() => this.page.setData({ enemyHitReact: false }), 300)
    }, 300)

    // 350ms: 能量波消失
    this._attackTimers[2] = setTimeout(() => {
      this.page.setData({ showBeam: false })
    }, 350)

    // 400ms: 斩击+命中环+屏幕震动一起清理（合并为一次setData）
    this._attackTimers[3] = setTimeout(() => {
      this.page.setData({ showSlash: false, showHitRing: false, showScreenShake: false })
    }, 400)

    // 600ms后清除攻击特效
    this._attackTimers[4] = setTimeout(() => {
      this.page.setData({
        showAttackEffect: false,
        isCritical: false,
        isCriticalHit: false,
        critEnemyAnim: '',
        critName: '',
        showAttackCry: false
      })
    }, 600)

    // 1秒后隐藏暴击特效
    if (isCritical) {
      this._attackTimers[4] = setTimeout(() => {
        this.page.setData({ showCriticalEffect: false, critAnim: null, critFullscreenParticles: [] })
      }, 1000)
    }

    // 重置连击计时器
    if (this._comboTimer) clearTimeout(this._comboTimer)
    this._comboTimer = setTimeout(() => {
      this.page.setData({ comboCount: 0, showCombo: false })
    }, BATTLE_CONFIG.COMBO_TIMEOUT)

    return {
      isCritical,
      comboCount,
      comboBonus,
      critName
    }
  }

  /**
   * 清理所有定时器
   */
  destroy() {
    Object.values(this._attackTimers).forEach(t => clearTimeout(t))
    if (this._comboTimer) clearTimeout(this._comboTimer)
    if (this._tauntTimer) clearTimeout(this._tauntTimer)
  }
}

module.exports = BattleManager
