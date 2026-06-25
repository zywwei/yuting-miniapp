var util = require('../../../utils/util.js')
var childStorage = require('../../../utils/child-storage.js')
var cloud = require('../../../utils/cloud.js')

Page({
  data: {
    name: '',
    icon: '⭐',
    target: 1,
    icons: ['⭐', '🌟', '💪', '🎯', '🏊', '🚴', '🎹', '🧩', '🧹', '🍎', '💧', '🌻']
  },

  // 输入习惯名称
  onNameInput: function(e) {
    this.setData({ name: e.detail.value })
  },

  // 选择图标
  selectIcon: function(e) {
    var icon = e.currentTarget.dataset.icon
    this.setData({ icon: icon })
  },

  // 设置目标次数
  setTarget: function(e) {
    var target = parseInt(e.currentTarget.dataset.target)
    this.setData({ target: target })
  },

  // 保存习惯
  save: function() {
    var name = this.data.name
    var icon = this.data.icon
    var target = this.data.target

    if (!name.trim()) {
      wx.showToast({ title: '请输入习惯名称', icon: 'none' })
      return
    }

    var habits = childStorage.get('habits') || []

    var newHabit = {
      id: util.generateId(),
      type: 'custom',
      name: name.trim(),
      icon: icon,
      color: '#FF6B8A',
      target: target,
      createTime: new Date().toISOString()
    }

    habits.push(newHabit)
    childStorage.set('habits', habits)

    // 同步云端
    cloud.uploadHabits(habits).catch(function() {})

    wx.showToast({ title: '添加成功', icon: 'success' })
    setTimeout(function() { wx.navigateBack() }, 1500)
  }
})
