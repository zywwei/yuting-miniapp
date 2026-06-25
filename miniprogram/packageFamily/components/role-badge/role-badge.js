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

Component({
  properties: {
    role: { type: String, value: '' },
    name: { type: String, value: '' },
    size: { type: String, value: 'normal' }
  },

  data: {
    icon: '👤'
  },

  observers: {
    'role': function(role) {
      this.setData({
        icon: ROLE_ICONS[role] || '👤'
      })
    }
  }
})
