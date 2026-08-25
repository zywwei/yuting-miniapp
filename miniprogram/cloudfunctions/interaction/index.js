const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()
const cmd = db.command

// B11：targetType 白名单——仅允许映射命中的集合，防止客户端传入任意集合名探测/污染
const COLLECTION_MAP = {
  drawing: 'drawings',
  brushing: 'brushingRecords',
  habit: 'habitRecords',
  note: 'notes'
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action, familyId } = event

  const member = await getMemberByOpenid(OPENID, familyId)
  if (!member) {
    return { code: -1, msg: '未加入家庭' }
  }

  switch (action) {
    case 'toggleLike':
      return await toggleLike(member, event)
    case 'setLike':
      return await setLike(member, event)
    case 'addComment':
      return await addComment(member, event)
    case 'deleteComment':
      return await deleteComment(member, event)
    case 'getComments':
      return await getComments(member, event)
    default:
      return { code: -1, msg: '未知操作' }
  }
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

// B11：白名单命中才返回集合名，否则返回 null（旧实现回退到原始字符串可达任意集合）
function getCollectionName(targetType) {
  return COLLECTION_MAP[targetType] || null
}

// B13：点赞核心——pull 保底去重 + 可选 push，全部走数组原子操作，
// 并发点赞不再互相覆盖；setLike 语义为幂等终态（离线重放安全）
async function applyLike(member, targetType, targetId, liked) {
  const collectionName = getCollectionName(targetType)
  if (!collectionName) {
    return { code: -1, msg: '无效的目标类型' }
  }

  try {
    const doc = await db.collection(collectionName).doc(targetId).get()
    if (doc.data.familyId !== member.familyId) {
      return { code: -2, msg: '无权操作' }
    }

    // 先移除本人已有点赞（幂等去重）
    await db.collection(collectionName).doc(targetId).update({
      data: { likes: cmd.pull({ memberId: member._id }) }
    })

    if (liked) {
      await db.collection(collectionName).doc(targetId).update({
        data: {
          likes: cmd.push([{
            memberId: member._id,
            memberName: member.roleName,
            time: new Date().toISOString()
          }])
        }
      })
    }

    const fresh = await db.collection(collectionName).doc(targetId).get()
    const likes = fresh.data.likes || []
    const likedFinal = likes.some(l => l.memberId === member._id)

    return {
      code: 0,
      data: { liked: likedFinal, likes }
    }
  } catch (err) {
    return { code: -3, msg: '记录不存在' }
  }
}

async function toggleLike(member, { targetType, targetId }) {
  const collectionName = getCollectionName(targetType)
  if (!collectionName) {
    return { code: -1, msg: '无效的目标类型' }
  }

  try {
    const doc = await db.collection(collectionName).doc(targetId).get()
    const existing = (doc.data.likes || []).some(l => l.memberId === member._id)
    return await applyLike(member, targetType, targetId, !existing)
  } catch (err) {
    return { code: -3, msg: '记录不存在' }
  }
}

// 幂等的终态式点赞（配合离线队列重放：携带目标状态，重试不会来回翻转）
async function setLike(member, { targetType, targetId, liked }) {
  return applyLike(member, targetType, targetId, !!liked)
}

async function addComment(member, { targetType, targetId, childId, content, type, imageFileId, emoji }) {
  const collectionName = getCollectionName(targetType)
  if (!collectionName) {
    return { code: -1, msg: '无效的目标类型' }
  }

  // B12：内容长度限制 + 图片引用必须是合法的云存储 fileID
  var safeContent = typeof content === 'string' ? content : ''
  if (safeContent.length > 500) {
    return { code: -4, msg: '评论内容过长' }
  }
  var safeImageFileId = ''
  if (imageFileId) {
    if (typeof imageFileId !== 'string' || imageFileId.indexOf('cloud://') !== 0) {
      return { code: -4, msg: '图片引用无效' }
    }
    safeImageFileId = imageFileId
  }

  try {
    const doc = await db.collection(collectionName).doc(targetId).get()
    if (doc.data.familyId !== member.familyId) {
      return { code: -2, msg: '无权操作' }
    }
  } catch (err) {
    return { code: -3, msg: '目标记录不存在' }
  }

  const now = new Date()
  const res = await db.collection('comments').add({
    data: {
      familyId: member.familyId,
      targetType,
      targetId,
      childId: childId || '',
      authorId: member._id,
      authorName: member.roleName,
      authorRole: member.role,
      content: safeContent,
      type: type || 'text',
      imageFileId: safeImageFileId,
      emoji: emoji || '',
      isDeleted: false,
      createTime: now
    }
  })

  return { code: 0, data: { _id: res._id } }
}

async function deleteComment(member, { commentId }) {
  try {
    const doc = await db.collection('comments').doc(commentId).get()
    const comment = doc.data

    if (comment.familyId !== member.familyId) {
      return { code: -2, msg: '无权操作' }
    }

    if (!isAdmin(member) && comment.authorId !== member._id) {
      return { code: -3, msg: '无权限删除他人评论' }
    }

    await db.collection('comments').doc(commentId).update({
      data: { isDeleted: true }
    })

    return { code: 0 }
  } catch (err) {
    return { code: -4, msg: '评论不存在' }
  }
}

// 把评论里的 cloud:// imageFileId 转成临时 https URL，解决跨账户读取问题
async function resolveCommentImages(comments) {
  var fileList = []
  comments.forEach(function(c) {
    if (c.imageFileId && typeof c.imageFileId === 'string' && c.imageFileId.indexOf('cloud://') === 0) {
      fileList.push(c.imageFileId)
    }
  })
  if (fileList.length === 0) return comments
  var uniqueIds = []
  var seen = {}
  fileList.forEach(function(id) { if (!seen[id]) { seen[id] = true; uniqueIds.push(id) } })
  try {
    var BATCH_SIZE = 50
    var urlMap = {}
    for (var b = 0; b < uniqueIds.length; b += BATCH_SIZE) {
      var batch = uniqueIds.slice(b, b + BATCH_SIZE)
      var batchRes = await cloud.getTempFileURL({ fileList: batch })
      batchRes.fileList.forEach(function(f) { if (f.tempFileURL) urlMap[f.fileID] = f.tempFileURL })
    }
    comments.forEach(function(c) {
      if (c.imageFileId && urlMap[c.imageFileId]) c.imageFileId = urlMap[c.imageFileId]
    })
  } catch (e) { console.warn('getTempFileURL 失败:', e) }
  return comments
}

async function getComments(member, { targetType, targetId, page, pageSize }) {
  try {
    const where = {
      familyId: member.familyId,
      targetType,
      targetId,
      isDeleted: false
    }

    // P1-18：补齐分页能力（page/pageSize 缺省时行为与旧版一致）
    var size = Math.min(Number(pageSize) || 100, 100)
    var skip = (Math.max(Number(page) || 1, 1) - 1) * size

    const res = await db.collection('comments')
      .where(where)
      .orderBy('createTime', 'asc')
      .skip(skip)
      .limit(size)
      .get()

    var list = await resolveCommentImages(res.data)
    return { code: 0, data: list }
  } catch (err) {
    return { code: -2, msg: '查询失败' }
  }
}
