const util = require('../../utils/util.js')
const cloud = require('../../utils/cloud.js')

Page({
  data: {
    statusBarHeight: 20,
    capsuleRight: 80,
    currentYear: 2026,
    currentMonth: 1,
    stats: {
      streak: 0,
      todayCount: 0,
      weekRate: 0,
      avgScore: '0.0'
    },
    calendarDays: [],
    records: []
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    let capsuleRight = 80
    try {
      const capsule = wx.getMenuButtonBoundingClientRect()
      capsuleRight = sysInfo.windowWidth - capsule.left + 8
    } catch (e) {}

    const now = new Date()
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight || 20,
      capsuleRight: capsuleRight,
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1
    })

    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData()
    wx.stopPullDownRefresh()
  },

  async loadData() {
    const records = await cloud.fetchBrushingRecords()
    const stats = util.getBrushingStats()

    // 格式化时间
    const formattedRecords = records.map(r => ({
      ...r,
      createTimeFormatted: util.formatDate(r.createTime)
    }))

    this.setData({
      stats,
      records: formattedRecords,
      calendarDays: this.buildCalendar(records)
    })
  },

  // 构建日历
  buildCalendar(records) {
    const { currentYear, currentMonth } = this.data
    const firstDay = new Date(currentYear, currentMonth - 1, 1)
    const lastDay = new Date(currentYear, currentMonth, 0)
    const daysInMonth = lastDay.getDate()
    const startWeekday = firstDay.getDay() // 0 = Sunday

    const today = util.getTodayStr()
    const days = []

    // 上月补齐
    const prevMonthLastDay = new Date(currentYear, currentMonth - 1, 0).getDate()
    for (let i = startWeekday - 1; i >= 0; i--) {
      const day = prevMonthLastDay - i
      days.push({ day, date: '', isCurrentMonth: false })
    }

    // 当月
    for (let day = 1; day <= daysInMonth; day++) {
      const dateStr = `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`
      const dayRecords = records.filter(r => r.date === dateStr)
      days.push({
        day,
        date: dateStr,
        isCurrentMonth: true,
        isToday: dateStr === today,
        morning: dayRecords.some(r => r.timeOfDay === 'morning'),
        evening: dayRecords.some(r => r.timeOfDay === 'evening')
      })
    }

    // 下月补齐，凑满6行42个
    const remaining = 42 - days.length
    for (let day = 1; day <= remaining; day++) {
      days.push({ day, date: '', isCurrentMonth: false })
    }

    return days
  },

  // 删除记录（云端+本地）
  async deleteRecord(e) {
    const id = e.currentTarget.dataset.id
    wx.showModal({
      title: '删除记录',
      content: '确定要删除这条刷牙记录吗？',
      confirmText: '删除',
      confirmColor: '#FF4444',
      success: async (res) => {
        if (res.confirm) {
          await cloud.removeBrushingRecord(id)
          this.loadData()
          wx.showToast({ title: '已删除', icon: 'success' })
        }
      }
    })
  },

  // 预览图片
  previewImage(e) {
    const path = e.currentTarget.dataset.path
    if (path) {
      wx.previewImage({
        current: path,
        urls: [path]
      })
    }
  },

  // 返回
  goBack() {
    wx.navigateBack()
  }
})
