# 小程序全量代码审查报告（openCode）

> 审查日期：2026-08-21
> 审查范围：主包页面、custom-tab-bar、components、packageCreate / packageHabits / packageFamily / packageLearn 分包、cloudfunctions 云函数、utils 工具层
> 审查方式：静态代码审查（只读），关键问题已逐条人工复核源码确认

---

## 一、严重 Bug（P0：崩溃 / 数据丢失 / 功能不可用）

### 1. 测验功能整体不可用：quiz-engine 缺少被调用的全部核心方法
- **位置**：`miniprogram/packageLearn/utils/quiz-engine.js:95-97`
- **问题**：该文件只导出 `generateCardsQuiz`，而以下 4 处调用的 `createQuiz` / `submitAnswer` / `nextQuestion` / `getQuizResult` 在**全项目中没有任何定义**：
  - `packageLearn/pages/cards/quiz/index.js:29,50,58,66`
  - `packageLearn/pages/poems/quiz/index.js:28`
  - `packageLearn/pages/english/quiz/index.js:28`
  - `packageLearn/components/quiz-card/quiz-card.js:38,79`
- **后果**：进入识字/古诗/英语任一测验页，点击题型即抛 `TypeError: quizEngine.createQuiz is not a function`，测验功能完全瘫痪。
- **修复**：在 quiz-engine.js 中补齐 `createQuiz(module, quizType, count)`、`submitAnswer(quiz, optionIndex)`、`nextQuestion(quiz)`、`getQuizResult(quiz)` 四个方法（可基于现有 `generateCardsQuiz` 扩展多模块支持）。

### 2. 摆摊销售：购物车减数量越界访问，产生 NaN 或直接崩溃
- **位置**：`miniprogram/packageCreate/pages/create/stall/sale/sale.js:218-231`（已人工复核确认）
- **问题**：`cart.splice(i, 1)` 删除商品后没有 `break`，继续执行 `cart[i].subtotal = cart[i].quantity * cart[i].unitPrice`：
  - 若删除的是最后一个元素，`cart[i]` 为 `undefined`，直接抛 TypeError，页面卡死；
  - 否则下一个商品的 subtotal 被写成 NaN，合计金额变 NaN。
```js
} else if (action === 'sub') {
  cart[i].quantity--
  if (cart[i].quantity <= 0) {
    cart.splice(i, 1)   // 删除后未 break/return
  }
}
cart[i].subtotal = cart[i].quantity * cart[i].unitPrice  // 越界访问
```
- **修复**：splice 后立即 `break`；subtotal 更新移入未删除分支。

### 3. 笔记连续删除时撤销定时器互相覆盖，导致笔记永久丢失
- **位置**：`miniprogram/pages/notes/index.js:879`（deleteNote）、`:932`（undoDelete）
- **问题**：`this._undoTimer = setTimeout(...)` 直接覆盖旧定时器且未 clearTimeout。连续删 A、B 后：A 的定时器到点会提前关闭 B 的撤销条并执行云端删除；此时点"撤销"恢复的是 B，A 的本地引用已丢、云端 5 秒后被删——A 永久丢失。
- **修复**：deleteNote 开头先结算上一条待撤销记录（clearTimeout + 立即 executeCloudDelete），或改为撤销队列。

### 4. 评论组件两处逻辑失效：删除按钮永不显示 + 发送成功后评论重复
- **位置**：`miniprogram/components/comment-section/comment-section.wxml:12`、`comment-section.js:48-51,99-120,229`
- **问题**：
  - wxml 用 `wx:if="{{item._canDelete}}"` 控制删除按钮，但 js 从未给评论对象写入 `_canDelete` 字段（`canDelete()` 定义在 methods 里，WXML 无法调用），删除按钮永远不渲染；
  - `submitComment` 插入 `_pending: true` 的乐观评论，云端成功后 `loadComments()` 会把 pending 评论拼接保留（本意防离线闪现），成功路径无人清理 → 刚发的评论永久显示两条。
- **修复**：loadComments/submitComment 中为每条评论计算并注入 `_canDelete`；云端成功后先按 tempId 过滤掉乐观评论再刷新。

