/**
 * 角色认证工具
 * 管理家庭成员、家庭信息、孩子状态
 */

var MEMBER_KEY = 'currentMember'
var FAMILY_KEY = 'currentFamily'
var CHILDREN_KEY = 'familyChildren'
var CURRENT_CHILD_KEY = 'currentChildId'

var ROLE_ICONS = {
  father: '👨',
  mother: '👩',
  child: '🧒',
  grandpa: '👴',
  grandma: '👵',
  uncle: '👨',
  aunt: '👩',
  other: '👤'
}

var ROLE_NAMES = {
  father: '爸爸',
  mother: '妈妈',
  child: '本人',
  grandpa: '爷爷',
  grandma: '奶奶',
  uncle: '叔叔',
  aunt: '阿姨',
  other: '其他'
}

module.exports = {
  getMember: function() {
    return wx.getStorageSync(MEMBER_KEY) || null
  },

  setMember: function(member) {
    wx.setStorageSync(MEMBER_KEY, member)
  },

  getFamily: function() {
    return wx.getStorageSync(FAMILY_KEY) || null
  },

  setFamily: function(family) {
    wx.setStorageSync(FAMILY_KEY, family)
  },

  getChildren: function() {
    return wx.getStorageSync(CHILDREN_KEY) || []
  },

  setChildren: function(children) {
    wx.setStorageSync(CHILDREN_KEY, children)
  },

  getCurrentChildId: function() {
    return wx.getStorageSync(CURRENT_CHILD_KEY) || ''
  },

  switchChild: function(childId) {
    wx.setStorageSync(CURRENT_CHILD_KEY, childId)
  },

  getCurrentChild: function() {
    var childId = this.getCurrentChildId()
    var children = this.getChildren()
    for (var i = 0; i < children.length; i++) {
      if (children[i].childId === childId) return children[i]
    }
    return null
  },

  isLoggedIn: function() {
    return !!this.getMember()
  },

  isAdmin: function() {
    var member = this.getMember()
    return member && member.permissions && member.permissions.indexOf('admin') >= 0
  },

  isParent: function() {
    var member = this.getMember()
    return member && (member.role === 'father' || member.role === 'mother')
  },

  getRoleIcon: function(role) {
    return ROLE_ICONS[role] || '👤'
  },

  getRoleName: function(role) {
    return ROLE_NAMES[role] || '其他'
  },

  clear: function() {
    wx.removeStorageSync(MEMBER_KEY)
    wx.removeStorageSync(FAMILY_KEY)
    wx.removeStorageSync(CHILDREN_KEY)
    wx.removeStorageSync(CURRENT_CHILD_KEY)
  }
}
