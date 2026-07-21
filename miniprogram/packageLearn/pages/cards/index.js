var speak = require('../../../utils/speak.js')
var childStorage = require('../../../utils/child-storage.js')
var cloud = require('../../../utils/cloud.js')
var achievements = require('../../../utils/achievements.js')
var learnData = require('../../utils/learn-data.js')
var learnAIHelper = require('../../utils/learn-ai-helper.js')

// 内置识字卡片数据（120个常用汉字）
var BUILTIN_CARDS = [
  { id: 'c01', word: '人', pinyin: 'rén', meaning: '人类', category: '基础' },
  { id: 'c02', word: '大', pinyin: 'dà', meaning: '大的', category: '基础' },
  { id: 'c03', word: '小', pinyin: 'xiǎo', meaning: '小的', category: '基础' },
  { id: 'c04', word: '上', pinyin: 'shàng', meaning: '上面', category: '基础' },
  { id: 'c05', word: '下', pinyin: 'xià', meaning: '下面', category: '基础' },
  { id: 'c06', word: '天', pinyin: 'tiān', meaning: '天空', category: '基础' },
  { id: 'c07', word: '地', pinyin: 'dì', meaning: '大地', category: '基础' },
  { id: 'c08', word: '日', pinyin: 'rì', meaning: '太阳', category: '基础' },
  { id: 'c09', word: '月', pinyin: 'yuè', meaning: '月亮', category: '基础' },
  { id: 'c10', word: '水', pinyin: 'shuǐ', meaning: '水', category: '基础' },
  { id: 'c11', word: '火', pinyin: 'huǒ', meaning: '火', category: '基础' },
  { id: 'c12', word: '山', pinyin: 'shān', meaning: '山', category: '基础' },
  { id: 'c13', word: '石', pinyin: 'shí', meaning: '石头', category: '基础' },
  { id: 'c14', word: '木', pinyin: 'mù', meaning: '树木', category: '基础' },
  { id: 'c15', word: '花', pinyin: 'huā', meaning: '花朵', category: '植物' },
  { id: 'c16', word: '草', pinyin: 'cǎo', meaning: '小草', category: '植物' },
  { id: 'c17', word: '树', pinyin: 'shù', meaning: '大树', category: '植物' },
  { id: 'c18', word: '鸟', pinyin: 'niǎo', meaning: '小鸟', category: '动物' },
  { id: 'c19', word: '鱼', pinyin: 'yú', meaning: '鱼', category: '动物' },
  { id: 'c20', word: '马', pinyin: 'mǎ', meaning: '马', category: '动物' },
  { id: 'c21', word: '牛', pinyin: 'niú', meaning: '牛', category: '动物' },
  { id: 'c22', word: '羊', pinyin: 'yáng', meaning: '羊', category: '动物' },
  { id: 'c23', word: '猫', pinyin: 'māo', meaning: '猫咪', category: '动物' },
  { id: 'c24', word: '狗', pinyin: 'gǒu', meaning: '小狗', category: '动物' },
  { id: 'c25', word: '爸', pinyin: 'bà', meaning: '爸爸', category: '家人' },
  { id: 'c26', word: '妈', pinyin: 'mā', meaning: '妈妈', category: '家人' },
  { id: 'c27', word: '我', pinyin: 'wǒ', meaning: '我', category: '基础' },
  { id: 'c28', word: '你', pinyin: 'nǐ', meaning: '你', category: '基础' },
  { id: 'c29', word: '好', pinyin: 'hǎo', meaning: '好的', category: '基础' },
  { id: 'c30', word: '吃', pinyin: 'chī', meaning: '吃东西', category: '动作' },
  { id: 'c31', word: '一', pinyin: 'yī', meaning: '数字1', category: '数字' },
  { id: 'c32', word: '二', pinyin: 'èr', meaning: '数字2', category: '数字' },
  { id: 'c33', word: '三', pinyin: 'sān', meaning: '数字3', category: '数字' },
  { id: 'c34', word: '四', pinyin: 'sì', meaning: '数字4', category: '数字' },
  { id: 'c35', word: '五', pinyin: 'wǔ', meaning: '数字5', category: '数字' },
  { id: 'c36', word: '六', pinyin: 'liù', meaning: '数字6', category: '数字' },
  { id: 'c37', word: '七', pinyin: 'qī', meaning: '数字7', category: '数字' },
  { id: 'c38', word: '八', pinyin: 'bā', meaning: '数字8', category: '数字' },
  { id: 'c39', word: '九', pinyin: 'jiǔ', meaning: '数字9', category: '数字' },
  { id: 'c40', word: '十', pinyin: 'shí', meaning: '数字10', category: '数字' },
  { id: 'c41', word: '头', pinyin: 'tóu', meaning: '头', category: '身体' },
  { id: 'c42', word: '手', pinyin: 'shǒu', meaning: '手', category: '身体' },
  { id: 'c43', word: '脚', pinyin: 'jiǎo', meaning: '脚', category: '身体' },
  { id: 'c44', word: '眼', pinyin: 'yǎn', meaning: '眼睛', category: '身体' },
  { id: 'c45', word: '耳', pinyin: 'ěr', meaning: '耳朵', category: '身体' },
  { id: 'c46', word: '口', pinyin: 'kǒu', meaning: '嘴巴', category: '身体' },
  { id: 'c47', word: '鼻', pinyin: 'bí', meaning: '鼻子', category: '身体' },
  { id: 'c48', word: '爷', pinyin: 'yé', meaning: '爷爷', category: '家人' },
  { id: 'c49', word: '奶', pinyin: 'nǎi', meaning: '奶奶', category: '家人' },
  { id: 'c50', word: '哥', pinyin: 'gē', meaning: '哥哥', category: '家人' },
  { id: 'c51', word: '姐', pinyin: 'jiě', meaning: '姐姐', category: '家人' },
  { id: 'c52', word: '弟', pinyin: 'dì', meaning: '弟弟', category: '家人' },
  { id: 'c53', word: '妹', pinyin: 'mèi', meaning: '妹妹', category: '家人' },
  { id: 'c54', word: '鸡', pinyin: 'jī', meaning: '小鸡', category: '动物' },
  { id: 'c55', word: '鸭', pinyin: 'yā', meaning: '鸭子', category: '动物' },
  { id: 'c56', word: '兔', pinyin: 'tù', meaning: '兔子', category: '动物' },
  { id: 'c57', word: '龙', pinyin: 'lóng', meaning: '龙', category: '动物' },
  { id: 'c58', word: '蛇', pinyin: 'shé', meaning: '蛇', category: '动物' },
  { id: 'c59', word: '猪', pinyin: 'zhū', meaning: '猪', category: '动物' },
  { id: 'c60', word: '虫', pinyin: 'chóng', meaning: '虫子', category: '动物' },
  { id: 'c61', word: '苹果', pinyin: 'píng guǒ', meaning: '苹果', category: '水果' },
  { id: 'c62', word: '香蕉', pinyin: 'xiāng jiāo', meaning: '香蕉', category: '水果' },
  { id: 'c63', word: '葡萄', pinyin: 'pú táo', meaning: '葡萄', category: '水果' },
  { id: 'c64', word: '西瓜', pinyin: 'xī guā', meaning: '西瓜', category: '水果' },
  { id: 'c65', word: '草莓', pinyin: 'cǎo méi', meaning: '草莓', category: '水果' },
  { id: 'c66', word: '红', pinyin: 'hóng', meaning: '红色', category: '颜色' },
  { id: 'c67', word: '黄', pinyin: 'huáng', meaning: '黄色', category: '颜色' },
  { id: 'c68', word: '蓝', pinyin: 'lán', meaning: '蓝色', category: '颜色' },
  { id: 'c69', word: '绿', pinyin: 'lǜ', meaning: '绿色', category: '颜色' },
  { id: 'c70', word: '白', pinyin: 'bái', meaning: '白色', category: '颜色' },
  { id: 'c71', word: '黑', pinyin: 'hēi', meaning: '黑色', category: '颜色' },
  { id: 'c72', word: '走', pinyin: 'zǒu', meaning: '走路', category: '动作' },
  { id: 'c73', word: '跑', pinyin: 'pǎo', meaning: '跑步', category: '动作' },
  { id: 'c74', word: '跳', pinyin: 'tiào', meaning: '跳跃', category: '动作' },
  { id: 'c75', word: '飞', pinyin: 'fēi', meaning: '飞翔', category: '动作' },
  { id: 'c76', word: '看', pinyin: 'kàn', meaning: '看见', category: '动作' },
  { id: 'c77', word: '听', pinyin: 'tīng', meaning: '听见', category: '动作' },
  { id: 'c78', word: '说', pinyin: 'shuō', meaning: '说话', category: '动作' },
  { id: 'c79', word: '唱', pinyin: 'chàng', meaning: '唱歌', category: '动作' },
  { id: 'c80', word: '画', pinyin: 'huà', meaning: '画画', category: '动作' },
  { id: 'c81', word: '东', pinyin: 'dōng', meaning: '东方', category: '方位' },
  { id: 'c82', word: '西', pinyin: 'xī', meaning: '西方', category: '方位' },
  { id: 'c83', word: '南', pinyin: 'nán', meaning: '南方', category: '方位' },
  { id: 'c84', word: '北', pinyin: 'běi', meaning: '北方', category: '方位' },
  { id: 'c85', word: '左', pinyin: 'zuǒ', meaning: '左边', category: '方位' },
  { id: 'c86', word: '右', pinyin: 'yòu', meaning: '右边', category: '方位' },
  { id: 'c87', word: '前', pinyin: 'qián', meaning: '前面', category: '方位' },
  { id: 'c88', word: '后', pinyin: 'hòu', meaning: '后面', category: '方位' },
  { id: 'c89', word: '风', pinyin: 'fēng', meaning: '风', category: '自然' },
  { id: 'c90', word: '雨', pinyin: 'yǔ', meaning: '下雨', category: '自然' },
  { id: 'c91', word: '雪', pinyin: 'xuě', meaning: '下雪', category: '自然' },
  { id: 'c92', word: '云', pinyin: 'yún', meaning: '云朵', category: '自然' },
  { id: 'c93', word: '星', pinyin: 'xīng', meaning: '星星', category: '自然' },
  { id: 'c94', word: '光', pinyin: 'guāng', meaning: '光亮', category: '自然' },
  { id: 'c95', word: '衣', pinyin: 'yī', meaning: '衣服', category: '物品' },
  { id: 'c96', word: '裤', pinyin: 'kù', meaning: '裤子', category: '物品' },
  { id: 'c97', word: '鞋', pinyin: 'xié', meaning: '鞋子', category: '物品' },
  { id: 'c98', word: '帽', pinyin: 'mào', meaning: '帽子', category: '物品' },
  { id: 'c99', word: '书', pinyin: 'shū', meaning: '书本', category: '物品' },
  { id: 'c100', word: '笔', pinyin: 'bǐ', meaning: '笔', category: '物品' },
  { id: 'c101', word: '饭', pinyin: 'fàn', meaning: '米饭', category: '食物' },
  { id: 'c102', word: '菜', pinyin: 'cài', meaning: '蔬菜', category: '食物' },
  { id: 'c103', word: '肉', pinyin: 'ròu', meaning: '肉', category: '食物' },
  { id: 'c104', word: '蛋', pinyin: 'dàn', meaning: '鸡蛋', category: '食物' },
  { id: 'c105', word: '奶', pinyin: 'nǎi', meaning: '牛奶', category: '食物' },
  { id: 'c106', word: '快', pinyin: 'kuài', meaning: '快速', category: '形容' },
  { id: 'c107', word: '慢', pinyin: 'màn', meaning: '慢速', category: '形容' },
  { id: 'c108', word: '高', pinyin: 'gāo', meaning: '高大', category: '形容' },
  { id: 'c109', word: '矮', pinyin: 'ǎi', meaning: '矮小', category: '形容' },
  { id: 'c110', word: '长', pinyin: 'cháng', meaning: '长的', category: '形容' },
  { id: 'c111', word: '短', pinyin: 'duǎn', meaning: '短的', category: '形容' },
  { id: 'c112', word: '多', pinyin: 'duō', meaning: '很多', category: '形容' },
  { id: 'c113', word: '少', pinyin: 'shǎo', meaning: '很少', category: '形容' },
  { id: 'c114', word: '热', pinyin: 'rè', meaning: '热的', category: '形容' },
  { id: 'c115', word: '冷', pinyin: 'lěng', meaning: '冷的', category: '形容' },
  { id: 'c116', word: '早', pinyin: 'zǎo', meaning: '早上', category: '时间' },
  { id: 'c117', word: '晚', pinyin: 'wǎn', meaning: '晚上', category: '时间' },
  { id: 'c118', word: '年', pinyin: 'nián', meaning: '年', category: '时间' },
  { id: 'c119', word: '月', pinyin: 'yuè', meaning: '月份', category: '时间' },
  { id: 'c120', word: '天', pinyin: 'tiān', meaning: '一天', category: '时间' }
]

