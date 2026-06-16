const util = require('../../utils/util.js')
const audio = require('../../utils/audio.js')
const beep = require('../../utils/beep.js')
const cloud = require('../../utils/cloud.js')

const BRUSH_AREAS = [
  { name: '左上', emoji: '🦷', duration: 20, color: '#FF9AAB' },
  { name: '上中', emoji: '🦷', duration: 20, color: '#FFB74D' },
  { name: '右上', emoji: '🦷', duration: 20, color: '#81C784' },
  { name: '右下', emoji: '🦷', duration: 20, color: '#4FC3F7' },
  { name: '下中', emoji: '🦷', duration: 20, color: '#BA68C8' },
  { name: '左下', emoji: '🦷', duration: 20, color: '#FF8A80' }
]

// 刷牙小知识（每完成一个区域显示一条）
const BRUSHING_TIPS = [
  '💡 刷牙要刷2分钟哦~',
  '💡 记得刷舌头表面~',
  '💡 上下刷比左右刷更好~',
  '💡 饭后30分钟刷牙最好~',
  '💡 用温水刷牙更舒服~',
  '💡 别忘了刷里面的牙齿~'
]

// 早上和晚上的不同主题（粉色为主色调）
const THEMES = {
  morning: {
    bg: 'linear-gradient(180deg, #FFE4EC 0%, #FFF0F5 30%, #FFF5F8 60%, #FFEEF2 100%)',
    greeting: '☀️ 早上好，钰婷！',
    emoji: '🌞',
    tip: '新的一天从刷牙开始~'
  },
  evening: {
    bg: 'linear-gradient(180deg, #F8E8EE 0%, #FFF0F5 30%, #FFF5F8 60%, #F5E6EE 100%)',
    greeting: '🌙 晚上好，钰婷！',
    emoji: '🌜',
    tip: '刷完牙睡觉，牙齿更健康~'
  }
}

const REWARD_TEXTS = ['准备开始！', '刷得好认真～', '继续加油！', '越来越棒！', '快完成啦！', '太完美了！']
const COMPLETED_TEXTS = [
  '牙齿变得好白好亮！✨',
  '刷得干干净净，真厉害！💪',
  '小牙齿在说谢谢钰婷！🦷',
  '今天又是棒棒的一天！🌈'
]
const CHEER_LEFT = ['加油', '好棒', '厉害', '继续', '加油', '棒棒']
const CHEER_RIGHT = ['真乖', '认真', '好快', '漂亮', '太强', '赞赞']

// 进度条颜色模式
const RING_MODES = [
  { name: '默认', colors: ['#FF9AAB', '#FFB74D', '#81C784'] },
  { name: '彩虹', colors: ['#FF6B8A', '#FFB74D', '#FFEB3B', '#81C784', '#4FC3F7', '#BA68C8', '#FF4081'] },
  { name: '海洋', colors: ['#4FC3F7', '#29B6F6', '#0288D1', '#01579B', '#00BCD4'] },
  { name: '森林', colors: ['#81C784', '#66BB6A', '#4CAF50', '#388E3C', '#2E7D32'] },
  { name: '夕阳', colors: ['#FF9AAB', '#FF6B8A', '#FF4081', '#E91E63', '#C2185B'] },
  { name: '星空', colors: ['#BA68C8', '#9C27B0', '#7B1FA2', '#6A1B9A', '#4A148C'] },
  { name: '糖果', colors: ['#FF9AAB', '#FFB6C1', '#FF69B4', '#FF1493', '#DB7093'] },
  { name: '金色', colors: ['#FFD700', '#FFC107', '#FF9800', '#FF5722', '#E64A19'] }
]

