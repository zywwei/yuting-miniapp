---
name: cloud-sync-best-practices
description: 微信小程序云同步最佳实践。当实现或修复涉及云端数据同步（上传/拉取/删除/合并/自愈/冲突/增量/批量/队列）的代码时使用此技能。适用于 miniprogram/utils/cloud.js 中的任何 fetch/upload/remove 函数，以及 cloudfunctions/record 云函数。
---

# 云同步最佳实践

本技能整合了刷牙、商品、记账三个模块的云同步实现，提炼每种方式的最佳实践，并加入增量同步、冲突解决、批量操作、同步状态 UI 等改进，作为项目级标准。

## 激活契约

### 何时使用此技能

- 实现或修复 `miniprogram/utils/cloud.js` 中的 fetch/upload/remove 函数
- 修改 `cloudfunctions/record/index.js` 云函数
- 涉及离线同步、数据合并、冲突解决、墓碑机制的代码
- 新增需要云端同步的业务模块

### 使用前须读

- 如果涉及微信小程序 CloudBase 数据库操作，参考 `wx.cloud.database()` 的 CRUD 模式
- 如果涉及身份权限，确认 `_openid` 和 `familyId` 的使用方式

### 不适用场景

- 纯前端本地存储（不涉及云端同步）
- Web 项目（使用 `@cloudbase/js-sdk`）
- 云函数内部的管理操作（使用后端工具）

### 常见错误

- ❌ 手写内联合并逻辑，导致策略漂移
- ❌ 仅使用 `synced` 标记，缺少 `lastSyncAt`
- ❌ 模块专属墓碑函数，重复实现
- ❌ 云端返回数据直接写入本地，无格式校验
- ❌ 每次 onLoad 全量拉取，无防抖
- ❌ 墓碑过期后数据复活（未使用软删除）

---

## 核心架构

```
┌─────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  业务模块    │────▶│  cloud.js        │────▶│ record 云函数    │
│ (本地读写)   │◀────│ (同步策略+队列)   │◀────│ (服务端读写)     │
└─────────────┘     └──────────────────┘     └─────────────────┘
       │                   │                        │
       ▼                   ▼                        ▼
  childStorage        syncQueue               增量/幂等/软删除
  (本地缓存)          (离线重试队列)           (服务端保障)
```

### wx.cloud 初始化

```js
// app.js onLaunch 中
wx.cloud.init({
  env: 'your-env-id',  // 必须显式指定，不依赖默认值
  traceUser: true
})

// 云函数中
const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
```

### 数据库访问模式

```js
// 客户端直接访问（适用于简单 CRUD）
const db = wx.cloud.database()
const _ = db.command

// 通过云函数访问（适用于需要自定义权限逻辑的场景）
var res = await wx.cloud.callFunction({
  name: 'record',
  data: { action: 'add', collection: 'xxx', data: record }
})
```

---

## 一、合并策略：统一使用 `mergeAndHeal`

**来源**：记账模块 + 刷牙模块共用的 `mergeAndHeal` 函数（cloud.js:954）

**禁止**：手写内联合并逻辑（商品模块的做法），会导致策略漂移和维护负担。

### 合并规则（按优先级）

1. **云端优先** — 先添加云端数据，标记 `synced = true` + `lastSyncAt`
2. **本地仅保留未同步** — `!r.synced` 的本地独有记录才保留
3. **已同步但云端缺失 = 被其他设备删除** — 不保留，不补传

### 标准实现

```js
// ✅ 正确：使用 mergeAndHeal
async function fetchXxxRecords() {
  var localList = childStorage.get(STORAGE_KEY) || []
  if (!isCloudReady()) return localList
  try {
    var res = await wx.cloud.callFunction({
      name: 'record',
      data: { action: 'list', collection: COLLECTION, childId: auth.getCurrentChildId(), pageSize: 200 }
    })
    if (res.result.code === 0) {
      var cloudList = res.result.data.list || []
      var deletedIds = getDeletedIdsByKey(DELETED_KEY)
      var deletedSet = {}
      deletedIds.forEach(function(id) { deletedSet[id] = true })
      return mergeAndHeal(COLLECTION, STORAGE_KEY, localList, cloudList, deletedSet, transformCloudItem)
    }
  } catch (err) {
    console.warn('云端读取失败:', err)
  }
  return localList
}
```

