var childStorage = require('../../utils/child-storage.js')
var cloud = require('../../utils/cloud.js')
var auth = require('../../utils/auth.js')

var BOOKS_KEY = 'accountBooks'
var ENTRIES_KEY = 'accountEntries'
var SETTINGS_KEY = 'accountSettings'
var TEMPLATES_KEY = 'accountTemplates'
var DELETED_BOOKS_KEY = 'deletedBookIds'
var DELETED_ENTRIES_KEY = 'deletedEntryIds'

var EXPENSE_CATEGORIES = [
  { id: 'food', name: '餐饮', icon: '🍜' },
  { id: 'shopping', name: '购物', icon: '🛒' },
  { id: 'transport', name: '交通', icon: '🚌' },
  { id: 'entertainment', name: '娱乐', icon: '🎮' },
  { id: 'health', name: '医疗', icon: '💊' },
  { id: 'education', name: '教育', icon: '📚' },
  { id: 'housing', name: '住房', icon: '🏠' },
  { id: 'utilities', name: '水电', icon: '💡' },
  { id: 'clothing', name: '服饰', icon: '👔' },
  { id: 'digital', name: '数码', icon: '📱' },
  { id: 'gift', name: '礼物', icon: '🎁' },
  { id: 'snack', name: '零食', icon: '🍪' },
  { id: 'toy', name: '玩具', icon: '🧸' },
  { id: 'pet', name: '宠物', icon: '🐱' },
  { id: 'other_expense', name: '其他', icon: '📦' }
]

var INCOME_CATEGORIES = [
  { id: 'salary', name: '工资', icon: '💼' },
  { id: 'bonus', name: '奖金', icon: '🎉' },
  { id: 'investment', name: '投资收益', icon: '📈' },
  { id: 'freelance', name: '兼职', icon: '💪' },
  { id: 'refund', name: '退款', icon: '↩️' },
  { id: 'gift_income', name: '红包', icon: '🧧' },
  { id: 'allowance', name: '零花钱', icon: '💵' },
  { id: 'prize', name: '奖励', icon: '🏆' },
  { id: 'other_income', name: '其他', icon: '💰' }
]

var TRANSFER_CATEGORIES = [
  { id: 'deposit', name: '存款', icon: '🏦', direction: 'out' },
  { id: 'withdraw', name: '取款', icon: '🏧', direction: 'in' },
  { id: 'lend', name: '借出', icon: '🤝', direction: 'out' },
  { id: 'borrow', name: '借入', icon: '📝', direction: 'in' },
  { id: 'repay_lend', name: '收回借款', icon: '↙️', direction: 'in' },
  { id: 'repay_borrow', name: '还款', icon: '↗️', direction: 'out' },
  { id: 'invest', name: '理财买入', icon: '📊', direction: 'out' },
  { id: 'redeem', name: '理财赎回', icon: '💳', direction: 'in' },
  { id: 'transfer_in', name: '转入', icon: '📥', direction: 'in' },
  { id: 'transfer_out', name: '转出', icon: '📤', direction: 'out' }
]

function generateId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8)
}

