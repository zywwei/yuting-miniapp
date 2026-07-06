/**
 * 云同步工厂函数测试
 * 用于验证 createListFetcher、createUploader、createRemover、createSingletonSync 等工厂函数的正确性
 */

var cloud = require('./cloud.js')

// 测试配置
var testConfig = {
  collection: 'testCollection',
  storageKey: 'testStorageKey',
  deletedKey: 'testDeletedKey',
  isolation: cloud.ISOLATION_LEVEL.CHILD,
  pageSize: 100,
  hasImage: false
}

// 测试结果
var testResults = []

/**
 * 运行测试
 */
function runTests() {
  console.log('===== 开始测试云同步工厂函数 =====')
  
  // 测试1：枚举和常量
  testEnums()
  
  // 测试2：存储 key 获取
  testGetStorageKey()
  
  // 测试3：墓碑 key 获取
  testGetTombstoneKey()
  
  // 测试4：乐观锁比较
  testShouldUseCloud()
  
  // 测试5：标记已同步
  testMarkRecordSynced()
  
  // 测试6：更新本地记录
  testUpdateLocalRecord()
  
  // 测试7：工厂函数创建
  testFactoryCreation()
  
  // 输出测试结果
  console.log('===== 测试结果 =====')
  testResults.forEach(function(result) {
    console.log((result.passed ? '✓' : '✗') + ' ' + result.name)
    if (!result.passed) {
      console.log('  错误: ' + result.error)
    }
  })
  
  var passed = testResults.filter(function(r) { return r.passed }).length
  var total = testResults.length
  console.log('通过: ' + passed + '/' + total)
}

/**
 * 测试枚举和常量
 */
function testEnums() {
  try {
    // 测试 ISOLATION_LEVEL
    if (cloud.ISOLATION_LEVEL.FAMILY !== 'family') {
      throw new Error('ISOLATION_LEVEL.FAMILY 值错误')
    }
    if (cloud.ISOLATION_LEVEL.CHILD !== 'child') {
      throw new Error('ISOLATION_LEVEL.CHILD 值错误')
    }
    if (cloud.ISOLATION_LEVEL.MEMBER !== 'member') {
      throw new Error('ISOLATION_LEVEL.MEMBER 值错误')
    }
    
    // 测试 SINGLETON_ISOLATION
    if (cloud.SINGLETON_ISOLATION.FAMILY !== 'family') {
      throw new Error('SINGLETON_ISOLATION.FAMILY 值错误')
    }
    if (cloud.SINGLETON_ISOLATION.CHILD !== 'child') {
      throw new Error('SINGLETON_ISOLATION.CHILD 值错误')
    }
    if (cloud.SINGLETON_ISOLATION.MEMBER !== 'member') {
      throw new Error('SINGLETON_ISOLATION.MEMBER 值错误')
    }
    
    // 测试 TOMBSTONE_KEYS
    if (!cloud.TOMBSTONE_KEYS.drawings) {
      throw new Error('TOMBSTONE_KEYS.drawings 不存在')
    }
    if (!cloud.TOMBSTONE_KEYS.notes) {
      throw new Error('TOMBSTONE_KEYS.notes 不存在')
    }
    
    testResults.push({ name: '枚举和常量', passed: true })
  } catch (err) {
    testResults.push({ name: '枚举和常量', passed: false, error: err.message })
  }
}

/**
 * 测试存储 key 获取
 */
function testGetStorageKey() {
  try {
    // 测试孩子级（默认）
    var key1 = cloud.getStorageKey({ storageKey: 'test' })
    if (key1 !== 'test') {
      throw new Error('孩子级存储 key 错误: ' + key1)
    }
    
    // 测试家庭级
    var key2 = cloud.getStorageKey({ 
      storageKey: 'test', 
      isolation: cloud.ISOLATION_LEVEL.FAMILY 
    })
    // 家庭级会附加 _family_ 前缀
    if (key2.indexOf('test_family_') !== 0) {
      throw new Error('家庭级存储 key 错误: ' + key2)
    }
    
    // 测试成员级
    var key3 = cloud.getStorageKey({ 
      storageKey: 'test', 
      isolation: cloud.ISOLATION_LEVEL.MEMBER 
    })
    // 成员级会附加 _member_ 前缀
    if (key3.indexOf('test_member_') !== 0) {
      throw new Error('成员级存储 key 错误: ' + key3)
    }
    
    testResults.push({ name: '存储 key 获取', passed: true })
  } catch (err) {
    testResults.push({ name: '存储 key 获取', passed: false, error: err.message })
  }
}

/**
 * 测试墓碑 key 获取
 */
