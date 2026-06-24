/**
 * 剪刀石头布业务逻辑管理器
 */

var childStorage = require('./child-storage.js')
var gameCloud = require('./game-cloud.js')

// 选择定义
var CHOICES = ['rock', 'paper', 'scissors']
var CHOICE_ICONS = {
  rock: '✊',
  paper: '✋',
  scissors: '✌️'
}
var CHOICE_NAMES = {
  rock: '石头',
  paper: '布',
  scissors: '剪刀'
}

// 故事章节定义
var STORY_CHAPTERS = [
  {
    id: 1,
    name: '森林入口',
    enemy: '小蘑菇怪',
    enemyIcon: '🍄',
    difficulty: 'simple',
    winsRequired: 2,
    reward: { coins: 10, exp: 5 },
    story: '你踏入了神秘的森林，一只小蘑菇怪挡住了去路...'
  },
  {
    id: 2,
    name: '迷雾小径',
    enemy: '幽灵',
    enemyIcon: '👻',
    difficulty: 'simple',
    winsRequired: 2,
    reward: { coins: 15, exp: 8 },
    story: '迷雾中传来诡异的声音，一个幽灵出现了...'
  },
  {
    id: 3,
    name: '河流渡口',
    enemy: '螃蟹将军',
    enemyIcon: '🦀',
    difficulty: 'medium',
    winsRequired: 2,
    reward: { coins: 20, exp: 12 },
    story: '河流边，一只巨大的螃蟹挡住了去路...'
  },
  {
    id: 4,
    name: '山洞深处',
    enemy: '蝙蝠王',
    enemyIcon: '🦇',
    difficulty: 'medium',
    winsRequired: 3,
    reward: { coins: 25, exp: 15 },
    story: '黑暗的山洞中，无数蝙蝠飞舞...'
  },
  {
    id: 5,
    name: '火山脚下',
    enemy: '火焰精灵',
    enemyIcon: '🔥',
    difficulty: 'hard',
    winsRequired: 3,
    reward: { coins: 30, exp: 20 },
    story: '滚烫的岩浆旁，火焰精灵正在等待挑战者...'
  },
  {
    id: 6,
    name: '云端城堡',
    enemy: '雷电鸟',
    enemyIcon: '⚡',
    difficulty: 'hard',
    winsRequired: 3,
    reward: { coins: 40, exp: 25 },
    story: '穿过云层，一座神秘的城堡出现在眼前...'
  },
  {
    id: 7,
    name: '最终决战',
    enemy: '大魔王',
    enemyIcon: '👹',
    difficulty: 'hard',
    winsRequired: 4,
    reward: { coins: 100, exp: 50 },
    story: '大魔王现身！这是最后的战斗...'
  }
]

// 道具定义
var STORY_ITEMS = [
  { id: 'shield', name: '护盾', icon: '🛡️', desc: '失败时不扣生命（限1次）', price: 30 },
  { id: 'lucky_charm', name: '幸运符', icon: '🍀', desc: 'AI下一局出随机拳', price: 20 },
  { id: 'spy_glass', name: '透视镜', icon: '🔍', desc: '查看AI下一局出拳', price: 25 },
  { id: 'skip', name: '跳过卡', icon: '⏭️', desc: '跳过一局（算平局）', price: 15 }
]

// 获取道具列表
function getStoryItems() {
  return STORY_ITEMS
}

// 购买道具
function buyItem(itemId) {
  var gameEconomy = require('./game-economy.js')
  var item = null
  for (var i = 0; i < STORY_ITEMS.length; i++) {
    if (STORY_ITEMS[i].id === itemId) {
      item = STORY_ITEMS[i]
      break
    }
  }
  if (!item) return { success: false, msg: '道具不存在' }
  if (!gameEconomy.canAfford(item.price)) return { success: false, msg: '金币不足' }

  gameEconomy.spendCoins(item.price, '购买道具：' + item.name)

  // 添加到玩家道具列表
  var progress = getStoryProgress()
  if (!progress.items) progress.items = []
  progress.items.push(itemId)
  saveStoryProgress(progress)

  return { success: true, msg: '购买成功' }
}

// 使用道具
function useItem(itemId, progress) {
  if (!progress.items) progress.items = []
  var index = progress.items.indexOf(itemId)
  if (index < 0) return false

  progress.items.splice(index, 1)
  saveStoryProgress(progress)
  return true
}

// 获取玩家拥有的道具
function getPlayerItems() {
  var progress = getStoryProgress()
  var items = progress.items || []
  var result = {}
  items.forEach(function(id) {
    result[id] = (result[id] || 0) + 1
  })
  return result
}

// 获取克制拳
function getCounter(choice) {
  var counters = {
    rock: 'paper',
    paper: 'scissors',
    scissors: 'rock'
  }
  return counters[choice]
}

// 判定胜负
function judge(player1, player2) {
  if (player1 === player2) return 'draw'
  if (
    (player1 === 'rock' && player2 === 'scissors') ||
    (player1 === 'scissors' && player2 === 'paper') ||
    (player1 === 'paper' && player2 === 'rock')
  ) {
    return 'win'
  }
  return 'lose'
}

