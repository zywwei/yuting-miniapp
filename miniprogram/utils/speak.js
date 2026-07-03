/**
 * 朗读工具 - 支持真正的TTS语音合成
 * 支持Edge TTS、百度TTS和大模型TTS三种引擎
 */

var beep = require('./beep.js')

var isSpeaking = false
var currentAudioContext = null

// TTS引擎配置
var TTS_ENGINES = {
  'edge': { name: 'Edge TTS', voice: 'zh-CN-XiaoxiaoNeural', desc: '微软语音，自然流畅', group: 'edge' },
  'baidu': { name: '百度TTS', voice: '', desc: '百度语音，稳定可靠', group: 'baidu' },
  'mimo': { name: '小米MiMo', voice: 'mimo-v2.5-tts', desc: '小米大模型语音，AI生成', group: 'llm' }
}

// TTS引擎分组
var TTS_ENGINE_GROUPS = {
  'edge': { name: 'Edge TTS', desc: '微软语音引擎' },
  'baidu': { name: '百度TTS', desc: '百度语音引擎' },
  'llm': { name: '大模型TTS', desc: 'AI大模型语音引擎' }
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

// 小米TTS音色列表（大模型TTS）
var MIMO_VOICE_LIST = [
  { id: 'mimo-v2.5-tts', name: 'MiMo TTS', desc: '小米大模型语音' }
]

// 百度TTS音色列表
var BAIDU_VOICE_LIST = [
  // 基础音库
  { id: '0', name: '度小美', desc: '标准女主播', group: '基础音库' },
  { id: '1', name: '度小宇', desc: '亲切男声', group: '基础音库' },
  { id: '3', name: '度逍遥', desc: '情感男声', group: '基础音库' },
  { id: '4', name: '度丫丫', desc: '童声', group: '基础音库' },
  // 精品音库
  { id: '5', name: '度小娇', desc: '成熟女主播', group: '精品音库' },
  { id: '103', name: '度米朵', desc: '可爱童声', group: '精品音库' },
  { id: '106', name: '度博文', desc: '专业男主播', group: '精品音库' },
  { id: '110', name: '度小童', desc: '童声主播', group: '精品音库' },
  { id: '111', name: '度小萌', desc: '软萌妹子', group: '精品音库' },
  { id: '5003', name: '度逍遥', desc: '情感男声', group: '精品音库' },
  { id: '5118', name: '度小鹿', desc: '甜美女声', group: '精品音库' },
  // 臻品音库
  { id: '4003', name: '度逍遥', desc: '情感男声', group: '臻品音库' },
  { id: '4100', name: '度小雯', desc: '活力女主播', group: '臻品音库' },
  { id: '4103', name: '度米朵', desc: '可爱女声', group: '臻品音库' },
  { id: '4105', name: '度灵儿', desc: '清激女声', group: '臻品音库' },
  { id: '4106', name: '度博文', desc: '专业男主播', group: '臻品音库' },
  { id: '4114', name: '阿龙', desc: '说书男声', group: '臻品音库' },
  { id: '4115', name: '度小贤', desc: '电台男主播', group: '臻品音库' },
  { id: '4117', name: '度小乔', desc: '活泼女声', group: '臻品音库' },
  { id: '4119', name: '度小鹿', desc: '甜美女声', group: '臻品音库' },
  { id: '4129', name: '度小彦', desc: '知识男主播', group: '臻品音库' },
  { id: '4132', name: '度阿闽', desc: '闽南男声', group: '臻品音库' },
  { id: '4134', name: '度阿锦', desc: '东北女声', group: '臻品音库' },
  { id: '4139', name: '度小蓉', desc: '四川女声', group: '臻品音库' },
  { id: '4140', name: '度小新', desc: '专业女主播', group: '臻品音库' },
  { id: '4141', name: '度婉婉', desc: '甜美女声', group: '臻品音库' },
  { id: '4143', name: '度清风', desc: '配音男声', group: '臻品音库' },
  { id: '4144', name: '度姗姗', desc: '娱乐女声', group: '臻品音库' },
  { id: '4147', name: '度云朵', desc: '可爱童声', group: '臻品音库' },
  { id: '4148', name: '度小夏', desc: '甜美女声', group: '臻品音库' },
  { id: '4149', name: '度星河', desc: '广告男声', group: '臻品音库' },
  { id: '4150', name: '度湘玉', desc: '陕西女声', group: '臻品音库' },
  { id: '4154', name: '度老崔', desc: '北京男声', group: '臻品音库' },
  { id: '4156', name: '度言浩', desc: '年轻男声', group: '臻品音库' },
  { id: '4157', name: '度言静', desc: '明亮女声', group: '臻品音库' },
  { id: '4164', name: '度阿肯', desc: '主播男声', group: '臻品音库' },
  { id: '4172', name: '度筱林', desc: '天津女声', group: '臻品音库' },
  { id: '4176', name: '度有为', desc: '磁性男声', group: '臻品音库' },
  { id: '4192', name: '度青川', desc: '温柔男声', group: '臻品音库' },
  { id: '4206', name: '度博文', desc: '综艺男声', group: '臻品音库' },
  { id: '4226', name: '南方', desc: '电台女主播', group: '臻品音库' },
  { id: '4254', name: '度小清', desc: '广告女声', group: '臻品音库' },
  { id: '4257', name: '四川小哥', desc: '四川男声', group: '臻品音库' },
  { id: '4259', name: '度小新', desc: '播音女声', group: '臻品音库' },
  { id: '4277', name: '西贝', desc: '脱口秀女声', group: '臻品音库' },
  { id: '4278', name: '度小贝', desc: '知识女主播', group: '臻品音库' },
  { id: '4288', name: '度晴岚', desc: '甜美女声', group: '臻品音库' },
  { id: '5147', name: '度常盈', desc: '电台女主播', group: '臻品音库' },
  { id: '5153', name: '度常悦', desc: '民生女主播', group: '臻品音库' },
  { id: '5971', name: '度皮特', desc: '老外男声', group: '臻品音库' },
  { id: '5976', name: '度小皮', desc: '萌娃童声', group: '臻品音库' },
  { id: '5977', name: '台媒女声', desc: '台湾女声', group: '臻品音库' },
  { id: '5980', name: '度阿花', desc: '上海女声', group: '臻品音库' },
  { id: '6205', name: '度悠然', desc: '旁白男声', group: '臻品音库' },
  { id: '6221', name: '度云萱', desc: '旁白女声', group: '臻品音库' },
  { id: '6543', name: '度雨萌', desc: '邻家女孩', group: '臻品音库' },
  { id: '6546', name: '度清豪', desc: '逍遥侠客', group: '臻品音库' },
  { id: '6561', name: '度小乐', desc: '可爱童声', group: '臻品音库' },
  { id: '6562', name: '度雨楠', desc: '元气少女', group: '臻品音库' },
  { id: '6602', name: '度清柔', desc: '温柔男神', group: '臻品音库' },
  { id: '6644', name: '度书宁', desc: '亲和女声', group: '臻品音库' },
  { id: '6746', name: '度书道', desc: '沉稳男声', group: '臻品音库' },
  { id: '6747', name: '度书古', desc: '情感男声', group: '臻品音库' },
  { id: '6748', name: '度书严', desc: '沉稳男声', group: '臻品音库' },
  // 大模型音库
  { id: '4007', name: '度小台', desc: '台湾女声', group: '大模型音库' },
  { id: '4146', name: '度禧禧', desc: '阳光女声', group: '大模型音库' },
  { id: '4179', name: '度泽言', desc: '温暖男声', group: '大模型音库' },
  { id: '4189', name: '度涵竹', desc: '开朗女声', group: '大模型音库' },
  { id: '4193', name: '度泽言', desc: '开朗男声', group: '大模型音库' },
  { id: '4194', name: '度嫣然', desc: '活泼女声', group: '大模型音库' },
  { id: '4195', name: '度怀安', desc: '磁性男声', group: '大模型音库' },
  { id: '4196', name: '度清影', desc: '甜美女声', group: '大模型音库' },
  { id: '4197', name: '度沁遥', desc: '知性女声', group: '大模型音库' },
  { id: '6567', name: '度小柔', desc: '温柔女声', group: '大模型音库' }
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
      group: TTS_ENGINES[key].group,
      active: key === currentEngine
    })
  }
  return list
}

