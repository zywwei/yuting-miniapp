/**
 * 背景音乐生成器
 * 生成欢快的儿童画画背景音乐 WAV 文件
 * 音乐风格：轻快、活泼、温馨，适合4岁小朋友画画时听
 */

const SAMPLE_RATE = 44100

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
    } else if (type === 'square') {
      // 方波，更明亮
      sample = Math.sin(2 * Math.PI * freq * t) > 0 ? 0.5 : -0.5
      sample += Math.sin(2 * Math.PI * freq * 3 * t) * 0.2
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
  // 音乐参数
  const BPM = 120 // 每分钟120拍，欢快的节奏
  const beatDuration = 60 / BPM // 每拍时长

  // 定义旋律（音符序列）
  // 使用C大调，欢快的旋律
  const melody = [
    // 第一段：欢快的开头
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

    // 第二段：重复但变化
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

    { note: 'C5', duration: 1.0 },
    { note: 'G4', duration: 0.5 },
    { note: 'C5', duration: 0.5 },
  ]

  // 定义和弦进行
  const chords = [
    { notes: ['C4', 'E4', 'G4'], duration: 2.0 },
    { notes: ['F4', 'A4', 'C5'], duration: 2.0 },
    { notes: ['G4', 'B4', 'D5'], duration: 2.0 },
    { notes: ['C4', 'E4', 'G4'], duration: 2.0 },

    { notes: ['A3', 'C4', 'E4'], duration: 2.0 },
    { notes: ['F4', 'A4', 'C5'], duration: 2.0 },
    { notes: ['G4', 'B4', 'D5'], duration: 2.0 },
    { notes: ['C4', 'E4', 'G4'], duration: 2.0 },
  ]

  // 计算总时长
  let totalDuration = 0
  for (const note of melody) {
    totalDuration += note.duration
  }

  // 为了循环播放，生成两遍
  const totalSamples = Math.floor(SAMPLE_RATE * totalDuration * 2)
  const samples = new Float32Array(totalSamples)

  // 生成旋律
  let offset = 0
  for (let repeat = 0; repeat < 2; repeat++) {
    for (const note of melody) {
      const noteSamples = generateNote(NOTES[note.note], note.duration, 0.4, 'sine')
      for (let i = 0; i < noteSamples.length && offset + i < totalSamples; i++) {
        samples[offset + i] += noteSamples[i]
      }
      offset += Math.floor(SAMPLE_RATE * note.duration)
    }
  }

  // 生成和弦伴奏
  offset = 0
  for (let repeat = 0; repeat < 2; repeat++) {
    for (const chord of chords) {
      const chordSamples = generateChord(chord.notes.map(n => NOTES[n]), chord.duration, 0.15)
      for (let i = 0; i < chordSamples.length && offset + i < totalSamples; i++) {
        samples[offset + i] += chordSamples[i]
      }
      offset += Math.floor(SAMPLE_RATE * chord.duration)
    }
  }

  // 添加简单的贝斯线
  offset = 0
  for (let repeat = 0; repeat < 2; repeat++) {
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
  let maxSample = 0
  for (let i = 0; i < samples.length; i++) {
    maxSample = Math.max(maxSample, Math.abs(samples[i]))
  }
  const normalizeFactor = 0.8 / maxSample
  for (let i = 0; i < samples.length; i++) {
    samples[i] *= normalizeFactor
  }

  // 转换为16位整数
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

  return wavBuffer
}

// 导出生成函数
module.exports = {
  generateHappyBGM
}
