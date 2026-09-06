const https = require('https')
const http = require('http')
const url = require('url')

/**
 * 通用 OpenAI 兼容 API 调用模块
 * 支持 OpenRouter、Kilo Gateway、OpenCode Zen 等平台
 * @param {string} apiKey - API密钥
 * @param {Array} messages - 消息列表
 * @param {string} model - 模型名称
 * @param {string} baseUrl - API基础URL
 * @param {Object} options - 额外选项
 * @returns {Promise<Object>} 响应结果
 */
async function callAPI(apiKey, messages, model, baseUrl, options = {}) {
  return new Promise((resolve, reject) => {
    const body = {
      model: model,
      messages: messages,
      temperature: options.temperature || 0.7,
      max_tokens: options.maxTokens || 2000,
      stream: false
    }
    // 思考深度（OpenRouter 系 reasoning.effort：low/medium/high/xhigh/max/minimal）
    if (options.reasoningEffort && ['low', 'medium', 'high', 'xhigh', 'max', 'minimal'].indexOf(options.reasoningEffort) > -1) {
      body.reasoning = { effort: options.reasoningEffort }
    }
    const data = JSON.stringify(body)

    // 解析URL（带错误处理）
    let parsedUrl
    try {
      parsedUrl = new URL(baseUrl + '/chat/completions')
    } catch (err) {
      resolve({
        code: -1,
        msg: '无效的API地址: ' + baseUrl
      })
      return
    }
    
    const isHttps = parsedUrl.protocol === 'https:'
    const httpModule = isHttps ? https : http

    const requestOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (isHttps ? 443 : 80),
      path: parsedUrl.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(data)
      }
    }

    // 添加额外头部（OpenRouter需要）
    if (options.headers) {
      Object.assign(requestOptions.headers, options.headers)
    }

    const req = httpModule.request(requestOptions, (res) => {
      let responseData = ''
      res.on('data', (chunk) => responseData += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData)
          
          if (res.statusCode === 200 && result.choices && result.choices.length > 0) {
            const choice = result.choices[0]
            resolve({
              code: 0,
              data: {
                content: choice.message.content,
                thinking: choice.message.reasoning_content || null,
                usage: result.usage
              }
            })
          } else {
            resolve({
              code: -1,
              msg: result.error?.message || '请求失败'
            })
          }
        } catch (err) {
          resolve({
            code: -1,
            msg: '解析响应失败: ' + err.message
          })
        }
      })
    })

    // 设置30秒超时
    req.setTimeout(30000, () => {
      req.destroy()
      resolve({
        code: -1,
        msg: '请求超时，请稍后重试'
      })
    })

    req.on('error', (err) => {
      resolve({
        code: -1,
        msg: '网络请求失败: ' + err.message
      })
    })

    req.write(data)
    req.end()
  })
}

/**
 * 调用 OpenRouter API
 */
async function callOpenRouter(apiKey, messages, model = 'openrouter/free', options = {}) {
  return callAPI(apiKey, messages, model, 'https://openrouter.ai/api/v1', {
    headers: {
      'HTTP-Referer': 'https://yuting-miniapp.com',
      'X-Title': 'Yuting MiniApp'
    },
    reasoningEffort: options.reasoningEffort
  })
}

/**
 * 调用 Kilo Gateway API
 */
async function callKilo(apiKey, messages, model = 'kilo-auto/free', options = {}) {
  return callAPI(apiKey, messages, model, 'https://api.kilo.ai/api/gateway', {
    reasoningEffort: options.reasoningEffort
  })
}

/**
 * 调用 OpenCode Zen API
 */
async function callOpenCode(apiKey, messages, model = 'mimo-v2.5-free', options = {}) {
  return callAPI(apiKey, messages, model, 'https://opencode.ai/zen/v1', {
    reasoningEffort: options.reasoningEffort
  })
}

module.exports = {
  callAPI,
  callOpenRouter,
  callKilo,
  callOpenCode
}
