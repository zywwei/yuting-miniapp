/**
 * 学习模块数据管理层
 * 统一管理各学习模块的数据和进度
 */

var childStorage = require('../../utils/child-storage.js')
var cloud = require('../../utils/cloud.js')
var learnProgress = require('./learn-progress.js')

// 导入所有数据文件
var mathFormulasData = require('./math-formulas-data.js')
var mathConceptsData = require('./math-concepts-data.js')
var mathPracticeData = require('./math-practice-data.js')
var mathProblemsData = require('./math-problems-data.js')
var mathGeometryData = require('./math-geometry-data.js')
var mathOlympiadData = require('./math-olympiad-data.js')
var chineseReadingData = require('./chinese-reading-data.js')
var chineseWritingData = require('./chinese-writing-data.js')
var chineseRhetoricData = require('./chinese-rhetoric-data.js')
var chineseClassicalData = require('./chinese-classical-data.js')
var scienceExperimentsData = require('./science-experiments-data.js')
var sciencePhysicsData = require('./science-physics-data.js')
var scienceChemistryData = require('./science-chemistry-data.js')
var scienceBiologyData = require('./science-biology-data.js')
var codingThinkingData = require('./coding-thinking-data.js')
var codingLogicData = require('./coding-logic-data.js')
var codingAlgorithmData = require('./coding-algorithm-data.js')
var codingScratchData = require('./coding-scratch-data.js')
var englishGrammarData = require('./english-grammar-data.js')
var englishSentencesData = require('./english-sentences-data.js')
var englishReadingData = require('./english-reading-data.js')
var englishListeningData = require('./english-listening-data.js')
var artMusicData = require('./art-music-data.js')
var artPaintingData = require('./art-painting-data.js')
var artCalligraphyData = require('./art-calligraphy-data.js')
var socialGeographyData = require('./social-geography-data.js')
var socialHistoryData = require('./social-history-data.js')
var socialPoliticsData = require('./social-politics-data.js')
var speakingScenariosData = require('./speaking-scenarios-data.js')
var speakingPracticeData = require('./speaking-practice-data.js')
var speakingSpeechData = require('./speaking-speech-data.js')
var sportsKnowledgeData = require('./sports-knowledge-data.js')
var sportsHealthData = require('./sports-health-data.js')
var sportsSkillsData = require('./sports-skills-data.js')
var lifeSafetyData = require('./life-safety-data.js')
var lifeMentalData = require('./life-mental-data.js')
var lifeSkillsData = require('./life-skills-data.js')

