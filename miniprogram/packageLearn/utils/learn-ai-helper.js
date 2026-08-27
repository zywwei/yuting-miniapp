/**
 * 学习AI助手工具模块
 * 提供AI学习助手的提示词、上下文构建和快捷问题
 */

// 长度限制常量（与ai-manager.js保持一致）
var MAX_EXTRA_CONTEXT = 1800  // 留200字符余量
var MAX_SKILL_PROMPT = 900    // 留100字符余量

// ===== P1 修复：扩展科目映射层 =====
// 此前仅支持 cards/poems/english/math 与 classics-* 共 8 个 key，而详情页传入的
// 是 modules-data.MODULE_MAP 的 37 个连字符 key（如 chinese-writing/science-physics），
// 全部走 default 分支——上下文为空、提示词错配成「汉字老师」、快捷问题回落识字题。
// 此处把 MODULE_MAP 的全部 37 个扩展科目 key 归一到主题族，按主题提供提示词/快捷问题/通用上下文拼装。
var EXTENDED_TOPIC_MAP = {
  'math-formulas': 'math', 'math-concepts': 'math', 'math-practice': 'math',
  'math-problems': 'math', 'math-geometry': 'math', 'math-olympiad': 'math',
  'chinese-reading': 'chinese', 'chinese-writing': 'chinese', 'chinese-rhetoric': 'chinese', 'chinese-classical': 'classical',
  'science-experiments': 'science', 'science-physics': 'science', 'science-chemistry': 'science', 'science-biology': 'science',
  'coding-thinking': 'coding', 'coding-logic': 'coding', 'coding-algorithm': 'coding', 'coding-scratch': 'coding',
  'english-grammar': 'englishExt', 'english-sentences': 'englishExt', 'english-reading': 'englishExt', 'english-listening': 'englishExt',
  'art-music': 'art', 'art-painting': 'art', 'art-calligraphy': 'art',
  'social-geography': 'social', 'social-history': 'social', 'social-politics': 'social',
  'speaking-scenarios': 'speaking', 'speaking-practice': 'speaking', 'speaking-speech': 'speaking',
  'sports-knowledge': 'sports', 'sports-health': 'sports', 'sports-skills': 'sports',
  'life-safety': 'life', 'life-mental': 'life', 'life-skills': 'life'
}

var TOPIC_LABELS = {
  math: '数学', chinese: '语文', classical: '文言文', science: '科学常识',
  coding: '编程思维', englishExt: '英语拓展', art: '艺术素养', social: '社会常识',
  speaking: '口语表达', sports: '体育健康', life: '生活安全'
}

var EXTENDED_PROMPTS = {
  math: null,  // 复用内置 math 提示词
  chinese: '你是一位亲切的语文老师，正在辅导小朋友学习阅读、写作与修辞。请用生动易懂的语言讲解，适合中小学生理解。回答规则：\n1. 讲解写作/修辞技巧时多举课文里的例子\n2. 鼓励孩子说出自己的想法再示范\n3. 每次回答控制在130字以内\n4. 可以用emoji增加趣味性',
  classical: null,  // 复用 classics-gwd 提示词
  science: '你是一位博学的科学老师，正在回答小朋友关于物理、化学、生物与趣味实验的问题。请用生活现象解释科学原理。回答规则：\n1. 先说结论再用简单的道理解释\n2. 多举生活中的例子（冰箱、彩虹、影子等）\n3. 涉及实验时强调安全注意事项\n4. 每次回答控制在130字以内\n5. 保持好奇心导向，鼓励孩子提问',
  coding: '你是一位有趣的编程启蒙老师，正在教小朋友计算思维与编程基础。请用不插电的生活类比讲解抽象概念。回答规则：\n1. 用「做计划」「找规律」等生活场景类比算法\n2. Scratch 相关问题给出积木操作步骤\n3. 每次回答控制在130字以内\n4. 鼓励动手尝试',
  englishExt: null,  // 复用内置 english 提示词
  art: '你是一位优雅的艺术老师，正在带小朋友欣赏音乐、美术与书法。请从颜色、节奏、结构等角度引导孩子观察和感受。回答规则：\n1. 描述要具体可感（像带着孩子一起看/听）\n2. 介绍名家名作时讲有趣的故事\n3. 每次回答控制在120字以内\n4. 鼓励孩子创作自己的作品',
  social: '你是一位知识渊博的社科老师，正在给小朋友讲地理、历史与政治常识。请把知识讲成故事和见闻。回答规则：\n1. 地理问题结合地图与景观描述\n2. 历史问题用讲故事的方式呈现\n3. 常识性问题贴近孩子的日常生活\n4. 每次回答控制在130字以内',
  speaking: '你是一位耐心的口语教练，正在带小朋友练习英语情景对话与演讲。请鼓励孩子开口并纠正关键发音。回答规则：\n1. 给出对话示范时标注中文意思\n2. 发音要点拆解成口型/舌位提示\n3. 每次回答控制在120字以内\n4. 多用鼓励性语言',
  sports: '你是一位阳光的体育健康老师，正在教小朋友运动技能与健康知识。请强调安全与循序渐进。回答规则：\n1. 动作要领分步骤讲清\n2. 提醒热身与安全防护\n3. 健康问题给出可执行的小建议\n4. 每次回答控制在120字以内',
  life: '你是一位细心的生活安全老师，正在教小朋友安全知识与生活技能。请用场景化方式让孩子记住要点。回答规则：\n1. 安全知识明确「该做什么、不该做什么」\n2. 用「如果遇到…应该…」的场景句式\n3. 心理健康话题保持温暖不说教\n4. 每次回答控制在120字以内'
}

