# 笔记模块全方位 Code Review 报告

> 审查范围：`pages/notes/`（index/add/detail）、`utils/note-manager.js`、`utils/cloud.js` 笔记同步段、`cloudfunctions/record/index.js`、`cloudfunctions/interaction/index.js`、`utils/child-storage.js`、`utils/auth.js`、`utils/util.js`
> 审查重点：权限模型、图片同步、数据一致性、安全边界
> 审查日期：2026-07-08

---

## 一、模块架构概览

```
┌─────────────────────────────────────────────────────────┐
│  前端页面 (主包)                                          │
│  pages/notes/index.js  (列表 390行)                       │
│  pages/notes/add.js    (新建/编辑 454行)                  │
│  pages/notes/detail.js (详情 109行)                       │
└───────────────┬─────────────────────────────────────────┘
                │ 读写本地 + 调云函数
┌───────────────▼─────────────────────────────────────────┐
│  本地层 (按孩子命名空间隔离)                              │
│  child-storage.js  →  notes_<childId>  (本地缓存)        │
│  note-manager.js   →  CRUD 封装                          │
│  cloud.js          →  uploadNote/fetchNotes/removeNote    │
└───────────────┬─────────────────────────────────────────┘
                │ wx.cloud.callFunction
┌───────────────▼─────────────────────────────────────────┐
│  云函数层                                                │
│  record/index.js      →  通用 CRUD (含笔记)              │
│  interaction/index.js →  点赞/评论                       │
│  family/index.js      →  getFamilyMembers                │
└───────────────┬─────────────────────────────────────────┘
                │
┌───────────────▼─────────────────────────────────────────┐
│  云数据库 + 云存储                                       │
│  notes 集合 (家庭级，不按 childId 隔离)                   │
│  notes/ 云存储目录 (图片)                               │
└─────────────────────────────────────────────────────────┘
```

**权限模型**：笔记通过 `visibility` 字段（`family`/`designated`/`private`）控制可见范围，而非按孩子隔离。云函数 `listRecords` 用 `_.or()` 组合多条件过滤。

---

## 二、问题清单（按严重程度分级）

### 🔴 P0 严重 — 安全 / 数据丢失

#### P0-1. 详情页缺少可见性权限校验，私有笔记可被越权查看

**位置**：`pages/notes/detail.js:27-45`

**问题**：`loadNote()` 仅从本地缓存 `childStorage.get('notes')` 按 id 查找笔记，**完全没有校验 `visibility`/`visibleTo`/`createdBy`**。任何能拿到笔记 id 的家庭成员，只要本地缓存里还有这条笔记，就能直接查看全文（含图片）。

**攻击/触发路径**：
1. 笔记 A 原为 `family` 可见，家庭成员 B 通过列表拉取到本地缓存
2. 创建者将 A 改为 `private`
3. B 直接访问 `pages/notes/detail?id=A` —— 仍能看到 A 的全文和图片（本地残留）
4. `onShow` 刷新（line 19-23）也是从**本地** reload，不查云端权限

**风险**：隐私泄露。家长写的私密笔记被孩子或其他家庭成员看到。

**建议修复**：
```js
loadNote: function(id) {
  var notes = childStorage.get('notes') || []
  var note = notes.find(function(n) { return n.id === id })
  if (!note) { /* 不存在 */ return }
  var member = auth.getMember()
  var isCreator = note.createdBy === (member ? member._id : '')
  var isAdmin = member && member.permissions && member.permissions.indexOf('admin') >= 0
  // 校验可见性
  var canView = isCreator || isAdmin
  if (!canView) {
    if (note.visibility === 'private') canView = false
    else if (note.visibility === 'designated') canView = (note.visibleTo || []).indexOf(member._id) >= 0
    else canView = true  // family
  }
  if (!canView) {
    wx.showToast({ title: '无权查看', icon: 'none' })
    setTimeout(function() { wx.navigateBack() }, 1500)
    return
  }
  // ... 渲染
}
```
详情页 `onShow` 时应主动 `cloud.fetchNotes()` 刷新一次，避免本地缓存过期导致越权。

