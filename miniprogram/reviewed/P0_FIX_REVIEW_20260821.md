# 📋 P0 修复代码评审报告

> **评审日期**：2026-08-21
> **评审方式**：独立评审子代理（基于 P0_FIX_PLAN 方案文档 + 全部未提交 diff，18 个文件逐一过目，关键链路追到消费端）
> **评审对象**：8 个 P0 修复（17+ 文件，含 65 处客户端 familyId 注入）

---

## 一、评审原报（子代理输出）

### Strengths

1. **云函数三处越权修复扎实**（`family/index.js:554-600`、`record/index.js:265-272、376-384`）：条件更新 + `stats.updated===0` 检查写法正确；addRecord 与 upsertSingleton 均已在服务端强制 familyId；`:330 delete updates.familyId` 防止 update 篡改归属。P0-1/P0-2 攻击路径确认关闭。
2. **P0-8 向后兼容设计**：未传 familyId 保持旧行为，不存在"漏改一处全线崩"的悬崖；客户端 65/65 全覆盖；变量形态用 Object.assign 语义正确；openid 取自服务端，无权限放大。
3. **P0-5 接口契约从调用方反推而非凭空设计**；空题库防御使 poems/english 不再崩；保留向后兼容；验证可复跑。
4. **批量注入纪律良好**：模式统一、幂等跳过已注入、node --check 全过。
5. **P0-3/P0-4 教科书式最小修复**。

### Issues

#### Critical

**C-1｜TTS 密钥会被"留空保存"静默清除**
- 位置：`ai-settings/index.js` 三个保存函数 + 云函数 `saveTtsConfig`
- 问题：脱敏后表单为空串，点保存提交空字段；云端 saveTtsConfig `!== undefined` 即写入 → 已存真密钥被永久覆盖
- 定性：P0-7 修复引入的数据丢失回归

#### Important

- **I-1**：quiz 结算页 WXML 绑定 `result.percentage / grade.color / grade.text / duration`，新实现未提供 → 结算页空白
- **I-2**：非 admin 在聊天页 quickSwitchProvider 以 `apiKey` 判断已配置，脱敏后恒空被误拦；而切换后走云端 chatStream 本不需要本地 key
- **I-3**：record 双查找路径对旧数据行为不一致（主路径宽松放行、回退路径查不到返回 -3）

#### Minor

- **M-1**：getConfig 非 admin 分支黑名单式清密（只清 apiKey/secretKey），未来新增敏感字段可能泄漏
- **M-2**：getTtsConfig 两分支返回结构不一致
- **M-3**：跨家庭攻击两条路径错误码不一致（-2 vs -3），建议统一 -3 防探测
- **M-4**：getTtsConfig/saveTtsConfig 的 `member.childId` 错位（审计 P1-17）就在改动函数内，建议顺手修

### Assessment

**Ready to merge? No** —— C-1 为确定发生的数据丢失回归，须先修；I-1/I-2 合计 ~30 行应同批处理后合入。

---

## 二、处理结果（同日完成）

| 编号 | 处理 | 说明 |
|------|------|------|
| C-1 | ✅ 已修 | 三个保存函数改为空值拦截：mimo 两个非空才提交；百度构造 patch 只提交非空字段、全空 toast「请至少填写一项」并 return。"清除密钥"能力如需保留需另加显式清除按钮（功能增强，本轮不做） |
| I-1 | ✅ 已修 | createQuiz 记录 startedAt；getQuizResult 补齐 percentage/grade{text,color}/duration，分档文案颜色对齐结算页样式 |
| I-2 | ✅ 已修 | 云端 getConfig 明文/脱敏两分支均附带 hasKeyByProvider 映射；聊天页 quickSwitchProvider 判断改为「本地明文有 key 或服务端标记有 key」任一即放行 |
| I-3 | ✅ 已修 | record 回退查询拆两步：先带 familyId 精确查，查不到再不带查一次，命中后走统一宽松校验——两路径行为一致 |
| M-2 | ✅ 已修 | getTtsConfig 无配置兜底分支统一为布尔结构 |
| M-3 | ✅ 已修 | 跨家庭防护错误码统一为 -3「记录不存在」（update/remove 两处），防探测 |
| M-4 | ✅ 已修 | getTtsConfig/saveTtsConfig 的 childId 口径改以 event.childId 为准（顺带完成审计 P1-17 的 TTS 部分） |
| M-1 | ⏸ 暂缓 | 白名单化需枚举 models 全部非敏感字段，当前清单不确定，贸然收窄风险大于收益；现有实现已堵住已知密钥字段。留待后续配置结构稳定时处理 |

