var engine = require('../../../../utils/tetris-engine.js')
var tetrisUtils = require('../../../../utils/tetris-utils.js')
var tetrisManager = require('../../../../utils/tetris-manager.js')

var COLS = engine.COLS
var ROWS = 10
var CELL_SIZE = 0
var BOARD_WIDTH = 0
var BOARD_HEIGHT = 0

Page({
  data: {
    phase: 'select',
    currentLevel: 1,
    totalStars: 0,
    starsMap: {},
    levels: [],
    selectedLevel: null,
    levelName: '',
    levelDesc: '',
    pieces: [],
    pieceIndex: 0,
    currentPiece: null,
    board: [],
    targetCells: [],
    targetFilled: 0,
    targetTotal: 0,
    hintsRemaining: 2,
    hintHighlight: null,
    startTime: 0,
    elapsed: 0,
    stars: 0,
    showResult: false,
    boardWidth: 0,
    boardHeight: 0
  },

  onLoad: function () {
    var windowInfo = wx.getWindowInfo()
    var screenWidth = windowInfo.windowWidth
    var screenHeight = windowInfo.windowHeight
    
    // 优化尺寸计算，谜题模式10行（1:1正方形）
    var horizontalPadding = Math.max(16, Math.floor(screenWidth * 0.06))
    var verticalPadding = 12
    
    // 动态预留空间：顶部（关卡信息+统计栏+方块信息）和底部（按钮栏）
    var topReserve = Math.floor(screenHeight * 0.22)
    var bottomReserve = Math.floor(screenHeight * 0.15)
    var availableHeight = screenHeight - topReserve - bottomReserve - verticalPadding * 2
    var availableWidth = screenWidth - horizontalPadding * 2
    
    var cellByWidth = Math.floor(availableWidth / COLS)
    var cellByHeight = Math.floor(availableHeight / ROWS)
    var cellSize = Math.min(cellByWidth, cellByHeight)
    
    // 谜题模式是正方形，格子可以更大一些
    var minCellSize = Math.floor(screenWidth / 13)
    cellSize = Math.max(cellSize, minCellSize)
    
    var boardWidth = cellSize * COLS
    var boardHeight = cellSize * ROWS
    CELL_SIZE = cellSize
    BOARD_WIDTH = boardWidth
    BOARD_HEIGHT = boardHeight
    this.ctx = null
    this.canvas = null
    this.timer = null
    this.setData({
      boardWidth: boardWidth,
      boardHeight: boardHeight
    })
    this.loadPuzzleData()
  },

  onShow: function () {
    this.loadPuzzleData()
    if (this.data.phase === 'playing' && this.pauseTime) {
      var pauseDuration = Date.now() - this.pauseTime
      this.data.startTime = (this.data.startTime || 0) + pauseDuration
      this.pauseTime = null
      this.startTimer()
    }
  },

  onHide: function () {
    if (this.data.phase === 'playing' && this.timer) {
      this.pauseTime = Date.now()
      this.clearTimer()
    }
  },

  onUnload: function () {
    this.clearTimer()
  },

  loadPuzzleData: function () {
    var progress = tetrisManager.getPuzzleProgress()
    var levels = tetrisUtils.PUZZLE_LEVELS.map(function (lv) {
      return {
        id: lv.id,
        name: lv.name,
        desc: lv.desc,
        stars: (progress.starsMap || {})[lv.id] || 0,
        unlocked: lv.id <= (progress.currentLevel || 1)
      }
    })
    this.setData({
      currentLevel: progress.currentLevel || 1,
      totalStars: progress.totalStars || 0,
      starsMap: progress.starsMap || {},
      levels: levels
    })
  },

  selectLevel: function (e) {
    var levelId = parseInt(e.currentTarget.dataset.id)
    var levelData = tetrisUtils.PUZZLE_LEVELS[levelId - 1]
    if (!levelData) return

    var board = []
    for (var y = 0; y < ROWS; y++) {
      var row = []
      for (var x = 0; x < COLS; x++) row.push(0)
      board.push(row)
    }

    this.setData({
      phase: 'playing',
      selectedLevel: levelId,
      levelName: levelData.name,
      levelDesc: levelData.desc,
      pieces: levelData.pieces,
      pieceIndex: 0,
      currentPiece: this.createPreviewPiece(levelData.pieces[0]),
      board: board,
      targetCells: levelData.target,
      targetFilled: 0,
      targetTotal: levelData.target.length,
      hintsRemaining: 2,
      hintHighlight: null,
      startTime: Date.now(),
      elapsed: 0,
      stars: 0,
      showResult: false
    })

    this.initCanvas()
    this.startTimer()
  },

  createPreviewPiece: function (type) {
    var blocks = engine.getBlocks(type, 0, 0, 0)
    return {
      type: type,
      state: 0,
      x: 3,
      y: 0,
      blocks: blocks
    }
  },

  initCanvas: function () {
    var that = this
    var query = wx.createSelectorQuery()
    query.select('#puzzleCanvas')
      .fields({ node: true, size: true })
      .exec(function (res) {
        if (!res[0]) return
        var canvas = res[0].node
        var ctx = canvas.getContext('2d')
        var windowInfo = wx.getWindowInfo()
        var dpr = windowInfo.pixelRatio || 2
        canvas.width = BOARD_WIDTH * dpr
        canvas.height = BOARD_HEIGHT * dpr
        ctx.scale(dpr, dpr)
        that.ctx = ctx
        that.canvas = canvas
        that.draw()
      })
  },

  startTimer: function () {
    this.clearTimer()
    var that = this
    this.timer = setInterval(function () {
      if (that.data.phase !== 'playing') return
      var elapsed = Math.floor((Date.now() - that.data.startTime) / 1000)
      that.setData({ elapsed: elapsed })
    }, 1000)
  },

  clearTimer: function () {
    if (this.timer) {
      clearInterval(this.timer)
      this.timer = null
    }
  },

  moveLeft: function () {
    if (!this.data.currentPiece || this.data.phase !== 'playing') return
    var p = this.data.currentPiece
    var newBlocks = p.blocks.map(function (b) { return [b[0] + p.x - 1, b[1] + p.y] })
    if (!this.hasCollision(newBlocks)) {
      p.x--
      this.setData({ currentPiece: p })
      this.draw()
    }
  },

  moveRight: function () {
    if (!this.data.currentPiece || this.data.phase !== 'playing') return
    var p = this.data.currentPiece
    var newBlocks = p.blocks.map(function (b) { return [b[0] + p.x + 1, b[1] + p.y] })
    if (!this.hasCollision(newBlocks)) {
      p.x++
      this.setData({ currentPiece: p })
      this.draw()
    }
  },

  moveDown: function () {
    if (!this.data.currentPiece || this.data.phase !== 'playing') return
    var p = this.data.currentPiece
    var newBlocks = p.blocks.map(function (b) { return [b[0] + p.x, b[1] + p.y + 1] })
    if (!this.hasCollision(newBlocks)) {
      p.y++
      this.setData({ currentPiece: p })
      this.draw()
    }
  },

  rotatePiece: function () {
    if (!this.data.currentPiece || this.data.phase !== 'playing') return
    var p = this.data.currentPiece
    var result = engine.tryRotate(this.data.board, p.type, p.state, p.x, p.y, true)
    if (result) {
      p.state = result.state
      p.x = result.x
      p.y = result.y
      p.blocks = engine.getBlocks(p.type, p.state, 0, 0)
      this.setData({ currentPiece: p })
      this.draw()
    }
  },

  hasCollision: function (blocks) {
    var board = this.data.board
    for (var i = 0; i < blocks.length; i++) {
      var x = blocks[i][0], y = blocks[i][1]
      if (x < 0 || x >= COLS || y >= ROWS) return true
      if (y >= 0 && board[y][x] !== 0) return true
    }
    return false
  },

  placePiece: function () {
    if (!this.data.currentPiece || this.data.phase !== 'playing') return
    var p = this.data.currentPiece
    var blocks = p.blocks.map(function (b) { return [b[0] + p.x, b[1] + p.y] })

    for (var i = 0; i < blocks.length; i++) {
      var x = blocks[i][0], y = blocks[i][1]
      if (y < 0 || y >= ROWS || x < 0 || x >= COLS) {
        wx.showToast({ title: '无法放置在这里', icon: 'none' })
        return
      }
    }

    var board = this.data.board.map(function (r) { return r.slice() })
    var color = engine.COLORS[p.type]
    for (var j = 0; j < blocks.length; j++) {
      board[blocks[j][1]][blocks[j][0]] = color
    }

    var filled = this.countTargetFilled(board)
    var nextIndex = this.data.pieceIndex + 1
    var allPlaced = nextIndex >= this.data.pieces.length

    if (allPlaced) {
      var elapsed = Math.floor((Date.now() - this.data.startTime) / 1000)
      var levelData = tetrisUtils.PUZZLE_LEVELS[this.data.selectedLevel - 1]

      var complete = filled >= this.data.targetTotal

      // E6：未达标（目标格未全部填满）视为失败——不计通关、不发星币，
      // 仅记录 gameover 并展示结果面板
      if (!complete) {
        tetrisManager.saveGameRecord({
          mode: 'puzzle',
          result: 'gameover',
          score: 0,
          lines: 0,
          level: 0,
          duration: elapsed,
          coinsEarned: 0,
          puzzleLevel: this.data.selectedLevel,
          stars: 0
        })
        this.clearTimer()
        this.setData({
          board: board,
          currentPiece: null,
          targetFilled: filled,
          phase: 'result',
          stars: 0,
          showResult: true,
          elapsed: elapsed,
          resultComplete: false
        })
        return
      }

      var stars = 1
      if (elapsed < levelData.starThresholds[1]) stars = 3
      else if (elapsed < levelData.starThresholds[0]) stars = 2

      tetrisManager.completePuzzleLevel(this.data.selectedLevel, stars)
      var coins = stars
      tetrisManager.rewardCoins(coins, '拼图模式第' + this.data.selectedLevel + '关')

      tetrisManager.saveGameRecord({
        mode: 'puzzle',
        result: 'complete',
        score: stars * 100,
        lines: 0,
        level: 0,
        duration: elapsed,
        coinsEarned: coins,
        puzzleLevel: this.data.selectedLevel,
        stars: stars
      })

      tetrisManager.updateStats('puzzle', {
        score: stars * 100,
        lines: 0,
        level: 0,
        duration: elapsed,
        stars: stars
      })

      this.clearTimer()
      this.setData({
        board: board,
        currentPiece: null,
        targetFilled: filled,
        phase: 'result',
        stars: stars,
        showResult: true,
        elapsed: elapsed
      })
      this.loadPuzzleData()
      this.draw()
    } else {
      var nextPiece = this.createPreviewPiece(this.data.pieces[nextIndex])
      this.setData({
        board: board,
        pieceIndex: nextIndex,
        currentPiece: nextPiece,
        targetFilled: filled
      })
      this.draw()
    }
  },

  countTargetFilled: function (board) {
    var count = 0
    var target = this.data.targetCells
    for (var i = 0; i < target.length; i++) {
      var x = target[i][0], y = target[i][1]
      if (y >= 0 && y < ROWS && x >= 0 && x < COLS && board[y][x] !== 0) {
        count++
      }
    }
    return count
  },

  useHint: function () {
    if (this.data.hintsRemaining <= 0 || !this.data.currentPiece) return
    var p = this.data.currentPiece
    var target = this.data.targetCells
    var board = this.data.board

    var bestX = p.x, bestY = p.y, bestScore = -1
    for (var testY = 0; testY < ROWS; testY++) {
      for (var testX = 0; testX < COLS; testX++) {
        var testBlocks = p.blocks.map(function (b) { return [b[0] + testX, b[1] + testY] })
        var valid = true
        for (var i = 0; i < testBlocks.length; i++) {
          var bx = testBlocks[i][0], by = testBlocks[i][1]
          if (bx < 0 || bx >= COLS || by >= ROWS) { valid = false; break }
          if (by >= 0 && board[by][bx] !== 0) { valid = false; break }
        }
        if (!valid) continue

        var score = 0
        for (var t = 0; t < target.length; t++) {
          for (var j = 0; j < testBlocks.length; j++) {
            if (testBlocks[j][0] === target[t][0] && testBlocks[j][1] === target[t][1]) {
              score++
            }
          }
        }
        if (score > bestScore) {
          bestScore = score
          bestX = testX
          bestY = testY
        }
      }
    }

    if (bestScore > 0) {
      var hintBlocks = p.blocks.map(function (b) { return [b[0] + bestX, b[1] + bestY] })
      this.setData({
        hintsRemaining: this.data.hintsRemaining - 1,
        hintHighlight: hintBlocks
      })
      this.draw()
      var that = this
      setTimeout(function () {
        that.setData({ hintHighlight: null })
        that.draw()
      }, 2000)
    }
  },

  goBack: function () {
    if (this.data.phase === 'playing') {
      this.clearTimer()
    }
    this.setData({ phase: 'select' })
    this.loadPuzzleData()
  },

  retryLevel: function () {
    this.selectLevel({ currentTarget: { dataset: { id: this.data.selectedLevel } } })
  },

  nextLevel: function () {
    var next = this.data.selectedLevel + 1
    if (next > tetrisUtils.PUZZLE_LEVELS.length) {
      this.setData({ phase: 'select' })
      return
    }
    this.selectLevel({ currentTarget: { dataset: { id: next } } })
  },

  draw: function () {
    if (!this.ctx) return
    var ctx = this.ctx
    var board = this.data.board
    if (!board || !board.length) return
    var target = this.data.targetCells

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

    for (var ti = 0; ti < target.length; ti++) {
      var tx = target[ti][0], ty = target[ti][1]
      if (ty >= 0 && ty < ROWS && tx >= 0 && tx < COLS) {
        ctx.fillStyle = board[ty][tx] !== 0 ? 'rgba(76,175,80,0.3)' : 'rgba(255,255,255,0.08)'
        ctx.fillRect(tx * CELL_SIZE + 1, ty * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2)
        ctx.strokeStyle = 'rgba(255,255,255,0.2)'
        ctx.lineWidth = 1
        ctx.strokeRect(tx * CELL_SIZE + 1, ty * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2)
      }
    }

    for (var by = 0; by < ROWS; by++) {
      for (var bx = 0; bx < COLS; bx++) {
        if (board[by][bx] !== 0) {
          this.drawCell(ctx, bx, by, board[by][bx])
        }
      }
    }

    if (this.data.hintHighlight) {
      for (var hi = 0; hi < this.data.hintHighlight.length; hi++) {
        var hx = this.data.hintHighlight[hi][0], hy = this.data.hintHighlight[hi][1]
        ctx.fillStyle = 'rgba(255,215,0,0.4)'
        ctx.fillRect(hx * CELL_SIZE, hy * CELL_SIZE, CELL_SIZE, CELL_SIZE)
        ctx.strokeStyle = '#FFD700'
        ctx.lineWidth = 2
        ctx.strokeRect(hx * CELL_SIZE, hy * CELL_SIZE, CELL_SIZE, CELL_SIZE)
      }
    }

    if (this.data.currentPiece && this.data.phase === 'playing') {
      var p = this.data.currentPiece
      var color = engine.COLORS[p.type]
      for (var ci = 0; ci < p.blocks.length; ci++) {
        var cx = p.blocks[ci][0] + p.x, cy = p.blocks[ci][1] + p.y
        if (cy >= 0 && cy < ROWS && cx >= 0 && cx < COLS) {
          this.drawCell(ctx, cx, cy, color)
        }
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
  },

  onTouchEnd: function (e) {
    if (!this.data.currentPiece || this.data.phase !== 'playing') return
    var dx = e.changedTouches[0].clientX - this.touchStartX
    var dy = e.changedTouches[0].clientY - this.touchStartY
    var absDx = Math.abs(dx), absDy = Math.abs(dy)

    if (absDx < 10 && absDy < 10) {
      this.placePiece()
      return
    }
    if (absDy > absDx && dy < -30) { this.rotatePiece(); return }
    if (absDx > absDy && dx < -30) { this.moveLeft(); return }
    if (absDx > absDy && dx > 30) { this.moveRight(); return }
    if (absDy > absDx && dy > 30) { this.moveDown(); return }
  }
})
