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

async function callAPI(apiKey, messages, model = 'deepseek-v4-flash', options = {}) {
  const extra = {}
  // DeepSeek V4 思考强度（官方仅 low/high/max，medium 显式映射为 high）
  let effort = options.reasoningEffort
  if (effort === 'medium') effort = 'high'
  if (effort && ['low', 'high', 'max'].indexOf(effort) > -1) {
    extra.reasoning_effort = effort
  }
  return deepseekCaller.call(apiKey, messages, model, extra)
}

module.exports = {
  callAPI,
  caller: deepseekCaller
}
