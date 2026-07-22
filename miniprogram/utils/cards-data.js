/**
 * 识字卡片数据层
 * 2000 个常用汉字，按小学年级分 4 级
 * 数据拆分到 cards-level-1 ~ cards-level-4 四个文件，本文件汇总并提供读写工具
 * 供 cards 主页 / 全部字列表页共用
 */

var childStorage = require('./child-storage.js')
var cloud = require('./cloud.js')
var level1 = require('./cards-level-1.js')
var level2 = require('./cards-level-2.js')
var level3 = require('./cards-level-3.js')
var level4 = require('./cards-level-4.js')

// 全部卡片（L1 → L4 顺序）
var BUILTIN_CARDS = [].concat(level1, level2, level3, level4)

// 难度等级（按小学年级）
var LEVELS = [
  { key: 'L1', name: '一年级' },
  { key: 'L2', name: '二年级' },
  { key: 'L3', name: '三四年级' },
  { key: 'L4', name: '五六年级' }
]

var LEVEL_NAME_MAP = {}
LEVELS.forEach(function(l) { LEVEL_NAME_MAP[l.key] = l.name })

/**
 * 读取已学状态映射表 learnProgress.cards
 * @returns {Object} cardId -> { learnedAt, word }
 */
function getLearnedMap() {
  var learnProgress = childStorage.get('learnProgress') || {}
  return learnProgress.cards || {}
}

/**
 * 加载全部卡片（附带 learned 状态）+ 已学数量
 * @returns {{ cards: Array, learnedCount: number }}
 */
function loadCards() {
  var cardProgress = getLearnedMap()
  var learnedCount = 0
  var cards = BUILTIN_CARDS.map(function(card) {
    var learned = !!cardProgress[card.id]
    if (learned) learnedCount++
    return {
      id: card.id,
      word: card.word,
      pinyin: card.pinyin,
      meaning: card.meaning,
      level: card.level,
      levelName: LEVEL_NAME_MAP[card.level] || '',
      learned: learned
    }
  })
  return { cards: cards, learnedCount: learnedCount }
}

/**
 * 根据 id 获取单个卡片（附带 learned 状态）及其在列表中的索引
 * @param {string} cardId
 * @returns {{ card: Object|null, index: number }}
 */
function getCardById(cardId) {
  var cardProgress = getLearnedMap()
  var index = -1
  var card = null
  for (var i = 0; i < BUILTIN_CARDS.length; i++) {
    if (BUILTIN_CARDS[i].id === cardId) {
      index = i
      var c = BUILTIN_CARDS[i]
      card = {
        id: c.id,
        word: c.word,
        pinyin: c.pinyin,
        meaning: c.meaning,
        level: c.level,
        levelName: LEVEL_NAME_MAP[c.level] || '',
        learned: !!cardProgress[c.id]
      }
      break
    }
  }
  return { card: card, index: index }
}

/**
 * 标记某个字为已学（写本地 + 异步上传云端）
 * @param {string} cardId
 * @param {string} word
 * @returns {Object} 最新的 learnProgress
 */
function markLearned(cardId, word) {
  var learnProgress = childStorage.get('learnProgress') || {}
  if (!learnProgress.cards) learnProgress.cards = {}
  learnProgress.cards[cardId] = {
    learnedAt: new Date().toISOString(),
    word: word
  }
  childStorage.set('learnProgress', learnProgress)
  cloud.uploadLearnProgress(learnProgress).catch(function(err) {
    console.warn('学习进度同步失败:', err)
  })
  return learnProgress
}

module.exports = {
  BUILTIN_CARDS: BUILTIN_CARDS,
  LEVELS: LEVELS,
  LEVEL_NAME_MAP: LEVEL_NAME_MAP,
  loadCards: loadCards,
  getCardById: getCardById,
  markLearned: markLearned,
  getLearnedMap: getLearnedMap
}
