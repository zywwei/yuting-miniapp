const cloud = require('wx-server-sdk')
cloud.init({ env: 'cloudbase-d8gyw6k3f5ac78f76' })
const db = cloud.database()
const _ = db.command

const INVITE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const INVITE_LENGTH = 8
const INVITE_EXPIRE_DAYS = 7

exports.main = async (event, context) => {
  const { OPENID } = cloud.getWXContext()
  const { action } = event

  switch (action) {
    case 'create':
      return await createFamily(OPENID, event)
    case 'join':
      return await joinFamily(OPENID, event)
    case 'getInfo':
      return await getFamilyInfo(OPENID)
    case 'refreshInviteCode':
      return await refreshInviteCode(OPENID)
    case 'addChild':
      return await addChild(OPENID, event)
    case 'updateChild':
      return await updateChild(OPENID, event)
    case 'removeChild':
      return await removeChild(OPENID, event)
    case 'removeMember':
      return await removeMember(OPENID, event)
    case 'updateProfile':
      return await updateProfile(OPENID, event)
    case 'updateAvatar':
      return await updateAvatar(OPENID, event)
    case 'updateChildAvatar':
      return await updateChildAvatar(OPENID, event)
    case 'saveCurrentChild':
      return await saveCurrentChild(OPENID, event)
    case 'leaveFamily':
      return await leaveFamily(OPENID)
    default:
      return { code: -1, msg: '未知操作' }
  }
}

function generateInviteCode() {
  let code = ''
  for (let i = 0; i < INVITE_LENGTH; i++) {
    code += INVITE_CHARS[Math.floor(Math.random() * INVITE_CHARS.length)]
  }
  return code
}

async function getMemberByOpenid(openid) {
  const res = await db.collection('familyMembers')
    .where({ openid, status: 'active' })
    .get()
  return res.data[0] || null
}

async function isAdmin(member) {
  return member && member.permissions && member.permissions.indexOf('admin') >= 0
}

async function createFamily(openid, { familyName, roleName, nickname, childName, childNickname, childGender, childBirthday, avatar, familyAvatar, childTheme }) {
  const existing = await getMemberByOpenid(openid)
  if (existing) {
    // 已加入家庭，返回家庭信息而不是报错
    const familyRes = await db.collection('families').doc(existing.familyId).get()
    return {
      code: 0,
      data: {
        familyId: existing.familyId,
        inviteCode: familyRes.data.inviteCode,
        childId: familyRes.data.children && familyRes.data.children[0] ? familyRes.data.children[0].childId : '',
        existing: true
      }
    }
  }

  const inviteCode = generateInviteCode()
  const childId = 'c_' + Date.now()
  const now = new Date()

  const familyRes = await db.collection('families').add({
    data: {
      name: familyName || (childName || '宝宝') + '的家',
      creatorOpenid: openid,
      inviteCode,
      inviteCodeExpireAt: new Date(now.getTime() + INVITE_EXPIRE_DAYS * 24 * 3600 * 1000),
      avatar: familyAvatar || '',
      children: [{
        childId,
        name: childName || '宝宝',
        nickname: childNickname || '',
        gender: childGender || '',
        birthday: childBirthday || '',
        avatar: '',
        theme: childTheme || (childGender === 'boy' ? 'blue' : 'pink')
      }],
      status: 'active',
      createTime: now,
      updateTime: now
    }
  })

  const familyId = familyRes._id
  let role = 'father'
  let rName = roleName || '爸爸'
  if (roleName === '妈妈' || roleName === 'mother') {
    role = 'mother'
    rName = '妈妈'
  }

  await db.collection('familyMembers').add({
    data: {
      familyId,
      openid,
      role,
      roleName: rName,
      nickname: nickname || '',
      avatar: avatar || '',
      isChild: false,
      childId: '',
      permissions: ['admin'],
      status: 'active',
      joinTime: now,
      lastActiveAt: now
    }
  })

  return {
    code: 0,
    data: {
      familyId,
      inviteCode,
      childId
    }
  }
}

async function joinFamily(openid, { inviteCode, role, roleName, nickname, avatar }) {
  const familyRes = await db.collection('families')
    .where({ inviteCode, status: 'active' })
    .get()

  if (familyRes.data.length === 0) {
    return { code: -1, msg: '邀请码无效' }
  }

  const family = familyRes.data[0]
  if (new Date(family.inviteCodeExpireAt) < new Date()) {
    return { code: -2, msg: '邀请码已过期' }
  }

  const existing = await db.collection('familyMembers')
    .where({ familyId: family._id, openid, status: 'active' })
    .get()
  if (existing.data.length > 0) {
    return { code: -3, msg: '您已是该家庭成员' }
  }

  const isChildRole = role === 'child'
  const permissions = (role === 'father' || role === 'mother') ? ['admin'] : ['editor']

  let childId = ''
  if (isChildRole && family.children.length > 0) {
    childId = family.children[0].childId
  }

  const now = new Date()
  await db.collection('familyMembers').add({
    data: {
      familyId: family._id,
      openid,
      role: role || 'other',
      roleName: roleName || '家人',
      nickname: nickname || '',
      avatar: avatar || '',
      isChild: isChildRole,
      childId,
      permissions,
      status: 'active',
      joinTime: now,
      lastActiveAt: now
    }
  })

  return { code: 0, data: { familyId: family._id } }
}

