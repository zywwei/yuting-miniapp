# 钰婷成长小助手 - 优化规划

> 生成日期：2026-06-18
> 基于全面代码审查，覆盖所有 5 大模块（首页、习惯养成、学习乐园、创意天地、成长笔记）

---

## 总览

| 阶段 | 主题 | 工作量 | 优先级 |
|------|------|--------|--------|
| 第一阶段 | 数据源统一与 Bug 修复 | 中 | P0 |
| 第二阶段 | 代码去重与模块化重构 | 大 | P0-P1 |
| 第三阶段 | 性能优化与缓存策略 | 中 | P1 |
| 第四阶段 | 功能补全与体验增强 | 大 | P2 |
| 第五阶段 | 代码质量与工程规范 | 小 | P2 |

---

## 第一阶段：数据源统一与 Bug 修复

**目标**：消除数据不一致风险，修复明确的逻辑错误。
**工作量**：中（约 2-3 天）
**向后兼容**：本阶段不改变任何 Storage 数据结构，只统一数据来源。

### 1.1 统一默认习惯数据源

**问题**：默认习惯在 5 个文件中各自硬编码，修改一处其他地方不同步。

| 文件 | 当前行为 | 改动 |
|------|----------|------|
| `pages/index/index.js:67-76` | 自带 8 个默认习惯（少了 nap/tidy/housework/reading/exercise/polite） | 删除，改用 `habitManager.getAllHabits()` |
| `pages/habits/index.js:44-63` | 自带 14 个默认习惯数组 | 删除，改用 `habitManager.getAllHabits()` |
| `pages/habits/detail.js:265-280` | 用 Object 形式定义 14 个默认习惯 | 删除，改用 `habitManager.getAllHabits()` 按 type 查找 |
| `pages/habits/habit-stats/habit-stats.js:39-53` | 用 Object 形式定义 13 个（少了 brushing） | 删除，改用 `habitManager.getAllHabits()` |
| `utils/habit-manager.js:11-30` | **保留为唯一数据源** | 不改 |

**实现方式**：
1. 在 `utils/habit-manager.js` 中导出 `getDefaultHabit(type)` 方法，支持按 type 查找单个习惯
2. 各页面 `require('../../utils/habit-manager.js')` 后调用 `getAllHabits()` 或 `getDefaultHabit(type)`
3. 首页 `loadTodayHabits()` 改为：先取 `getAllHabits()` 再截取前 8 个常用习惯用于展示

**预期效果**：修改默认习惯只需改 `habit-manager.js` 一处。

### 1.2 统一 calcStreak 函数

**问题**：`calcStreak` 在 7 个文件中重复定义，且 `gallery.js` 版本有日期格式 bug。

| 文件 | 行号 | 处理方式 |
|------|------|----------|
| `utils/habit-utils.js:11-35` | **保留为唯一定义** | 不改 |
| `pages/habits/index.js:123-147` | 删除，改用 `require` 导入 |  |
| `pages/index/index.js:213-237` | 删除，改用 `require` 导入 |  |
| `pages/habits/detail.js:365-389` | 删除，改用 `require` 导入 |  |
| `utils/habit-manager.js:91-115` | 删除，改用 `require` 导入 |  |
| `utils/achievements.js:227-247` | 删除，改用 `require` 导入 |  |
| `pages/parent/index.js:73-97` | 删除，改用 `require` 导入 |  |
| `pages/create/gallery/gallery.js:50-88` | **修复日期格式 bug 后删除** | 见 1.3 |

**实现方式**：
```js
// 各文件顶部添加
var habitUtils = require('../../utils/habit-utils.js')
// 使用时
var streak = habitUtils.calcStreak(records)
```

**预期效果**：calcStreak 只存在一处，修改逻辑只需改一个文件。

### 1.3 修复画廊 calcStreak 日期格式 Bug