// 模块映射
var MODULE_MAP = {
  // Math 模块
  'math-formulas': { data: mathFormulasData, name: '数学公式', storageKey: 'mathFormulas' },
  'math-concepts': { data: mathConceptsData, name: '数学概念', storageKey: 'mathConcepts' },
  'math-practice': { data: mathPracticeData, name: '计算练习', storageKey: 'mathPractice' },
  'math-problems': { data: mathProblemsData, name: '应用题', storageKey: 'mathProblems' },
  'math-geometry': { data: mathGeometryData, name: '几何知识', storageKey: 'mathGeometry' },
  'math-olympiad': { data: mathOlympiadData, name: '奥数竞赛', storageKey: 'mathOlympiad' },
  
  // Chinese 模块
  'chinese-reading': { data: chineseReadingData, name: '阅读理解', storageKey: 'chineseReading' },
  'chinese-writing': { data: chineseWritingData, name: '写作指导', storageKey: 'chineseWriting' },
  'chinese-rhetoric': { data: chineseRhetoricData, name: '修辞手法', storageKey: 'chineseRhetoric' },
  'chinese-classical': { data: chineseClassicalData, name: '文言文', storageKey: 'chineseClassical' },
  
  // Science 模块
  'science-experiments': { data: scienceExperimentsData, name: '科学实验', storageKey: 'scienceExperiments' },
  'science-physics': { data: sciencePhysicsData, name: '物理常识', storageKey: 'sciencePhysics' },
  'science-chemistry': { data: scienceChemistryData, name: '化学常识', storageKey: 'scienceChemistry' },
  'science-biology': { data: scienceBiologyData, name: '生物常识', storageKey: 'scienceBiology' },
  
  // Coding 模块
  'coding-thinking': { data: codingThinkingData, name: '编程思维', storageKey: 'codingThinking' },
  'coding-logic': { data: codingLogicData, name: '逻辑训练', storageKey: 'codingLogic' },
  'coding-algorithm': { data: codingAlgorithmData, name: '算法基础', storageKey: 'codingAlgorithm' },
  'coding-scratch': { data: codingScratchData, name: 'Scratch入门', storageKey: 'codingScratch' },
  
  // English-Ext 模块
  'english-grammar': { data: englishGrammarData, name: '语法学习', storageKey: 'englishGrammar' },
  'english-sentences': { data: englishSentencesData, name: '句型练习', storageKey: 'englishSentences' },
  'english-reading': { data: englishReadingData, name: '阅读理解', storageKey: 'englishReading' },
  'english-listening': { data: englishListeningData, name: '听力训练', storageKey: 'englishListening' },
  
  // Art 模块
  'art-music': { data: artMusicData, name: '音乐知识', storageKey: 'artMusic' },
  'art-painting': { data: artPaintingData, name: '美术鉴赏', storageKey: 'artPainting' },
  'art-calligraphy': { data: artCalligraphyData, name: '书法练习', storageKey: 'artCalligraphy' },
  
  // Social 模块
  'social-geography': { data: socialGeographyData, name: '地理知识', storageKey: 'socialGeography' },
  'social-history': { data: socialHistoryData, name: '历史常识', storageKey: 'socialHistory' },
  'social-politics': { data: socialPoliticsData, name: '政治常识', storageKey: 'socialPolitics' },
  
  // Speaking 模块
  'speaking-scenarios': { data: speakingScenariosData, name: '情景对话', storageKey: 'speakingScenarios' },
  'speaking-practice': { data: speakingPracticeData, name: '口语练习', storageKey: 'speakingPractice' },
  'speaking-speech': { data: speakingSpeechData, name: '英语演讲', storageKey: 'speakingSpeech' },
  
  // Sports 模块
  'sports-knowledge': { data: sportsKnowledgeData, name: '体育知识', storageKey: 'sportsKnowledge' },
  'sports-health': { data: sportsHealthData, name: '健康常识', storageKey: 'sportsHealth' },
  'sports-skills': { data: sportsSkillsData, name: '运动技能', storageKey: 'sportsSkills' },
  
  // Life 模块
  'life-safety': { data: lifeSafetyData, name: '安全教育', storageKey: 'lifeSafety' },
  'life-mental': { data: lifeMentalData, name: '心理健康', storageKey: 'lifeMental' },
  'life-skills': { data: lifeSkillsData, name: '生活技能', storageKey: 'lifeSkills' }
}

// P1-12：为缺 id 的条目生成稳定 id（chinese-writing/reading/rhetoric 等数据文件
// 无 id 字段，导致已学标记全部塌缩到 undefined 键、进度瞬间 100%）
Object.keys(MODULE_MAP).forEach(function(moduleKey) {
  var data = MODULE_MAP[moduleKey].data
  if (!Array.isArray(data)) return
  data.forEach(function(item, idx) {
    if (item && !item.id) item.id = moduleKey + '_' + (idx + 1)
  })
})

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

  var learnProgressData = childStorage.get('learnProgress') || {}
  if (!learnProgressData[config.storageKey]) {
    learnProgressData[config.storageKey] = {}
  }

  learnProgressData[config.storageKey][id] = {
    learnedAt: new Date().toISOString(),
    title: title || id
  }

  childStorage.set('learnProgress', learnProgressData)

  // P1-13：写入学习日志，激活 history 页与 stats 连续天数统计
  try { learnProgress.addLearnLog(config.storageKey, id, 'learn', title || id) } catch (e) {}

  // 异步同步到云端
  cloud.uploadLearnProgress(learnProgressData).catch(function(err) {
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

module.exports = {
  MODULE_MAP: MODULE_MAP,
  getLearnedMap: getLearnedMap,
  loadModuleData: loadModuleData,
  getItemById: getItemById,
  markAsLearned: markAsLearned,
  getModuleProgress: getModuleProgress
}
