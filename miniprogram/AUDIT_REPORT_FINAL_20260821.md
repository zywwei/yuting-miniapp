# 🔍 全项目代码审计报告（最终合并版）

> **审计日期**：2026-08-21
> **版本说明**：本报告由两份独立审计报告合并而成（全项目深度审计 + 核心链路审查），双方发现已交叉验证、去重、裁决，为最终唯一版本。
> **审计范围**：主包 + packageLearn / packageCreate / packageHabits / packageFamily 四个分包 + cloudfunctions 云函数，共约 6.3 万行 JS、167 个页面（四件套完整性已校验）
> **审计方法**：多模块并行深度审查（数据层 / 主包页面 / 游戏+AI / 画画+摆摊 / 习惯+家庭 / 学习分包 / 云函数安全 / 工具层），P0/P1 关键结论均经人工二次复核到行号
> **说明**：标注 ⭐ 的条目为已人工验证；标注「待确认」的条目依赖运行时环境或产品意图，修复前建议先确认

---

## 一、总体评价

**做得好的**：分包架构清晰（主包 1.36MB 达标）；per-child 存储隔离设计（child-storage）；离线同步队列 + 墓碑防复活 + 自愈补传的云端同步体系；云函数统一入口、OPENID 全云端获取、集合白名单；167 个页面注册完整、组件引用零断链、WXML 事件绑定基本齐全。

**四类系统性短板**：

1. **云函数权限校验"取到记录后不再核对 familyId"** —— 构成多处 P0 越权；
2. **多家庭身份模型未贯穿云函数** —— 客户端支持多家庭切换，但云函数 `getMemberByOpenid` 固定取第一条 membership，合法用户切换家庭后数据写入错误家庭；
3. **同步队列与 mergeAndHeal 的并发缺陷** —— 构成主要数据丢失面；
4. **复制粘贴扩散** —— 约 30 个学习科目页列表/详情双数据源、41 个详情页仅差一个字符串、5 份 RPS 对局逻辑、7 份 stripHtml、多份 streak/日期工具（口径已互相冲突），行为漂移已产生实际 bug。

---

## 二、必须修复的 Bug

### 🔴 P0 —— 崩溃 / 安全越权 / 数据串号（8 项）

| # | 位置 | 问题 | 修法 |
|---|------|------|------|
| 1⭐ | `cloudfunctions/record/index.js:248-253` + `canEdit:70` | **跨家庭篡改/删除任意数据**。update/remove 按全局 `_id` 取文档后，管理员分支直接 `return true`，全程无 `record.familyId === member.familyId` 校验；`where({id})` 回退查询同样无 familyId 约束 | 取到记录后首先校验 familyId；或改为带 `familyId + 权限` 条件的原子 where 更新并检查更新条数 |
| 2⭐ | `cloudfunctions/family/index.js:554/575/592` | removeMember / disableMember / enableMember 只校验调用者是自己家庭的管理员，未校验目标 memberId 属于本家庭 → A 家庭管理员可禁用/移除 B 家庭任意成员（含 B 的管理员） | 更新条件加 `familyId: member.familyId`（where+update 并检查更新条数） |
| 3⭐ | `cloudfunctions/record/index.js:45-50`、`interaction/index.js:35-40`、`ai-chat/index.js:205-210`、`family/index.js:64-72` | **多家庭数据串号**。四个云函数的 `getMemberByOpenid` 均按 `openid+status` 查询并固定取**第一条** membership。客户端明确支持多家庭（app.js getMyFamilies/switchFamily），用户加入 2 个家庭后切换到 B，云函数所有读写仍落在 A（或任意序的第一条）——笔记、打卡、点赞、AI 配置、家庭成员管理全部写错家庭，且无任何报错 | 客户端调用云函数时统一传 `familyId`，云函数按 `openid + familyId` 查询 membership，校验通过后才执行业务 |
| 4⭐ | `packageCreate/pages/create/stall/sale/sale.js:224-228` | 收款页点"−"把**最后一项**减到 0 时，`splice(i,1)` 后继续执行 `cart[i].subtotal = ...`，`cart[i]` 为 undefined → TypeError，收款主流程必崩且 UI 与数据脱节 | splice 后置 `break`（同文件 `restock-list.js:168-173` 是正确写法），或重算小计放 else 分支 |
| 5⭐ | `packageCreate/pages/create/rps/story/index.js:121` | "跳过卡"道具读取不存在的 `this.data.roundHistory`（data 中只有 `battleHistory`，见 :20）→ `undefined.concat()` 必崩，25 金币道具买了就用不了 | 改为 `this.data.battleHistory.concat(...)` 并同步 setData |
| 6⭐ | `packageLearn/utils/quiz-engine.js:95-97` | 只导出 `generateCardsQuiz`，而 cards/poems/english 三个测验页（各 :28-66）与 quiz-card 组件（:38-79）调用的 `createQuiz / submitAnswer / nextQuestion / getQuizResult` 全部不存在 → 进入即 TypeError（页面已注册 app.json，分享链接可达） | 补齐四个 API，或连同孤儿页一起下线 |
| 7⭐ | `packageHabits/pages/habits/brushing-timer/brushing-timer.js:1004-1007` | 核心刷牙战斗计时器可双开：入场动画约 3 秒内"开始战斗"仍可点（wxml:217 只看 isRunning；遮罩 wxss:3062 是 `pointer-events:none`），`startMainTimer()` 不先 clearInterval，`resumeTimer()`:1171 同样不清 → 双 interval 并跑，倒计时双倍速、区域/积分/HP 结算全乱 | `startMainTimer` 首行 `clearInterval(this._timer)`；startTimer 加 `_starting` 标志防重入 |
| 8⭐ | `cloudfunctions/ai-chat/index.js:222-224, 1666-1675` | **API Key 明文回传前端**：getConfig 把整份文档（含各厂商 apiKey）原样返回；getTtsConfig 显式返回百度/小米密钥 → 家庭内任何成员（含儿童角色设备）都能拿到全家付费密钥 | 返回前剥离所有 key 字段，只回传 `hasKey` 布尔/掩码 |

