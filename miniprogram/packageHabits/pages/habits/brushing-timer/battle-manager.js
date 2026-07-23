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
      this._critAnimIndex = 0
      for (let i = this._critAnimCycle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [this._critAnimCycle[i], this._critAnimCycle[j]] = [this._critAnimCycle[j], this._critAnimCycle[i]]
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
    const isCritical = Math.random() < BATTLE_CONFIG.CRIT_RATE
    const comboCount = this.page.data.comboCount + 1
    const comboBonus = Math.min(comboCount * BATTLE_CONFIG.COMBO_BONUS_PER_HIT, BATTLE_CONFIG.COMBO_MAX_BONUS)

    const x = 30 + Math.random() * 40
    const y = 30 + Math.random() * 40

    const { currentEnemy, enemyCurrentHp, currentSkin } = this.page.data
    const skin = currentSkin || {}
    const enemyAngry = currentEnemy && (enemyCurrentHp / currentEnemy.hp) < BATTLE_CONFIG.ENEMY_ANGER_THRESHOLD

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
      const critParticleCount = 24
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
      showCriticalEffect: isCritical,
      critAnim,
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
      critFullscreenParticles
    })

    // 暴击时额外扣减敌人HP
    if (isCritical && currentEnemy && this.page.data.enemyCurrentHp > 0) {
      const critDamage = currentEnemy.hp * 0.08
      const newHp = Math.round(Math.max(0, this.page.data.enemyCurrentHp - critDamage) * 10) / 10
      const hpRatio = newHp / currentEnemy.hp
      const enemyScale = 0.5 + hpRatio * 0.8
      this.page.setData({
        enemyCurrentHp: newHp,
        enemyScale,
        isEnemyDefeated: newHp <= 0
      })

      // 暴击时怪物说威胁话语
      const taunts = hpRatio < 0.3 ? STORY_DIALOGUES.enemy_low_hp_taunt : STORY_DIALOGUES.enemy_crit_taunt
      const taunt = taunts[Math.floor(Math.random() * taunts.length)]

      if (this._tauntTimer) clearTimeout(this._tauntTimer)
      setTimeout(() => {
        this.page.setData({ showEnemyTaunt: true, enemyTauntText: taunt })
      }, 300)
      this._tauntTimer = setTimeout(() => {
        this.page.setData({ showEnemyTaunt: false })
      }, 2300)
    }

    wx.vibrateShort({ type: isCritical ? 'heavy' : 'medium' })

    // 清理旧定时器
    Object.values(this._attackTimers).forEach(t => clearTimeout(t))
    this._attackTimers = {}

    // 150ms: 斩击特效消失
    this._attackTimers[0] = setTimeout(() => {
      this.page.setData({ showSlash: false })
    }, 400)

    // 200ms: 能量波消失
    this._attackTimers[0.5] = setTimeout(() => {
      this.page.setData({ showBeam: false })
    }, 350)

    // 250ms后停止冲刺
    this._attackTimers[1] = setTimeout(() => {
      this.page.setData({ isDashing: false, showTrail: false })
    }, 250)

    // 300ms: 命中环消失 + 屏幕震动停止
    this._attackTimers[1.5] = setTimeout(() => {
      this.page.setData({ showHitRing: false, showScreenShake: false })
    }, 400)

    // 300ms后停止敌人震动并添加受击反应
    this._attackTimers[2] = setTimeout(() => {
      this.page.setData({ enemyShaking: false, enemyHitReact: true })
      setTimeout(() => this.page.setData({ enemyHitReact: false }), 300)
    }, 300)

    // 500ms后清除攻击特效
    this._attackTimers[3] = setTimeout(() => {
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
        this.page.setData({ showCriticalEffect: false, critFullscreenParticles: [] })
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
   * 触发敌人击败特效
   */
  triggerDefeatEffects() {
    this.page.setData({
      showDefeatFlash: true,
      showShockwave: true,
      showKoText: true
    })

    setTimeout(() => {
      this.page.setData({ showDefeatFlash: false })
    }, 300)

    setTimeout(() => {
      this.page.setData({ showShockwave: false })
    }, 500)

    setTimeout(() => {
      this.page.setData({ showKoText: false })
    }, 1500)

    // 生成碎片
    const { currentEnemy } = this.page.data
    if (currentEnemy) {
      const debris = []
      for (let i = 0; i < 8; i++) {
        debris.push({
          id: 'debris_' + i,
          emoji: currentEnemy.emoji,
          angle: (360 / 8) * i,
          delay: Math.random() * 0.2
        })
      }
      this.page.setData({ enemyDebris: debris })
      setTimeout(() => this.page.setData({ enemyDebris: [] }), 1000)
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
