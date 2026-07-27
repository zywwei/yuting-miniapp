var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    articles: [],
    currentArticle: null,
    showArticle: false
  },

  onLoad: function() {
    this.loadArticles()
  },

  loadArticles: function() {
    var articles = [
      { id: 'r01', title: '小蝌蚪找妈妈', type: 'narrative', grade: '3', content: '池塘里有一群小蝌蚪，大大的脑袋，黑灰色的身子，甩着长长的尾巴，快活地游来游去。\n\n小蝌蚪游哇游，过了几天，长出了两条后腿。他们看见鲤鱼妈妈在教小鲤鱼捕食，就迎上去，问："鲤鱼阿姨，我们的妈妈在哪里？"鲤鱼妈妈说："你们的妈妈四条腿，宽嘴巴。你们到那边去找吧！"', questions: ['小蝌蚪长什么样子？', '小蝌蚪的妈妈有什么特征？'] },
      { id: 'r02', title: '我是什么', type: 'expository', grade: '3', content: '我会变。太阳一晒，我就变成汽。升到天空，我又变成无数极小极小的点儿，连成一片，在空中飘浮。有时候我穿着白衣服，有时候我穿着黑衣服，早晨和傍晚我又把红袍披在身上。人们叫我云。\n\n我在空中飘浮着，碰到冷风，就变成水珠落下来。人们就叫我雨。有时候我变成小硬球打下来，人们就叫我雹子。到了冬天，我变成小花朵飘下来，人们又叫我雪。', questions: ['云是怎么形成的？', '文中的"我"指的是什么？'] },
      { id: 'r03', title: '植物妈妈有办法', type: 'narrative', grade: '3', content: '孩子如果已经长大，就得告别妈妈，四海为家。牛马有脚，鸟有翅膀，植物旅行又用什么办法？\n\n蒲公英妈妈准备了降落伞，把它送给自己的娃娃。只要有风轻轻吹过，孩子们就乘着风纷纷出发。', questions: ['蒲公英靠什么传播种子？', '这首诗告诉了我们什么？'] }
    ]
    this.setData({ articles: articles })
  },

  showArticleDetail: function(e) {
    var article = e.currentTarget.dataset.article
    this.setData({
      currentArticle: article,
      showArticle: true
    })
  },

  hideArticle: function() {
    this.setData({ showArticle: false })
  },

  markAsCompleted: function(e) {
    var articleId = e.currentTarget.dataset.id
    learnData.markAsLearned('chineseReading', articleId)
    wx.showToast({ title: '已完成', icon: 'success' })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/chinese/reading/detail/index?id=' + id
    })
  }
})
