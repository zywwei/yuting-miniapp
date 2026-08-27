/**
 * 学习模块列表页统一数据适配层
 * C3 修复配套：列表页与详情页数据源收口到 modules-data（此前列表页内置演示数据，
 * 与详情页真实数据 id 不同源，导致详情不可达或永远显示第一条）。
 *
 * 各模块原始字段名不同，此处按 FIELD_MAP 统一映射为：
 *   { id, no, title, desc, tag, learned }
 * 新增模块时在 FIELD_MAP 登记字段映射即可复用。
 */

var modulesData = require('./modules-data.js')

// moduleKey -> { title, desc, tag }（字段名来自各 *-data.js 实际结构）
var FIELD_MAP = {
  // Math
  'math-formulas': { title: 'title', desc: 'explanation', tag: 'category' },
  'math-concepts': { title: 'title', desc: 'content', tag: 'category' },
  'math-practice': { title: 'question', desc: 'answer', tag: 'type' },
  'math-problems': { title: 'title', desc: 'content', tag: 'category' },
  'math-geometry': { title: 'title', desc: 'content', tag: 'category' },
  'math-olympiad': { title: 'title', desc: 'content', tag: 'category' },
  // Chinese
  'chinese-reading': { title: 'title', desc: 'content', tag: 'type' },
  'chinese-writing': { title: 'title', desc: 'content', tag: 'category' },
  'chinese-rhetoric': { title: 'name', desc: 'definition', tag: '' },
  'chinese-classical': { title: 'title', desc: 'meaning', tag: 'type' },
  // Science
  'science-experiments': { title: 'title', desc: 'principle', tag: 'category' },
  'science-physics': { title: 'topic', desc: 'content', tag: 'field' },
  'science-chemistry': { title: 'topic', desc: 'content', tag: 'field' },
  'science-biology': { title: 'topic', desc: 'content', tag: 'field' },
  // Coding
  'coding-thinking': { title: 'title', desc: 'content', tag: 'category' },
  'coding-logic': { title: 'title', desc: 'content', tag: 'category' },
  'coding-algorithm': { title: 'title', desc: 'content', tag: 'category' },
  'coding-scratch': { title: 'title', desc: 'content', tag: 'category' },
  // English-ext
  'english-grammar': { title: 'title', desc: 'rule', tag: '' },
  'english-sentences': { title: 'english', desc: 'chinese', tag: 'category' },
  'english-reading': { title: 'title', desc: 'passage', tag: '' },
  'english-listening': { title: 'title', desc: 'content', tag: 'level' },
  // Art
  'art-music': { title: 'title', desc: 'content', tag: 'category' },
  'art-painting': { title: 'title', desc: 'content', tag: 'category' },
  'art-calligraphy': { title: 'title', desc: 'content', tag: 'category' },
  // Social
  'social-geography': { title: 'title', desc: 'content', tag: 'category' },
  'social-history': { title: 'title', desc: 'content', tag: 'category' },
  'social-politics': { title: 'title', desc: 'content', tag: 'category' },
  // Speaking
  'speaking-scenarios': { title: 'title', desc: 'description', tag: 'scene' },
  'speaking-practice': { title: 'topic', desc: 'instruction', tag: 'type' },
  'speaking-speech': { title: 'titleChinese', desc: 'content', tag: 'type' },
  // Sports
  'sports-knowledge': { title: 'question', desc: 'answer', tag: 'category' },
  'sports-health': { title: 'question', desc: 'answer', tag: 'category' },
  'sports-skills': { title: 'skill', desc: 'description', tag: 'category' },
  // Life
  'life-safety': { title: 'title', desc: 'content', tag: 'category' },
  'life-mental': { title: 'title', desc: 'content', tag: 'category' },
  'life-skills': { title: 'title', desc: 'content', tag: 'category' }
}

var DESC_LIMIT = 60

function toText(v) {
  if (v === null || v === undefined) return ''
  if (Array.isArray(v)) return v.length ? toText(v[0]) : ''
  return String(v)
}

function cut(s, limit) {
  if (s.length <= limit) return s
  return s.slice(0, limit) + '…'
}

/**
 * @param {string} moduleKey MODULE_MAP 键，如 'sports-knowledge'
 * @returns {{ items: Array, learnedCount: number, totalCount: number }}
 */
function loadList(moduleKey) {
  var conf = FIELD_MAP[moduleKey]
  if (!conf) return { items: [], learnedCount: 0, totalCount: 0 }

  var result = modulesData.loadModuleData(moduleKey)
  var items = result.items.map(function (item, i) {
    return {
      id: item.id,
      no: i + 1,
      title: cut(toText(item[conf.title]) || ('第' + (i + 1) + '条'), 40),
      desc: cut(toText(item[conf.desc]), DESC_LIMIT),
      tag: conf.tag ? toText(item[conf.tag]) : '',
      learned: !!item.learned
    }
  })
  return {
    items: items,
    learnedCount: result.learnedCount,
    totalCount: result.totalCount
  }
}

