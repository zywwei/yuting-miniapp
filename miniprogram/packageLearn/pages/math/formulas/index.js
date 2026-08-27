var listAdapter = require('../../../utils/list-adapter.js')
var modulesData = require('../../../utils/modules-data.js')

Page({
  data: {
    items: [],
    allItems: [],
    categories: [],
    currentCategory: 'all',
    showDetail: false,
    currentFormula: null,
    learnedCount: 0,
    totalCount: 0
  },

  onLoad: function() {
    this.loadData()
  },

  onShow: function() {
    this.loadData()
  },

  loadData: function() {
    // C3：数据源统一收口到 list-adapter（与详情页同源）
    var result = listAdapter.loadList('math-formulas')
    this.setData({
      allItems: result.items,
      categories: this.buildCategories(result.items),
      learnedCount: result.learnedCount,
      totalCount: result.totalCount
    })
    this.refreshItems()
  },

  // P1-12：分类从同源数据动态提取（真实数据为中文分类，原静态英文 key 已失配）
  buildCategories: function(items) {
    var seen = {}
    var categories = []
    items.forEach(function(item) {
      if (item.tag && !seen[item.tag]) {
        seen[item.tag] = true
        categories.push({ id: item.tag, name: item.tag })
      }
    })
    return categories
  },

  switchCategory: function(e) {
    var category = e.currentTarget.dataset.category
    this.setData({ currentCategory: category })
    this.refreshItems()
  },

  // 按当前分类筛选（客户端过滤，保持 list-adapter 单一数据源）
  refreshItems: function() {
    var category = this.data.currentCategory
    var items = category === 'all' ? this.data.allItems : this.data.allItems.filter(function(item) {
      return item.tag === category
    })
    this.setData({ items: items })
  },

  // 弹窗详情：取同源完整数据（variables/examples/tips 等完整字段）
  showFormulaDetail: function(e) {
    var id = e.currentTarget.dataset.id
    var res = modulesData.getItemById('math-formulas', id)
    this.setData({
      showDetail: true,
      currentFormula: res && res.item ? res.item : null
    })
  },

  hideDetail: function() {
    this.setData({ showDetail: false, currentFormula: null })
  },

  markAsLearned: function(e) {
    var formulaId = e.currentTarget.dataset.id
    var learnData = require('../../../utils/learn-data.js')
    learnData.markAsLearned('mathFormulas', formulaId)
    // 刷新弹窗与列表的「已学」状态，并保持当前分类筛选
    var res = modulesData.getItemById('math-formulas', formulaId)
    if (res && res.item) {
      this.setData({ currentFormula: res.item })
    }
    var result = listAdapter.loadList('math-formulas')
    this.setData({ allItems: result.items })
    this.refreshItems()
    wx.showToast({ title: '已学会', icon: 'success' })
  },

  goDetail: function(e) {
    var id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: '/packageLearn/pages/math/formulas/detail/index?id=' + id
    })
  }
})