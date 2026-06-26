const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloudbase-d8gyw6k3f5ac78f76' })
const db = cloud.database()

// 导入AI模型调用模块 - 国内模型
const wenxin = require('./models/wenxin')
const qwen = require('./models/qwen')
const deepseek = require('./models/deepseek')
const minimax = require('./models/minimax')
const zhipu = require('./models/zhipu')
const kimi = require('./models/kimi')
const siliconflow = require('./models/siliconflow')
const mimo = require('./models/xiaomi') // MiMo模型使用小米的调用模块

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event

  // 获取用户身份
  const member = await getMemberByOpenid(OPENID)
  if (!member) {
    return { code: -1, msg: '未加入家庭' }
  }

  switch (action) {
    case 'getConfig':
      return await getConfig(member, event.childId)
    case 'saveConfig':
      return await saveConfig(member, event.childId, event.config)
    case 'chat':
      return await chat(member, event.childId, event.sessionId, event.message, event.model, event.imageFileID)
    case 'chatStream':
      return await chatStream(member, event.childId, event.sessionId, event.message, event.model, event.imageFileID)
    case 'getThinkingProgress':
      return await getThinkingProgress(event.taskId)
    case 'getUserPreference':
      return await getUserPreference(member, event.key)
    case 'saveUserPreference':
      return await saveUserPreference(member, event.key, event.value)
    case 'testConfig':
      return await testConfig(member, event.childId, event.model, event.apiKey, event.secretKey)
    case 'getHistory':
      return await getHistory(member, event.childId, event.sessionId, event.page, event.pageSize)
    case 'clearHistory':
      return await clearHistory(member, event.childId, event.sessionId)
    case 'getSessions':
      return await getSessions(member, event.childId)
    case 'deleteSession':
      return await deleteSession(member, event.childId, event.sessionId)
    default:
      return { code: -1, msg: '未知操作' }
  }
}

// 获取用户身份
async function getMemberByOpenid(openid) {
  const res = await db.collection('familyMembers')
    .where({ openid, status: 'active' })
    .get()
  return res.data[0] || null
}

// 获取AI配置
async function getConfig(member, childId) {
  try {
    const res = await db.collection('aiConfigs')
      .where({
        familyId: member.familyId,
        childId: childId || ''
      })
      .get()

    if (res.data.length > 0) {
      return { code: 0, data: res.data[0] }
    }

    // 返回默认配置
    return {
      code: 0,
      data: {
        familyId: member.familyId,
        childId: childId || '',
        currentModel: 'gpt-4o',
        models: {
          'gpt-4o': { apiKey: '', enabled: true },
          'claude-3.5': { apiKey: '', enabled: true },
          'wenxin': { apiKey: '', secretKey: '', enabled: true },
          'qwen': { apiKey: '', enabled: true },
          'deepseek': { apiKey: '', enabled: true }
        },
        systemPrompt: '',
        createTime: new Date(),
        updateTime: new Date()
      }
    }
  } catch (err) {
    return { code: -2, msg: '获取配置失败: ' + err.message }
  }
}

// 保存AI配置
async function saveConfig(member, childId, config) {
  try {
    // 查找现有配置
    const existing = await db.collection('aiConfigs')
      .where({
        familyId: member.familyId,
        childId: childId || ''
      })
      .get()

    // 合并models配置，避免覆盖已有的API Key
    let mergedModels = config.models || {}
    if (existing.data.length > 0 && existing.data[0].models) {
      mergedModels = { ...existing.data[0].models, ...config.models }
    }

    const data = {
      familyId: member.familyId,
      childId: childId || '',
      currentModel: config.currentModel,
      models: mergedModels,
      systemPrompt: config.systemPrompt || '',
      updateTime: new Date()
    }

    if (existing.data.length > 0) {
      // 更新现有配置
      await db.collection('aiConfigs')
        .doc(existing.data[0]._id)
        .update({ data })
    } else {
      // 创建新配置
      data.createTime = new Date()
      await db.collection('aiConfigs')
        .add({ data })
    }

    return { code: 0, msg: '配置保存成功' }
  } catch (err) {
    return { code: -2, msg: '保存配置失败: ' + err.message }
  }
}

