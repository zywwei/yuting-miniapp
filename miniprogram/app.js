App({
  onLaunch() {
    // 初始化云开发（失败不影响小程序运行）
    try {
      if (wx.cloud) {
        wx.cloud.init({
          traceUser: true
        })
      }
    } catch (e) {
      console.warn('云开发初始化失败，使用本地存储:', e)
    }

    // 初始化本地存储
    if (!wx.getStorageSync('drawings')) {
      wx.setStorageSync('drawings', [])
    }
    if (!wx.getStorageSync('brushingRecords')) {
      wx.setStorageSync('brushingRecords', [])
    }
  },
  globalData: {
    // 云开发是否可用
    cloudEnabled: false,
    // 画笔颜色列表
    colors: [
      '#FF4444', '#FF8800', '#FFCC00', '#44CC44',
      '#4488FF', '#8844FF', '#FF44AA', '#000000',
      '#FFFFFF', '#888888', '#FFB6C1', '#87CEEB',
      '#98FB98', '#DDA0DD', '#F0E68C', '#FFA07A'
    ],
    // 画笔粗细选项
    brushSizes: [3, 6, 10, 16, 24]
  }
})
