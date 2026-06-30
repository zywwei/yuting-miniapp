/**
 * AI上下文检测器
 * 检测用户消息是否涉及用户数据，获取并生成摘要
 */
var cloud = require('./cloud.js')
var auth = require('./auth.js')

// 数据类型 → 关键词映射
var DATA_KEYWORDS = {
  brushing: ['刷牙', '牙齿', '牙刷', '口腔'],
  habit: ['打卡', '习惯', '坚持', '连续', '早起', '运动', '阅读', '喝水', '锻炼', '读书', '跑步'],
  learn: ['学习', '成绩', '进度', '古诗', '卡片', '英语', '数字', '数学'],
  achievement: ['成就', '积分', '徽章', '奖励', '解锁'],
  stall: ['摆摊', '商品', '销售', '收入', '摊位']
}

// 排除误匹配的上下文
var EXCLUDE_PATTERNS = {
  learn: ['我想学习', '学习一下', '请教你', '教我'],
  habit: ['养成习惯', '习惯性', '习惯了']
}

// 数据类型中文名称
var DATA_TYPE_LABELS = {
  brushing: '刷牙记录',
  habit: '习惯打卡',
  learn: '学习进度',
  achievement: '成就数据',
  stall: '摆摊数据'
}

// 技能类型与数据类型的关联（智能选择注入哪些数据）
var SKILL_DATA_MAPPING = {
  'builtin_habit': ['brushing', 'habit', 'achievement'],
  'builtin_learning': ['learn', 'achievement'],
  'builtin_story': ['brushing', 'habit', 'learn'],
  'builtin_drawing': [],
  'builtin_writing': ['learn'],
  'builtin_english': ['learn'],
  'builtin_science': ['learn']
}

/**
 * 检测消息是否涉及用户数据
 * @param {string} message - 用户消息
 * @param {object} activeSkill - 当前激活的技能（可选）
 * @returns {Array<string>} 匹配到的数据类型数组
 */
function detectDataTypes(message, activeSkill) {
  if (!message) return []
  var msg = message.toLowerCase()
  var types = []
  var keys = Object.keys(DATA_KEYWORDS)
  
  for (var i = 0; i < keys.length; i++) {
    var type = keys[i]
    var keywords = DATA_KEYWORDS[type]
    for (var j = 0; j < keywords.length; j++) {
      if (msg.indexOf(keywords[j]) !== -1) {
        // 检查是否匹配排除模式
        var excludes = EXCLUDE_PATTERNS[type] || []
        var excluded = false
        for (var k = 0; k < excludes.length; k++) {
          if (msg.indexOf(excludes[k]) !== -1) {
            excluded = true
            break
          }
        }
        if (!excluded) {
          types.push(type)
          break
        }
      }
    }
  }
  
  // 如果激活了技能，根据技能类型补充数据
  if (activeSkill && SKILL_DATA_MAPPING[activeSkill.id]) {
    var skillTypes = SKILL_DATA_MAPPING[activeSkill.id]
    for (var s = 0; s < skillTypes.length; s++) {
      if (types.indexOf(skillTypes[s]) === -1) {
        types.push(skillTypes[s])
      }
    }
  }
  
  return types
}

/**
 * 获取浮窗显示的摘要信息
 * @param {Array<string>} dataTypes - 数据类型数组
 * @returns {Promise<Object>} { items: [{type, label, count, detail}], hasData }
 */
