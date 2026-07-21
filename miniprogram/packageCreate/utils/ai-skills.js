/**
 * AI Skills管理器
 * 管理技能的增删改查、触发检测、网络搜索、本地导入
 */
var childStorage = require('../../utils/child-storage.js')
var cloud = require('../../utils/cloud.js')

// 本地存储key
var SKILLS_KEY = 'aiSkills'
var ACTIVE_SKILL_KEY = 'activeSkillId'

// 来源标签中文映射
var SOURCE_LABELS = {
  builtin: '内置',
  custom: '自定义',
  network: '网络',
  local: '导入'
}

// 来源颜色
var SOURCE_COLORS = {
  builtin: '#4CAF50',
  custom: '#2196F3',
  network: '#FF9800',
  local: '#9C27B0'
}

// 技能分类
var SKILL_CATEGORIES = [
  { id: 'learning', name: '学习', icon: '📚' },
  { id: 'creative', name: '创意', icon: '🎨' },
  { id: 'growth', name: '成长', icon: '🌟' },
  { id: 'tool', name: '工具', icon: '🔧' },
  { id: 'other', name: '其他', icon: '📦' }
]

// 内置技能定义
var BUILTIN_SKILLS = [
  {
    id: 'builtin_drawing',
    name: '画画助手',
    icon: '🎨',
    description: '帮助孩子画画，提供创意建议',
    prompt: '你是一位绘画老师，擅长用简单的方式教孩子画画。请根据孩子的描述，提供绘画建议和步骤指导。如果孩子分享了画作，请给予积极的评价和具体的改进建议。',
    source: 'builtin',
    category: 'creative',
    enabled: true
  },
  {
    id: 'builtin_writing',
    name: '写作助手',
    icon: '✍️',
    description: '帮助孩子写作文、日记',
    prompt: '你是一位写作辅导老师，擅长用引导的方式帮助孩子写作。请用提问的方式启发孩子思考，帮助他组织语言和结构。对孩子的作品要给予积极鼓励，同时提供具体的修改建议。',
    source: 'builtin',
    category: 'learning',
    enabled: true
  },
  {
    id: 'builtin_english',
    name: '英语助手',
    icon: '🔤',
    description: '英语学习、对话练习',
    prompt: '你是一位英语老师，擅长用有趣的方式教孩子英语。请根据孩子的水平，用简单的英语和中文混合交流。当孩子犯错时，要温柔地纠正并解释原因。可以设计一些小游戏帮助孩子学习。',
    source: 'builtin',
    category: 'learning',
    enabled: true
  },
  {
    id: 'builtin_science',
    name: '科学助手',
    icon: '🔬',
    description: '解答科学问题，做实验指导',
    prompt: '你是一位科学老师，擅长用生动的方式解释科学原理。请用孩子能理解的语言解释复杂的概念，多用生活中的例子。如果可能，推荐一些简单安全的家庭实验。',
    source: 'builtin',
    category: 'learning',
    enabled: true
  },
  {
    id: 'builtin_habit',
    name: '习惯养成',
    icon: '⭐',
    description: '正面激励，培养良好习惯',
    prompt: '你是一位习惯养成专家，擅长用正面激励的方式帮助孩子养成好习惯。请根据孩子的打卡记录，给予鼓励和建议。当他完成目标时，要热情表扬；当他遇到困难时，要温柔鼓励，帮助他坚持下去。',
    source: 'builtin',
    category: 'growth',
    enabled: true
  },
  {
    id: 'builtin_learning',
    name: '学习辅导',
    icon: '📚',
    description: '专注学习，耐心解答知识问题',
    prompt: '你是一位耐心的学习辅导老师，擅长用简单易懂的方式解释知识。请根据孩子的学习进度，用生动有趣的方式帮助他学习新知识。遇到难题时，用比喻和例子来解释，让孩子更容易理解。',
    source: 'builtin',
    category: 'learning',
    enabled: true
  },
  {
    id: 'builtin_story',
    name: '创意故事',
    icon: '📖',
    description: '想象力丰富，创作有趣故事',
    prompt: '你是一位创意故事大王，擅长根据孩子的兴趣和经历创作有趣的故事。请根据孩子的成长数据，创作富有想象力的故事。故事要生动有趣，富有教育意义，可以融入孩子的生活经历，让他感到亲切和有趣。',
    source: 'builtin',
    category: 'creative',
    enabled: true
  },
  {
    id: 'builtin_findskills',
    name: '查找技能',
    icon: '🔍',
    description: '从网络搜索并安装新技能',
    prompt: '你是一个技能搜索助手。当用户想要查找特定功能的技能时，帮助他们搜索合适的技能，并提供安装建议。请根据用户的需求，推荐最相关的技能。',
    source: 'builtin',
    category: 'tool',
    enabled: true
  }
]