function testGetTombstoneKey() {
  try {
    // 测试孩子级（默认）
    var key1 = cloud.getTombstoneKey({ deletedKey: 'test' })
    if (key1 !== 'test') {
      throw new Error('孩子级墓碑 key 错误: ' + key1)
    }
    
    // 测试家庭级
    var key2 = cloud.getTombstoneKey({ 
      deletedKey: 'test', 
      isolation: cloud.ISOLATION_LEVEL.FAMILY 
    })
    // 家庭级会附加 _family_ 前缀
    if (key2.indexOf('test_family_') !== 0) {
      throw new Error('家庭级墓碑 key 错误: ' + key2)
    }
    
    // 测试成员级
    var key3 = cloud.getTombstoneKey({ 
      deletedKey: 'test', 
      isolation: cloud.ISOLATION_LEVEL.MEMBER 
    })
    // 成员级会附加 _member_ 前缀
    if (key3.indexOf('test_member_') !== 0) {
      throw new Error('成员级墓碑 key 错误: ' + key3)
    }
    
    testResults.push({ name: '墓碑 key 获取', passed: true })
  } catch (err) {
    testResults.push({ name: '墓碑 key 获取', passed: false, error: err.message })
  }
}

/**
 * 测试乐观锁比较
 */
function testShouldUseCloud() {
  try {
    // 测试1：云端无时间戳
    if (!cloud.shouldUseCloud(null, '2024-01-01')) {
      throw new Error('云端无时间戳时应返回 true')
    }
    
    // 测试2：本地无时间戳
    if (!cloud.shouldUseCloud('2024-01-01', null)) {
      throw new Error('本地无时间戳时应返回 true')
    }
    
    // 测试3：云端更新
    if (!cloud.shouldUseCloud('2024-01-02', '2024-01-01')) {
      throw new Error('云端更新时应返回 true')
    }
    
    // 测试4：本地更新
    if (cloud.shouldUseCloud('2024-01-01', '2024-01-02')) {
      throw new Error('本地更新时应返回 false')
    }
    
    // 测试5：相同时间
    if (cloud.shouldUseCloud('2024-01-01', '2024-01-01')) {
      throw new Error('相同时应返回 false')
    }
    
    testResults.push({ name: '乐观锁比较', passed: true })
  } catch (err) {
    testResults.push({ name: '乐观锁比较', passed: false, error: err.message })
  }
}

/**
 * 测试标记已同步
 */
function testMarkRecordSynced() {
  try {
    // 准备测试数据
    var storageKey = 'testMarkSynced'
    wx.setStorageSync(storageKey, [
      { id: '1', synced: false },
      { id: '2', synced: false }
    ])
    
    // 标记第一条记录为已同步
    cloud.markRecordSynced(storageKey, '1')
    
    // 验证结果
    var list = wx.getStorageSync(storageKey)
    if (!list[0].synced) {
      throw new Error('第一条记录应标记为已同步')
    }
    if (!list[0].lastSyncAt) {
      throw new Error('第一条记录应有 lastSyncAt')
    }
    if (list[1].synced) {
      throw new Error('第二条记录不应标记为已同步')
    }
    
    // 清理测试数据
    wx.removeStorageSync(storageKey)
    
    testResults.push({ name: '标记已同步', passed: true })
  } catch (err) {
    testResults.push({ name: '标记已同步', passed: false, error: err.message })
  }
}

/**
 * 测试更新本地记录
 */
function testUpdateLocalRecord() {
  try {
    // 准备测试数据
    var storageKey = 'testUpdateRecord'
    wx.setStorageSync(storageKey, [
      { id: '1', name: 'test1' },
      { id: '2', name: 'test2' }
    ])
    
    // 更新第一条记录
    cloud.updateLocalRecord(storageKey, '1', 'name', 'updated1')
    
    // 验证结果
    var list = wx.getStorageSync(storageKey)
    if (list[0].name !== 'updated1') {
      throw new Error('第一条记录应更新为 updated1')
    }
    if (list[1].name !== 'test2') {
      throw new Error('第二条记录不应改变')
    }
    
    // 清理测试数据
    wx.removeStorageSync(storageKey)
    
    testResults.push({ name: '更新本地记录', passed: true })
  } catch (err) {
    testResults.push({ name: '更新本地记录', passed: false, error: err.message })
  }
}

/**
 * 测试工厂函数创建
 */
function testFactoryCreation() {
  try {
    // 测试 createListFetcher
    var fetcher = cloud.createListFetcher(testConfig)
    if (typeof fetcher !== 'function') {
      throw new Error('createListFetcher 应返回函数')
    }
    
    // 测试 createUploader
    var uploader = cloud.createUploader(testConfig)
    if (typeof uploader !== 'function') {
      throw new Error('createUploader 应返回函数')
    }
    
    // 测试 createRemover
    var remover = cloud.createRemover(testConfig)
    if (typeof remover !== 'function') {
      throw new Error('createRemover 应返回函数')
    }
    
    // 测试 createSingletonSync
    var singletonSync = cloud.createSingletonSync({
      collection: 'userSettings',
      key: 'testKey',
      storageKey: 'testStorageKey',
      isolation: cloud.SINGLETON_ISOLATION.CHILD,
      useOptimisticLock: true
    })
    if (typeof singletonSync.upload !== 'function') {
      throw new Error('createSingletonSync.upload 应返回函数')
    }
    if (typeof singletonSync.fetch !== 'function') {
      throw new Error('createSingletonSync.fetch 应返回函数')
    }
    
    testResults.push({ name: '工厂函数创建', passed: true })
  } catch (err) {
    testResults.push({ name: '工厂函数创建', passed: false, error: err.message })
  }
}

// 导出测试函数
module.exports = {
  runTests: runTests
}