### 🟠 P1 —— 数据丢失 / 功能失效（19 项）

**同步与数据完整性**

1. ⭐ `utils/sync-queue.js:199-211` — **失败项"复活"+ 无限重试风暴**：`markAsFailed()` 从 storage 删除失败项后，同批次若有其他项成功，末尾 `saveQueue(remaining)` 会用旧内存快照把它写回活动队列；且全部失败时不落盘（:206 条件不满足），retries 自增丢失永达不到 MAX_RETRIES → 无限重试 + failed 列表每轮追加一份。另 :136,207：flush 全程持有入口快照，执行期间（含多次图片上传的长 await）其他代码 enqueue/dequeue 的结果会被旧快照覆盖，丢同步任务。`retryFailed(id)`（:244-264）按 id 移除所有同 id 失败项却只回灌最后一条，其余静默丢失。
   **修法**：每轮结束统一按 seq 重建队列落盘；markAsFailed 项从快照同步剔除；flush 期间 enqueue 走缓存或落盘前重新 getQueue 合并；retryFailed 按 seq 精确匹配。
2. `utils/cloud.js:1269-1285` — **mergeAndHeal"云端缺失即删"前提被打破**：首页 `fetchBrushingRecords(today)` 按日期过滤拉取后，其余日期已同步记录在 :1285 被当"他端已删除"从本地清掉（离线时统计页历史为空）；`fetchNotes` 分页中途失败仅 break（:2162-2165），用不完整 cloudList 继续合并同样丢本地数据。
   **修法**：带 date 过滤的查询不走 mergeAndHeal 回写；分页失败时直接返回本地不做合并。
3. ⭐ `utils/cloud.js:727/733`（2409/2414 同型）— 图片上传回写用压缩数组循环下标 `k` 而非 field 中的原始下标 j：`fullRecord.images[k] = uploadRes.fileID`。images 混含 cloud://（被 :708-716 过滤出队）时 k 与 j 错位 → fileID 覆盖错误位置、首图丢失并污染本地缓存与重试数据。
   **修法**：从 `img2.field` 解析原始下标回写（setMediaField 已有此能力）。
4. `utils/cloud.js:198-206` — 单例入队项 id 为 `singleton_<collection>_<key>`，成功路径从不 dequeue（全仓仅 notes/drawing/habitRecord 三处调用 dequeue）→ 离线入队的旧快照在恢复联网后仍会被 flush 重传，回滚云端较新数据。
   **修法**：createSingletonSync.upload 成功后调用 `syncQueue.dequeue(...)`。
5. ⭐ `utils/cloud.js:2067 vs 2982` — **stallChallenges 键名错位**：单例配置 `storageKey:'stallChallenges'` 与实际读写键 `'stallDailyChallenges'`（child-storage.js:25，按孩子隔离）不一致且前者不在 CHILD_KEYS → 挑战进度永不上云，stall-manager.js:73-75 每次启动用 fetch 返回的 `{}`/云端旧数据覆盖本地进度。
   **修法**：统一 storageKey 为 'stallDailyChallenges'，进度变更处调用 uploadStallChallenges。
6. `packageHabits/pages/habits/detail.js:738-740`（habit-stats.js:260-262 同）— 删除打卡记录只删本地（filter + childStorage.set），未调 `cloud.removeHabitRecord`（cloud.js:2513 已导出）也未写墓碑 → 已同步记录下次云端拉取即"复活"。
7. `packageHabits/pages/habits/add.js:45` — 所有自定义习惯固定 `type:'custom'`，记录按 type 归档（checkin.js:256、detail.js:223）→ 多个自定义习惯打卡记录互相混入；detail.js:314 `habits.find(h=>h.type===type)` 永远命中第一个，名称/图标串位。
   **修法**：新习惯用独立 type（`custom_<id>`）或记录/查询改用 habit.id。
8. `packageCreate/utils/flight-engine.js:148,154` — **飞行棋核心规则错误**：飞机起飞后停在自家起点格，`distToStart = (52-currentPos)%52 = 0`，`if (actualDice >= distToStart)` 恒真 → 掷任意点数直接进终点跑道，3 回合一局。
   **修法**：distToStart 为 0 时按 52 处理（`|| 52`）。
