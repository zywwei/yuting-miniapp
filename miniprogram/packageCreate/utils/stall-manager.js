var childStorage = getApp().globalData.childStorage
var cloud = getApp().globalData.cloud
var auth = getApp().globalData.auth
var pageHelpers = getApp().globalData.pageHelpers

var PRODUCTS_KEY = 'stallProducts'
var SALES_KEY = 'stallSales'
var SETTINGS_KEY = 'stallSettings'
var CHALLENGES_KEY = 'stallDailyChallenges'
var BUSINESS_HOURS_KEY = 'stallBusinessHours'

var LEVELS = [
  { level: 1, name: '路边摊', requirement: 0, icon: '🏕️' },
  { level: 2, name: '小地摊', requirement: 50, icon: '🎪' },
  { level: 3, name: '小店铺', requirement: 200, icon: '🏪' },
  { level: 4, name: '大商铺', requirement: 500, icon: '🏬' },
  { level: 5, name: '连锁店', requirement: 1000, icon: '🏢' }
]

var CATEGORIES = ['手工', '玩具', '文具', '食物', '饮料', '饰品', '其他']

// 每日挑战定义
var DAILY_CHALLENGES = [
  { id: 'first_sale', title: '开张大吉', desc: '完成今日第一笔销售', icon: '🎉', reward: 5 },
  { id: 'sales_3', title: '小有斩获', desc: '今日完成3笔销售', icon: '📈', reward: 10 },
  { id: 'sales_5', title: '销售达人', desc: '今日完成5笔销售', icon: '🏆', reward: 20 },
  { id: 'revenue_50', title: '日入斗金', desc: '今日销售额达到50元', icon: '💰', reward: 15 },
  { id: 'revenue_100', title: '财源广进', desc: '今日销售额达到100元', icon: '💎', reward: 30 },
  { id: 'new_product', title: '推陈出新', desc: '今日添加1个新商品', icon: '📦', reward: 5 },
  { id: 'streak_3', title: '坚持不懈', desc: '连续营业3天', icon: '🔥', reward: 10 },
  { id: 'full_day', title: '全天营业', desc: '今日营业时长超过2小时', icon: '⏰', reward: 15 }
]

function generateId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substring(2, 8)
}

// 复用 page-helpers 的 getTodayStr，保持导出兼容
var getTodayStr = pageHelpers.getTodayStr

