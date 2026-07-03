/**
 * 调用DeepSeek API
 * 最新版本：DeepSeek-V4（2026年6月）
 * 支持思考过程展示（reasoning_content）
 * API文档：https://api-docs.deepseek.com/zh-cn/quick_start/pricing
 */
const { OpenAICompatibleCaller } = require('./base-caller')

const deepseekCaller = new OpenAICompatibleCaller({
  hostname: 'api.deepseek.com',
  path: '/v1/chat/completions'
})

async function callAPI(apiKey, messages, model = 'deepseek-v4-flash') {
  return deepseekCaller.call(apiKey, messages, model)
}

module.exports = {
  callAPI,
  caller: deepseekCaller
}
