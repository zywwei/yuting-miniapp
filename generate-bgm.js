/**
 * 背景音乐生成脚本
 * 运行此脚本生成欢快的背景音乐WAV文件
 * 使用方法：node generate-bgm.js
 */

const fs = require('fs')
const path = require('path')

const SAMPLE_RATE = 16000 // 优化采样率（最高音符C6=1047Hz，16000Hz完全足够）

// 音符频率映射（C大调）
const NOTES = {
  C4: 261.63, D4: 293.66, E4: 329.63, F4: 349.23, G4: 392.00, A4: 440.00, B4: 493.88,
  C5: 523.25, D5: 587.33, E5: 659.25, F5: 698.46, G5: 783.99, A5: 880.00, B5: 987.77,
  C3: 130.81, D3: 146.83, E3: 164.81, F3: 174.61, G3: 196.00, A3: 220.00, B3: 246.94
}

// 生成单个音符
function generateNote(freq, duration, volume = 0.3, type = 'sine') {
  const numSamples = Math.floor(SAMPLE_RATE * duration)
  const samples = new Float32Array(numSamples)

  for (let i = 0; i < numSamples; i++) {
    const t = i / SAMPLE_RATE
    const progress = i / numSamples

    // 包络：淡入淡出
    const fadeIn = Math.min(1, i / (SAMPLE_RATE * 0.02))
    const fadeOut = Math.max(0, 1 - (progress - 0.8) / 0.2)
    const envelope = fadeIn * fadeOut

    let sample = 0
    if (type === 'sine') {
      // 基频 + 泛音，让声音更丰富
      sample = Math.sin(2 * Math.PI * freq * t) * 0.6
      sample += Math.sin(2 * Math.PI * freq * 2 * t) * 0.25
      sample += Math.sin(2 * Math.PI * freq * 3 * t) * 0.1
      sample += Math.sin(2 * Math.PI * freq * 4 * t) * 0.05
    } else if (type === 'triangle') {
      // 三角波，更柔和
      sample = 2 * Math.abs(2 * (freq * t - Math.floor(freq * t + 0.5))) - 1
    }

    samples[i] = sample * envelope * volume
  }

  return samples
}

// 生成和弦
function generateChord(notes, duration, volume = 0.2) {
  const numSamples = Math.floor(SAMPLE_RATE * duration)
  const samples = new Float32Array(numSamples)

  for (const note of notes) {
    const noteSamples = generateNote(note, duration, volume / notes.length)
    for (let i = 0; i < numSamples; i++) {
      samples[i] += noteSamples[i]
    }
  }

  return samples
}

// 写入WAV文件头
function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i))
  }
}

function createWavHeader(totalSamples) {
  const buffer = new ArrayBuffer(44)
  const view = new DataView(buffer)

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

  return buffer
}

