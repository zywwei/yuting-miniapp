Component({
  properties: {
    // 是否显示
    show: {
      type: Boolean,
      value: false
    },
    // 对话内容数组：[{ emoji, text, delay }]
    dialogues: {
      type: Array,
      value: []
    },
    // 章节信息
    chapter: {
      type: Object,
      value: null
    },
    // 对话类型：start(开始) / victory(胜利) / defeat(失败)
    type: {
      type: String,
      value: 'start'
    }
  },

  data: {
    currentDialogueIndex: 0,
    currentDialogue: null,
    showContent: false,
    typingText: '',
    typingComplete: false
  },

  // 定时器ID，用于清理
  _typingTimer: null,

  observers: {
    'show': function(show) {
      if (show && this.data.dialogues.length > 0) {
        this.startDialogue()
      } else if (!show) {
        // 隐藏时清理定时器
        this._clearTypingTimer()
      }
    }
  },

  // 组件销毁时清理定时器
  detached() {
    this._clearTypingTimer()
  },

  methods: {
    // 清理打字定时器
    _clearTypingTimer() {
      if (this._typingTimer) {
        clearTimeout(this._typingTimer)
        this._typingTimer = null
      }
    },

    // 开始对话
    startDialogue() {
      this._clearTypingTimer()
      this.setData({
        currentDialogueIndex: 0,
        currentDialogue: null,
        showContent: true,
        typingText: '',
        typingComplete: false
      })
      this.showNextDialogue()
    },

    // 显示下一句对话
    showNextDialogue() {
      const { dialogues, currentDialogueIndex } = this.data
      if (currentDialogueIndex >= dialogues.length) {
        this.endDialogue()
        return
      }

      const dialogue = dialogues[currentDialogueIndex]
      this.setData({
        currentDialogue: dialogue,
        typingText: '',
        typingComplete: false
      })

      // 打字机效果
      this._clearTypingTimer()
      this.typeText(dialogue.text, 0)
    },

    // 打字机效果
    typeText(text, index) {
      if (index <= text.length) {
        this.setData({
          typingText: text.substring(0, index)
        })
        this._typingTimer = setTimeout(() => {
          this._typingTimer = null
          this.typeText(text, index + 1)
        }, 50) // 每个字50ms
      } else {
        this.setData({ typingComplete: true })
      }
    },

    // 点击继续下一句
    onNextDialogue() {
      const { currentDialogueIndex, dialogues } = this.data
      if (currentDialogueIndex < dialogues.length - 1) {
        this.setData({
          currentDialogueIndex: currentDialogueIndex + 1
        })
        this.showNextDialogue()
      } else {
        this.endDialogue()
      }
    },

    // 结束对话
    endDialogue() {
      this._clearTypingTimer()
      this.setData({
        showContent: false,
        currentDialogue: null,
        currentDialogueIndex: 0
      })
      this.triggerEvent('complete')
    },

    // 跳过所有对话
    onSkip() {
      this.endDialogue()
    },

    // 阻止冒泡
    noop() {}
  }
})
