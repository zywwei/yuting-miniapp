/**
 * 调用MiniMax API
 */
const { OpenAICompatibleCaller } = require('./base-caller')

const minimaxCaller = new OpenAICompatibleCaller({
  hostname: 'api.minimax.chat',
  path: '/v1/text/chatcompletion_v2',
  extractError: function(data) {
    try {
      const result = JSON.parse(data)
      return { msg: result.base_resp?.status_msg || result.error?.message || '未知错误' }
    } catch (err) {
      return { msg: data }
    }
  }
})

async function callAPI(apiKey, messages, model = 'MiniMax-M3') {
  return minimaxCaller.call(apiKey, messages, model)
}

module.exports = {
  callAPI,
  caller: minimaxCaller
}
