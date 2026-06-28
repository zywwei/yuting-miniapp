var app = getApp()
var childStorage = app.globalData.childStorage
var audio = app.globalData.audio

var COLS = 10
var ROWS = 20
var PIECE_TYPES = ['I', 'O', 'T', 'S', 'Z', 'J', 'L']

var SHAPES = {
  I: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
  O: [[1,1],[1,1]],
  T: [[0,1,0],[1,1,1],[0,0,0]],
  S: [[0,1,1],[1,1,0],[0,0,0]],
  Z: [[1,1,0],[0,1,1],[0,0,0]],
  J: [[1,0,0],[1,1,1],[0,0,0]],
  L: [[0,0,1],[1,1,1],[0,0,0]]
}

var COLORS = {
  I: '#00E5FF',
  O: '#FFEB3B',
  T: '#E040FB',
  S: '#76FF03',
  Z: '#FF5252',
  J: '#448AFF',
  L: '#FF9800'
}

var LEVEL_SPEEDS = [800, 720, 630, 550, 470, 380, 300, 220, 140, 100]
var SCORE_TABLE = [0, 100, 300, 500, 800]

function rotateMatrix(matrix) {
  var N = matrix.length
  var result = []
  for (var i = 0; i < N; i++) {
    result[i] = []
    for (var j = 0; j < N; j++) {
      result[i][j] = matrix[N - 1 - j][i]
    }
  }
  return result
}

function getPieceGrid(type) {
  var shape = SHAPES[type]
  var color = COLORS[type]
  var grid = []
  for (var r = 0; r < 4; r++) {
    var row = []
    for (var c = 0; c < 4; c++) {
      if (shape[r] && shape[r][c]) {
        row.push(color)
      } else {
        row.push('transparent')
      }
    }
    grid.push(row)
  }
  return grid
}

function getEmptyGrid() {
  var grid = []
  for (var r = 0; r < 4; r++) {
    var row = []
    for (var c = 0; c < 4; c++) {
      row.push('transparent')
    }
    grid.push(row)
  }
  return grid
}

