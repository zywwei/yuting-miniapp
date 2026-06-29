/**
 * 工具函数（facade）
 * 日期、刷牙、画作函数已迁移到子模块，此处重新导出保持兼容
 */

var childStorage = require('./child-storage.js')
var dateUtils = require('./date-utils.js')
var brushingUtils = require('./brushing-utils.js')

// 从子模块重新导出
var getTodayStr = dateUtils.getTodayStr
var getYesterdayStr = dateUtils.getYesterdayStr
var formatDate = dateUtils.formatDate
var calcBrushingStreak = brushingUtils.calcBrushingStreak
var getBrushingStats = brushingUtils.getBrushingStats
var saveBrushingRecord = brushingUtils.saveBrushingRecord
var getBrushingRecords = brushingUtils.getBrushingRecords
var deleteBrushingRecord = brushingUtils.deleteBrushingRecord

// 生成唯一ID
var _idCounter = 0
var generateId = function() {
  _idCounter++
  return Date.now().toString(36) + _idCounter.toString(36) + Math.random().toString(36).substr(2, 6)
}

// 保存图片到持久化存储
var saveImageToPersistent = function(tempFilePath) {
  var fs = wx.getFileSystemManager()
  var ext = tempFilePath.split('.').pop() || 'jpg'
  var fileName = 'img_' + generateId() + '.' + ext
  var savedPath = wx.env.USER_DATA_PATH + '/' + fileName

  return new Promise(function(resolve, reject) {
    fs.saveFile({
      tempFilePath: tempFilePath,
      filePath: savedPath,
      success: function() { resolve(savedPath) },
      fail: function(err) { reject(err) }
    })
  })
}

// 保存画作
var saveDrawing = function(drawing) {
  var drawings = childStorage.get('drawings') || []
  drawings.unshift(drawing)
  if (drawings.length >= 50) {
    var toRemove = drawings.splice(45)
    var fs = wx.getFileSystemManager()
    toRemove.forEach(function(d) {
      if (d.imagePath && d.imagePath.startsWith(wx.env.USER_DATA_PATH)) {
        try { fs.unlinkSync(d.imagePath) } catch (e) {}
      }
    })
  }
  childStorage.set('drawings', drawings)
}

// 获取画作列表
var getDrawings = function() {
  return childStorage.get('drawings') || []
}

// 删除画作
var deleteDrawing = function(id) {
  var drawings = childStorage.get('drawings') || []
  var target = drawings.find(function(d) { return d.id === id })
  if (target && target.imagePath) {
    try {
      var fs = wx.getFileSystemManager()
      if (target.imagePath.startsWith(wx.env.USER_DATA_PATH)) {
        fs.unlinkSync(target.imagePath)
      }
    } catch (e) {}
  }
  drawings = drawings.filter(function(d) { return d.id !== id })
  childStorage.set('drawings', drawings)
}

// ===== 故事系统 =====

var CHAPTER_COUNT = 7

var getStoryProgress = function() {
  var defaultProgress = {
    currentChapter: 1,
    round: 1,
    unlockedChapters: [1],
    defeatedEnemies: {},
    enemyHpMap: {}
  }
  var saved = childStorage.get('brushingStory')
  return saved ? Object.assign({}, defaultProgress, saved) : defaultProgress
}

var saveStoryProgress = function(progress) {
  childStorage.set('brushingStory', progress)
}

var damageEnemy = function(enemyId, damage) {
  var progress = getStoryProgress()
  if (!progress.enemyHpMap) progress.enemyHpMap = {}
  var currentHp = progress.enemyHpMap[enemyId] !== undefined ? progress.enemyHpMap[enemyId] : 0
  progress.enemyHpMap[enemyId] = Math.max(0, currentHp - damage)
  saveStoryProgress(progress)
  return progress.enemyHpMap[enemyId]
}

var defeatEnemy = function(enemyId, chapterId) {
  var progress = getStoryProgress()
  if (!progress.defeatedEnemies) progress.defeatedEnemies = {}
  progress.defeatedEnemies[enemyId] = true
  var nextChapter = chapterId + 1
  if (nextChapter <= CHAPTER_COUNT && progress.unlockedChapters.indexOf(nextChapter) < 0) {
    progress.unlockedChapters.push(nextChapter)
    progress.currentChapter = nextChapter
  }
  if (chapterId === CHAPTER_COUNT) {
    progress.round = (progress.round || 1) + 1
    progress.currentChapter = 1
    progress.unlockedChapters = [1]
    progress.defeatedEnemies = {}
    progress.enemyHpMap = {}
  }
  saveStoryProgress(progress)
  return progress
}

var isChapterUnlocked = function(chapterId) {
  return getStoryProgress().unlockedChapters.indexOf(chapterId) >= 0
}

var isEnemyDefeated = function(enemyId) {
  return !!(getStoryProgress().defeatedEnemies && getStoryProgress().defeatedEnemies[enemyId])
}

var getEnemyCurrentHp = function(enemyId, maxHp) {
  var progress = getStoryProgress()
  return (progress.enemyHpMap && progress.enemyHpMap[enemyId] !== undefined) ? progress.enemyHpMap[enemyId] : maxHp
}

var calcExpGain = function(params) {
  return (params.score || 0) + (params.perfect ? 50 : 0)
}

// ===== 角色系统 =====

var getAvatarData = function() {
  var defaultData = { level: 1, exp: 0, outfit: 'default', outfits: ['default'] }
  var saved = childStorage.get('brushingAvatar')
  return saved ? Object.assign({}, defaultData, saved) : defaultData
}

var saveAvatarData = function(data) {
  childStorage.set('brushingAvatar', data)
}

var addAvatarExp = function(exp) {
  var avatar = getAvatarData()
  avatar.exp += exp
  var levelUp = false
  while (avatar.exp >= avatar.level * 100) {
    avatar.exp -= avatar.level * 100
    avatar.level++
    levelUp = true
  }
  saveAvatarData(avatar)
  return { levelUp: levelUp, newLevel: avatar.level, avatar: avatar }
}

module.exports = {
  formatDate: formatDate,
  generateId: generateId,
  getTodayStr: getTodayStr,
  getYesterdayStr: getYesterdayStr,
  saveImageToPersistent: saveImageToPersistent,
  saveDrawing: saveDrawing,
  getDrawings: getDrawings,
  deleteDrawing: deleteDrawing,
  saveBrushingRecord: saveBrushingRecord,
  getBrushingRecords: getBrushingRecords,
  deleteBrushingRecord: deleteBrushingRecord,
  getBrushingStats: getBrushingStats,
  calcBrushingStreak: calcBrushingStreak,
  getStoryProgress: getStoryProgress,
  saveStoryProgress: saveStoryProgress,
  damageEnemy: damageEnemy,
  defeatEnemy: defeatEnemy,
  isChapterUnlocked: isChapterUnlocked,
  isEnemyDefeated: isEnemyDefeated,
  getEnemyCurrentHp: getEnemyCurrentHp,
  calcExpGain: calcExpGain,
  getAvatarData: getAvatarData,
  saveAvatarData: saveAvatarData,
  addAvatarExp: addAvatarExp
}
