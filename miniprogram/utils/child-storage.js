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
  'notes',
  'brushingStory',
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
  'deletedNoteIds',
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

function getKey(key) {
  var childId = auth.getCurrentChildId()
  if (CHILD_KEYS.indexOf(key) < 0) return key
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