function getNowTime() {
  var d = new Date()
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

// Products
function getProducts() {
  return childStorage.get(PRODUCTS_KEY) || []
}

// 异步从云端同步数据
async function syncFromCloud() {
  try {
    // 同步商品（fetchStallProducts 已处理删除逻辑）
    var products = await cloud.fetchStallProducts()
    if (products && products.length >= 0) {
      childStorage.set(PRODUCTS_KEY, products)
    }
    
    // 同步销售记录
    var sales = await cloud.fetchStallSales()
    if (sales && sales.length >= 0) {
      childStorage.set(SALES_KEY, sales)
    }
    
    // 同步设置
    var settings = await cloud.fetchStallSettings()
    if (settings) {
      childStorage.set(SETTINGS_KEY, settings)
    }
    
    // 同步挑战（空对象防护：fetch 拿不到云端数据时不得覆盖本地进度，P1-5 配套）
    var challenges = await cloud.fetchStallChallenges()
    if (challenges && Object.keys(challenges).length > 0) {
      childStorage.set(CHALLENGES_KEY, challenges)
    }
    
    // 同步营业时间
    var hours = await cloud.fetchStallBusinessHours()
    if (hours) {
      childStorage.set(BUSINESS_HOURS_KEY, hours)
    }
  } catch (err) {
    console.warn('云端同步失败:', err)
  }
}

function saveProducts(products) {
  childStorage.set(PRODUCTS_KEY, products)
}

// 同步单个商品到云端（细粒度上传，每条商品独立一条云文档）
function syncProduct(product) {
  cloud.uploadStallProduct(product)
}

function addProduct(product) {
  var products = getProducts()
  product.id = generateId('prod')
  product.childId = auth.getCurrentChildId()
  product.totalSold = 0
  product.totalRevenue = 0
  product.createdAt = new Date().toISOString()
  product.updatedAt = new Date().toISOString()
  product.synced = false  // 标记为未同步
  products.push(product)
  saveProducts(products)
  syncProduct(product)
  return product
}

function updateProduct(id, updates) {
  var products = getProducts()
  for (var i = 0; i < products.length; i++) {
    if (products[i].id === id) {
      Object.assign(products[i], updates, { updatedAt: new Date().toISOString() })
      saveProducts(products)
      syncProduct(products[i])
      return products[i]
    }
  }
  return null
}

function removeProduct(id) {
  // 先从本地删除
  var products = getProducts()
  products = products.filter(function(p) { return p.id !== id })
  saveProducts(products)
  
  // 删除云端记录（异步，失败会入队列重试）
  cloud.removeStallProduct(id).then(function(success) {
    if (success) {
      // 云端删除成功
    } else {
      console.warn('云端删除失败，已入队列重试:', id)
    }
  })
}

function getProduct(id) {
  var products = getProducts()
  for (var i = 0; i < products.length; i++) {
    if (products[i].id === id) return products[i]
  }
  return null
}

// Sales
function getSales() {
  return childStorage.get(SALES_KEY) || []
}

function saveSales(sales) {
  childStorage.set(SALES_KEY, sales)
}

function addSale(sale) {
  var sales = getSales()
  var products = getProducts()

  sale.id = generateId('sale')
  sale.date = getTodayStr()
  sale.time = getNowTime()
  sale.createdAt = new Date().toISOString()
  sale.synced = false  // 标记为未同步

  // 保留前端传入的折扣信息（向后兼容）
  sale.originalTotal = sale.originalTotal || sale.total
  sale.discount = sale.discount || 10
  sale.discountAmount = sale.discountAmount || 0

  // 重新计算小计（使用原价单价）
  // D1：统一按分取整，避免 0.1+0.2 类浮点脏值入库与展示（如 ¥3.3000000000000003）
  sale.total = 0
  for (var i = 0; i < sale.items.length; i++) {
    var item = sale.items[i]
    item.subtotal = Math.round(item.quantity * item.unitPrice * 100) / 100
    sale.total += item.subtotal

    // 保存成本价快照（向后兼容）
    for (var j = 0; j < products.length; j++) {
      if (products[j].id === item.productId) {
        item.costPrice = item.costPrice || products[j].costPrice || 0
        break
      }
    }
  }
  sale.total = Math.round(sale.total * 100) / 100
  
  // 如果有折扣，使用折后价
  if (sale.discount < 10) {
    sale.total = Math.round(sale.originalTotal * sale.discount / 10 * 100) / 100
    sale.discountAmount = Math.round((sale.originalTotal - sale.total) * 100) / 100
  }

  sale.change = Math.round(((sale.paymentReceived || 0) - sale.total) * 100) / 100

    // 更新库存（使用折后收入）
  for (var i = 0; i < sale.items.length; i++) {
    var item = sale.items[i]
    for (var j = 0; j < products.length; j++) {
      if (products[j].id === item.productId) {
        products[j].quantity = Math.max(0, products[j].quantity - item.quantity)
        products[j].totalSold += item.quantity
        // totalRevenue 记录实际收入（折后价）
        products[j].totalRevenue += sale.discount < 10 
          ? Math.round(item.subtotal * sale.discount / 10 * 100) / 100
          : item.subtotal
        break
      }
    }
  }

  saveProducts(products)
  // 同步受影响的商品到云端
  for (var i = 0; i < sale.items.length; i++) {
    for (var j = 0; j < products.length; j++) {
      if (products[j].id === sale.items[i].productId) {
        syncProduct(products[j])
        break
      }
    }
  }
  sales.push(sale)
  saveSales(sales)
  // 同步单条销售记录到云端
  cloud.uploadStallSale(sale)

  // Check level up
  checkLevelUp()

  return sale
}

function deleteSale(id) {
  var sales = getSales()
  var products = getProducts()
  var sale = null

  for (var i = 0; i < sales.length; i++) {
    if (sales[i].id === id) {
      sale = sales[i]
      break
    }
  }

  if (!sale) return false

  // Restore stock（使用与addSale相同的折扣计算逻辑）
  var discount = sale.discount || 10
  for (var i = 0; i < sale.items.length; i++) {
    var item = sale.items[i]
    for (var j = 0; j < products.length; j++) {
      if (products[j].id === item.productId) {
        products[j].quantity += item.quantity
        products[j].totalSold = Math.max(0, products[j].totalSold - item.quantity)
        // 回退收入时使用与添加时相同的折扣计算
        var revenueToRemove = discount < 10 
          ? Math.round(item.subtotal * discount / 10 * 100) / 100
          : item.subtotal
        products[j].totalRevenue = Math.max(0, products[j].totalRevenue - revenueToRemove)
        break
      }
    }
  }

  saveProducts(products)

  sales = sales.filter(function(s) { return s.id !== id })
  saveSales(sales)
  
  // 使用墓碑机制删除云端记录
  cloud.removeStallSale(id)

  return true
}

// ===== 每日挑战系统 =====
function getTodayChallenges() {
  var today = getTodayStr()
  var challenges = childStorage.get(CHALLENGES_KEY) || {}
  if (!challenges[today]) {
    challenges[today] = { date: today, completed: [], claimed: [], points: 0 }
  }
  return challenges[today]
}

function checkChallenges() {
  var today = getTodayStr()
  var challenges = getTodayChallenges()
  var settings = getSettings()
  var sales = getSales().filter(function(s) { return s.date === today })
  var todayRevenue = sales.reduce(function(sum, s) { return sum + (s.total || 0) }, 0)
  var products = getProducts()
  var newCompleted = []

  DAILY_CHALLENGES.forEach(function(challenge) {
    if (challenges.completed.indexOf(challenge.id) >= 0) return

    var completed = false
    switch (challenge.id) {
      case 'first_sale':
        completed = sales.length >= 1
        break
      case 'sales_3':
        completed = sales.length >= 3
        break
      case 'sales_5':
        completed = sales.length >= 5
        break
      case 'revenue_50':
        completed = todayRevenue >= 50
        break
      case 'revenue_100':
        completed = todayRevenue >= 100
        break
      case 'new_product':
        var todayProducts = products.filter(function(p) {
          return p.createdAt && p.createdAt.indexOf(today) >= 0
        })
        completed = todayProducts.length >= 1
        break
      case 'streak_3':
        completed = settings.streakDays >= 3
        break
      case 'full_day':
        var todayHours = getTodayBusinessHours()
        completed = todayHours.totalDuration >= 120
        break
    }

    if (completed) {
      challenges.completed.push(challenge.id)
      newCompleted.push(challenge)
    }
  })

  var allChallenges = childStorage.get(CHALLENGES_KEY) || {}
  allChallenges[today] = challenges
  childStorage.set(CHALLENGES_KEY, allChallenges)
  // 进度变更即上云，修复键名错位导致的「进度永不上云、重启被空对象覆盖」（P1-5）
  cloud.uploadStallChallenges(allChallenges)

  return newCompleted
}

function claimChallenge(challengeId) {
  var today = getTodayStr()
  var challenges = getTodayChallenges()
  var challenge = DAILY_CHALLENGES.find(function(c) { return c.id === challengeId })

  if (!challenge) return false
  if (challenges.completed.indexOf(challengeId) < 0) return false
  if (challenges.claimed.indexOf(challengeId) >= 0) return false

  challenges.claimed.push(challengeId)
  challenges.points += challenge.reward

  var settings = getSettings()
  settings.points = (settings.points || 0) + challenge.reward
  settings.totalPoints = (settings.totalPoints || 0) + challenge.reward
  saveSettings(settings)

  var allChallenges = childStorage.get(CHALLENGES_KEY) || {}
  allChallenges[today] = challenges
  childStorage.set(CHALLENGES_KEY, allChallenges)
  // 领取奖励同样上云（P1-5 配套）
  cloud.uploadStallChallenges(allChallenges)

  return true
}

// ===== 营业时间追踪 =====
function getTodayBusinessHours() {
  var today = getTodayStr()
  var hours = childStorage.get(BUSINESS_HOURS_KEY) || {}
  if (!hours[today]) {
    hours[today] = { date: today, sessions: [], totalDuration: 0, openCount: 0, closeCount: 0 }
  }
  return hours[today]
}

function getBusinessHours() {
  var hours = childStorage.get(BUSINESS_HOURS_KEY) || {}
  var result = []
  var dates = Object.keys(hours).sort().reverse()
  for (var i = 0; i < dates.length; i++) {
    result.push(hours[dates[i]])
  }
  return result
}

function getBusinessHoursByDate(dateStr) {
  var hours = childStorage.get(BUSINESS_HOURS_KEY) || {}
  return hours[dateStr] || { date: dateStr, sessions: [], totalDuration: 0, openCount: 0, closeCount: 0 }
}

function recordOpenTime() {
  var today = getTodayStr()
  var hours = childStorage.get(BUSINESS_HOURS_KEY) || {}
  if (!hours[today]) {
    hours[today] = { date: today, sessions: [], totalDuration: 0, openCount: 0, closeCount: 0 }
  }
  hours[today].sessions.push({ openTime: new Date().toISOString(), closeTime: null })
  hours[today].openCount++
  childStorage.set(BUSINESS_HOURS_KEY, hours)
}

function recordCloseTime() {
  var today = getTodayStr()
  var hours = childStorage.get(BUSINESS_HOURS_KEY) || {}
  if (!hours[today]) return

  var lastSession = hours[today].sessions[hours[today].sessions.length - 1]
  if (lastSession && !lastSession.closeTime) {
    lastSession.closeTime = new Date().toISOString()
    var duration = Math.round((new Date(lastSession.closeTime) - new Date(lastSession.openTime)) / 60000)
    lastSession.duration = duration
    hours[today].totalDuration += duration
    hours[today].closeCount++
    childStorage.set(BUSINESS_HOURS_KEY, hours)
  }
}

// ===== 积分系统 =====
function addPoints(points) {
  var settings = getSettings()
  settings.points = (settings.points || 0) + points
  settings.totalPoints = (settings.totalPoints || 0) + points
  saveSettings(settings)
}

// ===== 低库存检查 =====
function getLowStockProducts(threshold) {
  threshold = threshold || 3
  return getProducts().filter(function(p) { return p.quantity <= threshold })
}

// ===== 默认折扣设置 =====
function setDefaultDiscount(discount) {
  var settings = getSettings()
  settings.defaultDiscount = discount
  saveSettings(settings)
}

function getDefaultDiscount() {
  return getSettings().defaultDiscount || 10
}

// Settings
function getSettings() {
  var settings = childStorage.get(SETTINGS_KEY) || {
    stallName: '我的小铺',
    ownerName: '',
    theme: 'pink',
    dailyGoal: 50,
    level: 1,
    totalRevenue: 0,
    streakDays: 0,
    lastOpenDate: '',
    decorations: [],
    isOpen: false
  }
  
  // 向后兼容
  if (settings.points === undefined) settings.points = 0
  if (settings.totalPoints === undefined) settings.totalPoints = 0
  if (settings.weeklyGoal === undefined) settings.weeklyGoal = 300
  if (settings.monthlyGoal === undefined) settings.monthlyGoal = 1000
  if (settings.defaultDiscount === undefined) settings.defaultDiscount = 10
  
  return settings
}

function saveSettings(settings) {
  childStorage.set(SETTINGS_KEY, settings)
  // 异步同步到云端
  cloud.uploadStallSettings(settings)
}

// Stall operations
function openStall() {
  var settings = getSettings()
  var today = getTodayStr()

  if (settings.lastOpenDate !== today) {
    // Check streak
    var yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)
    var yesterdayStr = yesterday.getFullYear() + '-' + String(yesterday.getMonth() + 1).padStart(2, '0') + '-' + String(yesterday.getDate()).padStart(2, '0')

    if (settings.lastOpenDate === yesterdayStr) {
      settings.streakDays += 1
    } else if (settings.lastOpenDate !== today) {
      settings.streakDays = 1
    }
  }

  settings.isOpen = true
  settings.lastOpenDate = today
  saveSettings(settings)
  
  // 记录营业时间
  recordOpenTime()
  
  return settings
}