Page({
  data: {
    score: 0,
    level: 1,
    lines: 0,
    coins: 0,
    isPaused: false,
    isGameOver: false,
    showResumeDialog: false,
    holdGrid: [],
    nextGrids: [[], [], []],
    boardWidth: 0,
    boardHeight: 0,
    canHold: true,
    earnedCoins: 0
  },

  onLoad: function () {
    this._windowInfo = wx.getWindowInfo()
    this._deviceInfo = wx.getDeviceInfo()
    var coins = childStorage.get('gameCoins') || 0
    this.setData({ coins: coins })
    this.initCanvas()
    this.checkSaveData()
  },

  onShow: function () {
    if (this._wasPlaying && !this.data.isPaused && !this.data.isGameOver) {
      this.startGameLoop()
    }
  },

  onHide: function () {
    this._wasPlaying = this._isPlaying
    if (this._isPlaying && !this.data.isPaused) {
      this.pauseGame()
    }
  },

  onUnload: function () {
    this._unloaded = true
    this.stopGameLoop()
    if (this._clearTimeoutId) {
      clearTimeout(this._clearTimeoutId)
      this._clearTimeoutId = null
    }
    if (this._isPlaying) {
      this.saveGame()
    }
  },

  initCanvas: function (callback) {
    var that = this
    var windowInfo = this._windowInfo || wx.getWindowInfo()
    var screenWidth = windowInfo.windowWidth
    var screenHeight = windowInfo.windowHeight

    // 三段式布局：顶部信息栏 + 棋盘撑满 + 底部按钮栏
    // 顶部约13%，底部约20%，留1%安全边距，让棋盘尽量大且不溢出
    var horizontalPadding = Math.max(12, Math.floor(screenWidth * 0.04))
    var topReserve = Math.floor(screenHeight * 0.13)
    var bottomReserve = Math.floor(screenHeight * 0.20)
    var safeGap = Math.floor(screenHeight * 0.01)
    var availableHeight = screenHeight - topReserve - bottomReserve - safeGap
    var availableWidth = screenWidth - horizontalPadding * 2

    // 根据宽度和高度计算格子大小，取较小值
    var cellByWidth = Math.floor(availableWidth / COLS)
    var cellByHeight = Math.floor(availableHeight / ROWS)
    var cellSize = Math.min(cellByWidth, cellByHeight)

    var boardWidth = cellSize * COLS
    var boardHeight = cellSize * ROWS

    this.setData({
      boardWidth: boardWidth,
      boardHeight: boardHeight
    })

    var query = wx.createSelectorQuery()
    query.select('#tetris-canvas')
      .fields({ node: true, size: true })
      .exec(function (res) {
        if (that._unloaded) return
        if (!res || !res[0] || !res[0].node) return
        var canvas = res[0].node
        var ctx = canvas.getContext('2d')
        var dpr = sysInfo.pixelRatio
        canvas.width = boardWidth * dpr
        canvas.height = boardHeight * dpr
        ctx.scale(dpr, dpr)
        that._canvas = canvas
        that._ctx = ctx
        that._canvasWidth = boardWidth
        that._canvasHeight = boardHeight
        that._cellSize = cellSize
        that.draw()
        if (callback) callback()
      })
  },

  checkSaveData: function () {
    var saveData = childStorage.get('tetrisSave')
    if (saveData && saveData.board) {
      this.setData({ showResumeDialog: true })
    } else {
      this.initGame()
    }
  },

  initGame: function () {
    this._board = []
    for (var r = 0; r < ROWS; r++) {
      this._board.push(new Array(COLS).fill(null))
    }
    this._currentPiece = null
    this._holdPiece = null
    this._nextQueue = []
    this._bag = []
    this._canHold = true
    this._isPlaying = true
    this._clearingLines = null
    this._clearingFlash = false

    this.setData({
      score: 0,
      level: 1,
      lines: 0,
      earnedCoins: 0,
      isGameOver: false,
      isPaused: false
    })

    this.generateBag()
    this.spawnPiece()
    this.startGameLoop()
  },

  generateBag: function () {
    var bag = PIECE_TYPES.slice()
    for (var i = bag.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1))
      var temp = bag[i]
      bag[i] = bag[j]
      bag[j] = temp
    }
    this._nextQueue = this._nextQueue.concat(bag)
  },

  spawnPiece: function () {
    while (this._nextQueue.length < 4) {
      this.generateBag()
    }
    var type = this._nextQueue.shift()
    var shape = SHAPES[type]
    var col = Math.floor((COLS - shape[0].length) / 2)

    this._currentPiece = {
      type: type,
      shape: shape,
      row: 0,
      col: col,
      color: COLORS[type]
    }

    if (this.checkCollision(shape, 0, col)) {
      this.gameOver()
      return false
    }

    this._canHold = true
    this.updatePreviews()
    this.draw()
    return true
  },

  checkCollision: function (shape, row, col) {
    for (var r = 0; r < shape.length; r++) {
      for (var c = 0; c < shape[r].length; c++) {
        if (shape[r][c]) {
          var newRow = row + r
          var newCol = col + c
          if (newRow < 0 || newRow >= ROWS || newCol < 0 || newCol >= COLS) {
            return true
          }
          if (this._board[newRow][newCol]) {
            return true
          }
        }
      }
    }
    return false
  },

  onMoveLeft: function () {
    if (!this._currentPiece || this.data.isPaused || this.data.isGameOver) return
    if (!this.checkCollision(this._currentPiece.shape, this._currentPiece.row, this._currentPiece.col - 1)) {
      this._currentPiece.col--
      this.draw()
      audio.vibrate('light')
    }
  },

  onMoveRight: function () {
    if (!this._currentPiece || this.data.isPaused || this.data.isGameOver) return
    if (!this.checkCollision(this._currentPiece.shape, this._currentPiece.row, this._currentPiece.col + 1)) {
      this._currentPiece.col++
      this.draw()
      audio.vibrate('light')
    }
  },

  onRotate: function () {
    if (!this._currentPiece || this.data.isPaused || this.data.isGameOver) return
    if (this._currentPiece.type === 'O') return

    var rotated = rotateMatrix(this._currentPiece.shape)
    var row = this._currentPiece.row
    var col = this._currentPiece.col

    if (!this.checkCollision(rotated, row, col)) {
      this._currentPiece.shape = rotated
      this.draw()
      audio.vibrate('light')
      return
    }

    var kicks = [[0, -1], [0, 1], [-1, 0], [-1, -1], [-1, 1]]
    for (var i = 0; i < kicks.length; i++) {
      var dr = kicks[i][0]
      var dc = kicks[i][1]
      if (!this.checkCollision(rotated, row + dr, col + dc)) {
        this._currentPiece.shape = rotated
        this._currentPiece.row = row + dr
        this._currentPiece.col = col + dc
        this.draw()
        audio.vibrate('light')
        return
      }
    }
  },

  onSoftDrop: function () {
    if (!this._currentPiece || this.data.isPaused || this.data.isGameOver) return
    if (!this.checkCollision(this._currentPiece.shape, this._currentPiece.row + 1, this._currentPiece.col)) {
      this._currentPiece.row++
      this.setData({ score: this.data.score + 1 })
      this.draw()
    }
  },

  onHardDrop: function () {
    if (!this._currentPiece || this.data.isPaused || this.data.isGameOver) return
    var ghostRow = this.getGhostRow()
    var distance = ghostRow - this._currentPiece.row
    this._currentPiece.row = ghostRow
    this.setData({ score: this.data.score + distance * 2 })
    this.draw()
    this.lockPiece()
    audio.vibrate('heavy')
  },

  onHold: function () {
    if (!this._currentPiece || !this._canHold || this.data.isPaused || this.data.isGameOver) return
    var currentType = this._currentPiece.type

    if (this._holdPiece) {
      var holdType = this._holdPiece.type
      this._holdPiece = { type: currentType }
      this._currentPiece = {
        type: holdType,
        shape: SHAPES[holdType],
        row: 0,
        col: Math.floor((COLS - SHAPES[holdType][0].length) / 2),
        color: COLORS[holdType]
      }
    } else {
      this._holdPiece = { type: currentType }
      this.spawnPiece()
    }

    this._canHold = false
    this.updatePreviews()
    this.draw()
    audio.vibrate('light')
  },

  getGhostRow: function () {
    if (!this._currentPiece) return 0
    var row = this._currentPiece.row
    while (!this.checkCollision(this._currentPiece.shape, row + 1, this._currentPiece.col)) {
      row++
    }
    return row
  },

  lockPiece: function () {
    var piece = this._currentPiece
    if (!piece) return

    for (var r = 0; r < piece.shape.length; r++) {
      for (var c = 0; c < piece.shape[r].length; c++) {
        if (piece.shape[r][c]) {
          var boardRow = piece.row + r
          var boardCol = piece.col + c
          if (boardRow >= 0 && boardRow < ROWS && boardCol >= 0 && boardCol < COLS) {
            this._board[boardRow][boardCol] = piece.color
          }
        }
      }
    }

    this._currentPiece = null
    audio.vibrate('medium')

    var linesToClear = []
    for (var r = 0; r < ROWS; r++) {
      var full = true
      for (var c = 0; c < COLS; c++) {
        if (!this._board[r][c]) {
          full = false
          break
        }
      }
      if (full) {
        linesToClear.push(r)
      }
    }

    if (linesToClear.length > 0) {
      var that = this
      this.stopGameLoop()
      this.animateClear(linesToClear, function () {
        that.removeLines(linesToClear)
        that.updateScore(linesToClear.length)
        that.spawnPiece()
        that.startGameLoop()
        that.saveGame()
      })
    } else {
      this.spawnPiece()
      this.saveGame()
    }
  },

  removeLines: function (lines) {
    for (var i = lines.length - 1; i >= 0; i--) {
      this._board.splice(lines[i], 1)
    }
    while (this._board.length < ROWS) {
      this._board.unshift(new Array(COLS).fill(null))
    }
  },

  updateScore: function (count) {
    var points = SCORE_TABLE[count] * this.data.level
    var newScore = this.data.score + points
    var newLines = this.data.lines + count
    var newLevel = Math.min(Math.floor(newLines / 5) + 1, 10)
    var levelChanged = newLevel !== this.data.level

    this.setData({
      score: newScore,
      lines: newLines,
      level: newLevel
    })

    if (levelChanged) {
      this.startGameLoop()
    }

    if (count >= 4) {
      this._tetrisCount = (this._tetrisCount || 0) + 1
      audio.vibrate('heavy')
    }
  },

  animateClear: function (lines, callback) {
    var that = this
    var count = 0
    var maxCount = 6

    function flash() {
      if (that._unloaded) return
      if (count >= maxCount) {
        that._clearingLines = null
        that._clearingFlash = false
        that._clearTimeoutId = null
        callback()
        return
      }
      that._clearingFlash = count % 2 === 0
      that.draw()
      count++
      that._clearTimeoutId = setTimeout(flash, 50)
    }

    this._clearingLines = lines
    this._clearTimeoutId = null
    flash()
  },

  draw: function () {
    if (!this._ctx || !this._board) return
    var ctx = this._ctx
    var cs = this._cellSize

    // 绘制渐变背景
    var bgGradient = ctx.createLinearGradient(0, 0, 0, this._canvasHeight)
    bgGradient.addColorStop(0, '#3A2580')
    bgGradient.addColorStop(1, '#251555')
    ctx.fillStyle = bgGradient
    ctx.fillRect(0, 0, this._canvasWidth, this._canvasHeight)

    // 绘制网格 - 更淡更精致
    ctx.strokeStyle = 'rgba(255,255,255,0.06)'
    ctx.lineWidth = 1
    for (var r = 0; r <= ROWS; r++) {
      ctx.beginPath()
      ctx.moveTo(0, r * cs)
      ctx.lineTo(COLS * cs, r * cs)
      ctx.stroke()
    }
    for (var c = 0; c <= COLS; c++) {
      ctx.beginPath()
      ctx.moveTo(c * cs, 0)
      ctx.lineTo(c * cs, ROWS * cs)
      ctx.stroke()
    }

    for (var r = 0; r < ROWS; r++) {
      for (var c = 0; c < COLS; c++) {
        if (this._board[r][c]) {
          var color = this._board[r][c]
          if (this._clearingLines && this._clearingLines.indexOf(r) >= 0 && this._clearingFlash) {
            color = '#FFFFFF'
          }
          this.drawBlock(c, r, color)
        }
      }
    }

    if (this._currentPiece) {
      var ghostRow = this.getGhostRow()
      if (ghostRow !== this._currentPiece.row) {
        ctx.globalAlpha = 0.25
        var shape = this._currentPiece.shape
        for (var r = 0; r < shape.length; r++) {
          for (var c = 0; c < shape[r].length; c++) {
            if (shape[r][c]) {
              this._drawGhostBlock(this._currentPiece.col + c, ghostRow + r, this._currentPiece.color)
            }
          }
        }
        ctx.globalAlpha = 1
      }
    }

    if (this._currentPiece) {
      var shape = this._currentPiece.shape
      for (var r = 0; r < shape.length; r++) {
        for (var c = 0; c < shape[r].length; c++) {
          if (shape[r][c]) {
            this.drawBlock(this._currentPiece.col + c, this._currentPiece.row + r, this._currentPiece.color)
          }
        }
      }
    }
  },

  drawBlock: function (col, row, color) {
    var ctx = this._ctx
    var cs = this._cellSize
    var x = col * cs
    var y = row * cs
    var padding = Math.max(1, Math.floor(cs * 0.06))
    var innerSize = cs - padding * 2
    var borderRadius = Math.max(1, Math.floor(cs * 0.08))

    ctx.fillStyle = color
    this._drawRoundedRect(ctx, x + padding, y + padding, innerSize, innerSize, borderRadius)

    // 顶部和左侧高光 - 3D立体效果
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.fillRect(x + padding + 1, y + padding + 1, innerSize - 2, Math.max(2, Math.floor(cs * 0.12)))
    ctx.fillRect(x + padding + 1, y + padding + 1, Math.max(2, Math.floor(cs * 0.12)), innerSize - 2)

    // 底部和右侧阴影
    ctx.fillStyle = 'rgba(0,0,0,0.25)'
    ctx.fillRect(x + padding + 1, y + cs - padding - Math.max(2, Math.floor(cs * 0.12)) - 1, innerSize - 2, Math.max(2, Math.floor(cs * 0.12)))
    ctx.fillRect(x + cs - padding - Math.max(2, Math.floor(cs * 0.12)) - 1, y + padding + 1, Math.max(2, Math.floor(cs * 0.12)), innerSize - 2)

    // 内部高光点
    ctx.fillStyle = 'rgba(255,255,255,0.2)'
    var dotSize = Math.max(2, Math.floor(cs * 0.15))
    ctx.beginPath()
    ctx.arc(x + padding + Math.floor(cs * 0.25), y + padding + Math.floor(cs * 0.25), dotSize / 2, 0, Math.PI * 2)
    ctx.fill()
  },

  _drawRoundedRect: function (ctx, x, y, w, h, r) {
    ctx.beginPath()
    ctx.moveTo(x + r, y)
    ctx.lineTo(x + w - r, y)
    ctx.quadraticCurveTo(x + w, y, x + w, y + r)
    ctx.lineTo(x + w, y + h - r)
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h)
    ctx.lineTo(x + r, y + h)
    ctx.quadraticCurveTo(x, y + h, x, y + h - r)
    ctx.lineTo(x, y + r)
    ctx.quadraticCurveTo(x, y, x + r, y)
    ctx.closePath()
    ctx.fill()
  },

  _drawGhostBlock: function (col, row, color) {
    var ctx = this._ctx
    var cs = this._cellSize
    var x = col * cs
    var y = row * cs
    var padding = Math.max(2, Math.floor(cs * 0.1))
    var innerX = x + padding
    var innerY = y + padding
    var innerSize = cs - padding * 2
    var borderRadius = Math.max(1, Math.floor(cs * 0.08))
    var borderWidth = Math.max(1, Math.floor(cs * 0.08))

    ctx.strokeStyle = color
    ctx.lineWidth = borderWidth
    ctx.globalAlpha = 0.5
    ctx.beginPath()
    ctx.moveTo(innerX + borderRadius, innerY)
    ctx.lineTo(innerX + innerSize - borderRadius, innerY)
    ctx.quadraticCurveTo(innerX + innerSize, innerY, innerX + innerSize, innerY + borderRadius)
    ctx.lineTo(innerX + innerSize, innerY + innerSize - borderRadius)
    ctx.quadraticCurveTo(innerX + innerSize, innerY + innerSize, innerX + innerSize - borderRadius, innerY + innerSize)
    ctx.lineTo(innerX + borderRadius, innerY + innerSize)
    ctx.quadraticCurveTo(innerX, innerY + innerSize, innerX, innerY + innerSize - borderRadius)
    ctx.lineTo(innerX, innerY + borderRadius)
    ctx.quadraticCurveTo(innerX, innerY, innerX + borderRadius, innerY)
    ctx.closePath()
    ctx.stroke()
    ctx.globalAlpha = 1
  },

  updatePreviews: function () {
    var holdGrid = this._holdPiece ? getPieceGrid(this._holdPiece.type) : getEmptyGrid()
    var nextGrids = []
    for (var i = 0; i < 3; i++) {
      nextGrids.push(i < this._nextQueue.length ? getPieceGrid(this._nextQueue[i]) : getEmptyGrid())
    }
    this.setData({ holdGrid: holdGrid, nextGrids: nextGrids, canHold: this._canHold })
  },

  gameLoop: function () {
    if (!this._currentPiece || this.data.isPaused || this.data.isGameOver) return
    if (!this.checkCollision(this._currentPiece.shape, this._currentPiece.row + 1, this._currentPiece.col)) {
      this._currentPiece.row++
      this.draw()
    } else {
      this.lockPiece()
    }
  },

  startGameLoop: function () {
    var that = this
    this.stopGameLoop()
    var speed = LEVEL_SPEEDS[Math.min(this.data.level - 1, LEVEL_SPEEDS.length - 1)]
    this._gameTimer = setInterval(function () {
      that.gameLoop()
    }, speed)
  },

  stopGameLoop: function () {
    if (this._gameTimer) {
      clearInterval(this._gameTimer)
      this._gameTimer = null
    }
  },

  pauseGame: function () {
    this.stopGameLoop()
    this.setData({ isPaused: true })
    this.saveGame()
    audio.vibrate('light')
  },

  onTapPause: function () {
    if (this.data.isGameOver) return
    if (this.data.isPaused) {
      this.onTapResume()
    } else {
      this.pauseGame()
    }
  },

  onTapResume: function () {
    var that = this
    this.setData({ isPaused: false }, function () {
      that.initCanvas(function () {
        that.startGameLoop()
      })
    })
    audio.vibrate('light')
  },

  saveGame: function () {
    if (!this._isPlaying) return
    childStorage.set('tetrisSave', {
      board: this._board,
      currentPiece: this._currentPiece,
      nextQueue: this._nextQueue,
      holdPiece: this._holdPiece,
      score: this.data.score,
      level: this.data.level,
      lines: this.data.lines,
      canHold: this._canHold,
      bag: this._bag
    })
  },

  loadGame: function () {
    var save = childStorage.get('tetrisSave')
    if (!save || !save.board) return false
    // 验证 board 数据完整性
    if (save.board.length !== ROWS) return false
    for (var r = 0; r < ROWS; r++) {
      if (!save.board[r] || save.board[r].length !== COLS) return false
    }
    this._board = save.board
    this._currentPiece = save.currentPiece
    this._nextQueue = save.nextQueue || []
    this._holdPiece = save.holdPiece
    this._canHold = save.canHold !== false
    this._bag = save.bag || []
    this.setData({
      score: save.score || 0,
      level: save.level || 1,
      lines: save.lines || 0
    })
    this.updatePreviews()
    return true
  },

  clearSave: function () {
    childStorage.remove('tetrisSave')
  },

  gameOver: function () {
    this.stopGameLoop()
    this._isPlaying = false
    this.clearSave()

    var score = this.data.score
    var level = this.data.level
    var lines = this.data.lines
    var earned = Math.floor(score / 100) + level * 5

    var records = childStorage.get('tetrisRecords') || []
    records.push({
      score: score,
      level: level,
      lines: lines,
      coins: earned,
      date: Date.now(),
      mode: 'classic'
    })
    records.sort(function (a, b) { return b.score - a.score })
    if (records.length > 10) records = records.slice(0, 10)
    childStorage.set('tetrisRecords', records)

    var stats = childStorage.get('tetrisStats') || {
      totalGames: 0,
      totalLines: 0,
      totalScore: 0,
      bestScore: 0,
      bestLevel: 0,
      tetrisCount: 0
    }
    stats.totalGames = (stats.totalGames || 0) + 1
    stats.totalLines = (stats.totalLines || 0) + lines
    stats.totalScore = (stats.totalScore || 0) + score
    if (score > (stats.bestScore || 0)) stats.bestScore = score
    if (level > (stats.bestLevel || 0)) stats.bestLevel = level
    stats.tetrisCount = (stats.tetrisCount || 0) + (this._tetrisCount || 0)
    childStorage.set('tetrisStats', stats)

    var currentCoins = childStorage.get('gameCoins') || 0
    var totalCoins = currentCoins + earned
    childStorage.set('gameCoins', totalCoins)

    this.setData({ isGameOver: true, earnedCoins: earned, coins: totalCoins })
    audio.vibrate('heavy')
  },

  restartGame: function () {
    var that = this
    this.clearSave()
    this.setData({ isGameOver: false, earnedCoins: 0 }, function () {
      that.initCanvas(function () {
        that.initGame()
      })
    })
  },

  onTapResumeGame: function () {
    var that = this
    this.setData({ showResumeDialog: false }, function () {
      that.initCanvas(function () {
        if (that.loadGame()) {
          that._isPlaying = true
          that.updatePreviews()
          that.startGameLoop()
          that.draw()
        } else {
          that.initGame()
        }
      })
    })
  },

  onTapNewGame: function () {
    var that = this
    this.setData({ showResumeDialog: false }, function () {
      that.clearSave()
      that.initCanvas(function () {
        that.initGame()
      })
    })
  },

  onCanvasTouchStart: function (e) {
    this._touchStartX = e.touches[0].clientX
    this._touchStartY = e.touches[0].clientY
    this._touchStartTime = Date.now()
  },

  onCanvasTouchEnd: function (e) {
    if (this.data.isPaused || this.data.isGameOver) return
    var dx = e.changedTouches[0].clientX - this._touchStartX
    var dy = e.changedTouches[0].clientY - this._touchStartY
    var dt = Date.now() - this._touchStartTime

    if (Math.abs(dx) < 10 && Math.abs(dy) < 10 && dt < 300) {
      this.onRotate()
    } else if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 30) this.onMoveRight()
      else if (dx < -30) this.onMoveLeft()
    } else {
      if (dy > 30) this.onSoftDrop()
      else if (dy < -30) this.onHardDrop()
    }
  },

  goBack: function () {
    if (this._isPlaying) {
      this.saveGame()
    }
    wx.navigateBack()
  },

  noop: function () {}
})