---

#### P0-2. 删除/编辑笔记时云存储图片文件不清理（孤儿文件泄漏）

**位置**：
- `cloud.js:1983 removeNote()` —— 仅删 DB 记录，不删云存储文件
- `cloud.js:1956 updateNoteInCloud()` —— 仅更新 DB，不删被移除的旧图片
- `record/index.js:252 removeRecord()` —— 仅 `db.remove()`，不删云文件
- `record/index.js:186 updateRecord()` —— 仅 `db.update()`，不删旧图片

**问题**：笔记删除后，`notes/<id>_0.jpg` 等云存储文件**永久残留**；编辑笔记移除某张图片，该 fileID 对应的云文件也**永久残留**。

**风险**：
1. **存储成本持续增长**：长期使用后云存储文件数无限累积
2. **数据残留风险**：被删除的私密图片文件仍可通过 fileID（若被记录/泄露）访问
3. **合规风险**：用户认为"已删除"的内容实际仍存在于云存储

**建议修复**：在 `record/index.js` 的 `removeRecord` 中，删除 DB 记录前提取 `images`/`imagePath`/`voice` 字段，调用 `cloud.deleteFile()` 批量删除云文件：
```js
async function removeRecord(member, collection, id) {
  // ...查找 record
  if (!canDelete(member, record, collection)) return { code: -2, msg: '无权限删除' }
  // 清理云存储文件
  var fileIds = []
  if (Array.isArray(record.images)) fileIds = fileIds.concat(record.images.filter(f => typeof f === 'string' && f.indexOf('cloud://') === 0))
  if (typeof record.imagePath === 'string' && record.imagePath.indexOf('cloud://') === 0) fileIds.push(record.imagePath)
  if (typeof record.voice === 'string' && record.voice.indexOf('cloud://') === 0) fileIds.push(record.voice)
  if (fileIds.length > 0) {
    try { await cloud.deleteFile({ fileList: fileIds }) } catch (e) { console.warn('清理云文件失败', e) }
  }
  await db.collection(collection).doc(docId).remove()
  return { code: 0 }
}
```
`updateRecord` 同理：对比 `oldImages` 与 `updates.images`，删除差集对应的云文件。

---

#### P0-3. 列表本地展示未按 visibility 过滤，存在权限泄漏窗口

**位置**：`pages/notes/index.js:144-172 loadNotes()`

**问题**：`loadNotes` 从本地缓存读取全部笔记后，只标记了 `_isCreator`/`_canDelete`，**没有按当前用户的 visibility 权限过滤**。正常情况下靠 `fetchNotes` 从云端拉取时已过滤，但存在泄漏窗口：
1. 笔记原为 `family`，成员 B 本地缓存有副本
2. 创建者改为 `private`
3. B 的设备未及时同步（30秒节流 `index.js:65` 或网络失败）
4. B 的 `loadNotes` 仍从本地展示这条 private 笔记（标题/内容/缩略图可见）

**与 P0-1 的关系**：P0-1 是详情页直接越权，P0-3 是列表层残留泄漏。两者都源于"本地读取不校验 visibility"。

**建议修复**：`loadNotes` 中按当前 member 补一道本地过滤：
```js
loadNotes: function() {
  var notes = childStorage.get('notes') || []
  var member = auth.getMember()
  var memberId = member ? member._id : ''
  var isAdmin = member && member.permissions && member.permissions.indexOf('admin') >= 0
  this._allNotes = notes.filter(function(note) {
    if (isAdmin) return true
    if (note.createdBy === memberId) return true
    var vis = note.visibility || 'family'
    if (vis === 'family') return true
    if (vis === 'designated') return (note.visibleTo || []).indexOf(memberId) >= 0
    return false  // private 仅创建者
  }).map(function(note) {
    note._isCreator = note.createdBy === memberId
    note._canDelete = note._isCreator || isAdmin
    note._formattedTime = dateUtils.formatDate(note.createTime)
    return note
  }).sort(function(a, b) {
    return new Date(b.createTime) - new Date(a.createTime)
  })
  // ...
}
```

