/**
 * 工具函数（facade）
 * 日期、刷牙函数已迁移到子模块，此处重新导出保持兼容
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

// ===== 主线故事系统工具函数 =====

var CHAPTER_COUNT = 7

var getStoryProgress = function() {
  var defaultProgress = {
    currentChapter: 1,
    round: 1,
    unlockedChapters: [1],
    defeatedEnemies: [],
    enemyCurrentHp: {}
  }
  return childStorage.get('brushingStory') || defaultProgress
}

var saveStoryProgress = function(progress) {
  childStorage.set('brushingStory', progress)
}

var damageEnemy = function(enemyId, damage, defaultHp) {
  damage = damage || 1
  defaultHp = defaultHp || 6
  var progress = getStoryProgress()
  var currentHp = progress.enemyCurrentHp[enemyId] !== undefined ? progress.enemyCurrentHp[enemyId] : defaultHp
  var newHp = Math.max(0, currentHp - damage)

  progress.enemyCurrentHp[enemyId] = newHp
  saveStoryProgress(progress)

  return {
    defeated: newHp <= 0,
    newHp: newHp,
    damage: damage
  }
}

var defeatEnemy = function(enemyId, chapterId) {
  var progress = getStoryProgress()

  var nextChapterId = chapterId + 1
  if (nextChapterId > CHAPTER_COUNT) {
    progress.round = (progress.round || 1) + 1
    progress.currentChapter = 1
    progress.defeatedEnemies = []
    progress.enemyCurrentHp = {}
  } else {
    if (progress.defeatedEnemies.indexOf(enemyId) < 0) {
      progress.defeatedEnemies.push(enemyId)
    }
    progress.currentChapter = nextChapterId
  }

  if (progress.unlockedChapters.indexOf(progress.currentChapter) < 0) {
    progress.unlockedChapters.push(progress.currentChapter)
  }

  saveStoryProgress(progress)
}

var isChapterUnlocked = function(chapterId) {
  var progress = getStoryProgress()
  return progress.unlockedChapters.indexOf(chapterId) >= 0
}

var isEnemyDefeated = function(enemyId) {
  var progress = getStoryProgress()
  return progress.defeatedEnemies.indexOf(enemyId) >= 0
}

var getEnemyCurrentHp = function(enemyId, defaultHp) {
  defaultHp = defaultHp || 6
  var progress = getStoryProgress()
  return progress.enemyCurrentHp[enemyId] !== undefined ? progress.enemyCurrentHp[enemyId] : defaultHp
}

var calcExpGain = function(record) {
  var exp = 10
  var areas = record.completedAreas || []
  exp += areas.length * 3

  if (record.duration >= 120) exp += 15
  else if (record.duration >= 60) exp += 8

  if (areas.length >= 6) exp += 20

  return exp
}

// ===== 角色系统 =====

var getAvatarData = function() {
  var defaultAvatar = {
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

var saveAvatarData = function(avatar) {
  childStorage.set('brushingAvatar', avatar)
}

var addAvatarExp = function(exp) {
  var avatar = getAvatarData()
  avatar.exp += exp

  var levelUp = false

  while (avatar.exp >= avatar.expToNext) {
    avatar.exp -= avatar.expToNext
    avatar.level++
    avatar.expToNext = Math.floor(avatar.expToNext * 1.5)
    levelUp = true

    var outfitRewards = {
      3: 'crown',
      5: 'cape',
      7: 'wand',
      10: 'armor'
    }
    if (outfitRewards[avatar.level] && avatar.unlockedOutfits.indexOf(outfitRewards[avatar.level]) < 0) {
      avatar.unlockedOutfits.push(outfitRewards[avatar.level])
    }
  }

  saveAvatarData(avatar)

  return {
    levelUp: levelUp,
    newLevel: avatar.level,
    avatar: avatar
  }
}

// ===== 画作管理 =====

var generateId = function() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2, 9)
}

var saveImageToPersistent = function(tempFilePath) {
  return new Promise(function(resolve, reject) {
    var fs = wx.getFileSystemManager()
    var drawings = getDrawings()

    if (drawings.length >= 50) {
      var toRemove = drawings.slice(45)
      toRemove.forEach(function(d) {
        try {
          if (d.imagePath && d.imagePath.startsWith(wx.env.USER_DATA_PATH)) {
            fs.unlinkSync(d.imagePath)
          }
        } catch (e) {}
      })
    }

    var fileName = 'drawing_' + generateId() + '.png'
    var savedPath = wx.env.USER_DATA_PATH + '/' + fileName

    fs.copyFile({
      srcPath: tempFilePath,
      destPath: savedPath,
      success: function() { resolve(savedPath) },
      fail: function(err) { reject(err) }
    })
  })
}

var saveDrawing = function(drawing) {
  var drawings = childStorage.get('drawings') || []
  drawings.unshift(drawing)
  childStorage.set('drawings', drawings)
}

var getDrawings = function() {
  return childStorage.get('drawings') || []
}

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
