# 云同步共通抽象方案

## 概述

本方案将各模块的云同步逻辑抽取为共通的工厂函数，实现：
- **代码复用**：减少 83%-94% 的重复代码
- **策略统一**：确保所有模块使用相同的同步策略
- **易于扩展**：新增模块只需配置，无需编写重复逻辑
- **隔离级别支持**：支持家庭级、孩子级、成员级数据隔离

## 核心概念

### 数据隔离级别

```javascript
var ISOLATION_LEVEL = {
  FAMILY: 'family',      // 家庭级：所有孩子共享
  CHILD: 'child',        // 孩子级：按孩子隔离（默认）
  MEMBER: 'member'       // 成员级：按成员隔离
}
```

### 单例文档隔离级别

```javascript
var SINGLETON_ISOLATION = {
  FAMILY: 'family',      // familyId + key
  CHILD: 'child',        // familyId + childId + key（默认）
  MEMBER: 'member'       // familyId + memberId + key
}
```

## 工厂函数

### 1. createListFetcher - 列表型数据 fetch

```javascript
var cloud = require('./cloud.js')

// 创建 fetch 函数
var fetchNotes = cloud.createListFetcher({
  collection: 'notes',
  storageKey: 'notes',
  deletedKey: 'deletedNoteIds',
  isolation: cloud.ISOLATION_LEVEL.CHILD,
  pageSize: 200,
  hasImage: false
})

// 使用
async function loadNotes() {
  var notes = await fetchNotes()
  // 处理数据...
}
```

**配置参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| collection | string | 是 | 云函数集合名 |
| storageKey | string | 是 | 本地存储 key |
| deletedKey | string | 是 | 墓碑存储 key |
| isolation | string | 否 | 隔离级别，默认 'child' |
| pageSize | number | 否 | 分页大小，默认 100 |
| hasImage | boolean | 否 | 是否有图片字段，默认 false |
| imageField | string | 否 | 图片字段名（hasImage=true 时必填）|
| transformCloudItem | function | 否 | 云端数据转换函数 |
| expandLegacyItem | function | 否 | 旧格式展开函数 |
| migrateLegacy | function | 否 | 旧数据迁移函数 |
| gameType | string | 否 | 游戏类型（游戏模块专用）|

### 2. createUploader - 上传操作（不带图片）

```javascript
var cloud = require('./cloud.js')

// 创建 upload 函数
var uploadNote = cloud.createUploader({
  collection: 'notes',
  storageKey: 'notes',
  isolation: cloud.ISOLATION_LEVEL.CHILD
})

// 使用
async function saveNote(note) {
  await uploadNote(note)
}
```

**配置参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| collection | string | 是 | 云函数集合名 |
| storageKey | string | 是 | 本地存储 key |
| isolation | string | 否 | 隔离级别，默认 'child' |

### 3. createUploaderWithImage - 上传操作（带图片）

```javascript
var cloud = require('./cloud.js')

// 创建带图片的 upload 函数
var uploadDrawing = cloud.createUploaderWithImage({
  collection: 'drawings',
  storageKey: 'drawings',
  imageField: 'imagePath',
  cloudPathPrefix: 'drawings/',
  isolation: cloud.ISOLATION_LEVEL.CHILD,
  multiImage: false
})

// 使用
async function saveDrawing(drawing, tempFilePath) {
  await uploadDrawing(drawing, tempFilePath)
}
```

**配置参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| collection | string | 是 | 云函数集合名 |
| storageKey | string | 是 | 本地存储 key |
| imageField | string | 是 | 图片字段名 |
| cloudPathPrefix | string | 是 | 云存储路径前缀 |
| isolation | string | 否 | 隔离级别，默认 'child' |
| multiImage | boolean | 否 | 是否支持多图，默认 false |

### 4. createRemover - 删除操作

