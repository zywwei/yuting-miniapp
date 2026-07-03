/**
 * 调用Kimi (月之暗面) API
 */
const { OpenAICompatibleCaller } = require('./base-caller')

const kimiCaller = new OpenAICompatibleCaller({
  hostname: 'api.moonshot.cn',
  path: '/v1/chat/completions'
})

async function callAPI(apiKey, messages, model = 'kimi-k2.6') {
  return kimiCaller.call(apiKey, messages, model)
}

module.exports = {
  callAPI,
  caller: kimiCaller
}
