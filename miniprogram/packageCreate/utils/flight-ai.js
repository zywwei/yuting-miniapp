/**
 * 飞行棋AI策略模块
 * 简单/中等/困难三套策略
 */

var engine = require('./flight-engine.js')

// AI选择飞机
function selectPlane(gameState, playerIndex, diceValue) {
  var player = gameState.players[playerIndex]
  var movablePlanes = engine.getMovablePlanes(player, diceValue)
  
  if (movablePlanes.length === 0) {
    return -1
  }
  
  switch (gameState.difficulty) {
    case 'easy':
      return aiEasy(movablePlanes)
    case 'medium':
      return aiMedium(gameState, playerIndex, movablePlanes, diceValue)
    case 'hard':
      return aiHard(gameState, playerIndex, movablePlanes, diceValue)
    default:
      return aiEasy(movablePlanes)
  }
}

// 简单AI：随机选择
function aiEasy(movablePlanes) {
  return movablePlanes[Math.floor(Math.random() * movablePlanes.length)]
}

// 中等AI：贪心策略
function aiMedium(gameState, playerIndex, movablePlanes, diceValue) {
  var player = gameState.players[playerIndex]
  var bestPlane = movablePlanes[0]
  var bestScore = -Infinity
  
  movablePlanes.forEach(function(planeIndex) {
    var plane = player.planes[planeIndex]
    var score = evaluateMove(gameState, playerIndex, plane, diceValue)
    
    if (score > bestScore) {
      bestScore = score
      bestPlane = planeIndex
    }
  })
  
  return bestPlane
}

// 困难AI：最优策略
function aiHard(gameState, playerIndex, movablePlanes, diceValue) {
  var player = gameState.players[playerIndex]
  var bestPlane = movablePlanes[0]
  var bestScore = -Infinity
  
  movablePlanes.forEach(function(planeIndex) {
    var plane = player.planes[planeIndex]
    var score = evaluateMoveAdvanced(gameState, playerIndex, plane, diceValue)
    
    if (score > bestScore) {
      bestScore = score
      bestPlane = planeIndex
    }
  })
  
  return bestPlane
}

// 评估移动分数（中等AI）
function evaluateMove(gameState, playerIndex, plane, diceValue) {
  var score = 0
  var player = gameState.players[playerIndex]
  var newPos = engine.calcNewPosition(plane, diceValue, player.color)
  
  if (newPos === null) {
    return -1000
  }
  
  // 起飞加分
  if (plane.status === 'hangar') {
    score += 80
    return score
  }
  
  // 前进得分
  if (newPos >= 52) {
    // 进入终点跑道
    score += 100 + (newPos - 52) * 20
  } else {
    score += newPos * 2
  }
  
  // 撞机高分
  if (newPos < 52) {
    for (var i = 0; i < gameState.players.length; i++) {
      if (i === playerIndex) continue
      for (var j = 0; j < gameState.players[i].planes.length; j++) {
        if (gameState.players[i].planes[j].position === newPos) {
          score += 150
          break
        }
      }
    }
  }
  
  // 特殊格子加分
  if (newPos < 52 && gameState.specialCells[newPos]) {
    var cellType = gameState.specialCells[newPos].type
    switch (cellType) {
      case 'jump':
      case 'speed':
      case 'shield':
      case 'item':
        score += 30
        break
      case 'back':
      case 'slow':
      case 'stop':
        score -= 20
        break
    }
  }
  
  return score
}

// 评估移动分数（困难AI）
function evaluateMoveAdvanced(gameState, playerIndex, plane, diceValue) {
  var score = 0
  var player = gameState.players[playerIndex]
  var newPos = engine.calcNewPosition(plane, diceValue, player.color)
  
  if (newPos === null) {
    return -1000
  }
  
  // 起飞加分
  if (plane.status === 'hangar') {
    score += 120
    // 检查起点是否安全
    var startPos = newPos
    var isSafe = true
    for (var i = 0; i < gameState.players.length; i++) {
      if (i === playerIndex) continue
      for (var j = 0; j < gameState.players[i].planes.length; j++) {
        var enemyPlane = gameState.players[i].planes[j]
        if (enemyPlane.status === 'runway' && Math.abs(enemyPlane.position - startPos) <= 6) {
          isSafe = false
          break
        }
      }
    }
    if (isSafe) {
      score += 50
    }
    return score
  }
  
  // 前进得分
  if (newPos >= 52) {
    // 进入终点跑道
    score += 200 + (newPos - 52) * 30
  } else {
    score += newPos * 3
  }
  
  // 撞机高分
  if (newPos < 52) {
    for (var i = 0; i < gameState.players.length; i++) {
      if (i === playerIndex) continue
      for (var j = 0; j < gameState.players[i].planes.length; j++) {
        if (gameState.players[i].planes[j].position === newPos) {
          // 检查目标是否有护盾
          if (!gameState.players[i].planes[j].hasShield) {
            score += 200
          }
          break
        }
      }
    }
  }
  
  // 危险位置扣分
  if (newPos < 52) {
    for (var i = 0; i < gameState.players.length; i++) {
      if (i === playerIndex) continue
      for (var j = 0; j < gameState.players[i].planes.length; j++) {
        var enemyPlane = gameState.players[i].planes[j]
        if (enemyPlane.status === 'runway' && !plane.hasShield) {
          var enemyNewPos = enemyPlane.position + 6
          if (enemyNewPos >= 52) enemyNewPos -= 52
          if (enemyNewPos === newPos) {
            score -= 100
          }
        }
      }
    }
  }
  
  // 安全位置加分
  if (newPos < 52 && plane.hasShield) {
    score += 20
  }
  
  // 特殊格子评估
  if (newPos < 52 && gameState.specialCells[newPos]) {
    var cellType = gameState.specialCells[newPos].type
    switch (cellType) {
      case 'jump':
      case 'speed':
      case 'shield':
      case 'item':
        score += 50
        break
      case 'back':
      case 'slow':
      case 'stop':
        score -= 40
        break
      case 'teleport':
        score += 10
        break
    }
  }
  
  // 终点附近更积极
  if (newPos >= 45 && newPos < 52) {
    score += 30
  }
  
  return score
}

// AI决定是否使用道具
function decideUseItem(gameState, playerIndex) {
  // 简单AI：随机使用
  if (gameState.difficulty === 'easy') {
    return Math.random() < 0.3
  }
  
  // 中等AI：落后时使用
  if (gameState.difficulty === 'medium') {
    var player = gameState.players[playerIndex]
    var finishedCount = 0
    for (var i = 0; i < player.planes.length; i++) {
      if (player.planes[i].status === 'home') {
        finishedCount++
      }
    }
    return finishedCount < 2
  }
  
  // 困难AI：策略性使用
  return true
}

module.exports = {
  selectPlane: selectPlane,
  decideUseItem: decideUseItem
}