9. `packageCreate/utils/flight-engine.js:395-403` + `dice/flight/index.js:220-240` — speedBoost 加速/减速永久生效：只有未被页面调用的 `executeMove`（engine:225）会清零，页面自研的 movePlane/afterMove 从不复位 → "下次掷骰+2"变成永久 buff。
10. `utils/ai-manager.js:871-892` — **AI 聊天本地历史无限增长**：`localChats[sessionId].push(...)` 无条数/会话数上限、含 thinking 全文，所有会话挤一个 storage key `'aiChats'`（单 key 1MB 上限）→ 重度使用后 setStorageSync 抛错，云端已成功但用户侧每条消息都"发送失败"。
    **修法**：每会话保留最近 N 条、限制会话数、写入包 try/catch 降级。
11. ⭐ `cloudfunctions/ai-chat/index.js:535-549, 485-496` — **纯图片消息损坏会话**：前端允许空文本+图片发送（ai-chat/index.js:1095）；云端 `saveMessage` 保存用户消息时 content 为 undefined 被丢弃，下一轮 `getHistory` 取回后 `buildMessages` push `{role:'user', content:undefined}` → 多数 AI API 报 400，该会话从此无法继续。
    **修法**：图片消息保存兜底文案（如"（图片）"），或 buildMessages 跳过无 content 的历史。

**功能失效**

12. ⭐ `components/comment-section/comment-section.wxml:12` — 删除按钮依赖 `{{item._canDelete}}`，但 JS 从未写入该字段（只有 WXML 无法调用的 `canDelete()` 方法，:229）→ **所有用户（含作者和管理员）都无法删除评论**，deleteComment 成死代码。
    **修法**：loadComments:51 / submitComment:100 组装数据时按 `auth.isAdmin() || c.authorId === member._id` 计算 `_canDelete`。
13. `packageLearn` **系统性：约 30 个科目列表页与详情页数据源分裂** — 列表页走 `learnData.loadMathFormulas()`（learn-data.js:148 require 的 `../data/math/**` 不存在，回落内置 f001 系列），详情页走 modulesData → `math-formulas-data.js`（mf01 系列），两套 id 互不相认 → 点任意条目永远打开第 1 条（点"加法交换律"看到"勾股定理"）。同样模式波及 chinese×3、art/music、coding×4、english-ext×4、science×4、social×3、speaking×3、sports×3、life×3、math/problems。
    **关联**⭐：`packageLearn/utils/learn-data.js:148/154/160` require 的三个数据文件不存在（try/catch 兜底掩盖）。另 chinese-writing-data.js / chinese-reading-data.js 条目**无 id 字段**（rhetoric 用 name）→ modules-data.js:133 全部条目共享 `undefined` 键，标记一条全体变"已学"、进度瞬间 100%。
    **修法**：列表页统一改用 loadModuleData 同源数据；缺 id 的数据补 id 或按索引生成稳定 id。
14. `packageLearn/pages/history` — **学习日志功能整体是死的**：`addLearnLog`（learn-progress.js:58-71）全项目零调用 → stats 页连续天数/今日学习恒为 0、history 页永远"暂无记录"；history/index.js:25-28 筛选按钮只改高亮，`getFilteredLogs` 无调用方。
15. `packageCreate/utils/book-manager.js:444-475, 488-520` — **周期记账与提醒完全不生效**：`generateRepeatEntries` / `checkReminders` 仅定义导出、全项目零调用；`wx.requestSubscribeMessage({tmplIds: []})` 空数组无法弹授权 → 用户设置了周期记账却永远不会有新条目。
16. `packageFamily/pages/family/join/join.js:55` — **权限客户端自授**：`permissions: (role==='father'||role==='mother') ? ['admin'] : ['editor']`，角色是加入者自选、auth.js:145 isAdmin 只读本地缓存、settings.js loadMembers 也不回写 member → 持邀请码者自选"爸爸"即获得本地管理员 UI（刷新邀请码/移除成员全解锁）。需配合云函数端复核（P0-2 修复）一起收口。
17. `packageHabits/pages/habits/checkin/checkin.js:340` — **暂存功能只写不读**：goBack 写 `checkinDraft_<type>`，本页 onLoad 无任何恢复逻辑（全项目仅 detail.js 读 `habitDraft_`）→ 暂存内容永久丢失。
18. ⭐ `packageHabits/utils/habit-utils.js:11-35`（habit-manager.js:92-116、detail.js:395 复制同款）vs `utils/brushing-utils.js:50-70` — **streak 双向口径冲突**：habit-utils 版锚定"必须今天"→ 新一天未打卡前 `dates[0]!==今天` 立即归零，昨晚连续 30 天今早看是 0，打击积极性；brushing-utils 版不锚定今天 → 停刷半年仍显示旧连击、成就误发。两个极端都是 bug。
    **修法**：统一实现并明确语义——"当前连击"允许今天或昨天作链头（`dates[0]===今天 ? 从今天数 : dates[0]===昨天 ? 从昨天数 : 0`）；复制份全部收敛到 habit-utils.js。
19. `cloudfunctions/ai-chat/index.js:1154-1176, 1530-1538` — **TTS 密钥跨家庭盗用**：`getBaiduKeys`/`mimoTTS` 查询**全库所有家庭**的 aiConfigs 取第一条（不带 familyId）→ A 家庭配置的付费密钥会被 B 家庭的语音请求自然使用（无需恶意即发生），存在盗刷风险。
    **修法**：查询条件加 `familyId: member.familyId`，本家庭未配置时明确报错。
    *（裁决记录：原报告一列 P0、报告二列 P2；因"无恶意即自然发生+直接烧钱"合并定级 P1。）*

