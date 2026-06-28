var bookManager = require('../../../../utils/book-manager.js')
var auth = getApp().globalData.auth

Page({
  data: {
    bookId: '',
    book: null,
    familyMembers: [],
    showAddMember: false,
    selectedMember: null,
    selectedRole: 'writer'
  },

  onLoad: function(options) {
    this.setData({ bookId: options.bookId })
    this.loadData()
  },

  onShow: function() {
    this.loadData()
  },

  loadData: function() {
    var book = bookManager.getBook(this.data.bookId)
    if (!book) {
      wx.showToast({ title: '账本不存在', icon: 'none' })
      setTimeout(function() {
        wx.navigateBack()
      }, 1500)
      return
    }
    var familyMembers = this.getFamilyMembers()
    this.setData({ book: book, familyMembers: familyMembers })
  },

  getFamilyMembers: function() {
    var app = getApp()
    var families = app.globalData.myFamilies || []
    var currentFamilyId = auth.getCurrentFamilyId()
    for (var i = 0; i < families.length; i++) {
      if (families[i].familyId === currentFamilyId) {
        return families[i].members || []
      }
    }
    return []
  },

  toggleShareMode: function() {
    var newMode = this.data.book.sharedMode === 'private' ? 'shared' : 'private'
    bookManager.updateBook(this.data.bookId, { sharedMode: newMode })
    this.loadData()
    wx.showToast({ title: newMode === 'shared' ? '已开启共享' : '已关闭共享', icon: 'success' })
  },

  showAddMemberDialog: function() {
    this.setData({ showAddMember: true, selectedMember: null, selectedRole: 'writer' })
  },

  hideAddMemberDialog: function() {
    this.setData({ showAddMember: false })
  },

  selectMember: function(e) {
    this.setData({ selectedMember: e.currentTarget.dataset.id })
  },

  selectRole: function(e) {
    this.setData({ selectedRole: e.currentTarget.dataset.role })
  },

  confirmAddMember: function() {
    if (!this.data.selectedMember) {
      wx.showToast({ title: '请选择成员', icon: 'none' })
      return
    }
    var member = null
    for (var i = 0; i < this.data.familyMembers.length; i++) {
      if (this.data.familyMembers[i]._id === this.data.selectedMember) {
        member = this.data.familyMembers[i]
        break
      }
    }
    bookManager.addMember(this.data.bookId, this.data.selectedMember, this.data.selectedRole, member ? member.name : '')
    this.setData({ showAddMember: false })
    this.loadData()
    wx.showToast({ title: '已添加', icon: 'success' })
  },

  removeMember: function(e) {
    var memberId = e.currentTarget.dataset.id
    var self = this
    wx.showModal({
      title: '确认移除',
      content: '确定要移除该成员吗？',
      success: function(res) {
        if (res.confirm) {
          bookManager.removeMember(self.data.bookId, memberId)
          self.loadData()
          wx.showToast({ title: '已移除', icon: 'success' })
        }
      }
    })
  },

  changeRole: function(e) {
    var memberId = e.currentTarget.dataset.id
    var currentRole = e.currentTarget.dataset.role
    var roles = ['admin', 'writer', 'viewer']
    var roleNames = ['管理员', '记账员', '查看者']
    var currentIndex = roles.indexOf(currentRole)
    var nextIndex = (currentIndex + 1) % roles.length
    bookManager.updateMemberRole(this.data.bookId, memberId, roles[nextIndex])
    this.loadData()
    wx.showToast({ title: '已更改为' + roleNames[nextIndex], icon: 'success' })
  },

  getRoleName: function(role) {
    if (role === 'admin') return '管理员'
    if (role === 'writer') return '记账员'
    if (role === 'viewer') return '查看者'
    return role
  },

  transferOwnership: function(e) {
    var memberId = e.currentTarget.dataset.id
    var memberName = e.currentTarget.dataset.name
    var self = this
    wx.showModal({
      title: '转让所有权',
      content: '确定要将账本所有权转让给' + (memberName || '该成员') + '吗？',
      success: function(res) {
        if (res.confirm) {
          var app = getApp()
          var currentMemberId = app.globalData.member ? app.globalData.member._id : ''
          bookManager.updateMemberRole(self.data.bookId, currentMemberId, 'writer')
          bookManager.updateBook(self.data.bookId, { ownerMemberId: memberId })
          bookManager.updateMemberRole(self.data.bookId, memberId, 'admin')
          self.loadData()
          wx.showToast({ title: '已转让', icon: 'success' })
        }
      }
    })
  },

  preventBubble: function() {
    // 阻止事件冒泡到遮罩层
  }
})
