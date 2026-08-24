# 小程序全面代码审查报告

> 审查日期：2026-08-21
> 审查范围：主包（pages/、components/、custom-tab-bar/、utils/）、packageCreate、packageLearn、packageHabits、packageFamily、cloudfunctions（ai-chat、family、interaction、record）
> 问题总数：**30 项**（Bug 18 项 / 优化建议 12 项）

---

## 一、Bug 清单（按严重程度排序）

### P0 — 严重（数据串号 / 安全漏洞，建议立即修复）

#### #1 多家庭场景下云函数数据串家庭

- **位置**：`cloudfunctions/record/index.js:45-50`、`cloudfunctions/interaction/index.js:35-40`、`cloudfunctions/ai-chat/index.js:205-210`
- **问题**：三个云函数的 `getMemberByOpenid` 均按 `openid` 查询并固定取**第一条** membership 记录。用户加入多个家庭后，即使客户端已切换家庭，云函数的所有读写仍落在第一个家庭上，导致笔记、打卡、点赞、AI 配置等数据写入错误的家庭。
- **建议**：客户端调用云函数时传入 `familyId`，云函数按 `openid + familyId` 组合查询 membership，校验通过后才执行业务逻辑。

#### #2 TTS 密钥跨家庭泄露

- **位置**：`cloudfunctions/ai-chat/index.js:1154-1176`（getBaiduKeys）、`cloudfunctions/ai-chat/index.js:1530-1538`（mimoTTS）
- **问题**：两个函数查询**全库所有家庭**的 `aiConfigs` 集合并取第一条记录。A 家庭配置的付费百度/小米 TTS 密钥会被 B 家庭直接使用，存在密钥泄露与盗刷风险。
- **建议**：查询条件增加 `familyId: member.familyId`，只读取本家庭配置。

---

### P1 — 重要（核心功能错误，建议尽快修复）

#### #3 画廊连续创作天数计算错误（iOS 全挂）

- **位置**：`packageCreate/pages/create/draw/gallery/gallery.js:249-287`
- **问题**：`calcStreak` 生成的日期 key 无补零（如 `2026-8-21`）：
  1. `new Date("2026-8-21")` 在 iOS 上返回 Invalid Date，导致连续天数恒为 1；
  2. 字符串排序在跨 10 月 / 单双位数月份时错乱。
- **建议**：统一补零为 `YYYY-MM-DD` 格式，或直接复用 `packageHabits/utils/habit-utils.js` 的实现。

#### #4 同步队列 retries 不持久化，失败项无限重试

- **位置**：`utils/sync-queue.js:193-211`
- **问题**：flush 失败时 `retries++` 只修改内存对象；若本轮无任何成功项则不执行 `saveQueue`，retries 计数永远不落盘 → 失败项永远不会进入 failed 列表，每次网络恢复都无限重试。
- **建议**：catch 分支中无论本轮是否有成功项，都回写队列（`saveQueue(queue)`）。

#### #5 chatStream 后台任务可能永久卡死

- **位置**：`cloudfunctions/ai-chat/index.js:604-616`
- **问题**：`chatStream` 返回 taskId 后，`callAIWithProgress` 为 fire-and-forget 异步调用。云函数实例在返回响应后可能被冻结，AI 调用只在客户端轮询恰好命中同一实例时才推进——多实例部署下任务可能永久停留在 thinking 状态。
- **建议**：改为主请求内 await 完成后返回，或使用云函数定时触发器 / 消息队列处理后台任务。

#### #6 纯图片消息导致会话损坏

- **位置**：`cloudfunctions/ai-chat/index.js:535-549`（saveMessage）、`ai-chat/index.js:485-496`（buildMessages）
- **问题**：纯图片消息（无文字）保存时 `content` 为 undefined 被丢弃；下次取历史后 `buildMessages` 会 push `{ content: undefined }` → 多数 AI API 直接报错，该会话从此"坏掉"无法继续。
- **建议**：图片消息保存时兜底文案（如"（图片）"），或 buildMessages 跳过无 content 的历史消息。

#### #7 打卡草稿"暂存"功能完全失效

- **位置**：`packageHabits/pages/habits/checkin/checkin.js:340`
- **问题**：打卡草稿 `checkinDraft_` **只写不读**——onLoad 从未恢复草稿，用户点"暂存"后数据永久丢失，功能形同虚设。
- **建议**：onLoad 时检测是否存在草稿，弹窗确认后回填表单。

#### #8 并发点赞丢失（无原子操作）

- **位置**：`cloudfunctions/interaction/index.js:50-88`
- **问题**：`toggleLike` 为读-改-写模式，无事务/原子操作。家庭成员并发点赞时，后写会覆盖先写（丢赞）。
- **建议**：使用 `db.command` 数组操作（push/pull）实现原子更新，或引入事务 + 重试。

#### #9 连续打卡天数"清零"打击积极性

