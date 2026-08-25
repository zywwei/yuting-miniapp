const cloud = require('wx-server-sdk')
cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV })
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
      return await getFamilyInfo(OPENID, event.familyId)
    case 'getMyFamilies':
      return await getMyFamilies(OPENID)
    case 'getFamilyDetail':
      return await getFamilyDetail(OPENID, event)
    case 'getMembers':
      return await getMembers(OPENID, event)
    case 'refreshInviteCode':
      return await refreshInviteCode(OPENID, event.familyId)
    case 'addChild':
      return await addChild(OPENID, event)
    case 'updateChild':
      return await updateChild(OPENID, event)
    case 'removeChild':
      return await removeChild(OPENID, event)
    case 'removeMember':
      return await removeMember(OPENID, event)
    case 'disableMember':
      return await disableMember(OPENID, event)
    case 'enableMember':
      return await enableMember(OPENID, event)
    case 'updateProfile':
      return await updateProfile(OPENID, event)
    case 'updateAvatar':
      return await updateAvatar(OPENID, event)
    case 'updateChildAvatar':
      return await updateChildAvatar(OPENID, event)
    case 'saveCurrentChild':
      return await saveCurrentChild(OPENID, event)
    case 'leaveFamily':
      return await leaveFamily(OPENID, event.familyId)
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

async function getMemberByOpenid(openid, familyId) {
  // P0-8 第四处同型修复：优先按客户端传入的当前家庭精确匹配（多家庭切换场景）；
  // 未传时保持旧行为取第一条。status 含 disabled：管理操作需要能查到被禁用成员。
  const cond = familyId
    ? { openid, familyId, status: db.command.in(['active', 'disabled']) }
    : { openid, status: db.command.in(['active', 'disabled']) }
  const res = await db.collection('familyMembers')
    .where(cond)
    .get()
  return res.data[0] || null
}

async function isAdmin(member) {
  return member && member.permissions && member.permissions.indexOf('admin') >= 0
}

