const util = require('/utils/util.js')
const audio = require('/utils/audio.js')
const beep = require('/utils/beep.js')
const cloud = require('/utils/cloud.js')
const achievements = require('/utils/achievements.js')
const { getNavBarInfo } = require('/utils/page-helpers.js')
const {
  BRUSH_AREAS, BRUSHING_TIPS, THEMES, REWARD_TEXTS, getCompletedTexts,
  CHEER_LEFT, CHEER_RIGHT, RING_MODES, BUBBLE_LIST, PRE_GERM_TYPES,
  STICKERS, GIRL_BUBBLES, ZONE_GERM_TYPES, CHAPTERS, BATTLE_CONFIG,
  PRINCESS_CHEER, getOrSelectTodayChapter
} = require('./constants.js')
const StoryManager = require('./story-manager.js')
const BattleManager = require('./battle-manager.js')

Page({
  data: {
    statusBarHeight: 20,
    capsuleRight: 80,
    round: 1,
    timeOfDay: 'morning',
    remainingTime: 120,
    minutes: '02',
    seconds: '00',
    isRunning: false,
    isPaused: false,
    isCompleted: false,
    overallProgress: 0,
    ringColor: '#FF9AAB',
    selectedDuration: 120,
    // 区域
    currentAreaIndex: 0,
    currentArea: BRUSH_AREAS[0],
    teethArea: BRUSH_AREAS,
    completedAreas: [],
    areaRemaining: 20,
    areaColor: BRUSH_AREAS[0].color,
    // 泡泡
    bubbles: BUBBLE_LIST,
    // 动物加油
    leftCheer: '加油',
    rightCheer: '好棒',
    // 奖励
    rewardStars: [false, false, false, false, false],
    currentRewardText: '准备开始！',
    // 完成
    completedStarsArr: [],
    completedText: '',
    confetti: [],
    soundEnabled: true,
    // 主题
    themeBg: THEMES.morning.bg,
    // 积分
    brushPoints: 0,
    lastBrushPoints: 0,
    showPoints: false,
    pointsText: '',
    // 牙齿6区可视化（左上/上中/右上/左下/下中/右下）
    toothZones: [],
    // 刷牙小游戏（保留给刷牙前/后使用，刷牙中不再出现）
    stage: 'pre',
    dirtySpots: [],
    showCleanEffect: false,
    cleanEffectText: '',
    cleanEffectX: 50,
    cleanEffectY: 50,
    totalDirtyCleaned: 0,
    // 刷牙后贴纸
    stickers: STICKERS,
    placedStickers: [],
    showStickerPicker: false,
    // 拍照相关
    photos: [],
    // ===== 主线故事系统 =====
    currentChapter: null,      // 当前章节信息
    currentEnemy: null,        // 当前敌人信息
    enemyCurrentHp: 6,         // 敌人当前HP（从 storage 同步）
    enemyScale: 1.3,           // 敌人缩放比例（随HP降低而缩小）
    showStoryDialog: false,    // 是否显示故事对话
    storyDialogues: [],        // 故事对话内容
    showEnemyCard: false,      // 是否显示敌人卡片
    isEnemyDefeated: false,    // 敌人是否被击败
    showVictoryDialog: false,  // 是否显示胜利对话
    victoryDialogues: [],      // 胜利对话内容
    storyExpGained: 0,         // 故事获得的经验
    // 战斗动画相关
    enemyShaking: false,       // 敌人是否在震动
    enemyHitReact: false,      // 敌人受击反应
    showAttackEffect: false,   // 是否显示攻击特效
    attackEffectX: 50,         // 攻击特效X位置
    attackEffectY: 50,         // 攻击特效Y位置
    attackDamage: 0,           // 攻击伤害值
    // 暴击和连击系统
    isCritical: false,         // 是否暴击
    comboCount: 0,             // 连击计数
    showCombo: false,          // 是否显示连击
    comboText: '',             // 连击文字
    enemyAngry: false,         // 敌人是否愤怒
    // 牙刷位置（根据区域动态变化）
    toothbrushX: 15,           // 牙刷X位置（百分比）
    toothbrushY: 50,           // 牙刷Y位置（百分比）
    toothbrushRotation: 0,     // 牙刷旋转角度
    // 小怪物系统
    minions: [],               // 当前小怪物列表
    showMinions: false,        // 是否显示小怪物
    defeatedMinions: 0,        // 已消灭小怪物数量
    totalMinions: 0,           // 总小怪物数量
    minionDefeatEffect: null,  // 小怪物消灭特效
    // 新增动画状态
    isDashing: false,          // 牙刷是否在冲刺
    showTrail: false,          // 是否显示攻击轨迹
    trailAngle: 0,             // 轨迹角度
    explosionParticles: [],    // 爆炸粒子
    isCriticalHit: false,      // 是否暴击（用于牙刷闪光）
    showCriticalEffect: false, // 是否显示暴击专属特效
    critEnemyAnim: '',         // 暴击敌人动画类型（CSS 类名）
    critAnim: null,            // 暴击特效动画配置
    critName: '',              // 暴击动画中文名（显示用）
    fireworkParticles: [],     // 击败烟花粒子
    // 敌人击败视觉冲击特效
    showDefeatFlash: false,    // 全屏闪光
    showShockwave: false,      // 冲击波
    showKoText: false,         // KO大字
    enemyDebris: [],           // 敌人碎片飞溅
    // 敌人威胁话语
    showEnemyTaunt: false,     // 是否显示威胁话语
    enemyTauntText: '',        // 威胁话语内容
  },

  _timer: null,
  _areaTimer: null,
  _areaElapsed: 0,
  _cheerIndex: 0,
  _totalTime: 120,
  _isDestroyed: false,
  _recordSaved: false,

  // 暴击动画轮转：打乱顺序逐个播放，每轮恰好 10 种各出现 1 次
  _critAnimCycle: [],
  _critAnimIndex: 0,

  _shuffleCritAnims() {
    const { BATTLE_CONFIG } = require('./constants.js')
    const arr = BATTLE_CONFIG.CRIT_ENEMY_ANIMS.slice()
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      const tmp = arr[i]; arr[i] = arr[j]; arr[j] = tmp
    }
    this._critAnimCycle = arr
    this._critAnimIndex = 0
  },

  _nextCritAnim() {
    if (this._critAnimIndex >= this._critAnimCycle.length) this._shuffleCritAnims()
    return this._critAnimCycle[this._critAnimIndex++]
  },

  onLoad(options) {
    // 初始化管理器
    this.storyManager = new StoryManager(this)
    this.battleManager = new BattleManager(this)

    const timeOfDay = options.time || 'morning'
    const navInfo = getNavBarInfo()

    // 根据时间设置主题
    const theme = THEMES[timeOfDay] || THEMES.morning

    // 加载故事进度
    const { chapter, enemy, enemyHp } = this.storyManager.loadProgress(timeOfDay)

    this.setData({
      statusBarHeight: navInfo.statusBarHeight,
      capsuleRight: navInfo.capsuleRight,
      timeOfDay,
      teethArea: BRUSH_AREAS,
      soundEnabled: audio.enabled,
      themeBg: theme.bg
    })

    // 检查是否有未完成的进度
    const savedProgress = wx.getStorageSync('brushingProgress')
    if (savedProgress && savedProgress.date === util.getTodayStr() && savedProgress.timeOfDay === timeOfDay) {
      wx.showModal({
        title: '继续刷牙？',
        content: '上次刷牙未完成，是否继续？',
        confirmText: '继续',
        cancelText: '重新开始',
        success: (res) => {
          if (res.confirm) {
            this.restoreProgress(savedProgress)
          } else {
            wx.removeStorageSync('brushingProgress')
            this.initFresh()
          }
        }
      })
    } else {
      this.initFresh()
    }

    beep.preload()
  },

  onShow() {
    this.applyEditedPhoto()
  },

  // 从画画编辑器返回时，应用编辑后的照片
  applyEditedPhoto() {
    const editedData = wx.getStorageSync('brushingEditedPhoto')
    if (!editedData) return
    wx.removeStorageSync('brushingEditedPhoto')

    const editedPath = typeof editedData === 'string' ? editedData : editedData.path
    const originalPath = wx.getStorageSync('brushingEditOriginalPath')
    wx.removeStorageSync('brushingEditOriginalPath')

    const photos = this.data.photos.slice()
    if (originalPath) {
      const index = photos.indexOf(originalPath)
      if (index !== -1) {
        photos[index] = editedPath
      } else {
        photos.push(editedPath)
      }
    } else {
      photos.push(editedPath)
    }
    this.setData({ photos })
    wx.showToast({ title: '编辑已保存！', icon: 'success' })
  },

  initFresh() {
    this.initToothZones()

    // 显示故事开场对话
    this.showStoryStartDialog()
  },

  // 显示故事开场对话
  showStoryStartDialog() {
    const { currentChapter, currentEnemy, enemyCurrentHp } = this.data
    if (!currentChapter || !currentEnemy) return

    // 构建开场对话
    const dialogues = [
      { emoji: currentChapter.emoji, text: `${currentChapter.name}！`, delay: 0 },
      { emoji: currentEnemy.emoji, text: `${currentEnemy.name}出现了！`, delay: 600 },
      { emoji: '⚔️', text: `快拿起牙刷战斗吧！`, delay: 600 }
    ]

    // 如果敌人已受伤，显示额外提示
    if (enemyCurrentHp < currentEnemy.hp && enemyCurrentHp > 0) {
      dialogues.splice(2, 0, {
        emoji: '💪',
        text: `${currentEnemy.name}还剩${enemyCurrentHp}点血量！`,
        delay: 600
      })
    }

    this.setData({
      showStoryDialog: true,
      storyDialogues: dialogues,
      showEnemyCard: true
    })
  },

  // 故事开场对话完成
  onStoryDialogComplete() {
    this.setData({
      showStoryDialog: false,
      storyDialogues: []
    })
  },

  // 触发攻击动画（支持暴击和连击）
  triggerAttackAnimation(damage) {
    return this.battleManager.triggerAttack(damage)
  },

  // 敌人被击败时的烟花爆炸效果（增强版：更多粒子、更大范围、多波次）
  triggerDefeatFirework() {
    const emojis = ['✨', '💥', '🌟', '⭐', '💫', '🎆', '🎇', '🔥', '💖', '🎉', '🎊', '🪩', '🦄', '🌈', '👑', '🦷']
    const colors = ['#FFD700', '#FF6B8A', '#4FC3F7', '#FF9800', '#E040FB', '#69F0AE', '#FF5252', '#FFF176', '#FF4081', '#00E5FF']
    const particles = []
    const count = 48
    for (let i = 0; i < count; i++) {
      particles.push({
        id: 'fw_' + i,
        emoji: emojis[Math.floor(Math.random() * emojis.length)],
        color: colors[Math.floor(Math.random() * colors.length)],
        angle: (360 / count) * i + (Math.random() * 20 - 10),
        distance: 100 + Math.random() * 180,
        delay: Math.random() * 0.2,
        size: 28 + Math.random() * 36
      })
    }
    this.setData({ fireworkParticles: particles })
    this._fireworkTimer = setTimeout(() => {
      if (this._isDestroyed) return
      this.setData({ fireworkParticles: [] })
    }, 1400)

    // 第二波：更密集的近距离爆发
    this._fireworkTimer2 = setTimeout(() => {
      if (this._isDestroyed) return
      const wave2 = []
      for (let i = 0; i < 32; i++) {
        wave2.push({
          id: 'fw2_' + i,
          emoji: emojis[Math.floor(Math.random() * emojis.length)],
          color: colors[Math.floor(Math.random() * colors.length)],
          angle: Math.random() * 360,
          distance: 60 + Math.random() * 120,
          delay: Math.random() * 0.15,
          size: 24 + Math.random() * 28
        })
      }
      this.setData({ fireworkParticles: [...this.data.fireworkParticles, ...wave2] })
    }, 200)
  },

  // 触发敌人被击败时的全套视觉冲击特效（闪光+冲击波+KO+碎片+烟花）
  triggerEnemyDefeatEffects() {
    const { currentEnemy } = this.data
    if (!currentEnemy) return

    // 生成敌人碎片：用敌人emoji或战斗相关emoji，向四周炸开
    const debrisEmojis = [currentEnemy.emoji, '💥', '✨', '🔥', '💫', '🌟']
    const debrisColors = ['#FFD700', '#FF6B8A', '#FF5252', '#FF9800', '#FFF176']
    const debris = []
    for (let i = 0; i < 18; i++) {
      const angle = (360 / 18) * i + Math.random() * 25
      const rad = (angle * Math.PI) / 180
      const distance = 80 + Math.random() * 160
      debris.push({
        id: 'deb_' + i,
        emoji: debrisEmojis[Math.floor(Math.random() * debrisEmojis.length)],
        color: debrisColors[Math.floor(Math.random() * debrisColors.length)],
        x: Math.cos(rad) * distance,
        y: Math.sin(rad) * distance,
        size: 30 + Math.random() * 50,
        delay: Math.random() * 0.1
      })
    }

    this.setData({
      showDefeatFlash: true,
      showShockwave: true,
      showKoText: true,
      enemyDebris: debris
    })

    // 强烈震动反馈
    wx.vibrateLong()
    setTimeout(() => wx.vibrateShort({ type: 'heavy' }), 100)

    // 闪光 120ms 后消失
    this._defeatFlashTimer = setTimeout(() => {
      if (this._isDestroyed) return
      this.setData({ showDefeatFlash: false })
    }, 120)

    // 冲击波 900ms 后消失
    this._shockwaveTimer = setTimeout(() => {
      if (this._isDestroyed) return
      this.setData({ showShockwave: false })
    }, 900)

    // KO 大字 1.5s 后消失
    this._koTextTimer = setTimeout(() => {
      if (this._isDestroyed) return
      this.setData({ showKoText: false })
    }, 1500)

    // 碎片 1.2s 后消失
    this._debrisTimer = setTimeout(() => {
      if (this._isDestroyed) return
      this.setData({ enemyDebris: [] })
    }, 1200)

    // 触发烟花
    this.triggerDefeatFirework()
  },

  // 生成小怪物
  generateMinions() {
    const { BATTLE_CONFIG } = require('./constants.js')
    const count = BATTLE_CONFIG.MINION_COUNT
    const types = BATTLE_CONFIG.MINION_TYPES
    const minions = []

    // 小怪物位置配置，避开中央大怪物区域（中央 35%-65%）
    const positions = [
      { xRange: [5, 30], yRange: [5, 30] },    // 左上角
      { xRange: [70, 95], yRange: [5, 30] },   // 右上角
      { xRange: [5, 30], yRange: [70, 95] },   // 左下角
      { xRange: [70, 95], yRange: [70, 95] },  // 右下角
      { xRange: [5, 25], yRange: [35, 65] },   // 左侧
      { xRange: [75, 95], yRange: [35, 65] },  // 右侧
      { xRange: [35, 65], yRange: [5, 20] },   // 上方
      { xRange: [35, 65], yRange: [80, 95] }   // 下方
    ]

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)]
      // 从预设位置中随机选择一个区域
      const pos = positions[i % positions.length]
      const x = pos.xRange[0] + Math.random() * (pos.xRange[1] - pos.xRange[0])
      const y = pos.yRange[0] + Math.random() * (pos.yRange[1] - pos.yRange[0])

      minions.push({
        id: `minion_${Date.now()}_${i}`,
        emoji: type.emoji,
        name: type.name,
        color: type.color,
        hp: BATTLE_CONFIG.MINION_HP,
        x: x,
        y: y,
        defeated: false,
        defeating: false
      })
    }

    this.setData({
      minions: minions,
      showMinions: true,
      defeatedMinions: 0,
      totalMinions: count
    })
  },

  // 攻击小怪物
  attackMinion() {
    const { minions } = this.data
    const aliveMinions = minions.filter(m => !m.defeated && !m.defeating)

    if (aliveMinions.length === 0) return false

    // 随机选择一个活着的小怪物
    const target = aliveMinions[Math.floor(Math.random() * aliveMinions.length)]

    // 标记为正在消灭
    const updatedMinions = minions.map(m => {
      if (m.id === target.id) {
        return { ...m, defeating: true }
      }
      return m
    })

    this.setData({ minions: updatedMinions })

    // 播放消灭音效
    beep.playBeep('areaChange')
    wx.vibrateShort({ type: 'light' })

    // 500ms后完全消灭
    this._minionDefeatTimer = setTimeout(() => {
      if (this._isDestroyed) return
      const finalMinions = this.data.minions.map(m => {
        if (m.id === target.id) {
          return { ...m, defeated: true, defeating: false }
        }
        return m
      })

      const defeatedCount = finalMinions.filter(m => m.defeated).length

      this.setData({
        minions: finalMinions,
        defeatedMinions: defeatedCount
      })

      // 检查是否所有小怪物都被消灭
      if (defeatedCount >= this.data.totalMinions) {
        this.onAllMinionsDefeated()
      }
    }, 500)

    return true
  },

  // 所有小怪物被消灭
  onAllMinionsDefeated() {
    // 显示提示
    this.setData({
      showMinions: false,
      minionDefeatEffect: {
        text: '小怪物全灭！可以攻击BOSS了！',
        show: true
      }
    })

    // 1.5秒后隐藏提示
    this._minionEffectTimer = setTimeout(() => {
      if (this._isDestroyed) return
      this.setData({
        minionDefeatEffect: null
      })
    }, 1500)
  },

  // 重置小怪物
  resetMinions() {
    this.setData({
      minions: [],
      showMinions: false,
      defeatedMinions: 0,
      totalMinions: 0,
      minionDefeatEffect: null
    })
  },

  // 显示胜利对话
  showVictoryDialog() {
    const { currentChapter, currentEnemy } = this.data
    if (!currentChapter || !currentEnemy) return

    const dialogues = this.storyManager.getVictoryDialogues()

    this.setData({
      showVictoryDialog: true,
      victoryDialogues: dialogues
    })

    // 播放胜利音效
    beep.playBeep('complete')
    wx.vibrateShort({ type: 'heavy' })
  },

  // 胜利对话完成
  onVictoryDialogComplete() {
    this.setData({
      showVictoryDialog: false,
      victoryDialogues: []
    })

    // 解锁下一章节
    const { currentChapter, currentEnemy, round } = this.data
    if (currentChapter && currentEnemy) {
      util.defeatEnemy(currentEnemy.id, currentChapter.id)

      // 读取最新进度
      const progress = util.getStoryProgress()
      const newRound = progress.round || 1

      // 更新显示
      this.setData({
        isEnemyDefeated: true,
        enemyCurrentHp: 0,
        round: newRound
      })

      // 击败烟花
      this.triggerDefeatFirework()

      // 检查是否进入新一轮
      if (newRound > round) {
        wx.showModal({
          title: '🎉 新的一轮！',
          content: `第${newRound}轮冒险开始！敌人变得更强了！`,
          showCancel: false,
          confirmText: '继续战斗！'
        })
      } else {
        // 解锁下一章节
        const nextChapterId = currentChapter.id + 1
        const nextChapter = CHAPTERS.find(c => c.id === nextChapterId)
        if (nextChapter) {
          wx.showModal({
            title: '新章节解锁！',
            content: `${nextChapter.emoji} ${nextChapter.name}即将开启！`,
            showCancel: false,
            confirmText: '继续冒险'
          })
        }
      }
    }
  },

  // 恢复中途退出的进度
  restoreProgress(progress) {
    this._totalTime = progress.totalTime || 120
    this._areaElapsed = progress.areaElapsed || 0
    this._cheerIndex = 0

    this._areaDuration = Math.floor(this._totalTime / BRUSH_AREAS.length)

    // 恢复牙刷位置（使用与 updateToothbrushPosition 相同的坐标）
    const toothbrushPositions = [
      { x: 15, y: 25, rotation: 135 },   // 左上
      { x: 50, y: 15, rotation: 180 },   // 上中
      { x: 85, y: 25, rotation: 225 },   // 右上
      { x: 85, y: 75, rotation: 315 },   // 右下
      { x: 50, y: 85, rotation: 0 },     // 下中
      { x: 15, y: 75, rotation: 45 }     // 左下
    ]
    const toothbrushPos = toothbrushPositions[progress.currentAreaIndex] || toothbrushPositions[0]

    const currentArea = BRUSH_AREAS[progress.currentAreaIndex]

    this.setData({
      isRunning: false,
      isPaused: true,
      isCompleted: false,
      selectedDuration: progress.selectedDuration || this._totalTime,
      remainingTime: progress.remainingTime,
      minutes: Math.floor(progress.remainingTime / 60).toString().padStart(2, '0'),
      seconds: (progress.remainingTime % 60).toString().padStart(2, '0'),
      overallProgress: Math.round(((this._totalTime - progress.remainingTime) / this._totalTime) * 100),
      currentAreaIndex: progress.currentAreaIndex,
      currentArea: currentArea,
      areaColor: currentArea.color,
      areaRemaining: progress.areaRemaining || this._areaDuration,
      completedAreas: progress.completedAreas,
      brushPoints: progress.brushPoints || 0,
      stage: 'brushing',
      toothZones: progress.toothZones || [],
      companionBubble: `刷${currentArea.name}~`,
      // 牙刷位置
      toothbrushX: progress.toothbrushX || toothbrushPos.x,
      toothbrushY: progress.toothbrushY || toothbrushPos.y,
      toothbrushRotation: progress.toothbrushRotation || toothbrushPos.rotation,
      // 故事状态
      enemyCurrentHp: progress.enemyCurrentHp,
      isEnemyDefeated: progress.isEnemyDefeated || false,
      // 小怪物状态
      minions: progress.minions || [],
      showMinions: progress.showMinions || false,
      defeatedMinions: progress.defeatedMinions || 0,
      totalMinions: progress.totalMinions || 0,
      // 积分
      totalDirtyCleaned: progress.totalDirtyCleaned || 0
    })

    // 更新牙齿区域状态显示
    this.updateZoneStates()
  },

  onUnload() {
    this._isDestroyed = true

    // 如果已完成但未保存记录（用户直接返回），保存记录
    if (this.data.isCompleted && !this._recordSaved) {
      this.saveBrushingRecord()
    }

    // 如果正在刷牙，保存进度
    if (this.data.isRunning || this.data.isPaused) {
      const progress = {
        date: util.getTodayStr(),
        timeOfDay: this.data.timeOfDay,
        totalTime: this._totalTime,
        selectedDuration: this.data.selectedDuration,
        remainingTime: this.data.remainingTime,
        currentAreaIndex: this.data.currentAreaIndex,
        areaRemaining: this.data.areaRemaining,
        completedAreas: this.data.completedAreas,
        areaElapsed: this._areaElapsed,
        brushPoints: this.data.brushPoints,
        toothZones: this.data.toothZones,
        // 牙刷位置
        toothbrushX: this.data.toothbrushX,
        toothbrushY: this.data.toothbrushY,
        toothbrushRotation: this.data.toothbrushRotation,
        // 故事状态
        enemyCurrentHp: this.data.enemyCurrentHp,
        isEnemyDefeated: this.data.isEnemyDefeated,
        // 小怪物状态
        minions: this.data.minions,
        showMinions: this.data.showMinions,
        defeatedMinions: this.data.defeatedMinions,
        totalMinions: this.data.totalMinions,
        // 积分
        totalDirtyCleaned: this.data.totalDirtyCleaned,
        savedAt: Date.now()
      }
      wx.setStorageSync('brushingProgress', progress)
    }

    // 清理所有定时器
    this.clearTimers()
    if (this._ringColorTimer) { clearInterval(this._ringColorTimer); this._ringColorTimer = null }
    if (this._cleanEffectTimer) { clearTimeout(this._cleanEffectTimer); this._cleanEffectTimer = null }
    if (this._comboTimer) { clearTimeout(this._comboTimer); this._comboTimer = null }
    if (this._princessTimer) { clearTimeout(this._princessTimer); this._princessTimer = null }
    // 清理攻击动画定时器
    const attackTimers = ['_attackTimer1', '_attackTimer2', '_attackTimer3', '_attackTimer4', '_attackTimer5', '_attackTimer6']
    attackTimers.forEach(key => {
      if (this[key]) { clearTimeout(this[key]); this[key] = null }
    })
    // 清理区域清洁定时器
    if (this._zoneCleanTimers) { this._zoneCleanTimers.forEach(t => clearTimeout(t)); this._zoneCleanTimers = null }
    // 清理击败特效定时器
    if (this._fireworkTimer) { clearTimeout(this._fireworkTimer); this._fireworkTimer = null }
    if (this._fireworkTimer2) { clearTimeout(this._fireworkTimer2); this._fireworkTimer2 = null }
    if (this._defeatFlashTimer) { clearTimeout(this._defeatFlashTimer); this._defeatFlashTimer = null }
    if (this._shockwaveTimer) { clearTimeout(this._shockwaveTimer); this._shockwaveTimer = null }
    if (this._koTextTimer) { clearTimeout(this._koTextTimer); this._koTextTimer = null }
    if (this._debrisTimer) { clearTimeout(this._debrisTimer); this._debrisTimer = null }
    if (this._minionEffectTimer) { clearTimeout(this._minionEffectTimer); this._minionEffectTimer = null }
    if (this._pointsTipTimer) { clearTimeout(this._pointsTipTimer); this._pointsTipTimer = null }
    if (this._attackPointsTimer) { clearTimeout(this._attackPointsTimer); this._attackPointsTimer = null }
    if (this._victoryDialogTimer) { clearTimeout(this._victoryDialogTimer); this._victoryDialogTimer = null }
  },

  // 生成超级炫酷撒花（满屏效果）
  generateConfetti() {
    const colors = [
      '#FF9AAB', '#FFB6C1', '#FF69B4', '#FF1493', '#DB7093',
      '#FFD700', '#FF6B8A', '#E8A0BF', '#BA68C8', '#9C27B0',
      '#4FC3F7', '#81C784', '#FFB74D', '#FF8A80', '#FF4081'
    ]
    const emojis = [
      '💖', '⭐', '✨', '🌟', '💫', '👑', '🦄', '🎀', '🌸', '💕',
      '🎉', '🎊', '🥳', '🎈', '🎁', '💝', '💗', '💓', '💞', '💟',
      '🦷', '😁', '💪', '🏆', '🥇', '🥈', '🥉', '🎆', '🎇', '🧨'
    ]

    // 第一层：大量彩色纸片（80个）
    const confetti = []
    for (let i = 0; i < 80; i++) {
      confetti.push({
        id: 'c_' + i,
        type: 'paper',
        x: Math.random() * 100,
        delay: Math.random() * 1.5,
        color: colors[i % colors.length],
        w: 10 + Math.random() * 20,
        h: 15 + Math.random() * 30,
        rotation: Math.random() * 360
      })
    }

    // 第二层：emoji表情（40个）
    for (let i = 0; i < 40; i++) {
      confetti.push({
        id: 'e_' + i,
        type: 'emoji',
        x: Math.random() * 100,
        delay: Math.random() * 2,
        emoji: emojis[i % emojis.length],
        size: 30 + Math.random() * 40
      })
    }

    // 第三层：大号特效emoji（10个）
    const bigEmojis = ['🎉', '🎊', '🥳', '🏆', '⭐', '💖', '🦷', '😁', '✨', '👑']
    for (let i = 0; i < 10; i++) {
      confetti.push({
        id: 'b_' + i,
        type: 'big',
        x: 10 + Math.random() * 80,
        delay: 0.5 + Math.random() * 1,
        emoji: bigEmojis[i],
        size: 80 + Math.random() * 40
      })
    }

    this.setData({ confetti })

    // 第二波撒花（延迟1秒）
    setTimeout(() => {
      const wave2 = []
      for (let i = 0; i < 40; i++) {
        wave2.push({
          id: 'w2_' + i,
          type: 'paper',
          x: Math.random() * 100,
          delay: Math.random() * 1,
          color: colors[(i + 5) % colors.length],
          w: 10 + Math.random() * 20,
          h: 15 + Math.random() * 30,
          rotation: Math.random() * 360
        })
      }
      for (let i = 0; i < 20; i++) {
        wave2.push({
          id: 'w2e_' + i,
          type: 'emoji',
          x: Math.random() * 100,
          delay: Math.random() * 1.5,
          emoji: emojis[(i + 10) % emojis.length],
          size: 30 + Math.random() * 40
        })
      }
      this.setData({ confetti: [...this.data.confetti, ...wave2] })
    }, 1000)
  },

  // 刷牙后贴纸装饰：点击贴纸按钮添加
  onTapSticker(e) {
    if (this.data.stage !== 'post') return
    const stickerId = e.currentTarget.dataset.id
    const sticker = STICKERS.find(s => s.id === stickerId)
    if (!sticker) return

    const newSticker = {
      id: `sticker_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      stickerId: sticker.id,
      emoji: sticker.emoji
    }

    this.setData({
      placedStickers: [...this.data.placedStickers, newSticker]
    })

    wx.vibrateShort({ type: 'light' })
  },

  // 删除贴纸
  onDeleteSticker(e) {
    const stickerId = e.currentTarget.dataset.id
    const placedStickers = this.data.placedStickers.filter(s => s.id !== stickerId)
    this.setData({ placedStickers })
    wx.vibrateShort({ type: 'light' })
  },

  // 拍照（支持多张，最多6张）
  takePhoto() {
    const remainCount = 6 - this.data.photos.length
    if (remainCount <= 0) {
      wx.showToast({ title: '最多6张照片', icon: 'none' })
      return
    }
    wx.chooseMedia({
      count: remainCount,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      sizeType: ['compressed'],
      success: (res) => {
        const newPhotos = res.tempFiles.map(f => f.tempFilePath)
        this.setData({ photos: [...this.data.photos, ...newPhotos] })
      }
    })
  },

  // 删除照片
  deletePhoto(e) {
    const index = e.currentTarget.dataset.index
    const photos = this.data.photos.slice()
    photos.splice(index, 1)
    this.setData({ photos })
  },

  // 预览照片
  previewPhoto(e) {
    const index = e.currentTarget.dataset.index
    wx.previewImage({
      current: this.data.photos[index],
      urls: this.data.photos
    })
  },

  // 编辑照片
  editPhoto(e) {
    const path = e.currentTarget.dataset.path
    wx.setStorageSync('brushingEditOriginalPath', path)
    wx.navigateTo({
      url: '/packageCreate/pages/create/draw/draw?mode=brushing&photo=' + encodeURIComponent(path) + '&timeOfDay=' + this.data.timeOfDay
    })
  },


  // 初始化牙齿6区，每个区随机分配1-2个细菌
  initToothZones() {
    const zones = BRUSH_AREAS.map((area, index) => {
      const germCount = 1 + Math.floor(Math.random() * 2)
      const germs = []
      for (let i = 0; i < germCount; i++) {
        germs.push({
          id: `germ_${index}_${i}_${Date.now()}`,
          emoji: ZONE_GERM_TYPES[Math.floor(Math.random() * ZONE_GERM_TYPES.length)],
          x: 15 + Math.random() * 70,
          y: 15 + Math.random() * 70,
          fleeing: false
        })
      }
      return {
        index,
        name: area.name,
        color: area.color,
        state: 'dirty',
        germs
      }
    })
    this.setData({ toothZones: zones })
  },

  // 根据当前区域和已完成区域更新牙齿分区状态
  updateZoneStates() {
    const { currentAreaIndex, completedAreas } = this.data
    const zones = this.data.toothZones.map((zone, index) => {
      let state = 'dirty'
      if (completedAreas.includes(zone.name)) {
        state = 'clean'
      } else if (index === currentAreaIndex) {
        state = 'current'
      }
      // 刚被刷干净的区域，细菌开始逃跑
      const germs = (zone.state !== 'clean' && state === 'clean')
        ? zone.germs.map(g => ({ ...g, fleeing: true }))
        : zone.germs
      return { ...zone, state, germs }
    })
    this.setData({ toothZones: zones })

    // 逃跑动画结束后清除细菌
    if (!this._zoneCleanTimers) this._zoneCleanTimers = []
    this._zoneCleanTimers.forEach(t => clearTimeout(t))
    this._zoneCleanTimers = []
    zones.forEach((zone, index) => {
      if (zone.state === 'clean' && zone.germs.length > 0) {
        const timer = setTimeout(() => {
          if (this._isDestroyed) return
          const fresh = this.data.toothZones.map((z, i) =>
            i === index ? { ...z, germs: [] } : z
          )
          this.setData({ toothZones: fresh })
        }, 700)
        this._zoneCleanTimers.push(timer)
      }
    })
  },

  // 更新陪伴小公主提示语（固定右下角）
  updateCompanion() {
    const index = this.data.currentAreaIndex
    const area = BRUSH_AREAS[index]
    const areaPrompts = [
      `${area.name}~`,
      `刷${area.name}`,
      `${area.name}!`,
      `${area.name}哦`
    ]
    const bubble = this.data.companionBubble
      ? areaPrompts[index % areaPrompts.length]
      : `刷牙啦！${areaPrompts[0]}`

    this.setData({ companionBubble: bubble })
  },

  // 根据刷牙区域更新牙刷位置和方向
  updateToothbrushPosition() {
    const index = this.data.currentAreaIndex
    // 6个区域对应不同的牙刷位置和角度
    // 牙刷头始终指向中央敌人（中心点 50, 50）
    // emoji 🪥 默认朝右，需要旋转使其指向中心
    const positions = [
      { x: 15, y: 25, rotation: 135 },   // 左上 → 牙刷头朝右下（指向中心）
      { x: 50, y: 15, rotation: 180 },   // 上中 → 牙刷头朝下（指向中心）
      { x: 85, y: 25, rotation: 225 },   // 右上 → 牙刷头朝左下（指向中心）
      { x: 85, y: 75, rotation: 315 },   // 右下 → 牙刷头朝左上（指向中心）
      { x: 50, y: 85, rotation: 0 },     // 下中 → 牙刷头朝上（指向中心）
      { x: 15, y: 75, rotation: 45 }     // 左下 → 牙刷头朝右上（指向中心）
    ]

    const pos = positions[index] || positions[0]
    this.setData({
      toothbrushX: pos.x,
      toothbrushY: pos.y,
      toothbrushRotation: pos.rotation
    })
  },

  // ===== 计时器 =====
  // 选择刷牙时长
  selectDuration(e) {
    const sec = parseInt(e.currentTarget.dataset.sec)
    this.setData({ selectedDuration: sec })
  },

  startTimer() {
    this._totalTime = this.data.selectedDuration
    const areaDuration = Math.floor(this._totalTime / BRUSH_AREAS.length)
    this._areaDuration = areaDuration
    this._cheerIndex = 0

    const min = Math.floor(this._totalTime / 60).toString().padStart(2, '0')
    const sec = (this._totalTime % 60).toString().padStart(2, '0')

    this.setData({
      isRunning: true, isPaused: false, isCompleted: false,
      remainingTime: this._totalTime, overallProgress: 0,
      currentAreaIndex: 0, currentArea: BRUSH_AREAS[0],
      areaColor: BRUSH_AREAS[0].color, completedAreas: [],
      areaRemaining: areaDuration,
      ringColor: '#FF9AAB',
      rewardStars: [false, false, false, false, false],
      currentRewardText: REWARD_TEXTS[0],
      minutes: min, seconds: sec,
      stage: 'brushing',
      dirtySpots: [],
      placedStickers: [],
      showStickerPicker: false,
      lastBrushPoints: 0
    })

    this._areaElapsed = 0
    beep.playBeep('start')

    // 随机生成女孩风格泡泡
    const girlBubbles = BUBBLE_LIST.map((item, i) => ({
      ...item,
      emoji: Math.random() > 0.5 ? GIRL_BUBBLES[Math.floor(Math.random() * GIRL_BUBBLES.length)] : item.emoji
    }))
    this.setData({ bubbles: girlBubbles })

    // 重置颜色模式
    this._ringModeIndex = 0

    // 初始化牙齿6区细菌
    this.initToothZones()
    // 开始刷牙后，第一个区域标记为当前
    this.updateZoneStates()
    // 陪伴小公主就位
    this.updateCompanion()
    // 牙刷位置就位
    this.updateToothbrushPosition()
    // 生成小怪物
    this.generateMinions()

    this.startMainTimer()
    this.startAreaTimer()
  },

  startMainTimer() {
    this._timer = setInterval(() => {
      if (this.data.remainingTime <= 0) {
        this.completeTimer()
        return
      }

      const remaining = this.data.remainingTime - 1
      const overallProgress = Math.round(((this._totalTime - remaining) / this._totalTime) * 100)

      // 颜色变化（根据当前模式）
      let ringColor = '#FF9AAB' // 默认粉色
      if (this._ringModeIndex && this._ringModeIndex > 0) {
        // 非默认模式，使用模式颜色
        const mode = RING_MODES[this._ringModeIndex]
        if (mode.name !== '彩虹') {
          // 非彩虹模式根据进度选择颜色
          const colorIndex = Math.min(Math.floor(overallProgress / 25), mode.colors.length - 1)
          ringColor = mode.colors[colorIndex]
        }
        // 彩虹模式由 onTapRing 的动画控制
      } else {
        // 默认模式
        if (overallProgress > 80) ringColor = '#81C784'
        else if (overallProgress > 50) ringColor = '#FFB74D'
      }

      // 星星
      const starIndex = Math.floor(overallProgress / 20)
      const rewardStars = this.data.rewardStars.map((s, i) => i < starIndex)

      // 动物加油文字轮换
      this._cheerIndex = (this._cheerIndex + 1) % CHEER_LEFT.length
      const currentIndex = this._cheerIndex
      let leftCheer = CHEER_LEFT[currentIndex]
      let rightCheer = CHEER_RIGHT[currentIndex]

      // 随机触发公主鼓励（每6秒有概率出现）
      if (currentIndex === 0 && Math.random() > 0.5) {
        const princess = PRINCESS_CHEER[Math.floor(Math.random() * PRINCESS_CHEER.length)]
        leftCheer = princess.text
        if (this._princessTimer) clearTimeout(this._princessTimer)
        this._princessTimer = setTimeout(() => {
          this.setData({ leftCheer: CHEER_LEFT[currentIndex] })
        }, 2000)
      }

      beep.playBeep('tick')
      if (remaining <= 10 && remaining > 0) beep.playBeep('countdown')

      const min = Math.floor(remaining / 60).toString().padStart(2, '0')
      const sec = (remaining % 60).toString().padStart(2, '0')

      // 持续扣减敌人血量（基于已用时间，避免浮点精度问题）
      const { currentEnemy } = this.data
      const updateData = {
        remainingTime: remaining, minutes: min, seconds: sec,
        overallProgress, ringColor, rewardStars,
        currentRewardText: REWARD_TEXTS[Math.min(starIndex, REWARD_TEXTS.length - 1)],
        leftCheer, rightCheer
      }

      if (currentEnemy && this.data.enemyCurrentHp > 0) {
        const elapsed = this._totalTime - remaining
        const newHp = Math.round(Math.max(0, currentEnemy.hp * (1 - elapsed / this._totalTime)) * 10) / 10
        const hpRatio = newHp / currentEnemy.hp
        const enemyScale = 0.5 + hpRatio * 0.8
        const enemyAngry = hpRatio < BATTLE_CONFIG.ENEMY_ANGER_THRESHOLD
        updateData.enemyCurrentHp = newHp
        updateData.enemyAngry = enemyAngry
        updateData.isEnemyDefeated = newHp <= 0
        updateData.enemyScale = enemyScale
      }

      this.setData(updateData)

      // 敌人被击败 → 全套视觉冲击特效
      if (updateData.isEnemyDefeated && !this.data.isEnemyDefeated) {
        this.triggerEnemyDefeatEffects()
      }
    }, 1000)
  },

  startAreaTimer() {
    const areaDuration = this._areaDuration || Math.floor(this._totalTime / BRUSH_AREAS.length)
    this._areaTimer = setInterval(() => {
      this._areaElapsed++
      const areaRemaining = areaDuration - this._areaElapsed

      if (this._areaElapsed >= areaDuration) {
        const completedAreas = [...this.data.completedAreas, this.data.currentArea.name]
        const nextIndex = this.data.currentAreaIndex + 1
        this._areaElapsed = 0

        // 增加积分：区域完成 + 基础分，该区域内所有细菌每个 + 额外分
        const finishedZone = this.data.toothZones.find(z => z.index === this.data.currentAreaIndex)
        const germBonus = finishedZone ? finishedZone.germs.length * BATTLE_CONFIG.GERM_BONUS_POINTS : 0
        const areaPoints = BATTLE_CONFIG.AREA_COMPLETE_POINTS + germBonus
        const newPoints = this.data.brushPoints + areaPoints
        const newCleaned = this.data.totalDirtyCleaned + (finishedZone ? finishedZone.germs.length : 0)
        const pointsText = germBonus > 0 ? `+${areaPoints} 积分！` : `+${BATTLE_CONFIG.AREA_COMPLETE_POINTS} 积分！`

        // 显示刷牙小知识
        const tipIndex = completedAreas.length - 1
        let tip = BRUSHING_TIPS[tipIndex % BRUSHING_TIPS.length]
        // 替换时长提示为实际选择的时长
        const min = Math.floor(this._totalTime / 60)
        tip = tip.replace('2分钟', `${min}分钟`)

        this.setData({
          brushPoints: newPoints,
          totalDirtyCleaned: newCleaned,
          showPoints: true,
          pointsText: pointsText,
          currentTip: tip,
          showTip: true
        })

        // 2秒后隐藏积分和提示
        this._pointsTipTimer = setTimeout(() => {
          if (this._isDestroyed) return
          this.setData({ showPoints: false, showTip: false })
        }, 2500)

        // ===== 主线故事：对敌人造成伤害 =====
        const { currentEnemy, isEnemyDefeated, minions, showMinions } = this.data
        if (currentEnemy && !isEnemyDefeated) {
          // 检查是否还有小怪物
          const aliveMinions = minions.filter(m => !m.defeated && !m.defeating)

          // 攻击小怪物（如果有的话）
          if (showMinions && aliveMinions.length > 0) {
            this.attackMinion()
          }

          // 触发攻击动画（视觉效果，实际HP由主计时器按时间扣减）
          const attackResult = this.triggerAttackAnimation(1)

          // 根据暴击和连击计算积分奖励
          let bonusPoints = BATTLE_CONFIG.ATTACK_BASE_POINTS
          if (attackResult.isCritical) bonusPoints = BATTLE_CONFIG.CRIT_ATTACK_POINTS
          bonusPoints = Math.floor(bonusPoints * (1 + attackResult.comboBonus)) // 连击加成

          // 更新积分并显示（累加攻击奖励到区域完成积分之上）
          const attackPoints = newPoints + bonusPoints
          const bonusText = attackResult.isCritical
            ? `暴击！+${bonusPoints}积分！`
            : attackResult.comboCount > 1
              ? `${attackResult.comboCount}连击！+${bonusPoints}积分！`
              : `+${bonusPoints}积分！`

          this.setData({
            brushPoints: attackPoints,
            showPoints: true,
            pointsText: bonusText
          })

          // 2秒后隐藏积分
          this._attackPointsTimer = setTimeout(() => {
            if (this._isDestroyed) return
            this.setData({ showPoints: false })
          }, 2000)
        }

        if (nextIndex < BRUSH_AREAS.length) {
          beep.playBeep('areaChange')
          this.setData({
            completedAreas, currentAreaIndex: nextIndex,
            currentArea: BRUSH_AREAS[nextIndex], areaColor: BRUSH_AREAS[nextIndex].color,
            areaRemaining: this._areaDuration || Math.floor(this._totalTime / BRUSH_AREAS.length)
          }, () => {
            this.updateZoneStates()
            this.updateCompanion()
            this.updateToothbrushPosition()
          })
        } else {
          this.setData({ completedAreas, areaRemaining: 0 }, () => {
            this.updateZoneStates()
            this.updateCompanion()
          })
          clearInterval(this._areaTimer)
        }
      } else {
        this.setData({ areaRemaining })
      }
    }, 1000)
  },

  pauseTimer() {
    clearInterval(this._timer)
    clearInterval(this._areaTimer)
    this.setData({ isRunning: false, isPaused: true })
  },

  resumeTimer() {
    this.setData({ isRunning: true, isPaused: false })
    this.updateCompanion()
    this.startMainTimer()
    this.startAreaTimer()
  },

  // 提前完成（按已刷区域数计算评分）
  finishEarly() {
    const completedCount = this.data.completedAreas.length
    if (completedCount === 0) {
      wx.showToast({ title: '至少刷一个区域吧~', icon: 'none' })
      return
    }
    this.completeTimer()
  },

  resetTimer() {
    this.clearTimers()
    // 清除彩虹动画
    if (this._ringColorTimer) {
      clearInterval(this._ringColorTimer)
      this._ringColorTimer = null
    }
    // 清除特效定时器
    if (this._cleanEffectTimer) {
      clearTimeout(this._cleanEffectTimer)
      this._cleanEffectTimer = null
    }
    // 清除击败特效定时器
    if (this._fireworkTimer) { clearTimeout(this._fireworkTimer); this._fireworkTimer = null }
    if (this._fireworkTimer2) { clearTimeout(this._fireworkTimer2); this._fireworkTimer2 = null }
    if (this._defeatFlashTimer) { clearTimeout(this._defeatFlashTimer); this._defeatFlashTimer = null }
    if (this._shockwaveTimer) { clearTimeout(this._shockwaveTimer); this._shockwaveTimer = null }
    if (this._koTextTimer) { clearTimeout(this._koTextTimer); this._koTextTimer = null }
    if (this._debrisTimer) { clearTimeout(this._debrisTimer); this._debrisTimer = null }
    this._ringModeIndex = 0
    this.setData({
      isRunning: false, isPaused: false, isCompleted: false,
      remainingTime: this._totalTime, minutes: '02', seconds: '00',
      overallProgress: 0, currentAreaIndex: 0, currentArea: BRUSH_AREAS[0],
      areaColor: BRUSH_AREAS[0].color, completedAreas: [],
      areaRemaining: 20, ringColor: '#FF9AAB',
      rewardStars: [false, false, false, false, false],
      currentRewardText: '准备开始！',
      completedStarsArr: [], completedText: '', confetti: [],
      dirtySpots: [], brushPoints: 0, totalDirtyCleaned: 0,
      showCleanEffect: false, showPoints: false, showTip: false,
      toothZones: [],
      companionBubble: '',
      comboCount: 0, showCombo: false, enemyAngry: false,
      showDefeatFlash: false, showShockwave: false, showKoText: false,
      enemyDebris: [], fireworkParticles: []
    })
    this._areaElapsed = 0
    // 重置小怪物
    this.resetMinions()
    // 重置牙齿区域
    this.initToothZones()
  },

  completeTimer() {
    this.clearTimers()
    // 清除彩虹动画
    if (this._ringColorTimer) {
      clearInterval(this._ringColorTimer)
      this._ringColorTimer = null
    }
    beep.playBeep('complete')
    this.generateConfetti()

    // 时间到，确保敌人被击败
    const wasEnemyDefeated = this.data.isEnemyDefeated
    this.setData({
      enemyCurrentHp: 0,
      isEnemyDefeated: true
    })

    // 如果之前未击败，触发全套击败视觉冲击特效
    if (!wasEnemyDefeated) {
      this.triggerEnemyDefeatEffects()
    }

    const completedCount = this.data.completedAreas.length
    let stars = Math.ceil((completedCount / BRUSH_AREAS.length) * 5)
    if (stars === 0) stars = 1

    // 检查是否有连续天数的特殊称号
    const specialTitle = this.getSpecialTitle()
    const dirtyBonus = this.data.totalDirtyCleaned > 0
      ? `，刷掉了${this.data.totalDirtyCleaned}个脏东西！`
      : ''

    // 故事相关文本
    const { currentEnemy, storyExpGained } = this.data
    let storyText = ''
    if (currentEnemy) {
      storyText = `打败了${currentEnemy.name}！`
    }

    const childName = auth.getChildNickname()
    const completedTexts = getCompletedTexts(childName)
    const completedText = specialTitle
      ? specialTitle + dirtyBonus + (storyText ? `，${storyText}` : '')
      : completedTexts[Math.floor(Math.random() * completedTexts.length)] + dirtyBonus + (storyText ? `，${storyText}` : '')

    // 标记为未保存状态（等用户贴完贴纸后再保存）
    this._recordSaved = false

    // 清除中途退出的进度缓存
    wx.removeStorageSync('brushingProgress')

    // 陪伴公主完成语
    this.setData({ companionBubble: '太棒啦！🎉' })

    // 确保所有已刷区域状态为 clean
    this.updateZoneStates()

    // 清除所有脏东西
    this.setData({
      isRunning: false, isPaused: false, isCompleted: true, overallProgress: 100,
      ringColor: '#81C784',
      completedStarsArr: Array(stars).fill(0),
      completedText: completedText,
      dirtySpots: [],
      stage: 'post',
      showStickerPicker: true,
      lastBrushPoints: this.data.brushPoints
    })
  },

  // 完成刷牙（用户点击完成按钮）
  onDoneBrushing() {
    if (!this._recordSaved) {
      this.saveBrushingRecord()
      this._recordSaved = true
    }
    // 跳转到统计页（用 redirectTo 替换当前页，返回时直接回主页）
    wx.redirectTo({
      url: '/packageHabits/pages/habits/brushing-stats/brushing-stats'
    })
  },

  // 保存刷牙记录到本地和云端
  saveBrushingRecord() {
    // 根据完成区域数计算评分（1-5分制）
    const areaCount = this.data.completedAreas.length
    const score = areaCount >= 6 ? 5 : areaCount >= 4 ? 4 : areaCount >= 2 ? 3 : areaCount >= 1 ? 2 : 1

    // 计算经验值
    const duration = this._totalTime - this.data.remainingTime
    const expGained = util.calcExpGain({
      completedAreas: this.data.completedAreas,
      duration: duration
    })

    // 添加角色经验并检查升级
    const avatarResult = util.addAvatarExp(expGained)

    // 更新经验值显示
    this.setData({
      storyExpGained: expGained
    })

    // 如果升级了，显示升级提示
    if (avatarResult.levelUp) {
      setTimeout(() => {
        wx.showModal({
          title: '🎉 角色升级！',
          content: `小卫士升到${avatarResult.newLevel}级啦！`,
          showCancel: false,
          confirmText: '太棒了！'
        })
      }, 2000)
    }

    const record = {
      id: util.generateId(),
      date: util.getTodayStr(),
      timeOfDay: this.data.timeOfDay,
      imagePath: this.data.photos[0] || null,
      images: this.data.photos || [],
      score: score,
      note: areaCount >= 6 ? '完成全部6区刷牙' : `完成${areaCount}区刷牙`,
      points: this.data.brushPoints,
      completedAreas: this.data.completedAreas,
      duration: duration,
      createTime: new Date().toISOString(),
      fromTimer: true,
      // 故事相关字段
      chapterId: this.data.currentChapter ? this.data.currentChapter.id : null,
      enemyId: this.data.currentEnemy ? this.data.currentEnemy.id : null,
      damageDealt: this.data.currentEnemy ? (this.data.currentEnemy.hp - this.data.enemyCurrentHp) : 0,
      expGained: expGained,
      // 贴纸数据
      stickers: this.data.placedStickers || []
    }

    // 先保存到本地，确保数据不丢失
    util.saveBrushingRecord(record)
    // 后台尝试同步云端（失败不影响本地数据）
    cloud.uploadBrushingRecord(record).catch(err => {
      console.warn('刷牙记录云端同步失败，已保留本地:', err)
    })

    // 检查成就解锁（异步版本，确保读取最新数据）
    achievements.checkAchievementsAsync().then(newAchievements => {
      if (newAchievements && newAchievements.length > 0) {
        setTimeout(() => {
          var popup = this.selectComponent('#achievementPopup')
          if (popup) {
            popup.showAchievements(newAchievements)
          }
        }, 3000)
      }
    }).catch(err => {
      console.warn('成就检查失败:', err)
    })
  },

  clearTimers() {
    if (this._timer) { clearInterval(this._timer); this._timer = null }
    if (this._areaTimer) { clearInterval(this._areaTimer); this._areaTimer = null }
  },

  // 关闭庆祝画面，保留积分展示
  closeCelebration() {
    this.setData({
      isCompleted: false,
      confetti: [],
      showStickerPicker: false,
      placedStickers: []
    })
  },

  goCheckIn() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['camera', 'album'],
      sizeType: ['compressed'],
      success: (res) => {
        const photoPath = res.tempFiles[0].tempFilePath
        // 跳转到涂鸦编辑页面，传递刷牙模式、照片路径和时段信息
        wx.navigateTo({
          url: '/packageCreate/pages/create/draw/draw?mode=brushing&photo=' + encodeURIComponent(photoPath) + '&timeOfDay=' + this.data.timeOfDay
        })
      }
    })
  },

  // 跳转到刷牙打卡主页
  goBrushingPage() {
    wx.redirectTo({ url: '/packageHabits/pages/habits/brushing/brushing' })
  },

  toggleSound() {
    const enabled = audio.toggle()
    this.setData({ soundEnabled: enabled })
    wx.showToast({
      title: enabled ? '🔊 音效已开启' : '🔇 音效已关闭',
      icon: 'none'
    })
  },

  // ===== 彩蛋功能 =====

  // 彩蛋：点击进度环切换颜色模式
  onTapRing() {
    // 初始化当前模式索引
    if (this._ringModeIndex === undefined) this._ringModeIndex = 0

    // 切换到下一个模式
    this._ringModeIndex = (this._ringModeIndex + 1) % RING_MODES.length
    const mode = RING_MODES[this._ringModeIndex]

    // 停止之前的彩虹动画
    if (this._ringColorTimer) {
      clearInterval(this._ringColorTimer)
      this._ringColorTimer = null
    }

    wx.showToast({
      title: `🎨 ${mode.name}模式`,
      icon: 'none',
      duration: 1000
    })

    // 如果是彩虹模式，启动动画
    if (mode.name === '彩虹') {
      let colorIndex = 0
      this._ringColorTimer = setInterval(() => {
        this.setData({
          ringColor: mode.colors[colorIndex % mode.colors.length]
        })
        colorIndex++
      }, 150)
    } else {
      // 其他模式根据进度显示对应颜色
      const progress = this.data.overallProgress
      const colorIndex = Math.min(Math.floor(progress / 25), mode.colors.length - 1)
      this.setData({ ringColor: mode.colors[colorIndex] })
    }
  },

  // 完成时根据连续天数显示特殊称号
  getSpecialTitle() {
    const stats = util.getBrushingStats()
    const streak = stats.streak

    if (streak >= 30) return '🏆 刷牙大师！连续30天！'
    if (streak >= 14) return '🥇 刷牙达人！连续2周！'
    if (streak >= 7) return '⭐ 刷牙之星！连续7天！'
    if (streak >= 3) return '💪 坚持不懈！连续3天！'
    return null
  },

  goBack() {
    // 如果正在刷牙或暂停中，显示确认对话框
    if (this.data.isRunning || this.data.isPaused) {
      wx.showModal({
        title: '确定返回吗？',
        content: '刷牙进度会保存，下次可以继续',
        confirmText: '返回',
        cancelText: '继续刷牙',
        success: (res) => {
          if (res.confirm) {
            // onUnload 会自动保存进度
            wx.navigateBack()
          }
        }
      })
    } else {
      wx.navigateBack()
    }
  },

  // 分享给家人
  onShareAppMessage() {
    const score = this.data.completedAreas.length >= 6 ? 5 : this.data.completedAreas.length >= 4 ? 4 : 3
    const { currentEnemy, isEnemyDefeated } = this.data
    const childName = auth.getChildNickname()

    let title = childName + '今天' + (this.data.timeOfDay === 'morning' ? '早上' : '晚上') + '刷牙得了' + score + '颗星！⭐'
    if (isEnemyDefeated && currentEnemy) {
      title = childName + '打败了' + currentEnemy.name + '，刷牙得了' + score + '颗星！🏆'
    }

    return {
      title: title,
      path: '/pages/index/index'
    }
  }
})
