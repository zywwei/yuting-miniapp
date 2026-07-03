/**
 * AI模型调用基类
 * 提供通用的HTTP请求和响应处理逻辑
 */
const https = require('https')
const http = require('http')

/**
 * 基础调用器
 * @param {Object} options - 配置选项
 * @param {string} options.hostname - 主机名
 * @param {number} options.port - 端口（默认443）
 * @param {string} options.path - API路径
 * @param {string} options.method - 请求方法（默认POST）
 * @param {Object} options.headers - 请求头
 * @param {Function} options.buildRequestBody - 构建请求体的函数
 * @param {Function} options.parseResponse - 解析响应的函数
 * @param {Function} options.extractError - 提取错误信息的函数
 */
class BaseCaller {
  constructor(options = {}) {
    this.hostname = options.hostname
    this.port = options.port || 443
    this.path = options.path
    this.method = options.method || 'POST'
    this.headers = options.headers || {}
    this.buildRequestBody = options.buildRequestBody
    this.parseResponse = options.parseResponse
    this.extractError = options.extractError
    this.timeout = options.timeout || 30000
  }

  /**
   * 发起API调用
   * @param {string} apiKey - API密钥
   * @param {Array} messages - 消息列表
   * @param {string} model - 模型名称
   * @param {Object} extraOptions - 额外选项
   * @returns {Promise<Object>} 响应结果
   */
  async call(apiKey, messages, model, extraOptions = {}) {
    return new Promise((resolve, reject) => {
      const requestData = this.buildRequestBody(messages, model, extraOptions)
      const requestStr = JSON.stringify(requestData)

      const options = {
        hostname: this.hostname,
        port: this.port,
        path: this.path,
        method: this.method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestStr),
          'Authorization': `Bearer ${apiKey}`,
          ...this.headers
        }
      }

      const protocol = this.port === 443 ? https : http
      
      const req = protocol.request(options, (res) => {
        let data = ''
        
        res.on('data', (chunk) => {
          data += chunk
        })
        
        res.on('end', () => {
          try {
            if (res.statusCode !== 200) {
              const errorInfo = this.extractError ? this.extractError(data) : { msg: data }
              resolve({
                code: -1,
                msg: `API请求失败 (${res.statusCode}): ${errorInfo.msg || '未知错误'}`
              })
              return
            }

            const result = JSON.parse(data)
            const parsed = this.parseResponse(result)
            resolve(parsed)
          } catch (err) {
            resolve({
              code: -1,
              msg: '解析响应失败: ' + err.message
            })
          }
        })
      })

      // 设置超时
      req.setTimeout(this.timeout, () => {
        req.destroy()
        resolve({
          code: -1,
          msg: '请求超时'
        })
      })

      req.on('error', (err) => {
        resolve({
          code: -1,
          msg: '请求失败: ' + err.message
        })
      })

      req.write(requestStr)
      req.end()
    })
  }

  /**
   * 流式API调用
   * @param {string} apiKey - API密钥
   * @param {Array} messages - 消息列表
   * @param {string} model - 模型名称
   * @param {Function} onChunk - 收到数据块时的回调，参数为 { thinking: string, content: string }
   * @param {Object} extraOptions - 额外选项
   * @returns {Promise<Object>} 最终结果
   */
  async callStream(apiKey, messages, model, onChunk, extraOptions = {}) {
    return new Promise((resolve, reject) => {
      const requestData = {
        ...this.buildRequestBody(messages, model, extraOptions),
        stream: true
      }
      const requestStr = JSON.stringify(requestData)

      // 流式调用使用更长的超时时间
      const streamTimeout = this.timeout * 3 // 90秒

      const options = {
        hostname: this.hostname,
        port: this.port,
        path: this.path,
        method: this.method,
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(requestStr),
          'Authorization': `Bearer ${apiKey}`,
          ...this.headers
        }
      }

      const protocol = this.port === 443 ? https : http
      let fullContent = ''
      let fullThinking = ''
      let buffer = ''

      const req = protocol.request(options, (res) => {
        if (res.statusCode !== 200) {
          let errorData = ''
          res.on('data', (chunk) => { errorData += chunk })
          res.on('end', () => {
            const errorInfo = this.extractError ? this.extractError(errorData) : { msg: errorData }
            resolve({ code: -1, msg: `API请求失败 (${res.statusCode}): ${errorInfo.msg || '未知错误'}` })
          })
          return
        }

        res.setEncoding('utf8')
        res.on('data', (chunk) => {
          buffer += chunk
          const lines = buffer.split('\n')
          buffer = lines.pop() // 保留不完整的行

          for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed || !trimmed.startsWith('data: ')) continue
            const data = trimmed.slice(6)
            if (data === '[DONE]') continue

            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta || {}
              if (delta.reasoning_content) {
                fullThinking += delta.reasoning_content
                if (onChunk) onChunk({ thinking: fullThinking, content: fullContent })
              }
              if (delta.content) {
                fullContent += delta.content
                if (onChunk) onChunk({ thinking: fullThinking, content: fullContent })
              }
            } catch (e) {
              // 忽略解析错误
            }
          }
        })

        res.on('end', () => {
          resolve({
            code: 0,
            data: {
              content: fullContent,
              thinking: fullThinking || null,
              usage: null // 流式模式下usage需要从最后的chunk获取
            }
          })
        })
      })

      req.setTimeout(streamTimeout, () => {
        req.destroy()
        resolve({ code: -1, msg: '请求超时' })
      })

      req.on('error', (err) => {
        resolve({ code: -1, msg: '请求失败: ' + err.message })
      })

      req.write(requestStr)
      req.end()
    })
  }
}

/**
 * OpenAI兼容格式的调用器
 * 适用于大多数国内AI模型（DeepSeek、Kimi、智谱、MiniMax等）
 */
class OpenAICompatibleCaller extends BaseCaller {
  constructor(options = {}) {
    super({
      ...options,
      buildRequestBody: options.buildRequestBody || OpenAICompatibleCaller.defaultBuildRequestBody,
      parseResponse: options.parseResponse || OpenAICompatibleCaller.defaultParseResponse,
      extractError: options.extractError || OpenAICompatibleCaller.defaultExtractError
    })
  }

  /**
   * 默认构建请求体
   */
  static defaultBuildRequestBody(messages, model, extraOptions = {}) {
    return {
      model: model,
      messages: messages,
      temperature: 0.7,
      max_tokens: 2000,
      ...extraOptions
    }
  }

  /**
   * 默认解析响应
   */
  static defaultParseResponse(result) {
    if (result.choices && result.choices.length > 0) {
      const choice = result.choices[0]
      return {
        code: 0,
        data: {
          content: choice.message.content || '',
          thinking: choice.message.reasoning_content || null,
          usage: result.usage || null
        }
      }
    }
    
    return {
      code: -1,
      msg: '无效的响应格式'
    }
  }

  /**
   * 默认提取错误信息
   */
  static defaultExtractError(data) {
    try {
      const result = JSON.parse(data)
      return {
        msg: result.error?.message || result.msg || result.message || '未知错误'
      }
    } catch (err) {
      return { msg: data }
    }
  }
}

module.exports = {
  BaseCaller,
  OpenAICompatibleCaller
}