### 🟡 P2 —— 一般缺陷（精选）

**跨端 / 时区**

| 位置 | 问题 |
|------|------|
| `packageCreate/.../draw/gallery/gallery.js:256-277` | 连续创作天数：日期键未补零（`getMonth()` 直接拼接）→ 字符串排序 10-12 月错乱；`new Date("2026-5-9")` iOS JavaScriptCore 返回 Invalid Date → iOS 恒为 1、每年 10-12 月恒为 0。同文件 101/147 行已有正确写法 |
| `book/add-entry.js:252`、`book/stats.js:169,172,380`、`book-manager.js:483,666-669` | `toISOString()` UTC 错位：UTC+8 凌晨 0-8 点日期差一天，本周起始/上周边界整体偏移 |
| `utils/note-manager.js:147-148` | 搜索日期边界混用解析：`new Date('YYYY-MM-DD')` 按 UTC、endDate 拼 'T23:59:59' 按本地 → 东八区 0-8 点创建的笔记被漏掉 |
| `packageHabits/utils/habit-utils.js:42-64` | calcWeekRate 以周日为一周之始（`getDay()=0`），与中文习惯（周一）不符；若需周一起始改 `(now.getDay()+6)%7` |
| `packageHabits/utils/habit-utils.js:71-79` | calcAvgScore 用 `r.score` truthy 过滤，score=0 的有效记录被排除在平均分外；应改 `r.score !== undefined && r.score !== null` |

**状态一致性 / 防重复提交**

| 位置 | 问题 |
|------|------|
| `pages/notes/add.js:1037`（按钮 add.wxml:263） | 发布无防重复提交锁，showLoading 不带 mask + 1.5s 延迟 → 连击产生重复笔记 |
| `pages/notes/add.js:461-466` | 取消录音竞态：cancelRecord 先 stop 再置空，全局 onStop 异步回调又把 voicePath 写回 → 被取消的录音仍随笔记保存 |
| `pages/parent/index.wxml:128,138` | 导出/导入备份无 isAdmin 拦截，任何角色（含 child）可覆盖本机全部数据 |
| `pages/parent/index.js:60-62` | 最近笔记三连：未按 visibility 过滤（他人 private 标题泄露）；富文本 HTML 原样显示；ISO 时间原串直出 |
| `pages/notes/index.js:628-640` | 日历选中态把年份当月份解析（`"2025-6-17"` 按"x月x日"处理）→ 切月后选中高亮必丢 |
| `pages/notes/index.js:879-882` | 连续删除时撤销定时器互相覆盖 → 5 秒内删 A 再删 B，B 的撤销条被提前清空 |
| `packageHabits/.../checkin/checkin.js:202`（detail.js:533 同） | 保存无防重复提交：图片持久化异步回调期间可再点 → 双记录；detail.js:596 `_persistTimeout` 单槽位被覆盖 |
| `packageHabits/.../checkin/checkin.js:139-150` | 拍照上传失败时本地路径（wxfile://）入库，云端被 sanitizeMediaFields 过滤 → 本地有图云端无图，换设备图片丢失；应走 syncQueue 两阶段上传（机制已有未接入） |
| `packageHabits/.../checkin/habit-config.js:420`（另 17、52） | `required:true` 字段（阅读书名等）零校验，留空照常入库 |
| `packageHabits/.../checkin/checkin.js:280-286`（detail.js:674 同） | 打卡后选项 `selected` 标志不清 → 下次打卡上次勾选仍高亮 |
| `packageHabits/.../brushing-timer.js:180,646` | 刷牙进度用裸 key `wx.getStorageSync('brushingProgress')` 未按孩子隔离 → 多孩切换后 B 孩恢复 A 孩进度 |
| `packageFamily/settings.js:589` | 退出家庭 `auth.clear()` 只清 7 个身份 key，`brushingRecords_<childId>` 等业务数据全留本地（存储膨胀 + 换家庭旧数据可读） |
| `packageFamily/settings.wxml:241` | 自我排除失效：本地 member 无 openid 字段且 loadMembers 不回写 → 管理员列表"自己"也显示禁用/移除按钮 |
| `packageCreate/.../dice/slots/index.js:99,115-168` | 押注先扣币、结果在 1.5s 定时器里结算，onUnload 清掉定时器 → 中途退出白扣金币 |
| `packageCreate/.../tetris/classic/index.js:185-211,789` | 四连消统计跨局重复累加（initGame 不重置 `_tetrisCount`） |
| `packageCreate/.../tetris/puzzle/index.js:287-291` | 拼图未达标也判通关并发奖（`complete` 算完仅记字符串，随后无条件发奖解锁） |
| `packageCreate/.../rps/classic/index.js:374-390, 521-535` | 倒计时 setInterval 局部变量泄漏（onUnload 只清 animTimer）；人机局战绩只有点"结束"才保存，"再来一局"/直接返回均丢局 |
| `packageCreate/.../stall/history.js:521-522` | 删除订单/切页签后分页未复位 → 翻到第 N 页删一笔，前 N-1 页记录从界面"消失" |
| `packageCreate/.../stall/add-product.js:81` | 编辑商品时新图上传失败清掉旧图引用 `imagePath:''` → 保存后商品图片丢失 |
| `packageCreate/.../draw/draw.js:276, 133` | 橡皮擦硬编码涂白（照片模式擦出白块而非恢复底图）；胶囊避让多算一个胶囊宽度约 87px |
| `pages/index/index.js:180-185` | switchToChild 直接调 `wx.cloud.callFunction` 未检查 cloudEnabled（wx.cloud 不可用时抛 TypeError） |
| `packageCreate/utils/game-economy.js:65-75` | migrateOldCoins 仅当 gameCoins>0 才跳过；余额为 0 且 rpsStory.coins>0 时每次启动重复迁移（幂等但多余写+日志）；建议加迁移标志位 |