function getTodayStr() {
  var d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function getNowTime() {
  var d = new Date()
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

function getMember() {
  return auth.getMember() || {}
}

// ===== 账本 CRUD =====

function getBooks() {
  return childStorage.get(BOOKS_KEY) || []
}

function getBook(id) {
  var books = getBooks()
  for (var i = 0; i < books.length; i++) {
    if (books[i].id === id) return books[i]
  }
  return null
}

function addBook(book) {
  var books = getBooks()
  var member = getMember()
  book.id = generateId('book')
  book.childId = auth.getCurrentChildId()
  book.familyId = member.familyId || ''
  book.createdAt = new Date().toISOString()
  book.updatedAt = book.createdAt
  book.lastSyncAt = ''
  book.sortOrder = books.length
  book.isDefault = books.length === 0
  book.isArchived = false
  book.entryCount = 0
  book.currency = book.currency || 'CNY'
  book.monthlyBudget = book.monthlyBudget || 0
  book.budgetAlert = book.budgetAlert || 0.8
  book.reminderEnabled = false
  book.reminderTime = '20:00'
  book.reminderDays = [1, 2, 3, 4, 5, 6, 0]
  book.sharedMode = book.sharedMode || 'private'
  book.ownerMemberId = member._id || ''
  book.members = book.members || []
  book.synced = false
  books.push(book)
  childStorage.set(BOOKS_KEY, books)
  cloud.uploadAccountBook(book)
  return book
}

function updateBook(id, updates) {
  var books = getBooks()
  for (var i = 0; i < books.length; i++) {
    if (books[i].id === id) {
      Object.assign(books[i], updates, { updatedAt: new Date().toISOString(), synced: false })
      childStorage.set(BOOKS_KEY, books)
      cloud.uploadAccountBook(books[i])
      return books[i]
    }
  }
  return null
}

function removeBook(id) {
  var books = getBooks()
  var entries = getEntries(id)
  for (var i = 0; i < entries.length; i++) {
    cloud.removeBookEntry(entries[i].id)
  }
  var filtered = books.filter(function(b) { return b.id !== id })
  childStorage.set(BOOKS_KEY, filtered)
  cloud.removeAccountBook(id)
  return filtered
}

function archiveBook(id) {
  return updateBook(id, { isArchived: true })
}

function setDefaultBook(id) {
  var books = getBooks()
  for (var i = 0; i < books.length; i++) {
    books[i].isDefault = books[i].id === id
  }
  childStorage.set(BOOKS_KEY, books)
  return books
}

// ===== 记账条目 CRUD =====

function getEntries(bookId, filters) {
  var entries = childStorage.get(ENTRIES_KEY) || []
  if (bookId) {
    entries = entries.filter(function(e) { return e.bookId === bookId })
  }
  if (filters) {
    if (filters.type) {
      entries = entries.filter(function(e) { return e.type === filters.type })
    }
    if (filters.category) {
      entries = entries.filter(function(e) { return e.category === filters.category })
    }
    if (filters.startDate) {
      entries = entries.filter(function(e) { return e.date >= filters.startDate })
    }
    if (filters.endDate) {
      entries = entries.filter(function(e) { return e.date <= filters.endDate })
    }
    if (filters.keyword) {
      var kw = filters.keyword.toLowerCase()
      entries = entries.filter(function(e) {
        return (e.note && e.note.toLowerCase().indexOf(kw) >= 0) ||
               (e.category && e.category.toLowerCase().indexOf(kw) >= 0)
      })
    }
  }
  entries.sort(function(a, b) {
    if (a.date !== b.date) return b.date.localeCompare(a.date)
    return b.time.localeCompare(a.time)
  })
  return entries
}

function addEntry(entry) {
  var entries = childStorage.get(ENTRIES_KEY) || []
  var member = getMember()
  entry.id = generateId('entry')
  entry.childId = auth.getCurrentChildId()
  entry.familyId = member.familyId || ''
  entry.date = entry.date || getTodayStr()
  entry.time = entry.time || getNowTime()
  entry.createdAt = new Date().toISOString()
  entry.updatedAt = entry.createdAt
  entry.synced = false
  entry.createdByMemberId = member._id || ''
  entry.createdByName = member.name || member.childName || ''
  entry.updatedByMemberId = member._id || ''
  entry.isReconciled = entry.isReconciled || false
  entry.tags = entry.tags || []
  entry.images = entry.images || []
  entry.relatedBookId = entry.relatedBookId || ''
  entry.relatedEntryId = entry.relatedEntryId || ''
  entry.repeatRule = entry.repeatRule || ''
  entry.repeatGroupId = entry.repeatGroupId || ''
  entry.nextRepeatDate = entry.nextRepeatDate || ''
  if (entry.type === 'expense') {
    entry.direction = 'out'
  } else if (entry.type === 'income') {
    entry.direction = 'in'
  } else if (entry.type === 'transfer' && !entry.direction) {
    var cat = getTransferCategory(entry.category)
    entry.direction = cat ? cat.direction : 'out'
  }
  entries.push(entry)
  childStorage.set(ENTRIES_KEY, entries)
  updateBookEntryCount(entry.bookId)
  cloud.uploadBookEntry(entry)
  return entry
}

function updateEntry(id, updates) {
  var entries = childStorage.get(ENTRIES_KEY) || []
  for (var i = 0; i < entries.length; i++) {
    if (entries[i].id === id) {
      var member = getMember()
      Object.assign(entries[i], updates, {
        updatedAt: new Date().toISOString(),
        updatedByMemberId: member._id || '',
        synced: false
      })
      childStorage.set(ENTRIES_KEY, entries)
      cloud.uploadBookEntry(entries[i])
      return entries[i]
    }
  }
  return null
}

function removeEntry(id, skipCascade) {
  var entries = childStorage.get(ENTRIES_KEY) || []
  var entry = null
  for (var i = 0; i < entries.length; i++) {
    if (entries[i].id === id) {
      entry = entries[i]
      break
    }
  }
  if (!skipCascade && entry && entry.relatedEntryId) {
    removeEntry(entry.relatedEntryId, true)
  }
  var filtered = entries.filter(function(e) { return e.id !== id })
  childStorage.set(ENTRIES_KEY, filtered)
  if (entry) {
    updateBookEntryCount(entry.bookId)
  }
  cloud.removeBookEntry(id)
  return filtered
}

function updateBookEntryCount(bookId) {
  var entries = getEntries(bookId)
  updateBook(bookId, { entryCount: entries.length })
}

// ===== 分类管理 =====

function getCategories(type) {
  if (type === 'expense') return EXPENSE_CATEGORIES
  if (type === 'income') return INCOME_CATEGORIES
  if (type === 'transfer') return TRANSFER_CATEGORIES
  return []
}

function getTransferCategory(id) {
  for (var i = 0; i < TRANSFER_CATEGORIES.length; i++) {
    if (TRANSFER_CATEGORIES[i].id === id) return TRANSFER_CATEGORIES[i]
  }
  return null
}

function getCategoryName(type, id) {
  var categories = getCategories(type)
  for (var i = 0; i < categories.length; i++) {
    if (categories[i].id === id) return categories[i].name
  }
  return id
}

function getCategoryIcon(type, id) {
  var categories = getCategories(type)
  for (var i = 0; i < categories.length; i++) {
    if (categories[i].id === id) return categories[i].icon
  }
  return '📦'
}

function getCustomCategories() {
  var settings = getSettings()
  return settings.customCategories || { expense: [], income: [], transfer: [] }
}

function addCustomCategory(type, category) {
  var settings = getSettings()
  if (!settings.customCategories) {
    settings.customCategories = { expense: [], income: [], transfer: [] }
  }
  if (!settings.customCategories[type]) {
    settings.customCategories[type] = []
  }
  category.id = category.id || generateId('cat')
  settings.customCategories[type].push(category)
  saveSettings(settings)
  return category
}

function removeCustomCategory(type, id) {
  var settings = getSettings()
  if (settings.customCategories && settings.customCategories[type]) {
    settings.customCategories[type] = settings.customCategories[type].filter(function(c) { return c.id !== id })
    saveSettings(settings)
  }
}

function updateCustomCategory(type, id, updates) {
  var settings = getSettings()
  if (settings.customCategories && settings.customCategories[type]) {
    for (var i = 0; i < settings.customCategories[type].length; i++) {
      if (settings.customCategories[type][i].id === id) {
        Object.assign(settings.customCategories[type][i], updates)
        saveSettings(settings)
        return settings.customCategories[type][i]
      }
    }
  }
  return null
}

// ===== 模板管理 =====

function getTemplates() {
  var settings = getSettings()
  return settings.templates || []
}

function saveAsTemplate(entry) {
  var settings = getSettings()
  if (!settings.templates) settings.templates = []
  var template = {
    id: generateId('tpl'),
    name: entry.note || getCategoryName(entry.type, entry.category),
    type: entry.type,
    category: entry.category,
    amount: entry.amount,
    note: entry.note || '',
    tags: entry.tags || [],
    useCount: 0
  }
  settings.templates.push(template)
  saveSettings(settings)
  return template
}

function removeTemplate(id) {
  var settings = getSettings()
  if (settings.templates) {
    settings.templates = settings.templates.filter(function(t) { return t.id !== id })
    saveSettings(settings)
  }
}

// ===== 统计计算 =====

function getOverviewStats() {
  var books = getBooks()
  var entries = childStorage.get(ENTRIES_KEY) || []
  var today = getTodayStr()
  var thisMonth = today.substring(0, 7)
  var totalIncome = 0
  var totalExpense = 0
  var todayIncome = 0
  var todayExpense = 0
  var monthIncome = 0
  var monthExpense = 0
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i]
    if (e.type === 'income') {
      totalIncome += e.amount
      if (e.date === today) todayIncome += e.amount
      if (e.date.indexOf(thisMonth) === 0) monthIncome += e.amount
    } else if (e.type === 'expense') {
      totalExpense += e.amount
      if (e.date === today) todayExpense += e.amount
      if (e.date.indexOf(thisMonth) === 0) monthExpense += e.amount
    }
  }
  return {
    bookCount: books.length,
    entryCount: entries.length,
    totalIncome: totalIncome,
    totalExpense: totalExpense,
    totalBalance: totalIncome - totalExpense,
    todayIncome: todayIncome,
    todayExpense: todayExpense,
    todayBalance: todayIncome - todayExpense,
    monthIncome: monthIncome,
    monthExpense: monthExpense,
    monthBalance: monthIncome - monthExpense
  }
}

