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

// ---------- 通用测验 API（cards/poems/english 三类测验页与 quiz-card 组件共用） ----------

// 按模块取数据源
function loadSourceByModule(module) {
  if (module === 'poems') return learnData.loadPoemsData()
  if (module === 'english') return learnData.loadAllEnglish()
  return learnData.loadAllCards()
}

// 单题生成：按模块分派字段
// 注意：poems/english 当前内置题为空数组（learn-data getBuiltinPoems/getBuiltinEnglish），
// 后续填充数据时若字段名与此处不一致需同步调整。
function buildQuestion(source, card, module, quizType) {
  var question = {}
  if (module === 'poems') {
    if (quizType === 'author_to_dynasty') {
      question = {
        question: card.author,
        answer: card.dynasty,
        options: generateOptionsByField(source, card, 'dynasty'),
        explanation: card.title + '的作者是' + card.author + '（' + card.dynasty + '）'
      }
    } else { // title_to_author
      question = {
        question: card.title,
        answer: card.author,
        options: generateOptionsByField(source, card, 'author'),
        explanation: '《' + card.title + '》的作者是' + card.author
      }
    }
    return question
  }

  // cards 与 english 共用 word/meaning 类字段；cards 另有 pinyin
  var fieldMap = {
    pinyin_to_word: { ask: 'pinyin', pick: 'word' },
    word_to_pinyin: { ask: 'word', pick: 'pinyin' },
    word_to_meaning: { ask: 'word', pick: 'meaning' },
    meaning_to_word: { ask: 'meaning', pick: 'word' }
  }
  var f = fieldMap[quizType] || { ask: 'pinyin', pick: 'word' }
  question = {
    question: card[f.ask],
    answer: card[f.pick],
    options: generateOptionsByField(source, card, f.pick),
    explanation: card.word ? (card.word + '：' + (card.pinyin || '') + '，' + (card.meaning || '')) : ''
  }
  return question
}

// 生成干扰项（通用版：按任意字段取同模块其他条目）
function generateOptionsByField(source, correctCard, field) {
  var options = [correctCard[field]]
  var pool = source.filter(function(c) { return c !== correctCard && c[field] && options.indexOf(c[field]) === -1 })
  while (options.length < 4 && pool.length > 0) {
    var idx = Math.floor(Math.random() * pool.length)
    options.push(pool[idx][field])
    pool.splice(idx, 1)
  }
  return shuffleArray(options)
}

function createQuiz(module, quizType, count) {
  var source = loadSourceByModule(module) || []
  // 题库不足以出选择题（少于 4 条无法凑齐选项）时返回空卷，页面按无题处理，不再抛错
  var usable = source.length >= 4 ? source : []
  var questions = []
  for (var i = 0; i < count && usable.length > 0; i++) {
    var card = usable[Math.floor(Math.random() * usable.length)]
    questions.push(buildQuestion(usable, card, module, quizType))
  }
  return { module: module, quizType: quizType, questions: questions, currentIndex: 0, correctCount: 0, startedAt: Date.now() }
}

function submitAnswer(quiz, selectedOption) {
  var q = quiz && quiz.questions && quiz.questions[quiz.currentIndex]
  if (!q) return { isCorrect: false, answer: '' }
  var isCorrect = q.options[selectedOption] === q.answer
  if (isCorrect) quiz.correctCount++
  return { isCorrect: isCorrect, answer: q.answer }
}

function nextQuestion(quiz) {
  if (!quiz || !quiz.questions || quiz.currentIndex + 1 >= quiz.questions.length) return false
  quiz.currentIndex++
  return true
}

function getQuizResult(quiz) {
  var total = (quiz && quiz.questions && quiz.questions.length) || 0
  var correct = (quiz && quiz.correctCount) || 0
  var percentage = total ? Math.round(correct / total * 100) : 0
  // 结算页展示字段（quiz-card.wxml / 各 quiz 页 wxml 绑定 grade.text/grade.color、percentage、duration）
  var grade = percentage >= 90 ? { text: '太棒了', color: '#52c41a' }
    : percentage >= 70 ? { text: '很不错', color: '#1890ff' }
    : percentage >= 50 ? { text: '继续加油', color: '#faad14' }
    : { text: '再试一次', color: '#ff7875' }
  var duration = (quiz && quiz.startedAt) ? Math.max(1, Math.round((Date.now() - quiz.startedAt) / 1000)) : 0
  return {
    total: total,
    correct: correct,
    accuracy: percentage,
    percentage: percentage,
    grade: grade,
    duration: duration
  }
}

module.exports = {
  generateCardsQuiz: generateCardsQuiz,
  createQuiz: createQuiz,
  submitAnswer: submitAnswer,
  nextQuestion: nextQuestion,
  getQuizResult: getQuizResult
}
