// 页面公共方法

/**
 * 获取导航栏信息（状态栏高度 + 胶囊按钮右边距）
 */
function getNavBarInfo() {
  const windowInfo = wx.getWindowInfo()
  let capsuleRight = 80
  try {
    const capsule = wx.getMenuButtonBoundingClientRect()
    capsuleRight = windowInfo.windowWidth - capsule.left + 8
  } catch (e) {}
  return {
    statusBarHeight: windowInfo.statusBarHeight || 20,
    capsuleRight: capsuleRight
  }
}

/**
 * 预览图片
 * @param {string} path - 当前图片路径
 * @param {Array} images - 图片数组（可选，支持左右滑动）
 */
function previewImage(path, images) {
  if (path) {
    wx.previewImage({
      current: path,
      urls: images && images.length > 0 ? images : [path]
    })
  }
}

/**
 * 获取今日日期字符串 YYYY-MM-DD
 */
function getTodayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

/**
 * 获取昨日日期字符串 YYYY-MM-DD
 */
function getYesterdayStr() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${(d.getMonth() + 1).toString().padStart(2, '0')}-${d.getDate().toString().padStart(2, '0')}`
}

module.exports = {
  getNavBarInfo,
  previewImage,
  getTodayStr,
  getYesterdayStr
}
