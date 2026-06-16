// 页面公共方法

/**
 * 获取导航栏信息（状态栏高度 + 胶囊按钮右边距）
 */
function getNavBarInfo() {
  const sysInfo = wx.getSystemInfoSync()
  let capsuleRight = 80
  try {
    const capsule = wx.getMenuButtonBoundingClientRect()
    capsuleRight = sysInfo.windowWidth - capsule.left + 8
  } catch (e) {}
  return {
    statusBarHeight: sysInfo.statusBarHeight || 20,
    capsuleRight: capsuleRight
  }
}

/**
 * 预览图片
 */
function previewImage(path) {
  if (path) {
    wx.previewImage({
      current: path,
      urls: [path]
    })
  }
}

module.exports = {
  getNavBarInfo,
  previewImage
}