---

### 🟠 P1 高 — 逻辑 / 一致性

#### P1-1. 本地存储误按孩子隔离，与"笔记家庭级"设计不符

**设计澄清**：笔记是家庭级数据，通过 `visibility` 控制权限，**有意不按 childId 隔离**。云端 `record/index.js:289-300` 的实现是正确符合设计的。问题仅出在本地存储层。

**位置**：
- `child-storage.js:15` —— `'notes'` 被错误放入 `CHILD_KEYS`，导致本地存为 `notes_<childId>`
- `cloud.js:1907 fetchNotes()` —— 用 `childId: auth.getCurrentChildId()` 请求（通用调用，云端对 notes 忽略 childId）

**问题链**：
1. 用户在"孩子 A"下写笔记 → 存到本地 `notes_childA`
2. 切换到"孩子 B" → 本地 `notes_childB` 为空
3. `fetchNotes()` 从云端拉取**全家笔记**（云端正确地不按 childId 过滤）
4. `mergeAndHeal()` 把全家笔记写入当前孩子命名空间 `notes_childB`
5. 孩子A 的笔记出现在孩子 B 列表里 → **串号**

**后果**：多孩子家庭笔记串号；每个孩子的本地缓存冗余存全量，浪费存储。

**建议修复**：从 `CHILD_KEYS` 中移除 `'notes'`（及 `deletedNoteIds`），本地改用全局 key `notes` 存储，与云端家庭级设计对齐。这是纯本地层改动，云端无需动。

---

#### P1-2. 图片云路径策略不一致 + 可预测路径

**位置**：
- `add.js:245 takePhoto()` —— 调 `cloud.uploadImageCompressed(tempPath, 'notes')`
- `cloud.js:2847 uploadImageCompressed()` —— 路径 `notes/<timestamp>_<random9>.jpg`（随机）
- `cloud.js:947 uploadNote()` —— 路径 `notes/<note.id>_<index>.jpg`（确定性）

**问题**：
1. **两套路径策略并存**：takePhoto 成功时图片在随机路径；takePhoto 失败由 uploadNote 兜底时在确定性路径。清理孤儿文件困难
2. **确定性路径有覆盖风险**：`notes/<note.id>_1.jpg`，编辑笔记替换第 2 张图，新图覆盖旧文件。若旧图被其他记录引用（理论上不会，但属于隐含耦合）会导致错乱
3. **索引偏移导致孤儿**：删除第 1 张图后重新上传，新图变成 `_0.jpg`（覆盖），原 `_1.jpg` 变孤儿

**建议**：统一用随机路径策略，所有图片上传走 `uploadImageCompressed` 的 `notes/<timestamp>_<random>.jpg`，uploadNote 不再自己拼路径。

---

#### P1-3. takePhoto 上传失败回退临时路径，链路脆弱

**位置**：`add.js:243-257`

```js
cloud.uploadImageCompressed(tempPath, 'notes').then(function(fileID) {
  newImages[index] = fileID
}).catch(function() {
  newImages[index] = tempPath  // ← 回退到临时路径
})
```

**问题**：`tempPath` 是 `wx.chooseMedia` 返回的临时文件，**小程序冷启动后失效**。虽然后续 `uploadNote` 会兜底重新上传，但存在窗口：
1. 若用户在 takePhoto 失败后直接 `save`，`saveImages` 会尝试 `util.saveImageToPersistent` 持久化临时路径（同会话内通常成功）
2. 但持久化后的本地路径仍非 `cloud://`，需依赖 `uploadNote` 上云
3. 若 `uploadNote` 也失败（网络问题），笔记存到本地，图片只有本地持久化路径，**换设备/清缓存后图片丢失**

**建议**：takePhoto 失败时给用户明确提示（"图片上传失败，将仅保存到本机"），而非静默回退。

---

#### P1-4. updateRecord 调用 canEdit 未传 collection/field，字段级权限失效

**位置**：`record/index.js:209`

