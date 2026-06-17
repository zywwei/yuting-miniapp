Component({
  properties: {
    // 敌人信息：{ id, name, emoji, hp, currentHp, description }
    enemy: {
      type: Object,
      value: null
    },
    // 章节信息
    chapter: {
      type: Object,
      value: null
    },
    // 是否显示
    show: {
      type: Boolean,
      value: false
    },
    // 是否为胜利状态
    isVictory: {
      type: Boolean,
      value: false
    },
    // 造成的伤害（用于动画）
    damage: {
      type: Number,
      value: 0
    }
  },

  data: {
    showDamage: false,
    damageText: '',
    shakeEnemy: false,
    hpPercent: 100
  },

  observers: {
    'enemy.currentHp, enemy.hp': function(currentHp, hp) {
      if (hp > 0) {
        this.setData({
          hpPercent: Math.round((currentHp / hp) * 100)
        })
      }
    },
    'damage': function(damage) {
      if (damage > 0) {
        this.showDamageAnimation(damage)
      }
    }
  },

  methods: {
    // 显示伤害动画
    showDamageAnimation(damage) {
      this.setData({
        showDamage: true,
        damageText: `-${damage}`,
        shakeEnemy: true
      })

      // 震动反馈
      wx.vibrateShort({ type: 'medium' })

      setTimeout(() => {
        this.setData({
          shakeEnemy: false
        })
      }, 300)

      setTimeout(() => {
        this.setData({
          showDamage: false
        })
      }, 800)
    },

    // 点击敌人（彩蛋）
    onTapEnemy() {
      if (this.data.isVictory) return

      const taunts = [
        '嘿嘿，你打不到我！',
        '再来啊！',
        '牙齿是我的！',
        '你抓不到我~'
      ]
      const taunt = taunts[Math.floor(Math.random() * taunts.length)]

      this.setData({
        showDamage: true,
        damageText: taunt
      })

      setTimeout(() => {
        this.setData({ showDamage: false })
      }, 1200)

      this.triggerEvent('taunt', { text: taunt })
    },

    // 阻止冒泡
    noop() {}
  }
})
