/**
 * 朗读工具 - 支持真正的TTS语音合成
 * 支持百度TTS和Edge TTS两种引擎
 */

var beep = require('./beep.js')

var isSpeaking = false
var currentAudioContext = null

// TTS引擎配置
var TTS_ENGINES = {
  'edge': { name: 'Edge TTS', voice: 'zh-CN-XiaoxiaoNeural', desc: '微软语音，自然流畅' },
  'baidu': { name: '百度TTS', voice: '', desc: '百度语音，稳定可靠' }
}

// 当前使用的TTS引擎
var currentEngine = 'edge'

// 语音列表（Edge TTS可用的中文语音）
var EDGE_VOICE_LIST = [
  { id: 'zh-CN-XiaoxiaoNeural', name: '晓晓', desc: '温暖女声', gender: 'female' },
  { id: 'zh-CN-YunxiNeural', name: '云希', desc: '活力男声', gender: 'male' },
  { id: 'zh-CN-YunyangNeural', name: '云扬', desc: '专业男声', gender: 'male' },
  { id: 'zh-CN-XiaoyiNeural', name: '晓艺', desc: '活泼女声', gender: 'female' },
  { id: 'zh-CN-YunjianNeural', name: '云健', desc: '沉稳男声', gender: 'male' }
]

// 百度TTS音色列表（基础音库）
var BAIDU_VOICE_LIST = [
  { id: '0', name: '度小美', desc: '标准女主播' },
  { id: '1', name: '度小宇', desc: '亲切男声' },
  { id: '3', name: '度逍遥', desc: '情感男声' },
  { id: '4', name: '度丫丫', desc: '童声' }
]

// 预加载音效
function preload() {
  beep.preload()
  var childStorage = require('./child-storage.js')
  var savedEngine = childStorage.get('ttsEngine')
  var savedEdgeVoice = childStorage.get('ttsVoice')
  var savedBaiduVoice = childStorage.get('ttsBaiduVoice')
  
  console.log('preload加载设置:', { savedEngine, savedEdgeVoice, savedBaiduVoice })
  
  if (savedEngine && TTS_ENGINES[savedEngine]) {
    currentEngine = savedEngine
  }
  if (savedEdgeVoice) {
    TTS_ENGINES['edge'].voice = savedEdgeVoice
  }
  if (savedBaiduVoice) {
    TTS_ENGINES['baidu'].voice = savedBaiduVoice
  }
  
  console.log('preload完成，当前状态:', { currentEngine, TTS_ENGINES })
}

// 设置TTS引擎
function setEngine(engine) {
  console.log('setEngine调用:', engine, '当前currentEngine:', currentEngine)
  if (TTS_ENGINES[engine]) {
    currentEngine = engine
    var childStorage = require('./child-storage.js')
    childStorage.set('ttsEngine', engine)
    console.log('setEngine完成，新currentEngine:', currentEngine)
  } else {
    console.log('setEngine失败：无效的引擎', engine)
  }
}

// 获取当前引擎
function getEngine() {
  return currentEngine
}

// 获取引擎列表
function getEngineList() {
  var list = []
  for (var key in TTS_ENGINES) {
    list.push({
      id: key,
      name: TTS_ENGINES[key].name,
      desc: TTS_ENGINES[key].desc,
      active: key === currentEngine
    })
  }
  return list
}

// 设置语音（根据当前引擎自动区分）
function setVoice(voiceId) {
  console.log('setVoice调用:', voiceId, '当前currentEngine:', currentEngine)
  TTS_ENGINES[currentEngine].voice = voiceId
  var childStorage = require('./child-storage.js')
  if (currentEngine === 'edge') {
    childStorage.set('ttsVoice', voiceId)
  } else {
    childStorage.set('ttsBaiduVoice', voiceId)
  }
  console.log('setVoice完成，TTS_ENGINES:', TTS_ENGINES)
}

// 获取当前引擎的语音列表
function getVoiceList() {
  return currentEngine === 'edge' ? EDGE_VOICE_LIST : BAIDU_VOICE_LIST
}

// 获取当前语音
function getCurrentVoice() {
  return TTS_ENGINES[currentEngine].voice || (currentEngine === 'edge' ? EDGE_VOICE_LIST[0].id : BAIDU_VOICE_LIST[0].id)
}

// 朗读文字（使用TTS）
function speak(text, callback) {
  if (isSpeaking) {
    stopSpeak()
    if (callback) callback(false)
    return
  }
  
  if (!text || text.trim() === '') {
    if (callback) callback(false)
    return
  }
  
  isSpeaking = true
  
  // 振动反馈
  wx.vibrateShort({ type: 'medium' })
  
  // 调用云函数进行TTS
  var engine = TTS_ENGINES[currentEngine]
  var voice = engine.voice || (currentEngine === 'edge' ? 'zh-CN-XiaoxiaoNeural' : '')
  
  // 构建请求参数
  var requestData = {
    action: 'textToSpeech',
    text: text.substring(0, 1000)
  }
  
  // 根据当前引擎传递不同参数
  if (currentEngine === 'edge') {
    requestData.voice = voice
  } else if (currentEngine === 'baidu') {
    requestData.baiduPer = engine.voice || '0'
  }
  
  console.log('speak调用:', { 
    currentEngine, 
    voice, 
    engineVoice: engine.voice,
    requestData: requestData
  })
  
  wx.cloud.callFunction({
    name: 'ai-chat',
    data: requestData,
    success: function(result) {
      if (result.result && result.result.code === 0 && result.result.data.audio) {
        playAudio(result.result.data.audio, callback)
      } else {
        var errMsg = result.result ? result.result.msg : '未知错误'
        console.error('TTS失败:', errMsg)
        wx.showToast({ title: 'TTS: ' + errMsg, icon: 'none', duration: 3000 })
        fallbackSpeak(text, callback)
      }
    },
    fail: function(err) {
      console.error('TTS请求失败:', err)
      // 降级到提示音
      fallbackSpeak(text, callback)
    }
  })
}