/**
 * 获取所有技能（内置+自定义+网络+本地导入）
 * @returns {Array} 技能列表
 */
function getAllSkills() {
  var customSkills = childStorage.get(SKILLS_KEY) || []
  var allSkills = []
  var seenIds = {}

  // 先添加内置技能
  BUILTIN_SKILLS.forEach(function(skill) {
    allSkills.push(Object.assign({}, skill))
    seenIds[skill.id] = allSkills.length - 1
  })

  // 再处理自定义、网络、本地导入的技能
  // 如果与内置技能同ID，用自定义版本覆盖（保留启用/禁用状态）
  customSkills.forEach(function(skill) {
    if (seenIds[skill.id] !== undefined) {
      allSkills[seenIds[skill.id]] = Object.assign({}, skill)
    } else {
      seenIds[skill.id] = allSkills.length
      allSkills.push(Object.assign({}, skill))
    }
  })

  return allSkills
}

/**
 * 获取启用的技能列表
 * @returns {Array} 启用的技能列表
 */
function getEnabledSkills() {
  return getAllSkills().filter(function(skill) { return skill.enabled })
}

/**
 * 根据ID获取技能
 * @param {string} skillId - 技能ID
 * @returns {Object|null} 技能对象
 */
function getSkillById(skillId) {
  var skills = getAllSkills()
  for (var i = 0; i < skills.length; i++) {
    if (skills[i].id === skillId) return skills[i]
  }
  return null
}

/**
 * 根据名称获取技能
 * @param {string} name - 技能名称
 * @returns {Object|null} 技能对象
 */
function getSkillByName(name) {
  var skills = getEnabledSkills()
  for (var i = 0; i < skills.length; i++) {
    if (skills[i].name === name) return skills[i]
  }
  return null
}

// 技能拼音首字母映射
var SKILL_PINYIN_MAP = {
  'hh': '画画助手',
  'hhzs': '画画助手',
  'xgyc': '习惯养成',
  'xg': '习惯养成',
  'dk': '习惯养成',
  'cycs': '创意故事',
  'gs': '创意故事',
  'czfz': '编程助手',
  'bm': '编程助手',
  'sx': '数学辅导',
  'ss': '数学辅导',
  'xxfd': '学习辅导',
  'xx': '学习辅导',
  'fd': '学习辅导'
}

/**
 * 检测消息中的技能触发
 * @param {string} message - 用户消息
 * @returns {Object|null} 匹配到的技能，或null
 */
function detectSkill(message) {
  if (!message) return null
  
  // 检测 /技能名 格式
  var match = message.match(/^\/(\S+)/)
  if (match) {
    var skillName = match[1]
    
    // 1. 精确匹配
    var skill = getSkillByName(skillName)
    if (skill) return skill
    
    // 2. 拼音首字母匹配
    if (SKILL_PINYIN_MAP[skillName.toLowerCase()]) {
      skill = getSkillByName(SKILL_PINYIN_MAP[skillName.toLowerCase()])
      if (skill) return skill
    }
    
    // 3. 模糊匹配（包含关系）
    var allSkills = getAllSkills()
    for (var i = 0; i < allSkills.length; i++) {
      var s = allSkills[i]
      if (s.name.indexOf(skillName) !== -1 || skillName.indexOf(s.name) !== -1) {
        return s
      }
    }
    
    // 4. 别名匹配
    var aliasMap = {
      '画画': '画画助手',
      '绘画': '画画助手',
      '习惯': '习惯养成',
      '打卡': '习惯养成',
      '故事': '创意故事',
      '编程': '编程助手',
      '代码': '编程助手',
      '数学': '数学辅导',
      '算数': '数学辅导',
      '学习': '学习辅导',
      '辅导': '学习辅导'
    }
    
    if (aliasMap[skillName]) {
      skill = getSkillByName(aliasMap[skillName])
      if (skill) return skill
    }
  }
  
  return null
}

/**
 * 检测技能查找意图
 * @param {string} message - 用户消息
 * @returns {string|null} 查找关键词，或null
 */
function detectSkillSearchIntent(message) {
  if (!message) return null
  
  var searchPatterns = [
    /找.*?技能/,
    /搜索.*?技能/,
    /查找.*?技能/,
    /有没有.*?技能/,
    /find.*?skill/i,
    /search.*?skill/i
  ]
  
  for (var i = 0; i < searchPatterns.length; i++) {
    if (searchPatterns[i].test(message)) {
      // 提取关键词
      var keywords = message.replace(/找|搜索|查找|有没有|技能|find|skill|search/gi, '').trim()
      return keywords || '通用'
    }
  }
  
  return null
}