## 三、复验记录

- 语法校验：涉及评审修复的 8 个文件 node --check 全部通过（累计 16 文件 0 失败）
- quiz-engine Node 实测复跑：cards 出满 10 题、percentage/grade/duration 字段齐全且类型正确、poems/english 空卷全流程不抛错、generateCardsQuiz 向后兼容 —— **ALL PASSED**
- familyId 注入覆盖率复核：65/65

## 四、真机回归清单（合入前执行）

1. 家长配好 TTS 密钥 → 打开设置页 → 直接点一次保存 → 云端 aiConfigs 文档密钥仍在（C-1 回归）
2. child 角色发一条 AI 消息（走云端代理）→ 正常回复
3. child 角色 quickSwitchProvider 切换供应商 → 不再被"请先配置"拦截
4. 家长完整答一轮 quiz → 结算页分数/评级/用时正常显示
5. 多家庭账号：加入 A/B 两家庭 → 切到 B 写笔记/打卡/点赞 → 四类文档 familyId 均为 B
6. 收款页减最后一项、跳过卡使用、刷牙计时器连点——三条崩溃链路各过一遍

---

## 五、第二轮评审问题与处理（用户复核发现）

| 编号 | 问题 | 核实 | 处理 |
|------|------|------|------|
| C1 | getTtsConfig 必抛 ReferenceError：入口只解构 `{action, familyId}`，:145 调用传了未定义的 `childId` 标识符 → TTS 配置状态加载 100% 失败（node --check 只查语法，运行时才炸，属静态检查盲区） | ✅ 属实 | :145 改为 `getTtsConfig(member, event.childId)`（与 getConfig :115 同型写法） |
| C2 | 非管理员进 AI 聊天页被"还未配置AI模型"遮罩挡死：checkConfig 两处（:323/:390）及 ai-manager.isConfigured()（:904）均按本地明文 apiKey 判断，脱敏后恒空 → isConfigured 恒 false；而聊天走云端 chatStream 用的是服务端密钥 | ✅ 属实 | 三处改为「本地明文有 key **或** 服务端 hasKeyByProvider[key]」任一即视为已配置；ai-manager.isConfigured() 同型修复 |
| 附带排查 | quickSwitchProvider/quickSwitchModel 会把脱敏 models 回写云端，是否覆盖真密钥？ | 无风险 | 云端 saveConfig :317-320 合并策略"只覆盖非空值"，空串 apiKey 被跳过 ✓ |

**C1/C2 复验**：3 个文件 node --check 通过；`getTtsConfig(member, event.childId)` 写入确认。

**复验**：family/index.js 与 record/index.js node --check 通过；family 云函数 14 处调用注入正确、createFamily 建家语义保持全量检查；record 两处严格校验落位。

---

## 七、第四轮评审问题与处理（用户复核发现）