function getBookStats(bookId, timeRange) {
  var entries = getEntries(bookId, timeRange)
  var income = 0
  var expense = 0
  var transfer = 0
  var categoryStats = {}
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i]
    if (e.type === 'income') income += e.amount
    else if (e.type === 'expense') expense += e.amount
    else transfer += e.amount
    if (!categoryStats[e.category]) {
      categoryStats[e.category] = { amount: 0, count: 0 }
    }
    categoryStats[e.category].amount += e.amount
    categoryStats[e.category].count++
  }
  return {
    income: income,
    expense: expense,
    transfer: transfer,
    balance: income - expense,
    entryCount: entries.length,
    categoryStats: categoryStats
  }
}

function getCategoryStats(bookId, timeRange) {
  var entries = getEntries(bookId, timeRange)
  var stats = {}
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i]
    if (!stats[e.type]) stats[e.type] = {}
    if (!stats[e.type][e.category]) {
      stats[e.type][e.category] = { amount: 0, count: 0 }
    }
    stats[e.type][e.category].amount += e.amount
    stats[e.type][e.category].count++
  }
  return stats
}

function getTrendStats(bookId, period) {
  var entries = getEntries(bookId)
  var trend = {}
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i]
    var key = ''
    if (period === 'day') key = e.date
    else if (period === 'week') key = getWeekStart(e.date)
    else if (period === 'month') key = e.date.substring(0, 7)
    else if (period === 'year') key = e.date.substring(0, 4)
    if (!trend[key]) trend[key] = { income: 0, expense: 0 }
    if (e.type === 'income') trend[key].income += e.amount
    else if (e.type === 'expense') trend[key].expense += e.amount
  }
  return trend
}