/**
 * 保存技能
 * @param {Object} skill - 技能对象
 */
function saveSkill(skill) {
  var skills = childStorage.get(SKILLS_KEY) || []
  var exists = false
  
  for (var i = 0; i < skills.length; i++) {
    if (skills[i].id === skill.id) {
      skills[i] = skill
      exists = true
      break
    }
  }
  
  if (!exists) {
    skills.push(skill)
  }
  
  childStorage.set(SKILLS_KEY, skills)
  if (cloud && cloud.uploadAiSkills) cloud.uploadAiSkills(skills)
}

/**
 * 删除技能（仅自定义、网络和本地导入技能）
 * @param {string} skillId - 技能ID
 * @returns {boolean} 是否删除成功
 */
function deleteSkill(skillId) {
  // 内置技能不可删除
  if (skillId.indexOf('builtin_') === 0) return false
  
  var skills = childStorage.get(SKILLS_KEY) || []
  var filtered = skills.filter(function(s) { return s.id !== skillId })
  
  if (filtered.length < skills.length) {
    childStorage.set(SKILLS_KEY, filtered)
    if (cloud && cloud.uploadAiSkills) cloud.uploadAiSkills(filtered)
    return true
  }
  
  return false
}

/**
 * 切换技能启用/禁用状态
 * @param {string} skillId - 技能ID
 * @returns {boolean} 切换后的启用状态
 */
function toggleSkill(skillId) {
  var skills = childStorage.get(SKILLS_KEY) || []
  
  for (var i = 0; i < skills.length; i++) {
    if (skills[i].id === skillId) {
      skills[i].enabled = !skills[i].enabled
      childStorage.set(SKILLS_KEY, skills)
      if (cloud && cloud.uploadAiSkills) cloud.uploadAiSkills(skills)
      return skills[i].enabled
    }
  }
  
  // 内置技能的切换
  for (var j = 0; j < BUILTIN_SKILLS.length; j++) {
    if (BUILTIN_SKILLS[j].id === skillId) {
      // 将内置技能的状态保存到自定义列表
      var newSkill = Object.assign({}, BUILTIN_SKILLS[j], { enabled: !BUILTIN_SKILLS[j].enabled })
      skills.push(newSkill)
      childStorage.set(SKILLS_KEY, skills)
      if (cloud && cloud.uploadAiSkills) cloud.uploadAiSkills(skills)
      return newSkill.enabled
    }
  }
  
  return false
}

/**
 * 获取当前激活的技能
 * @returns {Object|null} 激活的技能
 */
function getActiveSkill() {
  var activeSkillId = childStorage.get(ACTIVE_SKILL_KEY)
  if (!activeSkillId) return null
  return getSkillById(activeSkillId)
}

/**
 * 激活技能
 * @param {string} skillId - 技能ID
 */
function activateSkill(skillId) {
  childStorage.set(ACTIVE_SKILL_KEY, skillId)
}

/**
 * 取消激活技能
 */
function deactivateSkill() {
  childStorage.remove(ACTIVE_SKILL_KEY)
}

/**
 * 从网络搜索技能（模拟实现）
 * @param {string} query - 搜索关键词
 * @returns {Promise<Array>} 搜索结果
 */
async function searchSkillsFromNetwork(query) {
  // 模拟网络搜索结果
  // 实际项目中可以接入 skills.sh API 或其他技能市场
  return new Promise(function(resolve) {
    setTimeout(function() {
      var mockResults = [
        {
          id: 'network_' + Date.now(),
          name: query + '助手',
          icon: '🔧',
          description: '帮助孩子学习' + query + '的智能助手',
          prompt: '你是一位' + query + '专家，擅长用简单易懂的方式教孩子' + query + '。请用亲切的语气与孩子交流，鼓励他积极探索。',
          source: 'network',
          enabled: true
        }
      ]
      resolve(mockResults)
    }, 500)
  })
}

/**
 * 验证技能数据格式
 * @param {Object} skillData - 技能数据
 * @returns {boolean} 是否有效
 */
function validateSkillFormat(skillData) {
  if (!skillData || typeof skillData !== 'object') return false
  if (!skillData.name || typeof skillData.name !== 'string') return false
  if (!skillData.prompt || typeof skillData.prompt !== 'string') return false
  return true
}

/**
 * 从本地JSON导入技能
 * @param {string} jsonContent - JSON内容
 * @returns {Array} 导入的技能列表
 */
