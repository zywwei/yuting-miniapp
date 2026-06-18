const app = getApp()
const util = require('../../../utils/util.js')
const audio = require('../../../utils/audio.js')
const cloud = require('../../../utils/cloud.js')
const achievements = require('../../../utils/achievements.js')
const { templateDrawers } = require('../../../utils/templates.js')

// 画画音乐管理
const drawingMusic = {
  ctx: null,
  isPlaying: false,
  enabled: false,
  init() {
    if (this.ctx) return
    this.ctx = wx.createInnerAudioContext()
    this.ctx.src = '/audio/drawing-music.mp3'
    this.ctx.loop = true
    this.ctx.volume = 0.35
    this.ctx.autoplay = false
    this.ctx.onEnded(() => {
      if (this.enabled && this.ctx) {
        this.ctx.seek(0)
        this.ctx.play()
      }
    })
  },
  play() {
    if (!this.ctx) this.init()
    if (this.ctx && !this.isPlaying) {
      this.ctx.play()
      this.isPlaying = true
      this.enabled = true
    }
  },
  pause() {
    if (this.ctx) {
      this.ctx.pause()
      this.isPlaying = false
      this.enabled = false
    }
  },
  toggle() {
    if (this.isPlaying) {
      this.pause()
    } else {
      this.play()
    }
    return this.enabled
  },
  stop() {
    if (this.ctx) {
      this.ctx.stop()
      this.isPlaying = false
      this.enabled = false
    }
  }
}