/**
 * P1 修复：详情页数据归一化。
 * 全部模块共用同一套 detail 模板（渲染 title/content/formula/explanation/
 * example/meaning/story/tips[]），但 math-practice/chinese-rhetoric/english-
 * sentences/speaking-* /science-* 等模块的真实字段名各不相同，导致详情正文
 * 大面积空白、字符串 tips 被 wx:for 逐字拆成单字。
 * 此处按 FIELD_MAP 把异构条目归一化为模板认识的字段；已兼容的条目仅做
 * tips 数组化包装后原样返回。
 */
function normalizeDetailItem(moduleKey, item) {
  if (!item) return item
  var conf = FIELD_MAP[moduleKey]
  if (!conf) return item

  var out = Object.assign({}, item)

  // tips 统一为数组（模板按 wx:for 渲染；rhetoric/experiments/practice 为字符串）
  var tips = item.tips === undefined ? [] : (Array.isArray(item.tips) ? item.tips.slice() : [String(item.tips)])

  // 判断是否已天然兼容模板。
  // P1 修复：标题存在性必须按 FIELD_MAP 登记的字段名取值判断（如
  // speaking-speech 的标题字段是 titleChinese）——此前写死 item.title 导致
  // 「列表中文标题 / 详情英文标题」两套口径不一致
  var compatible = !!(toText(item[conf.title]) && (item.content || item.formula || item.meaning || item.story))
  if (compatible) {
    // I-1：缺省时置空串而非 [] —— WXML 中空数组为 truthy，会让 37 个模板的
    // wx:if="{{item.tips}}" 常驻渲染空的「提示」区块
    out.tips = tips.length ? tips : ''
    // P1 修复补充：兼容分支同样要把标题槽与列表页口径对齐
    // （speaking-speech 的 item.title 是英文、列表/详情标题应为 titleChinese）
    out.title = toText(item[conf.title]) || out.title
    return out
  }

  // 归一化：标题取列表同源字段
  out.title = toText(item[conf.title]) || toText(item.name) || toText(item.topic) || toText(item.english) || '详情'

  // 正文主块 = desc 同源字段 + 结构化补充（步骤/材料/关键词/对话/句型）
  var parts = []
  var main = toText(item[conf.desc])
  if (main) parts.push(main)
  // I-3：speaking-scenarios 的对话与关键句型是核心内容，此前不进任何槽位
  if (Array.isArray(item.dialogue) && item.dialogue.length) {
    var dlgLines = item.dialogue.map(function (d) {
      return (d.speaker ? d.speaker + ': ' : '') + (d.english || '') + (d.chinese ? '（' + d.chinese + '）' : '')
    })
    parts.push('对话：\n' + dlgLines.join('\n'))
  }
  if (Array.isArray(item.keyPhrases) && item.keyPhrases.length) {
    parts.push('关键句型：' + item.keyPhrases.join('；'))
  }
  if (Array.isArray(item.steps) && item.steps.length) {
    parts.push('步骤：' + item.steps.map(function (s, i) { return (i + 1) + ') ' + s }).join('；'))
  }
  if (item.materials) {
    parts.push('材料：' + (Array.isArray(item.materials) ? item.materials.join('、') : String(item.materials)))
  }
  if (item.keywords && Array.isArray(item.keywords)) {
    parts.push('关键词：' + item.keywords.join('、'))
  }
  out.content = parts.join('\n')

  out.formula = item.formula || ''
  out.explanation = item.explanation || ''
  // 例句槽优先放英文原句（口语/句型类）
  out.example = item.example || item.english || ''
  // P1 修复：meaning 回退链去掉 item.answer——问答类模块（sports-knowledge 等）
  // 的 desc 同源字段就是 answer，再进 meaning 会同一答案显示两遍
  // I-2：同理，desc 同源字段为 chinese 时（english-sentences）不再回退 chinese，
  // 否则「内容」「释义」两个 section 显示同一句中文
  out.meaning = item.meaning || item.translation || (conf.desc === 'chinese' ? '' : item.chinese) || ''
  out.story = item.story || ''
  if (item.hint) tips.push(String(item.hint))
  // english-grammar 等模块的记忆口诀用单数 tip 字段（其余模块多为 tips 数组/hint）
  if (item.tip) tips.push(String(item.tip))
  // I-1：同 compatible 分支，空数组会导致空「提示」区块常驻
  out.tips = tips.length ? tips : ''
  return out
}

module.exports = {
  loadList: loadList,
  normalizeDetailItem: normalizeDetailItem
}