```js
if (!canEdit(member, record)) {  // ← 未传 collection 和 field
```

**问题**：`canEdit(member, record, collection, field)` 设计支持字段级权限（`FIELD_PERMISSIONS`），但调用时只传了 2 个参数，`collection`/`field` 为 `undefined`，导致字段级权限检查**完全跳过**，直接落到默认的"创建者可编辑"。

**当前影响**：notes 集合未在 `FIELD_PERMISSIONS` 配置，所以暂无实际漏洞。但 `habitRecords`、`bookEntries` 的字段级权限（如 `bookEntries.creatorOnly: ['amount','type']`）在 update 时**同样失效**，非创建者可修改金额/类型字段。

**建议**：
```js
if (!canEdit(member, record, collection)) {  // 至少传 collection
```

---

#### P1-5. 仓库无数据库/存储安全规则文件，无法审计权限

**位置**：项目根目录、`cloudfunctions/` 下均无 `database.rules.json` / `cloudbaserc.json` / 权限配置

**问题**：云数据库和云存储的安全规则只能在微信开发者工具的云开发控制台配置，**不在代码仓库中**。无法进行版本审计、Code Review、回滚。若控制台误配为"所有用户可读写"，仓库代码完全无法体现。

**风险**：若 `notes` 集合或 `notes/` 存储目录的安全规则过宽，攻击者可直接通过 SDK 调用绕过云函数权限。

**建议**：
1. 在仓库中补充 `cloudbase/database.rules.json` 和存储规则文档，作为配置基线
2. 安全规则应遵循"**默认拒绝，仅云函数写**"原则：`notes` 集合设为 `read: false, write: false`（全部经云函数），或 `read: doc.familyId == auth.openid 对应的 family`
3. 云存储 `notes/` 目录设为"仅创建者可读写"或"仅云函数可写"

---

#### P1-6. 笔记内容字段缺少长度/内容校验

**位置**：`record/index.js:106 addRecord()`、`add.js:323 save()`

**问题**：
- `save()` 仅校验标题非空（line 334），对 `content`、`tags`、`images` 数组长度无限制
- 云函数 `addRecord` 直接 `...data` 展开，未限制单字段长度
- `title` 无最大长度限制（可存超长字符串），`tags` 数组无上限（前端限 5 个但云端不校验）
- 恶意客户端可构造超大 `content` 或超长 `images` 数组写入

**建议**：云函数增加字段校验：
```js
if (collection === 'notes') {
  if (typeof record.title !== 'string' || record.title.length > 100) return { code: -4, msg: '标题无效' }
  if (record.content && record.content.length > 10000) return { code: -4, msg: '内容过长' }
  if (Array.isArray(record.images) && record.images.length > 9) record.images = record.images.slice(0, 9)
  if (Array.isArray(record.tags) && record.tags.length > 5) record.tags = record.tags.slice(0, 5)
}
```

---

### 🟡 P2 中 — 健壮性 / 体验

#### P2-1. add.js 新建路径未复用 noteManager.addNote，逻辑重复

**位置**：`add.js:402-423` vs `note-manager.js:29-53`

**问题**：新建笔记时，`add.js` 内联实现了"生成 id → unshift 到本地 → 调 cloud.uploadNote"全流程，而 `note-manager.js` 的 `addNote` 做了几乎相同的事。编辑路径却用了 `noteManager.updateNote`（line 384）。

**风险**：两处逻辑若不同步（如字段增减），会出现新建和编辑行为不一致。

**建议**：新建也走 `noteManager.addNote(note)`，统一入口。

---

#### P2-2. fetchNotes 固定 pageSize=200，超量笔记丢失

**位置**：`cloud.js:1923`

```js
data: { action: 'list', collection: 'notes', page: 1, pageSize: 200 }
```

**问题**：硬编码拉取前 200 篇。家庭长期使用笔记数超 200 后，**更早的笔记永远不会被拉取**，列表也只显示最近 200 篇。本地 `loadMore`（index.js:220）只是对本地已加载数据分页，不会触发云端翻页。

