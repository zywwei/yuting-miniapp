/**
 * 学习AI助手工具模块
 * 提供AI学习助手的提示词、上下文构建和快捷问题
 */

// 长度限制常量（与ai-manager.js保持一致）
var MAX_EXTRA_CONTEXT = 1800  // 留200字符余量
var MAX_SKILL_PROMPT = 900    // 留100字符余量

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
    
    default:
      context = ''
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
      '6. 用正面的语言鼓励孩子'
  }
  
  var prompt = prompts[module] || prompts.cards
  
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
    ]
  }
  
  return questions[module] || questions.cards
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