// 测试API配置
async function testConfig(member, childId, model, apiKey, secretKey) {
  try {
    if (!apiKey) {
      return { code: -3, msg: '请先输入API Key' }
    }

    // 构建测试消息
    const messages = [{ role: 'user', content: '你好' }]
    
    // 调用AI模型测试
    let result
    switch (model) {
      case 'minimax':
      case 'minimax-plan':
        result = await minimax.callAPI(apiKey, messages, 'MiniMax-M3')
        break
      case 'zhipu':
      case 'zhipu-plan':
        result = await zhipu.callAPI(apiKey, messages, 'glm-5.2')
        break
      case 'kimi':
      case 'kimi-plan':
        result = await kimi.callAPI(apiKey, messages, 'kimi-k2.6')
        break
      case 'wenxin':
      case 'wenxin-plan':
        result = await wenxin.callAPI(apiKey, secretKey || '', messages, 'ernie-4.0-turbo-8k')
        break
      case 'qwen':
        result = await qwen.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'qwen3.7-max')
        break
      case 'deepseek':
        result = await deepseek.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'deepseek-v4-flash')
        break
      case 'deepseek-plan':
        result = await deepseek.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'deepseek-v4-flash')
        break
      case 'siliconflow':
        result = await siliconflow.callAPI(apiKey, messages, 'deepseek-ai/DeepSeek-V4')
        break
      case 'mimo':
        result = await mimo.callAPI(apiKey, messages, 'mimo-v2.5-pro', 'https://api.xiaomimimo.com/v1')
        break
      case 'mimo-plan':
        result = await mimo.callAPI(apiKey, messages, 'mimo-v2.5-pro', 'https://token-plan-cn.xiaomimimo.com/v1')
        break
      default:
        return { code: -4, msg: '不支持的模型: ' + model }
    }

    if (result.code === 0) {
      return { code: 0, msg: '测试成功！' }
    } else {
      return result
    }
  } catch (err) {
    return { code: -2, msg: '测试失败: ' + err.message }
  }
}

// 发送消息并获取AI回复
async function chat(member, childId, sessionId, message, model, imageFileID) {
  try {
    // 1. 输入验证
    if (!message && !imageFileID) {
      return { code: -5, msg: '消息内容不能为空' }
    }
    
    // 消息长度限制（4000字符）
    if (message && message.length > 4000) {
      return { code: -5, msg: '消息内容过长，请限制在4000字符以内' }
    }
    
    // 模型白名单验证
    const allowedModels = ['minimax', 'minimax-plan', 'zhipu', 'zhipu-plan', 'kimi', 'kimi-plan', 
                          'wenxin', 'wenxin-plan', 'qwen', 'deepseek', 'siliconflow', 'mimo', 'mimo-plan']
    const targetModel = model || 'default'
    if (model && !allowedModels.includes(model)) {
      return { code: -5, msg: '不支持的模型类型' }
    }

    // 2. 获取配置
    const configResult = await getConfig(member, childId)
    if (configResult.code !== 0) {
      return configResult
    }
    const config = configResult.data

    // 3. 检查API Key
    const modelConfig = config.models[model || config.currentModel]
    if (!modelConfig || !modelConfig.apiKey) {
      return { code: -3, msg: '请先配置API Key' }
    }

    // 4. 获取对话历史
    const historyResult = await getHistory(member, childId, sessionId, 1, 20)
    const history = historyResult.code === 0 ? historyResult.data.list : []

    // 5. 构建消息列表（支持图片）
    const messages = await buildMessages(config, history, message, imageFileID)

    // 6. 调用AI模型 - 国内模型（2026年6月最新版本）
    const aiModel = model || config.currentModel
    let result
    switch (aiModel) {
      case 'minimax':
        result = await minimax.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'MiniMax-M3')
        break
      case 'minimax-plan':
        result = await minimax.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'MiniMax-M3')
        break
      case 'zhipu':
        result = await zhipu.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'glm-5.2')
        break
      case 'zhipu-plan':
        result = await zhipu.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'glm-5.2')
        break
      case 'kimi':
        result = await kimi.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'kimi-k2.6')
        break
      case 'kimi-plan':
        result = await kimi.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'kimi-k2.7-code')
        break
      case 'wenxin':
        result = await wenxin.callAPI(modelConfig.apiKey, modelConfig.secretKey, messages, modelConfig.model || 'ernie-4.0-turbo-8k')
        break
      case 'wenxin-plan':
        result = await wenxin.callAPI(modelConfig.apiKey, modelConfig.secretKey, messages, modelConfig.model || 'ernie-4.0-turbo-8k')
        break
      case 'qwen':
        result = await qwen.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'qwen3.7-max')
        break
      case 'deepseek':
        result = await deepseek.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'deepseek-v4-flash')
        break
      case 'siliconflow':
        result = await siliconflow.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'deepseek-ai/DeepSeek-V4')
        break
      case 'mimo':
        result = await mimo.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'mimo-v2.5-pro', 'https://api.xiaomimimo.com/v1')
        break
      case 'mimo-plan':
        result = await mimo.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'mimo-v2.5-pro', 'https://token-plan-cn.xiaomimimo.com/v1')
        break
      default:
        return { code: -4, msg: '不支持的模型: ' + aiModel }
    }

    if (result.code !== 0) {
      return result
    }

    // 6. 保存用户消息和AI回复（并行执行）
    await Promise.all([
      saveMessage(member, childId, sessionId, 'user', message, aiModel),
      saveMessage(member, childId, sessionId, 'assistant', result.data.content, aiModel, result.data.usage, result.data.thinking)
    ])

    return {
      code: 0,
      data: {
        content: result.data.content,
        thinking: result.data.thinking || null,
        usage: result.data.usage
      }
    }
  } catch (err) {
    return { code: -2, msg: '对话失败: ' + err.message }
  }
}