function importSkillsFromJson(jsonContent) {
  try {
    var data = JSON.parse(jsonContent)
    var skills = Array.isArray(data) ? data : [data]
    var imported = []
    
    for (var i = 0; i < skills.length; i++) {
      var skillData = skills[i]
      if (!validateSkillFormat(skillData)) {
        console.warn('技能格式无效:', skillData)
        continue
      }
      
      var skill = {
        id: 'local_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9),
        name: skillData.name,
        icon: skillData.icon || '📦',
        description: skillData.description || '',
        prompt: skillData.prompt,
        source: 'local',
        enabled: true,
        createTime: new Date().toISOString()
      }
      
      saveSkill(skill)
      imported.push(skill)
    }
    
    return imported
  } catch (err) {
    console.error('导入技能失败:', err)
    throw err
  }
}

/**
 * 导出技能为JSON
 * @param {Array<string>} skillIds - 技能ID数组（可选，不传则导出所有自定义技能）
 * @returns {string} JSON内容
 */
function exportSkillsToJson(skillIds) {
  var skills = childStorage.get(SKILLS_KEY) || []
  
  if (skillIds && skillIds.length > 0) {
    skills = skills.filter(function(s) { return skillIds.indexOf(s.id) !== -1 })
  } else {
    // 默认只导出自定义、网络、本地导入的技能
    skills = skills.filter(function(s) { return s.source !== 'builtin' })
  }
  
  return JSON.stringify(skills, null, 2)
}

/**
 * 按分类获取分组技能
 * @returns {Array<{category: Object, skills: Array}>}
 */
function getGroupedSkills() {
  var allSkills = getAllSkills()
  var categoryMap = {}

  SKILL_CATEGORIES.forEach(function(cat) {
    categoryMap[cat.id] = { category: cat, skills: [] }
  })

  allSkills.forEach(function(skill) {
    var catId = skill.category || 'other'
    if (!categoryMap[catId]) {
      catId = 'other'
    }
    categoryMap[catId].skills.push(skill)
  })

  return SKILL_CATEGORIES
    .map(function(cat) { return categoryMap[cat.id] })
    .filter(function(group) { return group.skills.length > 0 })
}

/**
 * 搜索技能（按名称和描述）
 * @param {string} keyword - 搜索关键词
 * @returns {Array} 匹配的技能列表
 */
function searchSkills(keyword) {
  if (!keyword) return getAllSkills()
  var kw = keyword.toLowerCase()
  return getAllSkills().filter(function(skill) {
    return skill.name.toLowerCase().indexOf(kw) >= 0 ||
           (skill.description && skill.description.toLowerCase().indexOf(kw) >= 0)
  })
}

/**
 * 从云端同步技能数据到本地（合并策略：保留本地修改的技能，云端新增的技能合并进来）
 */
async function syncFromCloud() {
  if (!cloud || !cloud.fetchAiSkills) return
  try {
    var cloudSkills = await cloud.fetchAiSkills()
    // 确保 cloudSkills 是数组
    if (!cloudSkills || !Array.isArray(cloudSkills) || cloudSkills.length === 0) return

    var localSkills = childStorage.get(SKILLS_KEY) || []
    var localSkillMap = {}

    // 建立本地技能ID索引
    localSkills.forEach(function(skill) {
      localSkillMap[skill.id] = skill
    })

    // 合并云端技能：本地已有的保留本地版本，本地没有的添加
    var merged = localSkills.slice()
    var hasNew = false

    cloudSkills.forEach(function(cloudSkill) {
      if (!localSkillMap[cloudSkill.id]) {
        merged.push(cloudSkill)
        hasNew = true
      }
    })
    
    // 只有有新技能时才更新本地
    if (hasNew) {
      childStorage.set(SKILLS_KEY, merged)
    }
  } catch (err) {
    console.warn('AI技能云端同步失败:', err)
  }
}

module.exports = {
  SOURCE_LABELS: SOURCE_LABELS,
  SOURCE_COLORS: SOURCE_COLORS,
  SKILL_CATEGORIES: SKILL_CATEGORIES,
  BUILTIN_SKILLS: BUILTIN_SKILLS,
  getAllSkills: getAllSkills,
  getEnabledSkills: getEnabledSkills,
  getSkillById: getSkillById,
  getSkillByName: getSkillByName,
  detectSkill: detectSkill,
  detectSkillSearchIntent: detectSkillSearchIntent,
  saveSkill: saveSkill,
  deleteSkill: deleteSkill,
  toggleSkill: toggleSkill,
  getActiveSkill: getActiveSkill,
  activateSkill: activateSkill,
  deactivateSkill: deactivateSkill,
  searchSkillsFromNetwork: searchSkillsFromNetwork,
  validateSkillFormat: validateSkillFormat,
  importSkillsFromJson: importSkillsFromJson,
  exportSkillsToJson: exportSkillsToJson,
  getGroupedSkills: getGroupedSkills,
  searchSkills: searchSkills,
  syncFromCloud: syncFromCloud
}
