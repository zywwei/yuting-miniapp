/**
 * 飞行棋游戏核心引擎
 * 棋盘逻辑、规则判定、移动计算
 */

var board = require('./flight-board.js')

var COLORS = ['red', 'yellow', 'blue', 'green']
var COLOR_NAMES = {
  red: '红方',
  yellow: '黄方',
  blue: '蓝方',
  green: '绿方'
}
var COLOR_EMOJIS = {
  red: '🔴',
  yellow: '🟡',
  blue: '🔵',
  green: '🟢'
}

// 初始化游戏状态
function initGameState(playerCount, difficulty) {
  var players = []
  for (var i = 0; i < 4; i++) {
    var isAI = i >= playerCount
    players.push({
      index: i,
      color: COLORS[i],
      name: isAI ? 'AI-' + COLOR_NAMES[COLORS[i]] : COLOR_NAMES[COLORS[i]],
      isAI: isAI,
      planes: [],
      isFinished: false
    })
    
    // 初始化4架飞机
    for (var j = 0; j < 4; j++) {
      players[i].planes.push({
        id: j,
        color: COLORS[i],
        status: 'hangar', // hangar, runway, home
        position: -1,
        hasShield: false,
        speedBoost: 0
      })
    }
  }
  
  // 获取特殊格子
  var specialCells = board.getSpecialCells(difficulty)
  var specialCellsMap = {}
  specialCells.forEach(function(cell) {
    specialCellsMap[cell.index] = cell
  })
  
  return {
    players: players,
    currentPlayer: 0,
    diceValue: 0,
    isRolling: false,
    isAnimating: false,
    phase: 'playing',
    difficulty: difficulty || 'medium',
    specialCells: specialCellsMap,
    roundCount: 0,
    rankings: [],
    lastAction: ''
  }
}

// 掷骰子
function rollDice() {
  return Math.floor(Math.random() * 6) + 1
}

// 获取可移动的飞机
function getMovablePlanes(player, diceValue) {
  var movable = []
  
  // 玩家被冰冻时不能移动
  if (player.isFrozen) {
    return movable
  }
  
  player.planes.forEach(function(plane, index) {
    // 停机坪中的飞机需要掷出5或6才能起飞
    if (plane.status === 'hangar') {
      if (diceValue >= 5) {
        movable.push(index)
      }
      return
    }
    
    // 已到达终点的飞机不能移动
    if (plane.status === 'home') {
      return
    }
    
    // 计算新位置
    var newPos = calcNewPosition(plane, diceValue, player.color)
    if (newPos !== null) {
      movable.push(index)
    }
  })
  
  return movable
}

// 计算新位置
function calcNewPosition(plane, diceValue, color) {
  var actualDice = diceValue + (plane.speedBoost || 0)
  
  // 停机坪起飞
  if (plane.status === 'hangar') {
    if (actualDice >= 5) {
      return board.START_POSITIONS[color]
    }
    return null
  }
  
  var currentPos = plane.position
  var startPos = board.START_POSITIONS[color]
  
  // 在终点跑道上
  if (currentPos >= 52 && currentPos <= 55) {
    var homeIndex = currentPos - 52
    var newHomeIndex = homeIndex + actualDice
    
    if (newHomeIndex === 4) {
      return 56 // 精确到达终点
    } else if (newHomeIndex > 4) {
      // 超过终点，需要回退（限制在终点跑道范围内）
      var backSteps = newHomeIndex - 4
      var finalHomeIndex = Math.max(0, 4 - backSteps)
      return 52 + finalHomeIndex
    } else {
      return 52 + newHomeIndex
    }
  }
  
  // 在主赛道上
  var newPos = currentPos + actualDice
  
  // 计算到自己起点的距离
  var distToStart
  if (color === 'red') {
    // 红色起点是0，需要特殊处理
    distToStart = (52 - currentPos) % 52
  } else {
    distToStart = (startPos - currentPos + 52) % 52
  }
  
  // 判断是否经过或到达自己起点
  if (actualDice >= distToStart) {
    // 进入终点跑道
    var stepsIntoHome = actualDice - distToStart
    
    if (stepsIntoHome === 4) {
      return 56 // 精确到达终点
    } else if (stepsIntoHome > 4) {
      // 超过终点，需要回退（限制在终点跑道范围内）
      var backSteps2 = stepsIntoHome - 4
      var finalHomeIndex2 = Math.max(0, 4 - backSteps2)
      return 52 + finalHomeIndex2
    } else {
      return 52 + stepsIntoHome
    }
  }
  
  // 循环赛道
  if (newPos >= 52) {
    newPos -= 52
  }
  
  return newPos
}