async function getFamilyInfo(openid) {
  const member = await getMemberByOpenid(openid)
  if (!member) {
    return { code: -1, msg: '未加入家庭' }
  }

  const familyRes = await db.collection('families').doc(member.familyId).get()
  const family = familyRes.data

  if (!family || family.status === 'archived') {
    return { code: -2, msg: '家庭已解散' }
  }

  await db.collection('familyMembers').doc(member._id).update({
    data: { lastActiveAt: new Date() }
  })

  return {
    code: 0,
    data: {
      family,
      member,
      children: family.children || []
    }
  }
}

async function refreshInviteCode(openid) {
  const member = await getMemberByOpenid(openid)
  if (!member || !await isAdmin(member)) {
    return { code: -1, msg: '无权限' }
  }

  const inviteCode = generateInviteCode()
  const now = new Date()

  await db.collection('families').doc(member.familyId).update({
    data: {
      inviteCode,
      inviteCodeExpireAt: new Date(now.getTime() + INVITE_EXPIRE_DAYS * 24 * 3600 * 1000),
      updateTime: now
    }
  })

  return { code: 0, data: { inviteCode } }
}

async function addChild(openid, { name, nickname, gender, birthday, avatar, theme }) {
  const member = await getMemberByOpenid(openid)
  if (!member || !await isAdmin(member)) {
    return { code: -1, msg: '无权限' }
  }

  const childId = 'c_' + Date.now()
  const now = new Date()

  await db.collection('families').doc(member.familyId).update({
    data: {
      children: _.push({
        childId,
        name: name || '宝宝',
        nickname: nickname || '',
        gender: gender || '',
        birthday: birthday || '',
        avatar: avatar || '',
        theme: theme || (gender === 'boy' ? 'blue' : 'pink')
      }),
      updateTime: now
    }
  })

  return { code: 0, data: { childId } }
}

async function updateChild(openid, { childId, name, nickname, gender, birthday, avatar, theme }) {
  const member = await getMemberByOpenid(openid)
  if (!member || !await isAdmin(member)) {
    return { code: -1, msg: '无权限' }
  }

  const familyRes = await db.collection('families').doc(member.familyId).get()
  const children = familyRes.data.children || []

  const updated = children.map(c => {
    if (c.childId === childId) {
      return {
        ...c,
        name: name !== undefined ? name : c.name,
        nickname: nickname !== undefined ? nickname : c.nickname,
        gender: gender !== undefined ? gender : c.gender,
        birthday: birthday !== undefined ? birthday : c.birthday,
        avatar: avatar !== undefined ? avatar : c.avatar,
        theme: theme !== undefined ? theme : c.theme
      }
    }
    return c
  })

  await db.collection('families').doc(member.familyId).update({
    data: { children: updated, updateTime: new Date() }
  })

  return { code: 0 }
}

async function removeChild(openid, { childId }) {
  const member = await getMemberByOpenid(openid)
  if (!member || !await isAdmin(member)) {
    return { code: -1, msg: '无权限' }
  }

  const familyRes = await db.collection('families').doc(member.familyId).get()
  const children = (familyRes.data.children || []).filter(c => c.childId !== childId)

  await db.collection('families').doc(member.familyId).update({
    data: { children, updateTime: new Date() }
  })

  return { code: 0 }
}

async function removeMember(openid, { memberId }) {
  const member = await getMemberByOpenid(openid)
  if (!member || !await isAdmin(member)) {
    return { code: -1, msg: '无权限' }
  }

  if (member._id === memberId) {
    return { code: -2, msg: '不能移除自己' }
  }

  await db.collection('familyMembers').doc(memberId).update({
    data: { status: 'removed' }
  })

  return { code: 0 }
}

async function updateProfile(openid, { nickname, avatar }) {
  const member = await getMemberByOpenid(openid)
  if (!member) {
    return { code: -1, msg: '未加入家庭' }
  }

  const updates = {}
  if (nickname !== undefined) updates.nickname = nickname
  if (avatar !== undefined) updates.avatar = avatar

  if (Object.keys(updates).length > 0) {
    await db.collection('familyMembers').doc(member._id).update({
      data: updates
    })
  }

  return { code: 0 }
}

async function updateAvatar(openid, { avatar }) {
  const member = await getMemberByOpenid(openid)
  if (!member) {
    return { code: -1, msg: '未加入家庭' }
  }

  await db.collection('familyMembers').doc(member._id).update({
    data: { avatar }
  })

  return { code: 0 }
}

async function updateChildAvatar(openid, { childId, avatar }) {
  const member = await getMemberByOpenid(openid)
  if (!member) {
    return { code: -1, msg: '未加入家庭' }
  }

  const familyRes = await db.collection('families').doc(member.familyId).get()
  const children = familyRes.data.children || []

  const updated = children.map(c => {
    if (c.childId === childId) {
      return { ...c, avatar }
    }
    return c
  })

  await db.collection('families').doc(member.familyId).update({
    data: { children: updated, updateTime: new Date() }
  })

  return { code: 0 }
}

async function saveCurrentChild(openid, { childId }) {
  const member = await getMemberByOpenid(openid)
  if (!member) {
    return { code: -1, msg: '未加入家庭' }
  }

  await db.collection('familyMembers').doc(member._id).update({
    data: { currentChildId: childId }
  })

  return { code: 0 }
}

async function leaveFamily(openid) {
  const member = await getMemberByOpenid(openid)
  if (!member) {
    return { code: -1, msg: '未加入家庭' }
  }

  if (await isAdmin(member)) {
    return { code: -2, msg: '管理员不能退出家庭，请先转让管理员权限或解散家庭' }
  }

  await db.collection('familyMembers').doc(member._id).update({
    data: { status: 'removed' }
  })

  return { code: 0 }
}
