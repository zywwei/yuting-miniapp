const util = getApp().globalData.util
const cloud = getApp().globalData.cloud
const childStorage = getApp().globalData.childStorage
const auth = getApp().globalData.auth
const { getNavBarInfo, previewImage } = getApp().globalData.pageHelpers

Page({
  data: {
    childName: '宝宝',
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
    // 历史列表分批展示（默认最近10条，避免一次性渲染全部记录导致卡顿）
    displayCount: 10,
    displayRecords: [],
    hasMore: false,
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
    // 积分与贴纸
    totalPoints: 0,
    decorations: [],
    showStickerAlbum: false
  },

  onLoad(options) {
    const navInfo = getNavBarInfo()
    const now = new Date()
    this.setData({
      childName: auth.getChildNickname(),
      statusBarHeight: navInfo.statusBarHeight,
      capsuleRight: navInfo.capsuleRight,
      currentYear: now.getFullYear(),
      currentMonth: now.getMonth() + 1
    })

    // 保存传入的记录 ID，加载数据后自动打开详情
    this._pendingRecordId = options.recordId || null
    this.loadData()
  },

  onPullDownRefresh() {
    this.loadData()
    wx.stopPullDownRefresh()
  },

  async loadData() {
    const records = await cloud.fetchBrushingRecords()
    await Promise.all([
      cloud.fetchBrushPoints().catch(function() {}),
      cloud.fetchToothDecorations().catch(function() {})
    ])
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

    // 总积分：从刷牙记录实时汇总（历史单例存储无累加来源，直接统计最可靠；取较大值兼容云端旧数据）
    const totalPoints = Math.max(
      records.reduce((sum, r) => sum + (r.points || 0), 0),
      childStorage.get('totalBrushPoints') || 0
    )
    // 贴纸册：从刷牙记录中收集含贴纸的记录（日期+时段去重），兼容旧单例数据
    const decorations = this.buildDecorations(records)

    // 本周趋势数据
    const weekTrend = this.buildWeekTrend(records)

    this.setData({
      stats,
      allRecords: formattedRecords,
      records: filteredRecords,
      displayRecords: filteredRecords.slice(0, this.data.displayCount),
      hasMore: filteredRecords.length > this.data.displayCount,
      calendarDays: this.buildCalendar(records),
      totalPoints,
      decorations,
      weekTrend
    })

    // 如果有传入的记录 ID，自动打开详情弹窗
    if (this._pendingRecordId) {
      const recordId = this._pendingRecordId
      this._pendingRecordId = null
      this._openDetailById(recordId)
    }
  },

  // 根据 ID 打开详情（数据已加载后调用）
  _openDetailById(id) {
    const record = this.data.allRecords.find(r => r.id === id)
    if (!record) return
    this.setData({
      showDetail: true,
      detailRecord: record
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

    // 选中某天记录少直接全显；取消筛选回到全部记录时重置为最近10条
    const displayCount = newSelected ? filteredRecords.length : 10
    this.setData({
      selectedDate: newSelected,
      records: filteredRecords,
      displayCount,
      displayRecords: filteredRecords.slice(0, displayCount),
      hasMore: filteredRecords.length > displayCount,
      daySummary
    })
  },

  // 加载更多历史记录（每次+10条）
  loadMore() {
    const count = this.data.displayCount + 10
    this.setData({
      displayCount: count,
      displayRecords: this.data.records.slice(0, count),
      hasMore: this.data.records.length > count
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

  // 从刷牙记录构建贴纸册（含贴纸的记录，按日期+时段去重，同一时段多次记录只保留最新一条）
  buildDecorations(records) {
    const decorations = []
    const seen = {}
    const sorted = records.slice().sort((a, b) => String(b.createTime || '').localeCompare(String(a.createTime || '')))
    sorted.forEach(r => {
      if (r.stickers && r.stickers.length) {
        const key = r.date + '_' + r.timeOfDay
        if (!seen[key]) {
          seen[key] = true
          decorations.push({
            date: r.date,
            timeOfDay: r.timeOfDay,
            stickers: r.stickers,
            points: r.points || 0
          })
        }
      }
    })
    // 兼容历史单例数据（云端同步的旧贴纸记录）
    const legacy = childStorage.get('toothDecorations') || []
    legacy.forEach(d => {
      if (!d || !d.date) return
      const key = d.date + '_' + (d.timeOfDay || '')
      if (!seen[key]) {
        seen[key] = true
        decorations.push(d)
      }
    })
    return decorations
  },

  // 构建本周趋势（周一为一周起始，按早晚时段计算完成度）
  buildWeekTrend(records) {
    const weekdayNames = ['一', '二', '三', '四', '五', '六', '日']
    const now = new Date()
    const dayOfWeek = (now.getDay() + 6) % 7 // 0=周一，6=周日
    const trend = []

    for (let i = 0; i < 7; i++) {
      const d = new Date(now)
      d.setDate(now.getDate() - dayOfWeek + i)
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
      const dayRecords = records.filter(r => r.date === dateStr)
      const morningDone = dayRecords.some(r => r.timeOfDay === 'morning')
      const eveningDone = dayRecords.some(r => r.timeOfDay === 'evening')
      // 按已刷时段数计算，避免同时段多次记录导致提前满格
      const doneCount = (morningDone ? 1 : 0) + (eveningDone ? 1 : 0)
      trend.push({
        date: dateStr,
        weekday: weekdayNames[i],
        morning: morningDone,
        evening: eveningDone,
        count: dayRecords.length,
        percent: Math.min(doneCount / 2 * 100, 100)
      })
    }
    return trend
  },

  // 查看记录详情
  viewDetail(e) {
    const id = e.currentTarget.dataset.id
    const record = this.data.allRecords.find(r => r.id === id)
    if (!record) return

    this.setData({
      showDetail: true,
      detailRecord: record
    })
  },

  // 关闭详情弹窗
  closeDetail() {
    this.setData({ showDetail: false, detailRecord: null })
  },

  // 详情更新后刷新数据
  onDetailUpdated() {
    this.loadData()
    // 重新读取当前详情记录，确保组件数据同步
    const record = this.data.detailRecord
    if (record && record.id) {
      const records = childStorage.get('brushingRecords') || []
      const updated = records.find(r => r.id === record.id)
      if (updated) {
        this.setData({ detailRecord: updated })
      }
    }
  },

  // 阻止事件冒泡（弹窗内容区域点击不关闭）
  noop() {},

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
      // 补刷记录使用补刷日期的时间，保持时间排序正确
      const catchTime = modalTime === 'morning' ? 'T08:00:00' : 'T21:00:00'
      const record = {
        id: util.generateId(),
        date: catchUpDate,
        timeOfDay: modalTime,
        imagePath: '',
        score: score,
        note: note.trim(),
        createTime: new Date(catchUpDate + catchTime).toISOString(),
        isCatchUp: true
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
