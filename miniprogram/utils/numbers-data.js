/**
 * 数字学习数据层
 * 1-100 数字，按难度分 4 级
 * 供 numbers 主页 / 全部数字列表页共用
 */

var childStorage = require('./child-storage.js')
var cloud = require('./cloud.js')

// 难度等级
var LEVELS = [
  { key: 'L1', name: '入门 (1-10)' },
  { key: 'L2', name: '基础 (11-20)' },
  { key: 'L3', name: '进阶 (21-50)' },
  { key: 'L4', name: '拓展 (51-100)' }
]

var LEVEL_NAME_MAP = {}
LEVELS.forEach(function(l) { LEVEL_NAME_MAP[l.key] = l.name })

// 根据数字获取等级
function getLevel(num) {
  if (num <= 10) return 'L1'
  if (num <= 20) return 'L2'
  if (num <= 50) return 'L3'
  return 'L4'
}

// 数字转中文
function numberToChinese(num) {
  var chineseNumbers = ['零', '一', '二', '三', '四', '五', '六', '七', '八', '九']
  if (num <= 10) {
    return num === 10 ? '十' : chineseNumbers[num]
  }
  if (num < 20) {
    return '十' + chineseNumbers[num - 10]
  }
  if (num < 100) {
    var tens = Math.floor(num / 10)
    var ones = num % 10
    return chineseNumbers[tens] + '十' + (ones > 0 ? chineseNumbers[ones] : '')
  }
  return '一百'
}

// 生成全部数字数据
function generateNumbers() {
  var numbers = []
  for (var i = 1; i <= 100; i++) {
    numbers.push({
      id: 'n' + i,
      number: i,
      chinese: numberToChinese(i),
      level: getLevel(i),
      levelName: LEVEL_NAME_MAP[getLevel(i)] || ''
    })
  }
  return numbers
}

var ALL_NUMBERS = generateNumbers()

/**
 * 读取已学状态映射表 learnProgress.numbers
 * @returns {Object} number -> { learnedAt }
 */
function getLearnedMap() {
  var learnProgress = childStorage.get('learnProgress') || {}
  return learnProgress.numbers || {}
}

/**
 * 加载全部数字（附带 learned 状态）+ 已学数量
 * @returns {{ numbers: Array, learnedCount: number }}
 */
function loadNumbers() {
  var numberProgress = getLearnedMap()
  var learnedCount = 0
  var numbers = ALL_NUMBERS.map(function(item) {
    var learned = !!numberProgress[item.number]
    if (learned) learnedCount++
    return {
      id: item.id,
      number: item.number,
      chinese: item.chinese,
      level: item.level,
      levelName: item.levelName,
      learned: learned
    }
  })
  return { numbers: numbers, learnedCount: learnedCount }
}

/**
 * 根据 number 获取单个数字（附带 learned 状态）及其在列表中的索引
 * @param {number} num
 * @returns {{ item: Object|null, index: number }}
 */
function getNumberByValue(num) {
  var numberProgress = getLearnedMap()
  var index = -1
  var item = null
  for (var i = 0; i < ALL_NUMBERS.length; i++) {
    if (ALL_NUMBERS[i].number === num) {
      index = i
      var n = ALL_NUMBERS[i]
      item = {
        id: n.id,
        number: n.number,
        chinese: n.chinese,
        level: n.level,
        levelName: n.levelName,
        learned: !!numberProgress[n.number]
      }
      break
    }
  }
  return { item: item, index: index }
}

/**
 * 标记某个数字为已学（写本地 + 异步上传云端）
 * @param {number} num
 * @returns {Object} 最新的 learnProgress
 */
function markLearned(num) {
  var learnProgress = childStorage.get('learnProgress') || {}
  if (!learnProgress.numbers) learnProgress.numbers = {}
  learnProgress.numbers[num] = {
    learnedAt: new Date().toISOString(),
    number: num
  }
  childStorage.set('learnProgress', learnProgress)
  cloud.uploadLearnProgress(learnProgress).catch(function(err) {
    console.warn('学习进度同步失败:', err)
  })
  return learnProgress
}

module.exports = {
  ALL_NUMBERS: ALL_NUMBERS,
  LEVELS: LEVELS,
  LEVEL_NAME_MAP: LEVEL_NAME_MAP,
  numberToChinese: numberToChinese,
  loadNumbers: loadNumbers,
  getNumberByValue: getNumberByValue,
  markLearned: markLearned,
  getLearnedMap: getLearnedMap
}
