/**
 * 摇骰子业务逻辑管理器
 */

var childStorage = require('/utils/child-storage.js')
var gameCloud = require('/packageCreate/utils/game-cloud.js')

// 任务骰子任务库
var MISSION_TASKS = [
  // 点数1：表演类
  { id: 1, dice: 1, icon: '🐱', title: '学猫叫', desc: '学小猫叫3声', type: 'performance' },
  { id: 2, dice: 1, icon: '🏋️', title: '运动时刻', desc: '做5个蹲起', type: 'performance' },
  { id: 3, dice: 1, icon: '💃', title: '舞蹈达人', desc: '跳一段即兴舞蹈', type: 'performance' },
  { id: 4, dice: 1, icon: '🤡', title: '搞笑大师', desc: '做一个搞笑表情', type: 'performance' },
  { id: 5, dice: 1, icon: '🐸', title: '青蛙跳', desc: '学青蛙跳3下', type: 'performance' },
  
  // 点数2：知识类
  { id: 6, dice: 2, icon: '🍎', title: '水果达人', desc: '说出5种水果名', type: 'knowledge' },
  { id: 7, dice: 2, icon: '📜', title: '诗词大会', desc: '背诵一首古诗', type: 'knowledge' },
  { id: 8, dice: 2, icon: '🔢', title: '数字接龙', desc: '从1数到20', type: 'knowledge' },
  { id: 9, dice: 2, icon: '🌈', title: '颜色大师', desc: '说出7种颜色', type: 'knowledge' },
  { id: 10, dice: 2, icon: '🎵', title: '小小歌手', desc: '唱一首歌的两句', type: 'knowledge' },
  
  // 点数3：互动类
  { id: 11, dice: 3, icon: '🤝', title: '击掌庆祝', desc: '和旁边的人击掌', type: 'social' },
  { id: 12, dice: 3, icon: '🤗', title: '温暖拥抱', desc: '给家人一个拥抱', type: 'social' },
  { id: 13, dice: 3, icon: '👋', title: '自我介绍', desc: '向大家介绍自己', type: 'social' },
  { id: 14, dice: 3, icon: '🙏', title: '感谢时刻', desc: '说一句感谢的话', type: 'social' },
  { id: 15, dice: 3, icon: '✋', title: 'High Five', desc: '和所有人击掌', type: 'social' },
  
  // 点数4：创意类
  { id: 16, dice: 4, icon: '✏️', title: '创意画画', desc: '画一个笑脸', type: 'creative' },
  { id: 17, dice: 4, icon: '🧱', title: '身体字母', desc: '用身体摆一个字母', type: 'creative' },
  { id: 18, dice: 4, icon: '🎭', title: '角色扮演', desc: '模仿一个动物', type: 'creative' },
  { id: 19, dice: 4, icon: '🏗️', title: '建筑师', desc: '用3样东西搭个塔', type: 'creative' },
  { id: 20, dice: 4, icon: '📖', title: '故事大王', desc: '编一个3句话的故事', type: 'creative' },
  
  // 点数5：挑战类
  { id: 21, dice: 5, icon: '🦩', title: '金鸡独立', desc: '单脚站立10秒', type: 'challenge' },
  { id: 22, dice: 5, icon: '🔄', title: '转圈挑战', desc: '闭眼转3圈', type: 'challenge' },
  { id: 23, dice: 5, icon: '⏱️', title: '速度王', desc: '10秒内拍手20次', type: 'challenge' },
  { id: 24, dice: 5, icon: '🧘', title: '木头人', desc: '保持不动15秒', type: 'challenge' },
  { id: 25, dice: 5, icon: '👃', title: '鬼脸大赛', desc: '做3个不同的鬼脸', type: 'challenge' },
  
  // 点数6：奖励类
  { id: 26, dice: 6, icon: '⭐', title: '幸运星', desc: '获得一颗星星', type: 'reward' },
  { id: 27, dice: 6, icon: '🎴', title: '免任务卡', desc: '下次免做任务', type: 'reward' },
  { id: 28, dice: 6, icon: '🎲', title: '再来一次', desc: '可以再掷一次', type: 'reward' },
  { id: 29, dice: 6, icon: '👑', title: '小国王', desc: '指定一人做任务', type: 'reward' },
  { id: 30, dice: 6, icon: '🎁', title: '惊喜礼物', desc: '获得双倍星星', type: 'reward' }
]

// 掷骰子
function rollDice(count) {
  var results = []
  for (var i = 0; i < count; i++) {
    results.push(Math.floor(Math.random() * 6) + 1)
  }
  return results
}

// 检测特殊组合
function checkSpecialCombination(dice) {
  if (!dice || dice.length < 3) return null

  var sorted = dice.slice().sort()

  // 豹子：三个相同
  if (sorted[0] === sorted[2]) {
    return { type: 'leopard', name: '豹子', icon: '🐆', bonus: 10 }
  }

  // 顺子：三个连续
  if (sorted[2] - sorted[1] === 1 && sorted[1] - sorted[0] === 1) {
    return { type: 'straight', name: '顺子', icon: '📈', bonus: 5 }
  }

  return null
}

// 计算总点数
function calculateSum(dice) {
  return dice.reduce(function(sum, val) { return sum + val }, 0)
}

// 获取任务
function getTaskByDice(diceValue) {
  var tasks = MISSION_TASKS.filter(function(task) {
    return task.dice === diceValue
  })
  return tasks[Math.floor(Math.random() * tasks.length)]
}

// 获取随机任务
function getRandomTask() {
  return MISSION_TASKS[Math.floor(Math.random() * MISSION_TASKS.length)]
}

// 生成游戏记录ID
function generateId() {
  return 'dice_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

// 保存游戏记录
function saveGameRecord(record) {
  record.id = record.id || generateId()
  record.createTime = record.createTime || new Date().toISOString()

  // 更新本地统计
  gameCloud.updateLocalStats('dice', record)

  // 上传云端
  gameCloud.uploadGameRecord(record)

  return record
}

// 获取本地统计
function getStats() {
  return childStorage.get('diceStats') || {
    totalGames: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    currentStreak: 0,
    bestStreak: 0,
    leopardCount: 0,
    missionsCompleted: 0,
    totalDuration: 0,
    modeStats: {},
    opponentStats: {},
    lastPlayed: ''
  }
}

// 更新统计（用于特殊组合）
function updateStatsForSpecialCombination(type) {
  var stats = getStats()
  if (type === 'leopard') {
    stats.leopardCount = (stats.leopardCount || 0) + 1
  }
  childStorage.set('diceStats', stats)
}

// 获取已完成任务列表
function getCompletedMissions() {
  return childStorage.get('diceMissions') || []
}

// 标记任务完成
function completeMission(taskId) {
  var completed = getCompletedMissions()
  if (completed.indexOf(taskId) < 0) {
    completed.push(taskId)
    childStorage.set('diceMissions', completed)
  }
  return completed
}

module.exports = {
  MISSION_TASKS: MISSION_TASKS,
  rollDice: rollDice,
  checkSpecialCombination: checkSpecialCombination,
  calculateSum: calculateSum,
  getTaskByDice: getTaskByDice,
  getRandomTask: getRandomTask,
  generateId: generateId,
  saveGameRecord: saveGameRecord,
  getStats: getStats,
  updateStatsForSpecialCombination: updateStatsForSpecialCombination,
  getCompletedMissions: getCompletedMissions,
  completeMission: completeMission
}
