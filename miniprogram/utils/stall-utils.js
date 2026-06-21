/**
 * 摆摊模块公共工具函数
 * 从 11 个页面中提取的重复逻辑，统一维护
 */

// 设置导航栏主题色（11 个页面完全相同的实现）
function setThemeColor() {
  var app = getApp()
  wx.setNavigationBarColor({
    frontColor: '#ffffff',
    backgroundColor: app.globalData.themeColor || '#FF9AAB',
    animation: { duration: 0 }
  })
}

// 格式化时长（分钟 → 可读文本）
function formatDuration(minutes) {
  if (!minutes || minutes <= 0) return '0分钟'
  var h = Math.floor(minutes / 60)
  var m = minutes % 60
  return h > 0 ? h + '小时' + m + '分钟' : m + '分钟'
}

// 应用折扣计算（统一口径，替换 10+ 处重复）
// discount: 折扣值，10 表示无折扣，9 表示九折，以此类推
// 返回折后价，保留 2 位小数
function applyDiscount(subtotal, discount) {
  if (!discount || discount >= 10) return subtotal
  return Math.round(subtotal * discount / 10 * 100) / 100
}

// 格式化日期为 YYYY-MM-DD
function formatDate(date) {
  var y = date.getFullYear()
  var m = String(date.getMonth() + 1).padStart(2, '0')
  var d = String(date.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + d
}

// 获取本周起始日（周一）的 Date 对象
function getWeekStart() {
  var today = new Date()
  var dayOfWeek = today.getDay()
  var diff = dayOfWeek === 0 ? 6 : dayOfWeek - 1 // 周一为起点
  var weekStart = new Date(today)
  weekStart.setDate(today.getDate() - diff)
  return weekStart
}

// 补零
function padZero(num) {
  return num < 10 ? '0' + num : String(num)
}

// 格式化时间为 HH:mm
function formatTime(date) {
  return padZero(date.getHours()) + ':' + padZero(date.getMinutes())
}

// 计算找零（统一到分计算，避免浮点精度问题）
function calculateChange(total, received) {
  return Math.round((received - total) * 100) / 100
}

module.exports = {
  setThemeColor: setThemeColor,
  formatDuration: formatDuration,
  applyDiscount: applyDiscount,
  formatDate: formatDate,
  formatTime: formatTime,
  getWeekStart: getWeekStart,
  padZero: padZero,
  calculateChange: calculateChange
}
