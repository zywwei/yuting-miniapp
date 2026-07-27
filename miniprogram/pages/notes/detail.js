var childStorage = require('../../utils/child-storage.js')
var cloud = require('../../utils/cloud.js')
var auth = require('../../utils/auth.js')
var dateUtils = require('../../utils/date-utils.js')
var noteTypes = require('../../utils/note-types.js')

Page({
  data: {
    note: null,
    noteId: '',
    typeInfo: null,
    moodInfo: null,
    canEdit: false,
    formattedCreateTime: '',
    formattedUpdateTime: '',
    isLiked: false,
    likeCount: 0,
    commentCount: 0,
    // 语音播放状态
    isPlayingVoice: false,
    voiceDuration: 0,
    // 上下篇导航
    prevNote: null,
    nextNote: null
  },

  onLoad: function(options) {
    var id = options.id
    this.loadNote(id)
  },

  onShow: function() {
    var self = this
    if (this.data.note) {
      // 从编辑页面返回时刷新数据
      // 同时尝试从云端同步最新笔记（防止其他设备修改 visibility 后本地缓存未更新）
      cloud.fetchNotes().then(function() {
        self.loadNote(self.data.note.id)
      }).catch(function() {
        // 同步失败时仍从本地加载
        self.loadNote(self.data.note.id)
      })
    }
  },

  // 加载笔记
  loadNote: function(id) {
    var self = this
    var notes = childStorage.get('notes') || []
    var note = notes.find(function(n) { return n.id === id })
    if (!note) {
      wx.showToast({ title: '笔记不存在', icon: 'none' })
      setTimeout(function() { wx.navigateBack() }, 1500)
      return
    }

    var member = auth.getMember()
    var memberId = member ? member._id : ''
    var isAdmin = member && member.permissions && member.permissions.indexOf('admin') >= 0
    var isCreator = note.createdBy === memberId

    // 可见性权限校验：非创建者/管理员需按 visibility 判断
    var canView = isCreator || isAdmin
    if (!canView) {
      var vis = note.visibility || 'family'
      if (vis === 'family') {
        canView = true
      } else if (vis === 'designated') {
        canView = (note.visibleTo || []).indexOf(memberId) >= 0
      } else {
        canView = false  // private 仅创建者可见
      }
    }

    if (!canView) {
      wx.showToast({ title: '无权查看此笔记', icon: 'none' })
      setTimeout(function() { wx.navigateBack() }, 1500)
      return
    }

    var typeInfo = noteTypes.getTypeInfo(note.type)
    var moodInfo = noteTypes.getMoodInfo(note.mood)

    // 计算点赞状态
    var likes = note.likes || []
    var isLiked = likes.some(function(like) { return like.memberId === memberId })
    var likeCount = likes.length

    // 获取上下篇笔记
    var allNotes = childStorage.get('notes') || []
    var currentIndex = allNotes.findIndex(function(n) { return n.id === id })
    var prevNote = null
    var nextNote = null
    
    if (currentIndex > 0) {
      prevNote = {
        id: allNotes[currentIndex - 1].id,
        title: allNotes[currentIndex - 1].title ? allNotes[currentIndex - 1].title.replace(/<[^>]+>/g, '').trim() : '无标题'
      }
    }
    if (currentIndex < allNotes.length - 1) {
      nextNote = {
        id: allNotes[currentIndex + 1].id,
        title: allNotes[currentIndex + 1].title ? allNotes[currentIndex + 1].title.replace(/<[^>]+>/g, '').trim() : '无标题'
      }
    }

    self.setData({
      note: note,
      noteId: note.id,
      typeInfo: typeInfo,
      moodInfo: moodInfo,
      canEdit: isCreator || isAdmin,
      formattedCreateTime: dateUtils.formatDate(note.createTime),
      formattedUpdateTime: note.updateTime ? dateUtils.formatDate(note.updateTime) : '',
      isLiked: isLiked,
      likeCount: likeCount,
      prevNote: prevNote,
      nextNote: nextNote
    })

    // 加载评论数量
    self.loadCommentCount(note.id)
  },

  // 图片预览
  previewImage: function(e) {
    var index = e.currentTarget.dataset.index
    var urls = this.data.note.images || []
    
    if (urls.length === 0) return
    
    // 检查是否需要转换cloud:// URL
    var needConvert = urls.some(function(url) { 
      return typeof url === 'string' && url.startsWith('cloud://') 
    })
    
    if (needConvert) {
      wx.cloud.getTempFileURL({
        fileList: urls,
        success: function(res) {
          var tempUrls = res.fileList.map(function(f) {
            return f.tempFileURL || f.fileID 
          })
          wx.previewImage({ urls: tempUrls, current: tempUrls[index] })
        },
        fail: function() {
          // 转换失败，直接使用原始URL
          wx.previewImage({ urls: urls, current: urls[index] })
        }
      })
    } else {
      wx.previewImage({ urls: urls, current: urls[index] })
    }
  },

  // 编辑笔记
  editNote: function() {
    wx.navigateTo({
      url: '/pages/notes/add?id=' + this.data.note.id
    })
  },

  // 删除笔记
  deleteNote: function() {
    var self = this
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这篇笔记吗？删除后无法恢复。',
      confirmColor: '#FF4444',
      success: async function(res) {
        if (res.confirm) {
          wx.showLoading({ title: '删除中...' })
          var noteManager = require('../../utils/note-manager.js')
          var result = await noteManager.deleteNote(self.data.note.id)
          wx.hideLoading()
          
          if (result.success) {
            wx.showToast({ title: '已删除', icon: 'success' })
          } else {
            wx.showToast({ title: '本地已删除，云端同步失败', icon: 'none' })
          }
          setTimeout(function() { wx.navigateBack() }, 1500)
        }
      }
    })
  },

  // 点赞状态变化
  onLikeChanged: function(e) {
    var detail = e.detail
    this.setData({
      isLiked: detail.liked,
      likeCount: detail.likes ? detail.likes.length : 0,
      'note.likes': detail.likes
    })
    
    // 更新本地存储
    var notes = childStorage.get('notes') || []
    var index = notes.findIndex(function(n) { return n.id === this.data.noteId }.bind(this))
    if (index > -1) {
      notes[index].likes = detail.likes
      childStorage.set('notes', notes)
    }
  },

  // 加载评论数量
  loadCommentCount: function(noteId) {
    var that = this
    wx.cloud.callFunction({
      name: 'interaction',
      data: {
        action: 'getComments',
        targetType: 'note',
        targetId: noteId
      }
    }).then(function(res) {
      if (res.result && res.result.code === 0) {
        var comments = res.result.data || []
        that.setData({ commentCount: comments.length })
      }
    }).catch(function(err) {
      console.warn('加载评论数量失败:', err)
    })
  },

  // 滚动到评论区
  scrollToComments: function() {
    wx.pageScrollTo({
      selector: '.comment-section',
      duration: 300
    })
  },

  // 上一篇
  goToPrevNote: function() {
    if (!this.data.prevNote) return
    wx.redirectTo({
      url: '/pages/notes/detail?id=' + this.data.prevNote.id
    })
  },

  // 下一篇
  goToNextNote: function() {
    if (!this.data.nextNote) return
    wx.redirectTo({
      url: '/pages/notes/detail?id=' + this.data.nextNote.id
    })
  },

  // 语音播放功能
  innerAudioContext: null,

  initAudioContext: function() {
    var that = this
    this.innerAudioContext = wx.createInnerAudioContext()
    
    this.innerAudioContext.onEnded(function() {
      that.setData({ isPlayingVoice: false })
    })
    
    this.innerAudioContext.onError(function(err) {
      that.setData({ isPlayingVoice: false })
      console.warn('播放失败:', err)
    })
  },

  playVoice: function() {
    if (!this.data.note || !this.data.note.voice) return
    
    if (!this.innerAudioContext) {
      this.initAudioContext()
    }
    
    if (this.data.isPlayingVoice) {
      this.innerAudioContext.stop()
      this.setData({ isPlayingVoice: false })
    } else {
      // 如果是cloud:// URL，需要获取临时URL
      var voiceUrl = this.data.note.voice
      if (voiceUrl.startsWith('cloud://')) {
        var that = this
        wx.cloud.getTempFileURL({
          fileList: [voiceUrl],
          success: function(res) {
            if (res.fileList && res.fileList[0]) {
              that.innerAudioContext.src = res.fileList[0].tempFileURL
              that.innerAudioContext.play()
              that.setData({ isPlayingVoice: true })
            }
          },
          fail: function() {
            wx.showToast({ title: '语音加载失败', icon: 'none' })
          }
        })
      } else {
        this.innerAudioContext.src = voiceUrl
        this.innerAudioContext.play()
        this.setData({ isPlayingVoice: true })
      }
    }
  },

  onUnload: function() {
    if (this.innerAudioContext) {
      this.innerAudioContext.destroy()
    }
  },

  // 生成分享卡片
  generateShareImage: function() {
    var that = this
    var note = this.data.note
    if (!note) return

    wx.showLoading({ title: '生成分享图...' })

    // 获取canvas
    const query = wx.createSelectorQuery()
    query.select('#shareCanvas')
      .fields({ node: true, size: true })
      .exec(function(res) {
        if (!res[0]) {
          wx.hideLoading()
          wx.showToast({ title: '生成失败', icon: 'none' })
          return
        }

        const canvas = res[0].node
        const ctx = canvas.getContext('2d')
        
        // 设置canvas尺寸
        const dpr = wx.getSystemInfoSync().pixelRatio
        canvas.width = 600 * dpr
        canvas.height = 800 * dpr
        ctx.scale(dpr, dpr)

        // 绘制背景（手账纸底色）
        ctx.fillStyle = '#FFFBF5'
        ctx.fillRect(0, 0, 600, 800)

        // 绘制装饰边框
        ctx.strokeStyle = '#F0B429'
        ctx.lineWidth = 4
        ctx.strokeRect(20, 20, 560, 760)

        // 绘制标题
        ctx.fillStyle = '#4A3F35'
        ctx.font = 'bold 36px sans-serif'
        ctx.textAlign = 'center'
        var title = note.title ? note.title.replace(/<[^>]+>/g, '').trim() : '无标题'
        if (title.length > 12) {
          title = title.substring(0, 12) + '...'
        }
        ctx.fillText(title, 300, 80)

        // 绘制首图（如果有）
        if (note.images && note.images.length > 0) {
          var img = canvas.createImage()
          img.onload = function() {
            // 绘制图片
            ctx.drawImage(img, 40, 100, 520, 340)
            
            // 绘制其他内容
            that.drawShareContent(ctx, note)
            
            // 导出图片
            that.exportShareImage(canvas)
          }
          img.onerror = function() {
            // 图片加载失败，继续绘制其他内容
            that.drawShareContent(ctx, note)
            that.exportShareImage(canvas)
          }
          
          // 获取临时URL
          var imageUrl = note.images[0]
          if (imageUrl.startsWith('cloud://')) {
            wx.cloud.getTempFileURL({
              fileList: [imageUrl],
              success: function(res) {
                if (res.fileList && res.fileList[0]) {
                  img.src = res.fileList[0].tempFileURL
                } else {
                  that.drawShareContent(ctx, note)
                  that.exportShareImage(canvas)
                }
              },
              fail: function() {
                that.drawShareContent(ctx, note)
                that.exportShareImage(canvas)
              }
            })
          } else {
            img.src = imageUrl
          }
        } else {
          // 没有图片，直接绘制内容
          that.drawShareContent(ctx, note)
          that.exportShareImage(canvas)
        }
      })
  },

  // 绘制分享卡片内容
  drawShareContent: function(ctx, note) {
    // 绘制内容预览
    ctx.fillStyle = '#4A3F35'
    ctx.font = '24px sans-serif'
    ctx.textAlign = 'left'
    var content = note.content ? note.content.replace(/<[^>]+>/g, '').trim() : ''
    if (content.length > 60) {
      content = content.substring(0, 60) + '...'
    }
    
    // 自动换行
    var lines = []
    var currentLine = ''
    for (var i = 0; i < content.length; i++) {
      currentLine += content[i]
      if (ctx.measureText(currentLine).width > 500) {
        lines.push(currentLine)
        currentLine = ''
      }
    }
    if (currentLine) {
      lines.push(currentLine)
    }
    
    var y = note.images && note.images.length > 0 ? 480 : 150
    lines.forEach(function(line, index) {
      if (index < 4) {
        ctx.fillText(line, 50, y + index * 36)
      }
    })

    // 绘制日期印章
    ctx.fillStyle = '#F0B429'
    ctx.font = 'bold 20px sans-serif'
    ctx.textAlign = 'right'
    var dateStr = note.createTime ? new Date(note.createTime).toLocaleDateString() : ''
    ctx.fillText(dateStr, 550, 700)

    // 绘制小程序标识
    ctx.fillStyle = '#A89B8C'
    ctx.font = '18px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('成长笔记 · 记录美好瞬间', 300, 760)
  },

  // 导出分享图片
  exportShareImage: function(canvas) {
    wx.canvasToTempFilePath({
      canvas: canvas,
      x: 0,
      y: 0,
      width: 600,
      height: 800,
      destWidth: 600,
      destHeight: 800,
      success: function(res) {
        wx.hideLoading()
        wx.saveImageToPhotosAlbum({
          filePath: res.tempFilePath,
          success: function() {
            wx.showToast({ title: '已保存到相册', icon: 'success' })
          },
          fail: function(err) {
            if (err.errMsg.indexOf('auth deny') > -1 || err.errMsg.indexOf('authorize') > -1) {
              wx.showModal({
                title: '提示',
                content: '需要您授权保存图片到相册',
                confirmText: '去授权',
                success: function(res) {
                  if (res.confirm) {
                    wx.openSetting()
                  }
                }
              })
            } else {
              wx.showToast({ title: '保存失败', icon: 'none' })
            }
          }
        })
      },
      fail: function() {
        wx.hideLoading()
        wx.showToast({ title: '生成失败', icon: 'none' })
      }
    })
  }
})
