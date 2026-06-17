const util = require('../../../utils/util.js')
const cloud = require('../../../utils/cloud.js')
const { getNavBarInfo, previewImage } = require('../../../utils/page-helpers.js')

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
    allRecords: [],
    records: [],
    selectedDate: null,
    daySummary: null,
    // 详情弹窗
    showDetail: false,
    detailRecord: null,
    // 补刷评分弹窗
    showScoreModal: false,
    modalTime: '',
    tempImagePath: '',
    score: 5,
    note: '',
    scoreLabels: ['加油哦', '还不错', '很好', '非常好', '超级棒！'],
    scoreLabel: '超级棒！',
    catchUpDate: '',
    // 编辑详情
    editingDetail: false,
    editScore: 5,
    editNote: '',
    // 积分与贴纸
    totalPoints: 0,
    decorations: [],
    showStickerAlbum: false
  },

  onLoad() {
    const navInfo = getNavBarInfo()
    const now = new Date()
    this.setData({
      statusBarHeight: navInfo.statusBarHeight,
      capsuleRight: navInfo.capsuleRight,
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

    // 按选中日期过滤
    const filteredRecords = this.data.selectedDate
      ? formattedRecords.filter(r => r.date === this.data.selectedDate)
      : formattedRecords

    // 加载积分和贴纸
    const totalPoints = wx.getStorageSync('totalBrushPoints') || 0
    const decorations = wx.getStorageSync('toothDecorations') || []

    // 本周趋势数据
    const weekTrend = this.buildWeekTrend(records)

    this.setData({
      stats,
      allRecords: formattedRecords,
      records: filteredRecords,
      calendarDays: this.buildCalendar(records),
      totalPoints,
      decorations,
      weekTrend
    })
  },

  // 点击日历日期筛选记录
  selectDate(e) {
    const date = e.currentTarget.dataset.date
    if (!date) return

    // 点击已选中的日期则取消筛选
    const newSelected = this.data.selectedDate === date ? null : date
    const filteredRecords = newSelected
      ? this.data.allRecords.filter(r => r.date === newSelected)
      : this.data.allRecords

    // 构建当日摘要
    const daySummary = newSelected ? this.buildDaySummary(filteredRecords, newSelected) : null

    this.setData({
      selectedDate: newSelected,
      records: filteredRecords,
      daySummary
    })
  },

  // 构建当日摘要
  buildDaySummary(records, date) {
    const morning = records.find(r => r.timeOfDay === 'morning')
    const evening = records.find(r => r.timeOfDay === 'evening')

    const weekdayNames = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
    const d = new Date(date)
    const weekday = weekdayNames[d.getDay()]

    const totalScore = records.reduce((sum, r) => sum + (r.score || 0), 0)
    const avgScore = records.length > 0 ? Math.round(totalScore / records.length) : 0
    const totalPoints = records.reduce((sum, r) => sum + (r.points || 0), 0)

    // 非今天且有未刷时段才显示补刷按钮
    const today = util.getTodayStr()
    const isPast = date < today
    const canCatchUp = isPast && (!morning || !evening)

    return {
      date,
      weekday,
      morning: morning || null,
      evening: evening || null,
      count: records.length,
      avgScore,
      totalPoints,
      isComplete: !!morning && !!evening,
      canCatchUp
    }
  },

  // 构建本周趋势
  buildWeekTrend(records) {
    const weekdayNames = ['日', '一', '二', '三', '四', '五', '六']
    const now = new Date()
    const dayOfWeek = now.getDay()
    const trend = []

    for (let i = 0; i < 7; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() - dayOfWeek + i)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const dayRecords = records.filter(r => r.date === dateStr)
      const count = dayRecords.length
      trend.push({
        date: dateStr,
        weekday: weekdayNames[i],
        morning: dayRecords.some(r => r.timeOfDay === 'morning'),
        evening: dayRecords.some(r => r.timeOfDay === 'evening'),
        count,
        percent: Math.min(count / 2 * 100, 100)
      })
    }
    return trend
  },

  // 查看记录详情
  viewDetail(e) {
    const id = e.currentTarget.dataset.id
    const record = this.data.allRecords.find(r => r.id === id)
    if (!record) return

    // 格式化详情
    const timeStr = record.createTime ? util.formatDate(record.createTime) : record.date
    let durationText = '手动打卡'
    if (record.fromTimer && record.duration) {
      const min = Math.floor(record.duration / 60)
      const sec = record.duration % 60
      durationText = min > 0 ? `计时刷牙 ${min}分${sec}秒` : `计时刷牙 ${sec}秒`
    } else if (record.fromTimer) {
      durationText = '计时刷牙'
    }
    const areas = record.completedAreas || []
    const scoreLabels = ['加油哦', '还不错', '很好', '非常好', '超级棒！']
    const safeScore = Math.min(Math.max(record.score || 1, 1), 5)
    const scoreLabel = scoreLabels[safeScore - 1] || ''

    this.setData({
      showDetail: true,
      detailRecord: {
        ...record,
        timeStr,
        durationText,
        areasText: areas.length > 0 ? areas.join('、') : '无',
        scoreLabel,
        timeOfDayText: record.timeOfDay === 'morning' ? '☀️ 早上' : '🌙 晚上'
      }
    })
  },

  // 关闭详情弹窗
  closeDetail() {
    this.setData({ showDetail: false, detailRecord: null, editingDetail: false })
  },

  // 阻止事件冒泡（弹窗内容区域点击不关闭）
  noop() {},

  // 开始编辑
  startEdit() {
    const record = this.data.detailRecord
    this.setData({
      editingDetail: true,
      editScore: record.score || 5,
      editNote: record.note || ''
    })
  },

  setEditScore(e) {
    this.setData({ editScore: e.currentTarget.dataset.score })
  },

  onEditNoteInput(e) {
    this.setData({ editNote: e.detail.value })
  },

  cancelEdit() {
    this.setData({ editingDetail: false })
  },

  async saveEdit() {
    const { detailRecord, editScore, editNote } = this.data
    wx.showLoading({ title: '保存中...' })
    try {
      // 更新本地 storage
      const records = wx.getStorageSync('brushingRecords') || []
      const updated = records.map(r => {
        if (r.id === detailRecord.id) {
          return { ...r, score: editScore, note: editNote.trim() }
        }
        return r
      })
      wx.setStorageSync('brushingRecords', updated)

      // 同步云端
      if (detailRecord.id) {
        try {
          await cloud.updateBrushingRecordById(detailRecord.id, { score: editScore, note: editNote.trim() })
        } catch (e) { /* 云端更新失败不影响本地 */ }
      }

      wx.hideLoading()
      this.setData({ editingDetail: false })
      this.loadData()
      wx.showToast({ title: '已更新 ✅', icon: 'none' })
    } catch (err) {
      wx.hideLoading()
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  // 切换贴纸纪念册
  toggleStickerAlbum() {
    this.setData({ showStickerAlbum: !this.data.showStickerAlbum })
  },

  // 切换积分面板（暂用 toast 展示）
  togglePointsPanel() {
    wx.showToast({ title: `总积分：${this.data.totalPoints} 🏆`, icon: 'none' })
  },

  // 补刷
  catchUpBrush(e) {
    const timeOfDay = e.currentTarget.dataset.time
    const date = this.data.selectedDate

    wx.showModal({
      title: timeOfDay === 'morning' ? '☀️ 补刷早上' : '🌙 补刷晚上',
      content: `确定要补刷 ${date} 的${timeOfDay === 'morning' ? '早上' : '晚上'}刷牙吗？`,
      confirmText: '补刷',
      success: (res) => {
        if (res.confirm) {
          this.setData({
            showScoreModal: true,
            modalTime: timeOfDay,
            tempImagePath: '',
            score: 5,
            scoreLabel: '超级棒！',
            note: '',
            catchUpDate: date
          })
        }
      }
    })
  },

  // 补刷评分
  selectScore(e) {
    const score = e.currentTarget.dataset.score
    this.setData({ score, scoreLabel: this.data.scoreLabels[score - 1] })
  },

  onNoteInput(e) {
    this.setData({ note: e.detail.value })
  },

  cancelScore() {
    this.setData({ showScoreModal: false, catchUpDate: '' })
  },

  async confirmScore() {
    const { modalTime, score, note, catchUpDate } = this.data
    wx.showLoading({ title: '保存中...' })
    try {
      const record = {
        id: util.generateId(),
        date: catchUpDate,
        timeOfDay: modalTime,
        imagePath: '',
        score: score,
        note: note.trim(),
        createTime: new Date(catchUpDate + 'T23:59:59').toISOString()
      }
      await cloud.uploadBrushingRecord(record)
      wx.hideLoading()
      this.setData({ showScoreModal: false, catchUpDate: '' })
      this.loadData()
      wx.showToast({ title: '补刷成功！🎉', icon: 'none' })
    } catch (err) {
      wx.hideLoading()
      console.error('补刷失败:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
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

  // 上个月
  prevMonth() {
    let { currentYear, currentMonth } = this.data
    currentMonth--
    if (currentMonth < 1) {
      currentMonth = 12
      currentYear--
    }
    this.setData({ currentYear, currentMonth })
    this.loadData()
  },

  // 下个月
  nextMonth() {
    let { currentYear, currentMonth } = this.data
    const now = new Date()
    // 不允许超过当月
    if (currentYear >= now.getFullYear() && currentMonth >= now.getMonth() + 1) return

    currentMonth++
    if (currentMonth > 12) {
      currentMonth = 1
      currentYear++
    }
    this.setData({ currentYear, currentMonth })
    this.loadData()
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
    previewImage(path)
  },

  // 返回
  goBack() {
    wx.navigateBack()
  }
})
