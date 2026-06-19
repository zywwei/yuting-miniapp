/**
 * 角色认证工具
 * 支持多家庭切换、家庭成员、孩子状态管理
 */

var OPENID_KEY = 'userOpenid'
var MEMBER_KEY = 'currentMember'
var FAMILY_KEY = 'currentFamily'
var CHILDREN_KEY = 'familyChildren'
var CURRENT_CHILD_KEY = 'currentChildId'
var FAMILIES_KEY = 'myFamilies'
var DEFAULT_FAMILY_KEY = 'defaultFamilyId'

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
  // OpenID
  getOpenid: function() {
    return wx.getStorageSync(OPENID_KEY) || ''
  },

  setOpenid: function(openid) {
    wx.setStorageSync(OPENID_KEY, openid)
  },

  // 当前家庭成员
  getMember: function() {
    return wx.getStorageSync(MEMBER_KEY) || null
  },

  setMember: function(member) {
    wx.setStorageSync(MEMBER_KEY, member)
  },

  // 当前家庭
  getFamily: function() {
    return wx.getStorageSync(FAMILY_KEY) || null
  },

  setFamily: function(family) {
    wx.setStorageSync(FAMILY_KEY, family)
  },

  // 当前家庭的孩子
  getChildren: function() {
    return wx.getStorageSync(CHILDREN_KEY) || []
  },

  setChildren: function(children) {
    wx.setStorageSync(CHILDREN_KEY, children)
  },

  // 当前选中的孩子
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

  // 用户所有家庭列表
  getMyFamilies: function() {
    return wx.getStorageSync(FAMILIES_KEY) || []
  },

  setMyFamilies: function(families) {
    wx.setStorageSync(FAMILIES_KEY, families)
  },

  // 默认家庭 ID
  getDefaultFamilyId: function() {
    return wx.getStorageSync(DEFAULT_FAMILY_KEY) || ''
  },

  setDefaultFamilyId: function(familyId) {
    wx.setStorageSync(DEFAULT_FAMILY_KEY, familyId)
  },

  // 切换当前家庭
  switchFamily: function(familyId) {
    var families = this.getMyFamilies()
    for (var i = 0; i < families.length; i++) {
      if (families[i].familyId === familyId && families[i].status === 'active') {
        this.setFamily(families[i].family)
        this.setMember(families[i].member)
        this.setChildren(families[i].children || [])
        this.switchChild('')
        return true
      }
    }
    return false
  },

  // 获取当前家庭 ID
  getCurrentFamilyId: function() {
    var family = this.getFamily()
    return family ? family._id : ''
  },

  // 检查是否已登录
  isLoggedIn: function() {
    return !!this.getMember()
  },

  // 检查是否是管理员
  isAdmin: function() {
    var member = this.getMember()
    return member && member.permissions && member.permissions.indexOf('admin') >= 0
  },

  // 检查是否是家长
  isParent: function() {
    var member = this.getMember()
    return member && (member.role === 'father' || member.role === 'mother')
  },

  // 获取角色图标
  getRoleIcon: function(role) {
    return ROLE_ICONS[role] || '👤'
  },

  // 获取角色名称
  getRoleName: function(role) {
    return ROLE_NAMES[role] || '其他'
  },

  // 清除所有数据
  clear: function() {
    wx.removeStorageSync(OPENID_KEY)
    wx.removeStorageSync(MEMBER_KEY)
    wx.removeStorageSync(FAMILY_KEY)
    wx.removeStorageSync(CHILDREN_KEY)
    wx.removeStorageSync(CURRENT_CHILD_KEY)
    wx.removeStorageSync(FAMILIES_KEY)
    wx.removeStorageSync(DEFAULT_FAMILY_KEY)
  },

  // 清除当前家庭数据（切换家庭时用）
  clearCurrentFamily: function() {
    wx.removeStorageSync(MEMBER_KEY)
    wx.removeStorageSync(FAMILY_KEY)
    wx.removeStorageSync(CHILDREN_KEY)
    wx.removeStorageSync(CURRENT_CHILD_KEY)
  }
}