**建议**：实现云端真分页，或循环拉取直到 `list.length < pageSize`。

---

#### P2-3. _.or 第 4 条件可能意外暴露无 visibility 字段的旧笔记

**位置**：`record/index.js:314`

```js
{ familyId: member.familyId, visibility: _.exists(false) }
```

**问题**：这是为兼容旧数据（无 visibility 字段）而设的回退条件，但它会让**所有缺失 visibility 字段的笔记对全家庭成员可见**。若某条旧笔记本意是私有的但创建时未设 visibility，会被全家看到。

**建议**：将 `_.exists(false)` 回退视为 `family` 可见已可接受（属于历史数据迁移策略），但应补充一个数据迁移脚本，给所有缺失 visibility 的笔记补默认值 `'family'`，然后移除此回退条件。

---

#### P2-4. interaction.getComments 跨家庭查询后过滤，分页错乱

**位置**：`interaction/index.js:174-190`

```js
const res = await db.collection('comments')
  .where({ targetType, targetId, isDeleted: false })  // ← 无 familyId
  .limit(pageSize || 100).get()
const filtered = res.data.filter(c => c.familyId === member.familyId)  // ← 内存过滤
```

**问题**：查询不带 `familyId`，跨家庭拉取后再内存过滤。若 targetId（客户端生成的 note id）在不同家庭间碰撞（概率低但非零），会导致：
1. 效率浪费：拉取大量无关评论
2. 分页错乱：limit 100 后再过滤，本家庭实际可见评论可能远少于 100，翻页失效

**建议**：`where` 中加 `familyId: member.familyId`。

---

#### P2-5. saveImageToPersistent 污染 drawings 命名空间

**位置**：`util.js:166-192`

**问题**：`saveImageToPersistent` 是通用函数，但内部：
- 读取 `getDrawings()` 并按 drawings 数量（≥50）做 LRU 清理
- 文件名固定 `drawing_<id>.png`

笔记图片也调此函数，导致：
1. 笔记图片被命名为 `drawing_xxx.png`，语义混乱
2. LRU 清理逻辑基于 drawings 计数，与笔记无关，但若 drawings 刚好 ≥50，会删掉 drawings 的文件，不影响笔记文件——但函数职责不清

**建议**：`saveImageToPersistent` 增加 `prefix` 参数，分离 LRU 逻辑；或笔记图片走独立的持久化函数。

---

#### P2-6. uploadNote 与 add.js 对图片重复持久化

**位置**：`add.js:381 saveImages` → `util.saveImageToPersistent`；`cloud.js:914 uploadNote` → `util.saveImageToPersistent`

**问题**：同一张图片在 `save` 时被 `add.js` 持久化一次（生成 `drawing_A.png`），在 `uploadNote` 时又被持久化一次（生成 `drawing_B.png`）。两份本地副本，浪费存储，且 `uploadNote` 把本地缓存更新为自己的副本路径，`add.js` 的副本变孤儿。

**建议**：`uploadNote` 检测到已是 `USER_DATA_PATH` 路径时跳过二次持久化（当前 line 912 只跳过 `cloud://`，应同时跳过 `USER_DATA_PATH`）。

---

### 🔵 P3 低 — 代码质量

#### P3-1. API 风格不一致
`note-manager.js` 中 `addNote`/`updateNote` 是同步函数，`deleteNote` 是 `async`。调用方 `index.js:368` 用 `await`，`add.js` 未用。建议统一为 async。

#### P3-2. detail.js isCreator 命名误导
`detail.js:37` `isCreator: isCreator || isAdmin`，变量名 `isCreator` 实际含义是"可编辑"，应改名 `canEdit`。

#### P3-3. 未接入的死代码组件
`components/comment-section`（241行）和 `components/like-bar`（107行）在项目中 0 引用，对应云函数 `interaction` 已实现点赞评论。要么接入笔记详情页，要么删除避免维护负担。

#### P3-4. detail.js 图片预览不处理本地路径
`detail.js:48-76 previewImage` 对 `cloud://` 做了 `getTempFileURL` 转换，但对本地 `USER_DATA_PATH` 路径和已失效的临时路径未处理，离线时本地图片预览可能失败。

