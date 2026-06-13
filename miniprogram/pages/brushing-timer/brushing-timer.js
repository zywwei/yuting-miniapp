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

const REWARD_TEXTS = ['准备开始！', '刷得好认真～', '继续加油！', '越来越棒！', '快完成啦！', '太完美了！']
const COMPLETED_TEXTS = [
  '牙齿变得好白好亮！✨',
  '刷得干干净净，真厉害！💪',
  '小牙齿在说谢谢钰婷！🦷',
  '今天又是棒棒的一天！🌈'
]
const CHEER_LEFT = ['加油', '好棒', '厉害', '继续', '加油', '棒棒']
const CHEER_RIGHT = ['真乖', '认真', '好快', '漂亮', '太强', '赞赞']

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
    soundEnabled: false
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

    this.setData({
      statusBarHeight: sysInfo.statusBarHeight || 20,
      capsuleRight,
      timeOfDay,
      teethArea: BRUSH_AREAS
    })

    beep.preload()
  },

  onUnload() {
    this.clearTimers()
  },

  // 生成撒花
  generateConfetti() {
    const colors = ['#FF9AAB', '#FFB74D', '#81C784', '#4FC3F7', '#BA68C8', '#FFD700', '#FF8A80']
    const confetti = []
    for (let i = 0; i < 35; i++) {
      confetti.push({
        id: i,
        x: Math.random() * 100,
        delay: Math.random() * 2,
        color: colors[i % colors.length],
        w: 8 + Math.random() * 14,
        h: 12 + Math.random() * 22
      })
    }
    this.setData({ confetti })
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

      // 颜色变化
      let ringColor = '#FF9AAB'
      if (overallProgress > 80) ringColor = '#81C784'
      else if (overallProgress > 50) ringColor = '#FFB74D'

      // 星星
      const starIndex = Math.floor(overallProgress / 20)
      const rewardStars = this.data.rewardStars.map((s, i) => i < starIndex)

      // 动物加油文字轮换
      this._cheerIndex = (this._cheerIndex + 1) % CHEER_LEFT.length

      // 牙齿表情
      let toothFace = '😁'
      if (overallProgress > 75) toothFace = '🤩'
      else if (overallProgress > 50) toothFace = '😊'
      else if (overallProgress > 25) toothFace = '😄'

      beep.playBeep('tick')
      if (remaining <= 10 && remaining > 0) beep.playBeep('countdown')

      const min = Math.floor(remaining / 60).toString().padStart(2, '0')
      const sec = (remaining % 60).toString().padStart(2, '0')

      this.setData({
        remainingTime: remaining, minutes: min, seconds: sec,
        overallProgress, ringColor, rewardStars,
        currentRewardText: REWARD_TEXTS[Math.min(starIndex, REWARD_TEXTS.length - 1)],
        leftCheer: CHEER_LEFT[this._cheerIndex],
        rightCheer: CHEER_RIGHT[this._cheerIndex],
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
    this.setData({
      isRunning: false, isPaused: false, isCompleted: false,
      remainingTime: this.data.totalTime, minutes: '02', seconds: '00',
      overallProgress: 0, currentAreaIndex: 0, currentArea: BRUSH_AREAS[0],
      areaColor: BRUSH_AREAS[0].color, completedAreas: [],
      areaProgress: 0, areaRemaining: 20, ringColor: '#FF9AAB',
      rewardStars: [false, false, false, false, false],
      currentRewardText: '准备开始！', toothFace: '🦷',
      completedStarsArr: [], completedText: '', confetti: []
    })
    this._areaElapsed = 0
  },

  completeTimer() {
    this.clearTimers()
    beep.playBeep('complete')
    this.generateConfetti()

    const completedCount = this.data.completedAreas.length
    let stars = Math.ceil((completedCount / BRUSH_AREAS.length) * 5)
    if (stars === 0) stars = 1

    this.setData({
      isRunning: false, isCompleted: true, overallProgress: 100,
      ringColor: '#81C784', toothFace: '🥳',
      completedStarsArr: Array(stars).fill(0),
      completedText: COMPLETED_TEXTS[Math.floor(Math.random() * COMPLETED_TEXTS.length)]
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
  },

  goBack() {
    wx.navigateBack()
  }
})
