/**
 * 英语学习数据层
 * 26 个字母 + 400 单词，按学段分 5 级
 * 数据拆分到 english-level-1 ~ english-level-5 五个文件
 * 供 english 主页 / 全部英语列表页共用
 */

var childStorage = require('./child-storage.js')
var cloud = require('./cloud.js')
var level1 = require('./english-level-1.js')
var level2 = require('./english-level-2.js')
var level3 = require('./english-level-3.js')
var level4 = require('./english-level-4.js')
var level5 = require('./english-level-5.js')

// ===== 字母数据 =====
var LETTERS = [
  { id: 'l01', letter: 'A', phonetic: '/eɪ/', word: 'Apple', wordMeaning: '苹果', wordPhonetic: '/ˈæpl/', level: 'L1' },
  { id: 'l02', letter: 'B', phonetic: '/biː/', word: 'Ball', wordMeaning: '球', wordPhonetic: '/bɔːl/', level: 'L1' },
  { id: 'l03', letter: 'C', phonetic: '/siː/', word: 'Cat', wordMeaning: '猫', wordPhonetic: '/kæt/', level: 'L1' },
  { id: 'l04', letter: 'D', phonetic: '/diː/', word: 'Dog', wordMeaning: '狗', wordPhonetic: '/dɒɡ/', level: 'L1' },
  { id: 'l05', letter: 'E', phonetic: '/iː/', word: 'Egg', wordMeaning: '鸡蛋', wordPhonetic: '/eɡ/', level: 'L1' },
  { id: 'l06', letter: 'F', phonetic: '/ef/', word: 'Fish', wordMeaning: '鱼', wordPhonetic: '/fɪʃ/', level: 'L1' },
  { id: 'l07', letter: 'G', phonetic: '/dʒiː/', word: 'Grape', wordMeaning: '葡萄', wordPhonetic: '/ɡreɪp/', level: 'L1' },
  { id: 'l08', letter: 'H', phonetic: '/eɪtʃ/', word: 'Hat', wordMeaning: '帽子', wordPhonetic: '/hæt/', level: 'L1' },
  { id: 'l09', letter: 'I', phonetic: '/aɪ/', word: 'Ice', wordMeaning: '冰', wordPhonetic: '/aɪs/', level: 'L1' },
  { id: 'l10', letter: 'J', phonetic: '/dʒeɪ/', word: 'Juice', wordMeaning: '果汁', wordPhonetic: '/dʒuːs/', level: 'L1' },
  { id: 'l11', letter: 'K', phonetic: '/keɪ/', word: 'Kite', wordMeaning: '风筝', wordPhonetic: '/kaɪt/', level: 'L2' },
  { id: 'l12', letter: 'L', phonetic: '/el/', word: 'Lion', wordMeaning: '狮子', wordPhonetic: '/ˈlaɪən/', level: 'L2' },
  { id: 'l13', letter: 'M', phonetic: '/em/', word: 'Moon', wordMeaning: '月亮', wordPhonetic: '/muːn/', level: 'L2' },
  { id: 'l14', letter: 'N', phonetic: '/en/', word: 'Nose', wordMeaning: '鼻子', wordPhonetic: '/noʊz/', level: 'L2' },
  { id: 'l15', letter: 'O', phonetic: '/oʊ/', word: 'Orange', wordMeaning: '橙子', wordPhonetic: '/ˈɒrɪndʒ/', level: 'L2' },
  { id: 'l16', letter: 'P', phonetic: '/piː/', word: 'Panda', wordMeaning: '熊猫', wordPhonetic: '/ˈpændə/', level: 'L2' },
  { id: 'l17', letter: 'Q', phonetic: '/kjuː/', word: 'Queen', wordMeaning: '女王', wordPhonetic: '/kwiːn/', level: 'L2' },
  { id: 'l18', letter: 'R', phonetic: '/ɑːr/', word: 'Rabbit', wordMeaning: '兔子', wordPhonetic: '/ˈræbɪt/', level: 'L2' },
  { id: 'l19', letter: 'S', phonetic: '/es/', word: 'Star', wordMeaning: '星星', wordPhonetic: '/stɑːr/', level: 'L2' },
  { id: 'l20', letter: 'T', phonetic: '/tiː/', word: 'Tree', wordMeaning: '树', wordPhonetic: '/triː/', level: 'L2' },
  { id: 'l21', letter: 'U', phonetic: '/juː/', word: 'Umbrella', wordMeaning: '雨伞', wordPhonetic: '/ʌmˈbrelə/', level: 'L3' },
  { id: 'l22', letter: 'V', phonetic: '/viː/', word: 'Violin', wordMeaning: '小提琴', wordPhonetic: '/ˌvaɪəˈlɪn/', level: 'L3' },
  { id: 'l23', letter: 'W', phonetic: '/ˈdʌbljuː/', word: 'Water', wordMeaning: '水', wordPhonetic: '/ˈwɔːtər/', level: 'L3' },
  { id: 'l24', letter: 'X', phonetic: '/eks/', word: 'X-ray', wordMeaning: 'X光', wordPhonetic: '/ˈeks reɪ/', level: 'L3' },
  { id: 'l25', letter: 'Y', phonetic: '/waɪ/', word: 'Yellow', wordMeaning: '黄色', wordPhonetic: '/ˈjeloʊ/', level: 'L3' },
  { id: 'l26', letter: 'Z', phonetic: '/zed/', word: 'Zoo', wordMeaning: '动物园', wordPhonetic: '/zuː/', level: 'L3' }
]

