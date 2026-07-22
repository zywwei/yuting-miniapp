/**
 * 英语学习数据层
 * 26 个字母 + 基础单词，按难度分级
 * 供 english 主页 / 全部英语列表页共用
 */

var childStorage = require('./child-storage.js')
var cloud = require('./cloud.js')

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

// ===== 单词数据 =====
var WORDS = [
  // L1 - 问候
  { id: 'e01', word: 'Hello', phonetic: '/həˈloʊ/', meaning: '你好', category: '问候', level: 'L1' },
  { id: 'e02', word: 'Hi', phonetic: '/haɪ/', meaning: '嗨', category: '问候', level: 'L1' },
  { id: 'e03', word: 'Goodbye', phonetic: '/ɡʊdˈbaɪ/', meaning: '再见', category: '问候', level: 'L1' },
  { id: 'e04', word: 'Please', phonetic: '/pliːz/', meaning: '请', category: '问候', level: 'L1' },
  { id: 'e05', word: 'Thank you', phonetic: '/θæŋk juː/', meaning: '谢谢', category: '问候', level: 'L1' },
  { id: 'e06', word: 'Sorry', phonetic: '/ˈsɒri/', meaning: '对不起', category: '问候', level: 'L1' },
  // L1 - 数字
  { id: 'e07', word: 'One', phonetic: '/wʌn/', meaning: '一', category: '数字', level: 'L1' },
  { id: 'e08', word: 'Two', phonetic: '/tuː/', meaning: '二', category: '数字', level: 'L1' },
  { id: 'e09', word: 'Three', phonetic: '/θriː/', meaning: '三', category: '数字', level: 'L1' },
  { id: 'e10', word: 'Four', phonetic: '/fɔːr/', meaning: '四', category: '数字', level: 'L1' },
  { id: 'e11', word: 'Five', phonetic: '/faɪv/', meaning: '五', category: '数字', level: 'L1' },
  { id: 'e12', word: 'Six', phonetic: '/sɪks/', meaning: '六', category: '数字', level: 'L1' },
  { id: 'e13', word: 'Seven', phonetic: '/ˈsevn/', meaning: '七', category: '数字', level: 'L1' },
  { id: 'e14', word: 'Eight', phonetic: '/eɪt/', meaning: '八', category: '数字', level: 'L1' },
  { id: 'e15', word: 'Nine', phonetic: '/naɪn/', meaning: '九', category: '数字', level: 'L1' },
  { id: 'e16', word: 'Ten', phonetic: '/ten/', meaning: '十', category: '数字', level: 'L1' },
  // L2 - 颜色
  { id: 'e17', word: 'Red', phonetic: '/red/', meaning: '红色', category: '颜色', level: 'L2' },
  { id: 'e18', word: 'Blue', phonetic: '/bluː/', meaning: '蓝色', category: '颜色', level: 'L2' },
  { id: 'e19', word: 'Green', phonetic: '/ɡriːn/', meaning: '绿色', category: '颜色', level: 'L2' },
  { id: 'e20', word: 'Yellow', phonetic: '/ˈjeloʊ/', meaning: '黄色', category: '颜色', level: 'L2' },
  // L2 - 动物
  { id: 'e21', word: 'Cat', phonetic: '/kæt/', meaning: '猫', category: '动物', level: 'L2' },
  { id: 'e22', word: 'Dog', phonetic: '/dɒɡ/', meaning: '狗', category: '动物', level: 'L2' },
  { id: 'e23', word: 'Bird', phonetic: '/bɜːrd/', meaning: '鸟', category: '动物', level: 'L2' },
  { id: 'e24', word: 'Fish', phonetic: '/fɪʃ/', meaning: '鱼', category: '动物', level: 'L2' },
  // L2 - 水果
  { id: 'e25', word: 'Apple', phonetic: '/ˈæpl/', meaning: '苹果', category: '水果', level: 'L2' },
  { id: 'e26', word: 'Banana', phonetic: '/bəˈnænə/', meaning: '香蕉', category: '水果', level: 'L2' },
  // L3 - 家人
  { id: 'e27', word: 'Mother', phonetic: '/ˈmʌðər/', meaning: '妈妈', category: '家人', level: 'L3' },
  { id: 'e28', word: 'Father', phonetic: '/ˈfɑːðər/', meaning: '爸爸', category: '家人', level: 'L3' },
  // L3 - 自然
  { id: 'e29', word: 'Sun', phonetic: '/sʌn/', meaning: '太阳', category: '自然', level: 'L3' },
  { id: 'e30', word: 'Moon', phonetic: '/muːn/', meaning: '月亮', category: '自然', level: 'L3' }
]

// 字母等级
var LETTER_LEVELS = [
  { key: 'L1', name: '入门 (A-J)' },
  { key: 'L2', name: '基础 (K-T)' },
  { key: 'L3', name: '进阶 (U-Z)' }
]

// 单词等级
var WORD_LEVELS = [
  { key: 'L1', name: '入门 (问候/数字)' },
  { key: 'L2', name: '基础 (颜色/动物/水果)' },
  { key: 'L3', name: '进阶 (家人/自然)' }
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