// 生成欢快的背景音乐
function generateHappyBGM() {
  console.log('🎵 开始生成欢快的背景音乐...')

  // 音乐参数
  const BPM = 120 // 每分钟120拍，欢快的节奏
  const beatDuration = 60 / BPM // 每拍时长

  // 定义旋律（音符序列）
  // 使用C大调，欢快的旋律，适合小朋友
  const melody = [
    // 第一段：欢快的开头 - 像小兔子跳跃
    { note: 'C5', duration: 0.5 },
    { note: 'E5', duration: 0.5 },
    { note: 'G5', duration: 0.5 },
    { note: 'C5', duration: 0.5 },

    { note: 'D5', duration: 0.5 },
    { note: 'F5', duration: 0.5 },
    { note: 'A5', duration: 0.5 },
    { note: 'D5', duration: 0.5 },

    { note: 'E5', duration: 0.5 },
    { note: 'G5', duration: 0.5 },
    { note: 'B5', duration: 0.5 },
    { note: 'E5', duration: 0.5 },

    { note: 'F5', duration: 0.5 },
    { note: 'A5', duration: 0.5 },
    { note: 'C5', duration: 0.5 },
    { note: 'F5', duration: 0.5 },

    // 第二段：重复但变化 - 像蝴蝶飞舞
    { note: 'G5', duration: 0.5 },
    { note: 'E5', duration: 0.5 },
    { note: 'C5', duration: 0.5 },
    { note: 'G5', duration: 0.5 },

    { note: 'A5', duration: 0.5 },
    { note: 'F5', duration: 0.5 },
    { note: 'D5', duration: 0.5 },
    { note: 'A5', duration: 0.5 },

    { note: 'B5', duration: 0.5 },
    { note: 'G5', duration: 0.5 },
    { note: 'E5', duration: 0.5 },
    { note: 'B5', duration: 0.5 },

    // 结尾：温馨的结束
    { note: 'C5', duration: 1.0 },
    { note: 'G4', duration: 0.5 },
    { note: 'C5', duration: 0.5 },
  ]

  // 定义和弦进行（温馨的C大调进行）
  const chords = [
    { notes: ['C4', 'E4', 'G4'], duration: 2.0 },  // C和弦
    { notes: ['F4', 'A4', 'C5'], duration: 2.0 },  // F和弦
    { notes: ['G4', 'B4', 'D5'], duration: 2.0 },  // G和弦
    { notes: ['C4', 'E4', 'G4'], duration: 2.0 },  // C和弦

    { notes: ['A3', 'C4', 'E4'], duration: 2.0 },  // Am和弦
    { notes: ['F4', 'A4', 'C5'], duration: 2.0 },  // F和弦
    { notes: ['G4', 'B4', 'D5'], duration: 2.0 },  // G和弦
    { notes: ['C4', 'E4', 'G4'], duration: 2.0 },  // C和弦
  ]

  // 计算总时长
  let totalDuration = 0
  for (const note of melody) {
    totalDuration += note.duration
  }

  console.log(`📊 音乐时长: ${totalDuration.toFixed(1)}秒`)

  // 生成一遍（循环播放由播放器控制）
  const totalSamples = Math.floor(SAMPLE_RATE * totalDuration)
  const samples = new Float32Array(totalSamples)

  // 生成旋律
  console.log('🎹 生成旋律...')
  let offset = 0
  for (let repeat = 0; repeat < 1; repeat++) {
    for (const note of melody) {
      const noteSamples = generateNote(NOTES[note.note], note.duration, 0.4, 'sine')
      for (let i = 0; i < noteSamples.length && offset + i < totalSamples; i++) {
        samples[offset + i] += noteSamples[i]
      }
      offset += Math.floor(SAMPLE_RATE * note.duration)
    }
  }

  // 生成和弦伴奏
  console.log('🎸 生成和弦伴奏...')
  offset = 0
  for (let repeat = 0; repeat < 1; repeat++) {
    for (const chord of chords) {
      const chordSamples = generateChord(chord.notes.map(n => NOTES[n]), chord.duration, 0.15)
      for (let i = 0; i < chordSamples.length && offset + i < totalSamples; i++) {
        samples[offset + i] += chordSamples[i]
      }
      offset += Math.floor(SAMPLE_RATE * chord.duration)
    }
  }

  // 添加简单的贝斯线
  console.log('🎸 生成贝斯线...')
  offset = 0
  for (let repeat = 0; repeat < 1; repeat++) {
    for (const chord of chords) {
      const bassNote = chord.notes[0] // 使用和弦根音
      const bassFreq = NOTES[bassNote] / 2 // 低一个八度
      const bassSamples = generateNote(bassFreq, chord.duration, 0.1, 'triangle')
      for (let i = 0; i < bassSamples.length && offset + i < totalSamples; i++) {
        samples[offset + i] += bassSamples[i]
      }
      offset += Math.floor(SAMPLE_RATE * chord.duration)
    }
  }

  // 归一化
  console.log('🔊 归一化音频...')
  let maxSample = 0
  for (let i = 0; i < samples.length; i++) {
    maxSample = Math.max(maxSample, Math.abs(samples[i]))
  }
  const normalizeFactor = 0.8 / maxSample
  for (let i = 0; i < samples.length; i++) {
    samples[i] *= normalizeFactor
  }

  // 转换为16位整数
  console.log('💾 转换为WAV格式...')
  const int16Samples = new Int16Array(totalSamples)
  for (let i = 0; i < totalSamples; i++) {
    int16Samples[i] = Math.floor(samples[i] * 32767)
  }

  // 创建WAV文件
  const headerBuffer = createWavHeader(totalSamples)
  const wavBuffer = new ArrayBuffer(44 + totalSamples * 2)
  const wavView = new DataView(wavBuffer)

  // 复制头部
  const headerView = new DataView(headerBuffer)
  for (let i = 0; i < 44; i++) {
    wavView.setUint8(i, headerView.getUint8(i))
  }

  // 写入音频数据
  for (let i = 0; i < totalSamples; i++) {
    wavView.setInt16(44 + i * 2, int16Samples[i], true)
  }

  console.log('✅ 背景音乐生成完成！')
  return Buffer.from(wavBuffer)
}