```js
// ❌ 错误：手写内联合并（商品模块的做法）
function fetchStallProducts() {
  // ...手写 merged/mergedIds 逻辑，缺少自愈和 lastSyncAt
}
```

### `mergeAndHeal` 标准实现

```js
function mergeAndHeal(collection, storageKey, localList, cloudList, deletedSet, transformCloudItem) {
  var merged = []
  var mergedIds = {}

  // 1. 云端数据优先，标记已同步
  cloudList.forEach(function(item) {
    if (item && item.id && !deletedSet[item.id] && !deletedSet[item._id]) {
      var transformed = transformCloudItem ? transformCloudItem(item) : item
      transformed.synced = true
      transformed.lastSyncAt = transformed.lastSyncAt || new Date().toISOString()
      merged.push(transformed)
      mergedIds[item.id] = true
    }
  })

  // 2. 本地独有数据：仅保留未同步的
  localList.forEach(function(r) {
    if (r && r.id && !mergedIds[r.id] && !deletedSet[r.id] && !r.synced) {
      merged.push(r)
    }
  })

  // 3. 自愈补传
  var cloudIdSet = {}
  cloudList.forEach(function(r) { if (r && r.id) cloudIdSet[r.id] = true })
  selfHealRecords(collection, localList, cloudIdSet, deletedSet)

  // 4. 按创建时间倒序
  merged.sort(function(a, b) {
    return new Date(b.createTime || 0) - new Date(a.createTime || 0)
  })

  childStorage.set(storageKey, merged)

  // 5. 墓碑重试：云端存在但本地已删除的，再次尝试删除
  cloudList.forEach(function(item) {
    if (item && item.id && (deletedSet[item.id] || deletedSet[item._id])) {
      wx.cloud.callFunction({
        name: 'record',
        data: { action: 'remove', collection: collection, id: item.id }
      }).catch(function(err) { console.warn('云端删除同步失败:', item.id, err) })
    }
  })

  return merged
}
```

---

## 二、同步状态：`synced` + `lastSyncAt` 双标记

**来源**：记账模块 + 刷牙模块

### 标记规则

| 字段 | 含义 | 设置时机 |
|------|------|---------|
| `synced = false` | 从未同步成功 | 创建记录时初始化 |
| `synced = true` | 同步成功过 | upload 成功 或 mergeAndHeal 标记 |
| `lastSyncAt = ISO` | 最后同步时间 | mergeAndHeal 中设置（云端记录） |

```js
// ✅ 正确：双标记
record.synced = false           // 创建时
record.synced = true            // 上传成功时
record.lastSyncAt = new Date().toISOString()  // mergeAndHeal 中

// ❌ 错误：仅 synced（商品模块的做法）
record.synced = false  // 缺少 lastSyncAt，无法区分"从未同步"和"曾同步被删除"
```

### 自愈判断条件（全部满足才补传）

```js
r.id && !r.synced && !cloudIdSet[r.id] && !deletedSet[r.id] && !r.lastSyncAt
```

- `!r.synced` — 未标记已同步
- `!cloudIdSet[r.id]` — 云端不存在
- `!deletedSet[r.id]` — 未被删除
- `!r.lastSyncAt` — **从未成功同步过**（防止已同步但被其他设备删除的记录被误补传）

---

## 三、自愈机制：`selfHealRecords`

**来源**：刷牙模块 + 记账模块

```js
var SELF_HEAL_MAX = 5

function selfHealRecords(collection, localList, cloudIdSet, deletedSet) {
  if (!isCloudReady()) return
  var count = 0
  localList.forEach(function(r) {
    if (count >= SELF_HEAL_MAX) return
    if (r && r.id && !r.synced && !cloudIdSet[r.id] && !deletedSet[r.id] && !r.lastSyncAt) {
      wx.cloud.callFunction({
        name: 'record',
        data: { action: 'add', collection: collection, data: r }
      }).catch(function(err) { console.warn('自愈补传失败:', r.id, err) })
      count++
    }
  })
}
```

**关键设计**：
- 依赖云函数 `addRecord` 按客户端 id 幂等去重，补传不会产生重复记录
- 每次最多补传 5 条，避免大量积压时一次性传完
- 仅在 fetch 时触发，不在 upload 时触发

---

## 四、墓碑机制：统一使用通用 Helper

**来源**：通用墓碑 API（cloud.js:217-238）

