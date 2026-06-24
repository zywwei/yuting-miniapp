var engine = require('../../../../utils/flight-engine.js')
var board = require('../../../../utils/flight-board.js')
var ai = require('../../../../utils/flight-ai.js')
var beep = require('../../../../utils/beep.js')
var achievements = require('../../../../utils/achievements.js')
var childStorage = require('../../../../utils/child-storage.js')
var gameEconomy = require('../../../../utils/game-economy.js')
var items = require('../../../../utils/flight-items.js')

Page({
  data: {
    phase: 'select',
    playMode: '',
    difficulty: 'medium',
    aiCount: 1,
    playerColor: 'red',
    soundEnabled: true,
    
    gameState: null,
    mainTrack: [],
    homeStretchCells: [],
    hangarCells: [],
    playersInfo: [],
    currentPlayer: 0,
    diceValue: 1,
    isRolling: false,
    isAnimating: false,
    showDice: false,
    showRollButton: false,
    showRollAgain: false,
    showPlaneSelector: false,
    movablePlanes: [],
    turnHint: '',
    roundCount: 0,
    
    // 道具系统
    playerItems: [],
    showItemPanel: false,
    showItemShop: false,
    itemList: [],
    playerCoins: 0,
    selectedItem: null,
    showDiceChooser: false,
    showTargetSelector: false,
    targetPlanes: [],
    
    gameResult: '',
    rankings: [],
    stats: { rounds: 0, duration: '0:00', planesKnocked: 0 },
    showConfetti: false,
    confettiList: []
  },

  onLoad: function() {
    this.gameStartTime = 0
    this.soundEnabled = true
    this.itemsUsedCount = 0
    this.planesKnockedCount = 0
  },

  goBack: function() {
    wx.navigateBack()
  },

  selectMode: function(e) {
    var mode = e.currentTarget.dataset.mode
    this.setData({ playMode: mode })
  },

  goToConfig: function() {
    if (!this.data.playMode) return
    this.setData({ phase: 'config' })
  },

  goBackToSelect: function() {
    this.setData({ phase: 'select' })
  },

  selectDifficulty: function(e) {
    var diff = e.currentTarget.dataset.diff
    this.setData({ difficulty: diff })
  },

  selectAICount: function(e) {
    var count = parseInt(e.currentTarget.dataset.count)
    this.setData({ aiCount: count })
  },

  selectColor: function(e) {
    var color = e.currentTarget.dataset.color
    this.setData({ playerColor: color })
  },

  // 道具系统
  showShop: function() {
    var playerCoins = gameEconomy.getCoins()
    var itemList = items.getItemList().map(function(item) {
      return {
        id: item.id,
        name: item.name,
        icon: item.icon,
        desc: item.desc,
        price: item.price,
        canBuy: playerCoins >= item.price
      }
    })
    
    this.setData({
      showItemShop: true,
      itemList: itemList,
      playerCoins: playerCoins
    })
  },

  hideShop: function() {
    this.setData({ showItemShop: false })
  },

  buyItem: function(e) {
    var itemId = e.currentTarget.dataset.id
    var item = items.getItem(itemId)
    if (!item) return
    
    var playerItems = this.data.playerItems
    if (playerItems.length >= 3) {
      wx.showToast({ title: '最多携带3个道具', icon: 'none' })
      return
    }
    
    if (!gameEconomy.spendCoins(item.price, '飞行棋购买道具: ' + item.name)) {
      wx.showToast({ title: '金币不足', icon: 'none' })
      return
    }
    
    playerItems.push(itemId)
    
    if (this.soundEnabled) {
      beep.playBeep('itemUse')
    }
    
    this.setData({
      playerItems: playerItems,
      playerCoins: gameEconomy.getCoins()
    })
    
    wx.showToast({ title: '购买成功', icon: 'success' })
  },

  toggleItemPanel: function() {
    this.setData({ showItemPanel: !this.data.showItemPanel })
  },

  useItem: function(e) {
    var itemId = e.currentTarget.dataset.id
    var item = items.getItem(itemId)
    if (!item) return
    
    var gameState = this.data.gameState
    var player = gameState.players[gameState.currentPlayer]
    
    // 检查是否是当前玩家的回合
    if (player.isAI) return
    
    // 根据道具类型执行不同操作
    switch (item.effect) {
      case 'choose_dice':
        this.useRemoteDice(itemId)
        break
      case 'speed_boost':
        this.useSpeedCard(itemId)
        break
      case 'teleport':
        this.useTeleport(itemId)
        break
      case 'shield':
        this.useShield(itemId)
        break
      case 'freeze':
        this.useFreeze(itemId)
        break
      case 'bomb':
        this.useBomb(itemId)
        break
    }
  },

  useRemoteDice: function(itemId) {
    this.setData({
      selectedItem: itemId,
      showDiceChooser: true,
      showItemPanel: false
    })
  },

  chooseDiceValue: function(e) {
    var value = parseInt(e.currentTarget.dataset.value)
    var itemId = this.data.selectedItem
    
    // 移除道具
    this.removeItem(itemId)
    
    // 设置骰子值
    this.setData({
      diceValue: value,
      showDiceChooser: false,
      selectedItem: null
    })
    
    if (this.soundEnabled) {
      beep.playBeep('itemUse')
    }
    
    // 盥后处理
    var that = this
    setTimeout(function() {
      that.afterRoll(value)
    }, 300)
  },

  useSpeedCard: function(itemId) {
    var gameState = this.data.gameState
    var player = gameState.players[gameState.currentPlayer]
    
    // 给所有飞机添加加速效果
    player.planes.forEach(function(plane) {
      if (plane.status === 'runway') {
        plane.speedBoost = 3
      }
    })
    
    this.removeItem(itemId)
    
    if (this.soundEnabled) {
      beep.playBeep('itemUse')
    }
    
    this.setData({
      turnHint: '加速卡已生效！+3步'
    })
  },

  useTeleport: function(itemId) {
    var gameState = this.data.gameState
    var player = gameState.players[gameState.currentPlayer]
    
    // 获取在跑道上的飞机
    var targetPlanes = []
    player.planes.forEach(function(plane, index) {
      if (plane.status === 'runway') {
        targetPlanes.push(index)
      }
    })
    
    if (targetPlanes.length === 0) {
      wx.showToast({ title: '没有可传送的飞机', icon: 'none' })
      return
    }
    
    this.setData({
      selectedItem: itemId,
      showTargetSelector: true,
      targetPlanes: targetPlanes,
      showItemPanel: false
    })
  },

  selectTeleportTarget: function(e) {
    var planeIndex = parseInt(e.currentTarget.dataset.index)
    var itemId = this.data.selectedItem
    var gameState = this.data.gameState
    var player = gameState.players[gameState.currentPlayer]
    var plane = player.planes[planeIndex]
    
    // 传送到安全位置
    var safePos = engine.findSafePosition(gameState, gameState.currentPlayer)
    if (safePos !== null) {
      plane.position = safePos
    }
    
    this.removeItem(itemId)
    
    if (this.soundEnabled) {
      beep.playBeep('itemUse')
    }
    
    this.setData({
      showTargetSelector: false,
      selectedItem: null,
      turnHint: '传送成功！'
    })
    
    this.refreshBoard()
  },

  useShield: function(itemId) {
    var gameState = this.data.gameState
    var player = gameState.players[gameState.currentPlayer]
    
    // 给所有飞机添加护盾
    player.planes.forEach(function(plane) {
      if (plane.status === 'runway') {
        plane.hasShield = true
      }
    })
    
    this.removeItem(itemId)
    
    if (this.soundEnabled) {
      beep.playBeep('itemUse')
    }
    
    this.setData({
      turnHint: '护盾已生效！'
    })
  },

  useFreeze: function(itemId) {
    var gameState = this.data.gameState
    
    // 获取对手
    var opponents = []
    gameState.players.forEach(function(player, index) {
      if (index !== gameState.currentPlayer && !player.isFinished) {
        opponents.push(index)
      }
    })
    
    if (opponents.length === 0) {
      wx.showToast({ title: '没有可冰冻的对手', icon: 'none' })
      return
    }
    
    // 随机冰冻一个对手
    var targetIndex = opponents[Math.floor(Math.random() * opponents.length)]
    gameState.players[targetIndex].isFrozen = true
    
    this.removeItem(itemId)
    
    if (this.soundEnabled) {
      beep.playBeep('itemUse')
    }
    
    this.setData({
      turnHint: '已冰冻 ' + gameState.players[targetIndex].name
    })
  },

  useBomb: function(itemId) {
    var gameState = this.data.gameState
    var player = gameState.players[gameState.currentPlayer]
    
    // 获取在终点前的飞机
    var targetPlanes = []
    player.planes.forEach(function(plane, index) {
      if (plane.status === 'runway' && plane.position >= 45 && plane.position < 52) {
        targetPlanes.push(index)
      }
    })
    
    if (targetPlanes.length === 0) {
      wx.showToast({ title: '没有可使用炸弹的飞机', icon: 'none' })
      return
    }
    
    // 炸毁目标格上所有敌方飞机
    var bombPosition = player.planes[targetPlanes[0]].position
    var knockedCount = 0
    
    gameState.players.forEach(function(p, pIndex) {
      if (pIndex === gameState.currentPlayer) return
      p.planes.forEach(function(plane) {
        if (plane.status === 'runway' && plane.position === bombPosition) {
          plane.status = 'hangar'
          plane.position = -1
          knockedCount++
        }
      })
    })
    
    this.removeItem(itemId)
    
    if (this.soundEnabled) {
      beep.playBeep('planeKnock')
    }
    
    this.setData({
      turnHint: '炸弹炸毁了 ' + knockedCount + ' 架飞机！'
    })
    
    this.refreshBoard()
  },

  removeItem: function(itemId) {
    var playerItems = this.data.playerItems
    var index = playerItems.indexOf(itemId)
    if (index >= 0) {
      playerItems.splice(index, 1)
      this.setData({ playerItems: playerItems })
      this.itemsUsedCount++
    }
  },

  cancelItem: function() {
    this.setData({
      showDiceChooser: false,
      showTargetSelector: false,
      selectedItem: null
    })
  },

  toggleSound: function() {
    this.soundEnabled = !this.soundEnabled
    this.setData({ soundEnabled: this.soundEnabled })
  },

  startGame: function() {
    var that = this
    var playerCount = this.data.playMode === 'ai' ? 1 : (1 + this.data.aiCount)
    var gameState = engine.initGameState(playerCount, this.data.difficulty)
    
    // 设置玩家颜色
    if (this.data.playMode === 'ai') {
      gameState.players[0].color = this.data.playerColor
      gameState.players[0].name = engine.COLOR_NAMES[this.data.playerColor]
      for (var i = 0; i < 4; i++) {
        gameState.players[0].planes[i].color = this.data.playerColor
      }
    }
    
    // 准备棋盘数据
    var mainTrack = this.prepareMainTrack(gameState)
    var homeStretchCells = this.prepareHomeStretch(gameState)
    var hangarCells = this.prepareHangars(gameState)
    var playersInfo = this.preparePlayersInfo(gameState)
    
    beep.playBeep('start')
    
    this.setData({
      phase: 'playing',
      gameState: gameState,
      mainTrack: mainTrack,
      homeStretchCells: homeStretchCells,
      hangarCells: hangarCells,
      playersInfo: playersInfo,
      currentPlayer: 0,
      diceValue: 1,
      showDice: true,
      showRollButton: true,
      showRollAgain: false,
      showPlaneSelector: false,
      showItemPanel: false,
      showItemShop: false,
      roundCount: 1,
      turnHint: '请摇骰子'
    })
    
    this.gameStartTime = Date.now()
    this.itemsUsedCount = 0
    this.planesKnockedCount = 0
    
    // 如果第一个玩家是AI，自动摇骰子
    if (gameState.players[0].isAI) {
      this.setData({ showRollButton: false, turnHint: 'AI思考中...' })
      setTimeout(function() {
        that.rollDice()
      }, 1000)
    }
  },

  prepareMainTrack: function(gameState) {
    var track = board.MAIN_TRACK.map(function(cell, index) {
      var cellData = {
        x: cell.x,
        y: cell.y,
        type: cell.type,
        color: cell.color || '',
        isStart: cell.type === 'start',
        special: false,
        specialIcon: '',
        planes: []
      }
      
      // 检查特殊格子
      if (gameState.specialCells[index]) {
        cellData.special = true
        cellData.specialIcon = gameState.specialCells[index].icon
      }
      
      return cellData
    })
    
    // 放置飞机
    gameState.players.forEach(function(player, playerIndex) {
      player.planes.forEach(function(plane, planeIndex) {
        if (plane.status === 'runway' && plane.position >= 0 && plane.position < 52) {
          track[plane.position].planes.push({
            id: plane.id,
            color: plane.color,
            playerIndex: playerIndex,
            planeIndex: planeIndex,
            offsetX: 0,
            offsetY: 0,
            isMoving: false,
            isKnocked: false
          })
        }
      })
    })
    
    return track
  },

  prepareHomeStretch: function(gameState) {
    var cells = []
    var colors = ['red', 'yellow', 'blue', 'green']
    
    colors.forEach(function(color) {
      board.HOME_STRETCH[color].forEach(function(pos, index) {
        cells.push({
          x: pos.x,
          y: pos.y,
          color: color,
          planes: []
        })
      })
    })
    
    // 放置飞机
    gameState.players.forEach(function(player, playerIndex) {
      player.planes.forEach(function(plane, planeIndex) {
        if (plane.status === 'runway' && plane.position >= 52 && plane.position < 56) {
          var homeIndex = plane.position - 52
          var colorIndex = colors.indexOf(player.color)
          var cellIndex = colorIndex * 4 + homeIndex
          
          if (cells[cellIndex]) {
            cells[cellIndex].planes.push({
              id: plane.id,
              color: plane.color,
              playerIndex: playerIndex,
              planeIndex: planeIndex
            })
          }
        }
      })
    })
    
    return cells
  },

  prepareHangars: function(gameState) {
    var cells = []
    var colors = ['red', 'yellow', 'blue', 'green']
    
    colors.forEach(function(color) {
      board.HANGARS[color].forEach(function(pos, index) {
        cells.push({
          x: pos.x,
          y: pos.y,
          color: color,
          planes: []
        })
      })
    })
    
    // 放置飞机
    gameState.players.forEach(function(player, playerIndex) {
      player.planes.forEach(function(plane, planeIndex) {
        if (plane.status === 'hangar') {
          var colorIndex = colors.indexOf(player.color)
          var cellIndex = colorIndex * 4 + plane.id
          
          if (cells[cellIndex]) {
            cells[cellIndex].planes.push({
              id: plane.id,
              color: plane.color,
              playerIndex: playerIndex,
              planeIndex: planeIndex,
              isMovable: false
            })
          }
        }
      })
    })
    
    return cells
  },

  preparePlayersInfo: function(gameState) {
    return gameState.players.map(function(player) {
      var finishedCount = 0
      player.planes.forEach(function(plane) {
        if (plane.status === 'home') finishedCount++
      })
      
      return {
        name: player.name,
        emoji: engine.COLOR_EMOJIS[player.color],
        isAI: player.isAI,
        isFinished: player.isFinished,
        finishedCount: finishedCount
      }
    })
  },

  refreshBoard: function() {
    var gameState = this.data.gameState
    if (!gameState) return
    
    this.setData({
      mainTrack: this.prepareMainTrack(gameState),
      homeStretchCells: this.prepareHomeStretch(gameState),
      hangarCells: this.prepareHangars(gameState),
      playersInfo: this.preparePlayersInfo(gameState),
      currentPlayer: gameState.currentPlayer,
      roundCount: gameState.roundCount
    })
  },

  rollDice: function() {
    if (this.data.isAnimating) return
    
    var that = this
    this.setData({ isAnimating: true, isRolling: true, showRollButton: false })
    
    if (this.soundEnabled) {
      beep.playBeep('diceRoll')
    }
    
    var rollCount = 0
    var rollInterval = setInterval(function() {
      var tempValue = Math.floor(Math.random() * 6) + 1
      that.setData({ diceValue: tempValue })
      
      rollCount++
      if (rollCount >= 10) {
        clearInterval(rollInterval)
        
        var diceValue = engine.rollDice()
        that.setData({ 
          diceValue: diceValue,
          isRolling: false 
        })
        
        if (that.soundEnabled) {
          beep.playBeep('diceSettle')
        }
        
        setTimeout(function() {
          that.afterRoll(diceValue)
        }, 300)
      }
    }, 100)
  },

  rollDiceAgain: function() {
    this.setData({ showRollAgain: false })
    this.rollDice()
  },

  afterRoll: function(diceValue) {
    var that = this
    var gameState = this.data.gameState
    var player = gameState.players[gameState.currentPlayer]
    var movablePlanes = engine.getMovablePlanes(player, diceValue)
    
    if (movablePlanes.length === 0) {
      this.setData({ turnHint: '无可移动的飞机' })
      setTimeout(function() {
        that.nextTurn()
      }, 1000)
      return
    }
    
    if (player.isAI) {
      // AI选择飞机
      var planeIndex = ai.selectPlane(gameState, gameState.currentPlayer, diceValue)
      this.setData({ turnHint: 'AI选择移动飞机 ' + (planeIndex + 1) })
      setTimeout(function() {
        that.movePlane(planeIndex)
      }, 500)
    } else {
      // 人类选择飞机
      this.setData({
        movablePlanes: movablePlanes,
        showPlaneSelector: true,
        turnHint: '选择要移动的飞机'
      })
      
      // 更新停机坪中的飞机可移动状态
      this.updateMovablePlanes(movablePlanes)
    }
  },

  updateMovablePlanes: function(movablePlanes) {
    var hangarCells = this.data.hangarCells
    var gameState = this.data.gameState
    var player = gameState.players[gameState.currentPlayer]
    
    hangarCells.forEach(function(cell) {
      cell.planes.forEach(function(plane) {
        plane.isMovable = false
        if (plane.playerIndex === gameState.currentPlayer) {
          if (movablePlanes.indexOf(plane.planeIndex) >= 0) {
            plane.isMovable = true
          }
        }
      })
    })
    
    this.setData({ hangarCells: hangarCells })
  },

  selectPlane: function(e) {
    var playerIndex = e.currentTarget.dataset.player
    var planeIndex = e.currentTarget.dataset.plane
    
    if (playerIndex !== this.data.gameState.currentPlayer) return
    if (this.data.movablePlanes.indexOf(planeIndex) < 0) return
    
    this.setData({ showPlaneSelector: false })
    this.movePlane(planeIndex)
  },

  confirmMovePlane: function(e) {
    var index = parseInt(e.currentTarget.dataset.index)
    this.setData({ showPlaneSelector: false })
    this.movePlane(index)
  },

  movePlane: function(planeIndex) {
    var that = this
    var gameState = this.data.gameState
    var player = gameState.players[gameState.currentPlayer]
    var plane = player.planes[planeIndex]
    var diceValue = this.data.diceValue
    
    this.setData({ 
      isAnimating: true,
      showPlaneSelector: false,
      turnHint: '移动中...'
    })
    
    // 计算新位置
    var newPos = engine.calcNewPosition(plane, diceValue, player.color)
    
    // 起飞
    if (plane.status === 'hangar') {
      plane.status = 'runway'
      plane.position = board.START_POSITIONS[player.color]
      
      if (this.soundEnabled) {
        beep.playBeep('planeTakeoff')
      }
      
      this.refreshBoard()
      
      setTimeout(function() {
        that.afterMove(planeIndex, diceValue)
      }, 500)
      return
    }
    
    // 逐格移动动画
    var oldPos = plane.position
    var targetPos = newPos
    
    if (targetPos === 56) {
      targetPos = 55 // 终点跑道最后一格
    }
    
    this.animateMove(plane, oldPos, targetPos, function() {
      if (newPos === 56) {
        plane.status = 'home'
        plane.position = 56
        
        if (that.soundEnabled) {
          beep.playBeep('planeLand')
        }
      }
      
      that.afterMove(planeIndex, diceValue)
    })
  },

  animateMove: function(plane, fromPos, toPos, callback) {
    var that = this
    var current = fromPos
    var step = fromPos < toPos ? 1 : -1
    var totalSteps = Math.abs(toPos - fromPos)
    var stepCount = 0
    
    function moveStep() {
      current += step
      stepCount++
      
      // 只在主赛道上循环，终点跑道不循环
      if (current < 52) {
        if (current >= 52) current -= 52
        if (current < 0) current += 52
      }
      
      plane.position = current
      that.refreshBoard()
      
      if (that.soundEnabled) {
        beep.playBeep('tick')
      }
      
      if (stepCount < totalSteps) {
        setTimeout(moveStep, 150)
      } else {
        callback()
      }
    }
    
    if (totalSteps > 0) {
      setTimeout(moveStep, 150)
    } else {
      callback()
    }
  },

  afterMove: function(planeIndex, diceValue) {
    var that = this
    var gameState = this.data.gameState
    var player = gameState.players[gameState.currentPlayer]
    var plane = player.planes[planeIndex]
    
    // 检查撞机
    var knockResult = engine.checkKnock(gameState, gameState.currentPlayer, plane.position)
    if (knockResult.knocked) {
      if (this.soundEnabled) {
        beep.playBeep('planeKnock')
      }
      
      this.planesKnockedCount++
      this.setData({ turnHint: '撞机！' })
    }
    
    // 检查特殊格子
    if (plane.position < 52 && gameState.specialCells[plane.position]) {
      var specialCell = gameState.specialCells[plane.position]
      this.setData({ turnHint: specialCell.desc })
      
      // 处理道具格子
      if (specialCell.type === 'item') {
        var randomItem = items.getRandomItem()
        var playerItems = this.data.playerItems
        if (playerItems.length < 3) {
          playerItems.push(randomItem)
          this.setData({ playerItems: playerItems })
          var itemInfo = items.getItem(randomItem)
          wx.showToast({ title: '获得: ' + itemInfo.name, icon: 'none' })
        }
      }
      
      engine.applySpecialCellEffect(gameState, gameState.currentPlayer, planeIndex, specialCell.type)
    }
    
    // 检查玩家是否完成
    engine.checkPlayerFinished(gameState, gameState.currentPlayer)
    
    // 检查游戏结束
    engine.checkGameEnd(gameState)
    
    this.refreshBoard()
    
    // 检查是否可以再掷一次
    if (engine.canRollAgain(diceValue)) {
      this.setData({
        showRollAgain: true,
        showDice: true,
        isAnimating: false,
        turnHint: '掷出6！再摇一次'
      })
    } else {
      setTimeout(function() {
        that.nextTurn()
      }, 1000)
    }
    
    // 检查游戏是否结束
    if (gameState.phase === 'result') {
      setTimeout(function() {
        that.showResult()
      }, 1000)
    }
  },

  nextTurn: function() {
    var gameState = this.data.gameState
    var nextPlayerIndex = engine.nextPlayer(gameState)
    var nextPlayer = gameState.players[nextPlayerIndex]
    
    this.setData({
      gameState: gameState,
      showRollAgain: false,
      showDice: true,
      isAnimating: false,
      turnHint: nextPlayer.isAI ? 'AI思考中...' : '请摇骰子'
    })
    
    this.refreshBoard()
    
    // 如果是AI，自动摇骰子
    if (nextPlayer.isAI) {
      var that = this
      setTimeout(function() {
        that.rollDice()
      }, 1000)
    } else {
      this.setData({ showRollButton: true })
    }
  },

  showResult: function() {
    var gameState = this.data.gameState
    var rankings = engine.getRankings(gameState)
    var playerRank = -1
    
    rankings.forEach(function(rank, index) {
      if (rank.index === 0) {
        playerRank = index
      }
    })
    
    var duration = Math.floor((Date.now() - this.gameStartTime) / 1000)
    var minutes = Math.floor(duration / 60)
    var seconds = duration % 60
    
    var planesKnocked = this.planesKnockedCount || 0
    
    this.setData({
      phase: 'result',
      gameResult: playerRank === 0 ? 'win' : 'lose',
      rankings: rankings.map(function(rank) {
        return {
          emoji: engine.COLOR_EMOJIS[rank.color],
          name: rank.name
        }
      }),
      stats: {
        rounds: gameState.roundCount,
        duration: minutes + ':' + (seconds < 10 ? '0' : '') + seconds,
        planesKnocked: planesKnocked
      },
      showConfetti: playerRank === 0
    })
    
    if (playerRank === 0) {
      if (this.soundEnabled) {
        beep.playBeep('win')
      }
      
      // 生成撒花效果
      this.generateConfetti()
      
      // 获胜奖励金币
      var reward = 50
      if (this.data.difficulty === 'hard') reward = 100
      else if (this.data.difficulty === 'medium') reward = 70
      gameEconomy.addCoins(reward, '飞行棋获胜奖励')
    } else {
      if (this.soundEnabled) {
        beep.playBeep('lose')
      }
      
      // 参与奖励
      gameEconomy.addCoins(10, '飞行棋参与奖励')
    }
    
    // 保存游戏记录
    this.saveGameRecord(playerRank === 0, duration)
  },

  generateConfetti: function() {
    var confettiList = []
    var emojis = ['🎉', '🎊', '✨', '⭐', '🌟']
    
    for (var i = 0; i < 20; i++) {
      confettiList.push({
        x: Math.random() * 100,
        delay: Math.random() * 2,
        emoji: emojis[Math.floor(Math.random() * emojis.length)]
      })
    }
    
    this.setData({ confettiList: confettiList })
  },

  saveGameRecord: function(isWin, duration) {
    var gameState = this.data.gameState
    var storageKey = 'diceFlight'
    
    // 统计玩家完成的飞机数
    var player = gameState.players[0]
    var planesFinished = 0
    player.planes.forEach(function(plane) {
      if (plane.status === 'home') planesFinished++
    })
    
    var record = {
      id: 'flight_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6),
      timestamp: Date.now(),
      mode: this.data.playMode,
      difficulty: this.data.difficulty,
      aiCount: this.data.aiCount,
      result: isWin ? 'win' : 'lose',
      rank: isWin ? 1 : 2,
      duration: duration,
      rounds: gameState.roundCount,
      planesFinished: planesFinished,
      planesKnocked: this.planesKnockedCount,
      itemsUsed: this.itemsUsedCount,
      specialCellsHit: 0
    }
    
    // 读取现有数据
    var flightData = childStorage.get(storageKey) || { records: [], stats: {} }
    
    // 添加记录
    flightData.records.unshift(record)
    if (flightData.records.length > 50) {
      flightData.records = flightData.records.slice(0, 50)
    }
    
    // 更新统计
    if (!flightData.stats) {
      flightData.stats = {
        totalGames: 0,
        wins: 0,
        losses: 0,
        totalRounds: 0,
        totalDuration: 0,
        planesFinished: 0,
        planesKnocked: 0,
        bestRank: 4,
        streakWins: 0,
        maxStreakWins: 0
      }
    }
    
    var stats = flightData.stats
    stats.totalGames++
    if (isWin) {
      stats.wins++
      stats.streakWins++
      if (stats.streakWins > stats.maxStreakWins) {
        stats.maxStreakWins = stats.streakWins
      }
    } else {
      stats.losses++
      stats.streakWins = 0
    }
    stats.totalRounds += gameState.roundCount
    stats.totalDuration += duration
    
    childStorage.set(storageKey, flightData)
    
    // 检查成就
    achievements.checkAchievements()
  },

  playAgain: function() {
    this.setData({
      phase: 'select',
      showConfetti: false
    })
  },

  confirmExit: function() {
    var that = this
    wx.showModal({
      title: '确认退出',
      content: '退出将结束当前游戏，确定要退出吗？',
      success: function(res) {
        if (res.confirm) {
          that.goBack()
        }
      }
    })
  }
})