// 生成刷牙专属歌曲（2分钟，节奏感强）
function generateBrushingSong() {
  console.log('🦷 开始生成刷牙专属歌曲...')

  // 音乐参数 - 稍快一点，更有活力
  const BPM = 130

  // 刷牙歌曲旋律 - 重复性强，朗朗上口
  // 每段对应一个刷牙区域（20秒），共6段 = 120秒
  const melody = [
    // 第1段：左上 - 开始刷牙啦
    { note: 'C5', duration: 0.4 },
    { note: 'C5', duration: 0.4 },
    { note: 'G5', duration: 0.4 },
    { note: 'G5', duration: 0.4 },
    { note: 'A5', duration: 0.4 },
    { note: 'G5', duration: 0.4 },
    { note: 'F5', duration: 0.4 },
    { note: 'E5', duration: 0.4 },
    { note: 'C5', duration: 0.8 },

    // 第2段：上中 - 上刷刷下刷刷
    { note: 'D5', duration: 0.4 },
    { note: 'D5', duration: 0.4 },
    { note: 'A5', duration: 0.4 },
    { note: 'A5', duration: 0.4 },
    { note: 'B5', duration: 0.4 },
    { note: 'A5', duration: 0.4 },
    { note: 'G5', duration: 0.4 },
    { note: 'F5', duration: 0.4 },
    { note: 'D5', duration: 0.8 },

    // 第3段：右上 - 左刷刷右刷刷
    { note: 'E5', duration: 0.4 },
    { note: 'E5', duration: 0.4 },
    { note: 'C6', duration: 0.4 },
    { note: 'C6', duration: 0.4 },
    { note: 'D6', duration: 0.4 },
    { note: 'C6', duration: 0.4 },
    { note: 'B5', duration: 0.4 },
    { note: 'A5', duration: 0.4 },
    { note: 'E5', duration: 0.8 },

    // 第4段：右下 - 牙齿变白白
    { note: 'F5', duration: 0.4 },
    { note: 'F5', duration: 0.4 },
    { note: 'D5', duration: 0.4 },
    { note: 'D5', duration: 0.4 },
    { note: 'E5', duration: 0.4 },
    { note: 'D5', duration: 0.4 },
    { note: 'C5', duration: 0.4 },
    { note: 'B4', duration: 0.4 },
    { note: 'A4', duration: 0.8 },

    // 第5段：下中 - 好棒好棒
    { note: 'G5', duration: 0.4 },
    { note: 'G5', duration: 0.4 },
    { note: 'E5', duration: 0.4 },
    { note: 'E5', duration: 0.4 },
    { note: 'F5', duration: 0.4 },
    { note: 'E5', duration: 0.4 },
    { note: 'D5', duration: 0.4 },
    { note: 'C5', duration: 0.4 },
    { note: 'G4', duration: 0.8 },

    // 第6段：左下 - 完成啦
    { note: 'C5', duration: 0.4 },
    { note: 'E5', duration: 0.4 },
    { note: 'G5', duration: 0.4 },
    { note: 'C6', duration: 0.6 },
    { note: 'G5', duration: 0.4 },
    { note: 'E5', duration: 0.4 },
    { note: 'C5', duration: 0.8 },
  ]

  // 和弦进行 - 活泼的进行
  const chords = [
    // 每段9个音符 * 0.4 ≈ 3.6秒，用4秒的和弦
    { notes: ['C4', 'E4', 'G4'], duration: 3.6 },
    { notes: ['D4', 'F4', 'A4'], duration: 3.6 },
    { notes: ['E4', 'G4', 'B4'], duration: 3.6 },
    { notes: ['F4', 'A4', 'C5'], duration: 3.6 },
    { notes: ['G4', 'B4', 'D5'], duration: 3.6 },
    { notes: ['C4', 'E4', 'G4'], duration: 3.6 },
  ]

  // 计算总时长
  let totalDuration = 0
  for (const note of melody) {
    totalDuration += note.duration
  }

  console.log(`📊 音乐时长: ${totalDuration.toFixed(1)}秒`)

  const totalSamples = Math.floor(SAMPLE_RATE * totalDuration)
  const samples = new Float32Array(totalSamples)

  // 生成旋律
  console.log('🎹 生成刷牙旋律...')
  let offset = 0
  for (const note of melody) {
    const noteSamples = generateNote(NOTES[note.note], note.duration, 0.45, 'sine')
    for (let i = 0; i < noteSamples.length && offset + i < totalSamples; i++) {
      samples[offset + i] += noteSamples[i]
    }
    offset += Math.floor(SAMPLE_RATE * note.duration)
  }

  // 生成和弦伴奏
  console.log('🎸 生成和弦伴奏...')
  offset = 0
  for (const chord of chords) {
    const chordSamples = generateChord(chord.notes.map(n => NOTES[n]), chord.duration, 0.12)
    for (let i = 0; i < chordSamples.length && offset + i < totalSamples; i++) {
      samples[offset + i] += chordSamples[i]
    }
    offset += Math.floor(SAMPLE_RATE * chord.duration)
  }

  // 添加贝斯
  console.log('🎸 生成贝斯线...')
  offset = 0
  for (const chord of chords) {
    const bassFreq = NOTES[chord.notes[0]] / 2
    const bassSamples = generateNote(bassFreq, chord.duration, 0.08, 'triangle')
    for (let i = 0; i < bassSamples.length && offset + i < totalSamples; i++) {
      samples[offset + i] += bassSamples[i]
    }
    offset += Math.floor(SAMPLE_RATE * chord.duration)
  }

  // 添加节拍器般的打击节奏（每拍一个轻击）
  console.log('🥁 添加节拍...')
  const beatSamples = Math.floor(SAMPLE_RATE * 60 / BPM)
  for (let i = 0; i < totalSamples; i += beatSamples) {
    // 短促的高频点击
    for (let j = 0; j < Math.min(200, totalSamples - i); j++) {
      const t = j / SAMPLE_RATE
      const env = Math.exp(-t * 50) // 快速衰减
      samples[i + j] += Math.sin(2 * Math.PI * 1000 * t) * env * 0.05
    }
  }

  // 归一化
  console.log('🔊 归一化音频...')
  let maxSample = 0
  for (let i = 0; i < samples.length; i++) {
    maxSample = Math.max(maxSample, Math.abs(samples[i]))
  }
  const normalizeFactor = 0.8 / maxSample
  for (let i = 0; i < samples.length; i++) {
    samples[i] *= normalizeFactor
  }

  // 转换为16位整数
  console.log('💾 转换为WAV格式...')
  const int16Samples = new Int16Array(totalSamples)
  for (let i = 0; i < totalSamples; i++) {
    int16Samples[i] = Math.floor(samples[i] * 32767)
  }

  // 创建WAV文件
  const headerBuffer = createWavHeader(totalSamples)
  const wavBuffer = new ArrayBuffer(44 + totalSamples * 2)
  const wavView = new DataView(wavBuffer)

  const headerView = new DataView(headerBuffer)
  for (let i = 0; i < 44; i++) {
    wavView.setUint8(i, headerView.getUint8(i))
  }

  for (let i = 0; i < totalSamples; i++) {
    wavView.setInt16(44 + i * 2, int16Samples[i], true)
  }

  console.log('✅ 刷牙歌曲生成完成！')
  return Buffer.from(wavBuffer)
}