```js
// ✅ 正确：使用通用 helper
var DELETED_KEY = 'deletedXxxIds'
var deletedIds = getDeletedIdsByKey(DELETED_KEY)
addDeletedIdByKey(DELETED_KEY, id)
removeTombstoneByKey(DELETED_KEY, id)

// ❌ 错误：模块专属内联函数（商品模块、刷牙模块的做法）
function getDeletedStallProductIds() { /* 重复实现 */ }
function addDeletedStallProductId(id) { /* 重复实现 */ }
```

### 墓碑数据格式

```js
{ id: "record_id", ts: 1719811200000 }  // 对象数组，30天自动过期
```

### 删除流程

```
1. addDeletedIdByKey(DELETED_KEY, id)     // 先写墓碑
2. childStorage 过滤掉该记录              // 更新本地
3. 云函数 remove                          // 删除云端
4. 成功 → removeTombstoneByKey()          // 清除墓碑
   失败 → 墓碑保留，下次 fetch 时重试
```

---

## 五、离线重试：syncQueue

**来源**：sync-queue.js（所有模块共用）

### 标准入队模式

```js
// upload 函数中
try {
  await wx.cloud.callFunction({
    name: 'record',
    data: { action: 'add', collection: COLLECTION, data: record }
  })
  record.synced = true
  syncQueue.dequeue(record.id, 'add')
} catch (err) {
  console.warn('同步失败，入队重试:', err)
  syncQueue.enqueue({ id: record.id, action: 'add', collection: COLLECTION, data: record })
}
```

### 图片两阶段上传

```js
// 1. 入队时带 uploadImages 元数据
syncQueue.enqueue({
  id: record.id,
  action: 'add',
  collection: COLLECTION,
  data: record,
  uploadImages: [{
    field: 'imagePath',
    localPath: localPath,
    cloudPath: 'xxx/' + record.id + '.png'
  }]
})

// 2. 图片上传成功后回写队列（避免重传）
syncQueue.updateData(record.id, fullRecord)

// 3. 全部成功后出队
syncQueue.dequeue(record.id, 'add')
```

### syncQueue 改进

**现有问题**：队列满时丢弃最旧的非删除操作，可能导致数据丢失。

**改进方案**：

```js
// 1. 队列项增加优先级
{
  id: record.id,
  action: 'add',
  collection: COLLECTION,
  data: record,
  priority: 'high'  // 'high' | 'normal'，删除操作默认 high
}

// 2. 队列满时策略：优先保留删除操作，再丢弃最旧的写操作
// 3. failed 操作增加指数退避重试
{
  retryCount: 0,
  nextRetryAt: Date.now() + Math.pow(2, retryCount) * 60000
}

// 4. 队列持久化到云端（防本地存储被清理时丢失）
```

---

## 六、增量同步（改进：减少全量拉取开销）

**现有问题**：每次 fetch 拉取全部记录（pageSize=100/200），数据量大时浪费流量和时间。

### 服务端支持

```js
// cloudfunctions/record/index.js 的 listRecords 增加 since 参数
async function listRecords(member, collection, childId, page, pageSize, since) {
  var query = db.collection(collection).where({ familyId: member.familyId })
  if (childId) query = query.where({ childId })
  if (since) query = query.where({ updatedAt: db.command.gt(since) })
  query = query.orderBy('updatedAt', 'desc').skip((page - 1) * pageSize).limit(pageSize)
  // ...
}
```

### 客户端实现

```js
async function fetchXxxIncremental() {
  var lastSyncTime = childStorage.get(STORAGE_KEY + '_lastSyncTime') || ''
  var localList = childStorage.get(STORAGE_KEY) || []

  var res = await wx.cloud.callFunction({
    name: 'record',
    data: {
      action: 'list',
      collection: COLLECTION,
      childId: auth.getCurrentChildId(),
      since: lastSyncTime,
      pageSize: 500
    }
  })

  if (res.result.code === 0) {
    var cloudList = res.result.data.list || []
    if (lastSyncTime && cloudList.length > 0) {
      // 增量模式：合并到本地列表
      var cloudMap = {}
      cloudList.forEach(function(item) { cloudMap[item.id] = item })
      var merged = localList.map(function(local) {
        return cloudMap[local.id] || local
      })
      // 添加云端新增的
      cloudList.forEach(function(item) {
        if (!localList.some(function(l) { return l.id === item.id })) {
          merged.push(item)
        }
      })
      childStorage.set(STORAGE_KEY, merged)
    } else {
      // 首次或无增量：走完整 mergeAndHeal
      mergeAndHeal(COLLECTION, STORAGE_KEY, localList, cloudList, deletedSet, transform)
    }
    childStorage.set(STORAGE_KEY + '_lastSyncTime', new Date().toISOString())
  }
}
```

