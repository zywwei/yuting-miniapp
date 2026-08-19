Component({
  options: {
    virtualHost: true,
    styleIsolation: 'apply-shared'
  },

  properties: {
    skins: { type: Array, value: [] },
    selectedSkinId: { type: String, value: 'classic' },
    selectedDuration: { type: Number, value: 120 }
  },

  methods: {
    onSelectSkin(e) {
      this.triggerEvent('selectskin', { id: e.currentTarget.dataset.id })
    },

    onSelectDuration(e) {
      this.triggerEvent('selectduration', { sec: parseInt(e.currentTarget.dataset.sec) })
    }
  }
})