**问题**：`pages/create/gallery/gallery.js:57` 中 `date.getMonth()` 未 +1 且未补零，导致日期 key 格式如 `2026-5-17` 而非 `2026-05-17`，与后续比较逻辑不匹配。

**改动**：
- 删除 `gallery.js` 中的 `calcStreak` 方法（第 50-88 行）
- 引入 `utils/habit-utils.js` 中的 `calcStreak`
- 但注意：gallery 的记录结构是 `{ createTime: ISO }` 而非 `{ date: 'YYYY-MM-DD' }`，需要先提取日期
- 在 `gallery.js` 中新增一个 `extractDatesFromDrawings(drawings)` 辅助函数，将画作的 `createTime` 转为 `YYYY-MM-DD` 格式后再调用 `calcStreak`

**预期效果**：画廊连续创作天数计算正确。

### 1.4 修复 TOTAL_ACHIEVEMENTS 硬编码

**问题**：`utils/achievements.js:12` 中 `TOTAL_ACHIEVEMENTS = 40` 硬编码，但实际成就数量为 40 个（需验证），新增成就时需手动改。

**改动**：
```js
// 第 12 行改为
var TOTAL_ACHIEVEMENTS = ACHIEVEMENTS.length
```

**注意**：`TOTAL_ACHIEVEMENTS` 在 `ACHIEVEMENTS` 数组之后定义，存在循环引用问题。解决方案：将 `legend` 成就的 `condition` 和 `progress` 改为运行时读取 `ACHIEVEMENTS.length`，或者将 `TOTAL_ACHIEVEMENTS` 定义移到 `ACHIEVEMENTS` 之后。

**预期效果**：新增成就不需要手动更新总数。

### 1.5 移除 learn-data.js 的重复数据

**问题**：`utils/learn-data.js` 已定义了 120 个汉字和 25 首古诗，但 `pages/learn/cards.js` 和 `pages/learn/poems.js` 各自内嵌了完全相同的数据。

**改动**：

| 文件 | 改动 |
|------|------|
| `pages/learn/cards.js:5-127` | 删除 `BUILTIN_CARDS` 数组，改为 `var CARDS = require('../../utils/learn-data.js').CARDS` |
| `pages/learn/poems.js:5-31` | 删除 `BUILTIN_POEMS` 数组，改为 `var POEMS = require('../../utils/learn-data.js').POEMS` |
| `utils/learn-data.js` | 确认导出的 `CARDS` 和 `POEMS` 与页面内嵌数据完全一致 |

**预期效果**：学习数据只存储一处，包体积减小约 5KB。

### 1.6 修复 app.js 硬编码生日和姓名

**问题**：`app.js:40-41` 中 `settings` 的默认值硬编码了 `birthday: '2022-03-23'` 和 `childName: '钰婷'`，且 `app.js:54` 的 `calcGrowthDays()` 也硬编码了生日。

**改动**：
```js
// app.js initStorage 中保持 defaults 不变（首次安装时的默认值）
// calcGrowthDays 改为从 settings 读取
calcGrowthDays() {
  var settings = wx.getStorageSync('settings') || { birthday: '2022-03-23' }
  var birthday = new Date(settings.birthday)
  var today = new Date()
  var diff = today - birthday
  this.globalData.growthDays = Math.floor(diff / (1000 * 60 * 60 * 24))
}
```

**预期效果**：家长在设置中修改生日后，成长天数自动更新。

---

## 第二阶段：代码去重与模块化重构

**目标**：消除大量重复代码，将大文件拆分为职责单一的模块。
**工作量**：大（约 4-5 天）
**向后兼容**：不改变页面 URL 和 Storage 数据结构。

### 2.1 提取习惯打卡公共模块

**问题**：`pages/habits/checkin/checkin.js`（379 行）与 `pages/habits/detail.js`（792 行）有约 70% 的代码重复，包括：
- 表单处理（`onFieldInput`、`onFieldTimeChange`、`onFieldCounter`、`onFieldSelect`、`onFieldMood`）
- 照片处理（`takePhoto`、`deletePhoto`、`editPhoto`、`previewImage`、`applyEditedPhoto`）
- 图片持久化逻辑（`saveImages`）
- 评分选择（`selectScore`）