function getWeekStart(dateStr) {
  var d = new Date(dateStr)
  var day = d.getDay()
  var diff = d.getDate() - day + (day === 0 ? -6 : 1)
  var start = new Date(d.setDate(diff))
  return start.getFullYear() + '-' + String(start.getMonth() + 1).padStart(2, '0') + '-' + String(start.getDate()).padStart(2, '0')
}

function getCalendarData(bookId, month) {
  var entries = getEntries(bookId)
  var calendar = {}
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i]
    if (e.date.indexOf(month) === 0) {
      if (!calendar[e.date]) calendar[e.date] = { income: 0, expense: 0, count: 0 }
      if (e.type === 'income') calendar[e.date].income += e.amount
      else if (e.type === 'expense') calendar[e.date].expense += e.amount
      calendar[e.date].count++
    }
  }
  return calendar
}

function getComparisonStats(bookId, period) {
  var entries = getEntries(bookId)
  var today = new Date()
  var currentStart, currentEnd, prevStart, prevEnd
  if (period === 'month') {
    currentStart = today.getFullYear() + '-' + String(today.getMonth() + 1).padStart(2, '0') + '-01'
    currentEnd = getTodayStr()
    var prevMonth = today.getMonth() === 0 ? 12 : today.getMonth()
    var prevYear = today.getMonth() === 0 ? today.getFullYear() - 1 : today.getFullYear()
    prevStart = prevYear + '-' + String(prevMonth).padStart(2, '0') + '-01'
    var lastDay = new Date(prevYear, prevMonth, 0).getDate()
    prevEnd = prevYear + '-' + String(prevMonth).padStart(2, '0') + '-' + String(lastDay).padStart(2, '0')
  } else if (period === 'week') {
    currentStart = getWeekStart(getTodayStr())
    currentEnd = getTodayStr()
    var prevWeekStart = new Date(currentStart)
    prevWeekStart.setDate(prevWeekStart.getDate() - 7)
    prevStart = prevWeekStart.toISOString().substring(0, 10)
    var prevWeekEnd = new Date(currentStart)
    prevWeekEnd.setDate(prevWeekEnd.getDate() - 1)
    prevEnd = prevWeekEnd.toISOString().substring(0, 10)
  }
  var current = { income: 0, expense: 0 }
  var prev = { income: 0, expense: 0 }
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i]
    if (e.date >= currentStart && e.date <= currentEnd) {
      if (e.type === 'income') current.income += e.amount
      else if (e.type === 'expense') current.expense += e.amount
    } else if (e.date >= prevStart && e.date <= prevEnd) {
      if (e.type === 'income') prev.income += e.amount
      else if (e.type === 'expense') prev.expense += e.amount
    }
  }
  return { current: current, prev: prev }
}

