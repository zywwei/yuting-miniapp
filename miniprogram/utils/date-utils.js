/**
 * 日期工具函数
 */

// 获取今天的日期字符串 YYYY-MM-DD
var getTodayStr = function() {
  var d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

// 获取昨天的日期字符串
var getYesterdayStr = function() {
  var d = new Date()
  d.setDate(d.getDate() - 1)
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

// 格式化日期
var formatDate = function(dateStr) {
  if (!dateStr) return ''
  var d = new Date(dateStr)
  if (isNaN(d.getTime())) return dateStr
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0') + ' ' + String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

module.exports = {
  getTodayStr: getTodayStr,
  getYesterdayStr: getYesterdayStr,
  formatDate: formatDate
}