**新增文件**：`utils/checkin-helpers.js`

```js
// 提取以下公共函数：
module.exports = {
  initFormData,        // 初始化表单数据
  handleFieldInput,    // 文本输入处理
  handleFieldTimeChange, // 时间选择处理
  handleFieldCounter,  // 计数器增减
  handleFieldSelect,   // 单选/多选处理
  handleFieldMood,     // 心情选择
  handleSelectScore,   // 评分选择
  takePhoto,           // 拍照
  deletePhoto,         // 删除照片
  editPhoto,           // 编辑照片
  applyEditedPhoto,    // 应用编辑后的照片
  saveImages           // 图片持久化（带超时保护）
}
```

**改动**：
- `checkin.js` 和 `detail.js` 引入 `checkin-helpers.js`，删除重复的函数定义
- `detail.js` 预计从 792 行缩减到约 400 行
- `checkin.js` 预计从 379 行缩减到约 200 行

**预期效果**：打卡相关代码减少约 500 行，修改表单逻辑只需改一处。

### 2.2 拆分刷牙计时器

**问题**：`pages/habits/brushing-timer/brushing-timer.js` 有 1462 行，60+ 个 data 字段，15+ 个定时器。

**拆分方案**：

| 新文件 | 职责 | 预估行数 |
|--------|------|----------|
| `brushing-timer.js` | 主页面逻辑、生命周期 | ~300 |
| `timer-engine.js` | 计时器核心逻辑（开始/暂停/恢复/完成） | ~200 |
| `brush-areas.js` | 刷牙区域管理（切换、进度） | ~150 |
| `story-battle.js` | 故事战斗系统（敌人HP、伤害、章节推进） | ~200 |
| `timer-effects.js` | 动画、音效、奖励星星 | ~150 |

**改动**：
1. 将 `data` 中与计时器相关的字段提取到 `timer-engine.js` 作为状态管理
2. 将 `startTimer`/`pauseTimer`/`resumeTimer`/`completeBrushing` 等方法移到 `timer-engine.js`
3. 将敌人战斗相关方法移到 `story-battle.js`
4. `brushing-timer.js` 变为薄壳，负责页面生命周期和事件分发

**预期效果**：主文件从 1462 行缩减到约 300 行，各模块职责清晰。

### 2.3 拆分 detail.js

**问题**：`pages/habits/detail.js`（792 行）混合了表单处理、照片管理、打卡逻辑、统计展示。

**在 2.1 完成后**，detail.js 的职责变为：
- 习惯详情加载和展示（~150 行）
- 打卡提交逻辑（~100 行）
- 记录列表和详情弹窗（~100 行）

**改动**：2.1 完成后 detail.js 自然缩减到约 400 行，无需额外拆分。如果仍有需要，可将记录列表相关方法提取为组件。

### 2.4 统一成就数据采集

**问题**：`utils/achievements.js` 的 `getCurrentData()` 每次调用触发 7+ 次 Storage 读取：
- `drawings`、`notes`、`brushingRecords`（通过 `util.getBrushingStats`）
- `learnProgress`（通过 `learnData` 的 4 个方法各读一次）
- `achievements`（通过 `getUnlockedAchievements`）
- `habitRecords`（通过 `getHabitExtraData`）