// ===== 单词数据（L1-L5 汇总）=====
var WORDS = [].concat(level1, level2, level3, level4, level5)

// 字母等级
var LETTER_LEVELS = [
  { key: 'L1', name: '启蒙 (A-J)' },
  { key: 'L2', name: '基础 (K-T)' },
  { key: 'L3', name: '进阶 (U-Z)' }
]

// 单词等级（按学段）
var WORD_LEVELS = [
  { key: 'L1', name: '幼儿园' },
  { key: 'L2', name: '小学低年级' },
  { key: 'L3', name: '小学高年级' },
  { key: 'L4', name: '初中' },
  { key: 'L5', name: '高中' }
]

var LETTER_LEVEL_NAME_MAP = {}
LETTER_LEVELS.forEach(function(l) { LETTER_LEVEL_NAME_MAP[l.key] = l.name })

var WORD_LEVEL_NAME_MAP = {}
WORD_LEVELS.forEach(function(l) { WORD_LEVEL_NAME_MAP[l.key] = l.name })

/**
 * 读取已学状态映射表 learnProgress.english
 * @returns {Object} id -> { learnedAt }
 */
function getLearnedMap() {
  var learnProgress = childStorage.get('learnProgress') || {}
  return learnProgress.english || {}
}

/**
 * 加载全部字母（附带 learned 状态）+ 已学数量
 * @returns {{ letters: Array, learnedCount: number }}
 */
function loadLetters() {
  var englishProgress = getLearnedMap()
  var learnedCount = 0
  var letters = LETTERS.map(function(item) {
    var learned = !!englishProgress[item.id]
    if (learned) learnedCount++
    return {
      id: item.id,
      letter: item.letter,
      phonetic: item.phonetic,
      word: item.word,
      wordMeaning: item.wordMeaning,
      wordPhonetic: item.wordPhonetic,
      level: item.level,
      levelName: LETTER_LEVEL_NAME_MAP[item.level] || '',
      learned: learned
    }
  })
  return { letters: letters, learnedCount: learnedCount }
}

/**
 * 加载全部单词（附带 learned 状态）+ 已学数量
 * @returns {{ words: Array, learnedCount: number }}
 */
function loadWords() {
  var englishProgress = getLearnedMap()
  var learnedCount = 0
  var words = WORDS.map(function(item) {
    var learned = !!englishProgress[item.id]
    if (learned) learnedCount++
    return {
      id: item.id,
      word: item.word,
      phonetic: item.phonetic,
      meaning: item.meaning,
      category: item.category,
      level: item.level,
      levelName: WORD_LEVEL_NAME_MAP[item.level] || '',
      learned: learned
    }
  })
  return { words: words, learnedCount: learnedCount }
}

/**
 * 标记字母/单词为已学（写本地 + 异步上传云端）
 * @param {string} id
 * @param {string} name
 * @returns {Object} 最新的 learnProgress
 */
function markLearned(id, name) {
  var learnProgress = childStorage.get('learnProgress') || {}
  if (!learnProgress.english) learnProgress.english = {}
  learnProgress.english[id] = {
    learnedAt: new Date().toISOString(),
    name: name
  }
  childStorage.set('learnProgress', learnProgress)
  cloud.uploadLearnProgress(learnProgress).catch(function(err) {
    console.warn('学习进度同步失败:', err)
  })
  return learnProgress
}

module.exports = {
  LETTERS: LETTERS,
  WORDS: WORDS,
  LETTER_LEVELS: LETTER_LEVELS,
  WORD_LEVELS: WORD_LEVELS,
  LETTER_LEVEL_NAME_MAP: LETTER_LEVEL_NAME_MAP,
  WORD_LEVEL_NAME_MAP: WORD_LEVEL_NAME_MAP,
  loadLetters: loadLetters,
  loadWords: loadWords,
  markLearned: markLearned,
  getLearnedMap: getLearnedMap
}