// AI策略
var AI_STRATEGIES = {
  // 简单：纯随机
  simple: function() {
    return CHOICES[Math.floor(Math.random() * 3)]
  },

  // 中等：频率统计
  medium: function(history) {
    if (!history || history.length < 3) return AI_STRATEGIES.simple()

    var recent = history.slice(-3)
    var freq = { rock: 0, paper: 0, scissors: 0 }
    recent.forEach(function(h) { freq[h.player1]++ })

    var maxChoice = 'rock'
    var maxFreq = 0
    for (var choice in freq) {
      if (freq[choice] > maxFreq) {
        maxFreq = freq[choice]
        maxChoice = choice
      }
    }

    if (Math.random() < 0.4) {
      return getCounter(maxChoice)
    }
    return AI_STRATEGIES.simple()
  },

  // 困难：马尔可夫链
  hard: function(history) {
    if (!history || history.length < 5) return AI_STRATEGIES.medium(history)

    var transitions = {
      rock: { rock: 0, paper: 0, scissors: 0 },
      paper: { rock: 0, paper: 0, scissors: 0 },
      scissors: { rock: 0, paper: 0, scissors: 0 }
    }

    for (var i = 1; i < history.length; i++) {
      var prev = history[i - 1].player1
      var curr = history[i].player1
      transitions[prev][curr]++
    }

    var lastChoice = history[history.length - 1].player1
    var probs = transitions[lastChoice]
    var total = probs.rock + probs.paper + probs.scissors

    if (total === 0) return AI_STRATEGIES.simple()

    var rand = Math.random() * total
    var predicted = 'rock'
    if (rand < probs.rock) predicted = 'rock'
    else if (rand < probs.rock + probs.paper) predicted = 'paper'
    else predicted = 'scissors'

    if (Math.random() < 0.55) {
      return getCounter(predicted)
    }
    return AI_STRATEGIES.simple()
  },

  // 大师：更高概率克制
  master: function(history) {
    if (!history || history.length < 3) return AI_STRATEGIES.hard(history)

    var recent = history.slice(-5)
    var freq = { rock: 0, paper: 0, scissors: 0 }
    recent.forEach(function(h) { freq[h.player1]++ })

    var maxChoice = 'rock'
    var maxFreq = 0
    for (var choice in freq) {
      if (freq[choice] > maxFreq) {
        maxFreq = freq[choice]
        maxChoice = choice
      }
    }

    if (Math.random() < 0.6) {
      return getCounter(maxChoice)
    }
    return AI_STRATEGIES.simple()
  }
}

// AI出拳
function aiChoice(difficulty, history) {
  var strategy = AI_STRATEGIES[difficulty] || AI_STRATEGIES.simple
  return strategy(history)
}

// 生成游戏记录ID
function generateId() {
  return 'rps_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

// 保存游戏记录
function saveGameRecord(record) {
  record.id = record.id || generateId()
  record.createTime = record.createTime || new Date().toISOString()

  // 更新本地统计
  gameCloud.updateLocalStats('rps', record)

  // 上传云端
  gameCloud.uploadGameRecord(record)

  return record
}

// 获取故事进度
function getStoryProgress() {
  return childStorage.get('rpsStory') || {
    currentChapter: 1,
    storyRound: 1,
    defeatedEnemies: [],
    coins: 0,
    items: [],
    totalEnemiesDefeated: 0
  }
}

// 保存故事进度
function saveStoryProgress(progress) {
  childStorage.set('rpsStory', progress)
}

// 获取闯关进度
function getChallengeProgress() {
  return childStorage.get('rpsChallenge') || {
    currentLevel: 1,
    lives: 3,
    bestLevel: 1,
    totalStars: 0,
    totalAttempts: 0,
    completedLevels: []
  }
}

// 保存闯关进度
function saveChallengeProgress(progress) {
  childStorage.set('rpsChallenge', progress)
}

// 获取锦标赛记录
function getTournamentRecord() {
  return childStorage.get('rpsTournament') || {
    wins: 0,
    totalPlayed: 0
  }
}

// 保存锦标赛记录
function saveTournamentRecord(record) {
  childStorage.set('rpsTournament', record)
}

module.exports = {
  CHOICES: CHOICES,
  CHOICE_ICONS: CHOICE_ICONS,
  CHOICE_NAMES: CHOICE_NAMES,
  STORY_CHAPTERS: STORY_CHAPTERS,
  STORY_ITEMS: STORY_ITEMS,
  AI_STRATEGIES: AI_STRATEGIES,
  getCounter: getCounter,
  judge: judge,
  aiChoice: aiChoice,
  generateId: generateId,
  saveGameRecord: saveGameRecord,
  getStoryProgress: getStoryProgress,
  saveStoryProgress: saveStoryProgress,
  getChallengeProgress: getChallengeProgress,
  saveChallengeProgress: saveChallengeProgress,
  getTournamentRecord: getTournamentRecord,
  saveTournamentRecord: saveTournamentRecord,
  getStoryItems: getStoryItems,
  buyItem: buyItem,
  useItem: useItem,
  getPlayerItems: getPlayerItems
}