// 公主鼓励语（随机出现在动物气泡中）
const PRINCESS_CHEER = [
  { emoji: '👑', text: '艾莎说：你很棒！' },
  { emoji: '❄️', text: '冰雪奇缘加油！' },
  { emoji: '👸', text: '小公主加油！' },
  { emoji: '🦄', text: '独角兽说：真厉害！' },
  { emoji: '🐷', text: '佩奇说：太棒了！' },
  { emoji: '🐽', text: '乔治说：哇哦~' },
  { emoji: '🏰', text: '城堡里的公主~' },
  { emoji: '✨', text: '魔法闪闪亮~' }
]

// 公主角色列表（真正出现在界面上的）
const PRINCESS_CHARACTERS = [
  // 小猪佩奇家族
  { id: 'peppa', emoji: '🐷', name: '佩奇', bubble: '刷得真棒！', color: '#FFB6C1' },
  { id: 'george', emoji: '🐽', name: '乔治', bubble: '加油加油！', color: '#FFB6C1' },
  { id: 'dinosaur', emoji: '🦕', name: '乔治的恐龙', bubble: '刷得好认真！', color: '#98FB98' },
  { id: 'daddy_pig', emoji: '🐽', name: '猪爸爸', bubble: '宝贝真棒！', color: '#FFB6C1' },
  { id: 'mummy_pig', emoji: '🐽', name: '猪妈妈', bubble: '继续加油哦！', color: '#FFB6C1' },
  { id: 'suzy', emoji: '🐑', name: '小羊苏西', bubble: '刷得真干净！', color: '#FFFFFF' },
  { id: 'danny', emoji: '🐶', name: '小狗丹尼', bubble: '好厉害呀！', color: '#DEB887' },
  { id: 'emily', emoji: '🐘', name: '小象艾米丽', bubble: '越来越棒！', color: '#D3D3D3' },

  // 迪士尼公主
  { id: 'elsa', emoji: '👸', name: '艾莎', bubble: '刷得闪闪亮！', color: '#87CEEB' },
  { id: 'anna', emoji: '👸', name: '安娜', bubble: '加油小公主！', color: '#FFB74D' },
  { id: 'rapunzel', emoji: '👸', name: '乐佩', bubble: '牙齿好白呀！', color: '#FFD700' },
  { id: 'ariel', emoji: '🧜‍♀️', name: '爱丽儿', bubble: '刷得真认真！', color: '#4FC3F7' },
  { id: 'belle', emoji: '👸', name: '贝儿', bubble: '好棒好棒！', color: '#FFD700' },
  { id: 'cinderella', emoji: '👸', name: '灰姑娘', bubble: '继续加油！', color: '#87CEEB' },
  { id: 'snow_white', emoji: '👸', name: '白雪公主', bubble: '刷得真干净！', color: '#FFB6C1' },

  // 可爱动物
  { id: 'unicorn', emoji: '🦄', name: '独角兽', bubble: '闪闪发光！', color: '#DDA0DD' },
  { id: 'butterfly', emoji: '🦋', name: '蝴蝶仙子', bubble: '翩翩起舞！', color: '#98FB98' },
  { id: 'fairy', emoji: '🧚', name: '花仙子', bubble: '花花世界！', color: '#FF9AAB' },
  { id: 'bunny', emoji: '🐰', name: '小白兔', bubble: '蹦蹦跳跳！', color: '#FFFFFF' },
  { id: 'kitty', emoji: '🐱', name: '小猫咪', bubble: '喵喵加油！', color: '#FFB74D' },
  { id: 'puppy', emoji: '🐶', name: '小狗狗', bubble: '汪汪加油！', color: '#DEB887' },
  { id: 'bear', emoji: '🐻', name: '小熊', bubble: '抱抱加油！', color: '#8B4513' },
  { id: 'panda', emoji: '🐼', name: '大熊猫', bubble: '竹子加油！', color: '#000000' },
  { id: 'koala', emoji: '🐨', name: '考拉', bubble: '呼呼加油！', color: '#A9A9A9' },

  // 海洋生物
  { id: 'mermaid', emoji: '🧜‍♀️', name: '美人鱼', bubble: '海底加油！', color: '#4FC3F7' },
  { id: 'fish', emoji: '🐠', name: '小丑鱼', bubble: '游啊游加油！', color: '#FF6347' },
  { id: 'dolphin', emoji: '🐬', name: '海豚', bubble: '跳跃加油！', color: '#4FC3F7' },
  { id: 'turtle', emoji: '🐢', name: '小海龟', bubble: '慢慢加油！', color: '#3CB371' },
  { id: 'starfish', emoji: '⭐', name: '海星星', bubble: '闪闪加油！', color: '#FFEB3B' },

  // 其他可爱角色
  { id: 'princess', emoji: '👑', name: '小公主', bubble: '加油加油！', color: '#FFD700' },
  { id: 'angel', emoji: '👼', name: '小天使', bubble: '祝福加油！', color: '#FFFFFF' },
  { id: 'fairy2', emoji: '✨', name: '魔法精灵', bubble: '魔法加油！', color: '#FFEB3B' },
  { id: 'clown', emoji: '🤡', name: '小丑', bubble: '哈哈加油！', color: '#FF6347' },
  { id: 'robot', emoji: '🤖', name: '机器人', bubble: '滴滴加油！', color: '#A9A9A9' },
  { id: 'astronaut', emoji: '👨‍🚀', name: '宇航员', bubble: '飞向太空！', color: '#FFFFFF' },
  { id: 'ninja', emoji: '🥷', name: '小忍者', bubble: '嘿哈加油！', color: '#2F4F4F' }
]

