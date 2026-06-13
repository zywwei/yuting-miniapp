const util = require('../../utils/util.js')
const audio = require('../../utils/audio.js')
const beep = require('../../utils/beep.js')

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

// 脏东西类型（牙齿上的敌人）
const DIRTY_TYPES = [
  { id: 'candy', emoji: '🍬', name: '糖果残渣', points: 5 },
  { id: 'cake', emoji: '🍰', name: '蛋糕残渣', points: 5 },
  { id: 'cookie', emoji: '🍪', name: '饼干碎碎', points: 5 },
  { id: 'candy2', emoji: '🍭', name: '棒棒糖', points: 5 },
  { id: 'icecream', emoji: '🍦', name: '冰淇淋', points: 5 },
  { id: 'bug1', emoji: '🦠', name: '小细菌', points: 10 },
  { id: 'bug2', emoji: '🐛', name: '蛀牙虫', points: 10 },
  { id: 'bug3', emoji: '👾', name: '牙菌斑', points: 10 }
]

// 刷掉脏东西的特效文字
const CLEAN_TEXTS = [
  '刷掉啦！✨', '干干净净！💪', '真棒！🌟',
  '好厉害！⭐', '刷得好！💖', '消灭！🎯'
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

// 彩蛋：点击牙齿的有趣反应
const TOOTH_REACTIONS = [
  { face: '😜', text: '哎呀好痒~' },
  { face: '😆', text: '哈哈哈~' },
  { face: '🥰', text: '被摸到了~' },
  { face: '😎', text: '我很酷吧~' },
  { face: '🤩', text: '闪闪发光~' },
  { face: '🤭', text: '嘻嘻嘻~' },
  { face: '🫣', text: '好害羞呀~' },
  { face: '😴', text: '还没刷完呢~' }
]

// 彩蛋：点击小动物的反应（加入了公主和佩奇元素）
const ANIMAL_REACTIONS = {
  cat: [
    { emoji: '🐱', text: '喵~加油！', anim: 'bounce' },
    { emoji: '😸', text: '刷得好棒！', anim: 'spin' },
    { emoji: '😻', text: '好厉害呀~', anim: 'shake' }
  ],
  rabbit: [
    { emoji: '🐰', text: '蹦蹦跳~', anim: 'bounce' },
    { emoji: '🐇', text: '快快刷！', anim: 'spin' },
    { emoji: '🐰', text: '真可爱~', anim: 'shake' }
  ]
}

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

// 女孩喜欢的泡泡元素（刷牙时随机出现）
const GIRL_BUBBLES = ['👑', '👸', '🦄', '🐷', '🦋', '🌸', '💖', '💝', '💕', '💗', '✨', '⭐', '🌟', '💫', '🎀', '🎊']

Page({
  data: {
    statusBarHeight: 20,
    capsuleRight: 80,
    timeOfDay: 'morning',
    totalTime: 120,
    remainingTime: 120,
    minutes: '02',
    seconds: '00',
    isRunning: false,
    isPaused: false,
    isCompleted: false,
    overallProgress: 0,
    ringColor: '#FF9AAB',
    // 牙齿角色
    toothFace: '🦷',
    // 区域
    currentAreaIndex: 0,
    currentArea: BRUSH_AREAS[0],
    teethArea: BRUSH_AREAS,
    completedAreas: [],
    areaProgress: 0,
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
    // 主题和提示
    themeBg: THEMES.morning.bg,
    themeGreeting: THEMES.morning.greeting,
    themeTip: THEMES.morning.tip,
    // 刷牙小知识
    currentTip: '',
    showTip: false,
    // 积分
    brushPoints: 0,
    showPoints: false,
    pointsText: '',
    // 刷牙小游戏
    dirtySpots: [],
    showCleanEffect: false,
    cleanEffectText: '',
    cleanEffectX: 50,
    cleanEffectY: 50,
    totalDirtyCleaned: 0
  },

  _timer: null,
  _areaTimer: null,
  _areaElapsed: 0,
  _cheerIndex: 0,

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
      themeBg: theme.bg,
      themeGreeting: theme.greeting,
      themeTip: theme.tip
    })

    beep.preload()
  },

  onUnload() {
    this.clearTimers()
    // 清除所有彩蛋定时器
    if (this._toothTimer) { clearTimeout(this._toothTimer); this._toothTimer = null }
    if (this._ringColorTimer) { clearInterval(this._ringColorTimer); this._ringColorTimer = null }
    if (this._princessTimer) { clearTimeout(this._princessTimer); this._princessTimer = null }
    if (this._princessRestoreTimer) { clearTimeout(this._princessRestoreTimer); this._princessRestoreTimer = null }
    if (this._cleanEffectTimer) { clearTimeout(this._cleanEffectTimer); this._cleanEffectTimer = null }
    // 清除所有脏东西定时器
    if (this._dirtyTimers) {
      Object.values(this._dirtyTimers).forEach(t => clearTimeout(t))
      this._dirtyTimers = {}
    }
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

  // ===== 计时器 =====
  startTimer() {
    this._cheerIndex = 0
    this.setData({
      isRunning: true, isPaused: false, isCompleted: false,
      remainingTime: this.data.totalTime, overallProgress: 0,
      currentAreaIndex: 0, currentArea: BRUSH_AREAS[0],
      areaColor: BRUSH_AREAS[0].color, completedAreas: [],
      areaProgress: 0, areaRemaining: 20,
      ringColor: '#FF9AAB',
      rewardStars: [false, false, false, false, false],
      currentRewardText: REWARD_TEXTS[0],
      minutes: '02', seconds: '00',
      toothFace: '😁'
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

    // 初始化小游戏
    this._dirtyCounter = 0
    this._lastDirtyTime = 0

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
      const overallProgress = Math.round(((this.data.totalTime - remaining) / this.data.totalTime) * 100)

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

      // 动物加油文字轮换（如果彩蛋没在播放）
      if (!this._animalEasterEgg) {
        this._cheerIndex = (this._cheerIndex + 1) % CHEER_LEFT.length
        const currentIndex = this._cheerIndex // 捕获当前索引

        // 随机触发公主鼓励（每6秒有概率出现）
        if (currentIndex === 0 && Math.random() > 0.5) {
          const princess = PRINCESS_CHEER[Math.floor(Math.random() * PRINCESS_CHEER.length)]
          this.setData({
            leftCheer: princess.text
          })
          // 2秒后恢复
          setTimeout(() => {
            if (!this._animalEasterEgg) {
              this.setData({
                leftCheer: CHEER_LEFT[currentIndex]
              })
            }
          }, 2000)
        } else {
          this.setData({
            leftCheer: CHEER_LEFT[currentIndex],
            rightCheer: CHEER_RIGHT[currentIndex]
          })
        }
      }

      // 随机显示公主角色（每15-20秒出现一次，持续5秒）
      this._princessCounter++
      if (this._princessCounter - this._lastPrincessTime >= 15 && Math.random() > 0.7) {
        this._lastPrincessTime = this._princessCounter
        this.showRandomPrincess()
      }

      // 随机生成脏东西（每3-5秒出现一个，最多同时3个）
      this._dirtyCounter++
      if (this._dirtyCounter - this._lastDirtyTime >= 3 &&
          this.data.dirtySpots.length < 3 &&
          Math.random() > 0.4) {
        this._lastDirtyTime = this._dirtyCounter
        this.generateDirtySpot()
      }

      // 牙齿表情（如果彩蛋没在播放）
      let toothFace = this.data.toothFace // 保持当前表情
      if (!this._toothEasterEgg) {
        toothFace = '😁'
        if (overallProgress > 75) toothFace = '🤩'
        else if (overallProgress > 50) toothFace = '😊'
        else if (overallProgress > 25) toothFace = '😄'
      }

      beep.playBeep('tick')
      if (remaining <= 10 && remaining > 0) beep.playBeep('countdown')

      const min = Math.floor(remaining / 60).toString().padStart(2, '0')
      const sec = (remaining % 60).toString().padStart(2, '0')

      this.setData({
        remainingTime: remaining, minutes: min, seconds: sec,
        overallProgress, ringColor, rewardStars,
        currentRewardText: REWARD_TEXTS[Math.min(starIndex, REWARD_TEXTS.length - 1)],
        toothFace
      })
    }, 1000)
  },

  startAreaTimer() {
    const areaDuration = BRUSH_AREAS[this.data.currentAreaIndex].duration
    this._areaTimer = setInterval(() => {
      this._areaElapsed++
      const areaProgress = Math.round((this._areaElapsed / areaDuration) * 100)
      const areaRemaining = areaDuration - this._areaElapsed

      if (this._areaElapsed >= areaDuration) {
        const completedAreas = [...this.data.completedAreas, this.data.currentArea.name]
        const nextIndex = this.data.currentAreaIndex + 1
        this._areaElapsed = 0

        // 显示刷牙小知识
        const tipIndex = completedAreas.length - 1
        const tip = BRUSHING_TIPS[tipIndex % BRUSHING_TIPS.length]

        // 增加积分
        const newPoints = this.data.brushPoints + 10
        this.setData({
          brushPoints: newPoints,
          showPoints: true,
          pointsText: '+10 积分！',
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
            areaProgress: 0, areaRemaining: BRUSH_AREAS[nextIndex].duration
          })
        } else {
          this.setData({ completedAreas, areaProgress: 100, areaRemaining: 0 })
          clearInterval(this._areaTimer)
        }
      } else {
        this.setData({ areaProgress, areaRemaining })
      }
    }, 1000)
  },

  pauseTimer() {
    clearInterval(this._timer)
    clearInterval(this._areaTimer)
    this.setData({ isRunning: false, isPaused: true, toothFace: '😴' })
  },

  resumeTimer() {
    this.setData({ isRunning: true, isPaused: false, toothFace: '😁' })
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
    // 清除牙齿彩蛋
    this._toothEasterEgg = false
    if (this._toothTimer) {
      clearTimeout(this._toothTimer)
      this._toothTimer = null
    }
    // 清除特效定时器
    if (this._cleanEffectTimer) {
      clearTimeout(this._cleanEffectTimer)
      this._cleanEffectTimer = null
    }
    // 清除所有脏东西定时器
    if (this._dirtyTimers) {
      Object.values(this._dirtyTimers).forEach(t => clearTimeout(t))
      this._dirtyTimers = {}
    }
    this._ringModeIndex = 0
    this.setData({
      isRunning: false, isPaused: false, isCompleted: false,
      remainingTime: this.data.totalTime, minutes: '02', seconds: '00',
      overallProgress: 0, currentAreaIndex: 0, currentArea: BRUSH_AREAS[0],
      areaColor: BRUSH_AREAS[0].color, completedAreas: [],
      areaProgress: 0, areaRemaining: 20, ringColor: '#FF9AAB',
      rewardStars: [false, false, false, false, false],
      currentRewardText: '准备开始！', toothFace: '🦷',
      completedStarsArr: [], completedText: '', confetti: [],
      showPrincess: false,
      dirtySpots: [], brushPoints: 0, totalDirtyCleaned: 0,
      showCleanEffect: false, showPoints: false, showTip: false
    })
    this._areaElapsed = 0
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

    // 清除所有脏东西
    this.setData({
      isRunning: false, isCompleted: true, overallProgress: 100,
      ringColor: '#81C784', toothFace: '🥳',
      completedStarsArr: Array(stars).fill(0),
      completedText: completedText,
      dirtySpots: []
    })
  },

  clearTimers() {
    if (this._timer) { clearInterval(this._timer); this._timer = null }
    if (this._areaTimer) { clearInterval(this._areaTimer); this._areaTimer = null }
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

  // 彩蛋1：点击牙齿角色
  onTapTooth() {
    if (!this.data.isRunning) return

    const reaction = TOOTH_REACTIONS[Math.floor(Math.random() * TOOTH_REACTIONS.length)]
    this._toothEasterEgg = true // 标记正在显示彩蛋
    this.setData({ toothFace: reaction.face })

    wx.showToast({
      title: reaction.text,
      icon: 'none',
      duration: 2000
    })

    // 3秒后恢复原表情
    if (this._toothTimer) clearTimeout(this._toothTimer)
    this._toothTimer = setTimeout(() => {
      this._toothEasterEgg = false
      if (this.data.isRunning) {
        const progress = this.data.overallProgress
        let face = '😁'
        if (progress > 75) face = '🤩'
        else if (progress > 50) face = '😊'
        else if (progress > 25) face = '😄'
        this.setData({ toothFace: face })
      }
    }, 3000)
  },

  // 彩蛋2：点击左边小猫
  onTapCat() {
    if (!this.data.isRunning) return

    const reaction = ANIMAL_REACTIONS.cat[Math.floor(Math.random() * ANIMAL_REACTIONS.cat.length)]
    this._animalEasterEgg = true
    this.setData({
      leftCheer: reaction.text
    })

    // 播放音效
    wx.vibrateShort({ type: 'medium' })

    // 3秒后恢复
    const restoreIndex = this._cheerIndex
    setTimeout(() => {
      this._animalEasterEgg = false
      this.setData({
        leftCheer: CHEER_LEFT[restoreIndex]
      })
    }, 3000)
  },

  // 彩蛋3：点击右边兔子
  onTapRabbit() {
    if (!this.data.isRunning) return

    const reaction = ANIMAL_REACTIONS.rabbit[Math.floor(Math.random() * ANIMAL_REACTIONS.rabbit.length)]
    this._animalEasterEgg = true
    this.setData({
      rightCheer: reaction.text
    })

    // 播放音效
    wx.vibrateShort({ type: 'medium' })

    // 3秒后恢复
    const restoreIndex = this._cheerIndex
    setTimeout(() => {
      this._animalEasterEgg = false
      this.setData({
        rightCheer: CHEER_RIGHT[restoreIndex]
      })
    }, 3000)
  },

  // 彩蛋4：点击进度环切换颜色模式
  onTapRing() {
    if (!this.data.isRunning) return

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

  // 彩蛋5：完成时根据连续天数显示特殊称号
  getSpecialTitle() {
    const stats = util.getBrushingStats()
    const streak = stats.streak

    if (streak >= 30) return '🏆 刷牙大师！连续30天！'
    if (streak >= 14) return '🥇 刷牙达人！连续2周！'
    if (streak >= 7) return '⭐ 刷牙之星！连续7天！'
    if (streak >= 3) return '💪 坚持不懈！连续3天！'
    return null
  },

  // ===== 刷牙小游戏 =====

  // 生成脏东西
  generateDirtySpot() {
    if (!this.data.isRunning) return

    const dirty = DIRTY_TYPES[Math.floor(Math.random() * DIRTY_TYPES.length)]
    const id = 'dirty_' + Date.now() + '_' + Math.random().toString(36).substr(2, 4)

    // 随机位置（在牙齿周围的区域）
    const x = 20 + Math.random() * 60
    const y = 20 + Math.random() * 60

    const newDirty = {
      id: id,
      emoji: dirty.emoji,
      name: dirty.name,
      points: dirty.points,
      x: x,
      y: y
    }

    this.setData({
      dirtySpots: [...this.data.dirtySpots, newDirty]
    })

    // 8秒后自动消失（存储定时器以便清除）
    if (!this._dirtyTimers) this._dirtyTimers = {}
    this._dirtyTimers[id] = setTimeout(() => {
      this.removeDirtySpot(id)
      if (this._dirtyTimers) delete this._dirtyTimers[id]
    }, 8000)
  },

  // 移除脏东西
  removeDirtySpot(id) {
    const spots = this.data.dirtySpots.filter(s => s.id !== id)
    this.setData({ dirtySpots: spots })
    // 清除该脏东西的自动移除定时器
    if (this._dirtyTimers && this._dirtyTimers[id]) {
      clearTimeout(this._dirtyTimers[id])
      delete this._dirtyTimers[id]
    }
  },

  // 点击脏东西（刷掉它！）
  onTapDirty(e) {
    if (!this.data.isRunning) return

    const id = e.currentTarget.dataset.id
    const spot = this.data.dirtySpots.find(s => s.id === id)
    if (!spot) return

    // 移除脏东西
    this.removeDirtySpot(id)

    // 增加积分
    const newPoints = this.data.brushPoints + spot.points
    const newCleaned = this.data.totalDirtyCleaned + 1

    // 显示刷掉特效
    const cleanText = CLEAN_TEXTS[Math.floor(Math.random() * CLEAN_TEXTS.length)]
    this.setData({
      brushPoints: newPoints,
      totalDirtyCleaned: newCleaned,
      showCleanEffect: true,
      cleanEffectText: `+${spot.points} ${cleanText}`,
      cleanEffectX: spot.x,
      cleanEffectY: spot.y
    })

    // 播放音效
    wx.vibrateShort({ type: 'medium' })

    // 1.5秒后隐藏特效（存储定时器以便清除）
    if (this._cleanEffectTimer) clearTimeout(this._cleanEffectTimer)
    this._cleanEffectTimer = setTimeout(() => {
      this.setData({ showCleanEffect: false })
    }, 1500)

    // 每刷掉5个脏东西，显示特殊奖励
    if (newCleaned % 5 === 0) {
      setTimeout(() => {
        wx.showToast({
          title: `🎉 已刷掉${newCleaned}个脏东西！`,
          icon: 'none',
          duration: 1500
        })
      }, 500)
    }
  },

  // ===== 公主角色功能 =====

  // 显示随机公主角色（随机位置）
  showRandomPrincess() {
    if (!this.data.isRunning) return

    const princess = PRINCESS_CHARACTERS[Math.floor(Math.random() * PRINCESS_CHARACTERS.length)]

    // 生成随机位置（避免出现在进度环和按钮区域）
    // X: 10-90%，Y: 15-75%（避开顶部工具栏和底部按钮）
    const x = 10 + Math.random() * 80
    const y = 15 + Math.random() * 60

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