**成就 / 统计口径**

| 位置 | 问题 |
|------|------|
| `utils/achievements-data.js:211-227` ⭐ | 飞行棋 6 个成就读取的 `flightWins/flightPerfect/...` 字段在 `getGameExtraData()`（achievements.js:128-165）中根本不存在 → `undefined >= 1` 恒 false，**永远无法解锁** |
| `utils/achievements-data.js:53-55,64-66,86-88` | "学完全部"类成就阈值失实：实测汉字 1358 / 古诗 92 / 去重单词 556，成就却按 120/25/56 判定 |
| `utils/achievements-data.js:176-181` | rps_challenge_5 判定（`level>=5`）与进度（`level-1`）口径不一致，达到第 5 关即弹奖但进度只有 4/5 |
| `packageHabits/.../brushing-timer.js:1366` + `utils/util.js:59-64` | 隐藏章节（id 10000+i）击败后走 `nextChapterId > 7` 分支 → 主线章节被重置回第 1 章（隐藏章节被选中概率 80%）。待确认是否有意设计 |

**音频 / AI**

| 位置 | 问题 |
|------|------|
| `utils/speak.js:344-347,356-372` | InnerAudioContext 播完/出错只置 null 不 destroy（对比 stopSpeak:479 有 destroy）→ 高频朗读累计泄漏，真机后续播放无声 |
| `utils/speak.js:198-202` | mimo 引擎音色写入 `'ttsBaiduVoice'` 键，与百度音色互相覆盖，切换引擎后非法 per 参数 |
| `utils/beep.js:19-23` | 包络公式缺上限截断（前 70% 时长取值 1~3.33）→ 大音量音效削波爆音；bgm-generator.js:27 同型 |
| `utils/audio.js:10-18` | 音效开关 toggle 不持久化 → 重启即静默复位 |
| `utils/ai-manager.js:453-462` | API Key 明文存本地 storage 并随 saveConfig 上云；本地存 merged 全量、云端传部分 config，口径不一致（云函数合并语义待确认） |
| `cloudfunctions/ai-chat/index.js:770-789` | getHistory 的 page 未校验默认值，客户端不传时 `skip(NaN)` 报错；应 `page = page \|\| 1` |

**死绑定 / 死入口 / 打包卫生**

| 位置 | 问题 |
|------|------|
| `packageCreate/.../ai-chat/index.wxml:240` ⭐ | `bindtap="toggleThinkingLoading"` 处理函数不存在 |
| `packageLearn/.../english-ext/listening/index.wxml:12` ⭐ | `bindinput="onInput"` 函数不存在 → 听力题用户输入永不写入 data，答题判定必然失败 |
| `packageCreate/.../dice/collection/index.js:17` ⭐ | 跳转 `/packageCreate/pages/create/dice/monopoly/index`，页面在磁盘和 app.json 中均不存在 → 死入口 |
| `packageCreate/.../stall/stats.js:851-853` | 调用不存在的 `wx.shareAppMessage({...})` API（死代码，被复用即抛错） |
| `utils/cloud-sync-test.js` | 测试代码打进主包，`runTests()` 会向真实 storage 写测试 key，全项目无运行时引用 → 删除或移出打包目录 |
| `utils/bgm-generator.js:96-245` | `generateHappyBGM` 死代码；一旦启用：36 秒 44.1kHz 音频主线程同步生成、峰值约 13MB 内存 |
| `packageLearn/pages/math/practice/index.js:99` | 空答案 `parseInt('')` NaN 直接判错并计数，无拦截 |
| `packageLearn/pages/math/index.js:7-12`、`science/index.js:6-9` | hub 页写死假数量（"奥数竞赛 0 题"实有内容；science 四项全写死 50） |
| `app.js:246-267` | initStorage 初始化的全局 key（habits/drawings 等）实际从未被使用（真实数据全在 childStorage 命名空间）→ 死代码 |
| `packageCreate/utils/game-cloud.js:20-28` vs `utils/child-storage.js` | 游戏墓碑 key 双轨：deletedRpsRecordIds 等三个 key 未加入 CHILD_KEYS（不按孩子隔离），且与 cloud.js 的 `deletedGameRecordIds` 并存两套 → 统一为一套并纳入孩子隔离 |

**定时器 / 资源泄漏**