### 5. 云函数 record.addRecord 允许客户端指定任意 _id 整篇覆盖，可摧毁任意家庭数据
- **位置**：`miniprogram/cloudfunctions/record/index.js:203-215`（已人工复核确认）
- **问题**：客户端传 `_id` 时直接 `doc(id).set({ data: record })`（set 是无条件 upsert 覆盖），覆盖前不校验该文档是否属于本家庭。攻击者得知他人文档 _id 后即可抢占并销毁原文档。
- **修复**：指定 _id 时先校验"文档不存在或 familyId === member.familyId"；单例数据统一走已有的 `upsertSingleton`（服务端拼 docId，设计正确）。

### 6. 云函数 family：removeMember/disableMember/enableMember 跨家庭越权（IDOR）
- **位置**：`miniprogram/cloudfunctions/family/index.js:543-600`（已人工复核确认）
- **问题**：三个函数只校验操作者是 admin，从未校验目标 memberId 属于本家庭。A 家庭 admin 可移除/禁用 B 家庭成员；enableMember 还能把任意家庭被移除的成员强行复活。
- **修复**：改为带归属条件的更新并检查命中数：
```js
const res = await db.collection('familyMembers')
  .where({ _id: memberId, familyId: member.familyId })
  .update({ data: { status: 'removed' } })
```

### 7. 云函数 record：admin 分支缺 familyId 校验，admin 可跨家庭增删改查
- **位置**：`miniprogram/cloudfunctions/record/index.js:68-104`（canEdit/canDelete）、`:247-258`（updateRecord）、`:352-364`（removeRecord）
- **问题**：`isAdmin(member)` 直接 return true，未校验 `record.familyId === member.familyId`；update/remove 按 doc(id) 或 where({id}) 全局查找。A 家庭 admin 可篡改/删除 B 家庭的 stallProducts/stallSales/bookEntries 等。
- **修复**：找到 record 后立即断言家庭归属，再进入 canEdit/canDelete。

### 8. 云函数 interaction：targetType 白名单 miss 时直接透传，可破坏任意集合
- **位置**：`miniprogram/cloudfunctions/interaction/index.js:46-48`
- **问题**：`return COLLECTION_MAP[targetType] || targetType` —— 传未登记的 targetType（如 `aiConfigs`）即可对任意集合的文档执行 get + 用 `{ likes }` 整篇覆盖 update，可把家庭 AI 配置等文档毁掉。
- **修复**：miss 时返回 null 并拒绝请求。

### 9. 刷牙计时：点"关闭庆祝"后再退出，本次刷牙记录永久丢失
- **位置**：`miniprogram/packageHabits/pages/habits/brushing-timer/brushing-timer.js:1536-1544`（closeCelebration）、`:609-615`（onUnload 兜底）
- **问题**：completeTimer 把保存动作挂在 `isCompleted && !_recordSaved` 兜底上，而 closeCelebration 把 `isCompleted` 置 false → 用户关掉庆祝动画直接返回时，记录/积分/经验全部丢失。
- **修复**：兜底条件改用独立的 `_pendingSave` 标志，不依赖 UI 状态 isCompleted。

### 10. 录音页 onUnload 未清理定时器与音频资源
- **位置**：`miniprogram/pages/notes/add.js:85-90`（onUnload）、`:386-396`
- **问题**：录音中直接退出页面：秒级 setInterval 继续对已卸载页面 setData，innerAudioContext 未 destroy，recorderManager 未 stop。
- **修复**：onUnload 补齐 clearInterval / destroy / stop 三类清理。

### 11. WXML 中使用 Math.random()（不支持），语音波形动画失效并报错
- **位置**：`miniprogram/pages/notes/add.wxml:203`
- **问题**：WXML 表达式作用域无 Math 对象，`{{isPlaying ? (10 + Math.random() * 20) : 10}}` 渲染失败并在控制台抛错。
- **修复**：js 预生成随机高度数组放入 data，或用 CSS animation。

### 12. 俄罗斯方块·拼图模式：未达成目标也判定过关、解锁下一关并发金币
- **位置**：`miniprogram/packageCreate/pages/create/tetris/puzzle/index.js:280-292`
- **问题**：算了 `complete` 但没用，第 289-291 行无条件 `completePuzzleLevel` + `rewardCoins`，随意放完方块即可刷金币跳关。
- **修复**：`if (!complete) { 显示失败; return }` 后再解锁发奖。

### 13. 俄罗斯方块·冒险/拼图：锁定章节可在 JS 层直接点击进入
- **位置**：`packageCreate/pages/create/tetris/adventure/index.js:124-137`、`puzzle/index.js:116-150`
- **问题**：锁定态只有样式类，bindtap 无解锁校验，可直接跳关打 Boss 领奖励。
- **修复**：selectChapter/selectLevel 入口按进度拦截。

