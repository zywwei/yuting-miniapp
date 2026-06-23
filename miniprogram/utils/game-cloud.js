/**
 * 游戏数据云端同步
 * 只记录基础记录（游戏时间、胜负结果、参与人员）
 * 详细统计在本地计算
 */

var auth = require('./auth.js')
var childStorage = require('./child-storage.js')
var syncQueue = require('./sync-queue.js')

var isCloudReady = function() {
  try {
    return typeof wx.cloud !== 'undefined' && wx.cloud
  } catch (e) {
    return false
  }
}

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
  var cloudRecord = {
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
    createdByName: meta.createdByName
  }

  // 写本地（完整记录）
  var storageKey = record.gameType === 'rps' ? 'rpsRecords' : 'diceRecords'
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
      syncQueue.dequeue(record.id)
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
  var storageKey = gameType === 'rps' ? 'rpsRecords' : 'diceRecords'
  var localRecords = childStorage.get(storageKey) || []

  if (!isCloudReady()) return Promise.resolve(localRecords)

  return new Promise(function(resolve) {
    wx.cloud.callFunction({
      name: 'record',
      data: {
        action: 'list',
        collection: 'gameRecords',
        childId: auth.getCurrentChildId(),
        gameType: gameType,
        page: 1,
        pageSize: 200
      }
    }).then(function(res) {
      if (res.result && res.result.code === 0) {
        var cloudList = res.result.data.list || []

        // 合并云端与本地数据（以 id 去重）
        var mergedMap = {}
        localRecords.forEach(function(r) {
          if (r && r.id) mergedMap[r.id] = r
        })
        cloudList.forEach(function(r) {
          if (r && r.id && !mergedMap[r.id]) mergedMap[r.id] = r
        })
        var merged = []
        for (var key in mergedMap) {
          merged.push(mergedMap[key])
        }

        // 按创建时间倒序排序
        merged.sort(function(a, b) {
          return new Date(b.createTime || 0) - new Date(a.createTime || 0)
        })

        // 用合并结果更新本地缓存
        childStorage.set(storageKey, merged)

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

// 更新本地统计
function updateLocalStats(gameType, record) {
  var statsKey = gameType === 'rps' ? 'rpsStats' : 'diceStats'
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
  updateLocalStats: updateLocalStats
}