// 播放音频
function playAudio(base64Audio, callback) {
  try {
    var fs = wx.getFileSystemManager()
    // 使用随机文件名避免缓存
    var tempPath = wx.env.USER_DATA_PATH + '/tts_audio_' + Date.now() + '.mp3'
    
    fs.writeFile({
      filePath: tempPath,
      data: wx.base64ToArrayBuffer(base64Audio),
      encoding: 'binary',
      success: function() {
        // 停止之前的播放
        if (currentAudioContext) {
          currentAudioContext.stop()
          currentAudioContext = null
        }
        
        currentAudioContext = wx.createInnerAudioContext()
        currentAudioContext.src = tempPath
        
        currentAudioContext.onPlay(function() {
          console.log('TTS开始播放')
        })
        
        currentAudioContext.onEnded(function() {
          console.log('TTS播放结束')
          isSpeaking = false
          currentAudioContext = null
          // 删除临时文件
          try { fs.unlinkSync(tempPath) } catch (e) {}
          if (callback) callback(true)
        })
        
        currentAudioContext.onError(function(err) {
          console.error('TTS播放失败:', err)
          isSpeaking = false
          currentAudioContext = null
          // 删除临时文件
          try { fs.unlinkSync(tempPath) } catch (e) {}
          if (callback) callback(false)
        })
        
        currentAudioContext.play()
      },
      fail: function(err) {
        console.error('写入音频文件失败:', err)
        isSpeaking = false
        if (callback) callback(false)
      }
    })
  } catch (err) {
    console.error('播放音频异常:', err)
    isSpeaking = false
    if (callback) callback(false)
  }
}

// 降级方案：静默失败，不打扰用户
function fallbackSpeak(text, callback) {
  isSpeaking = false
  if (callback) callback(false)
}

// 朗读成功提示
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
function speakChinese(text, callback) {
  speak(text, callback)
}

// 朗读英语
function speakEnglish(text, callback) {
  speak(text, callback)
}

// 朗读拼音
function speakPinyin(text, callback) {
  speak(text, callback)
}

// 朗读汉字（识字专用，强制使用Edge TTS以获得更好的中文发音）
function speakWord(text, callback) {
  if (isSpeaking) {
    stopSpeak()
    if (callback) callback(false)
    return
  }
  
  if (!text || text.trim() === '') {
    if (callback) callback(false)
    return
  }
  
  isSpeaking = true
  wx.vibrateShort({ type: 'medium' })
  
  // 识字功能强制使用Edge TTS，获取Edge音色设置
  var edgeVoice = TTS_ENGINES['edge'].voice || 'zh-CN-XiaoxiaoNeural'
  
  console.log('speakWord调用（识字专用）:', { text, edgeVoice })
  
  wx.cloud.callFunction({
    name: 'ai-chat',
    data: {
      action: 'textToSpeech',
      text: text.substring(0, 1000),
      voice: edgeVoice
    },
    success: function(result) {
      if (result.result && result.result.code === 0 && result.result.data.audio) {
        playAudio(result.result.data.audio, callback)
      } else {
        var errMsg = result.result ? result.result.msg : '未知错误'
        console.error('speakWord失败:', errMsg)
        fallbackSpeak(text, callback)
      }
    },
    fail: function(err) {
      console.error('speakWord请求失败:', err)
      fallbackSpeak(text, callback)
    }
  })
}

// 停止朗读
function stopSpeak() {
  isSpeaking = false
  if (currentAudioContext) {
    currentAudioContext.stop()
    currentAudioContext.destroy()
    currentAudioContext = null
  }
}

// 是否正在朗读
function getIsSpeaking() {
  return isSpeaking
}

module.exports = {
  speak: speak,
  speakSuccess: speakSuccess,
  speakChinese: speakChinese,
  speakEnglish: speakEnglish,
  speakPinyin: speakPinyin,
  speakWord: speakWord,
  stopSpeak: stopSpeak,
  preload: preload,
  setEngine: setEngine,
  getEngine: getEngine,
  getEngineList: getEngineList,
  setVoice: setVoice,
  getVoiceList: getVoiceList,
  getCurrentVoice: getCurrentVoice,
  getIsSpeaking: getIsSpeaking,
  testBaiduVoice: testBaiduVoice
}

// 测试百度TTS不同音色（调试用）
function testBaiduVoice(text) {
  if (!text || text.trim() === '') {
    text = '你好，我是测试语音'
  }

  var perList = [0, 1, 3, 4]
  var perNames = ['度小美女声', '度小宇男声', '度逍遥情感男声', '度丫丫童声']

  console.log('开始测试百度TTS音色...')

  perList.forEach(function(per, index) {
    setTimeout(function() {
      console.log('测试音色:', perNames[index], '(per=' + per + ')')

      wx.cloud.callFunction({
        name: 'ai-chat',
        data: {
          action: 'textToSpeech',
          text: text.substring(0, 100),
          baiduPer: String(per)
        },
        success: function(result) {
          if (result.result && result.result.code === 0 && result.result.data.audio) {
            console.log('音色', perNames[index], '成功，音频大小:', result.result.data.audio.length)
          } else {
            console.log('音色', perNames[index], '失败:', result.result)
          }
        },
        fail: function(err) {
          console.log('音色', perNames[index], '请求失败:', err)
        }
      })
    }, index * 3000) // 每个音色间隔3秒
  })
}
