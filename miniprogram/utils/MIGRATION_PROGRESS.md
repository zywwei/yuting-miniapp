# 云同步工厂函数迁移进度

## 已迁移模块

### 列表型模块

| 模块 | 状态 | 配置 | 说明 |
|------|------|------|------|
| stallSales | ✓ 已迁移 | LIST_MODULE_CONFIGS.stallSales | 使用 createListFetcher + createUploader + createRemover |
| accountBooks | ✓ 已迁移 | LIST_MODULE_CONFIGS.accountBooks | 使用 createListFetcher + createUploader + createRemover |
| bookEntries | ✓ 已迁移 | LIST_MODULE_CONFIGS.bookEntries | 使用 createListFetcher + createUploader + createRemover |

### 单例型模块

| 模块 | 状态 | 配置 | 说明 |
|------|------|------|------|
| stallSettings | ✓ 已迁移 | SINGLETON_MODULE_CONFIGS.stallSettings | 使用 createSingletonSync |
| learnProgress | ✓ 已迁移 | SINGLETON_MODULE_CONFIGS.learnProgress | 使用 createSingletonSync |
| settings | ✓ 已迁移 | SINGLETON_MODULE_CONFIGS.settings | 使用 createSingletonSync |
| habits | ✓ 已迁移 | SINGLETON_MODULE_CONFIGS.habits | 使用 createSingletonSync |
| accountSettings | ✓ 已迁移 | SINGLETON_MODULE_CONFIGS.accountSettings | 使用 createSingletonSync（无乐观锁）|
| brushingStory | ✓ 已迁移 | SINGLETON_MODULE_CONFIGS.brushingStory | 使用 createSingletonSync |
| aiSkills | ✓ 已迁移 | SINGLETON_MODULE_CONFIGS.aiSkills | 使用 createSingletonSync |
| stallChallenges | ✓ 已迁移 | SINGLETON_MODULE_CONFIGS.stallChallenges | 使用 createSingletonSync |
| stallBusinessHours | ✓ 已迁移 | SINGLETON_MODULE_CONFIGS.stallBusinessHours | 使用 createSingletonSync |

## 待迁移模块

### 列表型模块

| 模块 | 复杂度 | 特殊处理 | 优先级 |
|------|--------|----------|--------|
| drawings | 高 | 图片两阶段同步、旧格式迁移、自愈 | 低 |
| notes | 中 | 图片/语音两阶段同步 | 中 |
| brushingRecords | 中 | 多图两阶段同步、字段映射 | 中 |
| habitRecords | 中 | 图片两阶段同步 | 中 |
| stallProducts | 中 | 旧格式兼容、图片上传 | 中 |
| gameRecords | 低 | 已在 game-cloud.js 中迁移 | - |

### 单例型模块（特殊逻辑，保持原样）

| 模块 | 特殊处理 | 决策 |
|------|----------|------|
| brushingAvatar | 有图片上传（头像带孩子维度） | 保持原样 |
| brushPoints | 积分取较大值（避免回退） | 保持原样 |
| toothDecorations | 装饰列表合并（只增不减） | 保持原样 |

## 迁移指南

### 列表型模块迁移步骤

1. **检查配置**：确认 `LIST_MODULE_CONFIGS` 中已有该模块的配置
2. **创建工厂函数**：
   ```javascript
   var _xxxFetcher = createListFetcher(LIST_MODULE_CONFIGS.xxx)
   var _xxxUploader = createUploader(LIST_MODULE_CONFIGS.xxx)
   var _xxxRemover = createRemover(LIST_MODULE_CONFIGS.xxx)
   ```
3. **替换原有函数**：
   ```javascript
   async function uploadXxx(data) {
     return _xxxUploader(data)
   }
   
   async function fetchXxx() {
     return _xxxFetcher()
   }
   
   async function removeXxx(id) {
     return _xxxRemover(id)
   }
   ```

### 单例型模块迁移步骤

1. **检查配置**：确认 `SINGLETON_MODULE_CONFIGS` 中已有该模块的配置
2. **创建工厂函数**：
   ```javascript
   var _xxxSync = createSingletonSync(SINGLETON_MODULE_CONFIGS.xxx)
   ```
3. **替换原有函数**：
   ```javascript
   async function uploadXxx(data) {
     return _xxxSync.upload(data)
   }
   
   async function fetchXxx() {
     return _xxxSync.fetch()
   }
   ```

## 注意事项

1. **向后兼容**：保留原有函数名，不改变外部接口
2. **配置检查**：迁移前确认配置表中已有该模块的配置
3. **特殊处理**：如果有特殊逻辑（如图片处理、旧格式兼容），需要在配置中添加相应参数
4. **测试验证**：迁移后需要测试功能是否正常

## 代码量对比

| 模块 | 迁移前代码行数 | 迁移后代码行数 | 减少 |
|------|---------------|---------------|------|
| stallSales | ~80 行 | ~15 行 | -81% |
| accountBooks | ~60 行 | ~15 行 | -75% |
| bookEntries | ~60 行 | ~15 行 | -75% |
| stallSettings | ~35 行 | ~10 行 | -71% |
| learnProgress | ~40 行 | ~10 行 | -75% |
| settings | ~40 行 | ~10 行 | -75% |
| habits | ~40 行 | ~10 行 | -75% |
| accountSettings | ~30 行 | ~10 行 | -67% |
| brushingStory | ~35 行 | ~10 行 | -71% |
| aiSkills | ~30 行 | ~10 行 | -67% |
| stallChallenges | ~35 行 | ~10 行 | -71% |
| stallBusinessHours | ~30 行 | ~10 行 | -67% |

## 代码审查结果

### 已修复的问题（P0）

1. **语法错误**：修复了 4 处孤立的花括号和 return 语句
   - 第2052行：fetchAiSkills 后的孤立 `}`
   - 第2270行：fetchLearnProgress 后的孤立 `return`
   - 第2293行：fetchSettings 后的孤立 `}`
   - 第2669行：fetchStallBusinessHours 后的孤立 `return`

2. **callUpsertSingleton/callGetSingleton 参数修复**：
   - 函数签名现在支持 `childId` 和 `memberId` 参数
   - 成员级（member）隔离级别现在可以正确工作

3. **游戏模块墓碑 key 隔离**（P2）
   - 为每种游戏类型使用独立的墓碑 key：`deletedRpsRecordIds`、`deletedDiceRecordIds`、`deletedTetrisRecordIds`
   - 避免不同游戏类型之间的墓碑共享导致误过滤

### 待处理的问题（P1/P2）

1. **fetchDrawings 和 fetchStallProducts 未使用 mergeAndHeal**（P1）
   - 仍然使用手写合并逻辑，存在策略漂移风险
   - 建议后续迁移时统一使用 mergeAndHealV2

2. **云函数缺少乐观锁和软删除**（P2）
   - 建议后续增强云函数的并发控制和数据保护

## 下一步计划

1. **低优先级**：迁移有特殊逻辑的单例型模块（brushingAvatar、brushPoints、toothDecorations）
2. **中优先级**：迁移复杂列表型模块（drawings、notes、brushingRecords、habitRecords、stallProducts）
3. **低优先级**：迁移复杂列表型模块（drawings、notes 等）
