const https = require('https')
const http = require('http')
const url = require('url')

const CACHE_COLLECTION = 'aiModelCache'
const CACHE_TTL = 24 * 60 * 60 * 1000 // 24小时

// 各平台的模型列表端点（均为 OpenAI 兼容 GET /models，经实测无需鉴权）
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
  }
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
  return {
    id: m.id,
    name: m.name || m.id,
    description: rawDesc.length > 200 ? rawDesc.slice(0, 200) : rawDesc,
    contextLength: m.context_length || (m.top_provider && m.top_provider.context_length) || null,
    pricing: {
      prompt: isNaN(promptPrice) ? null : promptPrice,
      completion: isNaN(completionPrice) ? null : completionPrice
    },
    isFree: isFree
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
 * @param {string} provider - 平台 key（openrouter/kilo/opencode）
 * @param {string} type - 'chat' 文本模型 | 'image' 图片生成模型
 * @param {boolean} forceRefresh - 强制刷新（绕过缓存）
 * @returns {Promise<Object>} { code, msg?, data?: { models, provider, type, cached } }
 */
async function listModels(db, provider, type, forceRefresh) {
  const endpointConf = MODEL_LIST_ENDPOINTS[provider]
  if (!endpointConf) {
    return { code: -4, msg: '该平台暂不支持模型列表同步' }
  }
  const endpoint = endpointConf[type]
  if (!endpoint) {
    return { code: -4, msg: '该平台暂不支持' + (type === 'image' ? '图片模型' : '文本模型') + '列表' }
  }

  const cacheKey = provider + '_' + type
  const cached = await readCache(db, cacheKey, forceRefresh)
  if (cached) {
    return { code: 0, data: { models: cached, provider, type, cached: true } }
  }

  const res = await httpsGetJson(endpoint, endpointConf.headers, 15000)
  if (res.code !== 0) {
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
  listModels
}