| 位置 | 问题 |
|------|------|
| `packageCreate/.../dice/flight/index.js:620-625` | onUnload 只清 rollInterval，AI 回合靠 setTimeout 链驱动（5 处）→ 中途退出后链在已卸载页面永续 setData |
| `packageHabits/.../battle-manager.js:219,232` | 两个定时器都写 `_attackTimers[4]`，600ms 回调句柄被覆盖 → destroy 漏清，页面销毁后仍 setData |
| `packageLearn/.../cards\|poems\|numbers\|english/index.js` | markLearned 后 500ms 定时翻页无 clearTimeout、无 onUnload → 翻页竞态 + 卸载后 setData |
| `pages/notes/add.js:383-434` | 录音 innerAudioContext 从不 destroy；`_recordTimer` 秒级 interval 在 onUnload（只存草稿）后仍运行 60s |

---

## 三、云函数安全专项（除 P0/P1 外）

| 级别 | 位置 | 问题 | 修法 |
|------|------|------|------|
| P1 | `family/index.js:175-180` | 被移除/禁用成员可凭邀请码重新加入（查重只匹配 `status:'active'`）→ 处罚形同虚设 | 查重条件改 `status: _.in(['active','disabled','removed'])` |
| P1 | `family/index.js:64-72` | getMemberByOpenid 把 disabled 成员当有效身份 → 被禁用者仍可 addChild/updateChild 等（仅 getFamilyInfo/getFamilyDetail 拦截） | 默认仅取 active，disabled 显式传参区分 |
| P1 | `record/index.js:204-215` | addRecord 允许客户端自指定 `_id` 且 `doc(id).set()` 无归属校验 → 可拼出他人单例 _id 整篇覆盖 | 指定 _id 时走归属校验，或移除该特性 |
| P1 | `ai-chat/index.js:122-123, 739-767` | getThinkingProgress 不校验任务归属，凭 taskId 即可跨家庭读取他人 AI 对话 | 任务文档记录 requesterOpenid/familyId，查询加归属条件 |
| P1 | `ai-chat/index.js:156-163, 140-149` | 限流仅实例内存（多实例/冷启动即绕过）且未覆盖 speechToText/textToSpeech/testTts 等计费接口；checkRateLimit 内 L197 为死代码（push 后 length 永不为 0） | 限流落库（openid+日期计数）并覆盖所有外部付费调用；saveConfig 类 action 限管理员；删死代码 |
| P1 | `ai-chat/config.json:5` + `index.js:604-616` + `models/base-caller.js:130` | 函数超时 30s 但流式内部超时 90s；chatStream 先返回 taskId 再后台 fire-and-forget 写库 → 实例回收后任务永久停在 thinking、消息不落库；且 chatStream 路径不生成会话标题（只有 chat 生成）、expireAt 设 2h 与清理逻辑 24h 不一致 | 函数超时 ≥120s 或流式内部超时 <25s；后台落库改同步等待；chatStream 完成后同样触发标题生成；统一 TTL |
| P2 | `family/index.js:237-249,413-424` | 成员列表返回完整文档（含全家 openid、permissions）；getMembers(:312) 已做 .field() 脱敏，标准不一 | 统一 .field() 白名单 |
| P2 | `interaction/index.js:61-76` | toggleLike 读-改-写整份 likes 数组 → 并发点赞互相覆盖（丢赞） | 改 `_.push()/_.pull()` 原子操作或事务 |
| P2 | `interaction/index.js:46-48` | targetType 无白名单，`COLLECTION_MAP[targetType] \|\| targetType` 可达任意集合 | 只允许白名单命中的值 |
| P2 | `interaction/index.js:103-119` | 评论 content 无长度限制、imageFileId 未限定 cloud:// 前缀 | content ≤500 字符；fileID 校验前缀 |
| P2 | `interaction/index.js:174-193` | getComments 接收 page 参数但从未使用，固定 limit 100，评论超 100 条永远加载不全 | 实现 skip/limit 分页 |
| P2 | `record/index.js:510-522,539` | 单例隔离的 memberId 维度未校验归属（childId 校验了，memberId 原样拼 docId） | memberId 强制取 `member._id` |
| P2 | `record/index.js:35,424-425` | listRecords pageSize 无上限、类型未校验（传字符串 skip 为 NaN 报错） | `Math.min(Number(pageSize)\|\|20, 100)` |
| P2 | `record/index.js:144-201,320-323` | 仅 notes 做长度校验，其余白名单集合内容可任意超大；updates 未剔除 likes 字段可整包伪造点赞 | 通用校验函数应用于所有集合；delete updates.likes |
| P2 | `record/index.js:342-344, 379-381` | update/remove 的 catch 把所有异常（含网络/权限错误）统一返回"记录不存在"，掩盖真实故障 | catch 区分错误类型返回原始 message |
| P2 | `ai-chat/index.js:1169,1545-1551` | 日志打印完整密钥（systemConfig 整份 JSON、小米 key 前 10 位） | 删除或脱敏 |
| P2 | `ai-chat/index.js:254-312` | saveConfig 无角色校验（孩子角色也能覆盖全家 API Key）；"非空才覆盖"合并策略导致无法清除已保存的 key | 校验 admin；支持显式清空（传 null 表示删除） |
| P2 | `ai-chat/index.js:467-474,1223-1239` | skillPrompt/extraContext 无长度上限直接拼进 systemPrompt（message 限 4000 而这两项不限）→ 提示词注入通道 + token 成本放大 | 加类型与长度上限；系统指令与用户数据分段标注 |
| P2 | `ai-chat/index.js:1659-1743` | getTtsConfig/saveTtsConfig 用 `member.childId`（familyMembers 文档字段，默认 ''）而模型配置按 `event.childId` 存 → 口径不一致，同家庭可能产生两份 aiConfigs 文档，TTS 密钥存在哪份不确定 | 与 getConfig 一致改用 `event.childId` |
| P2 | `family/index.js:78-93` | 已有家庭调用 create 直接返回 existing（拒绝创建新家庭），与 getMyFamilies 的多家庭模型矛盾。**待确认产品意图**：若允许多家庭应放开 |