#### P3-5. generateId 碰撞风险
`util.js:163` `Date.now().toString(36) + Math.random().substr(2,9)`，同一毫秒内碰撞概率约 1/36^9，极低但非零。云端 `addRecord` 有按 `id` 幂等去重（line 167），可接受。

---

## 三、权限模型专项评估

### 当前权限架构

| 操作 | 云端校验 | 前端校验 | 评估 |
|------|---------|---------|------|
| 新建笔记 | familyId 来自 member，visibility 校验完整 | 无（登录即可） | ✅ 合理 |
| 编辑笔记 | canEdit = isAdmin 或 createdBy===_id | add.js loadNoteForEdit 二次校验 | ⚠️ canEdit 未传 collection（P1-4） |
| 删除笔记 | canDelete = isAdmin 或 createdBy 或共享集合 | index.js _canDelete 控制按钮显隐 | ⚠️ notes 非 SHARED，仅创建者/管理员 |
| 查看列表 | _.or 按 visibility 过滤 | 无额外过滤 | ⚠️ 第4条件回退（P2-3） |
| 查看详情 | **无校验**（纯本地读取） | 仅 isCreator 标记 | 🔴 **P0-1 越权风险** |
| 点赞 | familyId 校验 | 无 | ✅ |
| 评论 | familyId 校验 | 无 | ✅（但查询缺 familyId，P2-4） |

### visibility 字段链路完整性

```
add.js 选择 visibility/visibleTo
   ↓
noteManager.addNote / add.js 内联 → 本地存储
   ↓
cloud.uploadNote → record 云函数 addRecord
   ↓
addRecord 校验 visibility 合法值 ✅
addRecord 校验 designated 时 visibleTo 非空 ✅
addRecord 校验 visibleTo 成员属于本家庭 ✅（查 familyMembers）
   ↓
updateRecord 同样校验 ✅
   ↓
listRecords _.or 过滤 ✅（语法经验证合法）
   ↓
detail.js loadNote —— ❌ 不校验（P0-1）
```

**结论**：可见性权限在"写入"和"列表拉取"环节校验完整，但在"单条详情读取"环节缺失，是整个权限链路的薄弱点。

---

## 四、图片同步专项评估

### 图片生命周期流转

```
拍照/相册 (wx.chooseMedia → tempFilePath)
   ↓
takePhoto: cloud.uploadImageCompressed → cloud://notes/<ts>_<rand>.jpg  ✅成功
           ↓ 失败回退
           tempFilePath (临时，冷启动失效)  ⚠️ P1-3
   ↓
save → saveImages:
   - cloud:// 跳过 ✅
   - USER_DATA_PATH 跳过 ✅
   - http/其它 → util.saveImageToPersistent → drawing_<id>.png  ⚠️ P2-5 命名污染
   ↓
cloud.uploadNote:
   - 对非 cloud:// 图片再次 saveImageToPersistent  ⚠️ P2-6 重复持久化
   - 再上传到 cloud://notes/<noteId>_<idx>.jpg  ⚠️ P1-2 路径策略不一致
   - 成功后回写本地 fileID ✅
   ↓
fetchNotes (云端→本地):
   - resolveCloudFileIDs 把 cloud:// 转 https 临时URL ✅
   - 合并去重写回本地  ⚠️ 转成的 https URL 有 2 小时效期，本地缓存过期后图片不显示
   ↓
detail.js previewImage:
   - cloud:// → getTempFileURL ✅
   - https → 直接用 ✅
   - USER_DATA_PATH → 直接用 ✅
   - 失效临时路径 → ❌ 预览失败 P3-4
   ↓
删除/编辑移除图片:
   - DB 记录更新 ✅
   - 云存储文件 → ❌ 不清理 P0-2
```

### 图片同步关键风险点

