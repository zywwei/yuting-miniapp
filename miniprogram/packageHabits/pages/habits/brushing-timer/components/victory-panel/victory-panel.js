Component({
  options: {
    virtualHost: true,
    styleIsolation: 'apply-shared'
  },

  properties: {
    confetti: { type: Array, value: [] },
    enemy: { type: Object, value: null },
    completedText: { type: String, value: '' },
    completedStarsArr: { type: Array, value: [] },
    brushPoints: { type: Number, value: 0 },
    // 是否展示贴纸/拍照/完成按钮（对应页面 showStickerPicker）
    showActions: { type: Boolean, value: false },
    stickers: { type: Array, value: [] },
    placedStickers: { type: Array, value: [] },
    photos: { type: Array, value: [] }
  },

  methods: {
    onTapSticker(e) {
      this.triggerEvent('tapsticker', { id: e.currentTarget.dataset.id })
    },

    onDeleteSticker(e) {
      this.triggerEvent('deletesticker', { id: e.currentTarget.dataset.id })
    },

    takePhoto() {
      this.triggerEvent('takephoto')
    },

    deletePhoto(e) {
      this.triggerEvent('deletephoto', { index: e.currentTarget.dataset.index })
    },

    previewPhoto(e) {
      this.triggerEvent('previewphoto', { index: e.currentTarget.dataset.index })
    },

    editPhoto(e) {
      this.triggerEvent('editphoto', { path: e.currentTarget.dataset.path })
    },

    onDone() {
      this.triggerEvent('done')
    }
  }
})
