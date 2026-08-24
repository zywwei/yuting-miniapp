var auth = require('../../utils/auth.js')

Component({
  properties: {
    children: { type: Array, value: [] },
    currentChildId: { type: String, value: '' }
  },

  data: {
    currentChild: null
  },

  observers: {
    'children, currentChildId': function(children, currentChildId) {
      if (!children || children.length === 0) return
      var current = null
      for (var i = 0; i < children.length; i++) {
        if (children[i].childId === currentChildId) {
          current = children[i]
          break
        }
      }
      if (!current && children.length > 0) {
        current = children[0]
      }
      this.setData({ currentChild: current })
    }
  },

  methods: {
    async switchChild(e) {
      var childId = e.currentTarget.dataset.id
      if (childId === this.data.currentChildId) return

      auth.switchChild(childId)

      // 保存到云端
      try {
        await wx.cloud.callFunction({
          name: 'family',
          data: { familyId: auth.getCurrentFamilyId(), action: 'saveCurrentChild', childId: childId }
        })
      } catch (err) {
        console.warn('保存当前孩子失败:', err)
      }

      this.triggerEvent('childChanged', { childId: childId })
    },

    showSwitcher() {
      if (this.data.children.length <= 1) return
      this.setData({ showPanel: !this.data.showPanel })
    }
  }
})