const BUBBLE_LIST = [
  { x: 15, delay: 0, size: 28, emoji: '🫧' },
  { x: 30, delay: 0.4, size: 22, emoji: '✨' },
  { x: 50, delay: 0.8, size: 26, emoji: '💫' },
  { x: 70, delay: 1.2, size: 20, emoji: '🫧' },
  { x: 85, delay: 0.6, size: 24, emoji: '⭐' },
  { x: 40, delay: 1.5, size: 18, emoji: '🌟' },
  { x: 60, delay: 1.8, size: 22, emoji: '💖' },
  { x: 25, delay: 2.0, size: 20, emoji: '🫧' }
]

// 刷牙前小游戏：可点击赶走的脏东西（避免把人脸和虫/菌组合在一起）
const PRE_GERM_TYPES = [
  { emoji: '🦠', name: '小细菌', points: 3 },
  { emoji: '🐛', name: '小虫虫', points: 3 },
  { emoji: '👾', name: '小菌斑', points: 3 },
  { emoji: '🍬', name: '小糖糖', points: 2 }
]

// 刷牙后贴纸装饰
const STICKERS = [
  { id: 'crown', emoji: '👑' },
  { id: 'bow', emoji: '🎀' },
  { id: 'flower', emoji: '🌸' },
  { id: 'heart', emoji: '💖' },
  { id: 'star', emoji: '⭐' },
  { id: 'gem', emoji: '💎' }
]

// 女孩喜欢的泡泡元素（刷牙时随机出现）
const GIRL_BUBBLES = ['👑', '👸', '🦄', '🐷', '🦋', '🌸', '💖', '💝', '💕', '💗', '✨', '⭐', '🌟', '💫', '🎀', '🎊']

// 牙齿分区上的细菌类型（不需要点击，随区域自动被刷掉）
const ZONE_GERM_TYPES = ['🦠', '🍬', '🍭', '🍰', '🐛', '👾']

