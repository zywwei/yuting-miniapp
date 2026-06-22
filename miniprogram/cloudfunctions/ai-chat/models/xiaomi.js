const https = require('https')

/**
 * 调用小米MiMo大模型API
 * 
 * 支持两种调用方式：
 * 1. 按量付费：https://api.xiaomimimo.com/v1
 * 2. Token Plan套餐：https://token-plan-cn.xiaomimimo.com/v1
 * 
 * 计费方式：
 * - 按量付费：按实际使用量计费，适合轻度使用
 * - Token Plan：固定订阅费，按套餐限量调用
 * 
 * @param {string} apiKey - API密钥
 * @param {Array} messages - 消息列表
 * @param {string} model - 模型名称
 * @param {string} baseUrl - API基础地址（可选，默认为按量付费地址）
 * @returns {Promise<Object>} 响应结果
 */
async function callAPI(apiKey, messages, model = 'mimo-v2.5-pro', baseUrl = 'https://api.xiaomimimo.com/v1') {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000
    })

    // 解析baseUrl获取hostname和path
    const url = new URL(baseUrl)
    const hostname = url.hostname
    const path = url.pathname + '/chat/completions'

    const options = {
      hostname: hostname,
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'Content-Length': Buffer.byteLength(data)
      }
    }

    const req = https.request(options, (res) => {
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

module.exports = {
  callAPI
}