async function getDataSummary(dataTypes) {
  var items = []
  try {
    if (dataTypes.indexOf('brushing') !== -1) {
      var records = await cloud.fetchBrushingRecords()
      var stats = getBrushingStats(records)
      items.push({
        type: 'brushing',
        label: '刷牙记录',
        count: records.length,
        detail: '连续' + stats.streak + '天，本周完成率' + stats.weekRate + '%'
      })
    }
    if (dataTypes.indexOf('habit') !== -1) {
      var hRecords = await cloud.fetchHabitRecords()
      var habitStats = getHabitStats(hRecords)
      items.push({
        type: 'habit',
        label: '习惯打卡',
        count: hRecords.length,
        detail: '连续' + habitStats.streak + '天，本周完成率' + habitStats.weekRate + '%'
      })
    }
    if (dataTypes.indexOf('learn') !== -1) {
      var progress = await cloud.fetchLearnProgress()
      if (progress) {
        var summary = []
        if (progress.poems) summary.push(progress.poems.length + '首古诗')
        if (progress.cards) summary.push(progress.cards.length + '张卡片')
        if (progress.english) summary.push('英语' + progress.english.length + '项')
        items.push({
          type: 'learn',
          label: '学习进度',
          count: summary.length,
          detail: summary.join('，') || '暂无数据'
        })
      }
    }
    if (dataTypes.indexOf('achievement') !== -1) {
      var achs = await cloud.fetchAchievements()
      items.push({
        type: 'achievement',
        label: '成就数据',
        count: achs ? achs.length : 0,
        detail: '已解锁' + (achs ? achs.length : 0) + '个成就'
      })
    }
    if (dataTypes.indexOf('stall') !== -1) {
      var products = await cloud.fetchStallProducts()
      var sales = await cloud.fetchStallSales()
      items.push({
        type: 'stall',
        label: '摆摊数据',
        count: products ? products.length : 0,
        detail: (products ? products.length : 0) + '件商品，' + (sales ? sales.length : 0) + '笔销售'
      })
    }
  } catch (err) {
    console.error('获取数据摘要失败:', err)
  }
  return { items: items, hasData: items.length > 0 }
}

/**
 * 生成注入AI的上下文文本
 * @param {Array<string>} dataTypes - 数据类型数组
 * @returns {Promise<string>} 格式化的上下文文本
 */
async function buildContextText(dataTypes) {
  var lines = ['【用户数据参考】']
  try {
    if (dataTypes.indexOf('brushing') !== -1) {
      var records = await cloud.fetchBrushingRecords()
      var stats = getBrushingStats(records)
      var today = getTodayStr()
      var todayRecords = records.filter(function(r) { return r.date === today })
      lines.push('刷牙：总计' + records.length + '条记录，今日' + todayRecords.length + '次，'
        + '平均分' + stats.avgScore + '分，连续' + stats.streak + '天，本周完成率' + stats.weekRate + '%')
      // 最近3天记录摘要
      var recent = records.slice(-6)
      if (recent.length > 0) {
        var recentLines = recent.map(function(r) {
          return r.date + ' ' + (r.timeOfDay === 'morning' ? '早' : '晚') + ' ' + (r.score || 0) + '分'
        })
        lines.push('  近期：' + recentLines.join('；'))
      }
    }
    if (dataTypes.indexOf('habit') !== -1) {
      var hRecords = await cloud.fetchHabitRecords()
      var habitStats = getHabitStats(hRecords)
      lines.push('习惯打卡：总计' + hRecords.length + '条记录，连续' + habitStats.streak + '天，本周完成率' + habitStats.weekRate + '%')
      // 按类型分组统计
      var typeMap = {}
      hRecords.forEach(function(r) {
        if (!typeMap[r.type]) typeMap[r.type] = 0
        typeMap[r.type]++
      })
      var typeNames = { early_up: '早起', reading: '阅读', exercise: '运动', wash_hands: '洗手', drink: '喝水', brushing: '刷牙' }
      var typeStrs = Object.keys(typeMap).map(function(t) { return (typeNames[t] || t) + typeMap[t] + '次' })
      if (typeStrs.length > 0) lines.push('  类型分布：' + typeStrs.join('，'))
    }
    if (dataTypes.indexOf('learn') !== -1) {
      var progress = await cloud.fetchLearnProgress()
      if (progress) {
        var parts = []
        if (progress.poems) parts.push('古诗' + progress.poems.length + '首')
        if (progress.cards) parts.push('卡片' + progress.cards.length + '张')
        if (progress.numbers) parts.push('数字' + progress.numbers.length + '项')
        if (progress.english) parts.push('英语' + progress.english.length + '项')
        lines.push('学习进度：' + (parts.join('，') || '暂无'))
      }
    }
    if (dataTypes.indexOf('achievement') !== -1) {
      var achs = await cloud.fetchAchievements()
      if (achs && achs.length > 0) {
        var names = achs.slice(0, 5).map(function(a) { return a.name || a.title || '未知' })
        lines.push('成就：已解锁' + achs.length + '个（' + names.join('、') + '等）')
      }
    }
    if (dataTypes.indexOf('stall') !== -1) {
      var products = await cloud.fetchStallProducts()
      var sales = await cloud.fetchStallSales()
      lines.push('摆摊：' + (products ? products.length : 0) + '件商品，' + (sales ? sales.length : 0) + '笔销售记录')
    }
  } catch (err) {
    console.error('构建上下文文本失败:', err)
  }
  return lines.join('\n')
}

