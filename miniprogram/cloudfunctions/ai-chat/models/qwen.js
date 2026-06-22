const https = require('https')

/**
 * 调用通义千问API
 * 最新版本：Qwen3.7-Max（2026年6月）
 * @param {string} apiKey - API密钥
 * @param {Array} messages - 消息列表
 * @param {string} model - 模型名称
 * @returns {Promise<Object>} 响应结果
 */
async function callAPI(apiKey, messages, model = 'qwen3.7-max') {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: model,
      input: {
        messages: messages
      },
      parameters: {
        temperature: 0.7,
        max_tokens: 2000
      }
    })

    const options = {
      hostname: 'dashscope.aliyuncs.com',
      port: 443,
      path: '/api/v1/services/aigc/text-generation/generation',
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
          
          if (res.statusCode === 200 && result.output && result.output.choices && result.output.choices.length > 0) {
            const choice = result.output.choices[0]
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
              msg: result.message || '请求失败'
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
