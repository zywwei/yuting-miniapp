const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
const db = cloud.database()

const COLLECTION_MAP = {
  drawing: 'drawings',
  brushing: 'brushingRecords',
  habit: 'habitRecords',
  note: 'notes'
}

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event

  const member = await getMemberByOpenid(OPENID)
  if (!member) {
    return { code: -1, msg: '未加入家庭' }
  }

  switch (action) {
    case 'toggleLike':
      return await toggleLike(member, event)
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

async function getMemberByOpenid(openid) {
  const res = await db.collection('familyMembers')
    .where({ openid, status: 'active' })
    .get()
  return res.data[0] || null
}

function isAdmin(member) {
  return member && member.permissions && member.permissions.indexOf('admin') >= 0
}

function getCollectionName(targetType) {
  return COLLECTION_MAP[targetType] || targetType
}

async function toggleLike(member, { targetType, targetId }) {
  const collectionName = getCollectionName(targetType)

  try {
    const doc = await db.collection(collectionName).doc(targetId).get()
    const record = doc.data

    if (record.familyId !== member.familyId) {
      return { code: -2, msg: '无权操作' }
    }

    const likes = record.likes || []
    const existingIndex = likes.findIndex(l => l.memberId === member._id)

    if (existingIndex >= 0) {
      likes.splice(existingIndex, 1)
    } else {
      likes.push({
        memberId: member._id,
        memberName: member.roleName,
        time: new Date().toISOString()
      })
    }

    await db.collection(collectionName).doc(targetId).update({
      data: { likes }
    })

    return {
      code: 0,
      data: {
        liked: existingIndex < 0,
        likes
      }
    }
  } catch (err) {
    return { code: -3, msg: '记录不存在' }
  }
}

async function addComment(member, { targetType, targetId, childId, content, type, imageFileId, emoji }) {
  const collectionName = getCollectionName(targetType)

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
      content: content || '',
      type: type || 'text',
      imageFileId: imageFileId || '',
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

async function getComments(member, { targetType, targetId, page, pageSize }) {
  try {
    const where = {
      targetType,
      targetId,
      isDeleted: false
    }

    const res = await db.collection('comments')
      .where(where)
      .orderBy('createTime', 'asc')
      .limit(pageSize || 100)
      .get()

    const filtered = res.data.filter(c => c.familyId === member.familyId)

    return { code: 0, data: filtered }
  } catch (err) {
    return { code: -2, msg: '查询失败' }
  }
}
