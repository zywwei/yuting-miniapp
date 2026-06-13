/**
 * 音效管理工具
 * 使用微信小程序 InnerAudioContext 播放短音效
 * 由于小程序不支持直接生成音频，这里用 Base64 编码的极短音效
 */

// 音效管理器
class AudioManager {
  constructor() {
    this.enabled = false // 默认关闭音效
    this.volume = 0.5
  }

  // 开关音效
  toggle() {
    this.enabled = !this.enabled
    return this.enabled
  }

  // 播放简单的提示音（使用 oscillator 模拟）
  // 由于小程序限制，我们使用振动反馈代替音效
  vibrate(type = 'light') {
    if (!this.enabled) return
    try {
      if (type === 'light') {
        wx.vibrateShort({ type: 'light' })
      } else if (type === 'medium') {
        wx.vibrateShort({ type: 'medium' })
      } else if (type === 'heavy') {
        wx.vibrateHeavy()
      }
    } catch (e) {
      // 部分设备不支持振动
    }
  }

  // 画笔触感
  drawTouch() {
    this.vibrate('light')
  }

  // 橡皮触感
  eraserTouch() {
    this.vibrate('light')
  }

  // 保存成功
  saveSuccess() {
    this.vibrate('medium')
  }

  // 贴纸放置
  stickerPlace() {
    this.vibrate('medium')
  }

  // 刷牙打卡成功
  brushingSuccess() {
    this.vibrate('medium')
  }

  // 刷牙：区域切换提示（轻-重-轻）
  brushingAreaChange() {
    if (!this.enabled) return
    try {
      wx.vibrateShort({ type: 'light' })
      setTimeout(() => {
        wx.vibrateShort({ type: 'medium' })
      }, 100)
    } catch (e) {}
  }

  // 刷牙：每秒滴答（轻振动）
  brushingTick() {
    if (!this.enabled) return
    try {
      wx.vibrateShort({ type: 'light' })
    } catch (e) {}
  }

  // 刷牙：完成提示（连续三次）
  brushingComplete() {
    if (!this.enabled) return
    try {
      wx.vibrateShort({ type: 'medium' })
      setTimeout(() => wx.vibrateShort({ type: 'medium' }), 200)
      setTimeout(() => wx.vibrateShort({ type: 'heavy' }), 400)
    } catch (e) {}
  }

  // 刷牙：倒计时最后10秒（急促提示）
  brushingCountdown() {
    if (!this.enabled) return
    try {
      wx.vibrateHeavy()
    } catch (e) {}
  }

  // 删除/清空
  deleteAction() {
    this.vibrate('heavy')
  }

  // 撤销
  undoAction() {
    this.vibrate('light')
  }
}

// 创建单例
const audioManager = new AudioManager()

module.exports = audioManager