// 获取今日日期字符串
function getTodayStr() {
  var d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

// 计算刷牙统计
function getBrushingStats(records) {
  if (!records || records.length === 0) return { total: 0, todayCount: 0, avgScore: 0, streak: 0, weekRate: 0 }
  
  var today = getTodayStr()
  var todayCount = records.filter(function(r) { return r.date === today }).length
  
  var totalScore = records.reduce(function(sum, r) { return sum + (r.score || 0) }, 0)
  var avgScore = parseFloat((totalScore / records.length).toFixed(1))
  
  // 计算连续天数
  var dates = []
  records.forEach(function(r) {
    if (dates.indexOf(r.date) === -1) dates.push(r.date)
  })
  dates.sort().reverse()
  
  var streak = 0
  var checkDate = new Date()
  for (var i = 0; i < dates.length; i++) {
    var expected = checkDate.getFullYear() + '-' + String(checkDate.getMonth() + 1).padStart(2, '0') + '-' + String(checkDate.getDate()).padStart(2, '0')
    if (dates[i] === expected) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }
  
  // 计算本周完成率
  var weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  var weekDays = {}
  records.forEach(function(r) {
    var d = new Date(r.date)
    if (d >= weekStart) {
      if (!weekDays[r.date]) weekDays[r.date] = 0
      weekDays[r.date]++
    }
  })
  var completedDays = Object.keys(weekDays).filter(function(d) { return weekDays[d] >= 2 }).length
  var weekRate = Math.round(completedDays / 7 * 100)
  
  return { total: records.length, todayCount: todayCount, avgScore: avgScore, streak: streak, weekRate: weekRate }
}

// 计算习惯统计
function getHabitStats(records) {
  if (!records || records.length === 0) return { streak: 0, weekRate: 0 }
  
  // 计算连续天数
  var dates = []
  records.forEach(function(r) {
    if (dates.indexOf(r.date) === -1) dates.push(r.date)
  })
  dates.sort().reverse()
  
  var streak = 0
  var checkDate = new Date()
  for (var i = 0; i < dates.length; i++) {
    var expected = checkDate.getFullYear() + '-' + String(checkDate.getMonth() + 1).padStart(2, '0') + '-' + String(checkDate.getDate()).padStart(2, '0')
    if (dates[i] === expected) {
      streak++
      checkDate.setDate(checkDate.getDate() - 1)
    } else {
      break
    }
  }
  
  // 计算本周完成率
  var weekStart = new Date()
  weekStart.setDate(weekStart.getDate() - weekStart.getDay())
  var weekDays = {}
  records.forEach(function(r) {
    var d = new Date(r.date)
    if (d >= weekStart) {
      if (!weekDays[r.date]) weekDays[r.date] = 0
      weekDays[r.date]++
    }
  })
  var completedDays = Object.keys(weekDays).filter(function(d) { return weekDays[d] >= 1 }).length
  var weekRate = Math.round(completedDays / 7 * 100)
  
  return { streak: streak, weekRate: weekRate }
}

module.exports = {
  detectDataTypes: detectDataTypes,
  getDataSummary: getDataSummary,
  buildContextText: buildContextText,
  DATA_TYPE_LABELS: DATA_TYPE_LABELS
}
