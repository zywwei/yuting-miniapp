const cloud = require('/utils/cloud.js')

Component({
  properties: {
    show: { type: Boolean, value: false },
    record: { type: Object, value: null }
  },

  data: {
    editing: false,
    editScore: 5,
    editNote: '',
    editImages: [],
    formattedRecord: null
  },

  observers: {
    'record': function(record) {
      this.setData({ formattedRecord: this.formatRecord(record) })
    }
  },

  methods: {
    // 格式化记录详情（组件自包含，不依赖父页面预格式化）
    formatRecord(record) {
      if (!record) return null

      const timeStr = record.createTime
        ? this.formatDate(record.createTime)
        : (record.date || '')

      let durationText = '手动打卡'
      if (record.fromTimer && record.duration) {
        const min = Math.floor(record.duration / 60)
        const sec = record.duration % 60
        durationText = min > 0 ? `计时刷牙 ${min}分${sec}秒` : `计时刷牙 ${sec}秒`
      } else if (record.fromTimer) {
        durationText = '计时刷牙'
      }

      const scoreLabels = ['加油哦', '还不错', '很好', '非常好', '超级棒！']
      const scoreLabel = scoreLabels[Math.min((record.score || 1) - 1, 4)]
      const areasText = record.completedAreas ? record.completedAreas.join('、') : ''

      return {
        ...record,
        timeStr,
        durationText,
        scoreLabel,
        areasText
      }
    },

    formatDate(isoString) {
      if (!isoString) return ''
      const d = new Date(isoString)
      const month = d.getMonth() + 1
      const day = d.getDate()
      const hour = d.getHours().toString().padStart(2, '0')
      const minute = d.getMinutes().toString().padStart(2, '0')
      return `${month}月${day}日 ${hour}:${minute}`
    },


    onClose() {
      this.setData({ editing: false })
      this.triggerEvent('close')
    },

    noop() {},

    previewImage(e) {
      const index = e.currentTarget.dataset.index
      wx.previewImage({
        current: this.data.record.images[index],
        urls: this.data.record.images
      })
    },

    // 编辑照片（跳转画板）
    editImage(e) {
      const path = e.currentTarget.dataset.path
      wx.setStorageSync('brushingEditOriginalPath', path)
      wx.navigateTo({
        url: '/packageCreate/pages/create/draw/draw?mode=brushing&photo=' + encodeURIComponent(path) + '&timeOfDay=' + this.data.record.timeOfDay
      })
    },

    // 删除照片（直接从记录中移除）
    async deleteImage(e) {
      const index = e.currentTarget.dataset.index
      wx.showModal({
        title: '确认删除',
        content: '确定要删除这张照片吗？',
        success: async (res) => {
          if (res.confirm) {
            const images = this.data.record.images.slice()
            images.splice(index, 1)
            const record = { ...this.data.record, images, imagePath: images[0] || '' }
            await cloud.updateBrushingRecordById(record.id, {
              images,
              imagePath: images[0] || ''
            })
            this.setData({ record })
            this.triggerEvent('updated')
          }
        }
      })
    },

    // ===== 编辑模式 =====
    startEdit() {
      const record = this.data.record
      this.setData({
        editing: true,
        editScore: record.score || 5,
        editNote: record.note || '',
        editImages: (record.images || []).slice()
      })
    },

    onScoreChange(e) {
      this.setData({ editScore: e.detail.score })
    },

    onEditNoteInput(e) {
      this.setData({ editNote: e.detail.value })
    },

    cancelEdit() {
      this.setData({ editing: false })
    },

    // 添加图片
    addEditImage() {
      const remainCount = 6 - this.data.editImages.length
      if (remainCount <= 0) {
        wx.showToast({ title: '最多6张照片', icon: 'none' })
        return
      }
      wx.chooseMedia({
        count: remainCount,
        mediaType: ['image'],
        sourceType: ['camera', 'album'],
        sizeType: ['compressed'],
        success: (res) => {
          const newImages = res.tempFiles.map(f => f.tempFilePath)
          this.setData({ editImages: [...this.data.editImages, ...newImages] })
        }
      })
    },

    // 删除图片
    deleteEditImage(e) {
      const index = e.currentTarget.dataset.index
      const images = this.data.editImages.slice()
      images.splice(index, 1)
      this.setData({ editImages: images })
    },

    // 预览编辑中的图片
    previewEditImage(e) {
      const index = e.currentTarget.dataset.index
      wx.previewImage({
        current: this.data.editImages[index],
        urls: this.data.editImages
      })
    },

    // 保存编辑
    async saveEdit() {
      const { record, editScore, editNote, editImages } = this.data
      wx.showLoading({ title: '保存中...' })

      try {
        // 上传新图片到云端
        let finalImages = []
        for (let i = 0; i < editImages.length; i++) {
          const img = editImages[i]
          if (img && img.startsWith('cloud://')) {
            finalImages.push(img)
          } else if (img) {
            try {
              const cloudPath = `brushing/${record.id}_edit_${i}_${Date.now()}.jpg`
              const uploadRes = await wx.cloud.uploadFile({ cloudPath, filePath: img })
              finalImages.push(uploadRes.fileID)
            } catch (e) {
              finalImages.push(img)
            }
          }
        }

        // 通过 cloud.js 统一更新（本地 + 云端）
        if (record.id) {
          await cloud.updateBrushingRecordById(record.id, {
            score: editScore,
            note: editNote.trim(),
            images: finalImages,
            imagePath: finalImages[0] || record.imagePath,
            cloudFileID: finalImages[0] || ''
          })
        }

        wx.hideLoading()
        this.setData({
          editing: false,
          record: {
            ...this.data.record,
            score: editScore,
            note: editNote.trim(),
            images: finalImages,
            imagePath: finalImages[0] || this.data.record.imagePath
          }
        })
        this.triggerEvent('updated')
        wx.showToast({ title: '已更新 ✅', icon: 'none' })
      } catch (err) {
        wx.hideLoading()
        wx.showToast({ title: '保存失败', icon: 'none' })
      }
    }
  }
})
