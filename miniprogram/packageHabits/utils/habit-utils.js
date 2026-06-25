/**
 * 习惯相关工具函数
 * 提取公共逻辑，避免代码重复
 */

/**
 * 计算连续打卡天数
 * @param {Array} records - 打卡记录数组
 * @returns {number} 连续天数
 */
const calcStreak = (records) => {
  if (!records || records.length === 0) return 0

  const dateSet = {}
  records.forEach(r => { dateSet[r.date] = true })
  const dates = Object.keys(dateSet).sort().reverse()
  let streak = 0

  for (let i = 0; i < dates.length; i++) {
    const expectedDate = new Date()
    expectedDate.setDate(expectedDate.getDate() - i)
    const year = expectedDate.getFullYear()
    const month = String(expectedDate.getMonth() + 1).padStart(2, '0')
    const day = String(expectedDate.getDate()).padStart(2, '0')
    const expectedStr = `${year}-${month}-${day}`

    if (dates[i] === expectedStr) {
      streak++
    } else {
      break
    }
  }

  return streak
}

/**
 * 计算本周完成率
 * @param {Array} records - 打卡记录数组
 * @returns {number} 完成率百分比
 */
const calcWeekRate = (records) => {
  if (!records || records.length === 0) return 0

  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  let completedDays = 0
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    const year = d.getFullYear()
    const month = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    const dateStr = `${year}-${month}-${day}`
    if (records.some(r => r.date === dateStr)) {
      completedDays++
    }
  }

  return Math.round((completedDays / 7) * 100)
}

/**
 * 计算平均分
 * @param {Array} records - 打卡记录数组
 * @returns {string} 平均分（保留1位小数）
 */
const calcAvgScore = (records) => {
  if (!records || records.length === 0) return '0.0'

  const scoredRecords = records.filter(r => r.score)
  if (scoredRecords.length === 0) return '0.0'

  const total = scoredRecords.reduce((sum, r) => sum + r.score, 0)
  return (total / scoredRecords.length).toFixed(1)
}

/**
 * 格式化日期字符串
 * @param {string} dateStr - YYYY-MM-DD 格式的日期
 * @param {string} format - 格式模板
 * @returns {string} 格式化后的日期
 */
const formatDate = (dateStr, format = 'YYYY年MM月DD日') => {
  if (!dateStr) return ''

  const parts = dateStr.split('-')
  if (parts.length !== 3) return dateStr

  const year = parts[0]
  const month = parts[1]
  const day = parts[2]

  return format
    .replace('YYYY', year)
    .replace('MM', month)
    .replace('DD', day)
}

/**
 * 获取星期几
 * @param {string} dateStr - YYYY-MM-DD 格式的日期
 * @returns {string} 星期几
 */
const getWeekday = (dateStr) => {
  if (!dateStr) return ''

  const parts = dateStr.split('-')
  const d = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]))
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return weekdays[d.getDay()]
}

/**
 * 判断是否是今天
 * @param {string} dateStr - YYYY-MM-DD 格式的日期
 * @returns {boolean}
 */
const isToday = (dateStr) => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return dateStr === `${year}-${month}-${day}`
}

/**
 * 获取今天的日期字符串
 * @returns {string} YYYY-MM-DD 格式
 */
const getTodayStr = () => {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 获取当前时间字符串
 * @returns {string} HH:mm 格式
 */
const getCurrentTimeStr = () => {
  const now = new Date()
  const hours = String(now.getHours()).padStart(2, '0')
  const minutes = String(now.getMinutes()).padStart(2, '0')
  return `${hours}:${minutes}`
}

module.exports = {
  calcStreak,
  calcWeekRate,
  calcAvgScore,
  formatDate,
  getWeekday,
  isToday,
  getTodayStr,
  getCurrentTimeStr
}