// 生成画画专属音乐（轻柔舒缓，适合创作）
function generateDrawingMusic() {
  console.log('🎨 开始生成画画专属音乐...')

  // 音乐参数 - 轻柔舒缓
  const BPM = 90

  // 画画音乐旋律 - 优美流畅，激发创造力
  const melody = [
    // 第一段：如流水般轻柔
    { note: 'E5', duration: 0.8 },
    { note: 'G5', duration: 0.6 },
    { note: 'A5', duration: 0.8 },
    { note: 'G5', duration: 0.6 },
    { note: 'E5', duration: 0.8 },
    { note: 'C5', duration: 0.6 },
    { note: 'D5', duration: 1.0 },

    // 第二段：像蝴蝶翩翩起舞
    { note: 'G5', duration: 0.6 },
    { note: 'A5', duration: 0.6 },
    { note: 'B5', duration: 0.8 },
    { note: 'A5', duration: 0.6 },
    { note: 'G5', duration: 0.6 },
    { note: 'E5', duration: 0.8 },
    { note: 'D5', duration: 0.6 },
    { note: 'C5', duration: 1.0 },

    // 第三段：温暖的回忆
    { note: 'C5', duration: 0.8 },
    { note: 'E5', duration: 0.6 },
    { note: 'G5', duration: 0.8 },
    { note: 'A5', duration: 0.6 },
    { note: 'G5', duration: 0.8 },
    { note: 'F5', duration: 0.6 },
    { note: 'E5', duration: 0.8 },
    { note: 'D5', duration: 1.0 },

    // 第四段：梦幻的结尾
    { note: 'A5', duration: 0.6 },
    { note: 'G5', duration: 0.6 },
    { note: 'E5', duration: 0.8 },
    { note: 'D5', duration: 0.6 },
    { note: 'C5', duration: 0.8 },
    { note: 'E5', duration: 0.6 },
    { note: 'C5', duration: 1.2 },
  ]

  // 柔和的和弦进行
  const chords = [
    { notes: ['C4', 'E4', 'G4'], duration: 4.0 },   // C
    { notes: ['A3', 'C4', 'E4'], duration: 4.0 },   // Am
    { notes: ['F4', 'A4', 'C5'], duration: 4.0 },   // F
    { notes: ['G4', 'B4', 'D5'], duration: 4.0 },   // G

    { notes: ['E4', 'G4', 'B4'], duration: 4.0 },   // Em
    { notes: ['A3', 'C4', 'E4'], duration: 4.0 },   // Am
    { notes: ['F4', 'A4', 'C5'], duration: 4.0 },   // F
    { notes: ['G4', 'B4', 'D5'], duration: 4.0 },   // G

    { notes: ['C4', 'E4', 'G4'], duration: 4.0 },   // C
    { notes: ['F4', 'A4', 'C5'], duration: 4.0 },   // F
    { notes: ['E4', 'G4', 'B4'], duration: 4.0 },   // Em
    { notes: ['G4', 'B4', 'D5'], duration: 4.0 },   // G

    { notes: ['A3', 'C4', 'E4'], duration: 4.0 },   // Am
    { notes: ['F4', 'A4', 'C5'], duration: 4.0 },   // F
    { notes: ['C4', 'E4', 'G4'], duration: 4.0 },   // C
    { notes: ['C4', 'E4', 'G4'], duration: 4.0 },   // C
  ]

  // 计算总时长
  let totalDuration = 0
  for (const note of melody) {
    totalDuration += note.duration
  }

  console.log(`📊 音乐时长: ${totalDuration.toFixed(1)}秒`)

  const totalSamples = Math.floor(SAMPLE_RATE * totalDuration)
  const samples = new Float32Array(totalSamples)

  // 生成旋律
  console.log('🎹 生成画画旋律...')
  let offset = 0
  for (const note of melody) {
    const noteSamples = generateNote(NOTES[note.note], note.duration, 0.35, 'sine')
    for (let i = 0; i < noteSamples.length && offset + i < totalSamples; i++) {
      samples[offset + i] += noteSamples[i]
    }
    offset += Math.floor(SAMPLE_RATE * note.duration)
  }

  // 生成和弦伴奏（更柔和）
  console.log('🎸 生成柔和和弦...')
  offset = 0
  for (const chord of chords) {
    const chordSamples = generateChord(chord.notes.map(n => NOTES[n]), chord.duration, 0.1)
    for (let i = 0; i < chordSamples.length && offset + i < totalSamples; i++) {
      samples[offset + i] += chordSamples[i]
    }
    offset += Math.floor(SAMPLE_RATE * chord.duration)
  }

  // 添加轻柔的贝斯
  console.log('🎸 生成贝斯线...')
  offset = 0
  for (const chord of chords) {
    const bassFreq = NOTES[chord.notes[0]] / 2
    const bassSamples = generateNote(bassFreq, chord.duration, 0.06, 'triangle')
    for (let i = 0; i < bassSamples.length && offset + i < totalSamples; i++) {
      samples[offset + i] += bassSamples[i]
    }
    offset += Math.floor(SAMPLE_RATE * chord.duration)
  }

  // 归一化
  console.log('🔊 归一化音频...')
  let maxSample = 0
  for (let i = 0; i < samples.length; i++) {
    maxSample = Math.max(maxSample, Math.abs(samples[i]))
  }
  const normalizeFactor = 0.8 / maxSample
  for (let i = 0; i < samples.length; i++) {
    samples[i] *= normalizeFactor
  }

  // 转换为16位整数
  console.log('💾 转换为WAV格式...')
  const int16Samples = new Int16Array(totalSamples)
  for (let i = 0; i < totalSamples; i++) {
    int16Samples[i] = Math.floor(samples[i] * 32767)
  }

  // 创建WAV文件
  const headerBuffer = createWavHeader(totalSamples)
  const wavBuffer = new ArrayBuffer(44 + totalSamples * 2)
  const wavView = new DataView(wavBuffer)

  const headerView = new DataView(headerBuffer)
  for (let i = 0; i < 44; i++) {
    wavView.setUint8(i, headerView.getUint8(i))
  }

  for (let i = 0; i < totalSamples; i++) {
    wavView.setInt16(44 + i * 2, int16Samples[i], true)
  }

  console.log('✅ 画画音乐生成完成！')
  return Buffer.from(wavBuffer)
}

