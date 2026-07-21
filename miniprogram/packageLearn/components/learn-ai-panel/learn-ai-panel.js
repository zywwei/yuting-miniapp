/**
 * 学习AI助手面板组件
 * 提供AI问答功能，支持快捷问题、表情、图片和全屏模式
 */

var aiManager = require('../../../utils/ai-manager.js')
var learnAIHelper = require('../../utils/learn-ai-helper.js')
var speakTool = require('../../../utils/speak.js')

// 常用表情列表
var EMOJI_LIST = [
  { id: 'face', emojis: ['😊', '😄', '😍', '🥰', '😎', '🤔', '😅', '😢', '😭', '😡', '🤗', '😏', '😴', '🤮', '🥳'] },
  { id: 'gesture', emojis: ['👍', '👎', '👏', '🙏', '💪', '✌️', '🤝', '👋', '👀', '🤙'] },
  { id: 'heart', emojis: ['❤️', '💕', '💖', '💗', '💓', '💞', '💟', '💝', '💘', '♥️'] },
  { id: 'symbol', emojis: ['🔥', '💯', '✅', '❌', '⭐', '🌟', '💫', '✨', '🎉', '🎊'] },
  { id: 'object', emojis: ['📚', '📖', '✏️', '📝', '🖊️', '💡', '🔑', '🎯', '🏆', '🥇'] }
]

