var engine = require('../../../../utils/tetris-engine.js')
var tetrisUtils = require('../../../../utils/tetris-utils.js')
var tetrisManager = require('../../../../utils/tetris-manager.js')

var COLS = engine.COLS
var ROWS = engine.ROWS
var CELL_SIZE = 0
var BOARD_WIDTH = 0
var BOARD_HEIGHT = 0

Page({
  data: {
    phase: 'select',
    chapter: 1,
    monster: null,
    monsterDamage: 0,
    monsterMaxHP: 0,
    score: 0,
    lines: 0,
    level: 0,
    combo: 0,
    heldPiece: null,
    nextPieces: [],
    paused: false,
    items: { bomb: 0, freeze: 0, rainbow: 0, undo: 0 },
    frozen: false,
    showShop: false,
    shopItems: [],
    coins: 0,
    defeatedMonsters: [],
    currentChapter: 1,
    chapters: [],
    holdGrid: null,
    nextGrids: [],
    boardWidth: 0,
    boardHeight: 0
  },

  onLoad: function () {
    var windowInfo = wx.getWindowInfo()
    var screenWidth = windowInfo.windowWidth
    var screenHeight = windowInfo.windowHeight
    
    // 优化尺寸计算，动态适配不同屏幕
    var horizontalPadding = Math.max(16, Math.floor(screenWidth * 0.06))
    var verticalPadding = 12
    
    // 动态预留空间：顶部（怪物栏+信息栏）和底部（道具栏+按钮栏）
    var topReserve = Math.floor(screenHeight * 0.16)
    var bottomReserve = Math.floor(screenHeight * 0.18)
    var availableHeight = screenHeight - topReserve - bottomReserve - verticalPadding * 2
    var availableWidth = screenWidth - horizontalPadding * 2
    
    var cellByWidth = Math.floor(availableWidth / COLS)
    var cellByHeight = Math.floor(availableHeight / ROWS)
    var cellSize = Math.min(cellByWidth, cellByHeight)
    
    // 确保最小格子尺寸
    var minCellSize = Math.floor(screenWidth / 15)
    cellSize = Math.max(cellSize, minCellSize)
    
    var boardWidth = cellSize * COLS
    var boardHeight = cellSize * ROWS
    CELL_SIZE = cellSize
    BOARD_WIDTH = boardWidth
    BOARD_HEIGHT = boardHeight
    this.game = null
    this.fallTimer = null
    this.gameStartTime = 0
    this.ctx = null
    this.canvas = null
    this.setData({
      boardWidth: boardWidth,
      boardHeight: boardHeight
    })
    this.loadAdventureData()
  },

  onShow: function () {
    this.loadAdventureData()
    if (this.data.phase === 'playing' && !this.data.paused) {
      this.startFallTimer()
    }
  },

  onHide: function () {
    this.pauseGame()
  },

  onUnload: function () {
    this.clearFallTimer()
  },

  loadAdventureData: function () {
    var progress = tetrisManager.getAdventureProgress()
    var coins = tetrisManager.getCoins()
    var items = tetrisManager.getItems()
    var monsters = tetrisUtils.ADVENTURE_MONSTERS
    var chapter = progress.currentChapter
    if (chapter > 7) chapter = 7
    var monster = monsters[chapter - 1] || monsters[0]
    var chapters = monsters.map(function (m) {
      return {
        chapter: m.chapter,
        name: m.name,
        emoji: m.emoji,
        hp: m.hp,
        reward: m.reward
      }
    })
    this.setData({
      coins: coins,
      items: items,
      defeatedMonsters: progress.defeatedMonsters || [],
      currentChapter: progress.currentChapter || 1,
      chapter: chapter,
      monster: monster,
      monsterMaxHP: monster.hp,
      monsterDamage: 0,
      chapters: chapters
    })
  },

  selectChapter: function (e) {
    var chapter = parseInt(e.currentTarget.dataset.chapter)
    var monsters = tetrisUtils.ADVENTURE_MONSTERS
    if (chapter > monsters.length) return
    var monster = monsters[chapter - 1]
    this.setData({
      chapter: chapter,
      monster: monster,
      monsterMaxHP: monster.hp,
      monsterDamage: 0,
      phase: 'playing'
    })
    this.startNewGame()
  },

  startNewGame: function () {
    this.game = engine.createEngine()
    engine.spawnPiece(this.game)
    this.gameStartTime = Date.now()
    this.setData({
      score: 0,
      lines: 0,
      level: 0,
      combo: 0,
      heldPiece: null,
      nextPieces: this.game.nextQueue.slice(0, 3),
      paused: false,
      monsterDamage: 0,
      frozen: false
    })
    this.initCanvas()
    this.startFallTimer()
  },

  initCanvas: function () {
    var that = this
    var query = wx.createSelectorQuery()
    query.select('#adventureCanvas')
      .fields({ node: true, size: true })
      .exec(function (res) {
        if (!res[0]) return
        var canvas = res[0].node
        var ctx = canvas.getContext('2d')
        var deviceInfo = wx.getDeviceInfo()
        var dpr = deviceInfo.pixelRatio
        canvas.width = BOARD_WIDTH * dpr
        canvas.height = BOARD_HEIGHT * dpr
        ctx.scale(dpr, dpr)
        that.ctx = ctx
        that.canvas = canvas
        that.draw()
      })
  },

  startFallTimer: function () {
    this.clearFallTimer()
    var that = this
    var speed = tetrisUtils.getSpeed(this.data.level)
    this.fallTimer = setInterval(function () {
      if (that.data.paused || that.data.frozen) return
      that.moveDown()
    }, speed)
  },

  clearFallTimer: function () {
    if (this.fallTimer) {
      clearInterval(this.fallTimer)
      this.fallTimer = null
    }
  },

  moveLeft: function () {
    if (!this.game || this.data.paused) return
    engine.moveLeft(this.game)
    this.draw()
  },

  moveRight: function () {
    if (!this.game || this.data.paused) return
    engine.moveRight(this.game)
    this.draw()
  },

  moveDown: function () {
    if (!this.game || this.data.paused) return
    var moved = engine.moveDown(this.game)
    if (!moved) {
      this.lockPiece()
    } else {
      this.draw()
    }
  },

  hardDrop: function () {
    if (!this.game || this.data.paused) return
    engine.hardDrop(this.game)
    this.lockPiece()
  },

  rotatePiece: function () {
    if (!this.game || this.data.paused) return
    engine.rotate(this.game, true)
    this.draw()
  },

  holdCurrentPiece: function () {
    if (!this.game || this.data.paused) return
    engine.holdPiece(this.game)
    this.updatePreviews()
    this.draw()
  },

  updatePreviews: function () {
    if (!this.game) return
    var holdGrid = this.generatePreviewGrid(this.game.heldPiece)
    var nextGrids = []
    for (var i = 0; i < Math.min(3, this.game.nextQueue.length); i++) {
      nextGrids.push(this.generatePreviewGrid(this.game.nextQueue[i]))
    }
    this.setData({
      heldPiece: this.game.heldPiece,
      holdGrid: holdGrid,
      nextPieces: this.game.nextQueue.slice(0, 3),
      nextGrids: nextGrids
    })
  },

  generatePreviewGrid: function (type) {
    if (!type) return null
    var blocks = engine.getBlocks(type, 0, 0, 0)
    var color = engine.COLORS[type]
    var grid = []
    for (var r = 0; r < 4; r++) {
      var row = []
      for (var c = 0; c < 4; c++) {
        var filled = false
        for (var b = 0; b < blocks.length; b++) {
          if (blocks[b][0] === c && blocks[b][1] === r) {
            filled = true
            break
          }
        }
        row.push(filled ? color : 'transparent')
      }
      grid.push(row)
    }
    return grid
  },

  lockPiece: function () {
    if (!this.game) return
    var result = engine.lockAndClear(this.game)
    var linesCleared = result.lines

    if (linesCleared > 0) {
      var attack = tetrisUtils.calculateAttack(linesCleared)
      var newDamage = this.data.monsterDamage + attack
      var scoreGain = tetrisUtils.calculateScore(linesCleared, this.data.level, this.game.combo)
      var newScore = this.data.score + scoreGain
      var newLines = this.data.lines + linesCleared
      var newLevel = tetrisUtils.getLevel(newLines)
      var levelChanged = newLevel > this.data.level

      var monsterDefeated = newDamage >= this.data.monsterMaxHP

      this.setData({
        score: newScore,
        lines: newLines,
        level: newLevel,
        combo: this.game.combo,
        monsterDamage: Math.min(newDamage, this.data.monsterMaxHP)
      })

      this.updatePreviews()

      if (levelChanged) {
        this.startFallTimer()
      }

      if (monsterDefeated) {
        this.monsterDefeated()
        return
      }

      wx.vibrateShort({ type: 'light' })
    } else {
      this.setData({
        nextPieces: this.game.nextQueue.slice(0, 3),
        heldPiece: this.game.heldPiece
      })
    }

    if (result.gameOver) {
      this.gameOver()
    } else {
      this.draw()
    }
  },

  monsterDefeated: function () {
    this.clearFallTimer()
    var monster = this.data.monster
    tetrisManager.defeatMonster(this.data.chapter)
    var coins = monster.reward
    tetrisManager.rewardCoins(coins, '冒险模式击败' + monster.name)

    tetrisManager.saveGameRecord({
      mode: 'adventure',
      result: 'win',
      score: this.data.score,
      lines: this.data.lines,
      level: this.data.level,
      duration: Math.floor((Date.now() - this.gameStartTime) / 1000),
      coinsEarned: coins,
      chapter: this.data.chapter,
      monsterDefeated: true
    })

    tetrisManager.updateStats('adventure', {
      score: this.data.score,
      lines: this.data.lines,
      level: this.data.level,
      duration: Math.floor((Date.now() - this.gameStartTime) / 1000),
      monsterDefeated: true,
      chapterCleared: true
    })

    this.setData({ phase: 'victory' })
    wx.vibrateShort({ type: 'heavy' })
    wx.showToast({ title: monster.name + ' 被击败！', icon: 'none' })
  },

  gameOver: function () {
    this.clearFallTimer()
    tetrisManager.saveGameRecord({
      mode: 'adventure',
      result: 'gameover',
      score: this.data.score,
      lines: this.data.lines,
      level: this.data.level,
      duration: Math.floor((Date.now() - this.gameStartTime) / 1000),
      coinsEarned: 0,
      chapter: this.data.chapter,
      monsterDefeated: false
    })

    tetrisManager.updateStats('adventure', {
      score: this.data.score,
      lines: this.data.lines,
      level: this.data.level,
      duration: Math.floor((Date.now() - this.gameStartTime) / 1000),
      monsterDefeated: false
    })

    this.setData({ phase: 'gameOver' })
    wx.vibrateShort({ type: 'heavy' })
  },

  pauseGame: function () {
    if (this.data.phase !== 'playing' || this.data.paused) return
    this.clearFallTimer()
    this.setData({ paused: true })
  },

  resumeGame: function () {
    if (!this.data.paused) return
    this.setData({ paused: false })
    this.startFallTimer()
  },

  useBomb: function () {
    if (!this.game || this.data.paused) return
    if (!tetrisManager.useItem('bomb')) {
      wx.showToast({ title: '没有炸弹了', icon: 'none' })
      return
    }
    for (var y = ROWS - 3; y < ROWS; y++) {
      for (var x = 0; x < COLS; x++) {
        this.game.board[y][x] = 0
      }
    }
    this.setData({ items: tetrisManager.getItems() })
    this.draw()
    wx.showToast({ title: '💣 底部3行已清除！', icon: 'none' })
  },

  useFreeze: function () {
    if (!this.game || this.data.paused) return
    if (!tetrisManager.useItem('freeze')) {
      wx.showToast({ title: '没有冰冻了', icon: 'none' })
      return
    }
    this.setData({ items: tetrisManager.getItems(), frozen: true })
    wx.showToast({ title: '🧊 暂停5秒！', icon: 'none' })
    var that = this
    setTimeout(function () {
      that.setData({ frozen: false })
    }, 5000)
  },

  useRainbow: function () {
    if (!this.game || this.data.paused) return
    if (!tetrisManager.useItem('rainbow')) {
      wx.showToast({ title: '没有彩虹了', icon: 'none' })
      return
    }
    var count = 0
    for (var y = 0; y < ROWS && count < 5; y++) {
      for (var x = 0; x < COLS && count < 5; x++) {
        if (this.game.board[y][x] !== 0) {
          if (Math.random() < 0.3) {
            this.game.board[y][x] = 0
            count++
          }
        }
      }
    }
    this.setData({ items: tetrisManager.getItems() })
    this.draw()
    wx.showToast({ title: '🌈 随机消除了' + count + '格！', icon: 'none' })
  },

  openShop: function () {
    this.setData({
      showShop: true,
      shopItems: tetrisUtils.ADVENTURE_ITEMS,
      coins: tetrisManager.getCoins()
    })
  },

  closeShop: function () {
    this.setData({ showShop: false })
  },

  buyItem: function (e) {
    var itemId = e.currentTarget.dataset.id
    if (tetrisManager.buyItem(itemId)) {
      wx.showToast({ title: '购买成功！', icon: 'success' })
      this.setData({
        items: tetrisManager.getItems(),
        coins: tetrisManager.getCoins()
      })
    } else {
      wx.showToast({ title: '金币不足', icon: 'none' })
    }
  },

  goBack: function () {
    if (this.data.phase === 'playing') {
      this.pauseGame()
      var that = this
      wx.showModal({
        title: '确定返回吗？',
        content: '当前游戏进度不会保存',
        confirmText: '返回',
        cancelText: '继续',
        success: function (res) {
          if (res.confirm) {
            that.clearFallTimer()
            wx.navigateBack()
          } else {
            that.resumeGame()
          }
        }
      })
    } else {
      wx.navigateBack()
    }
  },

  restartChapter: function () {
    this.setData({ phase: 'playing' })
    this.startNewGame()
  },

  nextChapter: function () {
    var next = this.data.chapter + 1
    if (next > 7) next = 7
    var monsters = tetrisUtils.ADVENTURE_MONSTERS
    var monster = monsters[next - 1]
    this.setData({
      chapter: next,
      monster: monster,
      monsterMaxHP: monster.hp,
      monsterDamage: 0,
      phase: 'playing'
    })
    this.startNewGame()
  },

  draw: function () {
    if (!this.ctx || !this.game) return
    var ctx = this.ctx
    var g = this.game

    ctx.fillStyle = '#1A1A2E'
    ctx.fillRect(0, 0, BOARD_WIDTH, BOARD_HEIGHT)

    ctx.strokeStyle = '#16213E'
    ctx.lineWidth = 0.5
    for (var x = 0; x <= COLS; x++) {
      ctx.beginPath()
      ctx.moveTo(x * CELL_SIZE, 0)
      ctx.lineTo(x * CELL_SIZE, BOARD_HEIGHT)
      ctx.stroke()
    }
    for (var y = 0; y <= ROWS; y++) {
      ctx.beginPath()
      ctx.moveTo(0, y * CELL_SIZE)
      ctx.lineTo(BOARD_WIDTH, y * CELL_SIZE)
      ctx.stroke()
    }

    for (var by = 0; by < ROWS; by++) {
      for (var bx = 0; bx < COLS; bx++) {
        if (g.board[by][bx] !== 0) {
          this.drawCell(ctx, bx, by, g.board[by][bx])
        }
      }
    }

    if (g.currentPiece) {
      var ghostBlocks = engine.getGhostBlocks(g)
      for (var gi = 0; gi < ghostBlocks.length; gi++) {
        var gx = ghostBlocks[gi][0], gy = ghostBlocks[gi][1]
        if (gy >= 0) {
          ctx.fillStyle = 'rgba(255,255,255,0.15)'
          ctx.fillRect(gx * CELL_SIZE + 1, gy * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2)
        }
      }

      var currentBlocks = engine.getCurrentBlocks(g)
      var color = engine.COLORS[g.currentPiece.type]
      for (var ci = 0; ci < currentBlocks.length; ci++) {
        var cx = currentBlocks[ci][0], cy = currentBlocks[ci][1]
        if (cy >= 0) this.drawCell(ctx, cx, cy, color)
      }
    }
  },

  drawCell: function (ctx, x, y, color) {
    ctx.fillStyle = color
    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
    ctx.fillStyle = 'rgba(255,255,255,0.3)'
    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, 2)
    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, 2, CELL_SIZE)
    ctx.fillStyle = 'rgba(0,0,0,0.2)'
    ctx.fillRect(x * CELL_SIZE, (y + 1) * CELL_SIZE - 2, CELL_SIZE, 2)
    ctx.fillRect((x + 1) * CELL_SIZE - 2, y * CELL_SIZE, 2, CELL_SIZE)
    ctx.strokeStyle = 'rgba(0,0,0,0.15)'
    ctx.lineWidth = 0.5
    ctx.strokeRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE)
  },

  onTouchStart: function (e) {
    this.touchStartX = e.touches[0].clientX
    this.touchStartY = e.touches[0].clientY
    this.touchStartTime = Date.now()
  },

  onTouchEnd: function (e) {
    if (!this.game || this.data.paused) return
    var dx = e.changedTouches[0].clientX - this.touchStartX
    var dy = e.changedTouches[0].clientY - this.touchStartY
    var dt = Date.now() - this.touchStartTime
    var absDx = Math.abs(dx), absDy = Math.abs(dy)

    if (absDx < 10 && absDy < 10) {
      var windowInfo = wx.getWindowInfo()
      var midX = windowInfo.windowWidth / 2
      if (e.changedTouches[0].clientX < midX) this.moveLeft()
      else this.moveRight()
      return
    }
    if (absDy > absDx && dy < -50) { this.rotatePiece(); return }
    if (absDy > absDx && dy > 30) {
      if (dt < 200) {
        this.hardDrop()
      } else {
        this.moveDown()
      }
      return
    }
  }
})
