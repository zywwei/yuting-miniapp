var childStorage = require('./child-storage.js')

var PRODUCTS_KEY = 'stallProducts'
var SALES_KEY = 'stallSales'
var SETTINGS_KEY = 'stallSettings'

var LEVELS = [
  { level: 1, name: '路边摊', requirement: 0, icon: '🏕️' },
  { level: 2, name: '小地摊', requirement: 50, icon: '🎪' },
  { level: 3, name: '小店铺', requirement: 200, icon: '🏪' },
  { level: 4, name: '大商铺', requirement: 500, icon: '🏬' },
  { level: 5, name: '连锁店', requirement: 1000, icon: '🏢' }
]

var CATEGORIES = ['手工', '玩具', '文具', '食物', '饮料', '饰品', '其他']

function generateId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)
}

function getTodayStr() {
  var d = new Date()
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0')
}

function getNowTime() {
  var d = new Date()
  return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0')
}

// Products
function getProducts() {
  return childStorage.get(PRODUCTS_KEY) || []
}

function saveProducts(products) {
  childStorage.set(PRODUCTS_KEY, products)
}

function addProduct(product) {
  var products = getProducts()
  product.id = generateId('prod')
  product.totalSold = 0
  product.totalRevenue = 0
  product.createdAt = new Date().toISOString()
  product.updatedAt = new Date().toISOString()
  products.push(product)
  saveProducts(products)
  return product
}

function updateProduct(id, updates) {
  var products = getProducts()
  for (var i = 0; i < products.length; i++) {
    if (products[i].id === id) {
      Object.assign(products[i], updates, { updatedAt: new Date().toISOString() })
      saveProducts(products)
      return products[i]
    }
  }
  return null
}

function removeProduct(id) {
  var products = getProducts()
  products = products.filter(function(p) { return p.id !== id })
  saveProducts(products)
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

  // Calculate totals and update stock
  sale.total = 0
  for (var i = 0; i < sale.items.length; i++) {
    var item = sale.items[i]
    item.subtotal = item.quantity * item.unitPrice
    sale.total += item.subtotal

    // Update product stock
    for (var j = 0; j < products.length; j++) {
      if (products[j].id === item.productId) {
        products[j].quantity -= item.quantity
        products[j].totalSold += item.quantity
        products[j].totalRevenue += item.subtotal
        break
      }
    }
  }

  sale.change = (sale.paymentReceived || 0) - sale.total

  saveProducts(products)
  sales.push(sale)
  saveSales(sales)

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

  // Restore stock
  for (var i = 0; i < sale.items.length; i++) {
    var item = sale.items[i]
    for (var j = 0; j < products.length; j++) {
      if (products[j].id === item.productId) {
        products[j].quantity += item.quantity
        products[j].totalSold -= item.quantity
        products[j].totalRevenue -= item.subtotal
        break
      }
    }
  }

  saveProducts(products)

  sales = sales.filter(function(s) { return s.id !== id })
  saveSales(sales)

  return true
}

// Settings
function getSettings() {
  return childStorage.get(SETTINGS_KEY) || {
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
}

function saveSettings(settings) {
  childStorage.set(SETTINGS_KEY, settings)
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
  return settings
}

function closeStall() {
  var settings = getSettings()
  settings.isOpen = false
  saveSettings(settings)
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

  for (var i = 0; i < sales.length; i++) {
    totalRevenue += sales[i].total || 0
  }

  // Calculate profit
  for (var i = 0; i < products.length; i++) {
    var p = products[i]
    totalProfit += (p.totalRevenue || 0) - ((p.costPrice || 0) * (p.totalSold || 0))
  }

  // Top products
  var productSales = {}
  for (var i = 0; i < sales.length; i++) {
    var sale = sales[i]
    for (var j = 0; j < sale.items.length; j++) {
      var item = sale.items[j]
      if (!productSales[item.productId]) {
        productSales[item.productId] = { name: item.productName, quantity: 0, revenue: 0 }
      }
      productSales[item.productId].quantity += item.quantity
      productSales[item.productId].revenue += item.subtotal
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
    level: settings.level
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

// Change calculator
function calculateChange(total, received) {
  return received - total
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
  calculateChange: calculateChange,
  getCategories: getCategories,
  getTodayStr: getTodayStr
}
