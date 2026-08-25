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
  const { action, collection, data, id, childId, key, page, pageSize, memberId, date, familyId } = event

  const member = await getMemberByOpenid(OPENID, familyId)
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
      // B14：pageSize 钳制上限并校验类型，防止全量拉取与 NaN
      var safePage = Math.max(parseInt(page) || 1, 1)
      var safePageSize = Math.min(Math.max(parseInt(pageSize) || 20, 1), 100)
      return await listRecords(member, collection, childId, safePage, safePageSize, memberId, date)
    case 'upsertSingleton':
      // B14：memberId 维度强制取服务端身份，不接受客户端传值
      return await upsertSingleton(member, collection, key, childId, data, member._id)
    case 'getSingleton':
      // B14：同 upsertSingleton，memberId 强制取服务端身份
      return await getSingleton(member, collection, key, childId, member._id)
    default:
      return { code: -1, msg: '未知操作' }
  }
}

// B14：通用体量兜底校验（所有白名单集合共用）
function validateRecordSize(record) {
  if (!record || typeof record !== 'object') return null
  if (typeof record.content === 'string' && record.content.length > 5000) return '内容过长'
  try {
    if (JSON.stringify(record).length > 100 * 1024) return '记录体积过大'
  } catch (e) {
    return '记录序列化失败'
  }
  return null
}

