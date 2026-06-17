const app = getApp()
const util = require('../../../utils/util.js')
const audio = require('../../../utils/audio.js')
const cloud = require('../../../utils/cloud.js')
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
    // 贴纸图层数据
    stickerOverlays: [],
    activeStickerId: '',
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
    if (this.data.currentMode === 'sticker') return
    if (!this.ctx) return

    // 刷新画布位置缓存
    this._refreshCanvasRect()

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

  // ========== 贴纸图层触摸事件 ==========

  // 获取触摸点所在的贴纸（坐标为百分比 0-1）
  _findStickerAtPoint(px, py, overlayW, overlayH) {
    const stickers = this.data.stickerOverlays
    for (let i = stickers.length - 1; i >= 0; i--) {
      const s = stickers[i]
      // 将贴纸像素大小转换为百分比距离
      const halfW = (s.size / 2) / overlayW
      const halfH = (s.size / 2) / overlayH
      if (px >= s.x - halfW && px <= s.x + halfW &&
          py >= s.y - halfH && py <= s.y + halfH) {
        return s
      }
    }
    return null
  },

  // 贴纸图层触摸开始
  onStickerTouchStart(e) {
    this._refreshCanvasRect()

    if (e.touches.length === 2) {
      this._isPinching = true
      const t1 = e.touches[0]
      const t2 = e.touches[1]
      this._pinchStartDist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      this._pinchStartAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * 180 / Math.PI

      const activeSticker = this.data.stickerOverlays.find(s => s.id === this.data.activeStickerId)
      if (activeSticker) {
        this._pinchStartSize = activeSticker.size
        this._pinchStartRotation = activeSticker.rotation || 0
      }
      return
    }

    if (e.touches.length === 1) {
      const touch = e.touches[0]
      const rect = this._canvasRect
      if (!rect) return

      // 转换为百分比坐标
      const px = (touch.clientX - rect.left) / rect.width
      const py = (touch.clientY - rect.top) / rect.height

      const hitSticker = this._findStickerAtPoint(px, py, rect.width, rect.height)
      if (hitSticker) {
        this._stickerTouching = true
        this._stickerTouchId = hitSticker.id
        this._stickerTouchOffsetX = px - hitSticker.x
        this._stickerTouchOffsetY = py - hitSticker.y
        this.setData({ activeStickerId: hitSticker.id })
      }
    }
  },

  // 贴纸图层触摸移动
  onStickerTouchMove(e) {
    if (e.touches.length === 2 && this._isPinching) {
      // 双指缩放 + 旋转
      const t1 = e.touches[0]
      const t2 = e.touches[1]

      // 计算缩放
      const dist = Math.hypot(t2.clientX - t1.clientX, t2.clientY - t1.clientY)
      const scale = dist / this._pinchStartDist
      let newSize = Math.round(this._pinchStartSize * scale)
      newSize = Math.max(30, Math.min(200, newSize))

      // 计算旋转角度
      const currentAngle = Math.atan2(t2.clientY - t1.clientY, t2.clientX - t1.clientX) * 180 / Math.PI
      const angleDiff = currentAngle - this._pinchStartAngle
      const newRotation = this._pinchStartRotation + angleDiff

      const activeId = this.data.activeStickerId
      const stickers = this.data.stickerOverlays.map(s => {
        if (s.id === activeId) {
          return { ...s, size: newSize, rotation: newRotation }
        }
        return s
      })
      this.setData({ stickerOverlays: stickers })
      return
    }

    if (e.touches.length === 1 && this._stickerTouching) {
      const touch = e.touches[0]
      const rect = this._canvasRect
      if (!rect) return

      // 转换为百分比坐标（减去偏移量）
      const px = (touch.clientX - rect.left) / rect.width - this._stickerTouchOffsetX
      const py = (touch.clientY - rect.top) / rect.height - this._stickerTouchOffsetY

      const stickers = this.data.stickerOverlays.map(s => {
        if (s.id === this._stickerTouchId) {
          return { ...s, x: px, y: py }
        }
        return s
      })
      this.setData({ stickerOverlays: stickers })
    }
  },

  // 贴纸图层触摸结束
  onStickerTouchEnd(e) {
    this._stickerTouching = false
    this._stickerTouchId = ''
    this._isPinching = false
  },

  // 点击贴纸选中
  onStickerTap(e) {
    const id = e.currentTarget.dataset.id
    this.setData({ activeStickerId: id })
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

    // 在画布中心添加一个新的贴纸图层
    this._addStickerOverlay(sticker)
  },

  // 添加贴纸到图层（位置用百分比 0-1，size 用像素）
  _addStickerOverlay(emoji) {
    this._stickerIdCounter++
    const newSticker = {
      id: 'sticker_' + this._stickerIdCounter,
      emoji: emoji,
      x: 0.5,       // 居中（百分比）
      y: 0.5,       // 居中（百分比）
      size: 60,
      rotation: 0
    }

    const overlays = [...this.data.stickerOverlays, newSticker]
    this.setData({
      stickerOverlays: overlays,
      activeStickerId: newSticker.id
    })
    audio.stickerPlace()
  },

  // 确认所有贴纸（合并到画布）
  confirmStickers() {
    if (!this.ctx || this.data.stickerOverlays.length === 0) return

    const canvasW = this.canvasWidth
    const canvasH = this.canvasHeight
    const stickers = this.data.stickerOverlays

    stickers.forEach(s => {
      // 百分比坐标转画布坐标
      const drawX = s.x * canvasW
      const drawY = s.y * canvasH
      const rotation = s.rotation || 0

      if (rotation !== 0) {
        this.ctx.save()
        this.ctx.translate(drawX, drawY)
        this.ctx.rotate(rotation * Math.PI / 180)
        this.ctx.font = `${s.size}px serif`
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'middle'
        this.ctx.fillText(s.emoji, 0, 0)
        this.ctx.restore()
      } else {
        this.ctx.font = `${s.size}px serif`
        this.ctx.textAlign = 'center'
        this.ctx.textBaseline = 'middle'
        this.ctx.fillText(s.emoji, drawX, drawY)
      }
    })

    this.setData({
      stickerOverlays: [],
      activeStickerId: ''
    })
    this.saveHistory()
    audio.saveSuccess()
    wx.showToast({ title: '贴纸已贴上', icon: 'success' })
  },

  // 取消所有贴纸
  cancelAllStickers() {
    this.setData({
      stickerOverlays: [],
      activeStickerId: ''
    })
  },

  // 删除选中的贴纸
  deleteActiveSticker() {
    const activeId = this.data.activeStickerId
    if (!activeId) {
      wx.showToast({ title: '先点击选中要删除的贴纸', icon: 'none' })
      return
    }

    const overlays = this.data.stickerOverlays.filter(s => s.id !== activeId)
    this.setData({
      stickerOverlays: overlays,
      activeStickerId: ''
    })
  },

  // ========== 通用功能 ==========

  // 切换模式
  switchMode(e) {
    const mode = e.currentTarget.dataset.mode

    // 离开贴纸模式时，自动确认未完成的贴纸
    if (this.data.currentMode === 'sticker' && mode !== 'sticker') {
      if (this.data.stickerOverlays.length > 0) {
        this.confirmStickers()
      }
    }

    this.setData({ currentMode: mode })
    // 切换模式时刷新 rect
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
          // 同时清除贴纸图层
          this.setData({
            stickerOverlays: [],
            activeStickerId: ''
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

    // 如果有未确认的贴纸，先合并
    if (this.data.stickerOverlays.length > 0) {
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
        const editedPath = res.tempFilePath
        wx.hideLoading()

        // 将编辑后的图片保存到持久化目录
        const savedPath = await util.saveImageToPersistent(editedPath)

        // 存入 storage 供刷牙页面读取
        wx.setStorageSync('brushingEditedPhoto', savedPath)

        wx.showToast({ title: '编辑完成！', icon: 'success', duration: 1500 })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
        return
      }

      // 习惯打卡模式：保存编辑后的照片到习惯打卡记录
      if (this.data.drawingMode === 'habit') {
        const editedPath = res.tempFilePath
        wx.hideLoading()

        // 将编辑后的图片保存到持久化目录
        const savedPath = await util.saveImageToPersistent(editedPath)

        // 存入 storage 供习惯打卡页面读取
        wx.setStorageSync('habitEditedPhoto', savedPath)

        wx.showToast({ title: '编辑完成！', icon: 'success', duration: 1500 })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
        return
      }

      // 笔记模式：保存编辑后的照片到笔记记录
      if (this.data.drawingMode === 'note') {
        const editedPath = res.tempFilePath
        wx.hideLoading()

        // 将编辑后的图片保存到持久化目录
        const savedPath = await util.saveImageToPersistent(editedPath)

        // 存入 storage 供笔记页面读取
        wx.setStorageSync('noteEditedPhoto', savedPath)

        wx.showToast({ title: '编辑完成！', icon: 'success', duration: 1500 })
        setTimeout(() => {
          wx.navigateBack()
        }, 1500)
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
    } catch (err) {
      wx.hideLoading()
      console.error('保存失败:', err)
      wx.showToast({ title: '保存失败', icon: 'none' })
    }
  },

  // 返回
  goBack() {
    drawingMusic.stop()
    wx.navigateBack()
  }
})
