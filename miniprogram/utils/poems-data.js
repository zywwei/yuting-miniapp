/**
 * 古诗数据层
 * 92 首经典古诗，按学段分 4 级
 * 数据拆分到 poems-level-1 ~ poems-level-4 四个文件
 * 供 poems 主页 / 全部古诗列表页共用
 */

var childStorage = require('./child-storage.js')
var cloud = require('./cloud.js')
var level1 = require('./poems-level-1.js')
var level2 = require('./poems-level-2.js')
var level3 = require('./poems-level-3.js')
var level4 = require('./poems-level-4.js')

// 全部古诗数据（L1 → L4 顺序）
var ALL_POEMS = [].concat(level1, level2, level3, level4)

// 难度等级（按学段）
var LEVELS = [
  { key: 'L1', name: '小学低年级' },
  { key: 'L2', name: '小学高年级' },
  { key: 'L3', name: '初中' },
  { key: 'L4', name: '高中' }
]

var LEVEL_NAME_MAP = {}
LEVELS.forEach(function(l) { LEVEL_NAME_MAP[l.key] = l.name })

/**
 * 读取已学状态映射表 learnProgress.poems
 * @returns {Object} poemId -> { memorizedAt, title }
 */
function getLearnedMap() {
  var learnProgress = childStorage.get('learnProgress') || {}
  return learnProgress.poems || {}
}

/**
 * 加载全部古诗（附带 memorized 状态）+ 已背数量
 * @returns {{ poems: Array, memorizedCount: number }}
 */
function loadPoems() {
  var poemProgress = getLearnedMap()
  var memorizedCount = 0
  var poems = ALL_POEMS.map(function(poem) {
    var memorized = !!poemProgress[poem.id]
    if (memorized) memorizedCount++
    return {
      id: poem.id,
      title: poem.title,
      author: poem.author,
      dynasty: poem.dynasty,
      content: poem.content,
      level: poem.level,
      levelName: LEVEL_NAME_MAP[poem.level] || '',
      memorized: memorized
    }
  })
  return { poems: poems, memorizedCount: memorizedCount }
}

/**
 * 根据 id 获取单首古诗（附带 memorized 状态）及其在列表中的索引
 * @param {string} poemId
 * @returns {{ poem: Object|null, index: number }}
 */
function getPoemById(poemId) {
  var poemProgress = getLearnedMap()
  var index = -1
  var poem = null
  for (var i = 0; i < ALL_POEMS.length; i++) {
    if (ALL_POEMS[i].id === poemId) {
      index = i
      var p = ALL_POEMS[i]
      poem = {
        id: p.id,
        title: p.title,
        author: p.author,
        dynasty: p.dynasty,
        content: p.content,
        level: p.level,
        levelName: LEVEL_NAME_MAP[p.level] || '',
        memorized: !!poemProgress[p.id]
      }
      break
    }
  }
  return { poem: poem, index: index }
}

/**
 * 标记某首古诗为已背诵（写本地 + 异步上传云端）
 * @param {string} poemId
 * @param {string} title
 * @returns {Object} 最新的 learnProgress
 */
function markMemorized(poemId, title) {
  var learnProgress = childStorage.get('learnProgress') || {}
  if (!learnProgress.poems) learnProgress.poems = {}
  learnProgress.poems[poemId] = {
    memorizedAt: new Date().toISOString(),
    title: title
  }
  childStorage.set('learnProgress', learnProgress)
  cloud.uploadLearnProgress(learnProgress).catch(function(err) {
    console.warn('学习进度同步失败:', err)
  })
  return learnProgress
}

module.exports = {
  ALL_POEMS: ALL_POEMS,
  LEVELS: LEVELS,
  LEVEL_NAME_MAP: LEVEL_NAME_MAP,
  loadPoems: loadPoems,
  getPoemById: getPoemById,
  markMemorized: markMemorized,
  getLearnedMap: getLearnedMap
}
