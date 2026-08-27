# [P0] 带图笔记同步一轮后，云端与本机图片双双丢失

| 项目 | 内容 |
|---|---|
| 级别 | **P0**（确定性数据丢失，正常使用必现） |
| 缺陷位置 | `miniprogram/utils/cloud.js` → `uploadNote()`（L1071-1202） |
| 后果放大位置 | `miniprogram/utils/cloud.js` → `fetchNotes()`（L2210）/ `mergeAndHeal()`（L1298） |
| 服务端关联行为 | `cloudfunctions/record/index.js` → `sanitizeMediaFields()`（L150-163，防御正确） |
| 影响字段 | 笔记 `images[]`、`voice` |
| 不受影响 | 刷牙 / 习惯 / 画作的图片（其上传函数判断条件正确，可作修复参照） |

---

## 一句话结论

`uploadNote()` 用「是否已本地持久化」来判断「是否需要上传云端」，而保存流程早已把全部图片转成本地持久化路径，导致**上传列表恒为空、图片从不调用 `wx.cloud.uploadFile`**；本地路径随记录上云后被服务端清洗为空数组，下次拉取合并时**云端空图版本反噬覆盖本机**。

---

## 完整事故链（六环，均已逐行实测）

### 第 1 环：页面保存时图片已被"本地持久化"（该环节本身正常）

编辑页保存笔记时调用 `util.saveImageToPersistent(tempPath, 'note')`
（见 `pages/notes/add.js:1117-1147`），将微信临时图片复制到 `USER_DATA_PATH` 下，
保证重启后本机仍可显示。

到达 `uploadNote()` 时，`note.images` 内全部为形如下面的路径：

```
wxfile://usr/miniprogramPackage/.../note_lz3k9x_a1b2.png   ← USER_DATA_PATH 开头
```

### 第 2 环：`isPersisted()` 的语义埋雷（cloud.js:1081-1086）

```js
function isPersisted(p) {
  return !p || typeof p !== 'string' ||
    p.indexOf('cloud://') === 0 ||            // 已是云端文件 ✓ 合理
    p.indexOf('http') === 0 ||                // ⚠️ 隐患：微信临时路径也是 http://tmp 开头
    p.indexOf(wx.env.USER_DATA_PATH) === 0    // ← 本地持久化路径也被判为"已持久化"
}
```

该函数实际回答的问题是「**还需要落盘吗？**」；
但第 4 环把它当成了「**还需要上传云吗？**」——两个语义在此被混用，是整个缺陷的根。

> 附带隐患：`http === 0` 会把未落盘的相册临时图（`http://tmp/...`）误判为已处理。
> 若某条链路未经 saveImageToPersistent 直达此处，重启后即裂图。建议一并修正。

### 第 3 环：预处理后所有图片必然满足 isPersisted=true（cloud.js:1088-1097）

```js
for (var i = 0; i < images.length; i++) {
  if (!isPersisted(images[i])) {
    localImages.push(await util.saveImageToPersistent(images[i], 'note'))
  } else {
    localImages.push(images[i])
  }
}
```

循环结束后 `localImages` 只可能是三种前缀：
`cloud://`、`http`、`USER_DATA_PATH` —— **全部 isPersisted === true**。

### 第 4 环：上传收集列表恒为空（cloud.js:1120-1130，决定性一环）

```js
var uploadImages = []
for (var j = 0; j < localImages.length; j++) {
  if (!isPersisted(localImages[j])) {        // ← 第 3 环保证恒为 false！
    uploadImages.push({
      field: 'images[' + j + ']',
      localPath: localImages[j],
      cloudPath: 'notes/' + note.id + '_' + Date.now() + '_' + j + '.jpg'
    })
  }
}
```

`uploadImages` **永远为空数组**。
正确条件应为「还不是 cloud://」，即：

```js
localImages[j].indexOf('cloud://') !== 0
```

### 第 5 环：零次上传，本地路径原样发往云端（cloud.js:1151、1176-1197）

```js
for (var k = 0; k < uploadImages.length; k++) { ... }
// ↑ 空数组 → wx.cloud.uploadFile 零次调用

var uploadData = {
  ...
  images: (record.images || []).filter(...),   // 本地路径原样通过（failedMedia 为空）
  ...
}
await wx.cloud.callFunction({
  name: 'record',
  data: { action: 'add', collection: 'notes', data: uploadData }
})
```

### 第 6 环：服务端清洗为空数组（record/index.js:150-163）

```js
function sanitizeMediaFields(record) {
  if (Array.isArray(record.images)) {
    record.images = record.images.filter(f => f.indexOf('cloud://') === 0)  // 只放行 cloud://
  }
  ;['imagePath', 'voice', 'cloudFileID'].forEach(...)
}
```

服务端防御本身正确（防本地路径污染数据库），于是**云端这篇笔记 images=[]**。
语音字段同理：上传失败回退本地路径时（add.js:1108），`voice` 被清成 `''`。