---

## 二、安全问题（云函数，建议尽快处理）

| # | 问题 | 位置 | 说明 |
|---|---|---|---|
| S1 | ai-chat 日志明文打印 API 密钥 | `cloudfunctions/ai-chat/index.js:1169,1736,1784,1545-1551` | systemConfig/aiConfigs 全量文档（含百度 TTS key/secret）进日志，云开发控制台成员均可见 |
| S2 | 百度/小米 TTS 密钥跨家庭混用 | `ai-chat/index.js:1152-1165,1530-1538` | 查询不带 familyId，取全库第一个有密钥的配置——谁先配置谁被薅付费额度 |
| S3 | getConfig 把全部 API Key 明文下发给任意 active 成员 | `ai-chat/index.js:222-224` | editor/child 角色也能拿到全家模型 Key 明文；saveConfig 也无 admin 校验 |
| S4 | 内存限流多实例失效 + TTS/ASR 完全不限流 | `ai-chat/index.js:156-202` | 云函数多实例各自计数；speechToText/textToSpeech 无频控无 audioData 大小上限，存在费用滥用面 |
| S5 | prompt 注入面：extraContext/skillPrompt 无长度限制直接拼入系统提示词 | `ai-chat/index.js:466-474` | 可注入"忽略以上指令"劫持面向儿童的输出，也可传超大串烧 token |
| S6 | getThinkingProgress 无归属校验，taskId 可预测 | `ai-chat/index.js:739-753,567` | 时间戳+Math.random 生成，拿到 taskId 即可读他人家庭完整对话 |
| S7 | chatStream 后台 Promise 在函数返回后可能被冻结 | `ai-chat/index.js:604-616` + config.json timeout:30 | AI 任务中断、进度永远 thinking、聊天记录丢失 |
| S8 | joinFamily 邀请码无频率限制，Math.random 生成 | `family/index.js:160-180,56-62` | 可脚本爆破；建议按 openid 限流 + crypto.randomBytes |
| S9 | 输入类型校验普遍缺失 | `family/index.js:298,384`、`record/index.js:253,359`、`ai-chat/index.js:131` | familyId/id/page/pageSize 未做字符串/范围断言，page=0 产生负 skip |

---

## 三、一般 Bug（P1）

### 主包与组件
| # | 问题 | 位置 |
|---|---|---|
| G1 | 日历选中态解析索引错位：selectedDate 格式是 `2026-8-21`，却先 replace('月'/'日') 再取 parts[0]/[1]（取到年/月），选中高亮必然丢失 | `pages/notes/index.js:630-638` |
| G2 | habits/learn 页 onShow 有 30 秒节流且节流窗口内不 loadHabits，打卡返回列表不更新 | `pages/habits/index.js:38-69`、`pages/learn/index.js:92-99` |
| G3 | 刷牙完成数口径不一致：首页按 timeOfDay 去重上限 2，习惯页按当天总条数 | `pages/habits/index.js:111-114` vs `pages/index/index.js:296-301` |
| G4 | 自定义习惯 type 全是 'custom'，wx:key="type" 必然重复，列表 diff 可能错乱 | `pages/index/index.js:289-290` + index.wxml:57；habits 页 5 处同型 |
| G5 | 临时图片路径 `http://tmp/` 被 startsWith('http') 误判为已持久化，笔记图片会丢失 | `pages/notes/add.js:1100` |
| G6 | 笔记详情语音时长恒显"0秒"，未监听 onCanplay 读 duration | `pages/notes/detail.js:21`、detail.wxml:74 |
| G7 | 详情页上一篇/下一篇未过滤可见性、未按时间排序，可能点进无权笔记且方向相反 | `pages/notes/detail.js:89-106` |
| G8 | 家长中心直接输出富文本 HTML 标题和原始 ISO 时间 | `pages/parent/index.wxml:113-114` |
| G9 | 标签筛选 picker 的 value 传了文本而非索引 | `pages/notes/index.wxml:121` |
| G10 | "按住说话"首次授权时序问题：授权弹窗期间 touchend 已过，录音持续到 60 秒上限 | `pages/notes/add.js:436-453` + add.wxml:186 |
| G11 | 图片评论取消选图误报"联网后发送"，且失败未入 syncQueue（与注释不符） | `components/comment-section/comment-section.js:142-176` |
| G12 | child-switcher 头像硬编码"👧"，男孩家庭全显示女孩头像 | `components/child-switcher/child-switcher.wxml:3,16` |
| G13 | 笔记封面 cloud:// 转临时 URL 用 notes[index] 回写，筛选/翻页后 index 错位竞态 | `pages/notes/index.js:419-450` |
| G14 | 编辑模式未修改也生成草稿垃圾 | `pages/notes/add.js:85-90` |
| G15 | 连续打卡天数两处口径不一致（今天没打卡时家长中心显示 0、习惯页显示 N） | `pages/parent/index.js:83-107` vs `pages/habits/index.js:143` |
| G16 | editor 不支持 maxlength，标题/内容字数限制实际无效 | `pages/notes/add.wxml:11,49` |
| G17 | 详情页删除笔记 await 无 try-catch-finally，异常时 loading 卡死 | `pages/notes/detail.js:171-186` |
| G18 | wx:for 与 wx:if 同节点；高亮分段 wx:key="*this" 用于对象数组 key 全重复 | `pages/notes/detail.wxml:47`、`pages/notes/index.wxml:244-276` |
| G19 | 多页面 onLoad+onShow 双重初始化，achievement 页触发两次云同步 | `pages/notes/drafts.js:11-17`、`pages/achievement/index.js:19-25`、`pages/parent/index.js:30-37`、`pages/create/index.js:21-41` |