**改动**：
```js
// getCurrentData 改为一次性读取所有需要的数据
var getCurrentData = function(records) {
  var brushingRecords = records || wx.getStorageSync('brushingRecords') || []
  var drawings = wx.getStorageSync('drawings') || []
  var notes = wx.getStorageSync('notes') || []
  var habitRecords = wx.getStorageSync('habitRecords') || []
  var learnProgress = wx.getStorageSync('learnProgress') || {}
  var achievementsList = wx.getStorageSync('achievements') || []

  // 从 learnProgress 直接计算，不再调用 learnData 的方法
  var cardsLearned = Object.keys(learnProgress.cards || {}).length
  var poemsMemorized = Object.keys(learnProgress.poems || {}).length
  var numbersLearned = Object.keys(learnProgress.numbers || {}).length
  var englishLearned = Object.keys(learnProgress.english || {}).length

  // ... 其余逻辑不变
}
```

**预期效果**：成就检查从 7+ 次 Storage 读取减少到 5 次。

---

## 第三阶段：性能优化与缓存策略

**目标**：减少不必要的 Storage 读取和网络请求，优化页面加载速度。
**工作量**：中（约 2-3 天）
**向后兼容**：不改变数据结构。

### 3.1 优化 onShow 全量加载

**问题**：多个页面在 `onShow` 中每次都从 Storage 全量读取并重新计算，包括：
- `pages/index/index.js:27-36` — 每次切换 tab 都重新加载习惯、成就、推荐
- `pages/habits/index.js:27-33` — 每次切换 tab 都重新加载全部习惯
- `pages/learn/index.js` — 每次切换 tab 都重新加载学习进度
- `pages/notes/index.js:13-19` — 每次切换 tab 都重新加载全部笔记

**改动方案**：引入脏标记（dirty flag）机制

```js
// 在 app.js globalData 中添加
dataDirty: {
  habits: true,
  learn: true,
  notes: true,
  achievements: true
}

// 各页面 onShow 中
onShow: function() {
  var app = getApp()
  if (app.globalData.dataDirty.habits) {
    this.loadTodayHabits()
    app.globalData.dataDirty.habits = false
  }
}

// 打卡/添加/删除操作后标记为脏
// 例如 detail.js 打卡成功后：
getApp().globalData.dataDirty.habits = true
getApp().globalData.dataDirty.achievements = true
```

**预期效果**：Tab 切换时不再重复加载未变化的数据，页面切换更流畅。

### 3.2 优化 habitRecords 全量扫描

**问题**：习惯列表/详情/统计页每次都 `filter` 全量 `habitRecords`，当记录累积到数百条时性能下降。

**改动方案**：建立按 type 索引的缓存

```js
// 在 utils/habit-manager.js 中新增
var _recordsByTypeCache = null
var _recordsCacheVersion = 0

var getRecordsByType = function(type) {
  if (!_recordsByTypeCache) {
    var records = wx.getStorageSync('habitRecords') || []
    _recordsByTypeCache = {}
    records.forEach(function(r) {
      if (!_recordsByTypeCache[r.type]) _recordsByTypeCache[r.type] = []
      _recordsByTypeCache[r.type].push(r)
    })
  }
  return _recordsByTypeCache[type] || []
}

var invalidateRecordsCache = function() {
  _recordsByTypeCache = null
}
```

**使用方式**：
- 习惯详情页、统计页调用 `habitManager.getRecordsByType(type)` 替代 `records.filter()`
- 打卡成功后调用 `habitManager.invalidateRecordsCache()` 清除缓存

**预期效果**：习惯详情页加载速度从 O(n) 降为 O(1)（缓存命中时）。

### 3.3 优化画廊数据加载

**问题**：`pages/create/gallery/gallery.js:16-17` 每次 `onShow` 都调用 `cloud.fetchDrawings()` 从云端拉取全量数据。

**改动**：
1. 引入脏标记，只在画作有变更时才重新拉取
2. 首次加载后缓存数据，后续 onShow 直接使用缓存
3. 从画画页返回时（通过 `onShow` + 脏标记）才刷新

```js
onShow: function() {
  var app = getApp()
  if (app.globalData.dataDirty.drawings) {
    this.loadData()
    app.globalData.dataDirty.drawings = false
  }
}
```

**预期效果**：画廊页面切换时不再重复请求云端数据。

### 3.4 Storage 操作添加 try-catch