- **位置**：`packageHabits/utils/habit-utils.js:11-35`、`utils/habit-manager.js:92-116`、`packageHabits/pages/habits/detail.js:395`
- **问题**：streak 语义 bug：新的一天未打卡前，`dates[0] !== 今天` 立即归零。用户昨晚已连续打卡 30 天，今早打开 App 看到的是 0，体验极差；且与 gallery 版（允许从昨天起算）语义不一致。
- **建议**：允许"今天或昨天"作为链头：`dates[0]===今天 ? 从今天计数 : dates[0]===昨天 ? 从昨天计数 : 0`。

---

### P2 — 一般（体验 / 健壮性问题）

#### #10 TTS 配置读写键不一致，可能产生两份配置文档

- **位置**：`cloudfunctions/ai-chat/index.js:1659-1743`
- **问题**：`getTtsConfig`/`saveTtsConfig` 使用 `member.childId`（member 对象上不存在该字段，恒为 `''`），而模型配置按 `event.childId` 存储——同一家庭可能产生两份 aiConfigs 文档，TTS 密钥存在哪一份不确定。
- **建议**：与 getConfig 保持一致，改用 `event.childId`。

#### #11 评论分页参数未实现

- **位置**：`cloudfunctions/interaction/index.js:174-193`
- **问题**：`getComments` 接收 `page` 参数但从未使用，固定 limit 100，评论超过 100 条后永远加载不全。
- **建议**：实现 skip/limit 分页逻辑。

#### #12 错误信息被统一掩盖

- **位置**：`cloudfunctions/record/index.js:342-344`、`record/index.js:379-381`
- **问题**：update/remove 的 catch 把所有异常（包括网络错误、权限错误）都返回"记录不存在"，掩盖真实故障原因，增加排查难度。
- **建议**：catch 内区分错误类型，返回原始 err.message。

#### #13 按 id 兜底查询缺少家庭过滤

- **位置**：`cloudfunctions/record/index.js:253`、`record/index.js:359`
- **问题**：`where({ id })` 按客户端生成的 id 字段兜底查询时无 `familyId` 过滤，目前仅靠后续权限检查兜底。
- **建议**：where 条件加 `familyId: member.familyId` 纵深防御。

#### #14 pageSize 无上限

- **位置**：`cloudfunctions/record/index.js:35`
- **问题**：`pageSize` 无上限校验，恶意客户端可传 10000 拉取全表数据。
- **建议**：`Math.min(pageSize || 20, 100)`。

#### #15 AI 配置无角色校验且无法清除密钥

- **位置**：`cloudfunctions/ai-chat/index.js:254-312`
- **问题**：`saveConfig` 无角色校验——孩子角色成员也能覆盖全家的 API Key 配置；且"非空才覆盖"的合并策略导致**无法清除**已保存的 key。
- **建议**：校验 admin 权限；支持显式清空（如传 `null` 表示删除字段）。

#### #16 首页切换孩子未检查云能力

- **位置**：`pages/index/index.js:180-185`
- **问题**：`switchToChild` 直接调 `wx.cloud.callFunction`，未检查 `cloudEnabled`（wx.cloud 不可用时抛 TypeError）。
- **建议**：增加 `app.globalData.cloudEnabled` 判断。

#### #17 打卡图片上传失败后本地路径入库，换设备丢失

- **位置**：`packageHabits/pages/habits/checkin/checkin.js:139-150`
- **问题**：拍照上传失败时本地路径（wxfile://）直接入库，同步到云端时会被 `sanitizeMediaFields` 过滤 → 本地有图、云端无图，换设备后图片丢失。
- **建议**：上传失败时改走 syncQueue 的两阶段图片上传机制（机制已有，此页面未接入）。

#### #18 日志泄露 API Key 前缀

- **位置**：`cloudfunctions/ai-chat/index.js:1545-1551`
- **问题**：日志打印 API Key 前 10 位（`apiKeyPrefix`），云函数日志存在泄露风险。
- **建议**：删除该日志字段。

---

## 二、代码质量 / 优化建议

#### #19 calcStreak/calcWeekRate 重复实现 5 处且行为不一致

- **位置**：`packageHabits/utils/habit-utils.js`、`utils/habit-manager.js`、`packageHabits/pages/habits/detail.js`、`pages/parent/index.js`、`packageCreate/pages/create/draw/gallery/gallery.js`
- **问题**：同一逻辑重复实现 5 处，且行为不一致（如 #3、#9）。OPTIMIZATION_PLAN.md 中已规划统一但未落地。
- **建议**：统一收敛到 `packageHabits/utils/habit-utils.js`，其余文件改为引用。

#### #20 游戏墓碑 key 双轨并存且未按孩子隔离

- **位置**：`packageCreate/utils/game-cloud.js:20-28` vs `utils/child-storage.js:64-75`
- **问题**：游戏记录按孩子隔离（rpsRecords 等在 CHILD_KEYS 中），但墓碑 key（deletedRpsRecordIds、deletedDiceRecordIds、deletedTetrisRecordIds）不在 CHILD_KEYS 中未隔离，且与 cloud.js 的 `deletedGameRecordIds` 双轨并存。
- **建议**：把三个墓碑 key 加入 CHILD_KEYS，并统一使用一套墓碑机制。

