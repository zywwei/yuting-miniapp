# 孤儿文档迁移指引（record 归属校验收紧后）

## 背景

`record/index.js` 的 update/remove 已收紧为严格校验：`record.familyId !== member.familyId` 一律拒绝（含 familyId 字段缺失的文档）。

服务端 `addRecord` 历来强制写入 `familyId: member.familyId`，因此**正常路径创建的记录都带归属**。仅当存在早期版本遗留的"无 familyId 文档"时，用户会表现为：编辑/删除该记录返回 `code:-3 记录不存在`。

## 处理步骤

### 1. 先盘点（只读）

在云开发控制台 → 云函数 → 任一函数的「自定义测试」或使用临时云函数执行：

```js
const cloud = require('wx-server-sdk')
cloud.init({ env: '你的环境ID' })
const db = cloud.database()

exports.main = async () => {
  const collections = ['notes', 'habitRecords', 'bookEntries', 'drawings', 'brushingRecords']
  const report = {}
  for (const c of collections) {
    // 云数据库单次 limit 上限 100，如量大请分页统计
    const res = await db.collection(c).where({ familyId: _.exists(false) }).count()
    report[c] = res.total
  }
  return report
}
```

（需在同文件顶部引入 `const _ = db.command`）

### 2. 再归位（按业务判断）

孤儿文档分两种情况：

- **能确认原属家庭**（例如同 _id 前缀、或与该家庭其他记录同 childId）：补写归属——

```js
await db.collection(c).doc(docId).update({ data: { familyId: '目标家庭ID' } })
```

- **无法确认归属 / 属于废弃测试数据**：直接删除。

### 3. 不处理的影响

不迁移也不会崩溃或越权：这些文档对所有家庭的 update/remove 都会返回 `-3 记录不存在`，属于"明确报错的不可操作"，而非静默错误或安全漏洞。待相关用户反馈后再按上面步骤逐条归位即可。