var EXTENDED_QUESTIONS = {
  chinese: [
    { text: '📖 内容讲解', question: '这篇内容讲了什么？帮我讲一讲' },
    { text: '✍️ 写作借鉴', question: '这里的写作手法好在哪里？我怎么用到作文里？' },
    { text: '📝 关键词句', question: '哪些词句是重点？帮我画一下重点' },
    { text: '🎯 练一练', question: '出一道相关的练习题考考我' }
  ],
  classical: [
    { text: '📖 白话翻译', question: '这段古文是什么意思？帮我翻译成白话文' },
    { text: '📝 重点字词', question: '这篇文章里有哪些重要的字词需要掌握？' },
    { text: '📚 背景故事', question: '这篇文章是在什么背景下写的？' },
    { text: '🎯 现代意义', question: '这篇文章在今天有什么意义？' }
  ],
  science: [
    { text: '💡 原理讲解', question: '这背后的科学原理是什么？用简单的话解释一下' },
    { text: '🏠 生活现象', question: '生活中还有哪些类似的现象？' },
    { text: '🧪 动手试试', question: '我可以在家做什么相关的小实验？安全吗？' },
    { text: '❓ 为什么', question: '为什么会这样？再多告诉我一些原因' }
  ],
  coding: [
    { text: '💡 概念讲解', question: '这个概念是什么意思？能用生活中的例子说明吗？' },
    { text: '🧩 动手实践', question: '给我一个可以用Scratch做的小例子吧' },
    { text: '📝 一步步来', question: '这道题的思路是什么？一步一步带我走一遍' },
    { text: '🎯 举一反三', question: '还有什么类似的应用场景？' }
  ],
  englishExt: [
    { text: '🔤 怎么读', question: '这里面的关键词怎么读？有什么发音技巧？' },
    { text: '🧩 讲解含义', question: '这些内容是什么意思？用中文解释一下' },
    { text: '📝 例句示范', question: '帮我造几个实用的例句' },
    { text: '🔄 拓展学习', question: '还有哪些相关的常用表达？' }
  ],
  art: [
    { text: '🎨 作品赏析', question: '怎么欣赏这类作品？有什么看点？' },
    { text: '👨‍🎨 名家故事', question: '这方面有哪些有名的艺术家或作品？有什么故事？' },
    { text: '✍️ 尝试创作', question: '我想自己试试，有什么入门建议？' },
    { text: '🎵 小知识', question: '关于这个主题有什么有趣的冷知识？' }
  ],
  social: [
    { text: '📖 知识讲解', question: '这个知识点是什么意思？帮我详细讲讲' },
    { text: '🌍 相关见闻', question: '这方面有什么有趣的地方或故事？' },
    { text: '📝 考点归纳', question: '这部分的重点内容帮我总结一下' },
    { text: '🗺️ 拓展视野', question: '还有哪些相关的知识值得了解？' }
  ],
  speaking: [
    { text: '🔊 发音指导', question: '这些句子怎么读才地道？给我讲讲发音要点' },
    { text: '💬 对话示范', question: '帮我做一个完整的对话示范' },
    { text: '🔄 替换练习', question: '换一个场景，这句话应该怎么说？' },
    { text: '🎯 流利技巧', question: '怎样才能说得流利自然？' }
  ],
  sports: [
    { text: '🏃 动作要领', question: '这个动作的正确要领是什么？分步骤讲一下' },
    { text: '⚠️ 安全注意', question: '做这项运动需要注意什么安全事项？' },
    { text: '📋 练习计划', question: '给我制定一个简单的入门练习计划' },
    { text: '💡 健康常识', question: '这方面的健康知识有什么要注意的？' }
  ],
  life: [
    { text: '⚠️ 安全要点', question: '遇到这种情况正确的做法是什么？' },
    { text: '🏠 场景演练', question: '如果发生…我应该怎么做？带我演练一遍' },
    { text: '🧺 生活技能', question: '这个技能的具体步骤是什么？' },
    { text: '💡 为什么重要', question: '为什么要这样做？不讲会怎样？' }
  ]
}

