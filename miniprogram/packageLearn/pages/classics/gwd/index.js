var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    articles: [
      { id: 'g01', title: '郑伯克段于鄢', source: '左传', content: '初，郑武公娶于申，曰武姜。生庄公及共叔段。', meaning: '当初，郑武公从申国娶了妻子，名叫武姜。她生了庄公和共叔段。' },
      { id: 'g02', title: '曹刿论战', source: '左传', content: '十年春，齐师伐我。公将战，曹刿请见。', meaning: '鲁庄公十年的春天，齐国军队攻打鲁国。庄公准备应战，曹刿请求进见。' }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('classicsGwd', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  }
})
