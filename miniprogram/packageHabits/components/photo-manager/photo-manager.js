const { previewImage } = getApp().globalData.pageHelpers

Component({
  properties: {
    photos: { type: Array, value: [] },
    maxCount: { type: Number, value: 6 },
    title: { type: String, value: '' },
    addText: { type: String, value: '拍照' },
    addable: { type: Boolean, value: true },
    deletable: { type: Boolean, value: true },
    editable: { type: Boolean, value: true },
    sourceType: { type: Array, value: ['camera', 'album'] }
  },

  methods: {
    // 添加图片
    addPhoto() {
      const remainCount = this.properties.maxCount - this.properties.photos.length
      if (remainCount <= 0) {
        wx.showToast({ title: `最多${this.properties.maxCount}张照片`, icon: 'none' })
        return
      }
      wx.chooseMedia({
        count: remainCount,
        mediaType: ['image'],
        sourceType: this.properties.sourceType,
        sizeType: ['compressed'],
        success: (res) => {
          const newPhotos = res.tempFiles.map(f => f.tempFilePath)
          const updatedPhotos = [...this.properties.photos, ...newPhotos]
          this.triggerEvent('change', { photos: updatedPhotos })
        }
      })
    },

    // 删除图片
    deletePhoto(e) {
      const index = e.currentTarget.dataset.index
      const photos = this.properties.photos.slice()
      photos.splice(index, 1)
      this.triggerEvent('change', { photos })
    },

    // 预览图片
    previewPhoto(e) {
      const index = e.currentTarget.dataset.index
      previewImage(this.properties.photos[index], this.properties.photos)
    },

    // 编辑图片
    editPhoto(e) {
      const path = e.currentTarget.dataset.path
      this.triggerEvent('edit', { path })
    }
  }
})