// 主函数
function main() {
  console.log('🎨 钰婷的小画板 - 背景音乐生成器')
  console.log('==================================')

  try {
    // 确保目录存在
    const outputDir = path.join(__dirname, 'miniprogram', 'audio')
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true })
      console.log('📁 创建音频目录:', outputDir)
    }

    // 生成背景音乐
    console.log('\n[1/2] 生成背景音乐...')
    const bgmBuffer = generateHappyBGM()
    const bgmPath = path.join(outputDir, 'happy-bgm.wav')
    fs.writeFileSync(bgmPath, bgmBuffer)
    console.log(`📍 ${bgmPath} (${(bgmBuffer.length / 1024).toFixed(1)} KB)`)

    // 生成刷牙歌曲
    console.log('\n[2/3] 生成刷牙歌曲...')
    const brushingBuffer = generateBrushingSong()
    const brushingPath = path.join(outputDir, 'brushing-song.wav')
    fs.writeFileSync(brushingPath, brushingBuffer)
    console.log(`📍 ${brushingPath} (${(brushingBuffer.length / 1024).toFixed(1)} KB)`)

    // 生成画画音乐
    console.log('\n[3/3] 生成画画音乐...')
    const drawingBuffer = generateDrawingMusic()
    const drawingPath = path.join(outputDir, 'drawing-music.wav')
    fs.writeFileSync(drawingPath, drawingBuffer)
    console.log(`📍 ${drawingPath} (${(drawingBuffer.length / 1024).toFixed(1)} KB)`)

    console.log('')
    console.log('🎉 所有音乐已生成！')

  } catch (error) {
    console.error('❌ 生成失败:', error.message)
    process.exit(1)
  }
}

// 运行
main()
