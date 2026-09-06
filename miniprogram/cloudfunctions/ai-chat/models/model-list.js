const https = require('https')
const http = require('http')
const url = require('url')

const CACHE_COLLECTION = 'aiModelCache'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24小时

// 各平台的模型列表端点（openrouter/kilo/opencode 无需鉴权，其余需用户自己的 Key）
const MODEL_LIST_ENDPOINTS = {
  openrouter: {
    chat: 'https://openrouter.ai/api/v1/models',
    image: 'https://openrouter.ai/api/v1/images/models',
    headers: {
      'HTTP-Referer': 'https://yuting-miniapp.com',
      'X-Title': 'Yuting MiniApp'
    }
  },
  kilo: {
    chat: 'https://api.kilo.ai/api/gateway/v1/models'
  },
  opencode: {
    chat: 'https://opencode.ai/zen/v1/models'
  },
  minimax: {
    chat: 'https://api.minimax.chat/v1/models',
    needKey: true
  },
  zhipu: {
    chat: 'https://open.bigmodel.cn/api/paas/v4/models',
    needKey: true
  },
  kimi: {
    chat: 'https://api.moonshot.cn/v1/models',
    needKey: true
  },
  qwen: {
    // 聊天走原生接口，模型列表走 OpenAI 兼容模式（同一 Key 通用）
    chat: 'https://dashscope.aliyuncs.com/compatible-mode/v1/models',
    needKey: true
  },
  deepseek: {
    chat: 'https://api.deepseek.com/models',
    needKey: true
  },
  mimo: {
    chat: 'https://api.xiaomimimo.com/v1/models',
    needKey: true
  },
  'mimo-plan': {
    chat: 'https://token-plan-cn.xiaomimimo.com/v1/models',
    needKey: true
  },
  siliconflow: {
    chat: 'https://api.siliconflow.cn/v1/models',
    needKey: true
  }
  // wenxin（百度旧版 RPC）无标准 models 接口，暂不支持
}

// 无 Key 时的降级浏览：用 OpenRouter 免费列表按厂商前缀过滤（仅浏览不可选，
// 因 OpenRouter 的模型 id 与直连接口不通用；siliconflow 是聚合平台无对应前缀，不支持降级）
const BROWSE_FALLBACK_PREFIXES = {
  'minimax': ['minimax/'],
  'zhipu': ['z-ai/'],
  'kimi': ['moonshotai/'],
  'qwen': ['qwen/'],
  'deepseek': ['deepseek/'],
  'mimo': ['xiaomi/'],
  'mimo-plan': ['xiaomi/']
}

/**
 * 降级浏览（无 Key 时）
 */
async function browseFallbackModels(db, provider, forceRefresh) {
  const prefixes = BROWSE_FALLBACK_PREFIXES[provider]
  if (!prefixes) {
    return { code: -3, msg: '请先配置该供应商的API Key' }
  }
  const cacheKey = provider + '_chat_browse'
  const cached = await readCache(db, cacheKey, forceRefresh)
  if (cached) {
    return { code: 0, data: { models: cached, provider, type: 'chat', cached: true, browseOnly: true } }
  }
  const res = await httpsGetJson(MODEL_LIST_ENDPOINTS.openrouter.chat, MODEL_LIST_ENDPOINTS.openrouter.headers, 15000)
  if (res.code !== 0) {
    return res
  }
  const rawData = res.data
  const rawList = Array.isArray(rawData) ? rawData : (rawData.data || rawData.models || [])
  const models = (Array.isArray(rawList) ? rawList : [])
    .filter(m => m && m.id && prefixes.some(p => m.id.indexOf(p) === 0))
    .map(normalizeModel)
  if (models.length === 0) {
    return { code: -3, msg: '请先配置该供应商的API Key' }
  }
  await writeCache(db, cacheKey, models)
  return { code: 0, data: { models, provider, type: 'chat', cached: false, browseOnly: true } }
}