---

## 七、冲突解决（改进：防止多设备覆盖）

**现有问题**：两个设备同时编辑同一条记录，后上传的覆盖先上传的，无任何提示。

### 版本号机制

```js
// 上传时携带版本号
function uploadXxx(record) {
  var data = Object.assign({}, record, {
    _version: (record._version || 0) + 1,
    updatedAt: new Date().toISOString()
  })
  return wx.cloud.callFunction({
    name: 'record',
    data: { action: 'add', collection: COLLECTION, data: data }
  })
}

// 服务端校验（record/index.js 的 addRecord 中）
async function addRecord(member, collection, data) {
  if (data._id) {
    var existing = await db.collection(collection).doc(data._id).get().catch(() => null)
    if (existing && existing.data && data._version <= existing.data._version) {
      return { code: -2, msg: '版本冲突，请先拉取最新数据', conflict: true }
    }
  }
  // ...正常写入
}
```

### 客户端处理冲突

```js
var res = await wx.cloud.callFunction({ name: 'record', data: { action: 'add', collection, data } })
if (res.result.code === -2 && res.result.conflict) {
  // 拉取最新数据后让用户选择
  await fetchXxxRecords()
  wx.showModal({
    title: '数据冲突',
    content: '此记录在其他设备上已被修改，请刷新后重试',
    showCancel: false
  })
  return
}
```

---

## 八、批量操作（改进：减少云函数调用次数）

**现有问题**：syncQueue 逐条执行，10 条记录需要 10 次云函数调用。

### 服务端支持 batchAdd

```js
// cloudfunctions/record/index.js 新增 batchAdd action
case 'batchAdd':
  return await batchAddRecords(member, collection, data)

async function batchAddRecords(member, collection, dataList) {
  var results = []
  for (var i = 0; i < dataList.length; i++) {
    try {
      var result = await addRecord(member, collection, dataList[i])
      results.push({ id: dataList[i].id, success: result.code === 0 })
    } catch (err) {
      results.push({ id: dataList[i].id, success: false, error: err.message })
    }
  }
  return { code: 0, data: { results } }
}
```

### syncQueue 批量 flush

```js
// flush 时合并同 collection 的 add 操作
function flushBatch() {
  var queue = getQueue()
  var batches = {}

  queue.forEach(function(op) {
    if (op.action === 'add' && !op.uploadImages) {
      if (!batches[op.collection]) batches[op.collection] = []
      batches[op.collection].push(op)
    }
  })

  Object.keys(batches).forEach(function(collection) {
    var ops = batches[collection]
    if (ops.length >= 3) {
      // 3条以上用批量接口
      wx.cloud.callFunction({
        name: 'record',
        data: { action: 'batchAdd', collection, data: ops.map(function(op) { return op.data }) }
      }).then(function(res) {
        ops.forEach(function(op) { dequeue(op.id, op.action) })
      })
    } else {
      // 3条以下逐条执行（保持原有逻辑）
      ops.forEach(function(op) { /* 原有逐条逻辑 */ })
    }
  })
}
```

---

## 九、同步状态 UI（改进：用户感知同步状态）

**现有问题**：同步成功/失败只有 console.warn，用户完全无感知。

### 全局同步状态

```js
// utils/sync-status.js
var syncStatus = {
  syncing: false,
  lastSyncTime: null,
  pendingCount: 0,
  failedCount: 0,
  errors: []
}

function getSyncStatus() {
  var queue = syncQueue.getQueue()
  syncStatus.pendingCount = queue.length
  syncStatus.failedCount = (syncQueue.getFailedQueue ? syncQueue.getFailedQueue() : []).length
  return syncStatus
}

function startSync() {
  syncStatus.syncing = true
  notifyPages()
}

function endSync(success) {
  syncStatus.syncing = false
  syncStatus.lastSyncTime = new Date().toISOString()
  if (!success) syncStatus.errors.push({ time: Date.now(), msg: '同步失败' })
  notifyPages()
}
```

### 页面展示