function getBudgetProgress(bookId) {
  var book = getBook(bookId)
  if (!book || !book.monthlyBudget) return null
  var today = getTodayStr()
  var thisMonth = today.substring(0, 7)
  var entries = getEntries(bookId)
  var monthExpense = 0
  for (var i = 0; i < entries.length; i++) {
    if (entries[i].type === 'expense' && entries[i].date.indexOf(thisMonth) === 0) {
      monthExpense += entries[i].amount
    }
  }
  return {
    budget: book.monthlyBudget,
    spent: monthExpense,
    remaining: book.monthlyBudget - monthExpense,
    percentage: monthExpense / book.monthlyBudget,
    isOverBudget: monthExpense > book.monthlyBudget,
    alertThreshold: book.budgetAlert || 0.8,
    isAlert: monthExpense / book.monthlyBudget >= (book.budgetAlert || 0.8)
  }
}

// ===== 权限检查 =====

function canEdit(book, memberId) {
  if (book.sharedMode === 'private') return book.ownerMemberId === memberId
  for (var i = 0; i < book.members.length; i++) {
    if (book.members[i].memberId === memberId) {
      return book.members[i].role === 'admin' || book.members[i].role === 'writer'
    }
  }
  return false
}

function canDelete(book, memberId) {
  if (book.sharedMode === 'private') return book.ownerMemberId === memberId
  for (var i = 0; i < book.members.length; i++) {
    if (book.members[i].memberId === memberId) {
      return book.members[i].role === 'admin'
    }
  }
  return false
}

function canManageMembers(book, memberId) {
  if (book.sharedMode === 'private') return false
  for (var i = 0; i < book.members.length; i++) {
    if (book.members[i].memberId === memberId) {
      return book.members[i].role === 'admin'
    }
  }
  return false
}

