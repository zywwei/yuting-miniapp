/**
 * 国学经典数据管理层
 * 统一管理古文观止、诗词格律、成语故事、论语孟子的数据和进度
 */

var childStorage = require('../../utils/child-storage.js')
var cloud = require('../../utils/cloud.js')
var gwdData = require('./classics-gwd.js')
var poetryRulesData = require('./classics-poetry-rules.js')
var idiomsData = require('./classics-idioms.js')
var confuciusData = require('./classics-confucius.js')

// 模块映射
var MODULE_MAP = {
  'classics-gwd': { data: gwdData, name: '古文观止', storageKey: 'classicsGwd' },
  'classics-poetry-rules': { data: poetryRulesData, name: '诗词格律', storageKey: 'classicsPoetryRules' },
  'classics-idioms': { data: idiomsData, name: '成语故事', storageKey: 'classicsIdioms' },
  'classics-confucius': { data: confuciusData, name: '论语孟子', storageKey: 'classicsConfucius' }
}

/**
 * 获取学习进度映射表
 * @param {string} module - 模块类型
 * @returns {Object} id -> { learnedAt }
 */
function getLearnedMap(module) {
  var config = MODULE_MAP[module]
  if (!config) return {}
  var learnProgress = childStorage.get('learnProgress') || {}
  return learnProgress[config.storageKey] || {}
}

/**
 * 加载模块数据（附带学习状态）
 * @param {string} module - 模块类型
 * @returns {{ items: Array, learnedCount: number, totalCount: number }}
 */
function loadModuleData(module) {
  var config = MODULE_MAP[module]
  if (!config) return { items: [], learnedCount: 0, totalCount: 0 }
  
  var learnedMap = getLearnedMap(module)
  var learnedCount = 0
  
  var items = config.data.map(function(item) {
    var learned = !!learnedMap[item.id]
    if (learned) learnedCount++
    return Object.assign({}, item, { learned: learned })
  })
  
  return {
    items: items,
    learnedCount: learnedCount,
    totalCount: items.length
  }
}

/**
 * 根据ID获取单条数据
 * @param {string} module - 模块类型
 * @param {string} id - 数据ID
 * @returns {{ item: Object|null, index: number }}
 */
function getItemById(module, id) {
  var config = MODULE_MAP[module]
  if (!config) return { item: null, index: -1 }
  
  var learnedMap = getLearnedMap(module)
  var index = -1
  var item = null
  
  for (var i = 0; i < config.data.length; i++) {
    if (config.data[i].id === id) {
      index = i
      item = Object.assign({}, config.data[i], { learned: !!learnedMap[id] })
      break
    }
  }
  
  return { item: item, index: index }
}

/**
 * 标记为已学
 * @param {string} module - 模块类型
 * @param {string} id - 数据ID
 * @param {string} title - 标题（用于显示）
 */
function markAsLearned(module, id, title) {
  var config = MODULE_MAP[module]
  if (!config) return
  
  var learnProgress = childStorage.get('learnProgress') || {}
  if (!learnProgress[config.storageKey]) {
    learnProgress[config.storageKey] = {}
  }
  
  learnProgress[config.storageKey][id] = {
    learnedAt: new Date().toISOString(),
    title: title || id
  }
  
  childStorage.set('learnProgress', learnProgress)
  
  // 异步同步到云端
  cloud.uploadLearnProgress(learnProgress).catch(function(err) {
    console.warn('学习进度同步失败:', err)
  })
}

/**
 * 获取模块进度
 * @param {string} module - 模块类型
 * @returns {{ learned: number, total: number, percent: number }}
 */
function getModuleProgress(module) {
  var config = MODULE_MAP[module]
  if (!config) return { learned: 0, total: 0, percent: 0 }
  
  var learnedMap = getLearnedMap(module)
  var learned = Object.keys(learnedMap).length
  var total = config.data.length
  var percent = total > 0 ? Math.round(learned / total * 100) : 0
  
  return { learned: learned, total: total, percent: percent }
}

/**
 * 加载古文观止
 */
function loadGwdArticles() {
  return loadModuleData('classics-gwd')
}

/**
 * 加载诗词格律
 */
function loadPoetryRules() {
  return loadModuleData('classics-poetry-rules')
}

/**
 * 加载成语故事
 */
function loadIdioms() {
  return loadModuleData('classics-idioms')
}

/**
 * 加载论语孟子
 */
function loadConfuciusQuotes() {
  return loadModuleData('classics-confucius')
}

module.exports = {
  MODULE_MAP: MODULE_MAP,
  getLearnedMap: getLearnedMap,
  loadModuleData: loadModuleData,
  getItemById: getItemById,
  markAsLearned: markAsLearned,
  getModuleProgress: getModuleProgress,
  loadGwdArticles: loadGwdArticles,
  loadPoetryRules: loadPoetryRules,
  loadIdioms: loadIdioms,
  loadConfuciusQuotes: loadConfuciusQuotes
}
