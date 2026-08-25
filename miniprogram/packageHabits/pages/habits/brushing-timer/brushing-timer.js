const util = getApp().globalData.util
const childStorage = getApp().globalData.childStorage
const audio = getApp().globalData.audio
const beep = getApp().globalData.beep
const cloud = getApp().globalData.cloud
const auth = getApp().globalData.auth
const achievements = getApp().globalData.achievements
const { getNavBarInfo, previewImage } = getApp().globalData.pageHelpers
const {
  BRUSH_AREAS, BRUSHING_TIPS, THEMES, REWARD_TEXTS, getCompletedTexts,
  RING_MODES, STICKERS, ZONE_GERM_TYPES, CHAPTERS, BATTLE_CONFIG,
  getOrSelectTodayChapter, TOOTHBRUSH_SKINS,
  BATTLEFIELD_EFFECTS, SLASH_EFFECTS, ENTRANCE_ANIMATIONS
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
    completedAreas: [],
    areaRemaining: 20,
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
    // 牙刷皮肤系统
    toothbrushSkins: TOOTHBRUSH_SKINS,
    selectedSkinId: 'classic',
    currentSkin: TOOTHBRUSH_SKINS[0],
    // 牙齿6区可视化（左上/上中/右上/左下/下中/右下）
    toothZones: [],
    // 刷牙小游戏（保留给刷牙前/后使用，刷牙中不再出现）
    stage: 'pre',
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
    // 新增战斗特效
    showSlash: false,          // 斩击特效
    slashClass: '',            // 斩击动画类型
    showHitRing: false,        // 命中冲击环
    hitRingColor: '#FF6B8A',   // 冲击环颜色
    showBeam: false,           // 能量波
    beamEmoji: '💗',           // 能量波emoji
    showAttackCry: false,      // 攻击喝声
    attackCryText: '',         // 喝声文字
    showScreenShake: false,    // 屏幕震动
    battlefieldClass: '',      // 随机战场特效类名
    // 怪物出场动画
    showEnemyEntrance: false,  // 是否显示出场动画
    entrancePhase: 0,          // 出场动画阶段 0=无 1=暗幕 2=VS 3=怪物碑落 4=名字展示
    entranceClass: '',        // 出场动画类名（随机）
    // 暴击全屏特效
    critFullscreenParticles: [], // 暴击全屏粒子
  },

  _timer: null,
  _elapsed: 0,
  _chapterAdvanced: false,
  _totalTime: 120,
  _isDestroyed: false,
  _recordSaved: false,

  // 暴击动画轮转逻辑统一在 battle-manager.js（BattleManager._nextCritAnim），页面不重复维护

  onLoad(options) {
    // 初始化管理器
    this.storyManager = new StoryManager(this)
    this.battleManager = new BattleManager(this)

    const timeOfDay = options.time || 'morning'
    const navInfo = getNavBarInfo()

    // 根据时间设置主题
    const theme = THEMES[timeOfDay] || THEMES.morning

    // 加载已保存的牙刷皮肤
    const savedSkinId = wx.getStorageSync('brushingSkinId') || 'classic'
    const savedSkin = TOOTHBRUSH_SKINS.find(s => s.id === savedSkinId) || TOOTHBRUSH_SKINS[0]

    // 加载故事进度
    const { chapter, enemy, enemyHp } = this.storyManager.loadProgress(timeOfDay)

    // 恢复音效开关设置
    const soundSettings = childStorage.get('gameSettings') || {}
    audio.enabled = !!soundSettings.soundEnabled

    this.setData({
      statusBarHeight: navInfo.statusBarHeight,
      capsuleRight: navInfo.capsuleRight,
      timeOfDay,
      soundEnabled: audio.enabled,
      themeBg: savedSkin.bgGradient || theme.bg,
      selectedSkinId: savedSkin.id,
      currentSkin: savedSkin
    })

    // 检查是否有未完成的进度
    const savedProgress = childStorage.get('brushingProgress') // H5：按孩子隔离存取
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
            childStorage.remove('brushingProgress')
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

    // 消费上次战斗留下的场景变化提示（新章节解锁/新一轮），拼进开场对话首行
    const notice = childStorage.get('brushingSceneNotice')
    if (notice) childStorage.remove('brushingSceneNotice')

    // 构建开场对话
    const dialogues = [
      { emoji: currentChapter.emoji, text: `${currentChapter.name}！`, delay: 0 },
      { emoji: currentEnemy.emoji, text: `${currentEnemy.name}出现了！`, delay: 600 },
      { emoji: '⚔️', text: `快拿起牙刷战斗吧！`, delay: 600 }
    ]

    if (notice) {
      // 上次战斗的胜利战报：先播"敌人被打败"，再播场景变化
      if (notice.enemyName) {
        dialogues.unshift({ emoji: notice.enemyEmoji || '🏆', text: `${notice.enemyName}被打败啦！`, delay: 0 })
      }
      if (notice.type === 'round') {
        dialogues.unshift({ emoji: '🎉', text: `第${notice.round}轮冒险开始！敌人变得更强了！`, delay: 0 })
      } else {
        dialogues[0].text = `新章节解锁：${currentChapter.name}！`
      }
    }

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
    this._lastAttackTime = Date.now()
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
    this._fireworkTimer = this.trackTimeout(() => {
      this.setData({ fireworkParticles: [] })
    }, 1400)

    // 第二波：更密集的近距离爆发
    this._fireworkTimer2 = this.trackTimeout(() => {
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
    this.trackTimeout(() => wx.vibrateShort({ type: 'heavy' }), 100)

    // 闪光 120ms 后消失
    this._defeatFlashTimer = this.trackTimeout(() => {
      this.setData({ showDefeatFlash: false })
    }, 120)

    // 冲击波 900ms 后消失
    this._shockwaveTimer = this.trackTimeout(() => {
      this.setData({ showShockwave: false })
    }, 900)

    // KO 大字 1.5s 后消失
    this._koTextTimer = this.trackTimeout(() => {
      this.setData({ showKoText: false })
    }, 1500)

    // 碎片 1.2s 后消失
    this._debrisTimer = this.trackTimeout(() => {
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
    this._minionDefeatTimer = this.trackTimeout(() => {
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
    this._minionEffectTimer = this.trackTimeout(() => {
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

  // 记录"下一次刷牙开场"要展示的胜利+场景变化提示
  // 不在战斗结束当场弹对话/弹窗，避免打断完成页交互；由下次 showStoryStartDialog 消费
  _queueSceneNotice() {
    const { currentChapter, currentEnemy } = this.data
    const base = { enemyName: currentEnemy.name, enemyEmoji: currentEnemy.emoji }
    const progress = util.getStoryProgress()
    if ((progress.round || 1) > this.data.round) {
      childStorage.set('brushingSceneNotice', { ...base, type: 'round', round: progress.round || 1 })
    } else {
      const nextChapter = CHAPTERS.find(c => c.id === progress.currentChapter)
      if (nextChapter && nextChapter.id > currentChapter.id) {
        childStorage.set('brushingSceneNotice', {
          ...base, type: 'chapter', id: nextChapter.id, name: nextChapter.name, emoji: nextChapter.emoji
        })
      }
    }
  },

  // 恢复中途退出的进度
  restoreProgress(progress) {
    this._totalTime = progress.totalTime || 120
    // 区域计时已并入主计时器：已用秒数由剩余时间推导，保证两者一致
    this._elapsed = Math.max(0, this._totalTime - (progress.remainingTime || this._totalTime))

    this._areaDuration = Math.floor(this._totalTime / BRUSH_AREAS.length)

    // 区域索引以主计时器推导值为准：旧版双计时器存档可能漂移，
    // 推导值领先存档时按推导值校正，避免恢复后首个 tick 跳过中间区域的完成结算
    const derivedIndex = Math.min(Math.floor(this._elapsed / this._areaDuration), BRUSH_AREAS.length - 1)
    const savedIndex = Math.min(Math.max(progress.currentAreaIndex || 0, 0), BRUSH_AREAS.length - 1)
    const restoredIndex = Math.max(derivedIndex, savedIndex)
    let completedAreas = progress.completedAreas || []
    if (derivedIndex > savedIndex) {
      const derivedNames = BRUSH_AREAS.slice(0, derivedIndex).map(a => a.name)
      const extraNames = completedAreas.filter(n => !derivedNames.includes(n))
      completedAreas = [...derivedNames, ...extraNames]
    }

    // 恢复牙刷位置（使用与 updateToothbrushPosition 相同的坐标）
    const toothbrushPositions = [
      { x: 15, y: 25, rotation: 135 },   // 左上
      { x: 50, y: 15, rotation: 180 },   // 上中
      { x: 85, y: 25, rotation: 225 },   // 右上
      { x: 85, y: 75, rotation: 315 },   // 右下
      { x: 50, y: 85, rotation: 0 },     // 下中
      { x: 15, y: 75, rotation: 45 }     // 左下
    ]
    const toothbrushPos = toothbrushPositions[restoredIndex] || toothbrushPositions[0]

    const currentArea = BRUSH_AREAS[restoredIndex] || BRUSH_AREAS[0]

    this.setData({
      isRunning: false,
      isPaused: true,
      isCompleted: false,
      selectedDuration: progress.selectedDuration || this._totalTime,
      remainingTime: progress.remainingTime,
      minutes: Math.floor(progress.remainingTime / 60).toString().padStart(2, '0'),
      seconds: (progress.remainingTime % 60).toString().padStart(2, '0'),
      overallProgress: Math.round(((this._totalTime - progress.remainingTime) / this._totalTime) * 100),
      currentAreaIndex: restoredIndex,
      currentArea: currentArea,
      areaRemaining: progress.areaRemaining || this._areaDuration,
      completedAreas: completedAreas,
      brushPoints: progress.brushPoints || 0,
      stage: 'brushing',
      toothZones: progress.toothZones || [],
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
      childStorage.set('brushingProgress', progress)
    }

    // 统一清理：主计时器 + 所有登记定时器 + 战斗管理器内部定时器
    this.clearTimers()
    this.clearTrackedTimers()
    this.battleManager.destroy()
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
    this.trackTimeout(() => {
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

  // 刷牙后贴纸装饰：点击贴纸按钮添加（由 victory-panel 组件事件触发）
  onTapSticker(e) {
    if (this.data.stage !== 'post') return
    const stickerId = e.detail.id
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

  // 删除贴纸（由 victory-panel 组件事件触发）
  onDeleteSticker(e) {
    const stickerId = e.detail.id
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

  // 删除照片（由 victory-panel 组件事件触发）
  deletePhoto(e) {
    const index = e.detail.index
    const photos = this.data.photos.slice()
    photos.splice(index, 1)
    this.setData({ photos })
  },

  // 预览照片（由 victory-panel 组件事件触发）
  previewPhoto(e) {
    const index = e.detail.index
    previewImage(this.data.photos[index], this.data.photos)
  },

  // 编辑照片（由 victory-panel 组件事件触发）
  editPhoto(e) {
    const path = e.detail.path
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
    this._zoneCleanTimers.forEach(t => this.untrack(t))
    this._zoneCleanTimers = []
    zones.forEach((zone, index) => {
      if (zone.state === 'clean' && zone.germs.length > 0) {
        const timer = this.trackTimeout(() => {
          const fresh = this.data.toothZones.map((z, i) =>
            i === index ? { ...z, germs: [] } : z
          )
          this.setData({ toothZones: fresh })
        }, 700)
        this._zoneCleanTimers.push(timer)
      }
    })
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
  // 选择牙刷皮肤（由 pre-battle-panel 组件事件触发）
  selectSkin(e) {
    const skinId = e.detail.id
    const skin = TOOTHBRUSH_SKINS.find(s => s.id === skinId)
    if (!skin) return

    // 切皮肤时同步更新整页背景（保留时段主题做兜底）
    const fallbackBg = (THEMES[this.data.timeOfDay] || THEMES.morning).bg

    this.setData({
      selectedSkinId: skinId,
      currentSkin: skin,
      themeBg: skin.bgGradient || fallbackBg
    })

    // 保存选择到本地
    wx.setStorageSync('brushingSkinId', skinId)
    wx.vibrateShort({ type: 'light' })
  },

  // 选择刷牙时长（由 pre-battle-panel 组件事件触发）
  selectDuration(e) {
    const sec = e.detail.sec
    this.setData({ selectedDuration: sec })
  },

  startTimer() {
    if (this._starting) return // 防重入：入场动画期间忽略重复点击
    this._starting = true
    // 随机选择一种出场动画
    const entranceAnim = ENTRANCE_ANIMATIONS[Math.floor(Math.random() * ENTRANCE_ANIMATIONS.length)]
    const p = entranceAnim.phases

    // 先播放怪物出场动画，动画结束后再真正开始计时
    this.setData({ showEnemyEntrance: true, entrancePhase: 1, entranceClass: entranceAnim.className })
    wx.vibrateShort({ type: 'heavy' })

    // 阶段2: VS 出现
    this._entranceTimer1 = this.trackTimeout(() => {
      this.setData({ entrancePhase: 2 })
      wx.vibrateShort({ type: 'medium' })
    }, p.phase2)

    // 阶段3: 怪物登场
    this._entranceTimer2 = this.trackTimeout(() => {
      this.setData({ entrancePhase: 3 })
      wx.vibrateLong()
    }, p.phase3)

    // 阶段4: 名字展示
    this._entranceTimer3 = this.trackTimeout(() => {
      this.setData({ entrancePhase: 4 })
      wx.vibrateShort({ type: 'heavy' })
    }, p.phase4)

    // 阶段5: 动画结束，正式开始战斗
    this._entranceTimer4 = this.trackTimeout(() => {
      this.setData({ showEnemyEntrance: false, entrancePhase: 0, entranceClass: '' })
      this._doStartBattle()
    }, p.end)
  },

  // 真正开始战斗（出场动画结束后调用）
  _doStartBattle() {
    this._totalTime = this.data.selectedDuration
    this._usedDuration = null
    this._chapterAdvanced = false
    const areaDuration = Math.floor(this._totalTime / BRUSH_AREAS.length)
    this._areaDuration = areaDuration

    const min = Math.floor(this._totalTime / 60).toString().padStart(2, '0')
    const sec = (this._totalTime % 60).toString().padStart(2, '0')

    this.setData({
      isRunning: true, isPaused: false, isCompleted: false,
      remainingTime: this._totalTime, overallProgress: 0,
      currentAreaIndex: 0, currentArea: BRUSH_AREAS[0],
      completedAreas: [],
      areaRemaining: areaDuration,
      ringColor: '#FF9AAB',
      rewardStars: [false, false, false, false, false],
      currentRewardText: REWARD_TEXTS[0],
      minutes: min, seconds: sec,
      stage: 'brushing',
      placedStickers: [],
      showStickerPicker: false,
      lastBrushPoints: 0
    })

    this._elapsed = 0
    beep.playBeep('start')

    // 每场战斗随机选择一个战场特效
    const battlefieldEffect = BATTLEFIELD_EFFECTS[Math.floor(Math.random() * BATTLEFIELD_EFFECTS.length)]

    this.setData({ battlefieldClass: battlefieldEffect.className })

    // 重置颜色模式
    this._ringModeIndex = 0

    // 初始化牙齿6区细菌
    this.initToothZones()
    // 开始刷牙后，第一个区域标记为当前
    this.updateZoneStates()
    // 牙刷位置就位
    this.updateToothbrushPosition()
    // 生成小怪物
    this.generateMinions()

    this._starting = false // isRunning 已置位，解除防重入
    this.startMainTimer()
  },

  startMainTimer() {
    // 单一计时器 + 单一 _elapsed 计数：剩余时间、总进度、敌人HP、区域推进全部由它推导，
    // 消除原先主/区域双 interval 各自计数导致的漂移
    if (this._timer) clearInterval(this._timer) // 兜底：防止旧 interval 未清导致双开
    this._timer = setInterval(() => {
      this._elapsed = (this._elapsed || 0) + 1
      const remaining = this._totalTime - this._elapsed

      if (remaining <= 0) {
        this.completeTimer()
        return
      }

      const overallProgress = Math.round((this._elapsed / this._totalTime) * 100)

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

      beep.playBeep('tick')
      if (remaining <= 10) beep.playBeep('countdown')

      const min = Math.floor(remaining / 60).toString().padStart(2, '0')
      const sec = (remaining % 60).toString().padStart(2, '0')

      // 持续扣减敌人血量（HP 唯一数据源：按已用时间计算）
      const { currentEnemy } = this.data
      const updateData = {
        remainingTime: remaining, minutes: min, seconds: sec,
        overallProgress, ringColor, rewardStars,
        currentRewardText: REWARD_TEXTS[Math.min(starIndex, REWARD_TEXTS.length - 1)]
      }

      if (currentEnemy && this.data.enemyCurrentHp > 0) {
        // H7：向上取整到 0.1——四舍五入会在最后一秒提前归零、错过 KO 特效
        const newHp = Math.ceil(Math.max(0, currentEnemy.hp * (1 - this._elapsed / this._totalTime)) * 10) / 10
        const hpRatio = newHp / currentEnemy.hp
        const enemyScale = 0.5 + hpRatio * 0.8
        const enemyAngry = hpRatio < BATTLE_CONFIG.ENEMY_ANGER_THRESHOLD
        updateData.enemyCurrentHp = newHp
        updateData.enemyAngry = enemyAngry
        updateData.isEnemyDefeated = newHp <= 0
        updateData.enemyScale = enemyScale
      }

      // H7：先取上一拍状态再 setData（setData 同步改 this.data，
      // 原 `!this.data.isEnemyDefeated` 恒 false 导致特效永不触发）
      const wasDefeatedBeforeTick = this.data.isEnemyDefeated
      this.setData(updateData)

      // 敌人被击败 → 全套视觉冲击特效
      if (updateData.isEnemyDefeated && !wasDefeatedBeforeTick) {
        this.triggerEnemyDefeatEffects()
      }

      // 区域推进：由 _elapsed 推导当前区域，跨过边界时结算上一区域
      const nextIndex = Math.min(Math.floor(this._elapsed / this._areaDuration), BRUSH_AREAS.length - 1)
      if (nextIndex > this.data.currentAreaIndex) {
        this.onAreaComplete(nextIndex)
      } else {
        this.setData({ areaRemaining: this._areaDuration - (this._elapsed % this._areaDuration) })
      }
    }, 1000)
  },

  // 一个刷牙区域完成：结算积分/提示，并推进到下一区域（由主计时器按 _elapsed 推导触发）
  onAreaComplete(nextIndex) {
    const completedAreas = [...this.data.completedAreas, this.data.currentArea.name]

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
    this._pointsTipTimer = this.trackTimeout(() => {
      this.setData({ showPoints: false, showTip: false })
    }, 2500)

    // ===== 主线故事：触发攻击（视觉表现，HP 由主计时器统一扣减）=====
    const { currentEnemy, isEnemyDefeated, minions, showMinions } = this.data
    if (currentEnemy && !isEnemyDefeated) {
      // 检查是否还有小怪物
      const aliveMinions = minions.filter(m => !m.defeated && !m.defeating)

      // 攻击小怪物（如果有的话）
      if (showMinions && aliveMinions.length > 0) {
        this.attackMinion()
      }

      // 伤害数字按该区域实际时长对应的时间扣血量显示，与 HP 条一致
      const areaDamage = Math.round(currentEnemy.hp * (this._areaDuration / this._totalTime) * 10) / 10
      const attackResult = this.triggerAttackAnimation(areaDamage)

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
      this._attackPointsTimer = this.trackTimeout(() => {
        this.setData({ showPoints: false })
      }, 2000)
    }

    beep.playBeep('areaChange')
    this.setData({
      completedAreas, currentAreaIndex: nextIndex,
      currentArea: BRUSH_AREAS[nextIndex],
      areaRemaining: this._areaDuration
    }, () => {
      this.updateZoneStates()
      this.updateToothbrushPosition()
    })
  },

  pauseTimer() {
    clearInterval(this._timer)
    this._timer = null
    this.setData({ isRunning: false, isPaused: true })
  },

  resumeTimer() {
    this.setData({ isRunning: true, isPaused: false })
    this.startMainTimer()
  },

  // 提前完成（按已刷区域数计算评分）
  finishEarly() {
    const completedCount = this.data.completedAreas.length
    if (completedCount === 0) {
      wx.showToast({ title: '至少刷一个区域吧~', icon: 'none' })
      return
    }
    wx.showModal({
      title: '提前结束战斗？',
      content: '将按当前进度结算积分',
      confirmText: '结束',
      cancelText: '继续战斗',
      success: (res) => {
        if (res.confirm && !this.data.isCompleted) {
          this.completeTimer()
        }
      }
    })
  },

  resetTimer() {
    // 已有进度时，重新开始属于破坏性操作，需二次确认
    const hasProgress = this.data.isPaused || this.data.completedAreas.length > 0 || (this._elapsed || 0) > 0
    if (hasProgress) {
      wx.showModal({
        title: '重新开始？',
        content: '将清空本轮刷牙进度',
        confirmText: '重新开始',
        cancelText: '取消',
        success: (res) => {
          if (res.confirm) {
            this._doReset()
          }
        }
      })
      return
    }
    this._doReset()
  },

  _doReset() {
    // 统一清理：主计时器 + 所有登记的特效/动画定时器（含彩虹模式 interval）
    this.clearTimers()
    this.clearTrackedTimers()
    this._ringModeIndex = 0
    this._usedDuration = null
    this.setData({
      isRunning: false, isPaused: false, isCompleted: false,
      remainingTime: this._totalTime, minutes: '02', seconds: '00',
      overallProgress: 0, currentAreaIndex: 0, currentArea: BRUSH_AREAS[0],
      completedAreas: [],
      areaRemaining: 20, ringColor: '#FF9AAB',
      rewardStars: [false, false, false, false, false],
      currentRewardText: '准备开始！',
      completedStarsArr: [], completedText: '', confetti: [],
      brushPoints: 0, totalDirtyCleaned: 0,
      showPoints: false, showTip: false,
      toothZones: [],
      comboCount: 0, showCombo: false, enemyAngry: false,
      // 重置故事战斗状态：否则胜利后重开会带着 HP=0 开局（全程无攻击特效）并重复推进章节
      enemyCurrentHp: this.data.currentEnemy ? this.data.currentEnemy.hp : 0,
      isEnemyDefeated: false, enemyScale: 1.3,
      // 暴击状态必须重置：否则上次暴击残留 showCriticalEffect/critAnim，
      // 下次暴击时 wx:if 条件不变、节点不重建，全屏特效不会重播
      isCritical: false, isCriticalHit: false, showCriticalEffect: false,
      critAnim: null, critEnemyAnim: '', critName: '',
      showDefeatFlash: false, showShockwave: false, showKoText: false,
      enemyDebris: [], fireworkParticles: [],
      battlefieldClass: '', showSlash: false, showHitRing: false,
      showBeam: false, showAttackCry: false, showScreenShake: false,
      showEnemyEntrance: false, entrancePhase: 0, entranceClass: '',
      critFullscreenParticles: []
    })
    this._elapsed = 0
    // 重置小怪物
    this.resetMinions()
    // 重置牙齿区域
    this.initToothZones()
  },

  completeTimer() {
    // 防重入："提前结束"弹窗未关闭时倒计时归零，会先后触发两次
    if (this.data.isCompleted) return
    // 统一清理：主计时器 + 所有登记的特效/动画定时器
    this.clearTimers()
    this.clearTrackedTimers()
    // 先捕获实际刷牙时长（下方会把 remainingTime 归零用于显示，之后无法再推算）
    // 自然结束（剩余≤1s）按满时长计；提前结束按时长-剩余计
    this._usedDuration = this.data.remainingTime <= 1
      ? this._totalTime
      : this._totalTime - this.data.remainingTime
    beep.playBeep('complete')
    this.generateConfetti()

    // 时间到，确保当前正在刷的最后一个区域也被标记为已完成
    const { currentAreaIndex, currentArea, completedAreas, toothZones } = this.data
    if (currentArea && !completedAreas.includes(currentArea.name)) {
      const finishedZone = toothZones.find(z => z.index === currentAreaIndex)
      const germBonus = finishedZone ? finishedZone.germs.length * BATTLE_CONFIG.GERM_BONUS_POINTS : 0
      const areaPoints = BATTLE_CONFIG.AREA_COMPLETE_POINTS + germBonus
      const newPoints = this.data.brushPoints + areaPoints
      const newCleaned = this.data.totalDirtyCleaned + (finishedZone ? finishedZone.germs.length : 0)
      const updatedAreas = [...completedAreas, currentArea.name]

      // 对最后一个区域触发攻击动画（防双攻击：若本秒区域完成时刚攻击过，跳过，避免毫秒级双攻击导致暴击特效异常）
      const { currentEnemy, isEnemyDefeated, minions, showMinions } = this.data
      if (currentEnemy && !isEnemyDefeated && Date.now() - (this._lastAttackTime || 0) > 1500) {
        const aliveMinions = minions.filter(m => !m.defeated && !m.defeating)
        if (showMinions && aliveMinions.length > 0) {
          this.attackMinion()
        }
        const areaDamage = Math.round(currentEnemy.hp * (this._areaDuration / this._totalTime) * 10) / 10
        this.triggerAttackAnimation(areaDamage)
      }

      this.setData({
        completedAreas: updatedAreas,
        brushPoints: newPoints,
        totalDirtyCleaned: newCleaned,
        areaRemaining: 0
      })
      this.updateZoneStates()
    }

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
    // 星级与保存记录（saveBrushingRecord）、分享文案共用同一算法，确保结束页与统计页一致
    const stars = this._calcStars(completedCount)
    // 顶部进度星星行仅自然结束时补满：提前结束保留 tick 已写入的进度星（与实际刷了多久一致），
    // 避免出现"顶部5星、胜利行/记录分却只有2-4星"的新不一致
    const naturalEnd = this.data.remainingTime <= 1

    // 检查是否有连续天数的特殊称号
    const specialTitle = this.getSpecialTitle()
    const dirtyBonus = this.data.totalDirtyCleaned > 0
      ? `，刷掉了${this.data.totalDirtyCleaned}个脏东西！`
      : ''

    // 故事相关文本
    const { currentEnemy } = this.data
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
    childStorage.remove('brushingProgress')

    // 确保所有已刷区域状态为 clean
    this.updateZoneStates()

    this.setData({
      isRunning: false, isPaused: false, isCompleted: true, overallProgress: 100,
      remainingTime: 0, minutes: '00', seconds: '00',
      ringColor: '#81C784',
      // 自然完成时最后一秒 tick 因 remaining<=0 提前 return，进度星星停在 99% 的 4 颗，需补满
      rewardStars: naturalEnd ? [true, true, true, true, true] : this.data.rewardStars,
      currentRewardText: naturalEnd ? REWARD_TEXTS[REWARD_TEXTS.length - 1] : this.data.currentRewardText,
      completedStarsArr: Array(stars).fill(0),
      completedText: completedText,
      stage: 'post',
      showStickerPicker: true,
      lastBrushPoints: this.data.brushPoints
    })

    // ===== 主线故事：章节推进 =====
    // 推进（defeatEnemy）在完成时立即持久化；胜利对话/解锁弹窗均不在当场弹出
    // （避免打断完成页贴贴纸/拍照交互），改为记录通知由下次开场对话展示
    const { currentChapter } = this.data
    if (currentChapter && currentEnemy && !this._chapterAdvanced) {
      util.defeatEnemy(currentEnemy.id, currentChapter.id)
      this._chapterAdvanced = true
      this._queueSceneNotice()

      const progress = util.getStoryProgress()
      this.setData({
        isEnemyDefeated: true,
        enemyCurrentHp: 0,
        round: progress.round || 1
      })
      // 击败烟花庆祝
      this.triggerDefeatFirework()
    }
  },

  // 完成刷牙（用户点击完成按钮）
  async onDoneBrushing() {
    if (!this._recordSaved) {
      await this.saveBrushingRecord()
      this._recordSaved = true
    }
    // 跳转到统计页（用 redirectTo 替换当前页，返回时直接回主页）
    wx.redirectTo({
      url: '/packageHabits/pages/habits/brushing-stats/brushing-stats'
    })
  },

  // 星级统一算法（1-5 分制）：结束页显示、保存记录、分享文案共用
  // 必须与 saveBrushingRecord 的 score 保持同一实现，否则结束页星数与统计页记录不一致
  _calcStars(areaCount) {
    return areaCount >= 6 ? 5 : areaCount >= 4 ? 4 : areaCount >= 2 ? 3 : areaCount >= 1 ? 2 : 1
  },

  // 保存刷牙记录到本地和云端
  async saveBrushingRecord() {
    // 用同步方式持久化照片到本地存储，避免临时路径失效后再次进入不显示；
    // 同步复制保证 onUnload 调用时本地记录也立即保存完成，首页刷新一定能读到
    const persistentPhotos = []
    for (const p of this.data.photos) {
      try {
        persistentPhotos.push(util.saveImageToPersistentSync(p, 'brushing'))
      } catch (e) {
        console.warn('照片持久化失败，保留原路径:', p, e)
        persistentPhotos.push(p)
      }
    }

    // 根据完成区域数计算评分（1-5分制，与结束页星级共用 _calcStars）
    const areaCount = this.data.completedAreas.length
    const score = this._calcStars(areaCount)

    // 计算经验值（完成时已捕获实际时长，避免 remainingTime 归零后无法推算）
    const duration = this._usedDuration != null
      ? this._usedDuration
      : this._totalTime - this.data.remainingTime
    const expGained = util.calcExpGain({
      completedAreas: this.data.completedAreas,
      duration: duration
    })

    // 添加角色经验并检查升级
    const avatarResult = util.addAvatarExp(expGained)

    // 如果升级了，显示升级提示
    if (avatarResult.levelUp) {
      this.trackTimeout(() => {
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
      imagePath: persistentPhotos[0] || null,
      images: persistentPhotos || [],
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
        this.trackTimeout(() => {
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
  },

  // ===== 统一定时器管理 =====
  // 页面内所有 setTimeout/setInterval（主计时器 _timer 除外）统一登记，
  // onUnload/_doReset/completeTimer 时 clearTrackedTimers() 一次性清理，
  // 避免定时器泄漏和页面销毁后 setData
  trackTimeout(fn, ms) {
    if (!this._trackedTimeouts) this._trackedTimeouts = new Set()
    const id = setTimeout(() => {
      this._trackedTimeouts.delete(id)
      if (this._isDestroyed) return
      fn()
    }, ms)
    this._trackedTimeouts.add(id)
    return id
  },

  trackInterval(fn, ms) {
    if (!this._trackedIntervals) this._trackedIntervals = new Set()
    const id = setInterval(() => {
      if (this._isDestroyed) {
        clearInterval(id)
        this._trackedIntervals.delete(id)
        return
      }
      fn()
    }, ms)
    this._trackedIntervals.add(id)
    return id
  },

  untrack(id) {
    clearTimeout(id)
    clearInterval(id)
    if (this._trackedTimeouts) this._trackedTimeouts.delete(id)
    if (this._trackedIntervals) this._trackedIntervals.delete(id)
  },

  clearTrackedTimers() {
    if (this._trackedTimeouts) {
      this._trackedTimeouts.forEach(t => clearTimeout(t))
      this._trackedTimeouts.clear()
    }
    if (this._trackedIntervals) {
      this._trackedIntervals.forEach(t => clearInterval(t))
      this._trackedIntervals.clear()
    }
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
    // 持久化音效开关，下次进入时恢复
    const settings = childStorage.get('gameSettings') || {}
    settings.soundEnabled = enabled
    childStorage.set('gameSettings', settings)
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
      this.untrack(this._ringColorTimer)
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
      this._ringColorTimer = this.trackInterval(() => {
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
    const score = this._calcStars(this.data.completedAreas.length)
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