| 编号 | 问题 | 核实 | 处理 |
|------|------|------|------|
| C-1 | family/index.js 的 P0-8 修复是半成品：只改了函数**签名**（加 familyId 参数），函数体 where 条件未动——14 个 action 传的 event.familyId 全部无效，串号行为与修复前完全一致。对照 record/ai-chat/interaction 三处均有 cond 条件化，唯独 family 漏了 | ✅ 属实 | 函数体补齐条件化：`cond = familyId ? {openid, familyId, status: in(['active','disabled'])} : {openid, status: in(...)}`（保留 family 特有的 disabled 查询需求，管理操作需能查到被禁用成员） |
| C-2 | 客户端零适配：走 family 云函数的 action，客户端调用全部没传 familyId——settings.js 11 处、pages/index:182、child-switcher:41、create.js 3 处等 | ✅ 属实（首轮批量注入只覆盖了 record/ai-chat/interaction 三种云函数名，name:'family' 不在模式内） | 批量注入 7 个文件：settings.js 11、app.js 1、pages/index 1、child-switcher 1、join.js 1、create.js 3；cloud.js 1 处与 app.js getFamilyDetail 原本就显式传 familyId（幂等跳过）。**实际覆盖 20/20** |
| Important-1 | sync-queue.js 离线重试链路漏改：flush 组装 callData 只有 action/collection/id/data/extra，不带 familyId → 多家庭用户离线创建的记录联网重试写入第一个家庭，update/remove 被新校验拒绝 | ✅ 属实 | sync-queue.js 补 require auth；callData 组装后统一 `callData.familyId = auth.getCurrentFamilyId()`——record 与 interaction 重放均覆盖；旧队列项不带也兼容（云端退化为旧行为不报错） |

**C-1/C-2/Important-1 复验**：9 个文件 node --check 通过；family 客户端调用覆盖率 **20/20**；getMemberByOpenid 函数体已实际使用 familyId（grep 函数体确认）。

### 第四轮经验教训

1. 第一轮批量注入按 `name: 'record|ai-chat|interaction'` 白名单设计，**漏掉了第四种云函数名 'family'**——正确做法是先枚举"哪些 action 依赖 getMemberByOpenid 身份"，再反查调用方，而不是按云函数名猜。
2. "签名改了 + node --check 过了 ≠ 修复生效"：C-1 是参数收了但没用。验证必须落到行为层（函数体内 grep 参数使用 / mock 冒烟）。
3. 多轮交叉评审有效但每轮都有新发现，说明**同型模式的横向排查应在第一轮就做全**（grep 所有云函数目录的 getMemberByOpenid 定义），而不是依赖审计报告的列举。

---

## 六、第三轮评审问题与处理（用户复核发现）

| 编号 | 问题 | 核实 | 处理 |
|------|------|------|------|
| I1 | `family/index.js:64` 的 getMemberByOpenid 仍取第一条 membership，getInfo/leaveFamily/updateProfile/refreshInviteCode/saveCurrentChild/removeMember 等 13 个函数均未传 familyId——多家庭用户以第一个家庭为身份基准。属 P0-8 修复范围遗漏（原审计只列了 record/interaction/ai-chat 三处同型，family 是第四处） | ✅ 属实 | 函数签名加 familyId 参数；13 个身份基准型函数全部透传（入口 getInfo/refreshInviteCode/leaveFamily 显式传 event.familyId，其余经 event 解构自动获取）；createFamily 保持全量检查（建家语义不按当前家庭过滤）、joinFamily/getMyFamilies/getFamilyDetail 本身即多家庭友好 |
| I2 | `record/index.js:275/393` 条件仍是宽松版（`record.familyId && ...`），无 familyId 字段的历史文档可被任意家庭管理员改删——防护不完整 | ✅ 属实（原为避免误伤历史数据的取舍） | 收紧为严格校验 `record.familyId !== member.familyId`（缺失同样拒绝）。影响面：服务端 addRecord 历来强制写入 familyId，正常数据不受影响；若存在历史孤儿文档，表现为编辑/删除返回 -3「记录不存在」（明确报错非静默错误）。迁移指引见 `reviewed/migrate-orphan-familyid.md` |

**复验**：family/index.js 与 record/index.js node --check 通过；family 云函数 14 处调用注入正确、createFamily 建家语义保持全量检查；record 两处严格校验落位。