// 构建消息列表
async function buildMessages(config, history, newMessage, imageFileID) {
  const messages = []

  // 系统提示词
  let systemPrompt = config.systemPrompt || ''
  
  // 如果没有自定义提示词，根据模板获取
  if (!systemPrompt && config.promptTemplate) {
    const templates = {
      'default': '你是{{childName}}的成长陪伴AI助手。请用亲切、友好的语气与他互动，回答他的各种问题，帮助他学习和成长。',
      'learning': '你是一位耐心的学习辅导老师，擅长用简单易懂的方式解释知识。请根据孩子的学习进度，用生动有趣的方式帮助他学习新知识。遇到难题时，用比喻和例子来解释，让孩子更容易理解。',
      'habit': '你是一位习惯养成专家，擅长用正面激励的方式帮助孩子养成好习惯。请根据孩子的打卡记录，给予鼓励和建议。当他完成目标时，要热情表扬；当他遇到困难时，要温柔鼓励，帮助他坚持下去。',
      'story': '你是一位创意故事大王，擅长根据孩子的兴趣和经历创作有趣的故事。请根据孩子的成长数据，创作富有想象力的故事。故事要生动有趣，富有教育意义，可以融入孩子的生活经历，让他感到亲切和有趣。',
      'coding': '你是一位编程教学专家，擅长用简单易懂的方式教孩子学习编程。请用生动的例子和有趣的项目，帮助孩子理解编程概念。代码示例要简洁明了，注释清晰，适合初学者理解。',
      'math': '你是一位数学辅导老师，擅长用直观的方式解释数学概念。请根据孩子的学习进度，用生活中的例子来解释数学问题。解题过程要详细清晰，帮助孩子理解解题思路，培养数学思维。'
    }
    systemPrompt = templates[config.promptTemplate] || templates['default']
  }
  
  if (systemPrompt) {
    messages.push({
      role: 'system',
      content: systemPrompt
    })
  }

  // 历史消息
  for (const item of history) {
    messages.push({
      role: item.role,
      content: item.content
    })
  }

  // 新消息（支持图片）
  if (imageFileID) {
    // 将云文件ID转换为临时URL
    let imageUrl = imageFileID
    if (imageFileID.startsWith('cloud://')) {
      try {
        const urlRes = await cloud.getTempFileURL({ fileList: [imageFileID] })
        if (urlRes.fileList && urlRes.fileList.length > 0 && urlRes.fileList[0].tempFileURL) {
          imageUrl = urlRes.fileList[0].tempFileURL
        }
      } catch (err) {
        console.error('获取图片临时链接失败:', err)
      }
    }
    
    // 多模态消息：包含图片和文本
    messages.push({
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: imageUrl }
        },
        {
          type: 'text',
          text: newMessage || '请描述这张图片'
        }
      ]
    })
  } else {
    messages.push({
      role: 'user',
      content: newMessage
    })
  }

  return messages
}

