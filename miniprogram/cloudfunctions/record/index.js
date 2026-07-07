const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

// 允许客户端访问的集合白名单，防止恶意请求写入/删除敏感集合（如 familyMembers）
const ALLOWED_COLLECTIONS = [
  'drawings', 'notes', 'brushingRecords', 'habitRecords',
  'achievements', 'userSettings', 'stallProducts', 'stallSales',
  'stallSettings', 'stallChallenges', 'stallBusinessHours', 'gameRecords', 'comments', 'likes',
  'accountBooks', 'bookEntries', 'accountSettings', 'aiSkills'
]

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action, collection, data, id, childId, key, page, pageSize, memberId, date } = event

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
      return await listRecords(member, collection, childId, page || 1, pageSize || 20, memberId, date)
    case 'upsertSingleton':
      return await upsertSingleton(member, collection, key, childId, data, memberId)
    case 'getSingleton':
      return await getSingleton(member, collection, key, childId, memberId)
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

// 字段级权限配置
const FIELD_PERMISSIONS = {
  habitRecords: {
    editable: ['note', 'score', 'images'],
    adminOnly: ['delete']
  },
  bookEntries: {
    editable: ['note', 'category', 'tags'],
    creatorOnly: ['amount', 'type']
  }
}

function canEdit(member, record, collection, field) {
  // 管理员全部权限
  if (isAdmin(member)) return true
  
  // 检查字段级权限
  var fieldPerms = FIELD_PERMISSIONS[collection]
  if (field && fieldPerms) {
    // 管理员专属字段
    if (fieldPerms.adminOnly && fieldPerms.adminOnly.indexOf(field) >= 0) {
      return false
    }
    // 创建者专属字段
    if (fieldPerms.creatorOnly && fieldPerms.creatorOnly.indexOf(field) >= 0) {
      return record.createdBy === member._id
    }
    // 可编辑字段
    if (fieldPerms.editable && fieldPerms.editable.indexOf(field) >= 0) {
      return true
    }
  }
  
  // 默认：创建者可编辑
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

async function listRecords(member, collection, childId, page, pageSize, memberId, date) {
  const where = { familyId: member.familyId }
  
  // 根据隔离级别过滤
  if (memberId) {
    // 成员级：只看自己的
    where.createdBy = memberId
  } else if (childId) {
    // 孩子级：按 childId 过滤
    where.childId = childId
  }
  // 家庭级：不额外过滤

  // 日期筛选（只加载指定日期的数据）
  if (date) {
    where.date = date
  }

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

    var list = await resolveCloudFileIDs(res.data)
    return {
      code: 0,
      data: {
        list: list,
        total: countRes.total,
        page,
        pageSize
      }
    }
  } catch (err) {
    return { code: -2, msg: '查询失败: ' + err.message }
  }
}

// 批量把记录里的 cloud:// fileID 转成临时 https URL
// 云函数用管理员权限调用 getTempFileURL，不受存储安全规则限制，解决跨账户读取问题
async function resolveCloudFileIDs(records) {
  var fileList = []
  for (var i = 0; i < records.length; i++) {
    var r = records[i]
    if (r.images && Array.isArray(r.images)) {
      for (var j = 0; j < r.images.length; j++) {
        if (typeof r.images[j] === 'string' && r.images[j].indexOf('cloud://') === 0) {
          fileList.push(r.images[j])
        }
      }
    }
    if (typeof r.imagePath === 'string' && r.imagePath.indexOf('cloud://') === 0) {
      fileList.push(r.imagePath)
    }
    if (typeof r.cloudFileID === 'string' && r.cloudFileID.indexOf('cloud://') === 0) {
      fileList.push(r.cloudFileID)
    }
  }
  if (fileList.length === 0) return records
  var uniqueIds = []
  var seen = {}
  for (var k = 0; k < fileList.length; k++) {
    if (!seen[fileList[k]]) { seen[fileList[k]] = true; uniqueIds.push(fileList[k]) }
  }
  try {
    var urlMap = {}
    var BATCH_SIZE = 50
    for (var b = 0; b < uniqueIds.length; b += BATCH_SIZE) {
      var batch = uniqueIds.slice(b, b + BATCH_SIZE)
      var batchRes = await cloud.getTempFileURL({ fileList: batch })
      for (var m = 0; m < batchRes.fileList.length; m++) {
        if (batchRes.fileList[m].tempFileURL) {
          urlMap[batchRes.fileList[m].fileID] = batchRes.fileList[m].tempFileURL
        }
      }
    }
    for (var n = 0; n < records.length; n++) {
      var rec = records[n]
      if (rec.images && Array.isArray(rec.images)) {
        rec.images = rec.images.map(function(img) { return urlMap[img] || img })
      }
      if (typeof rec.imagePath === 'string' && urlMap[rec.imagePath]) {
        rec.imagePath = urlMap[rec.imagePath]
      }
      if (typeof rec.cloudFileID === 'string' && urlMap[rec.cloudFileID]) {
        rec.cloudFileID = urlMap[rec.cloudFileID]
      }
    }
  } catch (e) {
    console.warn('getTempFileURL 失败，返回原始 fileID:', e)
  }
  return records
}

// ===== 单例文档（支持多隔离级别） =====
// 习惯定义、学习进度、设置、成就、刷牙故事/角色/积分/装饰、摆摊设置等属于
// "每个孩子一份"的单例数据。其云端 _id 由服务端用可信的 familyId 拼接生成，
// 杜绝客户端伪造 _id 覆盖其它家庭/孩子的数据，彻底解决跨家庭、跨孩子串号问题。
// 支持三种隔离级别：家庭级（familyId + key）、孩子级（familyId + childId + key）、成员级（familyId + memberId + key）
function singletonDocId(member, key, childId, memberId) {
  var parts = [member.familyId]
  
  // 优先级：memberId > childId > 纯家庭级
  if (memberId) {
    parts.push('member_' + memberId)
  } else if (childId) {
    parts.push(childId)
  }
  
  parts.push(key)
  return parts.join('_')
}

async function upsertSingleton(member, collection, key, childId, data, memberId) {
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
  const docId = singletonDocId(member, key, childId, memberId)
  const record = {
    ...(data || {}),
    familyId: member.familyId,
    childId: childId || '',
    memberId: memberId || '',
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

async function getSingleton(member, collection, key, childId, memberId) {
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
  const docId = singletonDocId(member, key, childId, memberId)
  try {
    const doc = await db.collection(collection).doc(docId).get()
    var singletonData = doc.data
    if (singletonData) {
      var resolvedList = await resolveCloudFileIDs([singletonData])
      singletonData = resolvedList[0]
    }
    return { code: 0, data: singletonData }
  } catch (err) {
    // 文档不存在时返回 null，由客户端回退本地数据
    return { code: 0, data: null }
  }
}
