/**
 * 调用智谱AI GLM API
 */
const { OpenAICompatibleCaller } = require('./base-caller')

const DEFAULT_BASE_URL = 'https://open.bigmodel.cn/api/paas/v4'

const defaultCaller = new OpenAICompatibleCaller({
  hostname: 'open.bigmodel.cn',
  path: '/api/paas/v4/chat/completions'
})

async function callAPI(apiKey, messages, model = 'glm-5.2', baseUrl = DEFAULT_BASE_URL) {
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
