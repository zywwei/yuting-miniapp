/**
 * 游戏金币经济系统
 * 统一管理所有游戏模块的金币账户
 */

var childStorage = require('../../utils/child-storage.js')

// 获取金币余额
function getCoins() {
  return childStorage.get('gameCoins') || 0
}

// 增加金币
function addCoins(amount, reason) {
  if (amount <= 0) return getCoins()
  var coins = getCoins() + amount
  childStorage.set('gameCoins', coins)

  // 记录金币变动日志
  logTransaction('add', amount, reason)

  return coins
}

// 消费金币
function spendCoins(amount, reason) {
  var coins = getCoins()
  if (coins < amount) return false
  coins -= amount
  childStorage.set('gameCoins', coins)

  // 记录金币变动日志
  logTransaction('spend', amount, reason)

  return true
}

// 检查是否足够
function canAfford(amount) {
  return getCoins() >= amount
}

// 金币变动日志
function logTransaction(type, amount, reason) {
  var logs = childStorage.get('coinLogs') || []
  logs.unshift({
    type: type,
    amount: amount,
    reason: reason || '',
    time: new Date().toISOString()
  })
  // 只保留最近100条
  if (logs.length > 100) {
    logs = logs.slice(0, 100)
  }
  childStorage.set('coinLogs', logs)
}

// 获取金币变动历史
function getTransactionLogs(limit) {
  var logs = childStorage.get('coinLogs') || []
  return logs.slice(0, limit || 20)
}

// 迁移旧数据（从rpsStory.coins迁移）
function migrateOldCoins() {
  var currentCoins = getCoins()
  if (currentCoins > 0) return // 已有数据，不迁移

  var rpsStory = childStorage.get('rpsStory')
  if (rpsStory && rpsStory.coins > 0) {
    childStorage.set('gameCoins', rpsStory.coins)
    logTransaction('add', rpsStory.coins, '从故事模式迁移')
  }
}

module.exports = {
  getCoins: getCoins,
  addCoins: addCoins,
  spendCoins: spendCoins,
  canAfford: canAfford,
  getTransactionLogs: getTransactionLogs,
  migrateOldCoins: migrateOldCoins
}