#### #21 initStorage 初始化死代码

- **位置**：`app.js:246-267`
- **问题**：`initStorage` 初始化的是全局 key（habits/drawings 等），而实际数据全部存储在 childStorage 命名空间 key 中——初始化的 key 永远不会被使用。
- **建议**：删除，或改为初始化当前孩子的命名空间 key。

#### #22 速率限流基本无效

- **位置**：`cloudfunctions/ai-chat/index.js:162-202`
- **问题**：速率限制存储在实例内存中：实例重启即清零、多实例不共享；且 L197 为死代码（push 之后 length 永不为 0，`delete rateLimitStore[key]` 永远不执行）。
- **建议**：换用数据库计数实现，至少删除死代码。

#### #23 过期清理时间不一致 + chatStream 不生成标题

- **位置**：`cloudfunctions/ai-chat/index.js:568-601`
- **问题**：`expireAt` 设 2 小时但清理逻辑按 24 小时；chatStream 路径不生成会话标题（只有 chat 生成）。
- **建议**：统一 TTL；chatStream 完成后同样触发标题生成。

#### #24 getHistory 的 page 参数无默认值

- **位置**：`cloudfunctions/ai-chat/index.js:770-789`
- **问题**：`page` 未校验默认值，客户端不传时 `skip((page-1)*pageSize)` 计算出 NaN 导致报错。
- **建议**：`page = page || 1`。

#### #25 创建家庭与多家庭模型矛盾

- **位置**：`cloudfunctions/family/index.js:78-93`
- **问题**：已有家庭的用户调用 create 时直接返回 existing（拒绝创建新家庭），与 getMyFamilies 支持的多家庭模型矛盾。
- **建议**：确认产品意图；若允许多家庭则应放开限制。

#### #26 calcAvgScore 过滤条件错误

- **位置**：`packageHabits/utils/habit-utils.js:71-79`
- **问题**：用 `r.score` truthy 过滤，score=0 的有效记录被排除在平均分统计之外。
- **建议**：改为 `r.score !== undefined && r.score !== null`。

#### #27 周完成率以周日为一周之始

- **位置**：`packageHabits/utils/habit-utils.js:42-64`
- **问题**：`calcWeekRate` 以周日（getDay()=0）作为一周开始，与中文习惯（周一）不符。
- **建议**：若需周一起始，偏移量改为 `(now.getDay() + 6) % 7`。

#### #28 疑似死代码：ai_config 集合查询

- **位置**：`cloudfunctions/ai-chat/index.js:1637-1652`
- **问题**：`getMimoTtsApiKey` 查询 `ai_config` 集合，而其他所有地方均使用 `aiConfigs`，疑似废弃代码。
- **建议**：确认无调用后删除。

#### #29 同步队列边界问题

- **位置**：`utils/sync-queue.js:38-74`、`sync-queue.js:244-264`
- **问题**：① 队列满时只逐出 1 条仍继续 push（实际可超限）；② `retryFailed(id)` 会移除所有同 id 的失败项但只回灌最后一条，其余静默丢失。
- **建议**：满时循环逐出直到有空间；retryFailed 按 seq 精确匹配。

#### #30 金币迁移可能重复执行

- **位置**：`packageCreate/utils/game-economy.js:65-75`
- **问题**：`migrateOldCoins` 仅当 `gameCoins > 0` 才跳过迁移；若余额恰好为 0 且 rpsStory.coins > 0，每次启动都会重复迁移（幂等但产生多余写操作和日志）。
- **建议**：增加迁移完成标志位。

---

## 三、总体评价

### 优先修复路线

| 优先级 | 项目 | 原因 |
|--------|------|------|
| 立即 | #1 多家庭串数据、#2 TTS 密钥泄露 | 数据正确性 + 安全问题 |
| 尽快 | #3 ~ #9 | 影响核心功能与用户体验 |
| 排期 | #10 ~ #18 | 健壮性与边界场景 |
| 择机 | #19 ~ #30 | 代码质量与一致性 |

### 架构亮点（无需改动）

- 离线同步队列（syncQueue）+ 乐观更新 + 墓碑去重机制设计规范
- record 云函数的集合白名单、字段级权限（FIELD_PERMISSIONS）防御到位
- 单例文档 `_id` 由服务端按 familyId+childId 拼接，杜绝跨家庭覆盖
- 媒体字段 sanitize（只允许 cloud:// 入库）防本地路径污染
- 云文件清理（删除记录时同步清理云存储，防孤儿文件）

### 问题模式总结

本次发现的问题主要集中在两个模式：

1. **多家庭场景的遗漏**：云函数普遍假设"一个用户一个家庭"， membership 查询、TTS 密钥查询均未考虑多家庭（#1、#2、#10、#25）
2. **重复代码导致行为不一致**：同一逻辑多处复制后各自演化，日期处理、streak 语义等出现分歧（#3、#9、#19、#26、#27）