function closeStall() {
  var settings = getSettings()
  settings.isOpen = false
  saveSettings(settings)
  
  // 记录关店时间
  recordCloseTime()
  
  return settings
}

// Stats
function getStats() {
  var sales = getSales()
  var products = getProducts()
  var settings = getSettings()

  var totalRevenue = 0
  var totalProfit = 0
  var totalOrders = sales.length
  var totalDiscountAmount = 0
  var discountOrderCount = 0

  // 构建商品当前成本价映射（供无快照的老订单 fallback）
  var productCostMap = {}
  for (var i = 0; i < products.length; i++) {
    productCostMap[products[i].id] = products[i].costPrice || 0
  }

  for (var i = 0; i < sales.length; i++) {
    var sale = sales[i]
    totalRevenue += sale.total || 0
    // 折扣统计
    if (sale.discount && sale.discount < 10) {
      totalDiscountAmount += sale.discountAmount || 0
      discountOrderCount++
    }
    // 使用订单快照成本价计算利润（向后兼容无快照的老订单：fallback 到商品当前成本价）
    var discount = sale.discount || 10
    for (var j = 0; j < sale.items.length; j++) {
      var item = sale.items[j]
      var costPrice = item.costPrice || productCostMap[item.productId] || 0
      var itemRevenue = discount < 10
        ? Math.round((item.subtotal || 0) * discount / 10 * 100) / 100
        : (item.subtotal || 0)
      totalProfit += itemRevenue - costPrice * (item.quantity || 0)
    }
  }

  // Top products（使用折后价）
  var productSales = {}
  for (var i = 0; i < sales.length; i++) {
    var sale = sales[i]
    var discount = sale.discount || 10
    for (var j = 0; j < sale.items.length; j++) {
      var item = sale.items[j]
      if (!productSales[item.productId]) {
        productSales[item.productId] = { name: item.productName, quantity: 0, revenue: 0 }
      }
      productSales[item.productId].quantity += item.quantity
      // 使用折后价计算商品收入
      var itemRevenue = discount < 10 
        ? Math.round(item.subtotal * discount / 10 * 100) / 100
        : item.subtotal
      productSales[item.productId].revenue += itemRevenue
    }
  }

  var topProducts = Object.keys(productSales).map(function(id) {
    return { id: id, name: productSales[id].name, quantity: productSales[id].quantity, revenue: productSales[id].revenue }
  }).sort(function(a, b) { return b.revenue - a.revenue }).slice(0, 5)

  // Today stats
  var today = getTodayStr()
  var todaySales = sales.filter(function(s) { return s.date === today })
  var todayRevenue = todaySales.reduce(function(sum, s) { return sum + (s.total || 0) }, 0)

  return {
    totalRevenue: totalRevenue,
    totalProfit: totalProfit,
    totalOrders: totalOrders,
    topProducts: topProducts,
    todayRevenue: todayRevenue,
    todayOrders: todaySales.length,
    streakDays: settings.streakDays,
    level: settings.level,
    totalDiscountAmount: Math.round(totalDiscountAmount * 100) / 100,
    discountOrderCount: discountOrderCount,
    avgDiscountAmount: discountOrderCount > 0 ? Math.round(totalDiscountAmount / discountOrderCount * 100) / 100 : 0
  }
}