// 保存消息
async function saveMessage(member, childId, sessionId, role, content, model, usage, thinking) {
  try {
    await db.collection('aiChats').add({
      data: {
        familyId: member.familyId,
        childId: childId || '',
        sessionId: sessionId,
        role: role,
        content: content,
        thinking: thinking || null,
        model: model,
        tokenUsage: usage || null,
        createTime: new Date()
      }
    })
  } catch (err) {
    console.error('保存消息失败:', err)
  }
}

// 流式聊天 - 支持思考过程实时展示
async function chatStream(member, childId, sessionId, message, model, imageFileID) {
  try {
    // 1. 输入验证
    if (!message && !imageFileID) {
      return { code: -5, msg: '消息内容不能为空' }
    }
    
    // 消息长度限制（4000字符）
    if (message && message.length > 4000) {
      return { code: -5, msg: '消息内容过长，请限制在4000字符以内' }
    }
    
    // 模型白名单验证
    const allowedModels = ['minimax', 'minimax-plan', 'zhipu', 'zhipu-plan', 'kimi', 'kimi-plan', 
                          'wenxin', 'wenxin-plan', 'qwen', 'deepseek', 'siliconflow', 'mimo', 'mimo-plan']
    if (model && !allowedModels.includes(model)) {
      return { code: -5, msg: '不支持的模型类型' }
    }

    // 2. 获取配置
    const configResult = await getConfig(member, childId)
    if (configResult.code !== 0) {
      return configResult
    }
    const config = configResult.data

    // 3. 检查API Key
    const modelConfig = config.models[model || config.currentModel]
    if (!modelConfig || !modelConfig.apiKey) {
      return { code: -3, msg: '请先配置API Key' }
    }

    // 4. 获取对话历史
    const historyResult = await getHistory(member, childId, sessionId, 1, 20)
    const history = historyResult.code === 0 ? historyResult.data.list : []

    // 5. 构建消息列表（支持图片）
    const messages = await buildMessages(config, history, message, imageFileID)

    // 6. 创建任务记录
    const taskId = 'task_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    await db.collection('aiThinkingProgress').add({
      data: {
        taskId: taskId,
        familyId: member.familyId,
        childId: childId || '',
        sessionId: sessionId,
        status: 'thinking',
        thinkingContent: '',
        finalContent: '',
        model: model || config.currentModel,
        createTime: new Date(),
        updateTime: new Date(),
        expireAt: new Date(Date.now() + 2 * 60 * 60 * 1000) // 2小时后过期
      }
    })

    // 清理过期的思考记录（24小时前）
    const expireTime = new Date(Date.now() - 24 * 60 * 60 * 1000)
    await db.collection('aiThinkingProgress')
      .where({ createTime: db.command.lt(expireTime) })
      .limit(50)
      .get()
      .then(async function(res) {
        if (res.data && res.data.length > 0) {
          const deletePromises = res.data.map(item =>
            db.collection('aiThinkingProgress').doc(item._id).remove()
          )
          await Promise.all(deletePromises)
        }
      })
      .catch(function() {})

    // 7. 异步调用AI模型
    const aiModel = model || config.currentModel
    callAIWithProgress(aiModel, modelConfig, messages, taskId, member, childId, sessionId, message).catch(function(err) {
      console.error('流式AI调用异常:', err)
      updateThinkingProgress(taskId, 'error', err.message || '未知错误')
    })

    // 8. 立即返回任务ID
    return {
      code: 0,
      data: {
        taskId: taskId,
        status: 'thinking'
      }
    }
  } catch (err) {
    return { code: -2, msg: '对话失败: ' + err.message }
  }
}

