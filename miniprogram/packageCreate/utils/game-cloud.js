/**
 * 游戏数据云端同步
 * 只记录基础记录（游戏时间、胜负结果、参与人员）
 * 详细统计在本地计算
 */

var auth = getApp().globalData.auth
var childStorage = getApp().globalData.childStorage
var syncQueue = getApp().globalData.syncQueue

function getStorageKey(gameType) {
  var map = { rps: 'rpsRecords', dice: 'diceRecords', tetris: 'tetrisRecords' }
  return map[gameType] || 'rpsRecords'
}

function getStatsKey(gameType) {
  var map = { rps: 'rpsStats', dice: 'diceStats', tetris: 'tetrisStats' }
  return map[gameType] || 'rpsStats'
}

var isCloudReady = function() {
  try {
    return typeof wx.cloud !== 'undefined' && wx.cloud
  } catch (e) {
    return false
  }
}

// 复用 cloud.js 的墓碑清理能力（游戏记录删除标记）
var cloud = getApp().globalData.cloud

function getRecordMeta() {
  var member = auth.getMember()
  var childId = auth.getCurrentChildId()
  return {
    familyId: member ? member.familyId : '',
    childId: childId,
    createdBy: member ? member._id : '',
    createdByName: member ? member.roleName : ''
  }
}

// 上传游戏记录（只上传基础数据）
function uploadGameRecord(record) {
  var meta = getRecordMeta()
  // cloudRecord 必须包含 id，否则 fetch 时无法与本地记录按 id 去重合并
  var cloudRecord = {
    id: record.id,
    gameType: record.gameType,
    mode: record.mode,
    playMode: record.playMode,
    result: record.result,
    score: record.score,
    duration: record.duration,
    participants: record.participants,
    createTime: record.createTime,
    familyId: meta.familyId,
    childId: meta.childId,
    createdBy: meta.createdBy,
    createdByName: meta.createdByName,
    synced: true  // 标记为已同步
  }

  // 写本地（完整记录，保留客户端完整字段）
  var storageKey = getStorageKey(record.gameType)
  var localRecords = childStorage.get(storageKey) || []
  localRecords.unshift(record)
  childStorage.set(storageKey, localRecords)

  // 同步云端
  if (!isCloudReady()) return Promise.resolve()

  return new Promise(function(resolve, reject) {
    syncQueue.enqueue({
      id: record.id,
      action: 'add',
      collection: 'gameRecords',
      data: cloudRecord
    })

    wx.cloud.callFunction({
      name: 'record',
      data: { action: 'add', collection: 'gameRecords', data: cloudRecord }
    }).then(function() {
      syncQueue.dequeue(record.id, 'add')
      resolve()
    }).catch(function(err) {
      console.warn('游戏记录同步失败:', err)
      // 同步失败时提示用户
      wx.showToast({
        title: '数据同步中，请稍后',
        icon: 'none',
        duration: 2000
      })
      resolve()  // 仍然resolve，因为已入队等待重试
    })
  })
}

// 获取游戏记录
function fetchGameRecords(gameType) {
  var storageKey = getStorageKey(gameType)
  var localRecords = childStorage.get(storageKey) || []

  if (!isCloudReady()) return Promise.resolve(localRecords)

  return new Promise(function(resolve) {
    wx.cloud.callFunction({
      name: 'record',
      data: {
        action: 'list',
        collection: 'gameRecords',
        childId: auth.getCurrentChildId(),
        page: 1,
        pageSize: 200
      }
    }).then(function(res) {
      if (res.result && res.result.code === 0) {
        var cloudList = res.result.data.list || []

        // 本地过滤 gameType
        cloudList = cloudList.filter(function(r) {
          return r && r.gameType === gameType
        })

        // 获取已删除记录的墓碑清单
        var deletedIds = getDeletedGameRecordIds(gameType)
        var deletedSet = {}
        deletedIds.forEach(function(id) { deletedSet[id] = true })

        // 合并策略：
        // 1. 云端有的数据 → 使用云端数据（排除已删除的）
        // 2. 本地独有且未同步的 → 保留（新添加未同步）
        // 3. 本地独有且已同步但云端缺失 → 保留并触发补传（自愈）
        var mergedMap = {}
        var merged = []
        var mergedIds = {}

        // 先放入云端数据
        cloudList.forEach(function(r) {
          if (r && r.id && !deletedSet[r.id]) {
            mergedMap[r.id] = r
            merged.push(r)
            mergedIds[r.id] = true
          }
        })

        // 再合并本地独有数据
        localRecords.forEach(function(r) {
          if (r && r.id && !mergedIds[r.id] && !deletedSet[r.id]) {
            mergedMap[r.id] = r
            merged.push(r)
            mergedIds[r.id] = true
          }
        })

        // 按创建时间倒序排序
        merged.sort(function(a, b) {
          return new Date(b.createTime || 0) - new Date(a.createTime || 0)
        })

        // 用合并结果更新本地缓存
        childStorage.set(storageKey, merged)

        // 云端仍存在但本地已删除的记录，再次尝试删除
        cloudList.forEach(function(r) {
          if (r && r.id && deletedSet[r.id]) {
            wx.cloud.callFunction({
              name: 'record',
              data: { action: 'remove', collection: 'gameRecords', id: r.id }
            }).catch(function() {})
          }
        })

        resolve(merged)
      } else {
        resolve(localRecords)
      }
    }).catch(function(err) {
      console.warn('游戏记录云端读取失败:', err)
      resolve(localRecords)
    })
  })
}