function canExport(book, memberId) {
  if (book.sharedMode === 'private') return book.ownerMemberId === memberId
  for (var i = 0; i < book.members.length; i++) {
    if (book.members[i].memberId === memberId) {
      return true
    }
  }
  return false
}

// ===== 分享管理 =====

function addMember(bookId, memberId, role, name) {
  var book = getBook(bookId)
  if (!book) return null
  if (book.sharedMode === 'private') {
    book.sharedMode = 'shared'
  }
  var exists = false
  for (var i = 0; i < book.members.length; i++) {
    if (book.members[i].memberId === memberId) {
      book.members[i].role = role
      exists = true
      break
    }
  }
  if (!exists) {
    book.members.push({ memberId: memberId, role: role, joinedAt: new Date().toISOString(), name: name || '' })
  }
  return updateBook(bookId, { sharedMode: book.sharedMode, members: book.members })
}

function removeMember(bookId, memberId) {
  var book = getBook(bookId)
  if (!book) return null
  book.members = book.members.filter(function(m) { return m.memberId !== memberId })
  return updateBook(bookId, { members: book.members })
}

function updateMemberRole(bookId, memberId, role) {
  var book = getBook(bookId)
  if (!book) return null
  for (var i = 0; i < book.members.length; i++) {
    if (book.members[i].memberId === memberId) {
      book.members[i].role = role
      break
    }
  }
  return updateBook(bookId, { members: book.members })
}

// ===== CSV 导出 =====

function escapeCSVField(field) {
  if (typeof field !== 'string') field = String(field)
  if (field.indexOf(',') >= 0 || field.indexOf('"') >= 0 || field.indexOf('\n') >= 0) {
    return '"' + field.replace(/"/g, '""') + '"'
  }
  return field
}

function generateCSV(entries, options, viewerRole) {
  var bom = '\uFEFF'
  var headers = ['日期', '时间', '类型', '分类', '金额', '备注', '标签']
  if (viewerRole !== 'viewer') headers.push('记账人')
  var rows = []
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i]
    var row = [
      escapeCSVField(e.date),
      escapeCSVField(e.time),
      escapeCSVField(getTypeName(e.type)),
      escapeCSVField(getCategoryName(e.type, e.category)),
      escapeCSVField(e.amount),
      escapeCSVField(e.note || ''),
      escapeCSVField((e.tags || []).join(';'))
    ]
    if (viewerRole !== 'viewer') row.push(escapeCSVField(e.createdByName || ''))
    rows.push(row.join(','))
  }
  return bom + headers.join(',') + '\n' + rows.join('\n')
}

function shareCSV(csvContent, fileName) {
  var fs = wx.getFileSystemManager()
  var filePath = wx.env.USER_DATA_PATH + '/' + (fileName || '记账导出') + '.csv'
  fs.writeFileSync(filePath, csvContent, 'utf-8')
  wx.shareFileMessage({ filePath: filePath, fileName: (fileName || '记账导出') + '.csv' })
}

function getTypeName(type) {
  if (type === 'expense') return '支出'
  if (type === 'income') return '收入'
  if (type === 'transfer') return '不计入'
  return type
}

// ===== 数据备份/恢复 =====

function exportBackup(bookId) {
  var books = bookId ? [getBook(bookId)] : getBooks()
  var entries = bookId ? getEntries(bookId) : childStorage.get(ENTRIES_KEY) || []
  var settings = getSettings()
  return {
    version: '1.0',
    exportTime: new Date().toISOString(),
    books: books,
    entries: entries,
    settings: settings
  }
}