| 风险 | 触发条件 | 影响 |
|------|---------|------|
| 云文件孤儿 | 删除笔记/移除图片 | 存储泄漏+隐私残留 |
| 本地图片失效 | takePhoto失败+uploadNote失败+换设备 | 图片永久丢失 |
| 路径覆盖 | 编辑替换图片，确定性路径 | 旧图被覆盖（通常无害但隐式耦合） |
| 重复持久化 | 正常流程 | 本地存储浪费 |
| https URL 过期 | fetchNotes 后存本地 | 离线2小时后列表缩略图失效 |

---

## 五、修复优先级建议

| 优先级 | 问题 | 工作量 | 建议时间 |
|--------|------|--------|---------|
| **P0** | P0-1 详情页越权 | 小（加权限判断） | 立即 |
| **P0** | P0-3 列表本地层缺 visibility 过滤 | 小（加 filter） | 立即 |
| **P0** | P0-2 云文件不清理 | 中（改云函数） | 本周 |
| **P1** | P1-1 本地存储误入 CHILD_KEYS | 小（移除1行） | 本周 |
| **P1** | P1-4 canEdit 未传参 | 小（1行） | 立即 |
| **P1** | P1-5 安全规则缺失 | 中（补配置+文档） | 本周 |
| **P1** | P1-6 字段长度校验 | 小（云函数加校验） | 本周 |
| **P1** | P1-2 图片路径策略 | 中（统一随机路径） | 下周 |
| **P1** | P1-3 takePhoto 回退 | 小（加提示） | 下周 |
| **P2** | P2-1~P2-6 | 各小 | 排期 |
| **P3** | P3-1~P3-5 | 各小 | 随手修 |

---

## 六、总结

笔记模块的**权限设计是正确的**：家庭级数据 + visibility 三级（family/designated/private）控制，不按 childId 隔离。该设计在**云端（`record` 云函数的 addRecord/updateRecord 写入校验 + listRecords 的 `_.or` 过滤）和前端 UI（`add.wxml` 完整的权限选择界面 + 指定成员多选）都已正确实现**。

问题集中在**本地层有 3 处实现缺陷**，导致权限设计在读取环节断裂：

1. **详情页读取缺权限校验**（P0-1）—— `detail.js` 纯本地读取不校验 visibility，私有笔记可被越权查看
2. **列表本地层缺 visibility 过滤**（P0-3）—— 笔记改 private 后，对方本地缓存残留仍展示
3. **本地存储误按孩子隔离**（P1-1）—— `notes` 误入 `CHILD_KEYS`，与家庭级设计冲突，导致切换孩子串号

权限链路完整度：**写入校验 ✅ → 列表拉取过滤 ✅ → 本地读取 ❌（P0-1/P0-3 断裂）**。

此外，**云存储文件在删除/编辑时无清理机制**（P0-2）造成孤儿文件泄漏，以及 `canEdit` 调用未传参导致字段级权限失效（P1-4），是两个独立的实现缺陷。

建议优先修复 P0 三项（均为本地层小改动），随后处理 P1 一致性问题。云端核心逻辑无需改动。

---

## 七、修复实施记录（2026-07-08）

### 已修复（代码改动）