// ===== 游戏记录墓碑（删除标记，按孩子隔离）=====
var DELETED_GAME_RECORDS_KEY = 'deletedGameRecordIds'

function getDeletedGameRecordIds() {
  // 复用 cloud.js 导出的墓碑清理能力
  return cloud.getDeletedIdsByKey(DELETED_GAME_RECORDS_KEY)
}

function addDeletedGameRecordId(id) {
  cloud.addDeletedIdByKey(DELETED_GAME_RECORDS_KEY, id)
}

// 删除游戏记录（本地 + 云端 + 墓碑）
function removeGameRecord(gameType, id) {
  var storageKey = getStorageKey(gameType)

  // 记录墓碑，防止 fetch 时把已删除记录拉回来
  addDeletedGameRecordId(id)

  // 从本地缓存删除
  childStorage.set(storageKey, (childStorage.get(storageKey) || []).filter(function(r) { return r.id !== id }))

  // 尝试删除云端记录
  if (!isCloudReady()) return Promise.resolve(false)
  return wx.cloud.callFunction({
    name: 'record',
    data: { action: 'remove', collection: 'gameRecords', id: id }
  }).then(function(res) {
    if (res.result && res.result.code === 0) {
      cloud.removeTombstoneByKey(DELETED_GAME_RECORDS_KEY, id)
      return true
    }
    return false
  }).catch(function(err) {
    console.warn('游戏记录云端删除失败:', err)
    return false
  })
}

// 更新本地统计
function updateLocalStats(gameType, record) {
  var statsKey = getStatsKey(gameType)
  var stats = childStorage.get(statsKey) || {
    totalGames: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    currentStreak: 0,
    bestStreak: 0,
    bestScore: '',
    totalDuration: 0,
    modeStats: {},
    opponentStats: {},
    lastPlayed: ''
  }

  stats.totalGames++
  stats.totalDuration += record.duration || 0
  stats.lastPlayed = record.createTime

  // 俄罗斯方块使用独立的统计逻辑
  if (gameType === 'tetris') {
    stats.totalScore = (stats.totalScore || 0) + (record.score || 0)
    stats.totalLines = (stats.totalLines || 0) + (record.lines || 0)
    if ((record.score || 0) > (stats.bestScore || 0)) stats.bestScore = record.score
    if ((record.level || 0) > (stats.bestLevel || 0)) stats.bestLevel = record.level
    stats.tetrisCount = (stats.tetrisCount || 0) + (record.tetrisCount || 0)
    if (!stats.modeStats[record.mode]) {
      stats.modeStats[record.mode] = { games: 0, bestScore: 0, bestLines: 0 }
    }
    stats.modeStats[record.mode].games++
    if ((record.score || 0) > (stats.modeStats[record.mode].bestScore || 0)) {
      stats.modeStats[record.mode].bestScore = record.score
    }
    if ((record.lines || 0) > (stats.modeStats[record.mode].bestLines || 0)) {
      stats.modeStats[record.mode].bestLines = record.lines
    }
    childStorage.set(statsKey, stats)
    return stats
  }

  if (record.result === 'win') {
    stats.wins++
    stats.currentStreak++
    if (stats.currentStreak > stats.bestStreak) {
      stats.bestStreak = stats.currentStreak
    }
  } else if (record.result === 'lose') {
    stats.losses++
    stats.currentStreak = 0
  } else {
    stats.draws++
  }

  // 更新模式统计
  if (!stats.modeStats[record.mode]) {
    stats.modeStats[record.mode] = { games: 0, wins: 0, losses: 0, draws: 0 }
  }
  stats.modeStats[record.mode].games++
  if (record.result === 'win') stats.modeStats[record.mode].wins++
  else if (record.result === 'lose') stats.modeStats[record.mode].losses++
  else stats.modeStats[record.mode].draws++

  // 更新对手统计
  var opponentType = record.playMode || 'ai'
  if (!stats.opponentStats[opponentType]) {
    stats.opponentStats[opponentType] = { games: 0, wins: 0, losses: 0, draws: 0 }
  }
  stats.opponentStats[opponentType].games++
  if (record.result === 'win') stats.opponentStats[opponentType].wins++
  else if (record.result === 'lose') stats.opponentStats[opponentType].losses++
  else stats.opponentStats[opponentType].draws++

  childStorage.set(statsKey, stats)
  return stats
}

module.exports = {
  uploadGameRecord: uploadGameRecord,
  fetchGameRecords: fetchGameRecords,
  removeGameRecord: removeGameRecord,
  updateLocalStats: updateLocalStats
}
