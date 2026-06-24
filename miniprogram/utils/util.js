/**
 * 工具函数
 */

var childStorage = require('./child-storage.js')

// ===== 主线故事系统工具函数 =====

// 故事章节数量（与 constants.js 中 CHAPTERS 长度一致）
const CHAPTER_COUNT = 7

/**
 * 获取故事进度
 * @returns {Object} 故事进度对象
 */
const getStoryProgress = () => {
  const defaultProgress = {
    currentChapter: 1,
    round: 1,  // 当前轮数（每轮7章）
    unlockedChapters: [1],
    defeatedEnemies: [],
    enemyCurrentHp: {}
  }
  return childStorage.get('brushingStory') || defaultProgress
}

/**
 * 保存故事进度
 * @param {Object} progress - 故事进度对象
 */
const saveStoryProgress = (progress) => {
  childStorage.set('brushingStory', progress)
}

/**
 * 对敌人造成伤害
 * @param {string} enemyId - 敌人ID
 * @param {number} damage - 伤害值（默认1）
 * @param {number} defaultHp - 默认HP（轮数缩放后的值）
 * @returns {Object} { defeated: boolean, newHp: number }
 */
const damageEnemy = (enemyId, damage = 1, defaultHp = 6) => {
  const progress = getStoryProgress()
  const currentHp = progress.enemyCurrentHp[enemyId] ?? defaultHp
  const newHp = Math.max(0, currentHp - damage)

  progress.enemyCurrentHp[enemyId] = newHp
  saveStoryProgress(progress)

  return {
    defeated: newHp <= 0,
    newHp,
    damage
  }
}

/**
 * 标记敌人已击败并解锁下一章节
 * @param {string} enemyId - 敌人ID
 * @param {number} chapterId - 章节ID
 */
const defeatEnemy = (enemyId, chapterId) => {
  const progress = getStoryProgress()

  // 计算下一章节（无限循环）
  const nextChapterId = chapterId + 1
  if (nextChapterId > CHAPTER_COUNT) {
    // 一轮结束，开始新一轮
    progress.round = (progress.round || 1) + 1
    progress.currentChapter = 1
    // 清空已击败敌人列表和HP缓存（新一轮重新开始）
    progress.defeatedEnemies = []
    progress.enemyCurrentHp = {}  // 清空HP缓存，确保新一轮敌人满血
  } else {
    // 记录已击败的敌人
    if (!progress.defeatedEnemies.includes(enemyId)) {
      progress.defeatedEnemies.push(enemyId)
    }
    progress.currentChapter = nextChapterId
  }

  // 解锁当前章节
  if (!progress.unlockedChapters.includes(progress.currentChapter)) {
    progress.unlockedChapters.push(progress.currentChapter)
  }

  saveStoryProgress(progress)
}

/**
 * 检查章节是否已解锁
 * @param {number} chapterId - 章节ID
 * @returns {boolean}
 */
const isChapterUnlocked = (chapterId) => {
  const progress = getStoryProgress()
  return progress.unlockedChapters.includes(chapterId)
}

/**
 * 检查敌人是否已击败
 * @param {string} enemyId - 敌人ID
 * @returns {boolean}
 */
const isEnemyDefeated = (enemyId) => {
  const progress = getStoryProgress()
  return progress.defeatedEnemies.includes(enemyId)
}

/**
 * 获取敌人当前HP
 * @param {string} enemyId - 敌人ID
 * @param {number} defaultHp - 默认HP
 * @returns {number}
 */
const getEnemyCurrentHp = (enemyId, defaultHp = 6) => {
  const progress = getStoryProgress()
  return progress.enemyCurrentHp[enemyId] ?? defaultHp
}

/**
 * 计算经验值
 * @param {Object} record - 刷牙记录
 * @returns {number} 经验值
 */
const calcExpGain = (record) => {
  let exp = 10 // 基础经验

  // 区域覆盖加成
  const areas = record.completedAreas || []
  exp += areas.length * 3

  // 时长加成
  if (record.duration >= 120) exp += 15 // 2分钟以上
  else if (record.duration >= 60) exp += 8 // 1分钟以上

  // 全区域覆盖奖励
  if (areas.length >= 6) exp += 20

  return exp
}

/**
 * 获取角色数据
 * @returns {Object} 角色数据对象
 */
