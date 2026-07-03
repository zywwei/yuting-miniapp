/**
 * 调用小米MiMo大模型API
 */
const { OpenAICompatibleCaller } = require('./base-caller')

const DEFAULT_BASE_URL = 'https://api.xiaomimimo.com/v1'

const defaultCaller = new OpenAICompatibleCaller({
  hostname: 'api.xiaomimimo.com',
  path: '/v1/chat/completions'
})

async function callAPI(apiKey, messages, model = 'mimo-v2.5-pro', baseUrl = DEFAULT_BASE_URL) {
  if (baseUrl === DEFAULT_BASE_URL) {
    return defaultCaller.call(apiKey, messages, model)
  }
  const url = new URL(baseUrl)
  const caller = new OpenAICompatibleCaller({
    hostname: url.hostname,
    path: url.pathname + '/chat/completions'
  })
  return caller.call(apiKey, messages, model)
}

module.exports = {
  callAPI,
  caller: defaultCaller
}