### 分包（create / habits / family）
| # | 问题 | 位置 |
|---|---|---|
| G20 | 打卡 checkIn/save/confirmScore 无防重复提交，异步窗口内连点多条记录、重复积分 | `packageHabits/pages/habits/detail.js:533-695`、`checkin/checkin.js:202-304`、`brushing/brushing.js:369-426` |
| G21 | checkin 页"暂存"只存不取，checkinDraft_ 无任何读取点 | `packageHabits/pages/habits/checkin/checkin.js:340-348` |
| G22 | 删除打卡记录只删本地不同步云端，下次同步"复活" | `packageHabits/pages/habits/detail.js:728-747` |
| G23 | 刷牙计时缺 onHide，切后台后计时与真实时间脱节（刷 5 分钟只记 1-2 分钟） | `packageHabits/pages/habits/brushing-timer/brushing-timer.js:1004-1078` |
| G24 | battle-manager 两个定时器都赋给 _attackTimers[4]，句柄覆盖泄漏 | `packageHabits/pages/habits/brushing-timer/battle-manager.js:219-235` |
| G25 | 区域剩余秒数在整倍数时刻显示错误（应 0 显示 20） | `brushing-timer.js:1076` |
| G26 | 刷牙主页打卡照片用临时路径入库未持久化，历史照片变裂图 | `packageHabits/pages/habits/brushing/brushing.js:369-397` |
| G27 | 家庭创建/加入/添加孩子均无 loading 防重入，双击并发创建重复数据 | `packageFamily/pages/family/create/create.js:89-95`、`join/join.js:25-32`、`settings/settings.js:282-288,398-404` |
| G28 | 邀请码有效期由前端硬编码推算 7 天，不用云端返回值 | `packageFamily/pages/family/settings/settings.js:218` |
| G29 | 折扣输入 0 被 `parseFloat(v) \|\| 10` 静默改成不打折（三处复制粘贴） | `stall/sale/sale.js:269-279`、`change-calc/change-calc.js:44-54`、`stall/index.js:269-271` |
| G30 | 商品可保存负数库存/负数成本价 | `stall/add-product/add-product.js:115-123` |
| G31 | stall-manager.addSale 数据层浮点累加未 round（页面层已转分计算，口径不一） | `packageCreate/utils/stall-manager.js:174-195` |
| G32 | 记账保存无防抖，800ms 窗口双击产生重复账单 | `book/add-entry/add-entry.js:257-295` |
| G33 | AI 聊天 retryMessage 传 image（单数），sendMessage 只读 images（复数），带图消息重试丢图 | `packageCreate/pages/create/ai-chat/index.js:2296-2312` |
| G34 | RPS 人机倒计时定时器是局部变量未挂 this，onUnload 不清理，退出后仍 setData+存记录 | `rps/classic/index.js:374-390` |
| G35 | RPS goBack 不保存整局记录，注释与实现矛盾 | `rps/classic/index.js:521-547` |
| G36 | 经典俄罗斯方块 restartGame 未重置 _tetrisCount，统计虚高；gameOver 绕过 tetris-manager 直写存储，格式与 manager 分叉 | `tetris/classic/index.js:185-211,753-798` |
| G37 | 冒险模式 onShow 每次硬编码 monsterDamage:0，切后台回来伤害清零 | `tetris/adventure/index.js:79-84,119` |
| G38 | useFreeze/useHint 的 setTimeout 句柄未登记未清理 | `tetris/adventure/index.js:418-421`、`puzzle/index.js:391-394` |
| G39 | 冒险模式 setData 后同步 initCanvas，canvas 在 wx:if 内可能未插入，黑屏无重试 | `tetris/adventure/index.js:139-156` |
| G40 | 绘画贴纸 confirm/cancel 与底图 img.onload 竞态，贴纸丢失或残留 | `draw/draw.js:499-544` |
| G41 | 画册连续天数用非补零日期 key，iOS JavaScriptCore 解析 Invalid Date，streak 恒为 1 | `draw/gallery/gallery.js:249-287` |
| G42 | scrollToDate 把相对视口的 rect.top 当绝对 scrollTop 用，定位错误 | `draw/gallery/gallery.js:341-352` |
| G43 | 绘画 onHide 未暂停背景音乐 | `draw/draw.js:915-917` |