// Level system
function checkLevelUp() {
  var settings = getSettings()
  var totalRevenue = 0
  var products = getProducts()

  for (var i = 0; i < products.length; i++) {
    totalRevenue += products[i].totalRevenue || 0
  }

  var newLevel = 1
  for (var i = LEVELS.length - 1; i >= 0; i--) {
    if (totalRevenue >= LEVELS[i].requirement) {
      newLevel = LEVELS[i].level
      break
    }
  }

  if (newLevel > settings.level) {
    settings.level = newLevel
    settings.totalRevenue = totalRevenue
    saveSettings(settings)
    return { levelUp: true, newLevel: newLevel, levelInfo: LEVELS[newLevel - 1] }
  }

  settings.totalRevenue = totalRevenue
  saveSettings(settings)
  return { levelUp: false }
}

function getLevelInfo() {
  var settings = getSettings()
  return LEVELS[settings.level - 1] || LEVELS[0]
}

function getAllLevels() {
  return LEVELS
}

// Categories
function getCategories() {
  return CATEGORIES
}

module.exports = {
  getProducts: getProducts,
  saveProducts: saveProducts,
  addProduct: addProduct,
  updateProduct: updateProduct,
  removeProduct: removeProduct,
  getProduct: getProduct,
  getSales: getSales,
  saveSales: saveSales,
  addSale: addSale,
  deleteSale: deleteSale,
  getSettings: getSettings,
  saveSettings: saveSettings,
  openStall: openStall,
  closeStall: closeStall,
  getStats: getStats,
  checkLevelUp: checkLevelUp,
  getLevelInfo: getLevelInfo,
  getAllLevels: getAllLevels,
  getCategories: getCategories,
  getTodayStr: getTodayStr,
  syncFromCloud: syncFromCloud,
  DAILY_CHALLENGES: DAILY_CHALLENGES,
  getTodayChallenges: getTodayChallenges,
  checkChallenges: checkChallenges,
  claimChallenge: claimChallenge,
  getTodayBusinessHours: getTodayBusinessHours,
  getBusinessHours: getBusinessHours,
  getBusinessHoursByDate: getBusinessHoursByDate,
  recordOpenTime: recordOpenTime,
  recordCloseTime: recordCloseTime,
  addPoints: addPoints,
  getLowStockProducts: getLowStockProducts,
  setDefaultDiscount: setDefaultDiscount,
  getDefaultDiscount: getDefaultDiscount
}
