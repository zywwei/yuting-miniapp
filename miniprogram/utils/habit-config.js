/**
 * 习惯配置
 * 统一管理默认习惯列表，避免多处硬编码不一致
 */

var DEFAULT_HABITS = [
  // 睡眠作息
  { type: 'early_up', name: '早起', icon: '🌅', color: '#FF9800', target: 1, group: 'sleep' },
  { type: 'early_sleep', name: '早睡', icon: '🌙', color: '#7C4DFF', target: 1, group: 'sleep' },
  { type: 'nap', name: '午睡', icon: '😴', color: '#00BCD4', target: 1, group: 'sleep' },
  // 健康卫生
  { type: 'brushing', name: '刷牙', icon: '🦷', color: '#4CAF50', target: 2, group: 'health' },
  { type: 'wash_hands', name: '洗手', icon: '🧼', color: '#03A9F4', target: 3, group: 'health' },
  { type: 'drink', name: '喝水', icon: '💧', color: '#00BCD4', target: 8, group: 'health' },
  // 生活自理
  { type: 'eat_breakfast', name: '吃早餐', icon: '🥣', color: '#FF9800', target: 1, group: 'life' },
  { type: 'eat_lunch', name: '吃午餐', icon: '🍱', color: '#4CAF50', target: 1, group: 'life' },
  { type: 'eat_dinner', name: '吃晚餐', icon: '🍛', color: '#FF5722', target: 1, group: 'life' },
  { type: 'tidy', name: '整理玩具', icon: '🧸', color: '#9C27B0', target: 1, group: 'life' },
  { type: 'housework', name: '做家务', icon: '🧹', color: '#795548', target: 1, group: 'life' },
  // 学习成长
  { type: 'reading', name: '阅读', icon: '📖', color: '#2196F3', target: 1, group: 'learn' },
  { type: 'exercise', name: '运动', icon: '🏃', color: '#FF5722', target: 1, group: 'learn' },
  { type: 'polite', name: '礼貌用语', icon: '🙏', color: '#4CAF50', target: 3, group: 'learn' }
]

// 首页常用习惯类型
var HOME_HABIT_TYPES = [
  'brushing', 'early_up', 'early_sleep', 'drink',
  'wash_hands', 'eat_breakfast', 'eat_lunch', 'eat_dinner'
]

/**
 * 获取默认习惯列表
 * @param {string} mode - 'all' 返回全部，'home' 返回首页常用子集
 * @returns {Array}
 */
function getDefaultHabits(mode) {
  if (mode === 'home') {
    return DEFAULT_HABITS.filter(function(h) {
      return HOME_HABIT_TYPES.indexOf(h.type) >= 0
    })
  }
  return DEFAULT_HABITS.slice()
}

module.exports = {
  DEFAULT_HABITS: DEFAULT_HABITS,
  HOME_HABIT_TYPES: HOME_HABIT_TYPES,
  getDefaultHabits: getDefaultHabits
}
