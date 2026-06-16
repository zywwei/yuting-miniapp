var templateList = require('../../../utils/templates.js').templateList

Page({
  data: {
    currentCategory: 'all',
    categories: [
      { id: 'all', name: '全部', icon: '🌟' },
      { id: 'animal', name: '动物', icon: '🐰' },
      { id: 'plant', name: '植物', icon: '🌸' },
      { id: 'vehicle', name: '交通工具', icon: '🚗' },
      { id: 'food', name: '食物', icon: '🍰' },
      { id: 'cartoon', name: '卡通', icon: '🧸' }
    ],
    templates: [],
    filteredTemplates: []
  },

  onLoad: function() {
    this.setData({ templates: templateList })
    this.filterTemplates()
  },

  // 切换分类
  switchCategory: function(e) {
    var id = e.currentTarget.dataset.id
    this.setData({ currentCategory: id })
    this.filterTemplates()
  },

  // 过滤模板
  filterTemplates: function() {
    var category = this.data.currentCategory
    var filtered = category === 'all'
      ? this.data.templates
      : this.data.templates.filter(function(t) { return t.category === category })

    this.setData({ filteredTemplates: filtered })
  },

  // 选择模板
  selectTemplate: function(e) {
    var template = e.currentTarget.dataset.template
    wx.navigateTo({
      url: '/pages/create/draw/draw?mode=template&templateId=' + template.id + '&name=' + template.name
    })
  }
})