async function getMemberByOpenid(openid, familyId) {
  // 优先按客户端传入的当前家庭精确匹配（多家庭切换场景）；未传时保持旧行为取第一条
  const cond = familyId
    ? { openid, familyId, status: 'active' }
    : { openid, status: 'active' }
  const res = await db.collection('familyMembers')
    .where(cond)
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

// 提取记录中引用的 cloud:// 文件并批量删除，防止删除/编辑时云存储孤儿文件累积
async function deleteCloudFiles(record) {
  if (!record) return
  var fileIds = []
  if (Array.isArray(record.images)) {
    fileIds = fileIds.concat(record.images.filter(function(f) {
      return typeof f === 'string' && f.indexOf('cloud://') === 0
    }))
  }
  ;['imagePath', 'voice', 'cloudFileID'].forEach(function(k) {
    if (typeof record[k] === 'string' && record[k].indexOf('cloud://') === 0) {
      fileIds.push(record[k])
    }
  })
  if (fileIds.length === 0) return
  try {
    await cloud.deleteFile({ fileList: fileIds })
  } catch (e) {
    console.warn('清理云存储文件失败:', e)
  }
}

// 过滤媒体字段，只允许 cloud:// 路径入库，防止客户端本地路径（wxfile:// 等）污染云端数据
function sanitizeMediaFields(record) {
  if (!record) return record
  if (Array.isArray(record.images)) {
    record.images = record.images.filter(function(f) {
      return typeof f === 'string' && f.indexOf('cloud://') === 0
    })
  }
  ;['imagePath', 'voice', 'cloudFileID'].forEach(function(k) {
    if (record[k] !== undefined && (typeof record[k] !== 'string' || record[k].indexOf('cloud://') !== 0)) {
      delete record[k]
    }
  })
  return record
}

async function addRecord(member, collection, data) {
  const record = {
    ...data,
    familyId: member.familyId,
    childId: data.childId || '',
    createdBy: member._id,
    createdByName: member.roleName,
    likes: [],
    createTime: data.createTime || new Date().toISOString()
  }

  // 媒体字段防御：只允许 cloud:// 路径入库（拦截客户端本地路径 wxfile:// 等）
  sanitizeMediaFields(record)

  // 笔记权限字段校验
  if (collection === 'notes') {
    // 确保 visibility 字段有默认值
    if (!record.visibility) {
      record.visibility = 'family'
    }
    // 校验 visibility 字段值
    const validVisibility = ['family', 'designated', 'private']
    if (validVisibility.indexOf(record.visibility) < 0) {
      record.visibility = 'family'  // 无效值回退到默认
    }
    // designated 模式校验 visibleTo
    if (record.visibility === 'designated') {
      if (!record.visibleTo || !Array.isArray(record.visibleTo) || record.visibleTo.length === 0) {
        record.visibility = 'family'  // 未选择成员，回退到家庭公开
      } else {
        // 校验 visibleTo 中的成员是否属于当前家庭
        const validMembers = await db.collection('familyMembers')
          .where({ familyId: member.familyId, status: 'active' })
          .field({ _id: true })
          .get()
        const validIds = validMembers.data.map(m => m._id)
        record.visibleTo = record.visibleTo.filter(vid => validIds.indexOf(vid) >= 0)
        if (record.visibleTo.length === 0) {
          record.visibility = 'family'  // 所选成员无效，回退到家庭公开
        }
      }
    }

    // 字段长度/数量校验，防止恶意客户端写入超长内容或超大数组
    if (record.title !== undefined) {
      if (typeof record.title !== 'string') return { code: -4, msg: '标题格式无效' }
      if (record.title.length > 100) return { code: -4, msg: '标题过长' }
    }
    if (record.content !== undefined && typeof record.content === 'string' && record.content.length > 5000) {
      return { code: -4, msg: '内容过长' }
    }
    if (Array.isArray(record.images) && record.images.length > 9) {
      record.images = record.images.slice(0, 9)
    }
    if (Array.isArray(record.tags) && record.tags.length > 5) {
      record.tags = record.tags.slice(0, 5)
    }
  }

  // B14：所有白名单集合通用的体量兜底校验（此前仅 notes 有长度限制，
  // 其余集合内容可任意超大）；100KB 为单文档合理上限
  var sizeError = validateRecordSize(record)
  if (sizeError) {
    return { code: -4, msg: sizeError }
  }

  // 如果指定了 _id，则使用指定的 _id（用于设置等单例文档）
  const id = record._id
  if (id) {
    // B2：客户端自指定 _id 是既有幂等 upsert 协议（列表记录/商品/战绩均以本地 id 作为 _id，
    // 如 prod_xxx/sale_xxx/base36 时间戳），故不做 familyId_ 前缀白名单——那会拒绝全部合法上传；
    // 防跨家庭覆盖由下方 get 归属校验保障，新建文档强制回写 familyId 确保归属本家庭
    if (typeof id !== 'string' || !id || !member.familyId) {
      return { code: -4, msg: '非法的文档ID' }
    }
    delete record._id
    record.familyId = member.familyId
    try {
      const current = await db.collection(collection).doc(id).get()
      const cur = current && current.data
      if (cur) {
        if (cur.familyId) {
          // 已归属他家庭：拒绝覆盖
          if (cur.familyId !== member.familyId) {
            return { code: -2, msg: '无权覆盖该文档' }
          }
        } else if (id.indexOf(member.familyId + '_') !== 0) {
          // 存量脏数据（缺失 familyId）：仅允许 _id 以本家庭前缀开头的文档被认领覆盖，
          // 防止任意家庭成员凭碰撞到的 _id 认领改写无归属文档
          return { code: -2, msg: '无权覆盖该文档' }
        }
      }
      await db.collection(collection).doc(id).set({ data: record })
      return { code: 0, data: { _id: id } }
    } catch (err) {
      // 文档不存在时使用 add 创建（归属由上方 familyId 回写保证；指定 _id 已存在时 add 自身会报错，不会静默覆盖）
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
      // 先带 familyId 精确查；查不到再不带 familyId 查一次，兼容无 familyId 的历史数据
      // （命中后走下方统一校验：有 familyId 且不匹配才拒绝）
      let res = await db.collection(collection).where({ id, familyId: member.familyId }).get()
      if (!res.data || res.data.length === 0) {
        res = await db.collection(collection).where({ id }).get()
      }
      if (res.data && res.data.length > 0) {
        record = res.data[0]
        docId = record._id
      }
    }

    if (!record) {
      return { code: -3, msg: '记录不存在' }
    }

    // 跨家庭防护（收紧）：familyId 不匹配或缺失一律按"不存在"处理。
    // 服务端 addRecord 历来强制写入 familyId，正常数据均含该字段；
    // 历史遗留的无归属文档需先用 reviewed/migrate-orphan-familyid.md 的方式归位。
    if (record.familyId !== member.familyId) {
      return { code: -3, msg: '记录不存在' }
    }

    if (!canEdit(member, record, collection)) {
      return { code: -2, msg: '无权限修改' }
    }

    // 字段级权限校验：对配置了 FIELD_PERMISSIONS 的集合，逐字段校验受限字段
    // 防止非创建者通过 update 绕过限制修改 creatorOnly 字段（如 bookEntries.amount/type）
    var fieldPerms = FIELD_PERMISSIONS[collection]
    if (fieldPerms) {
      for (var f in updates) {
        if (!canEdit(member, record, collection, f)) {
          return { code: -2, msg: '无权限修改字段: ' + f }
        }
      }
    }

    // B14：剔除点赞字段——likes 只能由 interaction 云函数维护，
    // 防止创建者通过 update 整包伪造点赞数据
    delete updates.likes

    // 笔记权限字段校验
    if (collection === 'notes') {
      // 校验 visibility 字段值
      if (updates.visibility !== undefined) {
        const validVisibility = ['family', 'designated', 'private']
        if (validVisibility.indexOf(updates.visibility) < 0) {
          return { code: -4, msg: '无效的可见范围值' }
        }
        // designated 模式必须选择可见成员
        if (updates.visibility === 'designated') {
          if (!updates.visibleTo || !Array.isArray(updates.visibleTo) || updates.visibleTo.length === 0) {
            return { code: -4, msg: '指定人模式必须选择可见成员' }
          }
          // 校验 visibleTo 中的成员是否属于当前家庭
          const validMembers = await db.collection('familyMembers')
            .where({ familyId: member.familyId, status: 'active' })
            .field({ _id: true })
            .get()
          const validIds = validMembers.data.map(m => m._id)
          updates.visibleTo = updates.visibleTo.filter(vid => validIds.indexOf(vid) >= 0)
          if (updates.visibleTo.length === 0) {
            return { code: -4, msg: '选择的成员无效' }
          }
        }
      }
      // 字段长度/数量校验，与 addRecord 保持一致，防止通过 update 绕过限制写入超长内容
      if (updates.title !== undefined) {
        if (typeof updates.title !== 'string') return { code: -4, msg: '标题格式无效' }
        if (updates.title.length > 100) return { code: -4, msg: '标题过长' }
      }
      if (updates.content !== undefined && typeof updates.content === 'string' && updates.content.length > 5000) {
        return { code: -4, msg: '内容过长' }
      }
      if (Array.isArray(updates.images) && updates.images.length > 9) {
        updates.images = updates.images.slice(0, 9)
      }
      if (Array.isArray(updates.tags) && updates.tags.length > 5) {
        updates.tags = updates.tags.slice(0, 5)
      }
    }

    delete updates._id
    delete updates.familyId
    delete updates.createdBy
    delete updates.createTime

    // 编辑图片时清理被移除的旧云文件（差集），避免孤儿文件
    // 注意：imagePath 仅是指向 images[0] 的指针，其文件清理已由 images 差集覆盖，不单独处理
    // 否则换封面但旧图仍保留在 images 中时会误删仍在使用的文件
    if (Array.isArray(updates.images)) {
      var removed = (record.images || []).filter(function(f) {
        return typeof f === 'string' && f.indexOf('cloud://') === 0 && updates.images.indexOf(f) < 0
      })
      if (removed.length > 0) {
        try { await cloud.deleteFile({ fileList: removed }) } catch (e) { console.warn('清理旧云文件失败:', e) }
      }
    }

    // 媒体字段防御：只允许 cloud:// 路径入库（拦截客户端本地路径 wxfile:// 等）
    sanitizeMediaFields(updates)

    await db.collection(collection).doc(docId).update({ data: updates })
    return { code: 0 }
  } catch (err) {
    // B14/I-1：真实服务器错误用 -5 与"记录不存在(-3)"区分开，
    // 避免客户端把"更新失败"误当成"记录已删"而清墓碑，导致已删记录复活
    console.error('updateRecord 异常:', collection, err)
    return { code: -5, msg: '更新失败: ' + (err.message || '未知错误') }
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
      // 先带 familyId 精确查；查不到再不带 familyId 查一次，兼容无 familyId 的历史数据
      // （命中后走下方统一校验：有 familyId 且不匹配才拒绝）
      let res = await db.collection(collection).where({ id, familyId: member.familyId }).get()
      if (!res.data || res.data.length === 0) {
        res = await db.collection(collection).where({ id }).get()
      }
      if (res.data && res.data.length > 0) {
        record = res.data[0]
        docId = record._id
      }
    }

    if (!record) {
      return { code: -3, msg: '记录不存在' }
    }

    // 跨家庭防护（收紧）：familyId 不匹配或缺失一律按"不存在"处理。
    // 历史遗留的无归属文档需先用 reviewed/migrate-orphan-familyid.md 的方式归位。
    if (record.familyId !== member.familyId) {
      return { code: -3, msg: '记录不存在' }
    }

    if (!canDelete(member, record, collection)) {
      return { code: -2, msg: '无权限删除' }
    }

    // 先删 DB 记录（使其不可见），再清理云存储文件
    // 顺序反之：若云文件先删成功而 DB 删除失败，会留下引用失效文件的幽灵记录
    await db.collection(collection).doc(docId).remove()
    await deleteCloudFiles(record)
    return { code: 0 }
  } catch (err) {
    // B14/I-1：真实服务器错误用 -5 与"记录不存在(-3)"区分开，
    // 避免客户端把"删除失败"误当成"已删"而清墓碑，导致已删记录复活
    console.error('removeRecord 异常:', collection, err)
    return { code: -5, msg: '删除失败: ' + (err.message || '未知错误') }
  }
}

