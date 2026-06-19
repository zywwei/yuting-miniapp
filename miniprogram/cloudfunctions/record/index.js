const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloudbase-d8gyw6k3f5ac78f76' })
const db = cloud.database()

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action, collection, data, id, childId, page, pageSize } = event

  const member = await getMemberByOpenid(OPENID)
  if (!member) {
    return { code: -1, msg: '未加入家庭' }
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
    case 'get':
      return await getRecord(member, collection, id)
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

function canDelete(member, record) {
  if (isAdmin(member)) return true
  return record.createdBy === member._id
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

  delete record._id

  const res = await db.collection(collection).add({ data: record })
  return { code: 0, data: { _id: res._id } }
}

async function updateRecord(member, collection, id, updates) {
  try {
    const doc = await db.collection(collection).doc(id).get()
    const record = doc.data

    if (!canEdit(member, record)) {
      return { code: -2, msg: '无权限修改' }
    }

    delete updates._id
    delete updates.familyId
    delete updates.createdBy
    delete updates.createTime

    await db.collection(collection).doc(id).update({ data: updates })
    return { code: 0 }
  } catch (err) {
    return { code: -3, msg: '记录不存在' }
  }
}

async function removeRecord(member, collection, id) {
  try {
    const doc = await db.collection(collection).doc(id).get()
    const record = doc.data

    if (!canDelete(member, record)) {
      return { code: -2, msg: '无权限删除' }
    }

    await db.collection(collection).doc(id).remove()
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

async function getRecord(member, collection, id) {
  try {
    const doc = await db.collection(collection).doc(id).get()
    const record = doc.data

    if (record.familyId !== member.familyId) {
      return { code: -2, msg: '无权访问' }
    }

    return { code: 0, data: record }
  } catch (err) {
    return { code: -3, msg: '记录不存在' }
  }
}