---

## 四、可以优化的地方

### 性能（按预期收益排序）

1. **AI 聊天打字机 O(n²)** — `packageCreate/.../ai-chat/index.js:1403-1456`：每 20ms 对增长中的内容重复 `markdown.parseMarkdown` + 全量 `setData({messages})`；`packageLearn/components/learn-ai-panel.js:382-391` 同款（每 15ms 全量 slice+parse）。
   **改法**：每 3-5 字符批量、用 `setData({['messages['+i+'].richText']})` 局部路径、完成后只 parse 一次。
2. **流式思考轮询 → db.watch** — `ai-chat/index.js:1590-1663` 每条消息最多 120 次 callFunction 轮询，而已实现的 `watchThinkingProgress`（ai-manager.js:623-646）从未使用 → 省 ~99% 调用次数与延迟。
3. **飞行棋动画重建整版** — `dice/flight/index.js:606-618,812`：每 150ms 步进都 refreshBoard 重建 52 格主赛道+机库全量数组 setData → 只更新移动前后两格。
4. **首页冷启动三重初始化** — `pages/index/index.js:49-80,89-127`：onShow 直载一遍 → 云回调再载一遍 → waitForAppData 轮询就绪后又各载一遍；loadAchievements 并发多路有成就弹窗重复排队风险 → 抽单一 refresh() + 就绪标志去重。
5. **启动即加载 213KB 学习数据** — `pages/index/index.js:2-3` require learn-data → cards/english/poems/numbers 全部级别数据只为成就计数 → 惰性 require 或级别数据下沉分包。
6. **modules-data 全量预载** — `packageLearn/utils/modules-data.js:10-46` 打开任一科目详情都解析全部 36 个数据文件（~250KB）→ MODULE_MAP 存路径、loadModuleData 内懒 require。
7. **大列表双份全量 setData** — cards/poems/numbers/english 四个 list 页每次 onShow 同时 setData 全量两份（cards 2000 条×2）；`pages/notes/index.js:295-332` 笔记列表携带全文 HTML → 只保留 filtered 一份/只传预览字段。
8. **childStorage 无内存缓存** — `utils/child-storage.js:90-96` 每次直接 getStorageSync 全量 JSON 解析；摆摊 stats 页一次触发 ≥8 次全量读取 → 加 Map 缓存、set 时失效。
9. **onLoad+onShow 双跑** — family/settings、draw/gallery、notes/drafts、achievement、parent、brushing 等 6+ 页面首次进入双倍请求/渲染。
10. **刷子云调用** — stall checkLevelUp 每笔销售都 uploadStallSettings（等级未变也传）；mergeAndHeal 墓碑命中每 fetch 周期重复发 remove 且成功后不清墓碑（cloud.js:1288-1295）；notes/detail 是唯一没有 30s 节流的页面；brushing-stats 翻月三次全量拉云（fetchBrushingRecords 已支持 date 参数）。
11. **杂项** — story-dialog/打字机每 50ms 一次 setData；draw 贴纸拖拽每 touchmove 全画布重绘；beep 每次冷启动重写 17 个 wav；ai-manager getSessions 默认一次拉 500 会话；habit-stats 记录列表无分页；wx-charts 仍用 2016 年 `wx.createCanvasContext`（无 DPR 适配、官方已停维护）。

### 架构 / 代码卫生