### packageLearn（学习分包，openCode 补充审查）
| # | 问题 | 位置 |
|---|---|---|
| G44 | generateCardsQuiz 随机抽卡不去重，10 题可能大量重复同一张卡 | `packageLearn/utils/quiz-engine.js:17-18` |
| G45 | generateOptions 干扰项不足时静默返回 <4 个选项的题目 | `quiz-engine.js:64-79` |
| G46 | stats 页 calculateStreak 与 stats-manager.js 重复实现且后者未被使用；365 天 × 1000 条日志逐条 new Date() 解析（约 36 万次/次打开），性能差 | `packageLearn/pages/stats/index.js:58-91` vs `utils/stats-manager.js:38-61` |

---

## 四、优化建议（P2）

### 架构与复用
1. **习惯模块大面积复制粘贴**：detail.js 与 checkin.js 约 300 行近乎相同（拍照/存图/表单状态/草稿），且已各自漂移（checkin 丢了 restoreDraft 和超时保护）；detail.js 的 calcStreak/calcWeekRate 与 utils/habit-utils.js 完全重复却未引用。建议抽 behavior/共享工具。（`packageHabits/pages/habits/detail.js`、`checkin/checkin.js`）
2. **RPS 三个结算函数 150+ 行重复**，抽 settleRound(p1, p2, mode)。（`rps/classic/index.js:131-472`）
3. **云函数公共鉴权代码复制粘贴**：getMemberByOpenid/isAdmin 等在 4 个云函数中各有一份，建议抽公共层。
4. **首页 wxss 大段重复**：`.status-bar/.header/.child-dropdown` 等定义两遍，体积翻倍。（`pages/index/index.wxss:8-179 vs 181-359`）
5. **learn 页死代码**：categories 与 loadProgress（20+ 个 Object.keys 统计）wxml 完全未引用，每次 onShow 白算。（`pages/learn/index.js:54-70,115-174`）
6. **AI 聊天死代码**：selectVoiceEngine 引用未声明的 currentEngineGroupTab，filteredEngineList 未被 wxml 使用。（`ai-chat/index.js:2536-2545`）

### 性能
7. **AI 打字机效果每字符全量 setData + 全量重新 parseMarkdown**，长回复 O(n²)，低端机卡顿；建议精确路径更新纯文本，结束后一次性解析。（`ai-chat/index.js:1403-1456`）
8. **详情页 onShow 无节流全量 fetchNotes**（内部最多 50 页×100 条分页循环）。（`pages/notes/detail.js:37`、`utils/cloud.js:2150`）
9. 左滑松手双重 setData、日历选中循环 setData、saveImages 回调地狱可 Promise.all 化。（`pages/notes/index.js:833-846,700-708`、`pages/notes/add.js:1090-1122`）
10. 每次按键都调 enableAlertBeforeUnload，建议状态跃迁时才调用。（`pages/notes/add.js:650,661`）
11. 切换孩子等待云函数成功才 triggerEvent，弱网 UI 延迟数秒；建议先本地切换后台同步，并与首页 switchToChild 行为统一。（`components/child-switcher/child-switcher.js:38-47`）

