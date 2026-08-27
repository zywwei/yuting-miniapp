/**
 * Per-Child 存储抽象层
 * 自动按当前选中孩子的 childId 命名空间，实现数据隔离
 */

var auth = require('./auth.js')

var CHILD_KEYS = [
  'learnProgress',
  'learnLogs',
  'aiCollects',
  'achievements',
  'habits',
  'habitRecords',
  'brushingRecords',
  'drawings',
  // notes 为家庭级数据（通过 visibility 控制权限，不按孩子隔离），不进 childId 命名空间
  'brushingStory',
  'brushingSceneNotice',
  'brushingAvatar',
  // H5：刷牙计时进度按孩子隔离（注册白名单后 childStorage 读写才会落到 key_childId）
  'brushingProgress',
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
  'singletonMigratedV2',
  // C2 配套：英语词库 id 重排后的进度迁移标志（按孩子隔离）
  'englishMigrateV2Flag'
]

// O(1) 查找表
var CHILD_KEY_MAP = {}
CHILD_KEYS.forEach(function(k) { CHILD_KEY_MAP[k] = true })

// 注册白名单前，这 3 个 key 的数据存在裸 key 下；注册后读写落到 key_<childId>。
// 为避免存量数据升级后"清零"，选中孩子首次读取时做一次性迁移（裸 key 有数据且新 key 为空）。
// 多孩取舍（已知设计，非缺陷）：旧数据为单孩语义，升级后只能归一人——
// 首个访问的孩子若无自有数据，裸数据迁给他并删除裸 key，其余孩子不再获得；
// 若已有自有数据则裸 key 暂留，其余孩子需重启（重置内存标记）并先被选中才补迁。
var LEGACY_SCOPED_KEYS = { learnLogs: true, aiCollects: true, brushingProgress: true }
var legacyMigrated = {}

function ensureLegacyScopedMigrated(key, childId) {
  if (!LEGACY_SCOPED_KEYS[key]) return
  if (legacyMigrated[key]) return
  legacyMigrated[key] = true
  var scoped = key + '_' + childId
  var bareVal = wx.getStorageSync(key)
  var scopedVal = wx.getStorageSync(scoped)
  if (bareVal !== '' && bareVal !== undefined && (scopedVal === '' || scopedVal === undefined)) {
    wx.setStorageSync(scoped, bareVal)
    wx.removeStorageSync(key)
  }
}

function getKey(key) {
  var childId = auth.getCurrentChildId()
  if (!CHILD_KEY_MAP[key]) return key
  if (!childId) return key
  ensureLegacyScopedMigrated(key, childId)
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
