/**
 * 调用硅基流动 SiliconFlow API
 */
const { OpenAICompatibleCaller } = require('./base-caller')

const siliconflowCaller = new OpenAICompatibleCaller({
  hostname: 'api.siliconflow.cn',
  path: '/v1/chat/completions'
})

async function callAPI(apiKey, messages, model = 'deepseek-ai/DeepSeek-V4') {
  return siliconflowCaller.call(apiKey, messages, model)
}

module.exports = {
  callAPI,
  caller: siliconflowCaller
}