**问题**：全项目 Storage 操作缺少错误处理，当存储空间满时会直接崩溃。

**改动**：在 `utils/util.js` 中添加安全封装：

```js
var safeGetStorage = function(key, defaultValue) {
  try {
    return wx.getStorageSync(key) || defaultValue
  } catch (e) {
    console.warn('Storage 读取失败:', key, e)
    return defaultValue
  }
}

var safeSetStorage = function(key, value) {
  try {
    wx.setStorageSync(key, value)
    return true
  } catch (e) {
    console.error('Storage 写入失败:', key, e)
    wx.showToast({ title: '存储空间不足', icon: 'none' })
    return false
  }
}
```

**改动范围**：逐步替换全项目中的 `wx.getStorageSync` / `wx.setStorageSync` 调用。优先处理高频调用路径（习惯打卡、学习进度、笔记保存）。

**预期效果**：存储异常时不会白屏崩溃，给用户友好提示。

### 3.5 解决画画页面内存问题

**问题**：`pages/create/draw/draw.js` 的 `saveHistory` 每次调用 `canvas.toDataURL()` 可能产生数百 KB 的数据，30 张历史可能占用数十 MB 内存。

**改动方案**：
1. 将历史记录上限从 30 降低到 15
2. 使用缩略图代替全分辨率截图：先将 canvas 缩小到 1/2 分辨率再导出
3. 或者改用 `canvas.toTempFilePath` 保存到文件系统，只在 history 数组中存储文件路径

```js
// 方案 B（推荐）：保存为文件而非内存
saveHistory: function() {
  var that = this
  this.ctx.canvas.toTempFilePath({
    x: 0, y: 0,
    width: that.data.canvasWidth,
    height: that.data.canvasHeight,
    destWidth: that.data.canvasWidth / 2,  // 缩小 50%
    destHeight: that.data.canvasHeight / 2,
    quality: 0.6,
    success: function(res) {
      that.data.history.push(res.tempFilePath)
      if (that.data.history.length > 15) {
        that.data.history.shift()
      }
    }
  })
}
```

**预期效果**：画画历史内存占用从数十 MB 降低到几 MB。

---

## 第四阶段：功能补全与体验增强

**目标**：补全缺失的功能入口，提升用户体验。
**工作量**：大（约 5-7 天）
**向后兼容**：所有新增功能不影响现有数据。

### 4.1 笔记模块增强

**子任务**：

| 任务 | 改动文件 | 说明 |
|------|----------|------|
| 笔记编辑功能 | `pages/notes/detail.js`、`pages/notes/add.js` | 复用 `add.js` 页面，传入 `id` 参数时进入编辑模式，调用 `noteManager.updateNote()` |
| 笔记分页加载 | `pages/notes/index.js` | 当前只显示前 20 条（`index.js:30`），改为触底加载更多 |
| 笔记搜索/标签筛选 | `pages/notes/index.js` | `note-manager.js` 已有 `searchNotes()` 和 `getNotesByTag()`（第 81-108 行），只需在页面中添加搜索框和标签列表 |
| 笔记云端同步 | `utils/cloud.js` | 参照 `uploadHabitRecord` 模式，添加 `uploadNote`/`fetchNotes`/`removeNote` 方法 |

**优先级**：编辑 > 分页 > 搜索 > 云端同步

### 4.2 习惯模块增强

| 任务 | 改动文件 | 说明 |
|------|----------|------|
| 已完成习惯按钮 disabled | `pages/habits/index.wxml` | 当 `completed` 为 true 时添加 `disabled` 样式和阻止点击 |
| 自定义习惯编辑/删除 | `pages/habits/index.js`、`pages/habits/index.wxml` | 长按自定义习惯弹出操作菜单（编辑/删除），调用 `habitManager` 已有的 `deleteCustomHabit()` |
| 折叠状态持久化 | `pages/habits/index.js:168-173` | 将 `collapsed` 状态保存到 Storage，onLoad 时读取 |

