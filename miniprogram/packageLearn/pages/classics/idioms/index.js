var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    idioms: [
      { id: 'i01', idiom: '守株待兔', pinyin: 'shǒu zhū dài tù', meaning: '比喻不主动努力，而存侥幸心理', story: '宋国有个农夫，看见一只兔子撞在树桩上死了，便放下锄头在树桩旁等待，希望再得到兔子。', example: '学习不能守株待兔，要主动努力。' },
      { id: 'i02', idiom: '画蛇添足', pinyin: 'huà shé tiān zú', meaning: '比喻做多余的事，反而不恰当', story: '楚国有个人祭祀后，让大家比赛画蛇，先画好的人喝酒。一个人先画好了，看别人没画完，就给蛇画脚，结果蛇不像蛇，酒也被别人喝了。', example: '这篇文章已经很好了，不要再画蛇添足了。' }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('classicsIdioms', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  }
})