async function listRecords(member, collection, childId, page, pageSize, memberId, date) {
  let where = { familyId: member.familyId }
  
  // 笔记不按 childId 隔离，通过 visibility 控制权限
  if (collection !== 'notes') {
    // 根据隔离级别过滤
    if (memberId) {
      // 成员级：只看自己的
      where.createdBy = memberId
    } else if (childId) {
      // 孩子级：按 childId 过滤
      where.childId = childId
    }
    // 家庭级：不额外过滤
  }

  // 日期筛选（只加载指定日期的数据）
  if (date) {
    where.date = date
  }

  // 笔记权限过滤
  if (collection === 'notes') {
    const _ = db.command
    where = _.or(
      { familyId: member.familyId, visibility: 'family' },
      { familyId: member.familyId, visibility: 'designated', visibleTo: member._id },
      { familyId: member.familyId, visibility: 'private', createdBy: member._id },
      { familyId: member.familyId, visibility: _.exists(false) }
    )
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
        // 构建 https→cloud:// 查找表（imageFileIDMap），客户端编辑/更新时按值查找，不依赖位置索引，避免删图后错位
        rec.imageFileIDMap = {}
        rec.images.forEach(function(img) {
          if (urlMap[img]) rec.imageFileIDMap[urlMap[img]] = img
        })
        rec.images = rec.images.map(function(img) { return urlMap[img] || img })
      }
      if (typeof rec.imagePath === 'string' && urlMap[rec.imagePath]) {
        rec.imagePathFileID = rec.imagePath
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