### 4.3 学习模块增强

| 任务 | 改动文件 | 说明 |
|------|----------|------|
| 识字卡片分类浏览 | `pages/learn/cards.js`、`pages/learn/cards.wxml` | 数据已有 `category` 字段（基础/动物/水果等），添加分类 Tab 或筛选 |
| 古诗全文朗读 | `pages/learn/poems.js` | 集成微信同声传译插件（`plugin://WechatSI/record`），或使用 `wx.createInnerAudioContext` 播放预录音频 |
| 古诗背诵测试 | `pages/learn/poems.js` | 新增"背诵模式"：隐藏部分字词让用户填写 |

### 4.4 创作模块增强

| 任务 | 改动文件 | 说明 |
|------|----------|------|
| 模板预览缩略图 | `pages/create/templates/templates.wxml` | 为每个模板生成预览缩略图（可预渲染或使用静态图片） |

### 4.5 成就系统增强

| 任务 | 改动文件 | 说明 |
|------|----------|------|
| 成就弹窗音效 | `utils/audio.js`、成就弹窗组件 | 解锁成就时播放特殊音效 |

### 4.6 家长模块增强

| 任务 | 改动文件 | 说明 |
|------|----------|------|
| 父母管理页密码保护 | `pages/parent/index.js` | 进入时弹出简单密码验证（4 位数字），密码存储在 settings 中 |

### 4.7 首页推荐优化

**问题**：当前推荐逻辑过于简单（`learn-data.js:231-303`），只是按顺序取未学内容。

**改动**：在 `utils/learn-data.js` 的 `getRecommendations()` 中增加智能推荐：
- 优先推荐昨日未完成的习惯
- 推荐最近学过但未巩固的汉字（间隔重复）
- 根据时间段推荐（早上推荐习惯，下午推荐学习，晚上推荐笔记）

---

## 第五阶段：代码质量与工程规范

**目标**：统一代码风格，提升可维护性。
**工作量**：小（约 1-2 天）
**向后兼容**：纯代码层面改动，不影响功能。

### 5.1 统一 var/let/const 使用

**问题**：全项目 `var`/`let`/`const` 使用不一致，部分文件用 `var`，部分用 `const`/`let`。

**改动**：
- 新代码统一使用 `const`（不可变引用）和 `let`（可变引用）
- 逐步替换存量 `var`，优先处理 utils 目录下的工具文件
- 不做全局一次性替换，每次修改相关文件时顺带替换

### 5.2 speak.js 语音合成升级

**问题**：`utils/speak.js` 当前只是音效+振动+Toast 提示，没有真正的语音合成。

**改动方案**：
1. 优先方案：集成微信同声传译插件（`WechatSI`），需要在 `app.json` 中声明插件
2. 备选方案：使用 `wx.createInnerAudioContext` 播放预录制的语音文件

**注意**：微信同声传译插件需要申请审核，可能需要一定时间。

### 5.3 备份文件优化

**问题**：`utils/backup.js` 将图片转为 Base64 内嵌到 JSON 中，导致备份文件巨大（几十张图片可能产生 100MB+ 的备份文件）。

**改动方案**：
1. 备份时将图片保存为独立文件，打包为 zip 格式
2. 或者备份时只备份元数据，图片通过云存储 fileID 引用（恢复时再下载）
3. 压缩图片质量（当前原图保存，可改为 80% 质量）

### 5.4 云开发环境 ID 配置

**问题**：`app.js:7` 中 `env: 'your-env-id'` 仍是占位符。

**改动**：
```js
// app.js
wx.cloud.init({
  env: 'prod-xxx',  // 替换为实际的云开发环境 ID
  traceUser: true
})
```

**注意**：需要先在微信云开发控制台创建环境，获取环境 ID。如果暂时不使用云开发，可保持现状（代码已有降级逻辑）。

---

## 实施建议

### 执行顺序

