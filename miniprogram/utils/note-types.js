/**
 * 笔记类型和心情配置
 * 集中管理所有笔记类型、心情定义及自定义类型
 */

var childStorage = require('./child-storage.js')

// 笔记类型分组
var TYPE_GROUPS = [
  { key: 'record', label: '日常记录' },
  { key: 'study', label: '学习探索' },
  { key: 'life', label: '生活点滴' },
  { key: 'growth', label: '成长足迹' }
]

// 笔记类型定义
var NOTE_TYPES = [
  { value: 'diary', label: '成长日记', icon: '📖', group: 'record', color: '#E3F2FD', textColor: '#1976D2' },
  { value: 'funny', label: '今日趣事', icon: '😄', group: 'record', color: '#FFF3E0', textColor: '#F57C00' },
  { value: 'milestone', label: '里程碑记录', icon: '🏆', group: 'record', color: '#FFF8E1', textColor: '#F9A825' },
  { value: 'learning', label: '学习笔记', icon: '📚', group: 'study', color: '#E8F5E9', textColor: '#43A047' },
  { value: 'reading', label: '阅读笔记', icon: '📝', group: 'study', color: '#E8EAF6', textColor: '#3949AB' },
  { value: 'family', label: '亲子时光', icon: '👨‍👩‍👧', group: 'life', color: '#FCE4EC', textColor: '#E91E63' },
  { value: 'showcase', label: '作品展示', icon: '🎨', group: 'life', color: '#F3E5F5', textColor: '#9C27B0' },
  { value: 'travel', label: '旅行游记', icon: '✈️', group: 'life', color: '#E1F5FE', textColor: '#0288D1' },
  { value: 'sports', label: '运动记录', icon: '⚽', group: 'life', color: '#FFEBEE', textColor: '#D32F2F' },
  { value: 'gratitude', label: '感恩日记', icon: '🙏', group: 'growth', color: '#FFF3E0', textColor: '#FF8F00' },
  { value: 'goal', label: '梦想目标', icon: '🎯', group: 'growth', color: '#E0F7FA', textColor: '#00838F' },
  { value: 'emotion', label: '情绪日记', icon: '💭', group: 'growth', color: '#EDE7F6', textColor: '#7B1FA2' },
  { value: 'custom', label: '自定义', icon: '✏️', group: 'other', color: '#F5F5F5', textColor: '#616161' }
]

// 心情分组
var MOOD_GROUPS = [
  { key: 'positive', label: '开心的' },
  { key: 'calm', label: '平静的' },
  { key: 'negative', label: '不开心' },
  { key: 'special', label: '特别的' }
]

// 心情定义
var MOODS = [
  { value: 'happy', label: '开心', icon: '😊', group: 'positive' },
  { value: 'excited', label: '兴奋', icon: '🤩', group: 'positive' },
  { value: 'proud', label: '自豪', icon: '😎', group: 'positive' },
  { value: 'grateful', label: '感恩', icon: '🥰', group: 'positive' },
  { value: 'confident', label: '自信', icon: '💪', group: 'positive' },
  { value: 'playful', label: '俏皮', icon: '😜', group: 'positive' },
  { value: 'calm', label: '平静', icon: '😌', group: 'calm' },
  { value: 'focused', label: '专注', icon: '🧐', group: 'calm' },
  { value: 'curious', label: '好奇', icon: '🤔', group: 'calm' },
  { value: 'tired', label: '累了', icon: '😴', group: 'negative' },
  { value: 'sad', label: '难过', icon: '😢', group: 'negative' },
  { value: 'anxious', label: '焦虑', icon: '😰', group: 'negative' },
  { value: 'angry', label: '生气', icon: '😠', group: 'negative' },
  { value: 'surprised', label: '惊喜', icon: '😲', group: 'special' },
  { value: 'silly', label: '搞怪', icon: '🤪', group: 'special' }
]

// 自定义类型存储键
var CUSTOM_TYPES_KEY = 'note_custom_types'
var MAX_CUSTOM_TYPES = 10

// 获取所有类型（内置 + 自定义）
var getAllTypes = function() {
  var customTypes = getCustomTypes()
  return NOTE_TYPES.concat(customTypes)
}

// 获取自定义类型列表
var getCustomTypes = function() {
  return childStorage.get(CUSTOM_TYPES_KEY) || []
}

// 添加自定义类型
var addCustomType = function(type) {
  var customTypes = getCustomTypes()
  if (customTypes.length >= MAX_CUSTOM_TYPES) return { success: false, reason: 'max_limit' }
  var exists = customTypes.some(function(t) { return t.value === type.value })
  if (exists) return { success: false, reason: 'duplicate' }
  var builtinConflict = NOTE_TYPES.some(function(t) { return t.value === type.value })
  if (builtinConflict) return { success: false, reason: 'builtin_conflict' }
  customTypes.push({
    value: type.value,
    label: type.label,
    icon: type.icon,
    group: 'other',
    color: type.color || '#F5F5F5',
    textColor: type.textColor || '#616161',
    isCustom: true
  })
  childStorage.set(CUSTOM_TYPES_KEY, customTypes)
  return { success: true }
}

// 删除自定义类型
var removeCustomType = function(value) {
  var customTypes = getCustomTypes().filter(function(t) { return t.value !== value })
  childStorage.set(CUSTOM_TYPES_KEY, customTypes)
}

// 根据 value 获取类型信息
var getTypeInfo = function(value) {
  var allTypes = getAllTypes()
  return allTypes.find(function(t) { return t.value === value }) || NOTE_TYPES[0]
}

// 根据 value 获取心情信息
var getMoodInfo = function(value) {
  return MOODS.find(function(m) { return m.value === value }) || MOODS[0]
}

// 获取列表页 Tab 数据
var getCategoryTabs = function() {
  var tabs = [{ value: 'all', label: '全部', icon: '📋' }]
  NOTE_TYPES.forEach(function(t) {
    tabs.push({ value: t.value, label: t.label.length > 4 ? t.label.substring(0, 4) : t.label, icon: t.icon })
  })
  var customTypes = getCustomTypes()
  customTypes.forEach(function(t) {
    tabs.push({ value: t.value, label: t.label.length > 4 ? t.label.substring(0, 4) : t.label, icon: t.icon })
  })
  return tabs
}

module.exports = {
  TYPE_GROUPS: TYPE_GROUPS,
  NOTE_TYPES: NOTE_TYPES,
  MOOD_GROUPS: MOOD_GROUPS,
  MOODS: MOODS,
  CUSTOM_TYPES_KEY: CUSTOM_TYPES_KEY,
  MAX_CUSTOM_TYPES: MAX_CUSTOM_TYPES,
  getAllTypes: getAllTypes,
  getCustomTypes: getCustomTypes,
  addCustomType: addCustomType,
  removeCustomType: removeCustomType,
  getTypeInfo: getTypeInfo,
  getMoodInfo: getMoodInfo,
  getCategoryTabs: getCategoryTabs
}
