const util = require('../../utils/util.js')

Page({
  data: {
    statusBarHeight: 20,
    brushingToday: 0
  },

  onLoad() {
    const sysInfo = wx.getSystemInfoSync()
    this.setData({
      statusBarHeight: sysInfo.statusBarHeight || 20
    })
  },

  onShow() {
    this.loadBrushingCount()
  },

  // 加载今日刷牙次数
  loadBrushingCount() {
    const today = util.getTodayStr()
    const records = util.getBrushingRecords()
    const todayCount = records.filter(r => r.date === today).length
    this.setData({ brushingToday: todayCount })
  },

  // 刷牙打卡
  goBrushing() {
    wx.navigateTo({
      url: '/pages/brushing/brushing'
    })
  },

  // 自由画画
  goFreeDraw() {
    wx.navigateTo({
      url: '/pages/draw/draw?mode=free'
    })
  },

  // 涂色模板
  goTemplates() {
    wx.navigateTo({
      url: '/pages/templates/templates'
    })
  },

  // 我的画廊
  goGallery() {
    wx.navigateTo({
      url: '/pages/gallery/gallery'
    })
  },

  // 亲子互动模式
  goParentMode() {
    wx.navigateTo({
      url: '/pages/draw/draw?mode=parent'
    })
  }
})
