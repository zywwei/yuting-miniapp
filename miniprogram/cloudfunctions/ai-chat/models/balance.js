const https = require('https')
const http = require('http')
const zlib = require('zlib')

const BALANCE_CACHE_COLLECTION = 'aiModelCache'
const BALANCE_CACHE_TTL = 10 * 60 * 1000 // 10分钟（余额变化快，缓存不宜长）

// 各平台余额查询端点（经实测/文档确认；kilo/opencode/智谱/通义/文心/minimax按量无公开接口）
const BALANCE_ENDPOINTS = {
  deepseek: {
    url: 'https://api.deepseek.com/user/balance',
    parse: 'deepseek'
  },
  openrouter: {
    url: 'https://openrouter.ai/api/v1/credits',
    parse: 'openrouter',
    headers: {
      'HTTP-Referer': 'https://yuting-miniapp.com',
      'X-Title': 'Yuting MiniApp'
    }
  },
  siliconflow: {
    url: 'https://api.siliconflow.cn/v1/user/info',
    parse: 'generic'
  },
  kimi: {
    url: 'https://api.moonshot.cn/v1/users/me/balance',
    parse: 'kimi'
  },
  // 小米（mimo/mimo-plan）：无 Bearer Key 可用的余额接口（多个候选路径实测均为 404，
  // 余额只能网页 cookie 查询），暂不支持
  'minimax-plan': {
    url: 'https://www.minimaxi.com/v1/token_plan/remains',
    parse: 'generic'
  }
}