// 执行移动
function executeMove(state, playerIndex, planeIndex, diceValue) {
  var player = state.players[playerIndex]
  var plane = player.planes[planeIndex]
  var events = []
  
  // 计算实际骰子值（包含加速/减速效果）
  var actualDice = diceValue + (plane.speedBoost || 0)
  
  // 起飞
  if (plane.status === 'hangar') {
    plane.status = 'runway'
    plane.position = board.START_POSITIONS[player.color]
    events.push({
      type: 'takeoff',
      playerIndex: playerIndex,
      planeIndex: planeIndex,
      position: plane.position
    })
  } else {
    // 移动
    var newPos = calcNewPosition(plane, diceValue, player.color)
    
    if (newPos === 56) {
      // 到达终点
      plane.status = 'home'
      plane.position = 56
      events.push({
        type: 'land',
        playerIndex: playerIndex,
        planeIndex: planeIndex,
        position: 56
      })
    } else {
      var oldPos = plane.position
      plane.position = newPos
      events.push({
        type: 'move',
        playerIndex: playerIndex,
        planeIndex: planeIndex,
        fromPosition: oldPos,
        toPosition: newPos
      })
    }
  }
  
  // 移动完成后重置加速/减速效果
  plane.speedBoost = 0
  
  // 检查撞机
  if (plane.status === 'runway' && plane.position < 52) {
    var knockResult = checkKnock(state, playerIndex, plane.position)
    if (knockResult.knocked) {
      events.push({
        type: 'knock',
        playerIndex: knockResult.knockedPlayerIndex,
        planeIndex: knockResult.knockedPlaneIndex,
        position: plane.position
      })
    }
  }
  
  // 检查特殊格子
  if (plane.status === 'runway' && plane.position < 52) {
    var specialCell = state.specialCells[plane.position]
    if (specialCell) {
      events.push({
        type: 'special',
        cellType: specialCell.type,
        playerIndex: playerIndex,
        planeIndex: planeIndex,
        position: plane.position,
        icon: specialCell.icon,
        desc: specialCell.desc
      })
    }
  }
  
  // 检查玩家是否完成
  checkPlayerFinished(state, playerIndex)
  
  // 检查游戏结束
  checkGameEnd(state)
  
  return events
}

// 检查撞机
function checkKnock(state, playerIndex, position) {
  for (var i = 0; i < state.players.length; i++) {
    if (i === playerIndex) continue
    
    var player = state.players[i]
    for (var j = 0; j < player.planes.length; j++) {
      var plane = player.planes[j]
      if (plane.status === 'runway' && plane.position === position) {
        // 检查是否有护盾
        if (plane.hasShield) {
          plane.hasShield = false
          return { knocked: false }
        }
        
        // 被撞回停机坪
        plane.status = 'hangar'
        plane.position = -1
        return {
          knocked: true,
          knockedPlayerIndex: i,
          knockedPlaneIndex: j
        }
      }
    }
  }
  
  return { knocked: false }
}

// 检查玩家是否完成
function checkPlayerFinished(state, playerIndex) {
  var player = state.players[playerIndex]
  var allHome = true
  
  for (var i = 0; i < player.planes.length; i++) {
    if (player.planes[i].status !== 'home') {
      allHome = false
      break
    }
  }
  
  if (allHome && !player.isFinished) {
    player.isFinished = true
    state.rankings.push(playerIndex)
  }
}

// 检查游戏结束
function checkGameEnd(state) {
  var finishedCount = 0
  for (var i = 0; i < state.players.length; i++) {
    if (state.players[i].isFinished) {
      finishedCount++
    }
  }
  
  // 只剩一个玩家未完成时游戏结束
  if (finishedCount >= state.players.length - 1) {
    // 将最后一个未完成的玩家加入排名
    for (var j = 0; j < state.players.length; j++) {
      if (!state.players[j].isFinished) {
        state.rankings.push(j)
        state.players[j].isFinished = true
      }
    }
    state.phase = 'result'
  }
}