// 前端供应商 key → 模型列表平台（null 表示不支持）
const PROVIDER_PLATFORM_MAP = {
  'openrouter': 'openrouter',
  'kilo': 'kilo',
  'opencode': 'opencode',
  'minimax': 'minimax',
  'minimax-plan': 'minimax',
  'zhipu': 'zhipu',
  'zhipu-plan': 'zhipu',
  'kimi': 'kimi',
  'kimi-plan': 'kimi',
  'qwen': 'qwen',
  'deepseek': 'deepseek',
  'mimo': 'mimo',
  'mimo-plan': 'mimo-plan',
  'siliconflow': 'siliconflow',
  'wenxin': null,
  'wenxin-plan': null
}

// 同平台备用 key（plan 未配 key 时用 direct 的，反之亦然）
const PLATFORM_FALLBACK_KEYS = {
  'minimax': ['minimax', 'minimax-plan'],
  'zhipu': ['zhipu', 'zhipu-plan'],
  'kimi': ['kimi', 'kimi-plan'],
  'mimo': ['mimo'],
  'mimo-plan': ['mimo-plan']
}

/**
 * 解析供应商 key 对应的平台（不支持返回 null）
 */
function resolvePlatform(provider) {
  const platform = PROVIDER_PLATFORM_MAP[provider]
  if (!platform) return null
  return { key: platform, conf: MODEL_LIST_ENDPOINTS[platform] }
}

/**
 * 从配置中查找可用的 API Key（优先同 key，同平台备用）
 */
function findApiKey(models, provider) {
  if (models[provider] && models[provider].apiKey) {
    return models[provider].apiKey
  }
  const platform = PROVIDER_PLATFORM_MAP[provider]
  const fallbacks = (platform && PLATFORM_FALLBACK_KEYS[platform]) || []
  for (let i = 0; i < fallbacks.length; i++) {
    if (models[fallbacks[i]] && models[fallbacks[i]].apiKey) {
      return models[fallbacks[i]].apiKey
    }
  }
  return null
}

/**
 * HTTPS GET 并解析 JSON
 */
function httpsGetJson(targetUrl, headers, timeoutMs) {
  return new Promise((resolve) => {
    let parsedUrl
    try {
      parsedUrl = new URL(targetUrl)
    } catch (err) {
      resolve({ code: -1, msg: '无效的地址: ' + targetUrl })
      return
    }
    const isHttps = parsedUrl.protocol === 'https:'
    const httpModule = isHttps ? https : http
    const req = httpModule.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: headers || {}
    }, (res) => {
      let responseData = ''
      res.on('data', (chunk) => responseData += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData)
          if (res.statusCode === 200) {
            resolve({ code: 0, data: result })
          } else {
            resolve({ code: -1, msg: result.error?.message || ('HTTP ' + res.statusCode) })
          }
        } catch (err) {
          resolve({ code: -1, msg: '解析响应失败: ' + err.message })
        }
      })
    })
    req.setTimeout(timeoutMs || 15000, () => {
      req.destroy()
      resolve({ code: -1, msg: '请求超时' })
    })
    req.on('error', (err) => {
      resolve({ code: -1, msg: '网络请求失败: ' + err.message })
    })
    req.end()
  })
}

/**
 * 标准化模型条目（description 截断，避免单文档缓存超限）
 */
function normalizeModel(m) {
  const pricing = m.pricing || {}
  const promptPrice = parseFloat(pricing.prompt)
  const completionPrice = parseFloat(pricing.completion)
  // pricing 可能是字符串 "0"，统一用转换后的数值比较
  const isFree = !isNaN(promptPrice) && promptPrice === 0 && !isNaN(completionPrice) && completionPrice === 0
  const rawDesc = m.description || ''
  // 思考深度支持度（文本 models 返回数组，images models 返回对象，直连平台可能缺失）
  const sp = m.supported_parameters
  const spArr = Array.isArray(sp) ? sp : (sp && typeof sp === 'object' ? Object.keys(sp) : [])
  // 思考档位（OpenRouter reasoning 对象：supported_efforts 数组 / null 全接受 / 缺失不支持）
  const reasoning = m.reasoning || {}
  return {
    id: m.id,
    name: m.name || m.id,
    description: rawDesc.length > 200 ? rawDesc.slice(0, 200) : rawDesc,
    contextLength: m.context_length || (m.top_provider && m.top_provider.context_length) || null,
    pricing: {
      prompt: isNaN(promptPrice) ? null : promptPrice,
      completion: isNaN(completionPrice) ? null : completionPrice
    },
    isFree: isFree,
    supportsReasoning: spArr.indexOf('reasoning') > -1 || spArr.indexOf('reasoning_effort') > -1,
    supportsReasoningEffort: spArr.indexOf('reasoning_effort') > -1,
    reasoningEfforts: Array.isArray(reasoning.supported_efforts) ? reasoning.supported_efforts : (reasoning.supported_efforts === null ? null : undefined),
    defaultEffort: typeof reasoning.default_effort === 'string' ? reasoning.default_effort : null
  }
}