// 把 MODULE_MAP 连字符 key 归一到主题族；非扩展科目原样返回
function resolveTopicModule(module) {
  return EXTENDED_TOPIC_MAP[module] || module
}

// 扩展科目的通用上下文拼装（兼容各模块异构字段名）
function buildGenericContext(item, topicLabel) {
  var lines = ['【学习内容】' + (topicLabel || '拓展学习')]
  var title = item.title || item.name || item.topic || item.question || ''
  if (title) lines.push('标题：' + title)
  var body = item.content || item.definition || item.principle || item.explanation ||
    item.instruction || item.passage || item.desc || ''
  if (body) lines.push('内容：' + String(body).substring(0, 300))
  if (item.english) lines.push('英文：' + item.english)
  if (item.chinese) lines.push('中文：' + item.chinese)
  if (item.answer !== undefined && item.answer !== '') lines.push('参考答案：' + item.answer)
  if (item.steps) {
    lines.push('步骤：' + (Array.isArray(item.steps) ? item.steps.join(' → ') : String(item.steps)).substring(0, 200))
  }
  if (item.keywords && Array.isArray(item.keywords)) lines.push('关键词：' + item.keywords.join('、'))
  if (item.materials && Array.isArray(item.materials)) lines.push('材料：' + item.materials.join('、'))
  if (item.tips) lines.push('提示：' + (Array.isArray(item.tips) ? item.tips.join('；') : String(item.tips)).substring(0, 150))
  return lines.join('\n')
}

/**
 * 构建上下文信息（传给extraContext）
 * @param {string} module - 模块类型
 * @param {object} item - 当前学习项数据
 * @returns {string} 格式化的上下文文本
 */
function buildContext(module, item) {
  if (!item || Object.keys(item).length === 0) return ''
  
  var context = ''
  
  switch (module) {
    case 'cards':
      context = '【学习内容】识字卡片\n' +
        '汉字：' + (item.word || '') + '\n' +
        '拼音：' + (item.pinyin || '') + '\n' +
        '释义：' + (item.meaning || '') + '\n' +
        '分类：' + (item.category || '')
      break
      
    case 'poems':
      context = '【学习内容】古诗词\n' +
        '诗名：' + (item.title || '') + '\n' +
        '作者：' + (item.author || '') + '（' + (item.dynasty || '') + '代）\n' +
        '内容：' + (item.content || '')
      break
      
    case 'english':
      if (item.letter) {
        context = '【学习内容】英语字母\n' +
          '字母：' + item.letter + '\n' +
          '音标：' + (item.phonetic || '') + '\n' +
          '示例单词：' + (item.word || '') + ' ' + (item.wordPhonetic || '') + '（' + (item.wordMeaning || '') + '）'
      } else {
        context = '【学习内容】英语单词\n' +
          '单词：' + (item.word || '') + '\n' +
          '音标：' + (item.phonetic || '') + '\n' +
          '中文：' + (item.meaning || '') + '\n' +
          '分类：' + (item.category || '')
      }
      break
    
    case 'math':
      context = '【学习内容】数学\n' +
        '标题：' + (item.title || item.name || '') + '\n' +
        '内容：' + (item.content || item.formula || item.question || '') + '\n' +
        '类型：' + (item.type || '练习')
      break
    
    case 'classics-gwd':
      context = '【学习内容】古文观止\n' +
        '篇名：' + (item.title || '') + '\n' +
        '作者：' + (item.author || '') + '\n' +
        '原文：' + (item.content || '').substring(0, 200) + '\n' +
        '译文：' + (item.translation || '').substring(0, 200)
      break
    
    case 'classics-idioms':
      context = '【学习内容】成语故事\n' +
        '成语：' + (item.idiom || '') + '\n' +
        '拼音：' + (item.pinyin || '') + '\n' +
        '释义：' + (item.meaning || '') + '\n' +
        '典故：' + (item.story || '').substring(0, 150) + '\n' +
        '造句：' + (item.example || '')
      break
    
    case 'classics-confucius':
      context = '【学习内容】论语孟子\n' +
        '出处：' + (item.source || '') + '\n' +
        '原文：' + (item.original || '') + '\n' +
        '释义：' + (item.meaning || '') + '\n' +
        '启示：' + (item.inspiration || '')
      break
    
    case 'classics-poetry-rules':
      context = '【学习内容】诗词格律\n' +
        '标题：' + (item.title || '') + '\n' +
        '类型：' + (item.type || '') + '\n' +
        '格律：' + (item.structure || '') + '\n' +
        '规则：' + (item.rules || '') + '\n' +
        '示例：' + (item.example || '')
      break
    
    default: {
      // P1 修复：37 个扩展科目此前走 default 返回空上下文（AI 收不到学习内容），
      // 现按主题族用通用字段拼装上下文
      var topicModule = resolveTopicModule(module)
      if (topicModule !== module) {
        context = buildGenericContext(item, TOPIC_LABELS[topicModule])
      } else {
        context = ''
      }
    }
  }
  
  // 截断到最大长度
  if (context.length > MAX_EXTRA_CONTEXT) {
    context = context.substring(0, MAX_EXTRA_CONTEXT) + '...'
  }
  
  return context
}

