var util = require('../../utils/util.js')

Page({
  data: {
    type: 'diary',
    title: '',
    content: '',
    mood: 'happy',
    tags: [],
    tagInput: '',
    types: [
      { value: 'diary', label: '成长日记', icon: '📖' },
      { value: 'funny', label: '今日趣事', icon: '😄' },
      { value: 'learning', label: '学习笔记', icon: '📚' }
    ],
    moods: [
      { value: 'happy', label: '开心', icon: '😊' },
      { value: 'excited', label: '兴奋', icon: '🤩' },
      { value: 'calm', label: '平静', icon: '😌' },
      { value: 'tired', label: '累了', icon: '😴' }
    ]
  },

  // 选择笔记类型
  selectType: function(e) {
    var type = e.currentTarget.dataset.type
    this.setData({ type: type })
  },

  // 输入标题
  onTitleInput: function(e) {
    this.setData({ title: e.detail.value })
  },

  // 输入内容
  onContentInput: function(e) {
    this.setData({ content: e.detail.value })
  },

  // 选择心情
  selectMood: function(e) {
    var mood = e.currentTarget.dataset.mood
    this.setData({ mood: mood })
  },

  // 输入标签
  onTagInput: function(e) {
    this.setData({ tagInput: e.detail.value })
  },

  // 添加标签
  addTag: function() {
    var tagInput = this.data.tagInput
    var tags = this.data.tags
    if (!tagInput.trim()) return
    if (tags.length >= 5) {
      wx.showToast({ title: '最多5个标签', icon: 'none' })
      return
    }
    if (tags.indexOf(tagInput.trim()) !== -1) {
      wx.showToast({ title: '标签已存在', icon: 'none' })
      return
    }
    var newTags = tags.concat([tagInput.trim()])
    this.setData({ tags: newTags, tagInput: '' })
  },

  // 删除标签
  removeTag: function(e) {
    var index = e.currentTarget.dataset.index
    var tags = this.data.tags.slice()
    tags.splice(index, 1)
    this.setData({ tags: tags })
  },

  // 保存笔记
  save: function() {
    var type = this.data.type
    var title = this.data.title
    var content = this.data.content
    var mood = this.data.mood
    var tags = this.data.tags

    if (!title.trim()) {
      wx.showToast({ title: '请输入标题', icon: 'none' })
      return
    }

    var notes = wx.getStorageSync('notes') || []

    var newNote = {
      id: util.generateId(),
      type: type,
      title: title.trim(),
      content: content.trim(),
      mood: mood,
      tags: tags,
      createTime: new Date().toISOString()
    }

    notes.unshift(newNote)
    wx.setStorageSync('notes', notes)

    wx.showToast({ title: '保存成功', icon: 'success' })
    setTimeout(function() { wx.navigateBack() }, 1500)
  }
})