Page({
  data: {
    statusBarHeight: 20,
    capsuleRight: 80,
    timeOfDay: 'morning',
    remainingTime: 120,
    minutes: '02',
    seconds: '00',
    isRunning: false,
    isPaused: false,
    isCompleted: false,
    overallProgress: 0,
    ringColor: '#FF9AAB',
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
    // 公主角色
    showPrincess: false,
    princessEmoji: '',
    princessName: '',
    princessBubble: '',
    princessColor: '#FFB6C1',
    princessX: 50,
    princessY: 50,
    // 刷牙陪伴小公主（固定右下角，始终显示）
    companionBubble: '一起刷牙吧~',
    // 主题
    themeBg: THEMES.morning.bg,
    // 刷牙小知识
    currentTip: '',
    showTip: false,
    // 积分
    brushPoints: 0,
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
    showStickerPicker: false
  },

  _timer: null,
  _areaTimer: null,
  _areaElapsed: 0,
  _cheerIndex: 0,
  _totalTime: 120,

  onLoad(options) {
    const timeOfDay = options.time || 'morning'
    const sysInfo = wx.getSystemInfoSync()
    let capsuleRight = 80
    try {
      const capsule = wx.getMenuButtonBoundingClientRect()
      capsuleRight = sysInfo.windowWidth - capsule.left + 8
    } catch (e) {}

    // 根据时间设置主题
    const theme = THEMES[timeOfDay] || THEMES.morning

    this.setData({
      statusBarHeight: sysInfo.statusBarHeight || 20,
      capsuleRight,
      timeOfDay,
      teethArea: BRUSH_AREAS,
      soundEnabled: audio.enabled,
      themeBg: theme.bg
    })

    // 初始化牙齿6区，让孩子一进来就看到要刷的牙齿
    this.initToothZones()
    // 初始化刷牙前小游戏：赶走瞌睡细菌
    this.initPreGame()

    beep.preload()
  },

  onUnload() {
    this.clearTimers()
    if (this._ringColorTimer) { clearInterval(this._ringColorTimer); this._ringColorTimer = null }
    if (this._princessTimer) { clearTimeout(this._princessTimer); this._princessTimer = null }
    if (this._princessRestoreTimer) { clearTimeout(this._princessRestoreTimer); this._princessRestoreTimer = null }
    if (this._cleanEffectTimer) { clearTimeout(this._cleanEffectTimer); this._cleanEffectTimer = null }
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

  // 初始化刷牙前小游戏：生成4个瞌睡细菌
  initPreGame() {
    const germs = []
    for (let i = 0; i < 4; i++) {
      const type = PRE_GERM_TYPES[Math.floor(Math.random() * PRE_GERM_TYPES.length)]
      germs.push({
        id: `pregerm_${i}_${Date.now()}`,
        emoji: type.emoji,
        name: type.name,
        points: type.points,
        x: 18 + Math.random() * 64,
        y: 28 + Math.random() * 44,
        fleeing: false
      })
    }
    this.setData({ dirtySpots: germs, stage: 'pre', showStickerPicker: false, placedStickers: [] })
  },

  // 点击刷牙前瞌睡细菌
  onTapPreGerm(e) {
    if (this.data.stage !== 'pre') return
    const id = e.currentTarget.dataset.id
    const spot = this.data.dirtySpots.find(s => s.id === id)
    if (!spot || spot.fleeing) return

    // 标记为逃跑
    const spots = this.data.dirtySpots.map(s => s.id === id ? { ...s, fleeing: true } : s)
    this.setData({ dirtySpots: spots })

    // 显示特效
    this.setData({
      showCleanEffect: true,
      cleanEffectText: '赶走啦！',
      cleanEffectX: spot.x,
      cleanEffectY: spot.y
    })
    if (this._cleanEffectTimer) clearTimeout(this._cleanEffectTimer)
    this._cleanEffectTimer = setTimeout(() => {
      this.setData({ showCleanEffect: false })
    }, 1200)

    // 700ms 后真正移除
    setTimeout(() => {
      const remaining = this.data.dirtySpots.filter(s => s.id !== id)
      this.setData({ dirtySpots: remaining })
      if (remaining.length === 0) {
        wx.showToast({ title: '🎉 细菌都赶走啦！', icon: 'none', duration: 1500 })
      }
    }, 700)
  },

  // 刷牙后贴纸装饰：点击贴纸按钮放置到牙齿上
  onTapSticker(e) {
    if (this.data.stage !== 'post') return
    const stickerId = e.currentTarget.dataset.id
    this.placeSticker(stickerId)
  },

  placeSticker(stickerId) {
    const sticker = STICKERS.find(s => s.id === stickerId)
    if (!sticker) return

    // 随机选择一个已刷干净的区域
    const cleanZones = this.data.toothZones
      .map((z, i) => ({ ...z, originalIndex: i }))
      .filter(z => z.state === 'clean')

    if (cleanZones.length === 0) return

    const zone = cleanZones[Math.floor(Math.random() * cleanZones.length)]
    const newSticker = {
      id: `sticker_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      stickerId: sticker.id,
      emoji: sticker.emoji,
      zoneIndex: zone.originalIndex,
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60
    }

    this.setData({
      placedStickers: [...this.data.placedStickers, newSticker]
    })

    // 可爱反馈
    wx.vibrateShort({ type: 'light' })
  },

  // 保存装饰好的牙齿纪念照到本地
  saveDecoration() {
    if (this.data.placedStickers.length === 0) {
      wx.showToast({ title: '先贴几个贴纸吧~', icon: 'none' })
      return
    }
    const decoration = {
      id: util.generateId(),
      date: util.getTodayStr(),
      timeOfDay: this.data.timeOfDay,
      stickers: this.data.placedStickers,
      points: this.data.brushPoints,
      createdAt: Date.now()
    }
    let decorations = wx.getStorageSync('toothDecorations') || []
    decorations.unshift(decoration)
    // 最多保留20张
    if (decorations.length > 20) decorations = decorations.slice(0, 20)
    wx.setStorageSync('toothDecorations', decorations)
    wx.showToast({ title: '保存成功！🎉', icon: 'none' })
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
    zones.forEach((zone, index) => {
      if (zone.state === 'clean' && zone.germs.length > 0) {
        setTimeout(() => {
          const fresh = this.data.toothZones.map((z, i) =>
            i === index ? { ...z, germs: [] } : z
          )
          this.setData({ toothZones: fresh })
        }, 700)
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

  // ===== 计时器 =====
  startTimer() {
    this._cheerIndex = 0
    this.setData({
      isRunning: true, isPaused: false, isCompleted: false,
      remainingTime: this._totalTime, overallProgress: 0,
      currentAreaIndex: 0, currentArea: BRUSH_AREAS[0],
      areaColor: BRUSH_AREAS[0].color, completedAreas: [],
      areaRemaining: 20,
      ringColor: '#FF9AAB',
      rewardStars: [false, false, false, false, false],
      currentRewardText: REWARD_TEXTS[0],
      minutes: '02', seconds: '00',
      stage: 'brushing',
      dirtySpots: [],
      placedStickers: [],
      showStickerPicker: false
    })

    this._areaElapsed = 0
    beep.playBeep('start')

    // 随机生成女孩风格泡泡
    const girlBubbles = BUBBLE_LIST.map((item, i) => ({
      ...item,
      emoji: Math.random() > 0.5 ? GIRL_BUBBLES[Math.floor(Math.random() * GIRL_BUBBLES.length)] : item.emoji
    }))
    this.setData({ bubbles: girlBubbles })

    // 初始化公主角色显示计数器
    this._princessCounter = 0
    this._lastPrincessTime = 0

    // 重置颜色模式
    this._ringModeIndex = 0

    // 初始化牙齿6区细菌
    this.initToothZones()
    // 开始刷牙后，第一个区域标记为当前
    this.updateZoneStates()
    // 陪伴小公主就位
    this.updateCompanion()

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

      // 随机触发公主鼓励（每6秒有概率出现）
      if (currentIndex === 0 && Math.random() > 0.5) {
        const princess = PRINCESS_CHEER[Math.floor(Math.random() * PRINCESS_CHEER.length)]
        this.setData({ leftCheer: princess.text })
        setTimeout(() => {
          this.setData({ leftCheer: CHEER_LEFT[currentIndex] })
        }, 2000)
      } else {
        this.setData({
          leftCheer: CHEER_LEFT[currentIndex],
          rightCheer: CHEER_RIGHT[currentIndex]
        })
      }

      // 随机显示公主角色（每15-20秒出现一次，持续5秒）
      // 已改为陪伴小公主常驻指示，随机彩蛋保留但降低频率
      this._princessCounter++
      if (this._princessCounter - this._lastPrincessTime >= 25 && Math.random() > 0.85) {
        this._lastPrincessTime = this._princessCounter
        this.showRandomPrincess()
      }

      beep.playBeep('tick')
      if (remaining <= 10 && remaining > 0) beep.playBeep('countdown')

      const min = Math.floor(remaining / 60).toString().padStart(2, '0')
      const sec = (remaining % 60).toString().padStart(2, '0')

      this.setData({
        remainingTime: remaining, minutes: min, seconds: sec,
        overallProgress, ringColor, rewardStars,
        currentRewardText: REWARD_TEXTS[Math.min(starIndex, REWARD_TEXTS.length - 1)]
      })
    }, 1000)
  },

  startAreaTimer() {
    const areaDuration = BRUSH_AREAS[this.data.currentAreaIndex].duration
    this._areaTimer = setInterval(() => {
      this._areaElapsed++
      const areaRemaining = areaDuration - this._areaElapsed

      if (this._areaElapsed >= areaDuration) {
        const completedAreas = [...this.data.completedAreas, this.data.currentArea.name]
        const nextIndex = this.data.currentAreaIndex + 1
        this._areaElapsed = 0

        // 增加积分：区域完成 +10，该区域内所有细菌每个 +5
        const finishedZone = this.data.toothZones.find(z => z.index === this.data.currentAreaIndex)
        const germBonus = finishedZone ? finishedZone.germs.length * 5 : 0
        const newPoints = this.data.brushPoints + 10 + germBonus
        const newCleaned = this.data.totalDirtyCleaned + (finishedZone ? finishedZone.germs.length : 0)
        const pointsText = germBonus > 0 ? `+${10 + germBonus} 积分！` : '+10 积分！'

        // 显示刷牙小知识
        const tipIndex = completedAreas.length - 1
        const tip = BRUSHING_TIPS[tipIndex % BRUSHING_TIPS.length]

        this.setData({
          brushPoints: newPoints,
          totalDirtyCleaned: newCleaned,
          showPoints: true,
          pointsText: pointsText,
          currentTip: tip,
          showTip: true
        })

        // 2秒后隐藏积分和提示
        setTimeout(() => {
          this.setData({ showPoints: false, showTip: false })
        }, 2500)

        if (nextIndex < BRUSH_AREAS.length) {
          beep.playBeep('areaChange')
          this.setData({
            completedAreas, currentAreaIndex: nextIndex,
            currentArea: BRUSH_AREAS[nextIndex], areaColor: BRUSH_AREAS[nextIndex].color,
            areaRemaining: BRUSH_AREAS[nextIndex].duration
          }, () => {
            this.updateZoneStates()
            this.updateCompanion()
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
      showPrincess: false,
      dirtySpots: [], brushPoints: 0, totalDirtyCleaned: 0,
      showCleanEffect: false, showPoints: false, showTip: false,
      toothZones: [],
      companionBubble: ''
    })
    this._areaElapsed = 0
    // 重置后回到刷牙前小游戏状态
    this.initToothZones()
    this.initPreGame()
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

    const completedCount = this.data.completedAreas.length
    let stars = Math.ceil((completedCount / BRUSH_AREAS.length) * 5)
    if (stars === 0) stars = 1

    // 检查是否有连续天数的特殊称号
    const specialTitle = this.getSpecialTitle()
    const dirtyBonus = this.data.totalDirtyCleaned > 0
      ? `，刷掉了${this.data.totalDirtyCleaned}个脏东西！`
      : ''
    const completedText = specialTitle
      ? specialTitle + dirtyBonus
      : COMPLETED_TEXTS[Math.floor(Math.random() * COMPLETED_TEXTS.length)] + dirtyBonus

    // 自动保存刷牙记录（核心数据打通）
    this.saveBrushingRecord()

    // 陪伴公主完成语
    this.setData({ companionBubble: '太棒啦！🎉' })

    // 清除所有脏东西
    this.setData({
      isRunning: false, isCompleted: true, overallProgress: 100,
      ringColor: '#81C784',
      completedStarsArr: Array(stars).fill(0),
      completedText: completedText,
      dirtySpots: [],
      stage: 'post',
      showStickerPicker: true
    })
  },

  // 保存刷牙记录到本地和云端
  saveBrushingRecord() {
    const record = {
      id: util.generateId(),
      date: util.getTodayStr(),
      timeOfDay: this.data.timeOfDay,
      imagePath: null,
      score: 100,
      note: '完成2分钟刷牙',
      points: this.data.brushPoints,
      completedAreas: this.data.completedAreas,
      createTime: new Date().toISOString(),
      fromTimer: true
    }

    // 先存本地，确保不丢数据
    util.saveBrushingRecord(record)

    // 后台尝试同步云端（失败自动降级本地）
    cloud.uploadBrushingRecord(record).catch(err => {
      console.warn('刷牙记录云端同步失败，已保留本地:', err)
    })
  },

  clearTimers() {
    if (this._timer) { clearInterval(this._timer); this._timer = null }
    if (this._areaTimer) { clearInterval(this._areaTimer); this._areaTimer = null }
  },

  // 关闭庆祝画面，回到初始状态
  closeCelebration() {
    this.resetTimer()
  },

  goCheckIn() {
    wx.redirectTo({ url: '/pages/brushing/brushing' })
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

  // ===== 公主角色功能 =====

  // 显示随机公主角色（避开中心区域）
  showRandomPrincess() {
    if (!this.data.isRunning) return

    const princess = PRINCESS_CHARACTERS[Math.floor(Math.random() * PRINCESS_CHARACTERS.length)]

    // 安全区域：避开中心（牙齿+进度环）、顶部工具栏、底部按钮
    const safeZones = [
      { xMin: 3, xMax: 22, yMin: 8, yMax: 30 },   // 左上
      { xMin: 78, xMax: 95, yMin: 8, yMax: 30 },   // 右上
      { xMin: 3, xMax: 18, yMin: 35, yMax: 70 },   // 左侧
      { xMin: 82, xMax: 95, yMin: 35, yMax: 70 },   // 右侧
    ]
    const zone = safeZones[Math.floor(Math.random() * safeZones.length)]
    const x = zone.xMin + Math.random() * (zone.xMax - zone.xMin)
    const y = zone.yMin + Math.random() * (zone.yMax - zone.yMin)

    this.setData({
      showPrincess: true,
      princessEmoji: princess.emoji,
      princessName: princess.name,
      princessBubble: princess.bubble,
      princessColor: princess.color,
      princessX: x,
      princessY: y
    })

    // 播放音效
    wx.vibrateShort({ type: 'light' })

    // 5秒后隐藏
    if (this._princessTimer) clearTimeout(this._princessTimer)
    this._princessTimer = setTimeout(() => {
      this.setData({ showPrincess: false })
    }, 5000)
  },

  // 点击公主角色（彩蛋）
  onTapPrincess() {
    if (!this.data.showPrincess) return

    // 找到当前公主
    const currentPrincess = PRINCESS_CHARACTERS.find(p => p.name === this.data.princessName)
    if (!currentPrincess) return

    // 根据角色类型显示不同的鼓励反应
    let reactions = []

    // 小猪佩奇家族的反应
    if (['佩奇', '乔治', '猪爸爸', '猪妈妈', '小羊苏西', '小狗丹尼', '小象艾米丽'].includes(currentPrincess.name)) {
      reactions = [
        { emoji: '💪', text: '刷得真棒！' },
        { emoji: '⭐', text: '好厉害呀！' },
        { emoji: '🌟', text: '继续加油！' },
        { emoji: '💖', text: '越来越棒！' },
        { emoji: '✨', text: '刷得好认真！' }
      ]
    }
    // 乔治的恐龙
    else if (currentPrincess.name === '乔治的恐龙') {
      reactions = [
        { emoji: '🦕', text: '嗷呜~真棒！' },
        { emoji: '🦖', text: '吼~好厉害！' },
        { emoji: '💪', text: '加油加油！' },
        { emoji: '⭐', text: '刷得真好！' },
        { emoji: '🌟', text: '继续加油！' }
      ]
    }
    // 迪士尼公主的反应
    else if (['艾莎', '安娜', '乐佩', '爱丽儿', '贝儿', '灰姑娘', '白雪公主'].includes(currentPrincess.name)) {
      reactions = [
        { emoji: '✨', text: '闪闪发光！' },
        { emoji: '💖', text: '好棒好棒！' },
        { emoji: '👑', text: '小公主加油！' },
        { emoji: '🌟', text: '越来越棒！' },
        { emoji: '💫', text: '刷得真认真！' }
      ]
    }
    // 可爱动物的反应
    else if (['独角兽', '蝴蝶仙子', '花仙子', '小白兔', '小猫咪', '小狗狗', '小熊', '大熊猫', '考拉'].includes(currentPrincess.name)) {
      reactions = [
        { emoji: '🐾', text: '爪爪拍拍！' },
        { emoji: '💕', text: '好可爱呀！' },
        { emoji: '🌈', text: '彩虹加油！' },
        { emoji: '✨', text: '闪闪发光！' },
        { emoji: '💖', text: '爱你爱你！' }
      ]
    }
    // 海洋生物的反应
    else if (['美人鱼', '小丑鱼', '海豚', '小海龟', '海星星'].includes(currentPrincess.name)) {
      reactions = [
        { emoji: '🌊', text: '浪花加油！' },
        { emoji: '🐚', text: '贝壳加油！' },
        { emoji: '🐠', text: '游啊游加油！' },
        { emoji: '🐬', text: '跳跃加油！' },
        { emoji: '⭐', text: '闪闪加油！' }
      ]
    }
    // 其他角色的通用反应
    else {
      reactions = [
        { emoji: '💪', text: '刷得真棒！' },
        { emoji: '⭐', text: '好厉害呀！' },
        { emoji: '🌟', text: '继续加油！' },
        { emoji: '💖', text: '越来越棒！' },
        { emoji: '✨', text: '刷得好认真！' }
      ]
    }

    const reaction = reactions[Math.floor(Math.random() * reactions.length)]

    this.setData({
      princessEmoji: reaction.emoji,
      princessBubble: reaction.text
    })

    // 播放音效
    wx.vibrateShort({ type: 'medium' })

    // 3秒后恢复原样（存储定时器以便清除）
    if (this._princessRestoreTimer) clearTimeout(this._princessRestoreTimer)
    this._princessRestoreTimer = setTimeout(() => {
      this.setData({
        princessEmoji: currentPrincess.emoji,
        princessBubble: currentPrincess.bubble
      })
    }, 3000)
  },

  goBack() {
    // 清除公主定时器
    if (this._princessTimer) clearTimeout(this._princessTimer)
    wx.navigateBack()
  }
})
