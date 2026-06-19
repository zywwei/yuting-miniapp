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
  'brushingReminder'
]

function getKey(key) {
  var childId = auth.getCurrentChildId()
  if (CHILD_KEYS.indexOf(key) < 0) return key
  if (!childId) return key + '_default'
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