// 获取引擎分组列表
function getEngineGroups() {
  return TTS_ENGINE_GROUPS
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
  if (currentEngine === 'edge') {
    return EDGE_VOICE_LIST
  } else if (currentEngine === 'mimo') {
    return MIMO_VOICE_LIST
  }
  
  // 返回百度TTS音色列表（包含分组信息）
  return BAIDU_VOICE_LIST
}

// 获取百度TTS音色分组列表
function getBaiduVoiceGroups() {
  var groups = {}
  BAIDU_VOICE_LIST.forEach(function(voice) {
    if (!groups[voice.group]) {
      groups[voice.group] = []
    }
    groups[voice.group].push(voice)
  })
  return groups
}

// 获取当前语音
function getCurrentVoice() {
  if (currentEngine === 'edge') {
    return TTS_ENGINES[currentEngine].voice || EDGE_VOICE_LIST[0].id
  } else if (currentEngine === 'mimo') {
    return TTS_ENGINES[currentEngine].voice || MIMO_VOICE_LIST[0].id
  }
  return TTS_ENGINES[currentEngine].voice || BAIDU_VOICE_LIST[0].id
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
  } else if (currentEngine === 'mimo') {
    requestData.mimoVoice = engine.voice || 'mimo-v2.5-tts'
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
  getEngineGroups: getEngineGroups,
  setVoice: setVoice,
  getVoiceList: getVoiceList,
  getBaiduVoiceGroups: getBaiduVoiceGroups,
  getCurrentVoice: getCurrentVoice,
  getIsSpeaking: getIsSpeaking,
  testBaiduVoice: testBaiduVoice
}

// 测试百度TTS不同音色（调试用）
function testBaiduVoice(text) {
  if (!text || text.trim() === '') {
    text = '你好，我是测试语音'
  }

  console.log('开始测试百度TTS音色...')
  console.log('音色列表:', BAIDU_VOICE_LIST.map(function(v) { return v.name + '(' + v.id + ')' }).join(', '))

  BAIDU_VOICE_LIST.forEach(function(voice, index) {
    setTimeout(function() {
      console.log('测试音色:', voice.name, '(per=' + voice.id + ')')

      wx.cloud.callFunction({
        name: 'ai-chat',
        data: {
          action: 'textToSpeech',
          text: text.substring(0, 100),
          baiduPer: voice.id
        },
        success: function(result) {
          if (result.result && result.result.code === 0 && result.result.data.audio) {
            console.log('音色', voice.name, '成功，音频大小:', result.result.data.audio.length)
          } else {
            console.log('音色', voice.name, '失败:', result.result)
          }
        },
        fail: function(err) {
          console.log('音色', voice.name, '请求失败:', err)
        }
      })
    }, index * 3000) // 每个音色间隔3秒
  })
}
