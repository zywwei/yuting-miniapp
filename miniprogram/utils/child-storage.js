/**
 * Per-Child 存储抽象层
 * 自动按当前选中孩子的 childId 命名空间，实现数据隔离
 */

var auth = require('./auth.js')

var CHILD_KEYS = [
  'learnProgress',
  'achievements',
  'habits',
  'habitRecords',
  'brushingRecords',
  'drawings',
  // notes 为家庭级数据（通过 visibility 控制权限，不按孩子隔离），不进 childId 命名空间
  'brushingStory',
  'brushingSceneNotice',
  'brushingAvatar',
  'totalBrushPoints',
  'toothDecorations',
  'settings',
  'stallProducts',
  'stallSales',
  'stallSettings',
  'stallDailyChallenges',
  'stallBusinessHours',
  'stallDiary',
  'stallRestockList',
  'rpsRecords',
  'rpsStory',
  'rpsChallenge',
  'rpsTournament',
  'rpsStats',
  'diceRecords',
  'diceFlight',
  'diceMonopoly',
  'diceMissions',
  'diceStats',
  'diceSlots',
  'gameCoins',
  'coinLogs',
  'gameSettings',
  'tetrisRecords',
  'tetrisStats',
  'tetrisAdventure',
  'tetrisPuzzle',
  'tetrisSave',
  'tetrisSettings',
  // 记账本（按孩子隔离）
  'accountBooks',
  'accountEntries',
  'accountSettings',
  'accountTemplates',
  // 单例数据的乐观锁时间戳（按孩子隔离）
  'habitsUpdatedAt',
  'learnProgressUpdatedAt',
  'settingsUpdatedAt',
  'brushingStoryUpdatedAt',
  'totalBrushPointsUpdatedAt',
  'toothDecorationsUpdatedAt',
  'stallSettingsUpdatedAt',
  'stallDailyChallengesUpdatedAt',
  'stallBusinessHoursUpdatedAt',
  // 墓碑 key（删除标记，按孩子隔离）
  'deletedDrawingIds',
  // deletedNoteIds 同 notes 为家庭级，不按孩子隔离
  'deletedBrushingIds',
  'deletedStallProductIds',
  'deletedStallSaleIds',
  'deletedHabitRecordIds',
  'deletedGameRecordIds',
  'deletedBookIds',
  'deletedEntryIds',
  // 单例数据迁移标志（按孩子隔离，确保每个孩子只迁移一次）
  'singletonMigratedV2'
]

// O(1) 查找表
var CHILD_KEY_MAP = {}
CHILD_KEYS.forEach(function(k) { CHILD_KEY_MAP[k] = true })

function getKey(key) {
  var childId = auth.getCurrentChildId()
  if (!CHILD_KEY_MAP[key]) return key
  if (!childId) return key
  return key + '_' + childId
}

module.exports = {
  get: function(key) {
    return wx.getStorageSync(getKey(key))
  },

  set: function(key, value) {
    wx.setStorageSync(getKey(key), value)
  },

  remove: function(key) {
    wx.removeStorageSync(getKey(key))
  },

  getChildKeys: function(childId) {
    return CHILD_KEYS.map(function(k) { return k + '_' + childId })
  },

  CHILD_KEYS: CHILD_KEYS
}
