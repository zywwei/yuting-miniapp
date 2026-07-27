var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    topics: [
      { id: 'b01', title: '植物的光合作用', category: 'plant', content: '绿色植物利用阳光、水和二氧化碳制造有机物并释放氧气的过程叫做光合作用。', examples: ['树木生长', '蔬菜种植'] },
      { id: 'b02', title: '动物的分类', category: 'animal', content: '动物可分为脊椎动物和无脊椎动物。脊椎动物包括鱼类、两栖类、爬行类、鸟类和哺乳类。', examples: ['鱼', '青蛙', '蛇', '鸟', '猫'] },
      { id: 'b03', title: '人体消化系统', category: 'human', content: '消化系统包括口腔、食道、胃、小肠、大肠等器官，负责消化食物和吸收营养。', examples: ['咀嚼食物', '胃消化蛋白质'] }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('scienceBiology', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/science/biology/detail/index?id=' + id
    })
  }
})