```javascript
var cloud = require('./cloud.js')

// 创建 remove 函数
var removeNote = cloud.createRemover({
  collection: 'notes',
  storageKey: 'notes',
  deletedKey: 'deletedNoteIds',
  isolation: cloud.ISOLATION_LEVEL.CHILD
})

// 使用
async function deleteNote(id) {
  var success = await removeNote(id)
  if (success) {
    // 删除成功
  }
}
```

**配置参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| collection | string | 是 | 云函数集合名 |
| storageKey | string | 是 | 本地存储 key |
| deletedKey | string | 是 | 墓碑存储 key |
| isolation | string | 否 | 隔离级别，默认 'child' |

### 5. createSingletonSync - 单例型数据同步

```javascript
var cloud = require('./cloud.js')

// 创建单例同步对象
var habitsSync = cloud.createSingletonSync({
  collection: 'userSettings',
  key: 'habits',
  storageKey: 'habits',
  isolation: cloud.SINGLETON_ISOLATION.CHILD,
  useOptimisticLock: true
})

// 上传
async function saveHabits(habits) {
  await habitsSync.upload(habits)
}

// 获取
async function loadHabits() {
  var habits = await habitsSync.fetch()
  return habits
}
```

**配置参数**：
| 参数 | 类型 | 必填 | 说明 |
|------|------|------|------|
| collection | string | 是 | 云函数集合名 |
| key | string | 是 | 单例 key |
| storageKey | string | 是 | 本地存储 key |
| isolation | string | 否 | 隔离级别，默认 'child' |
| useOptimisticLock | boolean | 否 | 是否使用乐观锁，默认 true |

## 模块配置表

### 列表型模块

```javascript
var LIST_MODULE_CONFIGS = {
  // 孩子级隔离
  drawings: {
    collection: 'drawings',
    storageKey: 'drawings',
    deletedKey: 'deletedDrawingIds',
    isolation: cloud.ISOLATION_LEVEL.CHILD,
    pageSize: 100,
    hasImage: true,
    imageField: 'imagePath',
    cloudPathPrefix: 'drawings/'
  },
  notes: {
    collection: 'notes',
    storageKey: 'notes',
    deletedKey: 'deletedNoteIds',
    isolation: cloud.ISOLATION_LEVEL.CHILD,
    pageSize: 200,
    hasImage: false
  },
  // ... 其他模块
  
  // 家庭级共享
  gameRecords: {
    collection: 'gameRecords',
    storageKey: 'gameRecords',
    deletedKey: 'deletedGameRecordIds',
    isolation: cloud.ISOLATION_LEVEL.FAMILY,
    pageSize: 200,
    hasImage: false
  }
}
```

### 单例型模块

```javascript
var SINGLETON_MODULE_CONFIGS = {
  habits: {
    collection: 'userSettings',
    key: 'habits',
    storageKey: 'habits',
    isolation: cloud.SINGLETON_ISOLATION.CHILD,
    useOptimisticLock: true
  },
  learnProgress: {
    collection: 'userSettings',
    key: 'learnProgress',
    storageKey: 'learnProgress',
    isolation: cloud.SINGLETON_ISOLATION.CHILD,
    useOptimisticLock: true
  },
  // ... 其他模块
}
```

## 使用示例

### 示例1：笔记模块

```javascript
var cloud = require('./cloud.js')

// 创建 fetch/upload/remove 函数
var fetchNotes = cloud.createListFetcher({
  collection: 'notes',
  storageKey: 'notes',
  deletedKey: 'deletedNoteIds',
  isolation: cloud.ISOLATION_LEVEL.CHILD,
  pageSize: 200
})

var uploadNote = cloud.createUploader({
  collection: 'notes',
  storageKey: 'notes',
  isolation: cloud.ISOLATION_LEVEL.CHILD
})

var removeNote = cloud.createRemover({
  collection: 'notes',
  storageKey: 'notes',
  deletedKey: 'deletedNoteIds',
  isolation: cloud.ISOLATION_LEVEL.CHILD
})

// 页面中使用
Page({
  data: {
    notes: []
  },
  
  onShow: async function() {
    this.setData({ notes: await fetchNotes() })
  },
  
  addNote: async function(note) {
    await uploadNote(note)
    this.setData({ notes: await fetchNotes() })
  },
  
  deleteNote: async function(id) {
    await removeNote(id)
    this.setData({ notes: await fetchNotes() })
  }
})
```