/**
 * 从缓存读取模型列表（forceRefresh 为 true 时跳过）
 */
async function readCache(db, cacheKey, forceRefresh) {
  if (forceRefresh) return null
  try {
    const res = await db.collection(CACHE_COLLECTION).doc(cacheKey).get()
    const doc = res.data
    if (doc && doc.models && doc.models.length > 0 && doc.updateTime) {
      const age = Date.now() - new Date(doc.updateTime).getTime()
      if (age < CACHE_TTL) return doc.models
    }
  } catch (err) {
    // 缓存不存在或读取失败，视为无缓存
  }
  return null
}

/**
 * 写入缓存（失败不影响主流程）
 */
async function writeCache(db, cacheKey, models) {
  try {
    const now = new Date()
    await db.collection(CACHE_COLLECTION).doc(cacheKey).set({
      data: { models, updateTime: now, expireAt: new Date(now.getTime() + CACHE_TTL * 2) }
    })
  } catch (err) {
    console.warn('模型列表缓存写入失败:', err.message)
  }
}

/**
 * 拉取平台模型列表
 * @param {Object} db - 云数据库实例
 * @param {string} provider - 前端供应商 key（如 minimax-plan，会映射到平台）
 * @param {string} type - 'chat' 文本模型 | 'image' 图片生成模型
 * @param {boolean} forceRefresh - 强制刷新（绕过缓存）
 * @param {string} apiKey - 需鉴权平台的用户 Key（无需鉴权的平台传空）
 * @returns {Promise<Object>} { code, msg?, data?: { models, provider, type, cached } }
 */
async function listModels(db, provider, type, forceRefresh, apiKey) {
  const platform = resolvePlatform(provider)
  if (!platform) {
    return { code: -4, msg: '该平台暂不支持模型列表同步' }
  }
  const endpointConf = platform.conf
  const endpoint = endpointConf[type]
  if (!endpoint) {
    return { code: -4, msg: '该平台暂不支持' + (type === 'image' ? '图片模型' : '文本模型') + '列表' }
  }
  if (endpointConf.needKey && !apiKey) {
    // 无 Key 时降级为公开浏览（仅可看不可选）；不支持降级的平台保持提示配 Key
    return browseFallbackModels(db, provider, forceRefresh)
  }

  // 同一平台端点共用缓存（如 minimax 与 minimax-plan），避免重复拉取
  const cacheKey = platform.key + '_' + type
  const cached = await readCache(db, cacheKey, forceRefresh)
  if (cached) {
    return { code: 0, data: { models: cached, provider, type, cached: true } }
  }

  const headers = Object.assign({}, endpointConf.headers)
  if (apiKey) headers['Authorization'] = 'Bearer ' + apiKey
  const res = await httpsGetJson(endpoint, headers, 15000)
  if (res.code !== 0) {
    // Key 无效时给明确提示
    if (res.msg && res.msg.indexOf('401') > -1) {
      return { code: -3, msg: 'API Key 无效，请检查配置' }
    }
    return res
  }

  const rawData = res.data
  const rawList = Array.isArray(rawData) ? rawData : (rawData.data || rawData.models || [])
  if (!Array.isArray(rawList) || rawList.length === 0) {
    return { code: -1, msg: '模型列表为空' }
  }

  const models = rawList
    .filter(m => m && m.id)
    .map(normalizeModel)

  await writeCache(db, cacheKey, models)
  return { code: 0, data: { models, provider, type, cached: false } }
}

module.exports = {
  listModels,
  resolvePlatform,
  findApiKey
}