/**
 * 获取系统提示词（传给skillPrompt）
 * @param {string} module - 模块类型
 * @returns {string} 系统提示词
 */
function getSystemPrompt(module) {
  var prompts = {
    cards: '你是一位亲切的汉字老师，正在教小朋友认字。请用简单易懂的语言回答问题，适合5-10岁儿童理解。' +
      '回答规则：\n' +
      '1. 用简短的句子，避免复杂词汇\n' +
      '2. 可以用生动的比喻帮助记忆\n' +
      '3. 涉及字源时，用有趣的故事讲述\n' +
      '4. 组词和造句要贴近孩子生活\n' +
      '5. 每次回答控制在100字以内\n' +
      '6. 可以适当使用emoji增加趣味性',
      
    poems: '你是一位风趣的古诗讲解员，正在带小朋友欣赏古诗。请用讲故事的方式讲解古诗，让孩子感受到诗词之美。' +
      '回答规则：\n' +
      '1. 用儿童能理解的语言解释诗意\n' +
      '2. 讲述创作背景时像讲故事一样生动\n' +
      '3. 作者介绍要有趣味性，不要太学术\n' +
      '4. 推荐相关诗词时说明为什么推荐\n' +
      '5. 每次回答控制在150字以内\n' +
      '6. 可以用比喻帮助孩子理解意境',
      
    english: '你是一位有趣的英语启蒙老师，正在带小朋友学英语。请用简单有趣的方式讲解，让孩子轻松记住英语单词。' +
      '回答规则：\n' +
      '1. 单词讲解要包含发音技巧\n' +
      '2. 用联想记忆法帮助孩子记忆\n' +
      '3. 例句要简单、贴近生活\n' +
      '4. 可以用中文辅助解释\n' +
      '5. 每次回答控制在100字以内\n' +
      '6. 可以编一些顺口溜帮助记忆',
      
    math: '你是一位耐心的数学老师，正在辅导小朋友学数学。请用直观的方式讲解数学概念，多用生活中的例子。' +
      '回答规则：\n' +
      '1. 解题步骤要清晰，一步一步来\n' +
      '2. 用生活场景帮助理解数学概念\n' +
      '3. 鼓励孩子自己思考，不要直接给答案\n' +
      '4. 可以画简单的示意图（用文字描述）\n' +
      '5. 每次回答控制在120字以内\n' +
      '6. 用正面的语言鼓励孩子',
      
    'classics-gwd': '你是一位博学的古文老师，正在带小朋友读古文。请用生动有趣的方式讲解古文，让孩子感受到古文的魅力。' +
      '回答规则：\n' +
      '1. 先用白话文解释古文的意思\n' +
      '2. 讲解重点字词的含义\n' +
      '3. 用讲故事的方式介绍背景\n' +
      '4. 每次回答控制在150字以内\n' +
      '5. 可以适当使用emoji增加趣味性',
      
    'classics-idioms': '你是一位会讲故事的成语老师，正在教小朋友学成语。请用有趣的故事和例子帮助孩子理解成语。' +
      '回答规则：\n' +
      '1. 用简单的话解释成语意思\n' +
      '2. 讲述成语的由来故事\n' +
      '3. 给出贴近孩子生活的造句\n' +
      '4. 可以介绍相关的成语\n' +
      '5. 每次回答控制在120字以内\n' +
      '6. 可以用比喻帮助记忆',
      
    'classics-confucius': '你是一位智慧的国学老师，正在带小朋友学习儒家经典。请用通俗易懂的方式讲解名言，让孩子理解其中的道理。' +
      '回答规则：\n' +
      '1. 用简单的话解释名言的意思\n' +
      '2. 讲述名言背后的故事\n' +
      '3. 联系实际生活说明道理\n' +
      '4. 每次回答控制在120字以内\n' +
      '5. 可以用生活中的例子帮助理解',
      
    'classics-poetry-rules': '你是一位有趣的诗词老师，正在教小朋友学习诗词格律。请用简单的方式讲解格律知识，让孩子轻松掌握。' +
      '回答规则：\n' +
      '1. 用简单的语言解释格律规则\n' +
      '2. 举具体的例子说明\n' +
      '3. 可以用口诀帮助记忆\n' +
      '4. 每次回答控制在100字以内\n' +
      '5. 鼓励孩子尝试创作'
  }
  
  // P1 修复：扩展科目按主题族取提示词（不再一律错配成「汉字老师」）。
  // EXTENDED_PROMPTS 中置 null 的主题表示复用内置同语义提示词，
  // 键名经 REUSE_BUILTIN 映射到内置 prompts 表的实际键
  var REUSE_BUILTIN = { math: 'math', englishExt: 'english', classical: 'classics-gwd' }
  var prompt = prompts[module]
  if (!prompt) {
    var topicModule = resolveTopicModule(module)
    if (topicModule !== module) {
      prompt = EXTENDED_PROMPTS[topicModule] || prompts[REUSE_BUILTIN[topicModule]] || null
    }
  }
  prompt = prompt || prompts.cards
  
  // 截断到最大长度
  if (prompt.length > MAX_SKILL_PROMPT) {
    prompt = prompt.substring(0, MAX_SKILL_PROMPT)
  }
  
  return prompt
}