function importBackup(data, mode) {
  if (mode === 'overwrite') {
    childStorage.set(BOOKS_KEY, data.books || [])
    childStorage.set(ENTRIES_KEY, data.entries || [])
    if (data.settings) saveSettings(data.settings)
  } else {
    var existingBooks = getBooks()
    var existingEntries = childStorage.get(ENTRIES_KEY) || []
    var bookIds = {}
    var entryIds = {}
    for (var i = 0; i < existingBooks.length; i++) bookIds[existingBooks[i].id] = true
    for (var j = 0; j < existingEntries.length; j++) entryIds[existingEntries[j].id] = true
    var newBooks = data.books || []
    for (var k = 0; k < newBooks.length; k++) {
      if (!bookIds[newBooks[k].id]) existingBooks.push(newBooks[k])
    }
    var newEntries = data.entries || []
    for (var l = 0; l < newEntries.length; l++) {
      if (!entryIds[newEntries[l].id]) existingEntries.push(newEntries[l])
    }
    childStorage.set(BOOKS_KEY, existingBooks)
    childStorage.set(ENTRIES_KEY, existingEntries)
  }
}

// ===== 同步 =====

async function syncFromCloud() {
  try {
    var books = await cloud.fetchAccountBooks()
    if (books && books.length > 0) {
      childStorage.set(BOOKS_KEY, books)
    } else if (books && books.length === 0 && childStorage.get(BOOKS_KEY) && childStorage.get(BOOKS_KEY).length > 0) {
      // 云端为空但本地有数据，不覆盖（可能是云端数据丢失）
    }
    var entries = await cloud.fetchBookEntries()
    if (entries && entries.length > 0) {
      childStorage.set(ENTRIES_KEY, entries)
    } else if (entries && entries.length === 0 && childStorage.get(ENTRIES_KEY) && childStorage.get(ENTRIES_KEY).length > 0) {
      // 云端为空但本地有数据，不覆盖
    }
    var settings = await cloud.fetchAccountSettings()
    if (settings && Object.keys(settings).length > 0) {
      childStorage.set(SETTINGS_KEY, settings)
    }
  } catch (err) {
    console.warn('记账本云端同步失败:', err)
  }
}

// ===== 设置 =====

function getSettings() {
  return childStorage.get(SETTINGS_KEY) || {}
}

function saveSettings(settings) {
  childStorage.set(SETTINGS_KEY, settings)
  cloud.uploadAccountSettings(settings)
}

module.exports = {
  EXPENSE_CATEGORIES: EXPENSE_CATEGORIES,
  INCOME_CATEGORIES: INCOME_CATEGORIES,
  TRANSFER_CATEGORIES: TRANSFER_CATEGORIES,
  getBooks: getBooks,
  getBook: getBook,
  addBook: addBook,
  updateBook: updateBook,
  removeBook: removeBook,
  archiveBook: archiveBook,
  setDefaultBook: setDefaultBook,
  getEntries: getEntries,
  addEntry: addEntry,
  updateEntry: updateEntry,
  removeEntry: removeEntry,
  getCategories: getCategories,
  getCategoryName: getCategoryName,
  getCategoryIcon: getCategoryIcon,
  getCustomCategories: getCustomCategories,
  addCustomCategory: addCustomCategory,
  updateCustomCategory: updateCustomCategory,
  removeCustomCategory: removeCustomCategory,
  getTemplates: getTemplates,
  saveAsTemplate: saveAsTemplate,
  removeTemplate: removeTemplate,
  getOverviewStats: getOverviewStats,
  getBookStats: getBookStats,
  getCategoryStats: getCategoryStats,
  getTrendStats: getTrendStats,
  getCalendarData: getCalendarData,
  getComparisonStats: getComparisonStats,
  getBudgetProgress: getBudgetProgress,
  canEdit: canEdit,
  canDelete: canDelete,
  canManageMembers: canManageMembers,
  canExport: canExport,
  addMember: addMember,
  removeMember: removeMember,
  updateMemberRole: updateMemberRole,
  generateCSV: generateCSV,
  shareCSV: shareCSV,
  exportBackup: exportBackup,
  importBackup: importBackup,
  syncFromCloud: syncFromCloud,
  getSettings: getSettings,
  saveSettings: saveSettings,
  getTypeName: getTypeName,
  getTodayStr: getTodayStr
}
