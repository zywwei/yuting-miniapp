Component({
  properties: {
    stickers: { type: Array, value: [] },
    placedStickers: { type: Array, value: [] },
    title: { type: String, value: '' },
    deletable: { type: Boolean, value: true },
    maxCount: { type: Number, value: 10 }
  },

  data: {
    selectedId: ''
  },

  methods: {
    selectSticker(e) {
      const stickerId = e.currentTarget.dataset.id
      const sticker = this.properties.stickers.find(s => s.id === stickerId)
      if (!sticker) return

      if (this.properties.placedStickers.length >= this.properties.maxCount) {
        wx.showToast({ title: `最多贴${this.properties.maxCount}个贴纸`, icon: 'none' })
        return
      }

      const newSticker = {
        id: `sticker_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        stickerId: sticker.id,
        emoji: sticker.emoji
      }

      const updatedStickers = [...this.properties.placedStickers, newSticker]
      this.triggerEvent('change', { placedStickers: updatedStickers })

      wx.vibrateShort({ type: 'light' })
    },

    deleteSticker(e) {
      const stickerId = e.currentTarget.dataset.id
      const updatedStickers = this.properties.placedStickers.filter(s => s.id !== stickerId)
      this.triggerEvent('change', { placedStickers: updatedStickers })
      wx.vibrateShort({ type: 'light' })
    }
  }
})