async function createFamily(openid, { familyName, role, roleName, nickname, childName, childNickname, childGender, childBirthday, avatar, familyAvatar, childTheme }) {
  try {
    // 建家语义：不按当前家庭过滤，需检查该 openid 名下全部 membership
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

    const ROLE_NAMES = {
      father: '爸爸', mother: '妈妈', child: '本人',
      grandpa: '爷爷', grandma: '奶奶', uncle: '叔叔', aunt: '阿姨', other: '其他'
    }
    const memberRole = role || 'father'
    const memberRoleName = roleName || ROLE_NAMES[memberRole] || '家人'

    await db.collection('familyMembers').add({
      data: {
        familyId,
        openid,
        role: memberRole,
        roleName: memberRoleName,
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
  } catch (err) {
    return { code: -2, msg: '创建家庭失败: ' + err.message }
  }
}

async function joinFamily(openid, { inviteCode, role, roleName, nickname, avatar }) {
  try {
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

    // B1：查重覆盖 removed/disabled——被移除或禁用的成员不得凭邀请码自行回归
    const existing = await db.collection('familyMembers')
      .where({ familyId: family._id, openid, status: db.command.in(['active', 'disabled', 'removed']) })
      .get()
    if (existing.data.length > 0) {
      return { code: -3, msg: existing.data[0].status === 'active' ? '您已是该家庭成员' : '该账号已被限制加入此家庭，请联系管理员' }
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
  } catch (err) {
    return { code: -2, msg: '加入家庭失败: ' + err.message }
  }
}

async function getFamilyInfo(openid, familyId) {
  try {
    const member = await getMemberByOpenid(openid, familyId)
    if (!member) {
      return { code: -1, msg: '未加入家庭' }
    }

    if (member.status === 'disabled') {
      return { code: -3, msg: '您的账号已被禁用，请联系管理员' }
    }

    const familyRes = await db.collection('families').doc(member.familyId).get()
    const family = familyRes.data

    if (!family || family.status === 'archived') {
      return { code: -2, msg: '家庭已解散' }
    }

    await db.collection('familyMembers').doc(member._id).update({
      data: { lastActiveAt: new Date() }
    })

    // 获取所有家庭成员（活跃和禁用，不含已移除）
    const membersRes = await db.collection('familyMembers')
      .where({
        familyId: member.familyId,
        status: db.command.in(['active', 'disabled'])
      })
      .get()

    var infoData = {
      family,
      member,
      children: family.children || [],
      members: membersRes.data || []
    }
    await resolveAvatarURLs(infoData)
    return { code: 0, data: infoData }
  } catch (err) {
    return { code: -2, msg: '获取家庭信息失败: ' + err.message }
  }
}

// 把家庭数据里的 cloud:// avatar 转成临时 https URL，解决跨账户读取问题
async function resolveAvatarURLs(data) {
  var fileList = []
  var fields = [
    { obj: data.family, key: 'avatar' },
    { obj: data.member, key: 'avatar' },
    { obj: data, key: 'familyAvatar' }
  ]
  if (data.children) {
    data.children.forEach(function(c) { fields.push({ obj: c, key: 'avatar' }) })
  }
  if (data.members) {
    data.members.forEach(function(m) { fields.push({ obj: m, key: 'avatar' }) })
  }
  fields.forEach(function(f) {
    if (f.obj && typeof f.obj[f.key] === 'string' && f.obj[f.key].indexOf('cloud://') === 0) {
      fileList.push(f.obj[f.key])
    }
  })
  if (fileList.length === 0) return data
  var uniqueIds = []
  var seen = {}
  fileList.forEach(function(id) { if (!seen[id]) { seen[id] = true; uniqueIds.push(id) } })
  try {
    var urlMap = {}
    var BATCH_SIZE = 50
    for (var b = 0; b < uniqueIds.length; b += BATCH_SIZE) {
      var batch = uniqueIds.slice(b, b + BATCH_SIZE)
      var batchRes = await cloud.getTempFileURL({ fileList: batch })
      batchRes.fileList.forEach(function(f) { if (f.tempFileURL) urlMap[f.fileID] = f.tempFileURL })
    }
    fields.forEach(function(f) {
      if (f.obj && f.obj[f.key] && urlMap[f.obj[f.key]]) f.obj[f.key] = urlMap[f.obj[f.key]]
    })
  } catch (e) {
    console.warn('getTempFileURL 失败:', e)
  }
  return data
}

// 获取家庭成员列表（只返回活跃成员）
async function getMembers(openid, { familyId }) {
  try {
    // 验证请求者是否属于该家庭
    const member = await db.collection('familyMembers')
      .where({ openid, familyId, status: 'active' })
      .get()
    
    if (!member.data || member.data.length === 0) {
      return { code: -1, msg: '无权限访问' }
    }

    // 获取该家庭的所有活跃成员
    const membersRes = await db.collection('familyMembers')
      .where({ familyId, status: 'active' })
      .field({
        _id: true,
        role: true,
        roleName: true,
        nickname: true,
        avatar: true,
        isChild: true,
        childId: true
      })
      .get()

    return { code: 0, data: membersRes.data || [] }
  } catch (err) {
    return { code: -2, msg: '获取成员失败: ' + err.message }
  }
}

async function getMyFamilies(openid) {
  try {
    // 获取用户所有家庭成员记录
    const membersRes = await db.collection('familyMembers')
      .where({
        openid,
        status: db.command.in(['active', 'disabled'])
      })
      .get()

    const memberRecords = membersRes.data || []
    if (memberRecords.length === 0) {
      return { code: 0, data: { families: [] } }
    }

    // 获取所有家庭信息
    const familyIds = [...new Set(memberRecords.map(m => m.familyId))]
    const familiesRes = await db.collection('families')
      .where({
        _id: db.command.in(familyIds),
        status: 'active'
      })
      .get()

    const familiesMap = {}
    familiesRes.data.forEach(f => { familiesMap[f._id] = f })

    // 组装数据
    const families = []
    for (const memberRecord of memberRecords) {
      const family = familiesMap[memberRecord.familyId]
      if (!family) continue

      families.push({
        familyId: family._id,
        familyName: family.name,
        familyAvatar: family.avatar,
        family: family,
        member: memberRecord,
        children: family.children || [],
        status: memberRecord.status,
        role: memberRecord.role,
        roleName: memberRecord.roleName
      })
    }

    for (var fi = 0; fi < families.length; fi++) {
      await resolveAvatarURLs(families[fi])
    }
    return { code: 0, data: { families } }
  } catch (err) {
    return { code: -2, msg: '获取家庭列表失败: ' + err.message }
  }
}

async function getFamilyDetail(openid, { familyId }) {
  try {
    // 获取用户在该家庭的成员记录
    const memberRes = await db.collection('familyMembers')
      .where({
        openid,
        familyId,
        status: db.command.in(['active', 'disabled'])
      })
      .get()

    const member = memberRes.data[0]
    if (!member) {
      return { code: -1, msg: '您不是该家庭成员' }
    }

    if (member.status === 'disabled') {
      return { code: -3, msg: '您的账号在该家庭已被禁用' }
    }

    // 获取家庭信息
    const familyRes = await db.collection('families').doc(familyId).get()
    const family = familyRes.data

    if (!family || family.status === 'archived') {
      return { code: -2, msg: '家庭已解散' }
    }

    // 获取所有家庭成员
    const membersRes = await db.collection('familyMembers')
      .where({
        familyId,
        status: db.command.in(['active', 'disabled'])
      })
      .get()

    var detailData = {
      family,
      member,
      children: family.children || [],
      members: membersRes.data || []
    }
    await resolveAvatarURLs(detailData)
    return { code: 0, data: detailData }
  } catch (err) {
    return { code: -2, msg: '获取家庭详情失败: ' + err.message }
  }
}

async function refreshInviteCode(openid, familyId) {
  try {
    const member = await getMemberByOpenid(openid, familyId)
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
  } catch (err) {
    return { code: -2, msg: '刷新邀请码失败: ' + err.message }
  }
}

async function addChild(openid, { familyId, name, nickname, gender, birthday, avatar, theme }) {
  try {
    const member = await getMemberByOpenid(openid, familyId)
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
  } catch (err) {
    return { code: -2, msg: '添加孩子失败: ' + err.message }
  }
}

async function updateChild(openid, { familyId, childId, name, nickname, gender, birthday, avatar, theme }) {
  try {
    const member = await getMemberByOpenid(openid, familyId)
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
  } catch (err) {
    return { code: -2, msg: '更新孩子信息失败: ' + err.message }
  }
}

async function removeChild(openid, { familyId, childId }) {
  try {
    const member = await getMemberByOpenid(openid, familyId)
    if (!member || !await isAdmin(member)) {
      return { code: -1, msg: '无权限' }
    }

    const familyRes = await db.collection('families').doc(member.familyId).get()
    const children = (familyRes.data.children || []).filter(c => c.childId !== childId)

    await db.collection('families').doc(member.familyId).update({
      data: { children, updateTime: new Date() }
    })

    return { code: 0 }
  } catch (err) {
    return { code: -2, msg: '删除孩子失败: ' + err.message }
  }
}

async function removeMember(openid, { familyId, memberId }) {
  try {
    const member = await getMemberByOpenid(openid, familyId)
    if (!member || !await isAdmin(member)) {
      return { code: -1, msg: '无权限' }
    }

    if (member._id === memberId) {
      return { code: -2, msg: '不能移除自己' }
    }

    const upd = await db.collection('familyMembers')
      .where({ _id: memberId, familyId: member.familyId })
      .update({ data: { status: 'removed' } })
    if (!upd.stats || upd.stats.updated === 0) {
      return { code: -3, msg: '目标成员不存在或不属于本家庭' }
    }

    return { code: 0 }
  } catch (err) {
    return { code: -2, msg: '移除成员失败: ' + err.message }
  }
}

async function disableMember(openid, { familyId, memberId }) {
  try {
    const member = await getMemberByOpenid(openid, familyId)
    if (!member || !await isAdmin(member)) {
      return { code: -1, msg: '无权限' }
    }

    if (member._id === memberId) {
      return { code: -2, msg: '不能禁用自己' }
    }

    const upd = await db.collection('familyMembers')
      .where({ _id: memberId, familyId: member.familyId })
      .update({ data: { status: 'disabled' } })
    if (!upd.stats || upd.stats.updated === 0) {
      return { code: -3, msg: '目标成员不存在或不属于本家庭' }
    }

    return { code: 0 }
  } catch (err) {
    return { code: -2, msg: '禁用成员失败: ' + err.message }
  }
}

async function enableMember(openid, { familyId, memberId }) {
  try {
    const member = await getMemberByOpenid(openid, familyId)
    if (!member || !await isAdmin(member)) {
      return { code: -1, msg: '无权限' }
    }

    const upd = await db.collection('familyMembers')
      .where({ _id: memberId, familyId: member.familyId })
      .update({ data: { status: 'active' } })
    if (!upd.stats || upd.stats.updated === 0) {
      return { code: -3, msg: '目标成员不存在或不属于本家庭' }
    }

    return { code: 0 }
  } catch (err) {
    return { code: -2, msg: '启用成员失败: ' + err.message }
  }
}

async function updateProfile(openid, { familyId, nickname, avatar }) {
  try {
    const member = await getMemberByOpenid(openid, familyId)
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
  } catch (err) {
    return { code: -2, msg: '更新个人资料失败: ' + err.message }
  }
}

async function updateAvatar(openid, { familyId, avatar }) {
  try {
    const member = await getMemberByOpenid(openid, familyId)
    if (!member) {
      return { code: -1, msg: '未加入家庭' }
    }

    await db.collection('familyMembers').doc(member._id).update({
      data: { avatar }
    })

    return { code: 0 }
  } catch (err) {
    return { code: -2, msg: '更新头像失败: ' + err.message }
  }
}

async function updateChildAvatar(openid, { familyId, childId, avatar }) {
  try {
    const member = await getMemberByOpenid(openid, familyId)
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
  } catch (err) {
    return { code: -2, msg: '更新孩子头像失败: ' + err.message }
  }
}

async function saveCurrentChild(openid, { familyId, childId }) {
  try {
    const member = await getMemberByOpenid(openid, familyId)
    if (!member) {
      return { code: -1, msg: '未加入家庭' }
    }

    await db.collection('familyMembers').doc(member._id).update({
      data: { currentChildId: childId }
    })

    return { code: 0 }
  } catch (err) {
    return { code: -2, msg: '保存当前孩子失败: ' + err.message }
  }
}

async function leaveFamily(openid, familyId) {
  try {
    const member = await getMemberByOpenid(openid, familyId)
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
  } catch (err) {
    return { code: -2, msg: '退出家庭失败: ' + err.message }
  }
}
