const { templateList } = require('../../utils/templates.js')

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

  onLoad() {
    // 使用模板数据
    this.setData({ templates: templateList })
    this.filterTemplates()
  },

  // 切换分类
  switchCategory(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ currentCategory: id })
    this.filterTemplates()
  },

  // 过滤模板
  filterTemplates() {
    const category = this.data.currentCategory
    const filtered = category === 'all'
      ? this.data.templates
      : this.data.templates.filter(t => t.category === category)

    this.setData({ filteredTemplates: filtered })
  },

  // 选择模板
  selectTemplate(e) {
    const template = e.currentTarget.dataset.template
    wx.navigateTo({
      url: `/pages/draw/draw?mode=template&templateId=${template.id}&name=${template.name}`
    })
  }
})