// 异步调用AI并更新思考进度
async function callAIWithProgress(aiModel, modelConfig, messages, taskId, member, childId, sessionId, message) {
  try {
    // 更新状态为思考中
    await updateThinkingProgress(taskId, 'thinking', '正在思考中...')
    
    let result
    switch (aiModel) {
      case 'minimax':
        result = await minimax.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'MiniMax-M3')
        break
      case 'minimax-plan':
        result = await minimax.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'MiniMax-M3')
        break
      case 'zhipu':
        result = await zhipu.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'glm-5.2')
        break
      case 'zhipu-plan':
        result = await zhipu.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'glm-5.2')
        break
      case 'kimi':
        result = await kimi.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'kimi-k2.6')
        break
      case 'kimi-plan':
        result = await kimi.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'kimi-k2.7-code')
        break
      case 'wenxin':
        result = await wenxin.callAPI(modelConfig.apiKey, modelConfig.secretKey, messages, modelConfig.model || 'ernie-4.0-turbo-8k')
        break
      case 'wenxin-plan':
        result = await wenxin.callAPI(modelConfig.apiKey, modelConfig.secretKey, messages, modelConfig.model || 'ernie-4.0-turbo-8k')
        break
      case 'qwen':
        result = await qwen.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'qwen3.7-max')
        break
      case 'deepseek':
        result = await deepseek.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'deepseek-v4-flash')
        break
      case 'siliconflow':
        result = await siliconflow.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'deepseek-ai/DeepSeek-V4')
        break
      case 'mimo':
        result = await mimo.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'mimo-v2.5-pro', 'https://api.xiaomimimo.com/v1')
        break
      case 'mimo-plan':
        result = await mimo.callAPI(modelConfig.apiKey, messages, modelConfig.model || 'mimo-v2.5-pro', 'https://token-plan-cn.xiaomimimo.com/v1')
        break
      default:
        throw new Error('不支持的模型: ' + aiModel)
    }

    if (result.code !== 0) {
      await updateThinkingProgress(taskId, 'error', result.msg)
      return
    }

    // 更新思考内容
    if (result.data.thinking) {
      await updateThinkingProgress(taskId, 'thinking', result.data.thinking)
    }

    // 保存消息
    await Promise.all([
      saveMessage(member, childId, sessionId, 'user', message, aiModel),
      saveMessage(member, childId, sessionId, 'assistant', result.data.content, aiModel, result.data.usage, result.data.thinking)
    ])

    // 更新为完成状态
    await updateThinkingProgress(taskId, 'completed', result.data.thinking || '', result.data.content, result.data.usage)

  } catch (err) {
    console.error('AI调用失败:', err)
    await updateThinkingProgress(taskId, 'error', err.message)
  }
}

// 更新思考进度
async function updateThinkingProgress(taskId, status, thinkingContent, finalContent, usage) {
  try {
    const data = {
      status: status,
      updateTime: new Date()
    }
    
    if (thinkingContent !== undefined) {
      data.thinkingContent = thinkingContent
    }
    if (finalContent !== undefined) {
      data.finalContent = finalContent
    }
    if (usage !== undefined) {
      data.usage = usage
    }

    await db.collection('aiThinkingProgress')
      .where({ taskId: taskId })
      .update({ data: data })
  } catch (err) {
    console.error('更新思考进度失败:', err)
  }
}

// 获取思考进度
async function getThinkingProgress(taskId) {
  try {
    if (!taskId) {
      return { code: -5, msg: '缺少任务ID' }
    }

    const res = await db.collection('aiThinkingProgress')
      .where({ taskId: taskId })
      .get()

    if (res.data.length === 0) {
      return { code: -1, msg: '任务不存在' }
    }

    const progress = res.data[0]
    return {
      code: 0,
      data: {
        taskId: progress.taskId,
        status: progress.status,
        thinkingContent: progress.thinkingContent,
        finalContent: progress.finalContent,
        usage: progress.usage
      }
    }
  } catch (err) {
    return { code: -2, msg: '获取进度失败: ' + err.message }
  }
}

