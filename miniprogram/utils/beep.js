/**
 * 欢快提示音 - 预加载版
 * 启动时生成所有音频文件并缓存播放器，播放时零延迟
 */

const SAMPLE_RATE = 44100
const fs = wx.getFileSystemManager()

// 播放器缓存池
const audioPool = {}
let initialized = false

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

function envelope(i, total) {
  const fadeIn = Math.min(1, i / (SAMPLE_RATE * 0.003))
  const fadeOut = Math.max(0, 1 - (i - total * 0.7) / (total * 0.3))
  return fadeIn * Math.max(fadeOut, 0)
}

// 生成带谐波的单音
function writeTone(view, startSample, totalSamples, freq, duration, volume) {
  const numSamples = Math.floor(SAMPLE_RATE * duration)
  for (let i = 0; i < numSamples; i++) {
    const idx = startSample + i
    if (idx >= totalSamples) break
    const t = i / SAMPLE_RATE
    const env = envelope(idx, totalSamples) * volume
    let sample = Math.sin(2 * Math.PI * freq * t) * 0.6
    sample += Math.sin(2 * Math.PI * freq * 2 * t) * 0.25
    sample += Math.sin(2 * Math.PI * freq * 3 * t) * 0.15
    view.setInt16(44 + idx * 2, Math.floor(sample * env * 32767), true)
  }
}

function createWav(view, totalSamples) {
  writeString(view, 0, 'RIFF')
  view.setUint32(4, 36 + totalSamples * 2, true)
  writeString(view, 8, 'WAVE')
  writeString(view, 12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, SAMPLE_RATE, true)
  view.setUint32(28, SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeString(view, 36, 'data')
  view.setUint32(40, totalSamples * 2, true)
}

// 预生成所有音频文件
function init() {
  if (initialized) return
  initialized = true

  const sounds = {
    // 每秒滴答 - 轻快的水滴声
    tick: { duration: 0.1, build: (view, total) => {
      writeTone(view, 0, total, 1200, 0.05, 0.25)
      writeTone(view, Math.floor(SAMPLE_RATE * 0.03), total, 800, 0.07, 0.2)
    }},
    // 区域切换 - 欢快的上行琶音
    areaChange: { duration: 0.5, build: (view, total) => {
      const s1 = 0, s2 = Math.floor(SAMPLE_RATE * 0.1), s3 = Math.floor(SAMPLE_RATE * 0.2), s4 = Math.floor(SAMPLE_RATE * 0.3)
      writeTone(view, s1, total, 523, 0.1, 0.4)  // C
      writeTone(view, s2, total, 659, 0.1, 0.45) // E
      writeTone(view, s3, total, 784, 0.1, 0.5)  // G
      writeTone(view, s4, total, 1047, 0.15, 0.55) // C高
    }},
    // 倒计时叮 - 清脆的叮声
    countdown: { duration: 0.15, build: (view, total) => {
      writeTone(view, 0, total, 1318, 0.08, 0.35)  // E6
      writeTone(view, Math.floor(SAMPLE_RATE * 0.05), total, 1568, 0.1, 0.3)  // G6
    }},
    // 完成庆祝 - 欢快的庆祝音效
    complete: { duration: 0.8, build: (view, total) => {
      // 快速上行
      writeTone(view, 0, total, 523, 0.1, 0.35)
      writeTone(view, Math.floor(SAMPLE_RATE * 0.08), total, 659, 0.1, 0.4)
      writeTone(view, Math.floor(SAMPLE_RATE * 0.16), total, 784, 0.1, 0.45)
      writeTone(view, Math.floor(SAMPLE_RATE * 0.24), total, 1047, 0.1, 0.5)
      // 大和弦
      const s5 = Math.floor(SAMPLE_RATE * 0.35)
      writeTone(view, s5, total, 523, 0.35, 0.3)
      writeTone(view, s5, total, 659, 0.35, 0.3)
      writeTone(view, s5, total, 784, 0.35, 0.3)
      writeTone(view, s5, total, 1047, 0.35, 0.25)
      writeTone(view, s5, total, 1318, 0.35, 0.2)
    }},
    // 开始 - 欢快的开始音效
    start: { duration: 0.4, build: (view, total) => {
      writeTone(view, 0, total, 659, 0.1, 0.35)  // E
      writeTone(view, Math.floor(SAMPLE_RATE * 0.1), total, 784, 0.1, 0.4)  // G
      writeTone(view, Math.floor(SAMPLE_RATE * 0.2), total, 1047, 0.15, 0.45) // C高
    }},
    // 贴纸放置 - 轻快的叮声
    sticker: { duration: 0.25, build: (view, total) => {
      writeTone(view, 0, total, 1047, 0.08, 0.3)
      writeTone(view, Math.floor(SAMPLE_RATE * 0.08), total, 1318, 0.12, 0.35)
    }},
    // 成就解锁 - 华丽的上行
    achievement: { duration: 1.0, build: (view, total) => {
      writeTone(view, 0, total, 523, 0.12, 0.3)
      writeTone(view, Math.floor(SAMPLE_RATE * 0.12), total, 659, 0.12, 0.35)
      writeTone(view, Math.floor(SAMPLE_RATE * 0.24), total, 784, 0.12, 0.4)
      writeTone(view, Math.floor(SAMPLE_RATE * 0.36), total, 1047, 0.12, 0.45)
      writeTone(view, Math.floor(SAMPLE_RATE * 0.48), total, 1318, 0.15, 0.5)
      const s6 = Math.floor(SAMPLE_RATE * 0.65)
      writeTone(view, s6, total, 1047, 0.3, 0.3)
      writeTone(view, s6, total, 1318, 0.3, 0.3)
      writeTone(view, s6, total, 1568, 0.3, 0.25)
    }}
  }

  for (const [name, config] of Object.entries(sounds)) {
    const totalSamples = Math.floor(SAMPLE_RATE * config.duration)
    const buffer = new ArrayBuffer(44 + totalSamples * 2)
    const view = new DataView(buffer)
    createWav(view, totalSamples)
    config.build(view, totalSamples)

    const filePath = `${wx.env.USER_DATA_PATH}/beep_${name}.wav`

    // 写入文件
    try {
      fs.writeFileSync(filePath, buffer, 'binary')
    } catch (e) {
      try { fs.mkdirSync(wx.env.USER_DATA_PATH, true) } catch (e2) {}
      try { fs.writeFileSync(filePath, buffer, 'binary') } catch (e3) {}
    }

    // 预创建播放器
    const ctx = wx.createInnerAudioContext()
    ctx.src = filePath
    ctx.volume = 0.85
    ctx.autoplay = false
    audioPool[name] = ctx
  }
}

// 播放指定音效
function playBeep(type) {
  try {
    const audio = require('./audio.js')
    if (!audio.enabled) return

    if (!initialized) init()

    const ctx = audioPool[type]
    if (!ctx) return

    // 停止上次播放，重新从头播放
    ctx.stop()
    ctx.seek(0)
    ctx.play()
  } catch (e) {}
}

// 页面加载时预初始化（可选）
function preload() {
  init()
}

module.exports = {
  playBeep,
  preload
}