Page({
  data: {
    statusBarHeight: 20,
    capsuleRight: 80,
    canvasTitle: '自由画画',
    currentColor: '#FF4444',
    currentSize: 6,
    currentMode: 'draw', // draw | eraser | sticker
    colors: [],
    brushSizes: [],
    drawingMusicEnabled: false,
    // 贴纸选择列表（emoji）
    stickers: [
      '❤️', '⭐', '🌟', '💖', '🎀', '🌸', '🌻', '🦋',
      '🐝', '🐞', '🌈', '☁️', '☀️', '🌙', '💫', '✨',
      '🍎', '🍓', '🍩', '🧁', '🍰', '🍭', '🎈', '🎉',
      '👑', '👸', '🦄', '🐱', '🐶', '🐰', '🐻', '🦊'
    ],
    // 文字贴纸
    textStickers: [
      '真棒！', '加油！', '好厉害！', '太棒了！',
      '棒棒哒！', '厉害！', '完美！', '最棒！',
      '漂亮！', '真厉害！', '好样的！', '继续加油！',
      '666', 'YYDS', '爱你！', '么么哒！'
    ],
    stickerTab: 'emoji', // emoji | text
    selectedSticker: '❤️',
    // 贴纸预览数据（当前正在放置的贴纸）
    stickerPreview: null,
    templateId: '',
    templateName: ''
  },

  // 绘画状态
  canvas: null,
  ctx: null,
  isDrawing: false,
  lastX: 0,
  lastY: 0,
  history: [],
  historyIndex: -1,
  pixelRatio: 1,
  canvasWidth: 0,
  canvasHeight: 0,
  _canvasRect: null, // 缓存画布区域位置

  // 贴纸手势状态
  _stickerTouching: false,
  _stickerTouchId: '',
  _stickerTouchOffsetX: 0,
  _stickerTouchOffsetY: 0,
  _isPinching: false,
  _pinchStartDist: 0,
  _pinchStartSize: 0,
  _pinchStartAngle: 0,
  _pinchStartRotation: 0,
  _stickerIdCounter: 0,

  onLoad(options) {
    const mode = options.mode || 'free'
    const templateId = options.templateId || ''
    const templateName = options.name || ''
    const photoPath = options.photo ? decodeURIComponent(options.photo) : ''
    const sysInfo = wx.getSystemInfoSync()

    // 获取右上角胶囊按钮位置，计算右侧安全距离
    let capsuleRight = 0
    try {
      const capsule = wx.getMenuButtonBoundingClientRect()
      capsuleRight = sysInfo.windowWidth - capsule.left + 8
    } catch (e) {
      capsuleRight = 80
    }

    const titleMap = {
      parent: '和爸爸一起画',
      brushing: '编辑刷牙照片',
      habit: '编辑打卡照片',
      note: '编辑笔记照片'
    }

    this.setData({
      statusBarHeight: sysInfo.statusBarHeight || 20,
      capsuleRight: capsuleRight,
      colors: app.globalData.colors,
      brushSizes: app.globalData.brushSizes,
      templateId: templateId,
      templateName: templateName,
      canvasTitle: titleMap[mode] || (templateName ? '涂色 - ' + templateName : '钰婷的画板'),
      drawingMode: mode,
      soundEnabled: audio.enabled
    })

    this.initCanvas(templateId, photoPath)
  },

  // ========== 画布初始化 ==========

  initCanvas(templateId, photoPath) {
    const query = wx.createSelectorQuery()
    query.select('#drawingCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (!res[0]) return

        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        const sysInfo = wx.getSystemInfoSync()

        this.pixelRatio = sysInfo.pixelRatio
        this.canvasWidth = res[0].width
        this.canvasHeight = res[0].height

        canvas.width = res[0].width * this.pixelRatio
        canvas.height = res[0].height * this.pixelRatio
        ctx.scale(this.pixelRatio, this.pixelRatio)

        this.canvas = canvas
        this.ctx = ctx

        // 缓存画布区域的位置（延迟确保 DOM 已就绪）
        setTimeout(() => {
          this._refreshCanvasRect()
        }, 100)

        if (templateId && templateDrawers[templateId]) {
          this.drawTemplate(templateId)
        } else {
          ctx.fillStyle = '#FFFFFF'
          ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
        }

        // 刷牙模式：自动加载照片作为背景
        if (photoPath) {
          this.loadPhotoAsBackground(photoPath)
          // loadPhotoAsBackground 内部会调用 saveHistory
        } else {
          this.saveHistory()
        }
      })
  },

  // 刷新画布区域的 boundingClientRect 缓存
  _refreshCanvasRect() {
    const query = wx.createSelectorQuery()
    query.select('#canvasArea').boundingClientRect((rect) => {
      if (rect) {
        this._canvasRect = rect
      }
    }).exec()
  },

  drawTemplate(templateId) {
    if (!this.ctx) return
    this.ctx.fillStyle = '#FFFFFF'
    this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
    const drawer = templateDrawers[templateId]
    if (drawer) {
      drawer(this.ctx, this.canvasWidth, this.canvasHeight)
    }
  },

  // ========== 画布触摸事件（画笔/橡皮） ==========

  // 获取触摸点相对于画布的坐标
  _getCanvasPos(e) {
    const touch = e.touches[0]
    // 优先用缓存的 rect 转换坐标
    if (this._canvasRect) {
      return {
        x: touch.clientX - this._canvasRect.left,
        y: touch.clientY - this._canvasRect.top
      }
    }
    // 回退：用 touch.x/y
    if (touch.x !== undefined && touch.y !== undefined) {
      return { x: touch.x, y: touch.y }
    }
    return { x: 0, y: 0 }
  },

  onCanvasTouchStart(e) {
    if (!this.ctx) return
    this._refreshCanvasRect()

    // 贴纸模式：处理贴纸交互
    if (this.data.currentMode === 'sticker') {
      this._onStickerTouchStart(e)
      return
    }

    const pos = this._getCanvasPos(e)
    this.isDrawing = true
    this.lastX = pos.x
    this.lastY = pos.y

    this.ctx.beginPath()
    this.ctx.arc(pos.x, pos.y, this.data.currentSize / 2, 0, Math.PI * 2)
    this.ctx.fillStyle = this.data.currentMode === 'eraser' ? '#FFFFFF' : this.data.currentColor
    this.ctx.fill()

    if (this.data.currentMode === 'eraser') {
      audio.eraserTouch()
    } else {
      audio.drawTouch()
    }
  },

  onCanvasTouchMove(e) {
    if (this.data.currentMode === 'sticker') {
      this._onStickerTouchMove(e)
      return
    }
    if (!this.isDrawing || !this.ctx) return

    const pos = this._getCanvasPos(e)
    this.ctx.beginPath()
    this.ctx.moveTo(this.lastX, this.lastY)
    this.ctx.lineTo(pos.x, pos.y)
    this.ctx.strokeStyle = this.data.currentMode === 'eraser' ? '#FFFFFF' : this.data.currentColor
    this.ctx.lineWidth = this.data.currentSize
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'
    this.ctx.stroke()

    this.lastX = pos.x
    this.lastY = pos.y
  },

  onCanvasTouchEnd(e) {
    if (this.data.currentMode === 'sticker') {
      this._onStickerTouchEnd(e)
      return
    }
    if (!this.isDrawing) return
    this.isDrawing = false
    this.saveHistory()
  },

  // ========== 贴纸系统（Canvas 绘制，支持拖拽/缩放） ==========

  // 进入贴纸模式时保存画布底图
  _saveStickerBase() {
    if (!this.canvas) return
    this._stickerBase = this.canvas.toDataURL()
    this._stickerBaseImg = null // 清除缓存
  },

  // 贴纸触摸开始
  _onStickerTouchStart(e) {
    // 如果已有预览贴纸，处理拖拽/缩放
    if (this.data.stickerPreview) {
      if (e.touches.length === 2) {
        // 双指：开始缩放/旋转
        this._isPinching = true
        const t1 = e.touches[0]
        const t2 = e.touches[1]
        this._pinchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
        this._pinchStartAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * 180 / Math.PI
        this._pinchStartSize = this.data.stickerPreview.size
        this._pinchStartRotation = this.data.stickerPreview.rotation || 0
        return
      }

      // 单指：检测是否点击在贴纸范围内（扩大检测范围）
      const pos = this._getCanvasPos(e)
      const preview = this.data.stickerPreview
      const hitSize = Math.max(preview.size, 60) // 最小60px检测范围
      const halfSize = hitSize / 2 + 10 // 额外10px边距
      if (pos.x >= preview.x - halfSize && pos.x <= preview.x + halfSize &&
          pos.y >= preview.y - halfSize && pos.y <= preview.y + halfSize) {
        // 点击在贴纸范围内，开始拖拽
        this._stickerTouching = true
        this._stickerTouchOffsetX = pos.x - preview.x
        this._stickerTouchOffsetY = pos.y - preview.y
        return
      }
      // 点击在范围外，忽略
      return
    }

    // 没有预览贴纸，点击放置新贴纸
    if (this.data.selectedSticker) {
      const pos = this._getCanvasPos(e)
      this._placeSticker(this.data.selectedSticker, pos.x, pos.y)
    }
  },

  // 贴纸触摸移动
  _onStickerTouchMove(e) {
    if (!this.data.stickerPreview) return

    if (e.touches.length === 2 && this._isPinching) {
      const t1 = e.touches[0]
      const t2 = e.touches[1]

      // 缩放
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      const scale = dist / this._pinchStartDist
      let newSize = Math.round(this._pinchStartSize * scale)
      newSize = Math.max(30, Math.min(200, newSize))

      // 旋转
      const currentAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * 180 / Math.PI
      const newRotation = this._pinchStartRotation + (currentAngle - this._pinchStartAngle)

      this.setData({
        stickerPreview: { ...this.data.stickerPreview, size: newSize, rotation: newRotation }
      }, () => {
        this._redrawStickers()
      })
      return
    }

    // 单指拖拽
    if (e.touches.length === 1 && this._stickerTouching) {
      const pos = this._getCanvasPos(e)
      this.setData({
        stickerPreview: {
          ...this.data.stickerPreview,
          x: pos.x - this._stickerTouchOffsetX,
          y: pos.y - this._stickerTouchOffsetY
        }
      }, () => {
        this._redrawStickers()
      })
    }
  },

  // 贴纸触摸结束
  _onStickerTouchEnd(e) {
    this._stickerTouching = false
    this._isPinching = false
  },

  // 放置新贴纸（预览模式）
  _placeSticker(emoji, x, y) {
    this.setData({
      stickerPreview: {
        emoji: emoji,
        x: x,
        y: y,
        size: 60,
        rotation: 0
      }
    }, () => {
      this._redrawStickers()
    })
    audio.stickerPlace()
  },

  // 重绘贴纸（基于底图 + 预览贴纸）
  _redrawStickers() {
    if (!this.ctx || !this._stickerBase) return

    // 如果已经有缓存的底图，直接使用
    if (this._stickerBaseImg) {
      this._drawStickersOnCanvas(this._stickerBaseImg)
      return
    }

    // 首次加载底图
    const img = this.canvas.createImage()
    img.onload = () => {
      this._stickerBaseImg = img
      this._drawStickersOnCanvas(img)
    }
    img.src = this._stickerBase
  },

  // 在画布上绘制底图 + 贴纸
  _drawStickersOnCanvas(baseImg) {
    // 清空画布，绘制底图
    this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
    this.ctx.drawImage(baseImg, 0, 0, this.canvasWidth, this.canvasHeight)

    // 绘制预览贴纸
    const preview = this.data.stickerPreview
    if (preview) {
      this.ctx.save()
      this.ctx.translate(preview.x, preview.y)
      if (preview.rotation) {
        this.ctx.rotate(preview.rotation * Math.PI / 180)
      }
      this.ctx.font = `${preview.size}px serif`
      this.ctx.textAlign = 'center'
      this.ctx.textBaseline = 'middle'
      this.ctx.fillText(preview.emoji, 0, 0)
      this.ctx.restore()

      // 绘制选中框
      this.ctx.save()
      this.ctx.strokeStyle = '#FF6B8A'
      this.ctx.lineWidth = 2
      this.ctx.setLineDash([5, 5])
      this.ctx.strokeRect(
        preview.x - preview.size / 2 - 8,
        preview.y - preview.size / 2 - 8,
        preview.size + 16,
        preview.size + 16
      )
      this.ctx.restore()
    }
  },

  onCanvasTouchMove(e) {
    if (this.data.currentMode === 'sticker') return
    if (!this.isDrawing || !this.ctx) return

    const pos = this._getCanvasPos(e)
    this.ctx.beginPath()
    this.ctx.moveTo(this.lastX, this.lastY)
    this.ctx.lineTo(pos.x, pos.y)
    this.ctx.strokeStyle = this.data.currentMode === 'eraser' ? '#FFFFFF' : this.data.currentColor
    this.ctx.lineWidth = this.data.currentSize
    this.ctx.lineCap = 'round'
    this.ctx.lineJoin = 'round'
    this.ctx.stroke()

    this.lastX = pos.x
    this.lastY = pos.y
  },

  onCanvasTouchEnd(e) {
    if (this.data.currentMode === 'sticker') return
    if (!this.isDrawing) return
    this.isDrawing = false
    this.saveHistory()
  },

  // ========== 贴纸操作 ==========

  // 切换贴纸分类
  switchStickerTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({ stickerTab: tab })
  },

  // 选择贴纸（从底部面板）
  selectSticker(e) {
    const sticker = e.currentTarget.dataset.sticker
    this.setData({ selectedSticker: sticker })
  },

  // 确认贴纸（将预览贴纸真正贴到画布上）
  confirmStickers() {
    if (!this.data.stickerPreview) return

    this.setData({ stickerPreview: null })
    this._stickerBase = null
    this._stickerBaseImg = null
    this.saveHistory()
    audio.saveSuccess()
    wx.showToast({ title: '贴纸已贴上', icon: 'success' })
  },

  // 取消贴纸（恢复到底图）
  cancelSticker() {
    if (!this._stickerBase) return

    // 恢复底图
    if (this._stickerBaseImg) {
      this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
      this.ctx.drawImage(this._stickerBaseImg, 0, 0, this.canvasWidth, this.canvasHeight)
    }

    this.setData({ stickerPreview: null })
    this._stickerBaseImg = null
  },

  // 删除贴纸（同取消）
  deleteSticker() {
    this.cancelSticker()
  },

  // ========== 通用功能 ==========

  // 切换模式
  switchMode(e) {
    const mode = e.currentTarget.dataset.mode

    // 离开贴纸模式时，自动确认未完成的贴纸
    if (this.data.currentMode === 'sticker' && mode !== 'sticker') {
      if (this.data.stickerPreview) {
        this.confirmStickers()
      }
    }

    // 进入贴纸模式时，保存画布底图
    if (mode === 'sticker' && this.data.currentMode !== 'sticker') {
      this._saveStickerBase()
    }

    this.setData({ currentMode: mode })
    this._refreshCanvasRect()
  },

  // 切换画画音乐
  toggleDrawingMusic() {
    const enabled = drawingMusic.toggle()
    this.setData({ drawingMusicEnabled: enabled })
    wx.showToast({
      title: enabled ? '🎵 画画音乐已开启' : '🔇 画画音乐已关闭',
      icon: 'none'
    })
  },

  // 选择照片作为画布背景
  choosePhoto() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      sizeType: ['compressed'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath
        this.loadPhotoAsBackground(tempFilePath)
      }
    })
  },

  // 将照片加载到画布背景
  loadPhotoAsBackground(filePath) {
    if (!this.ctx || !this.canvas) return

    const img = this.canvas.createImage()
    img.onload = () => {
      this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)

      const imgW = img.width
      const imgH = img.height
      const canvasW = this.canvasWidth
      const canvasH = this.canvasHeight
      const imgRatio = imgW / imgH
      const canvasRatio = canvasW / canvasH

      let drawW, drawH, drawX, drawY
      if (imgRatio > canvasRatio) {
        drawH = canvasH
        drawW = canvasH * imgRatio
        drawX = (canvasW - drawW) / 2
        drawY = 0
      } else {
        drawW = canvasW
        drawH = canvasW / imgRatio
        drawX = 0
        drawY = (canvasH - drawH) / 2
      }

      this.ctx.drawImage(img, drawX, drawY, drawW, drawH)
      this.saveHistory()
      audio.stickerPlace()
      wx.showToast({ title: '已加载照片', icon: 'success' })
    }
    img.onerror = () => {
      wx.showToast({ title: '图片加载失败', icon: 'none' })
    }
    img.src = filePath
  },

  // 选择颜色
  selectColor(e) {
    const color = e.currentTarget.dataset.color
    this.setData({
      currentColor: color,
      currentMode: 'draw'
    })
  },

  // 选择画笔粗细
  selectSize(e) {
    const size = e.currentTarget.dataset.size
    this.setData({ currentSize: size })
  },

  // 保存历史记录
  saveHistory() {
    if (!this.canvas) return

    const imageData = this.canvas.toDataURL()
    this.history = this.history.slice(0, this.historyIndex + 1)
    this.history.push(imageData)
    this.historyIndex = this.history.length - 1

    if (this.history.length > 30) {
      this.history.shift()
      this.historyIndex--
    }
  },

  // 撤销操作
  undoAction() {
    if (this.historyIndex <= 0) {
      wx.showToast({ title: '没有可以撤销的了', icon: 'none' })
      return
    }

    this.historyIndex--
    this.restoreHistory()
    audio.undoAction()
  },

  // 恢复历史状态
  restoreHistory() {
    if (!this.ctx || !this.canvas) return

    const img = this.canvas.createImage()
    img.onload = () => {
      this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
      this.ctx.drawImage(img, 0, 0, this.canvasWidth, this.canvasHeight)
    }
    img.src = this.history[this.historyIndex]
  },

  // 清空画布
  clearCanvas() {
    wx.showModal({
      title: '清空画布',
      content: '确定要清空画布吗？钰婷画的内容会消失哦~',
      confirmText: '清空',
      confirmColor: '#FF6B8A',
      success: (res) => {
        if (res.confirm && this.ctx) {
          // 同时清除贴纸预览
          this.setData({
            stickerPreview: null
          })

          this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
          this.ctx.fillStyle = '#FFFFFF'
          this.ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)

          if (this.data.templateId && templateDrawers[this.data.templateId]) {
            this.drawTemplate(this.data.templateId)
          }

          this.history = []
          this.historyIndex = -1
          this.saveHistory()
          audio.deleteAction()
          wx.showToast({ title: '已清空', icon: 'success' })
        }
      }
    })
  },

  // 保存画作
  async saveDrawing() {
    if (!this.canvas) {
      wx.showToast({ title: '画布未准备好', icon: 'none' })
      return
    }

    // 如果有未确认的贴纸，先确认
    if (this.data.stickerPreview) {
      this.confirmStickers()
    }

    wx.showLoading({ title: '保存中...' })

    try {
      const res = await new Promise((resolve, reject) => {
        wx.canvasToTempFilePath({
          canvas: this.canvas,
          success: resolve,
          fail: reject
        })
      })

      // 刷牙模式：保存编辑后的照片到刷牙记录
      if (this.data.drawingMode === 'brushing') {
        await this._saveEditedPhoto(res.tempFilePath, 'brushingEditedPhoto', {
          timeOfDay: this.data.brushingTimeOfDay || 'morning'
        })
        return
      }

      // 习惯打卡模式：保存编辑后的照片到习惯打卡记录
      if (this.data.drawingMode === 'habit') {
        await this._saveEditedPhoto(res.tempFilePath, 'habitEditedPhoto')
        return
      }

      // 笔记模式：保存编辑后的照片到笔记记录
      if (this.data.drawingMode === 'note') {
        await this._saveEditedPhoto(res.tempFilePath, 'noteEditedPhoto')
        return
      }

      const drawing = {
        id: util.generateId(),
        imagePath: res.tempFilePath,
        name: this.data.templateName || '钰婷的画',
        mode: this.data.canvasTitle,
        createTime: new Date().toISOString()
      }

      // 上传到云端（内部自动处理本地降级）
      await cloud.uploadDrawing(res.tempFilePath, drawing)
      audio.saveSuccess()

      wx.hideLoading()
      wx.showToast({
        title: '保存成功！',
        icon: 'success',
        duration: 2000
      })

      // 检查成就解锁（异步版本，确保读取最新数据）
      achievements.checkAchievementsAsync().then(newAchievements => {
        if (newAchievements && newAchievements.length > 0) {
          setTimeout(() => {
            const popup = this.selectComponent('#achievementPopup')
            if (popup) {
              popup.showAchievements(newAchievements)
            }
          }, 2500)
        }
      }).catch(err => {
        console.warn('成就检查失败:', err)
      })
    } catch (err) {
      wx.hideLoading()
      console.error('保存失败:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  // 保存编辑后的照片到指定 storage key
  async _saveEditedPhoto(tempFilePath, storageKey, extraData) {
    // 将编辑后的图片保存到持久化目录
    const savedPath = await util.saveImageToPersistent(tempFilePath)

    // 存入 storage
    if (extraData && typeof extraData === 'object') {
      // 对象形式（如刷牙模式包含 timeOfDay）
      wx.setStorageSync(storageKey, { ...extraData, path: savedPath })
    } else {
      // 简单路径形式
      wx.setStorageSync(storageKey, savedPath)
    }

    wx.hideLoading()
    wx.showToast({ title: '编辑完成！', icon: 'success', duration: 1500 })
    setTimeout(() => {
      wx.navigateBack()
    }, 1500)
  },

  onUnload() {
    drawingMusic.stop()
  },

  // 返回
  goBack() {
    drawingMusic.stop()
    wx.navigateBack()
  }
})