// 切换到下一个玩家
function nextPlayer(state) {
  var nextIndex = (state.currentPlayer + 1) % 4
  var tried = 0
  
  // 跳过已完成或被冰冻的玩家
  while (tried < 4) {
    if (!state.players[nextIndex].isFinished) {
      if (state.players[nextIndex].isFrozen) {
        // 解冻该玩家，跳过本回合
        state.players[nextIndex].isFrozen = false
      } else {
        break // 找到可行动的玩家
      }
    }
    nextIndex = (nextIndex + 1) % 4
    tried++
  }
  
  // 只有当回到玩家0时才增加回合数（一轮结束）
  if (nextIndex <= state.currentPlayer) {
    state.roundCount++
  }
  
  state.currentPlayer = nextIndex
  
  return nextIndex
}

// 应用特殊格子效果
function applySpecialCellEffect(state, playerIndex, planeIndex, cellType) {
  var player = state.players[playerIndex]
  var plane = player.planes[planeIndex]
  
  switch (cellType) {
    case 'jump':
      // 前进4步
      var newPos = calcNewPosition(plane, 4, player.color)
      if (newPos !== null && newPos < 56) {
        plane.position = newPos
      }
      break
      
    case 'back':
      // 后退3步
      if (plane.position >= 52) {
        // 在终点跑道上，只在终点跑道内后退
        var homeIndex = plane.position - 52
        var newHomeIndex = Math.max(0, homeIndex - 3)
        plane.position = 52 + newHomeIndex
      } else {
        // 在主赛道上后退
        var newPos2 = plane.position - 3
        if (newPos2 < 0) {
          newPos2 += 52
        }
        plane.position = newPos2
      }
      break
      
    case 'speed':
      // 下次掷骰+2
      plane.speedBoost = 2
      break
      
    case 'slow':
      // 下次掷骰-1
      plane.speedBoost = -1
      break
      
    case 'stop':
      // 停一回合（标记玩家为冰冻）
      player.isFrozen = true
      break
      
    case 'shield':
      // 获得护盾
      plane.hasShield = true
      break
      
    case 'teleport':
      // 传送到随机安全位置
      var safePos = findSafePosition(state, playerIndex)
      if (safePos !== null) {
        plane.position = safePos
      }
      break
      
    case 'item':
      // 获得道具（返回事件，由页面处理）
      break
  }
}

// 寻找安全位置
function findSafePosition(state, playerIndex) {
  var startPos = board.START_POSITIONS[state.players[playerIndex].color]
  
  // 从起点开始寻找没有飞机的位置
  for (var i = 0; i < 52; i++) {
    var pos = (startPos + i) % 52
    var hasPlane = false
    
    for (var j = 0; j < state.players.length; j++) {
      for (var k = 0; k < state.players[j].planes.length; k++) {
        if (state.players[j].planes[k].position === pos) {
          hasPlane = true
          break
        }
      }
      if (hasPlane) break
    }
    
    if (!hasPlane) {
      return pos
    }
  }
  
  return startPos
}

// 获取玩家排名
function getRankings(state) {
  return state.rankings.map(function(playerIndex) {
    return {
      index: playerIndex,
      color: state.players[playerIndex].color,
      name: state.players[playerIndex].name,
      isAI: state.players[playerIndex].isAI
    }
  })
}

// 检查是否可以再掷一次
function canRollAgain(diceValue) {
  return diceValue === 6
}

module.exports = {
  COLORS: COLORS,
  COLOR_NAMES: COLOR_NAMES,
  COLOR_EMOJIS: COLOR_EMOJIS,
  initGameState: initGameState,
  rollDice: rollDice,
  getMovablePlanes: getMovablePlanes,
  calcNewPosition: calcNewPosition,
  executeMove: executeMove,
  checkKnock: checkKnock,
  applySpecialCellEffect: applySpecialCellEffect,
  nextPlayer: nextPlayer,
  getRankings: getRankings,
  canRollAgain: canRollAgain,
  findSafePosition: findSafePosition,
  checkPlayerFinished: checkPlayerFinished,
  checkGameEnd: checkGameEnd
}
