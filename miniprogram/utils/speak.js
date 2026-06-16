/**
 * 朗读工具 - 使用音效+振动+文字提示
 * 由于微信同声传译插件申请失败，使用替代方案
 */

var beep = require('./beep.js')

var isSpeaking = false

// 预加载音效
function preload() {
  beep.preload()
}

// 朗读文字（音效+振动+文字提示）
function speak(text) {
  if (isSpeaking) return
  isSpeaking = true

  // 播放提示音
  beep.playBeep('tick')

  // 振动反馈
  wx.vibrateShort({ type: 'medium' })

  // 显示跟读提示
  wx.showToast({
    title: '跟读: ' + text,
    icon: 'none',
    duration: 2000
  })

  setTimeout(function() {
    isSpeaking = false
  }, 1500)
}

// 朗读成功
function speakSuccess() {
  beep.playBeep('complete')
  wx.vibrateShort({ type: 'heavy' })
  wx.showToast({
    title: '真棒！继续加油~',
    icon: 'success',
    duration: 1500
  })
}

// 朗读汉字
function speakChinese(text) {
  speak(text)
}

// 朗读英语
function speakEnglish(text) {
  speak(text)
}

// 朗读拼音
function speakPinyin(text) {
  speak(text)
}

// 停止朗读
function stopSpeak() {
  isSpeaking = false
}

module.exports = {
  speak: speak,
  speakSuccess: speakSuccess,
  speakChinese: speakChinese,
  speakEnglish: speakEnglish,
  speakPinyin: speakPinyin,
  stopSpeak: stopSpeak,
  preload: preload
}