| 问题 | 文件 | 改动说明 |
|------|------|---------|
| P0-1 详情页越权 | `detail.js` | `loadNote` 增加 visibility 校验，无权查看时拦截返回 |
| P0-2 云文件不清理 | `record/index.js` | 新增 `deleteCloudFiles` 辅助函数；`removeRecord` 删除前清理云文件；`updateRecord` 编辑图片时清理差集 |
| P0-3 列表本地层不过滤 | `index.js` | `loadNotes` 增加按 visibility 的本地过滤兜底 |
| P1-1 本地误入 CHILD_KEYS | `child-storage.js` | 移除 `notes` 和 `deletedNoteIds`，本地改家庭级全局 key |
| P1-2 图片路径不一致 | `cloud.js` | `uploadNote` 云路径加 `Date.now()` 随机后缀，避免确定性覆盖 |
| P1-3 takePhoto 静默回退 | `add.js` | 上传失败时提示「部分图片上传失败，仅保存到本机」 |
| P1-4 canEdit 未传参 | `record/index.js` | `updateRecord` 调用补传 `collection` |
| P1-6 字段长度无校验 | `record/index.js` | `addRecord` 增加 title/content/images/tags 长度校验 |
| P2-1 新建未复用 addNote | `add.js` + `note-manager.js` | 新建分支改用 `noteManager.addNote`；addNote 补 `imagePath` 字段 |
| P2-2 fetchNotes 固定 200 | `cloud.js` | 改为分页循环拉取（上限 5000 篇） |
| P2-4 getComments 跨家庭 | `interaction/index.js` | where 加 `familyId` 过滤，移除内存过滤 |
| P2-5 持久化命名污染 | `util.js` + `cloud.js` + `add.js` | `saveImageToPersistent` 加 `prefix` 参数；笔记图片传 `'note'`，不再触发 drawings LRU |
| P2-6 重复持久化 | `cloud.js` | `uploadNote` 跳过 `cloud://`/`http`/`USER_DATA_PATH` 已持久化路径 |

### 已补充配置基线

| 问题 | 文件 | 说明 |
|------|------|------|
| P1-5 安全规则缺失 | `design/database.rules.json` | 新建权限规则基线，所有集合 read/write:false（强制经云函数）；含 storage 规则建议。需在云开发控制台同步配置。注：原置于 `cloudfunctions/cloudbase/` 下，因非可部署云函数（无 index.js/package.json）会污染部署列表，已移至 design 文档目录 |

### 经评估不改（说明原因）

| 问题 | 原因 |
|------|------|
| P2-3 `_.or` 第4条件回退 | 属历史数据兼容策略（缺 visibility 字段视为 family 可见），合理保留。建议后续执行一次性数据迁移脚本给旧数据补 `visibility:'family'` 后移除此条件——属运维操作，不在代码修复范围 |
| P3-1 addNote/updateNote 非async | `deleteNote` 是 async 因需等待云端删除结果返回调用方判断；addNote/updateNote 是 fire-and-forget 无需等待。此"不一致"由语义驱动，非 bug，保持现状 |
| P3-3 死代码组件 comment-section/like-bar | 按 surgical 原则不删预存在死代码。建议后续接入笔记详情页或统一删除，属产品决策 |
| P3-4 previewImage 本地路径 | 当前对 `cloud://` 已正确转 tempURL，本地 `USER_DATA_PATH` 路径 `wx.previewImage` 原生支持；失效临时路径根因在 P1-3（已修），运行时无法可靠检测，不额外加无效处理 |
| P3-5 generateId 碰撞 | 同毫秒碰撞概率约 1/36^9，且云端 `addRecord` 有按 `id` 幂等去重（`record/index.js:167`），可接受 |

### 迁移注意事项

1. **本地缓存命名空间变更**：P1-1 修复后，旧按孩子隔离的 `notes_<childId>` / `deletedNoteIds_<childId>` 缓存会失效。下次 `fetchNotes` 会从云端重新拉取全量写入全局 `notes` key，数据不丢失（云端为准）。旧 key 残留为本地存储孤儿，可在版本更新后清理。
2. **安全规则需在控制台同步**：`database.rules.json` 是仓库基线，需人工在微信开发者工具「云开发 → 数据库/存储 → 权限设置」按此配置，否则不生效。
3. **历史无 visibility 数据**：建议执行一次性迁移（云函数遍历 notes 集合，给缺 visibility 字段的记录补 `'family'`），完成后可移除 `record/index.js:314` 的第4条 `_.or` 回退条件。

### 验证方式

本次为静态代码修复，无法直接运行小程序。建议人工验证：
- 权限：用家庭非创建者账号访问 private 笔记详情（应被拦截）；改 private 后切换设备查看列表是否过滤
- 云文件清理：删除含图片的笔记后，在云存储 `notes/` 目录确认文件已删
- 多孩子切换：切换孩子后笔记列表不再串号、不再重复
- 新建笔记：保存后确认本地立即显示、云端同步成功、成就解锁正常
