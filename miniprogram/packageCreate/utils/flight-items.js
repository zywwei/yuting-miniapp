/**
 * 飞行棋道具系统
 * 定义道具类型、效果和价格
 */

var ITEMS = {
  remote_dice: {
    id: 'remote_dice',
    name: '遥控骰',
    icon: '🎯',
    desc: '下次指定掷出1~6',
    price: 30,
    effect: 'choose_dice'
  },
  speed_card: {
    id: 'speed_card',
    name: '加速卡',
    icon: '⚡',
    desc: '本回合额外前进3步',
    price: 20,
    effect: 'speed_boost'
  },
  teleport: {
    id: 'teleport',
    name: '传送门',
    icon: '🌀',
    desc: '将一架飞机传送到安全位置',
    price: 50,
    effect: 'teleport'
  },
  shield: {
    id: 'shield',
    name: '护盾',
    icon: '🛡️',
    desc: '免疫一次撞机',
    price: 25,
    effect: 'shield'
  },
  freeze: {
    id: 'freeze',
    name: '冰冻',
    icon: '❄️',
    desc: '冻住一个对手一回合',
    price: 40,
    effect: 'freeze'
  },
  bomb: {
    id: 'bomb',
    name: '炸弹',
    icon: '💣',
    desc: '炸毁目标格上所有敌方飞机',
    price: 60,
    effect: 'bomb'
  }
}

// 道具列表（用于商店显示）
var ITEM_LIST = [
  ITEMS.remote_dice,
  ITEMS.speed_card,
  ITEMS.teleport,
  ITEMS.shield,
  ITEMS.freeze,
  ITEMS.bomb
]

// 获取道具信息
function getItem(itemId) {
  return ITEMS[itemId] || null
}

// 获取道具列表
function getItemList() {
  return ITEM_LIST
}

// 检查是否是主动道具（需要玩家选择使用时机）
function isActiveItem(itemId) {
  return ['remote_dice', 'speed_card', 'teleport', 'freeze', 'bomb'].indexOf(itemId) >= 0
}

// 检查是否是被动道具（自动触发）
function isPassiveItem(itemId) {
  return itemId === 'shield'
}

// 获取随机道具（踩到道具格时）
function getRandomItem() {
  var randomIndex = Math.floor(Math.random() * ITEM_LIST.length)
  return ITEM_LIST[randomIndex].id
}

module.exports = {
  ITEMS: ITEMS,
  ITEM_LIST: ITEM_LIST,
  getItem: getItem,
  getItemList: getItemList,
  isActiveItem: isActiveItem,
  isPassiveItem: isPassiveItem,
  getRandomItem: getRandomItem
}