```wxml
<!-- 同步状态栏 -->
<view class="sync-bar" wx:if="{{syncStatus.pendingCount > 0 || syncStatus.syncing}}">
  <view wx:if="{{syncStatus.syncing}}" class="sync-loading">
    <view class="sync-spinner"></view>
    <text>同步中...</text>
  </view>
  <view wx:elif="{{syncStatus.pendingCount > 0}}" class="sync-pending">
    <text>{{syncStatus.pendingCount}} 条待同步</text>
    <view class="sync-btn" bindtap="manualSync">立即同步</view>
  </view>
  <view wx:if="{{syncStatus.failedCount > 0}}" class="sync-failed">
    <text>{{syncStatus.failedCount}} 条同步失败</text>
    <view class="sync-btn" bindtap="retryFailed">重试</view>
  </view>
</view>
```

---

## 十、fetch 防抖与缓存（改进：减少无效请求）

**现有问题**：每次 onLoad 都触发 fetch，快速进出页面会产生大量无效请求。

```js
var fetchThrottle = {}

async function throttledFetch(collection, fetchFn, minInterval) {
  minInterval = minInterval || 30000  // 30秒内不重复拉取
  var now = Date.now()
  if (fetchThrottle[collection] && now - fetchThrottle[collection] < minInterval) {
    return childStorage.get(STORAGE_KEY) || []
  }
  fetchThrottle[collection] = now
  return await fetchFn()
}

// 使用
async function fetchBrushingRecords() {
  return throttledFetch('brushingRecords', doFetchBrushingRecords, 30000)
}
```

---

## 十一、数据校验（改进：防止脏数据写入）

**现有问题**：云端返回的数据直接写入本地，无格式校验。

```js
// 通用校验器
function validateRecord(record, schema) {
  if (!record || typeof record !== 'object') return false
  for (var key in schema) {
    var rule = schema[key]
    if (rule.required && (record[key] === undefined || record[key] === null)) return false
    if (rule.type && typeof record[key] !== rule.type) return false
    if (rule.min !== undefined && record[key] < rule.min) return false
    if (rule.max !== undefined && record[key] > rule.max) return false
  }
  return true
}

// 使用示例
var BRUSHING_SCHEMA = {
  id: { required: true, type: 'string' },
  date: { required: true, type: 'string' },
  score: { type: 'number', min: 0, max: 100 },
  synced: { type: 'boolean' }
}

// mergeAndHeal 中过滤无效记录
cloudList = cloudList.filter(function(item) {
  return validateRecord(item, BRUSHING_SCHEMA)
})
```

---

## 十二、云端函数：幂等、权限与软删除

### 幂等写入

```js
// record/index.js 中的 addRecord
// 如果 data 带 _id，使用 doc(id).set() 实现 upsert
// 客户端传 _id: record.id 确保重复补传不会创建重复记录

// CloudBase 的 set vs update 语义：
// .set() — 替换整个文档，未指定的字段会被删除
// .update() — 仅更新指定字段，其他字段保留
// 推荐使用 .update() 避免意外覆盖其他字段
```

### 权限模型

| 集合类型 | 删除权限 |
|---------|---------|
| SHARED_COLLECTIONS | 同一家庭成员均可删除 |
| 其他集合 | 仅创建者或管理员 |

新增模块如需家庭共享删除，添加到 `SHARED_COLLECTIONS` 数组。

### 安全规则

```js
// 嵌套字段更新必须使用点号表示法
// ❌ 错误：会替换整个 user 对象，丢失 email 等字段
await db.collection('profiles').doc(id).update({
  user: { name: 'New Name' }
})

// ✅ 正确：仅更新 name 字段
await db.collection('profiles').doc(id).update({
  'user.name': 'New Name'
})
```

### 事务支持

```js
// 需要原子性操作时使用事务
await db.runTransaction(async function(transaction) {
  var todo = await transaction.collection('todos').doc(id).get()
  await transaction.collection('todos').doc(id).update({
    views: todo.data.views + 1
  })
})
```

### 软删除（改进：解决墓碑过期后数据复活问题）

**现有问题**：墓碑 30 天过期后，如果云端记录仍在，fetch 会重新拉回已删除的数据。

```js
// 服务端 removeRecord 改为软删除
async function removeRecord(member, collection, id) {
  // ...权限校验后
  await db.collection(collection).doc(id).update({
    data: { _deleted: true, _deletedAt: db.serverDate() }
  })
  return { code: 0 }
}

// listRecords 默认排除软删除
async function listRecords(member, collection, childId, page, pageSize) {
  var query = db.collection(collection).where({
    familyId: member.familyId,
    _deleted: _.neq(true)
  })
  // ...
}
```

