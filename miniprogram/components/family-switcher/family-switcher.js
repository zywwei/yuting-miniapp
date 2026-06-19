var auth = require('../../utils/auth.js')

Component({
  data: {
    showPanel: false,
    families: [],
    currentFamilyId: '',
    defaultFamilyId: ''
  },

  lifetimes: {
    attached: function() {
      this.loadData()
    }
  },

  methods: {
    loadData: function() {
      var families = auth.getMyFamilies()
      var currentFamilyId = auth.getCurrentFamilyId()
      var defaultFamilyId = auth.getDefaultFamilyId()

      this.setData({
        families: families,
        currentFamilyId: currentFamilyId,
        defaultFamilyId: defaultFamilyId
      })
    },

    showPanel: function() {
      this.loadData()
      this.setData({ showPanel: true })
    },

    hidePanel: function() {
      this.setData({ showPanel: false })
    },

    switchFamily: function(e) {
      var familyId = e.currentTarget.dataset.id
      if (familyId === this.data.currentFamilyId) {
        this.hidePanel()
        return
      }

      var app = getApp()
      var success = app.switchFamily(familyId)
      if (success) {
        this.loadData()
        this.hidePanel()
        wx.showToast({ title: '已切换家庭', icon: 'success' })
      } else {
        wx.showToast({ title: '切换失败', icon: 'none' })
      }
    },

    setDefault: function(e) {
      var familyId = e.currentTarget.dataset.id
      auth.setDefaultFamilyId(familyId)
      this.setData({ defaultFamilyId: familyId })
      wx.showToast({ title: '已设为默认', icon: 'success' })
    },

    goCreate: function() {
      this.hidePanel()
      wx.navigateTo({ url: '/pages/family/role-select/role-select' })
    }
  }
})
