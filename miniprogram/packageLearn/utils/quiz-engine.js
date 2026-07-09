/**
 * 测验引擎
 * 统一管理各模块的测验功能
 */

var learnData = require('./learn-data.js')

/**
 * 生成识字测验题目
 * @param {string} quizType - 测验类型
 * @param {number} count - 题目数量
 */
var generateCardsQuiz = function(quizType, count) {
  var cards = learnData.loadAllCards()
  var questions = []

  for (var i = 0; i < count; i++) {
    var card = cards[Math.floor(Math.random() * cards.length)]
    var question = {}

    switch (quizType) {
      case 'pinyin_to_word':
        question = {
          question: card.pinyin,
          answer: card.word,
          options: generateOptions(cards, card, 'word'),
          explanation: card.word + '的拼音是' + card.pinyin + '，指' + card.meaning
        }
        break
      case 'word_to_pinyin':
        question = {
          question: card.word,
          answer: card.pinyin,
          options: generateOptions(cards, card, 'pinyin'),
          explanation: card.word + '的拼音是' + card.pinyin
        }
        break
      case 'word_to_meaning':
        question = {
          question: card.word,
          answer: card.meaning,
          options: generateOptions(cards, card, 'meaning'),
          explanation: card.word + '的意思是' + card.meaning
        }
        break
      default:
        question = {
          question: card.pinyin,
          answer: card.word,
          options: generateOptions(cards, card, 'word'),
          explanation: card.word + '的拼音是' + card.pinyin
        }
    }

    questions.push(question)
  }

  return questions
}

/**
 * 生成选项
 */
function generateOptions(allCards, correctCard, field) {
  var options = [correctCard[field]]
  var otherCards = allCards.filter(function(c) { return c.id !== correctCard.id })

  while (options.length < 4 && otherCards.length > 0) {
    var randomIndex = Math.floor(Math.random() * otherCards.length)
    var option = otherCards[randomIndex][field]
    if (options.indexOf(option) === -1) {
      options.push(option)
    }
    otherCards.splice(randomIndex, 1)
  }

  // 打乱选项顺序
  return shuffleArray(options)
}

/**
 * 打乱数组
 */
function shuffleArray(array) {
  var newArray = array.slice()
  for (var i = newArray.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1))
    var temp = newArray[i]
    newArray[i] = newArray[j]
    newArray[j] = temp
  }
  return newArray
}

module.exports = {
  generateCardsQuiz: generateCardsQuiz
}