### 错误处理

```js
// 云函数错误码规范
async function safeCloudCall(options) {
  try {
    var res = await wx.cloud.callFunction(options)
    if (res.result.code === 0) return res.result.data
    if (res.result.code === -2 && res.result.conflict) {
      // 冲突处理
      throw new SyncConflictError(res.result.msg)
    }
    throw new Error(res.result.msg || '未知错误')
  } catch (err) {
    if (err instanceof SyncConflictError) throw err
    console.warn('云函数调用失败:', err)
    // 入队重试
    syncQueue.enqueue(options.data)
    throw err
  }
}
```

---

## 十三、新建模块 Checklist

实现新的云同步模块时，按此清单逐项完成：

### cloud.js

- [ ] 定义常量：`COLLECTION`、`STORAGE_KEY`、`DELETED_KEY`、`RECORD_SCHEMA`
- [ ] `uploadXxx(record)` — 本地写入 → 云函数 add → 成功标记 synced → 失败入 syncQueue
- [ ] `fetchXxx()` — 云函数 list → `mergeAndHeal` 合并 → 返回结果
- [ ] `removeXxx(id)` — 写墓碑 → 更新本地 → 云函数 remove → 成功清除墓碑
- [ ] （可选）`updateXxx(id, updates)` — 更新本地 → 云函数 update → 失败入 syncQueue
- [ ] （可选）图片处理 — 本地路径检测 → 压缩上传 → fileID 回写

### cloudfunctions/record/index.js

- [ ] `ALLOWED_COLLECTIONS` 添加新集合名
- [ ] 如需家庭共享删除，添加到 `SHARED_COLLECTIONS`
- [ ] （可选）`batchAdd` action 支持批量写入
- [ ] （可选）`since` 参数支持增量同步
- [ ] （可选）`_deleted` 软删除字段

### 业务模块

- [ ] `onLoad` 或 `onShow` 时调用 `cloud.fetchXxx()` 拉取云端数据
- [ ] 写操作后调用 `cloud.uploadXxx()` 同步到云端
- [ ] 删除操作调用 `cloud.removeXxx()` 走墓碑流程
- [ ] （可选）展示同步状态 UI

### 代码规范

- [ ] 不手写内联合并，统一调用 `mergeAndHeal`
- [ ] 不写模块专属墓碑函数，统一使用 `getDeletedIdsByKey` / `addDeletedIdByKey`
- [ ] 同步状态使用 `synced` + `lastSyncAt` 双标记
- [ ] 新增集合名添加到云函数白名单
- [ ] 数据写入前用 `validateRecord` 校验
- [ ] 嵌套字段更新使用点号表示法

---

## 十四、现有模块升级优先级

| 模块 | 当前状态 | 升级建议 | 优先级 |
|------|---------|---------|--------|
| 记账 | ✅ 标准实现 | 无需改动 | - |
| 刷牙 | ⚠️ 使用专属墓碑函数 | 迁移到通用 helper | P2 |
| 商品 | ❌ 手写合并，无自愈，无 lastSyncAt | 重构为 mergeAndHeal + 双标记 + 通用墓碑 | P1 |
| AI技能 | ❌ 使用单例模式，无自愈 | 如需多设备同步，迁移到 list + mergeAndHeal | P2 |

### 改进项优先级

| 优先级 | 改进项 | 影响范围 | 实现难度 |
|--------|--------|---------|---------|
| P0 | 增量同步 | 所有模块 | 中 |
| P0 | fetch 防抖 | 所有模块 | 低 |
| P1 | 同步状态 UI | 用户体验 | 中 |
| P1 | syncQueue 改进 | 可靠性 | 中 |
| P2 | 冲突解决 | 数据一致性 | 高 |
| P2 | 数据校验 | 数据完整性 | 低 |
| P2 | 软删除 | 长期维护 | 中 |
| P3 | 批量操作 | 性能 | 高 |

---

## 参考资源

- [CloudBase 小程序文档数据库 SDK](https://skills.sh/tencentcloudbase/skills/cloudbase-document-database-in-wechat-miniprogram) — 腾讯官方 CRUD、分页、聚合规范
- [CloudBase 小程序开发规范](https://skills.sh/tencentcloudbase/skills/miniprogram-development) — wx.cloud 初始化、安全规则
- [Database Sync Patterns](https://skills.sh/claude-office-skills/skills/database-sync) — 通用数据库同步模式参考