const getAvatarData = () => {
  const defaultAvatar = {
    name: '小卫士',
    emoji: '🦄',
    level: 1,
    exp: 0,
    expToNext: 30,
    outfit: 'default',
    unlockedOutfits: ['default'],
    skills: []
  }
  return childStorage.get('brushingAvatar') || defaultAvatar
}

/**
 * 保存角色数据
 * @param {Object} avatar - 角色数据对象
 */
const saveAvatarData = (avatar) => {
  childStorage.set('brushingAvatar', avatar)
}

/**
 * 增加角色经验并检查升级
 * @param {number} exp - 经验值
 * @returns {Object} { levelUp: boolean, newLevel: number, avatar: Object }
 */
const addAvatarExp = (exp) => {
  const avatar = getAvatarData()
  avatar.exp += exp

  let levelUp = false

  // 检查升级
  while (avatar.exp >= avatar.expToNext) {
    avatar.exp -= avatar.expToNext
    avatar.level++
    avatar.expToNext = Math.floor(avatar.expToNext * 1.5) // 每级所需经验增加50%
    levelUp = true

    // 升级奖励：解锁新装扮
    const outfitRewards = {
      3: 'crown',
      5: 'cape',
      7: 'wand',
      10: 'armor'
    }
    if (outfitRewards[avatar.level] && !avatar.unlockedOutfits.includes(outfitRewards[avatar.level])) {
      avatar.unlockedOutfits.push(outfitRewards[avatar.level])
    }
  }

  saveAvatarData(avatar)

  return {
    levelUp,
    newLevel: avatar.level,
    avatar
  }
}

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

// 获取昨天的日期字符串 YYYY-MM-DD
const getYesterdayStr = () => {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

/**
 * 保存刷牙打卡记录到本地存储
 */
const saveBrushingRecord = (record) => {
  const records = childStorage.get('brushingRecords') || []
  records.unshift(record)
  childStorage.set('brushingRecords', records)
}

// 获取所有刷牙记录
const getBrushingRecords = () => {
  return childStorage.get('brushingRecords') || []
}

// 删除刷牙记录
const deleteBrushingRecord = (id) => {
  let records = childStorage.get('brushingRecords') || []
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
  childStorage.set('brushingRecords', records)
}

/**
 * 获取刷牙打卡统计数据
 * @param {Array} records - 可选，传入记录数组（云端合并数据），不传则读本地
 */
const getBrushingStats = (records) => {
  if (!records) records = getBrushingRecords()
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

// 计算连续刷牙天数（至少刷一次就算一天）
const calcBrushingStreak = (records) => {
  if (records.length === 0) return 0

  const dates = [...new Set(records.map(r => r.date))].sort((a, b) => b.localeCompare(a))

  let streak = 0
  for (let i = 0; i < dates.length; i++) {
    const currentDate = dates[i]
    const dayRecords = records.filter(r => r.date === currentDate)

    if (i === 0) {
      // 第一天可以是今天或昨天，至少刷一次就算
      streak = dayRecords.length >= 1 ? 1 : 0
      if (dayRecords.length < 1) break
    } else {
      // 检查是否与前一天连续
      const prevDate = dates[i - 1]
      const cur = new Date(currentDate)
      const prev = new Date(prevDate)
      const diff = (prev - cur) / (1000 * 60 * 60 * 24)

      if (diff === 1 && dayRecords.length >= 1) {
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
  const drawings = childStorage.get('drawings') || []
  drawings.unshift(drawing)
  childStorage.set('drawings', drawings)
}

// 获取所有画作
const getDrawings = () => {
  return childStorage.get('drawings') || []
}

// 删除画作（同时删除图片文件）
const deleteDrawing = (id) => {
  let drawings = childStorage.get('drawings') || []
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
  childStorage.set('drawings', drawings)
}

module.exports = {
  formatDate,
  generateId,
  getTodayStr,
  getYesterdayStr,
  saveImageToPersistent,
  saveDrawing,
  getDrawings,
  deleteDrawing,
  saveBrushingRecord,
  getBrushingRecords,
  deleteBrushingRecord,
  getBrushingStats,
  // 主线故事系统
  getStoryProgress,
  saveStoryProgress,
  damageEnemy,
  defeatEnemy,
  isChapterUnlocked,
  isEnemyDefeated,
  getEnemyCurrentHp,
  calcExpGain,
  getAvatarData,
  saveAvatarData,
  addAvatarExp
}
