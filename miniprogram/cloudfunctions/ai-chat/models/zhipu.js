const https = require('https')

/**
 * 调用智谱AI GLM API
 * 最新版本：GLM-5.2（2026年6月）
 * 支持思考过程展示
 * API文档：https://docs.bigmodel.cn/cn/guide/start/model-overview
 * @param {string} apiKey - API密钥
 * @param {Array} messages - 消息列表
 * @param {string} model - 模型名称
 * @param {string} baseUrl - API基础地址（可选）
 * @returns {Promise<Object>} 响应结果
 */
async function callAPI(apiKey, messages, model = 'glm-5.2', baseUrl = 'https://open.bigmodel.cn/api/paas/v4') {
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
