/**
 * 工具函数
 */

// 格式化日期
const formatDate = (date) => {
  const d = new Date(date)
  const year = d.getFullYear()
  const month = (d.getMonth() + 1).toString().padStart(2, '0')
  const day = d.getDate().toString().padStart(2, '0')
  const hour = d.getHours().toString().padStart(2, '0')
  const minute = d.getMinutes().toString().padStart(2, '0')
  return `${year}-${month}-${day} ${hour}:${minute}`
}

// 生成唯一ID
const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

// 获取今天的日期字符串 YYYY-MM-DD
const getTodayStr = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 保存刷牙打卡记录到本地存储
 */
const saveBrushingRecord = (record) => {
  const records = wx.getStorageSync('brushingRecords') || []
  records.unshift(record)
  wx.setStorageSync('brushingRecords', records)
}

// 获取所有刷牙记录
const getBrushingRecords = () => {
  return wx.getStorageSync('brushingRecords') || []
}

// 删除刷牙记录
const deleteBrushingRecord = (id) => {
  let records = wx.getStorageSync('brushingRecords') || []
  const target = records.find(r => r.id === id)

  if (target && target.imagePath) {
    try {
      const fs = wx.getFileSystemManager()
      if (target.imagePath.startsWith(wx.env.USER_DATA_PATH)) {
        fs.unlinkSync(target.imagePath)
      }
    } catch (e) { /* 文件可能已不存在 */ }
  }

  records = records.filter(r => r.id !== id)
  wx.setStorageSync('brushingRecords', records)
}

/**
 * 获取刷牙打卡统计数据
 */
const getBrushingStats = () => {
  const records = getBrushingRecords()
  const today = getTodayStr()

  // 今日完成次数
  const todayCount = records.filter(r => r.date === today).length

  // 平均分
  const avgScore = records.length > 0
    ? (records.reduce((sum, r) => sum + (r.score || 0), 0) / records.length).toFixed(1)
    : '0.0'

  // 连续打卡天数
  const streak = calcBrushingStreak(records)

  // 本周完成率
  const weekRate = calcWeekRate(records)

  return {
    total: records.length,
    todayCount,
    avgScore,
    streak,
    weekRate
  }
}

// 计算连续刷牙天数（完成早晚两次才算一天）
const calcBrushingStreak = (records) => {
  if (records.length === 0) return 0

  const dates = [...new Set(records.map(r => r.date))].sort((a, b) => b.localeCompare(a))

  let streak = 0
  for (let i = 0; i < dates.length; i++) {
    const currentDate = dates[i]
    const dayRecords = records.filter(r => r.date === currentDate)

    if (i === 0) {
      // 第一天可以是今天或昨天
      streak = dayRecords.length >= 2 ? 1 : 0
      if (dayRecords.length < 2) break
    } else {
      // 检查是否与前一天连续
      const prevDate = dates[i - 1]
      const cur = new Date(currentDate)
      const prev = new Date(prevDate)
      const diff = (prev - cur) / (1000 * 60 * 60 * 24)

      if (diff === 1 && dayRecords.length >= 2) {
        streak++
      } else {
        break
      }
    }
  }

  return streak
}

// 计算本周完成率
const calcWeekRate = (records) => {
  const now = new Date()
  const startOfWeek = new Date(now)
  startOfWeek.setDate(now.getDate() - now.getDay())
  startOfWeek.setHours(0, 0, 0, 0)

  let completedDays = 0
  const weekDates = []
  for (let i = 0; i < 7; i++) {
    const d = new Date(startOfWeek)
    d.setDate(startOfWeek.getDate() + i)
    const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
    weekDates.push(dateStr)
    const dayRecords = records.filter(r => r.date === dateStr)
    if (dayRecords.length >= 2) completedDays++
  }

  return Math.round((completedDays / 7) * 100)
}

/**
 * 保存画作图片到持久化目录
 * @param {string} tempFilePath - 临时文件路径
 * @returns {Promise<string>} 保存后的持久化文件路径
 */
const saveImageToPersistent = (tempFilePath) => {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager()
    const drawings = getDrawings()

    // 限制最多保存 50 幅画作的文件
    if (drawings.length >= 50) {
      const toRemove = drawings.slice(45)
      toRemove.forEach(d => {
        try {
          if (d.imagePath && d.imagePath.startsWith(wx.env.USER_DATA_PATH)) {
            fs.unlinkSync(d.imagePath)
          }
        } catch (e) { /* 文件可能已不存在 */ }
      })
    }

    // 生成持久化文件名
    const fileName = `drawing_${generateId()}.png`
    const savedPath = `${wx.env.USER_DATA_PATH}/${fileName}`

    // 使用 copyFile 将临时文件复制到持久化目录
    fs.copyFile({
      srcPath: tempFilePath,
      destPath: savedPath,
      success: () => {
        resolve(savedPath)
      },
      fail: (err) => {
        console.error('copyFile 失败:', err)
        reject(err)
      }
    })
  })
}

/**
 * 保存画作记录到本地存储
 */
const saveDrawing = (drawing) => {
  const drawings = wx.getStorageSync('drawings') || []
  drawings.unshift(drawing)
  wx.setStorageSync('drawings', drawings)
}

// 获取所有画作
const getDrawings = () => {
  return wx.getStorageSync('drawings') || []
}

// 删除画作（同时删除图片文件）
const deleteDrawing = (id) => {
  let drawings = wx.getStorageSync('drawings') || []
  const target = drawings.find(d => d.id === id)

  // 删除关联的图片文件
  if (target && target.imagePath) {
    try {
      const fs = wx.getFileSystemManager()
      if (target.imagePath.startsWith(wx.env.USER_DATA_PATH)) {
        fs.unlinkSync(target.imagePath)
      }
    } catch (e) { /* 文件可能已不存在 */ }
  }

  drawings = drawings.filter(d => d.id !== id)
  wx.setStorageSync('drawings', drawings)
}

module.exports = {
  formatDate,
  generateId,
  getTodayStr,
  saveImageToPersistent,
  saveDrawing,
  getDrawings,
  deleteDrawing,
  saveBrushingRecord,
  getBrushingRecords,
  deleteBrushingRecord,
  getBrushingStats
}
