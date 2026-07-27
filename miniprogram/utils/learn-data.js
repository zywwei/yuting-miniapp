/**
 * 学习数据管理工具
 * 统一管理学习内容和进度
 */

var childStorage = require('./child-storage.js')
var cardsData = require('./cards-data.js')
var numbersData = require('./numbers-data.js')
var englishData = require('./english-data.js')
var poemsData = require('./poems-data.js')

// ===== 进度管理 =====
var getProgress = function() {
  var learnProgress = childStorage.get('learnProgress') || {}
  return {
    cards: learnProgress.cards || {},
    poems: learnProgress.poems || {},
    numbers: learnProgress.numbers || {},
    english: learnProgress.english || {},
    classicsGwd: learnProgress.classicsGwd || {},
    classicsPoetryRules: learnProgress.classicsPoetryRules || {},
    classicsIdioms: learnProgress.classicsIdioms || {},
    classicsConfucius: learnProgress.classicsConfucius || {}
  }
}

var getCardsLearnedCount = function() {
  return Object.keys(getProgress().cards).length
}

var getPoemsMemorizedCount = function() {
  return Object.keys(getProgress().poems).length
}

var getNumbersLearnedCount = function() {
  return Object.keys(getProgress().numbers).length
}

var getEnglishLearnedCount = function() {
  return Object.keys(getProgress().english).length
}

var getClassicsGwdLearnedCount = function() {
  return Object.keys(getProgress().classicsGwd).length
}

var getClassicsPoetryRulesLearnedCount = function() {
  return Object.keys(getProgress().classicsPoetryRules).length
}

var getClassicsIdiomsLearnedCount = function() {
  return Object.keys(getProgress().classicsIdioms).length
}

var getClassicsConfuciusLearnedCount = function() {
  return Object.keys(getProgress().classicsConfucius).length
}

// 获取推荐内容（基于学习进度）
var getRecommendations = function() {
  var recommendations = []
  var progress = getProgress()

  // 未学的识字卡片（用新字表，取最简单的未学字，与识字主页定位一致）
  var cardsResult = cardsData.loadCards()
  var unlearnedCards = cardsResult.cards.filter(function(c) { return !c.learned })
  if (unlearnedCards.length > 0) {
    var card = unlearnedCards[0]
    recommendations.push({
      type: 'learn',
      icon: '🔤',
      text: '学一个汉字: ' + card.word + ' (' + card.meaning + ')',
      target: '/packageLearn/pages/cards/index?id=' + card.id
    })
  }

  // 未背的古诗（用新数据层，取第一首未背，与古诗主页定位一致）
  var poemsResult = poemsData.loadPoems()
  var unmemorizedPoems = poemsResult.poems.filter(function(p) { return !p.memorized })
  if (unmemorizedPoems.length > 0) {
    var poem = unmemorizedPoems[0]
    recommendations.push({
      type: 'learn',
      icon: '📜',
      text: '学一首古诗《' + poem.title + '》',
      target: '/packageLearn/pages/poems/index?id=' + poem.id
    })
  }

  // 数字学习（用新数据层，取第一个未学，与数字主页定位一致）
  var numbersResult = numbersData.loadNumbers()
  var unlearnedNumbers = numbersResult.numbers.filter(function(n) { return !n.learned })
  if (unlearnedNumbers.length > 0) {
    var num = unlearnedNumbers[0]
    recommendations.push({
      type: 'learn',
      icon: '🔢',
      text: '学数字: ' + num.number + ' (' + num.chinese + ')',
      target: '/packageLearn/pages/numbers/index?id=' + num.number
    })
  }

  // 英语学习（用新数据层，优先推荐未学字母，其次推荐未学单词）
  var lettersResult = englishData.loadLetters()
  var unlearnedLetters = lettersResult.letters.filter(function(l) { return !l.learned })
  if (unlearnedLetters.length > 0) {
    var letter = unlearnedLetters[0]
    recommendations.push({
      type: 'learn',
      icon: '🔤',
      text: '学字母: ' + letter.letter + ' (' + letter.word + ')',
      target: '/packageLearn/pages/english/index?mode=letters&id=' + letter.id
    })
  } else {
    var wordsResult = englishData.loadWords()
    var unlearnedWords = wordsResult.words.filter(function(w) { return !w.learned })
    if (unlearnedWords.length > 0) {
      var w = unlearnedWords[0]
      recommendations.push({
        type: 'learn',
        icon: '🔤',
        text: '学单词: ' + w.word + ' (' + w.meaning + ')',
        target: '/packageLearn/pages/english/index?mode=words&id=' + w.id
      })
    }
  }

  // 创作推荐
  var drawings = childStorage.get('drawings') || []
  if (drawings.length < 10) {
    recommendations.push({
      type: 'create',
      icon: '🎨',
      text: '画一幅画',
      target: '/packageCreate/pages/create/draw/draw?mode=free'
    })
  }

  // 笔记推荐
  var notes = childStorage.get('notes') || []
  if (notes.length < 5) {
    recommendations.push({
      type: 'notes',
      icon: '📝',
      text: '记录今天的成长故事',
      target: '/pages/notes/add'
    })
  }

  return recommendations.slice(0, 3)
}

module.exports = {
  getProgress: getProgress,
  getCardsLearnedCount: getCardsLearnedCount,
  getPoemsMemorizedCount: getPoemsMemorizedCount,
  getNumbersLearnedCount: getNumbersLearnedCount,
  getEnglishLearnedCount: getEnglishLearnedCount,
  getClassicsGwdLearnedCount: getClassicsGwdLearnedCount,
  getClassicsPoetryRulesLearnedCount: getClassicsPoetryRulesLearnedCount,
  getClassicsIdiomsLearnedCount: getClassicsIdiomsLearnedCount,
  getClassicsConfuciusLearnedCount: getClassicsConfuciusLearnedCount,
  getRecommendations: getRecommendations
}
