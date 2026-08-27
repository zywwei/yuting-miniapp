var modulesData = require('../../../../utils/modules-data.js')
var listAdapter = require('../../../../utils/list-adapter.js')
var speak = require('../../../../../utils/speak.js')
var learnAIHelper = require('../../../../utils/learn-ai-helper.js')

Page({
  data: {
    item: null,
    currentIndex: 0,
    totalCount: 0,
    learnedCount: 0,
    showAIPanel: false,
    aiQuickQuestions: []
  },

  onLoad: function(options) {
    this._module = 'chinese-classical'
    this._initId = options.id || ''
    this.loadData()
  },

  onShow: function() {
    this.loadData()
  },

  loadData: function() {
    var result = modulesData.loadModuleData(this._module)
    var items = result.items
    var index = 0

    if (this._initId) {
      for (var i = 0; i < items.length; i++) {
        if (String(items[i].id) === String(this._initId)) { index = i; break }
      }
      this._initId = null
    } else if (this.data.item) {
      index = this.data.currentIndex
    }

    // P1 修复：详情模板字段归一化——异构字段模块（question/topic/name 等）
    // 在此统一适配为模板认识的 title/content/tips[] 等槽位
    this._items = items.map(function (it) { return listAdapter.normalizeDetailItem('chinese-classical', it) })
    this.setData({
      item: this._items[index] || null,
      currentIndex: index,
      totalCount: result.totalCount,
      learnedCount: result.learnedCount
    })
  },

  prevItem: function() {
    var currentIndex = this.data.currentIndex
    if (currentIndex > 0) {
      var newIndex = currentIndex - 1
      this.setData({
        item: this._items[newIndex],
        currentIndex: newIndex
      })
      this.updateAIPanelIfOpen()
    }
  },

  nextItem: function() {
    var currentIndex = this.data.currentIndex
    if (currentIndex < this._items.length - 1) {
      var newIndex = currentIndex + 1
      this.setData({
        item: this._items[newIndex],
        currentIndex: newIndex
      })
      this.updateAIPanelIfOpen()
    }
  },

  markAsLearned: function() {
    var item = this.data.item
    if (!item) return

    modulesData.markAsLearned(this._module, item.id, item.title)
    wx.showToast({ title: '已学会', icon: 'success' })

    this._items[this.data.currentIndex].learned = true
    var learnedCount = 0
    for (var i = 0; i < this._items.length; i++) {
      if (this._items[i].learned) learnedCount++
    }
    this.setData({
      item: this._items[this.data.currentIndex],
      learnedCount: learnedCount
    })
  },

  speakContent: function() {
    var item = this.data.item
    if (!item) return
    var text = item.title + '。' + (item.content || item.formula || item.example || '')
    speak.speak(text)
  },

  openAIPanel: function() {
    var item = this.data.item
    if (!item) return
    this.setData({
      showAIPanel: true,
      aiQuickQuestions: learnAIHelper.getQuickQuestions(this._module, item)
    })
  },

  closeAIPanel: function() {
    this.setData({ showAIPanel: false })
  },

  updateAIPanelIfOpen: function() {
    if (this.data.showAIPanel) {
      var item = this.data.item
      if (item) {
        this.setData({
          aiQuickQuestions: learnAIHelper.getQuickQuestions(this._module, item)
        })
      }
    }
  },

  goBack: function() {
    wx.navigateBack()
  }
})