---

## 后果放大器：fetchNotes 把本机图片也抹掉

下一次 `fetchNotes()`（启动自动同步、进入笔记页等均触发；cloud.js:2210-2262）
拉回云端数据后进入 `mergeAndHeal()`（cloud.js:1298-1357）：

```js
// L1304-1312：云端数据先入列
dedupeCloudListById(cloudList).forEach(function(item) {
  merged.push(transformed)          // 云端版本（images=[]），标 synced=true
  mergedIds[item.id] = true         // 同 id 占坑
})

// L1316-1322：本地数据只补"云端没有的 id"
localList.forEach(function(r) {
  if (r.id && !mergedIds[r.id] ...) // ← 本地带图的同一篇笔记因 id 已占坑被跳过
})

childStorage.set(storageKey, merged) // L1334：整体写回 storage
```

**本机那篇带图笔记被云端空图版本整体覆盖** —— 本机图片显示随之丢失，
原图沦为无人引用的孤儿文件。

注意：`mergeAndHeal` 的 selfHeal 只对比 id 是否存在，不比较 images 字段差异，
因此自愈机制**不会发现「云端少图」**，也就永远不会补救。

---

## 触发条件与影响面

| 场景 | 结果 |
| --- | --- |
| 保存任何带图笔记（必现，无需任何特殊操作） | 云端 images=[] |
| 联网完成 1 次同步 + 1 次 fetchNotes | 本机同篇笔记图片被清空 |
| 多设备使用 | 其他设备永远看不到该笔记图片 |
| 录音上传失败回退本地路径 | voice 被清洗为 ''（同源问题） |

---

## 修复方案（最小侵入）

```js
// 1. 新增判断：是否需要上传（与「是否需要落盘」彻底解耦）
function needsUpload(p) {
  return typeof p === 'string' && p.indexOf('cloud://') !== 0
}

// 2. cloud.js L1122 与 L1132 的收集条件改为：
if (needsUpload(localImages[j])) { ... }   // 图片
if (needsUpload(localVoice)) { ... }       // 语音

// 3. 顺带修正 isPersisted 的 http 误放行：
//    p.indexOf('http') === 0   →   p.indexOf('https://') === 0
```

**佐证修复方向的现成参照**：

- 同文件 `updateNoteInCloud()`（L2264-2278）已经实现 `resolveImagesForUpdate()`，
  专门把 https/本地路径「还原为 cloud:// 或补上传」——说明编辑链路已意识到并解决该问题，
  仅创建链路 `uploadNote` 漏掉了同样处理；
- `uploadBrushingRecord` / `uploadHabitRecord` 使用了正确的「非 cloud:// 即上传」判断，
  可直接对照抄写两阶段上传结构。

---

## 存量数据处理（重要）

代码修复只能保住今后的新笔记，**线上存量数据已经损坏**：
云端均为空图、多数设备本机也已被 fetchNotes 覆盖。

建议补充一次性的补偿逻辑（或在修复版本首启时执行）：

1. 扫描本地 notes 中 `synced===true 且 images 含 USER_DATA_PATH 路径且云端对应记录 images 为空` 的记录；
2. 对这些图片执行补上传（复用 syncQueue 两阶段机制即可）；
3. 长期离线设备在升级后首次同步前完成上述补偿，避免再次被空图覆盖。

---

## 验证方法（修复后如何确认）

1. 新建一篇带图笔记 → 保存 → 检查云存储 `notes/` 目录出现对应 fileID；
2. 云开发控制台查看该笔记文档 `images` 字段应为 `["cloud://..."]` 而非 `[]`；
3. 杀掉小程序重新打开（触发 fetchNotes）→ 笔记详情图片仍正常显示；
4. 第二台设备（或清除缓存后重登）打开同一篇笔记 → 图片可见；
5. 断网保存带图笔记 → 恢复网络后观察 syncQueue 自动补传成功、最终云端有图。

---

## 关联代码位置索引

| 文件 | 行号 | 内容 |
| --- | --- | --- |
| utils/cloud.js | 1081-1086 | `isPersisted()` 定义（语义埋雷点） |
| utils/cloud.js | 1088-1097 | 图片预处理循环（全部转为已持久化） |
| utils/cloud.js | 1120-1130 | uploadImages 收集（恒空，决定性缺陷） |
| utils/cloud.js | 1149-1173 | 上传执行循环（空转） |
| utils/cloud.js | 1176-1197 | uploadData 组装（本地路径入库） |
| utils/cloud.js | 2210-2262 | fetchNotes 分页拉取 |
| utils/cloud.js | 1298-1357 | mergeAndHeal 云端优先合并 + 整体写回 |
| pages/notes/add.js | 1117-1147 | 页面侧本地持久化（第 1 环） |
| cloudfunctions/record/index.js | 150-163 | sanitizeMediaFields 清洗（防御正确） |