Component({
  properties: {
    show: { type: Boolean, value: false },
    module: { type: String, value: '' },
    contextData: { type: Object, value: {} },
    quickQuestions: { type: Array, value: [] }
  },

  data: {
    messages: [],
    inputValue: '',
    isLoading: false,
    scrollTop: 0,
    scrollCount: 0,
    // 面板高度相关
    panelHeight: 95,  // 当前高度 vh（默认最大）
    minHeight: 40,    // 最小高度 vh
    maxHeight: 95,    // 最大高度 vh（接近全屏）
    isDragging: false,
    touchStartY: 0,
    touchStartHeight: 0,
    // 表情相关
    showEmoji: false,
    emojiList: EMOJI_LIST,
    currentEmojiCategory: 0,
    // 图片相关
    selectedImages: [],
    // 消息操作菜单
    showActionModal: false,
    actionMessage: {}
  },

  lifetimes: {
    detached: function() {
      this._isDetached = true
      this.cleanupWatcher()
    }
  },

  observers: {
    'show': function(show) {
      if (show && this.data.messages.length === 0) {
        this.addWelcomeMessage()
        // 缓存屏幕高度
        var systemInfo = wx.getSystemInfoSync()
        this._screenHeight = systemInfo.screenHeight
      }
      if (!show) {
        this.cleanupWatcher()
        this.setData({ panelHeight: 95, showEmoji: false, isDragging: false })
      }
    }
  },

  methods: {
    cleanupWatcher: function() {
      if (this._watcher) {
        this._watcher.close()
        this._watcher = null
      }
      this.setData({ taskId: null, isLoading: false })
    },

    addWelcomeMessage: function() {
      var welcomeMap = {
        cards: '你好呀！我是汉字小助手 📖 有什么关于这个字的问题，尽管问我吧！',
        poems: '你好呀！我是古诗小助手 🎋 对这首诗有什么好奇的，尽管问我！',
        english: '你好呀！我是英语小助手 🔤 关于这个单词的问题，随时问我！',
        math: '你好呀！我是数学小助手 🔢 有不懂的题目，我来帮你！'
      }
      var msgId = 'msg_welcome_' + Date.now()
      this.setData({
        messages: [{
          id: msgId,
          role: 'assistant',
          content: welcomeMap[this.data.module] || '你好！有什么问题可以问我哦！',
          thinking: ''
        }]
      })
    },

    // ===== 面板拖拽处理 =====
    onTouchStart: function(e) {
      this.setData({
        touchStartY: e.touches[0].clientY,
        touchStartHeight: this.data.panelHeight,
        isDragging: true
      })
    },

    onTouchMove: function(e) {
      if (!this.data.isDragging) return
      
      var startY = this.data.touchStartY
      var currentY = e.touches[0].clientY
      var diffY = startY - currentY  // 正数表示上拉，负数表示下拉
      
      // 将像素差转换为vh差（使用缓存的屏幕高度）
      var screenHeight = this._screenHeight || wx.getSystemInfoSync().screenHeight
      var diffVh = (diffY / screenHeight) * 100
      
      // 计算新高度，限制在最小和最大范围内
      var newHeight = Math.min(this.data.maxHeight,
                     Math.max(this.data.minHeight,
                     this.data.touchStartHeight + diffVh))
      
      this.setData({ panelHeight: newHeight })
    },

    onTouchEnd: function(e) {
      if (!this.data.isDragging) return
      
      var currentHeight = this.data.panelHeight
      
      // 如果接近最大高度，自动吸顶到全屏
      if (currentHeight > this.data.maxHeight - 10) {
        this.setData({ panelHeight: this.data.maxHeight, isDragging: false })
      } 
      // 如果接近最小高度，自动吸底到最小
      else if (currentHeight < this.data.minHeight + 10) {
        this.setData({ panelHeight: this.data.minHeight, isDragging: false })
      }
      // 否则停在当前位置
      else {
        this.setData({ isDragging: false })
      }
    },

    toggleFullScreen: function() {
      if (this.data.panelHeight > 80) {
        // 当前接近全屏，恢复到小窗口
        this.setData({ panelHeight: 40 })
      } else {
        // 当前是小窗口，切换到全屏
        this.setData({ panelHeight: this.data.maxHeight })
      }
    },

    // ===== 表情功能 =====
    toggleEmoji: function() {
      this.setData({ showEmoji: !this.data.showEmoji })
    },

    selectEmojiCategory: function(e) {
      var index = e.currentTarget.dataset.index
      this.setData({ currentEmojiCategory: index })
    },

    insertEmoji: function(e) {
      var emoji = e.currentTarget.dataset.emoji
      this.setData({
        inputValue: this.data.inputValue + emoji
      })
    },

    // ===== 图片功能 =====
    chooseImage: function() {
      var that = this
      var remainCount = 9 - this.data.selectedImages.length
      if (remainCount <= 0) {
        wx.showToast({ title: '最多选择9张图片', icon: 'none' })
        return
      }
      
      wx.chooseMedia({
        count: remainCount,
        mediaType: ['image'],
        sourceType: ['album', 'camera'],
        sizeType: ['compressed'],
        success: function(res) {
          var newImages = res.tempFiles.map(function(f) { return f.tempFilePath })
          that.setData({
            selectedImages: that.data.selectedImages.concat(newImages)
          })
        }
      })
    },

    removeImage: function(e) {
      var index = e.currentTarget.dataset.index
      var images = this.data.selectedImages.slice()
      images.splice(index, 1)
      this.setData({ selectedImages: images })
    },

    previewImage: function(e) {
      var url = e.currentTarget.dataset.url
      wx.previewImage({
        current: url,
        urls: this.data.selectedImages
      })
    },

    // ===== 消息发送 =====
    onTapQuickQuestion: function(e) {
      var question = e.currentTarget.dataset.question
      this.sendMessage(question)
    },

    sendMessage: function(question) {
      if ((!question && this.data.selectedImages.length === 0) || this.data.isLoading) return
      
      var that = this
      var module = this.data.module
      var contextData = this.data.contextData
      
      if (!contextData || Object.keys(contextData).length === 0) {
        wx.showToast({ title: '数据加载中，请稍后', icon: 'none' })
        return
      }
      
      var extraContext = learnAIHelper.buildContext(module, contextData)
      var skillPrompt = learnAIHelper.getSystemPrompt(module)
      var fullMessage = learnAIHelper.buildMessage(question || '请看这张图片', module, contextData)
      
      var msgId = 'msg_' + Date.now()
      var userMsg = {
        id: msgId + '_u',
        role: 'user',
        content: question || '',
        images: this.data.selectedImages.slice()
      }
      var aiMsg = {
        id: msgId + '_a',
        role: 'assistant',
        content: '',
        thinking: '',
        isStreaming: true,
        showThinking: true  // 思考中默认展开
      }
      
      var messages = this.data.messages.concat([userMsg, aiMsg])
      
      this.setData({
        messages: messages,
        inputValue: '',
        selectedImages: [],
        showEmoji: false,
        isLoading: true
      })
      this.scrollToBottom()
      
      this.cleanupWatcher()
      
      // 如果有图片，先上传
      if (userMsg.images.length > 0) {
        this.uploadImagesAndSend(fullMessage, userMsg.images, extraContext, skillPrompt)
      } else {
        this.sendToAI(fullMessage, null, extraContext, skillPrompt)
      }
    },

    uploadImagesAndSend: function(message, images, extraContext, skillPrompt) {
      var that = this
      
      // 上传图片到云存储
      var uploadTasks = images.map(function(imagePath, index) {
        return new Promise(function(resolve, reject) {
          var cloudPath = 'ai-chat/learn/' + Date.now() + '_' + index + '.jpg'
          wx.cloud.uploadFile({
            cloudPath: cloudPath,
            filePath: imagePath,
            success: function(res) {
              resolve(res.fileID)
            },
            fail: function(err) {
              reject(err)
            }
          })
        })
      })
      
      Promise.all(uploadTasks)
        .then(function(fileIDs) {
          that.sendToAI(message, fileIDs, extraContext, skillPrompt)
        })
        .catch(function(err) {
          console.error('图片上传失败:', err)
          that.updateLastAIMessage('图片上传失败，请重试 😅')
          that.setData({ isLoading: false })
        })
    },

    sendToAI: function(message, imageFileIDs, extraContext, skillPrompt) {
      var that = this
      
      aiManager.sendMessageStream(message, null, imageFileIDs, extraContext, skillPrompt)
        .then(function(result) {
          if (result && result.taskId) {
            that.setData({ taskId: result.taskId })
            that.watchProgress(result.taskId)
          }
        })
        .catch(function(err) {
          console.error('AI调用失败:', err)
          that.updateLastAIMessage('抱歉，我暂时无法回答这个问题 😅 请稍后再试。')
          that.setData({ isLoading: false })
        })
    },

    watchProgress: function(taskId) {
      var that = this
      var watcher = aiManager.watchThinkingProgress(
        taskId,
        function onChange(progress) {
          if (progress.status === 'thinking') {
            that.updateLastAIThinking(progress.thinkingContent || '')
          } else if (progress.status === 'completed' || progress.status === 'done') {
            that.updateLastAIMessage(progress.finalContent || '')
            that.setData({ isLoading: false, taskId: null })
            that._watcher = null
            if (watcher) watcher.close()
          } else if (progress.status === 'error') {
            that.updateLastAIMessage('回答出错了，请重试 😅')
            that.setData({ isLoading: false, taskId: null })
            that._watcher = null
            if (watcher) watcher.close()
          }
        },
        function onError(err) {
          console.error('监听失败:', err)
          that.setData({ isLoading: false })
          that._watcher = null
        }
      )
      this._watcher = watcher
    },

    updateLastAIMessage: function(content) {
      // 先折叠思考过程
      var messages = this.data.messages.slice()
      if (messages.length > 0) {
        messages[messages.length - 1] = Object.assign({}, messages[messages.length - 1], {
          showThinking: false
        })
        this.setData({ messages: messages })
      }
      
      // 开始打字机效果
      this.typeWriter(content, 0)
    },

    typeWriter: function(content, index) {
      var that = this
      
      // 如果组件已销毁或内容为空，停止打字
      if (that._isDetached || !content || index > content.length) {
        // 打字完成，更新最终状态
        var messages = this.data.messages.slice()
        if (messages.length > 0) {
          messages[messages.length - 1] = Object.assign({}, messages[messages.length - 1], {
            content: content,
            isStreaming: false
          })
          this.setData({ messages: messages })
          this.scrollToBottom()
        }
        return
      }
      
      // 显示当前字符
      var currentContent = content.substring(0, index)
      var messages = this.data.messages.slice()
      if (messages.length > 0) {
        messages[messages.length - 1] = Object.assign({}, messages[messages.length - 1], {
          content: currentContent,
          isStreaming: true
        })
        this.setData({ messages: messages })
      }
      
      // 每隔一段时间显示下一个字符
      var delay = 15  // 每个字符的延迟（毫秒），加快打字速度
      
      // 如果是标点符号，稍微停顿一下
      if (index > 0) {
        var lastChar = content[index - 1]
        if ('。！？'.indexOf(lastChar) !== -1) {
          delay = 80
        } else if ('，、；：'.indexOf(lastChar) !== -1) {
          delay = 40
        }
      }
      
      // 每隔一段时间滚动到底部
      if (index % 10 === 0) {
        this.scrollToBottom()
      }
      
      setTimeout(function() {
        that.typeWriter(content, index + 1)
      }, delay)
    },

    toggleThinking: function(e) {
      var id = e.currentTarget.dataset.id
      var messages = this.data.messages.map(function(msg) {
        if (msg.id === id) {
          return Object.assign({}, msg, { showThinking: !msg.showThinking })
        }
        return msg
      })
      this.setData({ messages: messages })
    },

    updateLastAIThinking: function(thinking) {
      var messages = this.data.messages.slice()
      if (messages.length > 0) {
        messages[messages.length - 1] = Object.assign({}, messages[messages.length - 1], {
          thinking: thinking
        })
        this.setData({ messages: messages })
      }
    },

    scrollToBottom: function() {
      var that = this
      var count = this.data.scrollCount + 1
      setTimeout(function() {
        that.setData({ 
          scrollTop: 100000 + count,
          scrollCount: count
        })
      }, 100)
    },

    onInputChange: function(e) {
      this.setData({ inputValue: e.detail.value })
    },

    onSend: function() {
      var value = this.data.inputValue.trim()
      if (value || this.data.selectedImages.length > 0) {
        this.sendMessage(value)
      }
    },

    onClose: function() {
      // 清理流式状态
      var messages = this.data.messages
      if (messages.length > 0 && messages[messages.length - 1].isStreaming) {
        var lastMsg = messages[messages.length - 1]
        if (!lastMsg.content) {
          messages = messages.slice(0, -1)
        } else {
          messages = messages.slice()
          messages[messages.length - 1] = Object.assign({}, lastMsg, { isStreaming: false })
        }
        this.setData({ messages: messages })
      }
      this.cleanupWatcher()
      this.setData({ isFullScreen: false, showEmoji: false })
      this.triggerEvent('close')
    },

    onClear: function() {
      this.cleanupWatcher()
      this.setData({ messages: [], selectedImages: [] })
      this.addWelcomeMessage()
    },

    // 语音朗读AI回复
    speakContent: function(e) {
      var that = this
      var id = e.currentTarget.dataset.id
      var content = e.currentTarget.dataset.content
      if (!content) return
      
      // 如果正在播放同一消息，停止播放
      if (speakTool.getIsSpeaking() && this.data.currentSpeakingId === id) {
        speakTool.stopSpeak()
        this.updateSpeakingState(id, false)
        return
      }
      
      // 停止之前的播放
      speakTool.stopSpeak()
      if (this.data.currentSpeakingId) {
        this.updateSpeakingState(this.data.currentSpeakingId, false)
      }
      
      // 提取纯文本
      var plainText = content.replace(/[#*`\[\]()!>~|]/g, '').replace(/\n+/g, '。').substring(0, 500)
      
      // 更新状态
      this.updateSpeakingState(id, true)
      
      // 使用speak工具朗读
      speakTool.speak(plainText, function(success) {
        that.updateSpeakingState(id, false)
      })
    },

    updateSpeakingState: function(id, isSpeaking) {
      var messages = this.data.messages.map(function(msg) {
        if (msg.id === id) {
          return Object.assign({}, msg, { isSpeaking: isSpeaking })
        }
        return msg
      })
      this.setData({
        messages: messages,
        currentSpeakingId: isSpeaking ? id : null
      })
    },

    // ===== 消息操作菜单 =====
    showMessageActions: function(e) {
      var id = e.currentTarget.dataset.id
      var role = e.currentTarget.dataset.role
      var content = e.currentTarget.dataset.content

      var message = this.data.messages.find(function(msg) {
        return msg.id === id
      })

      this.setData({
        showActionModal: true,
        actionMessage: {
          id: id,
          role: role,
          content: content
        }
      })
    },

    hideMessageActions: function() {
      this.setData({
        showActionModal: false,
        actionMessage: {}
      })
    },

    copyMessage: function(e) {
      var content = e.currentTarget.dataset.content
      if (!content) {
        wx.showToast({ title: '没有可复制的内容', icon: 'none' })
        return
      }
      wx.setClipboardData({
        data: content,
        success: function() {
          wx.showToast({ title: '已复制到剪贴板', icon: 'success' })
        }
      })
      this.hideMessageActions()
    },

    forwardMessage: function(e) {
      var content = e.currentTarget.dataset.content
      if (!content) {
        wx.showToast({ title: '没有可转发的内容', icon: 'none' })
        return
      }
      // 复制到剪贴板，用户可以粘贴发送
      wx.setClipboardData({
        data: content,
        success: function() {
          wx.showToast({ title: '已复制，可粘贴转发', icon: 'success' })
        }
      })
      this.hideMessageActions()
    },

    collectMessage: function(e) {
      var that = this
      var content = e.currentTarget.dataset.content
      if (!content) {
        wx.showToast({ title: '没有可收藏的内容', icon: 'none' })
        return
      }

      // 保存到本地收藏
      var childStorage = require('../../../utils/child-storage.js')
      var collects = childStorage.get('aiCollects') || []
      collects.unshift({
        id: 'collect_' + Date.now(),
        content: content,
        module: that.data.module,
        collectTime: new Date().toISOString()
      })
      // 最多保存100条
      if (collects.length > 100) {
        collects = collects.slice(0, 100)
      }
      childStorage.set('aiCollects', collects)

      wx.showToast({ title: '已收藏', icon: 'success' })
      this.hideMessageActions()
    },

    deleteMessage: function(e) {
      var that = this
      var id = e.currentTarget.dataset.id

      wx.showModal({
        title: '删除消息',
        content: '确定要删除这条消息吗？',
        confirmText: '删除',
        confirmColor: '#FF4444',
        success: function(res) {
          if (res.confirm) {
            var messages = that.data.messages.filter(function(msg) {
              return msg.id !== id
            })
            that.setData({ messages: messages })
            wx.showToast({ title: '已删除', icon: 'success' })
          }
        }
      })
      this.hideMessageActions()
    },

    preventBubble: function() {}
  }
})
