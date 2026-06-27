const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 允许客户端访问的集合白名单，防止恶意请求写入/删除敏感集合（如 familyMembers）
const ALLOWED_COLLECTIONS = [
  'drawings', 'notes', 'brushingRecords', 'habitRecords',
  'achievements', 'userSettings', 'stallProducts', 'stallSales',
  'stallSettings', 'stallChallenges', 'stallBusinessHours', 'gameRecords', 'comments', 'likes',
  'accountBooks', 'bookEntries', 'accountSettings'
]

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action, collection, data, id, childId, key, page, pageSize } = event

  const member = await getMemberByOpenid(OPENID)
  if (!member) {
    return { code: -1, msg: '未加入家庭' }
  }

  // 集合白名单校验，拒绝未授权集合
  if (ALLOWED_COLLECTIONS.indexOf(collection) < 0) {
    return { code: -1, msg: '不允许的操作集合' }
  }

  switch (action) {
    case 'add':
      return await addRecord(member, collection, data)
    case 'update':
      return await updateRecord(member, collection, id, data)
    case 'remove':
      return await removeRecord(member, collection, id)
    case 'list':
      return await listRecords(member, collection, childId, page || 1, pageSize || 20)
    case 'upsertSingleton':
      return await upsertSingleton(member, collection, key, childId, data)
    case 'getSingleton':
      return await getSingleton(member, collection, key, childId)
    default:
      return { code: -1, msg: '未知操作' }
  }
}

async function getMemberByOpenid(openid) {
  const res = await db.collection('familyMembers')
    .where({ openid, status: 'active' })
    .get()
  return res.data[0] || null
}

function isAdmin(member) {
  return member && member.permissions && member.permissions.indexOf('admin') >= 0
}

function canEdit(member, record) {
  if (isAdmin(member)) return true
  return record.createdBy === member._id
}

// 共享类集合：同一家庭成员均可删除（如摆摊商品、销售记录等家庭共享数据）
const SHARED_COLLECTIONS = ['stallProducts', 'stallSales']

function canDelete(member, record, collection) {
  // 管理员可以删除任何记录
  if (isAdmin(member)) return true
  // 记录创建者可以删除
  if (record.createdBy === member._id) return true
  // 共享类集合：同一家庭成员可删除（画作、笔记等个人创作内容不在此列，仅创建者/管理员可删）
  if (SHARED_COLLECTIONS.indexOf(collection) >= 0 && record.familyId === member.familyId) return true
  return false
}

async function addRecord(member, collection, data) {
  const record = {
    ...data,
    familyId: member.familyId,
    childId: data.childId || '',
    createdBy: member._id,
    createdByName: member.roleName,
    likes: [],
    createTime: new Date()
  }

  // 如果指定了 _id，则使用指定的 _id（用于设置等单例文档）
  const id = record._id
  if (id) {
    delete record._id
    try {
      await db.collection(collection).doc(id).set({ data: record })
      return { code: 0, data: { _id: id } }
    } catch (err) {
      // 如果文档不存在，使用 add
      const res = await db.collection(collection).add({ data: { _id: id, ...record } })
      return { code: 0, data: { _id: res._id } }
    }
  }

  delete record._id

  // 幂等去重：带客户端业务 id 的记录，若同家庭下已存在则不重复新增
  // （避免自愈补传、离线队列重试导致云端产生重复记录）
  // 采用 try-add + catch 方式，比 check-then-act 更能抵抗并发竞态
  if (data.id) {
    try {
      // 先快速查询，大部分情况命中则直接返回，避免不必要的 add 操作
      const dup = await db.collection(collection)
        .where({ id: data.id, familyId: member.familyId })
        .limit(1)
        .get()
      if (dup.data && dup.data.length > 0) {
        return { code: 0, data: { _id: dup.data[0]._id, duplicated: true } }
      }
    } catch (e) {
      // 查询失败不阻塞写入，降级走 add 逻辑
    }
  }

  const res = await db.collection(collection).add({ data: record })
  return { code: 0, data: { _id: res._id } }
}

async function updateRecord(member, collection, id, updates) {
  try {
    let record = null
    let docId = null

    // 先尝试用 doc(id) 查找（如果 id 是 _id）
    try {
      const doc = await db.collection(collection).doc(id).get()
      record = doc.data
      docId = id
    } catch (e) {
      // 如果找不到，用 where({ id }) 查找客户端生成的 id 字段
      const res = await db.collection(collection).where({ id }).get()
      if (res.data && res.data.length > 0) {
        record = res.data[0]
        docId = record._id
      }
    }

    if (!record) {
      return { code: -3, msg: '记录不存在' }
    }

    if (!canEdit(member, record)) {
      return { code: -2, msg: '无权限修改' }
    }

    delete updates._id
    delete updates.familyId
    delete updates.createdBy
    delete updates.createTime

    await db.collection(collection).doc(docId).update({ data: updates })
    return { code: 0 }
  } catch (err) {
    return { code: -3, msg: '记录不存在' }
  }
}