### 规范一致性
12. **页面间传参协议混乱**：照片编辑一处 URL 参数一处 storage 中转；草稿 key 前缀 habitDraft_/checkinDraft_/note_draft_ 不统一；日期格式 Date.now()/ISO/非补零并存。建议约定统一规范。
13. **"一周起点"口径不一**：习惯模块以周日为起点，摆摊以周一。（`habit-utils.js:42-64` vs `stall-utils.js:41-48`）
14. **LEVEL_SPEEDS 两份数值不一致**（classic 自带 vs tetris-utils）。（`tetris/classic/index.js:29` vs `utils/tetris-utils.js:8`）
15. **云函数返回码语义冲突**：family 的 -2 同时表示"邀请码过期"和"加入失败"；interaction 的 -3 三处含义不同；ai-chat 的 -3/-5/-6 与其他函数体系冲突。建议统一定义枚举表。
16. **record 白名单含 comments/likes**，可绕过 interaction 的作者字段逻辑直接插库，建议从白名单移除收敛入口。（`record/index.js:9`）
17. **多家庭用户只识别第一个成员身份**：getMemberByOpenid 取 res.data[0] 且无 orderBy，多家庭用户业务读写锚定不确定的家庭。建议接口增加 familyId 参数。（`family/index.js:64-72` 及各云函数同名函数）
18. childId 用 `'c_' + Date.now()` 生成，同毫秒并发撞号。（`family/index.js:96,464`）
19. toggleLike 读-改-写竞态 + likes 数组无界增长逼近 512KB 文档上限，应改原子 push/pull 或拆集合。（`interaction/index.js:54-76`）
20. getComments 的 page 参数无效（无 skip）、pageSize 无上限。（`interaction/index.js:174-187`）
21. chatStream usage 恒为 null，token 统计失真；加 stream_options.include_usage。（`models/base-caller.js:190-198`）
22. wenxin token URL 拼接未 encodeURIComponent。（`models/wenxin.js:32`）
23. getSessions limit 上限 2000 超出服务端单次查询上限 1000，必报错。（`ai-chat/index.js:854-863`）
24. updateRecord 图片差集"先物理删除后清洗"，https URL 回传会触发全量删图且不可恢复；应先 sanitize 再差集。（`record/index.js:328-338`）
25. createTime ISO 字符串与 Date 对象混存导致排序不稳定，且客户端可伪造。（`record/index.js:152 vs 547`）
26. FIELD_PERMISSIONS 的 adminOnly:['delete'] 是永不生效的死配置。（`record/index.js:57-61`）
27. 废弃 API：wx.getSystemInfoSync → wx.getWindowInfo。（`pages/notes/detail.js:333`）
28. parent 页原地 sort storage 返回的数组引用，应 slice() 后排序。（`pages/parent/index.js:60`）
29. create 页 todaySales 是金额合计但标签写"笔今日"。（`pages/create/index.js:65` + index.wxml:101-102）
30. removeChild/removeMember/disableMember 前端无 isAdmin 防御（云端有校验，仅一致性问题）。（`settings/settings.js:478-556`）

---

## 五、修复优先级建议

| 优先级 | 内容 |
|---|---|
| 立即修 | P0 #1（测验功能瘫痪）、#2（销售页崩溃）、#3（笔记丢失）、#5/#6/#7/#8（云函数越权与数据破坏）、#9（刷牙记录丢失）、S1/S2/S3（密钥泄露与跨家庭盗用） |
| 本周内 | P0 其余项 + P1 中影响数据的：G5/G13/G20/G22/G24/G31/G33/G41 |
| 排期处理 | P1 其余项 + P2 性能与规范类 |

## 六、审查覆盖说明

- **深度审查**：主包 10 个页面 + custom-tab-bar + 5 个组件；packageCreate/packageHabits/packageFamily 主要 js；5 个云函数全部代码；packageLearn 核心 utils（quiz-engine/review-scheduler/learn-progress/stats-manager）+ cards/quiz、poems/quiz、stats 页面。
- **抽查**：packageLearn 其余 detail 页面未逐一深审（数量约 60 个，结构高度雷同）；images/components 部分样式文件未逐行审。
- 所有标注"已人工复核确认"的问题均由 openCode 直接读取源码二次验证；其余来自子任务审查报告，行号以当前工作区为准。