```
第一阶段（P0 修复）→ 第二阶段（P0-P1 重构）→ 第三阶段（P1 性能）→ 第四阶段（P2 功能）→ 第五阶段（P2 规范）
```

每个阶段完成后应进行以下验证：
1. **微信开发者工具编译**：确保无语法错误
2. **模拟器测试**：验证所有页面正常加载
3. **真机预览**：在实际设备上测试核心流程（刷牙打卡、习惯打卡、学习、画画、笔记）
4. **数据兼容性**：确认旧版本 Storage 数据能正常读取

### 风险控制

| 风险 | 应对措施 |
|------|----------|
| 重构引入回归 Bug | 每次改动后在模拟器中测试所有 tab 页面 |
| Storage 数据迁移 | 所有改动保持向后兼容，不删除已有字段 |
| 刷牙计时器拆分影响战斗系统 | 拆分时保持所有函数签名不变，只改变文件组织 |
| 云开发环境 ID 未配置 | 代码已有完善的降级逻辑，不会崩溃 |

### 里程碑

| 里程碑 | 完成标志 |
|--------|----------|
| M1：数据源统一 | 所有默认习惯来自 `habit-manager.js`，所有 calcStreak 来自 `habit-utils.js` |
| M2：代码去重 | `detail.js` < 500 行，`brushing-timer.js` < 400 行，无重复的表单/照片处理代码 |
| M3：性能达标 | Tab 切换无卡顿，画廊不重复请求云端，Storage 操作有 try-catch |
| M4：功能完整 | 笔记可编辑/搜索/分页，自定义习惯可编辑/删除，识字可分类浏览 |
| M5：工程规范 | var/let/const 统一，备份文件大小合理，语音合成可用 |

---

## 文件变更清单

### 新增文件
- `utils/checkin-helpers.js` — 打卡表单/照片公共逻辑
- `pages/habits/brushing-timer/timer-engine.js` — 计时器核心
- `pages/habits/brushing-timer/brush-areas.js` — 刷牙区域管理
- `pages/habits/brushing-timer/story-battle.js` — 故事战斗系统
- `pages/habits/brushing-timer/timer-effects.js` — 动画音效奖励

### 主要修改文件
- `app.js` — 修复硬编码生日、添加 dataDirty 标记
- `utils/habit-manager.js` — 添加 getDefaultHabit()、getRecordsByType()、缓存机制
- `utils/habit-utils.js` — 确认为 calcStreak 唯一数据源
- `utils/achievements.js` — 修复 TOTAL_ACHIEVEMENTS、优化 getCurrentData
- `utils/learn-data.js` — 确认为学习数据唯一数据源
- `utils/util.js` — 添加 safeGetStorage/safeSetStorage
- `utils/cloud.js` — 添加笔记云同步方法
- `utils/speak.js` — 升级语音合成
- `utils/backup.js` — 优化备份文件大小
- `pages/index/index.js` — 引入 habitManager、优化 onShow
- `pages/habits/index.js` — 引入 habitManager、优化 onShow
- `pages/habits/detail.js` — 引入 checkin-helpers、精简代码
- `pages/habits/checkin/checkin.js` — 引入 checkin-helpers、精简代码
- `pages/habits/habit-stats/habit-stats.js` — 引入 habitManager
- `pages/habits/brushing-timer/brushing-timer.js` — 大幅拆分
- `pages/learn/cards.js` — 引入 learn-data.js
- `pages/learn/poems.js` — 引入 learn-data.js、添加背诵测试
- `pages/create/gallery/gallery.js` — 修复 calcStreak bug、优化 onShow
- `pages/create/draw/draw.js` — 优化 saveHistory 内存
- `pages/notes/index.js` — 添加分页/搜索/标签
- `pages/notes/detail.js` — 添加编辑功能
- `pages/notes/add.js` — 支持编辑模式
- `pages/parent/index.js` — 引入 habitUtils、添加密码保护