// 获取对话历史
async function getHistory(member, childId, sessionId, page, pageSize) {
  try {
    const where = {
      familyId: member.familyId,
      childId: childId || ''
    }
    if (sessionId) {
      where.sessionId = sessionId
    }

    const countRes = await db.collection('aiChats')
      .where(where)
      .count()

    const res = await db.collection('aiChats')
      .where(where)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      code: 0,
      data: {
        list: res.data.reverse(),
        total: countRes.total,
        page,
        pageSize
      }
    }
  } catch (err) {
    return { code: -2, msg: '获取历史失败: ' + err.message }
  }
}

// 清空对话历史
async function clearHistory(member, childId, sessionId) {
  try {
    const where = {
      familyId: member.familyId,
      childId: childId || ''
    }
    if (sessionId) {
      where.sessionId = sessionId
    }

    // 批量删除（每次最多删除20条，循环执行）
    let deleted = 0
    let hasMore = true
    
    while (hasMore) {
      const res = await db.collection('aiChats')
        .where(where)
        .limit(20)
        .get()
      
      if (res.data.length === 0) {
        hasMore = false
        break
      }
      
      // 批量删除当前批次
      const deletePromises = res.data.map(item => 
        db.collection('aiChats').doc(item._id).remove()
      )
      await Promise.all(deletePromises)
      deleted += res.data.length
      
      // 如果返回的数据少于20条，说明已经删完
      if (res.data.length < 20) {
        hasMore = false
      }
    }

    return { code: 0, msg: '历史已清空', data: { deleted } }
  } catch (err) {
    return { code: -2, msg: '清空历史失败: ' + err.message }
  }
}

// 获取会话列表
async function getSessions(member, childId) {
  try {
    const res = await db.collection('aiChats')
      .where({
        familyId: member.familyId,
        childId: childId || ''
      })
      .orderBy('createTime', 'desc')
      .limit(500) // 限制最多获取500条记录
      .get()

    // 按sessionId分组，获取每个会话的最新消息和统计信息
    const sessionMap = {}
    for (const item of res.data) {
      if (!sessionMap[item.sessionId]) {
        sessionMap[item.sessionId] = {
          sessionId: item.sessionId,
          lastMessage: item.content,
          lastTime: item.createTime,
          modelName: item.model || '未知模型',
          messageCount: 1,
          totalTokens: 0
        }
      } else {
        sessionMap[item.sessionId].messageCount++
      }
      
      // 累加token使用量
      if (item.tokenUsage) {
        const usage = item.tokenUsage
        sessionMap[item.sessionId].totalTokens += (usage.prompt_tokens || 0) + (usage.completion_tokens || 0)
      }
    }

    const sessions = Object.values(sessionMap)
    return { code: 0, data: sessions }
  } catch (err) {
    return { code: -2, msg: '获取会话列表失败: ' + err.message }
  }
}

// 删除会话
async function deleteSession(member, childId, sessionId) {
  try {
    await db.collection('aiChats')
      .where({
        familyId: member.familyId,
        childId: childId || '',
        sessionId: sessionId
      })
      .remove()

    return { code: 0, msg: '会话已删除' }
  } catch (err) {
    return { code: -2, msg: '删除会话失败: ' + err.message }
  }
}

// 获取用户偏好设置
async function getUserPreference(member, key) {
  try {
    const res = await db.collection('userPreferences')
      .where({
        openid: member.openid,
        key: key
      })
      .get()

    if (res.data.length > 0) {
      return { code: 0, data: { value: res.data[0].value } }
    }

    return { code: 0, data: { value: null } }
  } catch (err) {
    return { code: -2, msg: '获取偏好设置失败: ' + err.message }
  }
}

// 保存用户偏好设置
async function saveUserPreference(member, key, value) {
  try {
    const existing = await db.collection('userPreferences')
      .where({
        openid: member.openid,
        key: key
      })
      .get()

    if (existing.data.length > 0) {
      await db.collection('userPreferences')
        .doc(existing.data[0]._id)
        .update({
          data: {
            value: value,
            updateTime: new Date()
          }
        })
    } else {
      await db.collection('userPreferences')
        .add({
          data: {
            openid: member.openid,
            key: key,
            value: value,
            createTime: new Date(),
            updateTime: new Date()
          }
        })
    }

    return { code: 0, msg: '保存成功' }
  } catch (err) {
    return { code: -2, msg: '保存偏好设置失败: ' + err.message }
  }
}
