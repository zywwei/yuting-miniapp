/**
 * 调用通义千问API
 * 最新版本：Qwen3.7-Max（2026年6月）
 * 使用独特的请求格式：{ input: { messages }, parameters: {} }
 */
const { BaseCaller } = require('./base-caller')

const qwenCaller = new BaseCaller({
  hostname: 'dashscope.aliyuncs.com',
  path: '/api/v1/services/aigc/text-generation/generation',
  buildRequestBody: function(messages, model) {
    return {
      model: model,
      input: { messages: messages },
      parameters: { temperature: 0.7, max_tokens: 2000 }
    }
  },
  parseResponse: function(result) {
    if (result.output && result.output.choices && result.output.choices.length > 0) {
      const choice = result.output.choices[0]
      return {
        code: 0,
        data: {
          content: choice.message.content || '',
          thinking: choice.message.reasoning_content || null,
          usage: result.usage || null
        }
      }
    }
    return { code: -1, msg: '无效的响应格式' }
  },
  extractError: function(data) {
    try {
      const result = JSON.parse(data)
      return { msg: result.message || result.error?.message || '未知错误' }
    } catch (err) {
      return { msg: data }
    }
  }
})

async function callAPI(apiKey, messages, model = 'qwen3.7-max') {
  return qwenCaller.call(apiKey, messages, model)
}

module.exports = {
  callAPI,
  caller: qwenCaller
}