12. **41 个科目详情页模板化** — `packageLearn` 各 detail 页 120 余行代码仅差 `_module` 字符串 → 抽通用详情页（module 作 URL 参数）或 Behavior，删约 4000 行重复代码，并根治数据源类 bug 的复制扩散。
13. **五份 RPS 对局逻辑复制粘贴** — classic/challenge/story/tournament 各一份"判定→加分→动画→保存"（约 300 行×重复），保存时机 bug 只在 classic 出现正是漂移后果 → 抽共享 round-resolve 工具。
14. **重复实现下沉单点** — 7 份 stripHtml（notes 系页面）、3 份日期工具（page-helpers/date-utils/各页自写）、2 份默认习惯表（habit-manager.js:11-26 与 habit-config.js:6-25，已有漂移风险）、**5 份 calcStreak/calcWeekRate（habit-utils/habit-manager/detail/parent/gallery，口径已互相冲突，见 P1-18）**、4 套骰子滚动动画、3 处商品 filter+sort（排序键已分叉）、5 个 learn 进度/统计函数双实现。
15. **死代码清理** — quiz-card / filter-bar / stats-chart / formula-card 四组件零引用；generateHappyBGM、testBaiduVoice（误触发连打约 70 次 TTS 调用）、saveDrawing/deleteDrawing（绕过云层无墓碑，误用即数据不一致）、getDeletedBookIds、updateLocalRecord、deleteCustomHabit、deleteBrushingRecord、tournamentEnd、getMimoTtsApiKey（云函数端，集合名还写错 `ai_config` vs `aiConfigs`）、ai-skills.js 假网络搜索（setTimeout 模拟数据）。
16. **主包瘦身** — 当前 1.36MB：notes add/detail/drafts 三页可下沉新分包；learn-data 惰性化后再降一截。
17. **安全收口**（配合第三节）：aiConfigs 密钥托管方案评估；云函数批量删除替代循环逐条（clearHistory/deleteSession N 次往返→1 次）；getSessions 改 aggregate 分组；family/record/interaction 三处 getTempFileURL 重复实现抽公共模块；children 数组读-改-写加事务。
18. **仓库卫生** — 根目录 `_listing.txt`（6.5MB，未入库但占工作区）与 `src/Main.java` 无关残留；`project.config.json` 被 .gitignore 忽略（appid 不进版本库，换机器即丢，建议入库并忽略 private 版本）；`sitemap.json` 对全部页面 allow 索引（家庭隐私类应用建议 `"action":"disallow"` 收紧）；README 项目结构未更新 packageLearn 分包；`utils/cloud.js` 等大文件建议按模块拆分。

---

## 五、建议修复顺序

| 阶段 | 内容 | 工作量预估 |
|------|------|-----------|
| **本周（P0 + 数据安全）** | 8 项 P0（record/family 云函数越权加 familyId 校验；多家庭 identity 贯穿改造；三个崩溃各 1-2 行；计时器防重入；AI Key 剥离）+ sync-queue 复活 bug + 评论删除失效 + TTS 密钥 familyId 收口 | 2-3 天 |
| **下周（P1 数据丢失）** | mergeAndHeal 前提修复、图片回写下标、单例 dequeue、习惯删除走云端、AI 历史上限截断、飞行棋两条规则、自定义习惯 type 隔离、纯图片消息兜底、streak 口径统一 | 2-3 天 |
| **迭代内（P2 顺手修）** | 防重复提交锁统一过一遍、iOS 日期补零、定时器清理统一排查、成就死字段与阈值、时区统一 | 分散进行 |
| **专项重构** | 学习分包数据层统一（一次消灭约 30 科目双源问题 + 4000 行重复）、详情页模板化、RPS 对局逻辑抽取 | 1-2 周 |

---

## 六、已排查排除的疑点（避免重复排查）

以下常见疑点经专项核实**不成立**：

- 画画"上传失败仍存脏数据" — cloud.uploadDrawing 先落持久化目录再入库、失败入 syncQueue 重试，无脏数据
- 摆摊"库存回滚重复执行" — deleteSale 有查重早退 + 云端墓碑防复活
- "找零负数" — sale.wxml 与 change-calc 已用 shortage 正确分流
- 撤销栈"无限增长" — draw.js:727 实测有 30 条上限（照片模式仍有内存压力，降级为 P2）
- 167 个注册页面四件套完整性、tabBar 选中态同步、WXML 事件绑定（除上述 2 处死绑定外）、require 路径（除 learn-data 3 处已列）— 均校验通过

---

## 附录：两份报告合并裁决记录

| 议题 | 报告一（全项目审计） | 报告二（核心链路审查） | 裁决 |
|------|---------------------|----------------------|------|
| record update/remove familyId | P0-1 | P2"建议加固" | 采信报告一：isAdmin 分支直接放行构成完整越权链，定 P0 |
| 多家庭 getMemberByOpenid 取第一条 | 未发现（仅提 disabled 身份问题） | P0 | 采信报告二：客户端多家庭模型与云函数单家庭假设冲突，定 P0-3 |
| TTS 密钥跨家庭 | 云函数安全 P2 | P0 | 合并定 P1：无恶意即自然发生+直接烧钱，但触发条件依赖多家庭用户存在 |
| API Key 回传前端 | P0-7 | 未发现 | 采信报告一，定 P0-8 |
| 纯图片消息损坏会话 | 未发现 | P1"待确认" | 已验证前端允许纯图片发送（ai-chat/index.js:1095），问题链成立，定 P1-11 |
| streak 语义 | brushing-utils 不锚定今天（P2 成就口径） | habit-utils 新一天即清零（P1） | 两处口径相反均为 bug，合并为 P1-18：统一"今天或昨天作链头"语义 |
| sync-queue | 失败项复活 + 快照覆盖（P1-1） | retries 不落盘→无限重试（P1） | 同一问题两面，合并为 P1-1 |
| chatStream 后台任务冻结 | 云函数安全 P1（超时+fire-and-forget） | P1 | 采信报告一并补充：chatStream 不生成会话标题、TTL 不一致 |
| checkinDraft 只写不读 | P1-16 | P1-7 | 重复，合并 |
| gallery calcStreak iOS 日期 | P2 跨端时区 | P1 | 采信报告一位置，保留 P2 分区（与同文件正确写法对照可快速修复） |
| toggleLike 并发丢赞 | 云函数安全 P2 | P1 | 保留报告一分区，实际影响家庭内偶发丢赞，P2 合理 |
