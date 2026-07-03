const https = require('https')

/**
 * 调用文心一言API
 * 最新版本：ERNIE 4.0 Turbo（2026年6月）
 * @param {string} apiKey - API Key
 * @param {string} secretKey - Secret Key
 * @param {Array} messages - 消息列表
 * @param {string} model - 模型名称
 * @returns {Promise<Object>} 响应结果
 */
async function callAPI(apiKey, secretKey, messages, model = 'ernie-4.0-turbo-8k') {
  try {
    // 1. 获取access_token
    const accessToken = await getAccessToken(apiKey, secretKey)
    if (!accessToken) {
      return { code: -1, msg: '获取access_token失败' }
    }

    // 2. 调用文心一言API
    return await callWenxinAPI(accessToken, messages, model)
  } catch (err) {
    return { code: -1, msg: '调用文心一言失败: ' + err.message }
  }
}

/**
 * 获取access_token
 */
async function getAccessToken(apiKey, secretKey) {
  return new Promise((resolve, reject) => {
    const path = `/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`
    
    const options = {
      hostname: 'aip.baidubce.com',
      port: 443,
      path: path,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    }

    const req = https.request(options, (res) => {
      let data = ''
      res.on('data', (chunk) => data += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(data)
          resolve(result.access_token || null)
        } catch (err) {
          resolve(null)
        }
      })
    })

    // 设置10秒超时
    req.setTimeout(10000, () => {
      req.destroy()
      resolve(null)
    })

    req.on('error', () => resolve(null))
    req.end()
  })
}

/**
 * 调用文心一言API
 */
async function callWenxinAPI(accessToken, messages, model = 'ernie-4.0-turbo-8k') {
  return new Promise((resolve, reject) => {
    // 转换消息格式（支持多模态）
    const wenxinMessages = messages.map(msg => {
      // 处理多模态消息（content是数组的情况）
      if (Array.isArray(msg.content)) {
        // 提取图片URL和文本
        var imageUrls = []
        var textParts = []
        
        msg.content.forEach(function(part) {
          if (part.type === 'image_url' && part.image_url) {
            imageUrls.push(part.image_url.url)
          } else if (part.type === 'text') {
            textParts.push(part.text)
          }
        })
        
        // 文心一言的多模态格式
        return {
          role: msg.role,
          content: textParts.join('\n'),
          images: imageUrls.length > 0 ? imageUrls : undefined
        }
      }
      
      // 普通文本消息
      return {
        role: msg.role,
        content: msg.content
      }
    })

    const data = JSON.stringify({
      messages: wenxinMessages,
      temperature: 0.7,
      max_output_tokens: 2000
    })

    // 根据模型选择不同的API端点
    let apiPath = '/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro'
    if (model === 'ernie-3.5-8k') {
      apiPath = '/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions'
    } else if (model === 'ernie-speed-8k') {
      apiPath = '/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/eb-instant'
    }

    const options = {
      hostname: 'aip.baidubce.com',
      port: 443,
      path: apiPath,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${accessToken}`,
        'Content-Length': Buffer.byteLength(data)
      }
    }

    const req = https.request(options, (res) => {
      let responseData = ''
      res.on('data', (chunk) => responseData += chunk)
      res.on('end', () => {
        try {
          const result = JSON.parse(responseData)
          
          if (res.statusCode === 200 && result.result) {
            resolve({
              code: 0,
              data: {
                content: result.result,
                thinking: result.reasoning_content || null,
                usage: result.usage
              }
            })
          } else {
            resolve({
              code: -1,
              msg: result.error_msg || '请求失败'
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