// 前端供应商 key → 余额平台（无条目表示不支持）
const PROVIDER_BALANCE_MAP = {
  'deepseek': 'deepseek',
  'openrouter': 'openrouter',
  'siliconflow': 'siliconflow',
  'kimi': 'kimi',
  'kimi-plan': 'kimi',
  'minimax-plan': 'minimax-plan'
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
      resolve({ code: -1, msg: '无效的地址' })
      return
    }
    const isHttps = parsedUrl.protocol === 'https:'
    const httpModule = isHttps ? https : http
    const req = httpModule.request({
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: 'GET',
      headers: Object.assign({ 'Accept-Encoding': 'gzip, deflate' }, headers || {})
    }, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => {
        try {
          // 解压（部分平台返回 gzip，如小米）
          let buffer = Buffer.concat(chunks)
          const encoding = res.headers['content-encoding'] || ''
          if (encoding.indexOf('gzip') > -1) {
            buffer = zlib.gunzipSync(buffer)
          } else if (encoding.indexOf('deflate') > -1) {
            buffer = zlib.inflateSync(buffer)
          }
          const responseData = buffer.toString('utf8')
          // 先检查状态码，非 200 直接报错（避免把 HTML 错误页当 JSON 解析）
          if (res.statusCode !== 200) {
            console.error(`[余额查询失败] url=${targetUrl} status=${res.statusCode} body=${responseData.slice(0, 200)}`)
            resolve({ code: -1, msg: 'HTTP ' + res.statusCode })
            return
          }
          const result = JSON.parse(responseData)
          resolve({ code: 0, data: result })
        } catch (err) {
          // 调试：记录非 JSON 响应的原始内容（截断）
          try {
            console.error(`[余额非JSON响应] url=${targetUrl} status=${res.statusCode} body=${Buffer.concat(chunks).toString('utf8').slice(0, 300)}`)
          } catch (e) {}
          resolve({ code: -1, msg: '解析响应失败' })
        }
      })
    })
    req.setTimeout(timeoutMs || 10000, () => {
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
 * 标准化余额展示文本（各家格式不一，未知格式返回 null 表示无法解析）
 */
function formatBalance(platform, data) {
  try {
    if (platform === 'deepseek') {
      // {is_available, balance_infos: [{currency, total_balance}]}
      const infos = data.balance_infos || []
      const cny = infos.find(i => i.currency === 'CNY') || infos[0]
      if (!cny) return null
      if (data.is_available === false) return '余额不足'
      return '¥' + cny.total_balance
    }
    if (platform === 'openrouter') {
      // {data: {total_credits, total_usage}}，单位 USD
      const d = data.data || data
      if (typeof d.total_credits !== 'number' || typeof d.total_usage !== 'number') return null
      return '$' + (d.total_credits - d.total_usage).toFixed(2)
    }
    if (platform === 'kimi') {
      // {code: 0, data: {available_balance}}，CN 区单位人民币
      if (data.code !== 0 || !data.data) return null
      return '¥' + Number(data.data.available_balance).toFixed(2)
    }
    // generic：兼容查找常见余额字段
    const candidates = [
      data.balance, data.total_balance, data.available_balance,
      data.remaining, data.remain,
      data.data && data.data.balance,
      data.data && data.data.total_balance,
      data.data && data.data.available_balance
    ]
    for (let i = 0; i < candidates.length; i++) {
      const n = parseFloat(candidates[i])
      if (!isNaN(n)) {
        return (data.currency === 'USD' ? '$' : '¥') + n.toFixed(2)
      }
    }
    return null
  } catch (err) {
    return null
  }
}

/**
 * 查询余额
 * @param {Object} db - 云数据库实例
 * @param {string} provider - 前端供应商 key
 * @param {string} apiKey - 用户 Key
 * @param {boolean} forceRefresh - 强制刷新（绕过缓存）
 * @returns {Promise<Object>} { code, msg?, data?: { text, cached } }
 */
async function getBalance(db, provider, apiKey, forceRefresh) {
  const platform = PROVIDER_BALANCE_MAP[provider]
  if (!platform) {
    return { code: -4, msg: '该平台暂不支持余额查询' }
  }
  if (!apiKey) {
    return { code: -3, msg: '请先配置该供应商的API Key' }
  }
  const conf = BALANCE_ENDPOINTS[platform]
  if (!conf) {
    return { code: -4, msg: '该平台暂不支持余额查询' }
  }

  // 缓存 10 分钟（强制刷新时跳过）
  const cacheKey = 'balance_' + provider
  if (!forceRefresh) {
    try {
      const cacheRes = await db.collection(BALANCE_CACHE_COLLECTION).doc(cacheKey).get()
      const doc = cacheRes.data
      if (doc && doc.text && doc.updateTime) {
        const age = Date.now() - new Date(doc.updateTime).getTime()
        if (age < BALANCE_CACHE_TTL) {
          return { code: 0, data: { text: doc.text, cached: true } }
        }
      }
    } catch (err) {
      // 无缓存，继续请求
    }
  }

  const urls = conf.urls || [conf.url]
  let lastErr = null
  for (let i = 0; i < urls.length; i++) {
    const headers = Object.assign({}, conf.headers, { 'Authorization': 'Bearer ' + apiKey })
    const res = await httpsGetJson(urls[i], headers, 10000)
    if (res.code !== 0) {
      lastErr = res.msg
      // 调试：记录失败的平台、地址和状态（不记录 Key）
      console.error(`[余额查询失败] platform=${platform} url=${urls[i]} err=${res.msg}`)
      continue
    }
    const text = formatBalance(platform, res.data)
    if (text === null) {
      lastErr = '无法解析余额数据'
      // 调试：记录无法解析的原始结构（截断防日志过大，不记录 Key）
      try {
        console.error(`[余额解析失败] platform=${platform} resp=${JSON.stringify(res.data).slice(0, 500)}`)
      } catch (e) {
        console.error(`[余额解析失败] platform=${platform} resp=<unstringifiable>`)
      }
      continue
    }
    // 写缓存（失败不影响）
    try {
      await db.collection(BALANCE_CACHE_COLLECTION).doc(cacheKey).set({
        data: { text, updateTime: new Date(), expireAt: new Date(Date.now() + BALANCE_CACHE_TTL * 2) }
      })
    } catch (err) {
      console.warn('余额缓存写入失败:', err.message)
    }
    return { code: 0, data: { text, cached: false } }
  }
  return { code: -1, msg: lastErr || '查询失败' }
}

module.exports = {
  getBalance,
  PROVIDER_BALANCE_MAP
}