async function removeRecord(member, collection, id) {
  try {
    let record = null
    let docId = null

    // 先尝试用 doc(id) 查找（如果 id 是 _id）
    try {
      const doc = await db.collection(collection).doc(id).get()
      record = doc.data
      docId = id
    } catch (e) {
      // 如果找不到，用 where({ id }) 查找客户端生成的 id 字段
      const res = await db.collection(collection).where({ id }).get()
      if (res.data && res.data.length > 0) {
        record = res.data[0]
        docId = record._id
      }
    }

    if (!record) {
      return { code: -3, msg: '记录不存在' }
    }

    if (!canDelete(member, record, collection)) {
      return { code: -2, msg: '无权限删除' }
    }

    await db.collection(collection).doc(docId).remove()
    return { code: 0 }
  } catch (err) {
    return { code: -3, msg: '记录不存在' }
  }
}

async function listRecords(member, collection, childId, page, pageSize) {
  const where = { familyId: member.familyId }
  if (childId) where.childId = childId

  try {
    const countRes = await db.collection(collection)
      .where(where)
      .count()

    const res = await db.collection(collection)
      .where(where)
      .orderBy('createTime', 'desc')
      .skip((page - 1) * pageSize)
      .limit(pageSize)
      .get()

    return {
      code: 0,
      data: {
        list: res.data,
        total: countRes.total,
        page,
        pageSize
      }
    }
  } catch (err) {
    return { code: -2, msg: '查询失败: ' + err.message }
  }
}

// ===== 单例文档（按"家庭 + 孩子"维度隔离） =====
// 习惯定义、学习进度、设置、成就、刷牙故事/角色/积分/装饰、摆摊设置等属于
// "每个孩子一份"的单例数据。其云端 _id 由服务端用可信的 familyId 拼接生成，
// 杜绝客户端伪造 _id 覆盖其它家庭/孩子的数据，彻底解决跨家庭、跨孩子串号问题。
function singletonDocId(member, key, childId) {
  return member.familyId + '_' + (childId || '') + '_' + key
}

async function upsertSingleton(member, collection, key, childId, data) {
  if (!key) return { code: -1, msg: '缺少 key' }
  // 校验 childId 是否属于当前家庭，防止家庭内跨孩子篡改数据
  if (childId) {
    try {
      const familyDoc = await db.collection('families').doc(member.familyId).get()
      const children = familyDoc.data.children || []
      if (!children.some(c => c.childId === childId)) {
        return { code: -2, msg: '无效的孩子ID' }
      }
    } catch (e) {
      // 家庭不存在等异常，拒绝写入
      return { code: -2, msg: '家庭校验失败' }
    }
  }
  const docId = singletonDocId(member, key, childId)
  const record = {
    ...(data || {}),
    familyId: member.familyId,
    childId: childId || '',
    skey: key,
    updatedBy: member._id,
    updateTime: new Date()
  }
  // _id 由云端统一生成，忽略客户端传入的 _id
  delete record._id
  try {
    // set 语义为 upsert：文档存在则覆盖，不存在则按该 _id 创建
    await db.collection(collection).doc(docId).set({ data: record })
    return { code: 0, data: { _id: docId } }
  } catch (err) {
    // 个别环境下 set 对不存在文档会报错，降级用 add 指定 _id 创建
    try {
      await db.collection(collection).add({ data: { _id: docId, ...record } })
      return { code: 0, data: { _id: docId } }
    } catch (addErr) {
      return { code: -2, msg: '保存失败: ' + addErr.message }
    }
  }
}

async function getSingleton(member, collection, key, childId) {
  if (!key) return { code: -1, msg: '缺少 key' }
  // 校验 childId 是否属于当前家庭（与 upsertSingleton 保持一致的权限检查）
  if (childId) {
    try {
      const familyDoc = await db.collection('families').doc(member.familyId).get()
      const children = familyDoc.data.children || []
      if (!children.some(c => c.childId === childId)) {
        return { code: -2, msg: '无效的孩子ID' }
      }
    } catch (e) {
      return { code: -2, msg: '家庭校验失败' }
    }
  }
  const docId = singletonDocId(member, key, childId)
  try {
    const doc = await db.collection(collection).doc(docId).get()
    return { code: 0, data: doc.data }
  } catch (err) {
    // 文档不存在时返回 null，由客户端回退本地数据
    return { code: 0, data: null }
  }
}
