var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    classics: [
      { id: 'cl01', title: '守株待兔', source: '韩非子', content: '宋人有耕者。田中有株。兔走触株，折颈而死。因释其耒而守株，冀复得兔。兔不可复得，而身为宋国笑。', meaning: '比喻不主动努力，而存万一的侥幸心理，希望得到意外的收获。' },
      { id: 'cl02', title: '刻舟求剑', source: '吕氏春秋', content: '楚人有涉江者，其剑自舟中坠于水。遽契其舟，曰："是吾剑之所从坠。"舟止，从其所契者入水求之。舟已行矣，而剑不行，求剑若此，不亦惑乎？', meaning: '比喻拘泥于成法，不知变通。' },
      { id: 'cl03', title: '亡羊补牢', source: '战国策', content: '亡羊而补牢，未为迟也。', meaning: '比喻出了问题以后想办法补救，免得继续受损失。' }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('chineseClassical', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  }
})