/**
 * 获取快捷问题列表
 * @param {string} module - 模块类型
 * @param {object} item - 当前学习项数据
 * @returns {Array<{text: string, question: string}>}
 */
function getQuickQuestions(module, item) {
  if (!item) return []
  
  var questions = {
    cards: [
      { text: '📖 字的起源', question: '这个字是怎么来的？有什么故事吗？' },
      { text: '📝 组词造句', question: '用这个字组3个词，再造一个句子' },
      { text: '🔍 易混淆字', question: '这个字和哪些字容易搞混？怎么区分？' },
      { text: '🧩 记忆技巧', question: '有什么好办法记住这个字？' },
      { text: '🎯 趣味知识', question: '关于这个字有什么有趣的冷知识？' }
    ],
    poems: [
      { text: '📜 创作故事', question: '这首诗是在什么情况下写的？背后有什么故事？' },
      { text: '💡 诗意解释', question: '这首诗是什么意思？帮我讲一讲' },
      { text: '👤 诗人介绍', question: '这位诗人是什么样的人？他还写过哪些诗？' },
      { text: '🎨 诗句赏析', question: '这首诗里最妙的是哪一句？为什么好？' },
      { text: '📚 相似诗词', question: '还有哪些和这首诗主题相似的诗？' }
    ],
    english: [
      { text: '🔤 怎么读', question: '这个单词怎么读？有什么发音技巧？' },
      { text: '🧩 记忆方法', question: '有什么好办法记住这个单词？' },
      { text: '📝 例句', question: '用这个单词造一个简单的句子' },
      { text: '🔄 相似词', question: '还有哪些和这个单词意思相近的词？' },
      { text: '🌍 趣味知识', question: '关于这个单词有什么有趣的冷知识？' }
    ],
    math: [
      { text: '💡 解题思路', question: '这道题应该怎么想？帮我理清思路' },
      { text: '🏠 生活应用', question: '这个公式在生活中哪里能用到？' },
      { text: '📝 类似题目', question: '能再出一道类似的题目让我练习吗？' },
      { text: '❌ 常见错误', question: '做这类题容易犯什么错？怎么避免？' },
      { text: '🎯 速算技巧', question: '有没有更快的计算方法？' }
    ],
    'classics-gwd': [
      { text: '📖 白话翻译', question: '这篇古文是什么意思？帮我翻译成白话文' },
      { text: '📝 重点字词', question: '这篇文章里有哪些重要的字词需要掌握？' },
      { text: '📚 背景故事', question: '这篇文章是在什么背景下写的？有什么故事？' },
      { text: '✍️ 写作手法', question: '这篇文章用了什么写作手法？好在哪里？' },
      { text: '🎯 现代意义', question: '这篇文章在今天有什么意义？' }
    ],
    'classics-idioms': [
      { text: '📖 成语意思', question: '这个成语是什么意思？用简单的话解释一下' },
      { text: '📜 典故故事', question: '这个成语是怎么来的？有什么故事？' },
      { text: '📝 近义反义', question: '这个成语的近义词和反义词有哪些？' },
      { text: '✏️ 造句应用', question: '用这个成语造一个句子，要贴近生活的' },
      { text: '🧩 记忆技巧', question: '有什么好办法记住这个成语？' }
    ],
    'classics-confucius': [
      { text: '📖 名言释义', question: '这句话是什么意思？用简单的话解释一下' },
      { text: '📚 背景故事', question: '这句话是在什么情况下说的？有什么故事？' },
      { text: '💡 现实意义', question: '这句话在今天有什么意义？怎么理解？' },
      { text: '📝 相关名言', question: '还有哪些和这句话意思相近的名言？' },
      { text: '🏠 生活应用', question: '这句话在生活中怎么应用？举个例子' }
    ],
    'classics-poetry-rules': [
      { text: '📖 格律解释', question: '这个格律规则是什么意思？帮我解释一下' },
      { text: '📝 示例分析', question: '用一首诗来举例说明这个格律' },
      { text: '✍️ 创作指导', question: '按照这个格律，怎么创作一首诗？' },
      { text: '🎵 押韵技巧', question: '写诗怎么押韵？有什么技巧？' },
      { text: '📚 相关诗词', question: '有哪些符合这个格律的著名诗词？' }
    ]
  }
  
  // P1 修复：扩展科目按主题族取快捷问题，不再一律回落识字卡片的问题组
  var result = questions[module]
  if (!result) {
    var topicModule = resolveTopicModule(module)
    if (topicModule !== module) {
      result = EXTENDED_QUESTIONS[topicModule] || questions[topicModule] || null
    }
  }
  return result || questions.cards
}