### 示例2：习惯定义（单例）

```javascript
var cloud = require('./cloud.js')

// 创建单例同步对象
var habitsSync = cloud.createSingletonSync({
  collection: 'userSettings',
  key: 'habits',
  storageKey: 'habits',
  isolation: cloud.SINGLETON_ISOLATION.CHILD,
  useOptimisticLock: true
})

// 页面中使用
Page({
  data: {
    habits: []
  },
  
  onShow: async function() {
    this.setData({ habits: await habitsSync.fetch() })
  },
  
  saveHabits: async function(habits) {
    await habitsSync.upload(habits)
    this.setData({ habits: await habitsSync.fetch() })
  }
})
```

### 示例3：游戏记录（家庭级共享）

```javascript
var cloud = require('./cloud.js')

// 创建家庭级共享的 fetch 函数
var fetchGameRecords = cloud.createListFetcher({
  collection: 'gameRecords',
  storageKey: 'gameRecords',
  deletedKey: 'deletedGameRecordIds',
  isolation: cloud.ISOLATION_LEVEL.FAMILY,
  pageSize: 200,
  gameType: 'rps'  // 按游戏类型过滤
})

// 页面中使用
Page({
  data: {
    gameRecords: []
  },
  
  onShow: async function() {
    this.setData({ gameRecords: await fetchGameRecords() })
  }
})
```

## 安全性保障

### 1. 墓碑机制
- 删除记录时写入墓碑（30天 TTL）
- fetch 时过滤墓碑中的记录
- 防止已删除记录被拉回

### 2. 乐观锁
- 单例数据使用 updatedAt 时间戳比较
- 云端更新时才覆盖本地
- 防止旧数据覆盖新数据

### 3. 自愈机制
- 本地未同步记录自动补传
- 带图片的记录自动上传图片
- 最多补传 5 条记录

### 4. 离线队列
- 离线写入自动入队
- 联网后自动 flush
- 失败自动重试（最多 5 次）

## 扩展指南

### 新增列表型模块

```javascript
// 1. 添加配置
var newListModule = {
  collection: 'newCollection',
  storageKey: 'newStorageKey',
  deletedKey: 'deletedNewIds',
  isolation: cloud.ISOLATION_LEVEL.CHILD,
  pageSize: 100,
  hasImage: false
}

// 2. 创建函数
var fetchNewModule = cloud.createListFetcher(newListModule)
var uploadNewModule = cloud.createUploader(newListModule)
var removeNewModule = cloud.createRemover(newListModule)
```

### 新增单例型模块

```javascript
// 1. 添加配置
var newSingletonModule = {
  collection: 'userSettings',
  key: 'newKey',
  storageKey: 'newStorageKey',
  isolation: cloud.SINGLETON_ISOLATION.CHILD,
  useOptimisticLock: true
}

// 2. 创建同步对象
var newSync = cloud.createSingletonSync(newSingletonModule)
```

## 测试

运行测试文件验证工厂函数的正确性：

```javascript
var test = require('./cloud-sync-test.js')
test.runTests()
```

## 注意事项

1. **向后兼容**：原有的函数仍然保留，新旧代码可以混用
2. **隔离级别**：默认为孩子级，家庭级和成员级需要显式配置
3. **图片处理**：带图片的模块使用 syncQueue 两阶段同步
4. **乐观锁**：单例数据默认启用，可通过 `useOptimisticLock: false` 关闭
5. **墓碑清理**：自动清理 30 天前的墓碑记录