Page({
  data: {
    cards: [],
    currentIndex: 0,
    showPinyin: true,
    learnedCount: 0,
    showAIPanel: false,
    aiQuickQuestions: []
  },

  onLoad: function() {
    this.loadCards()
  },

  loadCards: function() {
    var learnProgress = childStorage.get('learnProgress') || {}
    var cardProgress = learnProgress.cards || {}

    var cards = BUILTIN_CARDS.map(function(card) {
      return {
        id: card.id,
        word: card.word,
        pinyin: card.pinyin,
        meaning: card.meaning,
        category: card.category,
        learned: !!cardProgress[card.id]
      }
    })

    var learnedCount = cards.filter(function(c) { return c.learned }).length

    this.setData({
      cards: cards,
      learnedCount: learnedCount,
      currentIndex: 0
    })
  },

  togglePinyin: function() {
    this.setData({ showPinyin: !this.data.showPinyin })
  },

  prevCard: function() {
    var currentIndex = this.data.currentIndex
    if (currentIndex > 0) {
      this.setData({ currentIndex: currentIndex - 1 })
      this.updateAIPanelIfOpen()
    }
  },

  nextCard: function() {
    var currentIndex = this.data.currentIndex
    var cards = this.data.cards
    if (currentIndex < cards.length - 1) {
      this.setData({ currentIndex: currentIndex + 1 })
      this.updateAIPanelIfOpen()
    }
  },

  openAIPanel: function() {
    var card = this.data.cards[this.data.currentIndex]
    if (!card) return
    this.setData({
      showAIPanel: true,
      aiQuickQuestions: learnAIHelper.getQuickQuestions('cards', card)
    })
  },

  closeAIPanel: function() {
    this.setData({ showAIPanel: false })
  },

  updateAIPanelIfOpen: function() {
    if (this.data.showAIPanel) {
      var card = this.data.cards[this.data.currentIndex]
      if (card) {
        this.setData({
          aiQuickQuestions: learnAIHelper.getQuickQuestions('cards', card)
        })
      }
    }
  },

  markLearned: function() {
    var self = this
    var cards = self.data.cards
    var currentIndex = self.data.currentIndex
    var card = cards[currentIndex]

    var learnProgress = childStorage.get('learnProgress') || {}
    if (!learnProgress.cards) learnProgress.cards = {}

    learnProgress.cards[card.id] = {
      learnedAt: new Date().toISOString(),
      word: card.word
    }

    childStorage.set('learnProgress', learnProgress)
    cloud.uploadLearnProgress(learnProgress).catch(function(err) { console.warn('学习进度同步失败:', err) })

    cards[currentIndex].learned = true
    var learnedCount = cards.filter(function(c) { return c.learned }).length

    self.setData({ cards: cards, learnedCount: learnedCount })

    wx.showToast({ title: '已学会！', icon: 'success' })

    var newAchievements = achievements.checkAchievements()
    if (newAchievements.length > 0) {
      setTimeout(function() {
        wx.showToast({
          title: '🎉 解锁: ' + newAchievements[0].title,
          icon: 'success',
          duration: 2000
        })
      }, 1500)
    }

    if (currentIndex < cards.length - 1) {
      setTimeout(function() {
        self.setData({ currentIndex: currentIndex + 1 })
      }, 500)
    }
  },

  speakWord: function() {
    var card = this.data.cards[this.data.currentIndex]
    if (!card) return
    speak.speak(card.word)
  }
})