/**
 * 构建用户提问（将上下文注入到问题中）
 * @param {string} question - 用户原始问题
 * @param {string} module - 模块类型
 * @param {object} item - 当前学习项数据
 * @returns {string} 完整的用户消息
 */
function buildMessage(question, module, item) {
  if (!item || Object.keys(item).length === 0) {
    return question
  }
  
  var itemName = ''
  switch (module) {
    case 'cards':
      itemName = item.word || ''
      break
    case 'poems':
      itemName = item.title || ''
      break
    case 'english':
      itemName = item.word || item.letter || ''
      break
    case 'math':
      itemName = item.title || item.name || ''
      break
    case 'classics-gwd':
      itemName = item.title || ''
      break
    case 'classics-idioms':
      itemName = item.idiom || ''
      break
    case 'classics-confucius':
      itemName = item.source || ''
      break
    case 'classics-poetry-rules':
      itemName = item.title || ''
      break
    default: {
      // P1 修复：扩展科目按通用字段取条目名（title/name/topic/question 等），
      // 此前未命中 case 时 itemName 为空、上下文标题不会注入提问
      if (EXTENDED_TOPIC_MAP[module]) {
        itemName = item.title || item.name || item.topic || item.question || item.idiom || item.word || item.english || ''
      }
      break
    }
  }
  
  if (itemName) {
    return '关于"' + itemName + '"：' + question
  }
  
  return question
}

module.exports = {
  buildContext: buildContext,
  getSystemPrompt: getSystemPrompt,
  getQuickQuestions: getQuickQuestions,
  buildMessage: buildMessage
}
