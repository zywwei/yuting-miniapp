const util = require('../../utils/util.js')
const cloud = require('../../utils/cloud.js')

Page({
  data: {
    timeline: [],
    totalCount: 0,
    streakDays: 0,
    thisMonthCount: 0
  },

  onLoad() {
    this.loadData()
  },

  onShow() {
    this.loadData()
  },

  // 加载数据（云端优先，本地降级）
  async loadData() {
    // 尝试从云端获取最新数据
    const drawings = await cloud.fetchDrawings()
    const totalCount = drawings.length

    // 计算本月创作数
    const now = new Date()
    const thisMonth = drawings.filter(d => {
      const date = new Date(d.createTime)
      return date.getFullYear() === now.getFullYear() && date.getMonth() === now.getMonth()
    })
    const thisMonthCount = thisMonth.length

    // 计算连续创作天数
    const streakDays = this.calcStreak(drawings)

    // 按日期分组
    const timeline = this.groupByDate(drawings)

    this.setData({
      timeline,
      totalCount,
      streakDays,
      thisMonthCount
    })
  },

  // 计算连续创作天数
  calcStreak(drawings) {
    if (drawings.length === 0) return 0

    // 获取所有创作日期（去重）
    const dates = [...new Set(drawings.map(d => {
      const date = new Date(d.createTime)
      return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    }))]

    // 按日期排序（最新在前）
    dates.sort((a, b) => b.localeCompare(a))

    // 检查是否今天有创作
    const today = new Date()
    const todayKey = `${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`

    // 如果今天和昨天都没有创作，连续天数为0
    if (dates[0] !== todayKey && dates[0] !== yesterdayKey) {
      return 0
    }

    let streak = 1
    for (let i = 0; i < dates.length - 1; i++) {
      const current = new Date(dates[i])
      const next = new Date(dates[i + 1])
      const diff = (current - next) / (1000 * 60 * 60 * 24)

      if (diff === 1) {
        streak++
      } else {
        break
      }
    }

    return streak
  },

  // 按日期分组画作
  groupByDate(drawings) {
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const weekAgo = new Date(today)
    weekAgo.setDate(weekAgo.getDate() - 7)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)

    const groups = {}

    drawings.forEach(drawing => {
      const date = new Date(drawing.createTime)
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate())
      const dateKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

      let dateLabel = ''
      if (dateOnly.getTime() === today.getTime()) {
        dateLabel = '今天'
      } else if (dateOnly.getTime() === yesterday.getTime()) {
        dateLabel = '昨天'
      } else if (dateOnly >= weekAgo) {
        const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
        dateLabel = weekdays[date.getDay()]
      } else if (dateOnly >= monthStart) {
        dateLabel = `${date.getMonth() + 1}月${date.getDate()}日`
      } else {
        dateLabel = `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
      }

      if (!groups[dateKey]) {
        groups[dateKey] = {
          dateKey,
          dateLabel,
          sortOrder: dateOnly.getTime(),
          drawings: []
        }
      }

      groups[dateKey].drawings.push({
        ...drawing,
        timeFormatted: `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
      })
    })

    // 转换为数组并排序
    const timeline = Object.values(groups)
    timeline.sort((a, b) => b.sortOrder - a.sortOrder)

    // 每组内的画作也按时间倒序
    timeline.forEach(group => {
      group.drawings.sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
    })

    return timeline
  },

  // 查看画作详情
  viewDrawing(e) {
    const id = e.currentTarget.dataset.id
    // 从当前时间线数据中查找（保持与列表数据一致）
    const allDrawings = this.data.timeline.reduce((arr, group) => arr.concat(group.drawings), [])
    const drawing = allDrawings.find(d => d.id === id)
    if (drawing && drawing.imagePath) {
      wx.previewImage({
        current: drawing.imagePath,
        urls: allDrawings.map(d => d.imagePath)
      })
    }
  },

  // 删除画作（云端+本地）
  async deleteDrawing(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除画作',
      content: '确定要删除这幅画吗？删除后无法恢复哦~',
      confirmText: '删除',
      confirmColor: '#FF4444',
      success: async (res) => {
        if (res.confirm) {
          await cloud.removeDrawing(id)
          this.loadData()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  // 去画画
  goDraw() {
    wx.navigateTo({
      url: '/pages/draw/draw?mode=free'
    })
  },

  // 分享给朋友
  onShareAppMessage() {
    const timeline = this.data.timeline
    if (timeline.length > 0 && timeline[0].drawings.length > 0) {
      const latest = timeline[0].drawings[0]
      return {
        title: `看看钰婷画的${latest.name}！已经画了${this.data.totalCount}幅画啦~`,
        path: '/pages/index/index',
        imageUrl: latest.imagePath
      }
    }
    return {
      title: '钰婷的小画板 - 一起来看钰婷的画！',
      path: '/pages/index/index'
    }
  }
})
