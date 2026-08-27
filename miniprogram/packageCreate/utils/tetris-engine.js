/**
 * 俄罗斯方块核心引擎
 * 负责：方块定义、旋转、碰撞检测、消行、Canvas渲染
 */

var COLS = 10
var ROWS = 20

// 7种标准方块，每种有4个旋转状态的相对坐标（相对于bounding box左上角）
var SHAPES = {
  I: [
    [[0,1],[1,1],[2,1],[3,1]],
    [[2,0],[2,1],[2,2],[2,3]],
    [[0,2],[1,2],[2,2],[3,2]],
    [[1,0],[1,1],[1,2],[1,3]]
  ],
  O: [
    [[0,0],[1,0],[0,1],[1,1]],
    [[0,0],[1,0],[0,1],[1,1]],
    [[0,0],[1,0],[0,1],[1,1]],
    [[0,0],[1,0],[0,1],[1,1]]
  ],
  T: [
    [[1,0],[0,1],[1,1],[2,1]],
    [[1,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[2,1],[1,2]],
    [[1,0],[0,1],[1,1],[1,2]]
  ],
  S: [
    [[1,0],[2,0],[0,1],[1,1]],
    [[1,0],[1,1],[2,1],[2,2]],
    [[1,1],[2,1],[0,2],[1,2]],
    [[0,0],[0,1],[1,1],[1,2]]
  ],
  Z: [
    [[0,0],[1,0],[1,1],[2,1]],
    [[2,0],[1,1],[2,1],[1,2]],
    [[0,1],[1,1],[1,2],[2,2]],
    [[1,0],[0,1],[1,1],[0,2]]
  ],
  J: [
    [[0,0],[0,1],[1,1],[2,1]],
    [[1,0],[2,0],[1,1],[1,2]],
    [[0,1],[1,1],[2,1],[2,2]],
    [[1,0],[1,1],[0,2],[1,2]]
  ],
  L: [
    [[2,0],[0,1],[1,1],[2,1]],
    [[1,0],[1,1],[1,2],[2,2]],
    [[0,1],[1,1],[2,1],[0,2]],
    [[0,0],[1,0],[1,1],[1,2]]
  ]
}

var COLORS = {
  I: '#00BCD4',
  O: '#FFEB3B',
  T: '#9C27B0',
  S: '#4CAF50',
  Z: '#F44336',
  J: '#2196F3',
  L: '#FF9800'
}

// 墙踢偏移（简化版SRS）
var WALL_KICKS = [[0,0], [-1,0], [1,0], [0,-1], [-1,-1]]

var ALL_TYPES = ['I','O','T','S','Z','J','L']

function createEmptyBoard() {
  var board = []
  for (var y = 0; y < ROWS; y++) {
    var row = []
    for (var x = 0; x < COLS; x++) {
      row.push(0)
    }
    board.push(row)
  }
  return board
}

function getBlocks(type, state, x, y) {
  var shape = SHAPES[type][state % SHAPES[type].length]
  var blocks = []
  for (var i = 0; i < shape.length; i++) {
    blocks.push([shape[i][0] + x, shape[i][1] + y])
  }
  return blocks
}

// P1 修复：新增可选 rows 参数——puzzle 模式棋盘仅 10 行（页面自建 ROWS 常量），
// 固定用常量 ROWS(20) 判底界会索引到 board[10..] 的 undefined 行而抛 TypeError
function hasCollision(board, blocks, rows) {
  var maxRows = rows || ROWS
  for (var i = 0; i < blocks.length; i++) {
    var bx = blocks[i][0]
    var by = blocks[i][1]
    if (bx < 0 || bx >= COLS || by >= maxRows) return true
    if (by >= 0 && board[by][bx] !== 0) return true
  }
  return false
}

function tryRotate(board, type, state, x, y, clockwise, rows) {
  var newState = clockwise
    ? (state + 1) % SHAPES[type].length
    : (state + SHAPES[type].length - 1) % SHAPES[type].length

  for (var i = 0; i < WALL_KICKS.length; i++) {
    var kx = WALL_KICKS[i][0]
    var ky = WALL_KICKS[i][1]
    var blocks = getBlocks(type, newState, x + kx, y + ky)
    if (!hasCollision(board, blocks, rows)) {
      return { state: newState, x: x + kx, y: y + ky, blocks: blocks }
    }
  }
  return null
}

function clearLines(board) {
  var clearedRows = []
  var newBoard = []
  for (var y = 0; y < ROWS; y++) {
    var full = true
    for (var x = 0; x < COLS; x++) {
      if (board[y][x] === 0) { full = false; break }
    }
    if (full) {
      clearedRows.push(y)
    } else {
      newBoard.push(board[y].slice())
    }
  }
  while (newBoard.length < ROWS) {
    var emptyRow = []
    for (var ex = 0; ex < COLS; ex++) emptyRow.push(0)
    newBoard.unshift(emptyRow)
  }
  return { board: newBoard, lines: clearedRows.length, clearedRows: clearedRows }
}

function lockPiece(board, blocks, color) {
  var newBoard = []
  for (var y = 0; y < ROWS; y++) {
    newBoard.push(board[y].slice())
  }
  for (var i = 0; i < blocks.length; i++) {
    var bx = blocks[i][0]
    var by = blocks[i][1]
    if (by >= 0 && by < ROWS && bx >= 0 && bx < COLS) {
      newBoard[by][bx] = color
    }
  }
  return newBoard
}

function getGhostY(board, type, state, x, y) {
  var ghostY = y
  while (true) {
    var nextBlocks = getBlocks(type, state, x, ghostY + 1)
    if (hasCollision(board, nextBlocks)) break
    ghostY++
  }
  return ghostY
}

function canSpawn(board, type) {
  var blocks = getBlocks(type, 0, 3, 0)
  return !hasCollision(board, blocks)
}

function randomBag() {
  var bag = ALL_TYPES.slice()
  for (var i = bag.length - 1; i > 0; i--) {
    var j = Math.floor(Math.random() * (i + 1))
    var tmp = bag[i]; bag[i] = bag[j]; bag[j] = tmp
  }
  return bag
}

function createEngine() {
  return {
    board: createEmptyBoard(),
    currentPiece: null,
    nextQueue: [],
    heldPiece: null,
    canHold: true,
    bag: [],
    score: 0,
    lines: 0,
    level: 0,
    combo: 0,
    tetrisCount: 0,
    gameOver: false,
    paused: false
  }
}

function getNextFromBag(engine) {
  if (engine.bag.length === 0) {
    engine.bag = randomBag()
  }
  return engine.bag.pop()
}

function fillNextQueue(engine) {
  while (engine.nextQueue.length < 3) {
    engine.nextQueue.push(getNextFromBag(engine))
  }
}

function spawnPiece(engine) {
  fillNextQueue(engine)
  var type = engine.nextQueue.shift()
  fillNextQueue(engine)

  if (!canSpawn(engine.board, type)) {
    engine.gameOver = true
    return false
  }

  engine.currentPiece = {
    type: type,
    state: 0,
    x: 3,
    y: 0
  }
  engine.canHold = true
  return true
}

function moveLeft(engine) {
  if (!engine.currentPiece || engine.gameOver || engine.paused) return false
  var p = engine.currentPiece
  var blocks = getBlocks(p.type, p.state, p.x - 1, p.y)
  if (!hasCollision(engine.board, blocks)) {
    p.x--
    return true
  }
  return false
}

function moveRight(engine) {
  if (!engine.currentPiece || engine.gameOver || engine.paused) return false
  var p = engine.currentPiece
  var blocks = getBlocks(p.type, p.state, p.x + 1, p.y)
  if (!hasCollision(engine.board, blocks)) {
    p.x++
    return true
  }
  return false
}

function moveDown(engine) {
  if (!engine.currentPiece || engine.gameOver || engine.paused) return false
  var p = engine.currentPiece
  var blocks = getBlocks(p.type, p.state, p.x, p.y + 1)
  if (!hasCollision(engine.board, blocks)) {
    p.y++
    return true
  }
  return false
}

function hardDrop(engine) {
  if (!engine.currentPiece || engine.gameOver || engine.paused) return 0
  var p = engine.currentPiece
  var dropDistance = 0
  while (true) {
    var blocks = getBlocks(p.type, p.state, p.x, p.y + 1)
    if (hasCollision(engine.board, blocks)) break
    p.y++
    dropDistance++
  }
  return dropDistance
}

function rotate(engine, clockwise) {
  if (!engine.currentPiece || engine.gameOver || engine.paused) return false
  var p = engine.currentPiece
  var result = tryRotate(engine.board, p.type, p.state, p.x, p.y, clockwise)
  if (result) {
    p.state = result.state
    p.x = result.x
    p.y = result.y
    return true
  }
  return false
}

function holdPiece(engine) {
  if (!engine.currentPiece || !engine.canHold || engine.gameOver || engine.paused) return false
  var currentType = engine.currentPiece.type
  if (engine.heldPiece) {
    var heldType = engine.heldPiece
    engine.heldPiece = currentType
    if (!canSpawn(engine.board, heldType)) {
      engine.gameOver = true
      return false
    }
    engine.currentPiece = {
      type: heldType,
      state: 0,
      x: 3,
      y: 0
    }
  } else {
    engine.heldPiece = currentType
    spawnPiece(engine)
  }
  engine.canHold = false
  return true
}

function lockAndClear(engine) {
  var p = engine.currentPiece
  if (!p) return { lines: 0, gameOver: false }
  var blocks = getBlocks(p.type, p.state, p.x, p.y)
  engine.board = lockPiece(engine.board, blocks, COLORS[p.type])
  engine.currentPiece = null
  var result = clearLines(engine.board)
  engine.board = result.board
  engine.lines += result.lines
  if (result.lines > 0) {
    engine.combo++
    if (result.lines === 4) {
      engine.tetrisCount = (engine.tetrisCount || 0) + 1
    }
  } else {
    engine.combo = 0
  }
  var spawned = spawnPiece(engine)
  if (!spawned) {
    engine.gameOver = true
  }
  return { lines: result.lines, gameOver: engine.gameOver, clearedRows: result.clearedRows }
}

function getCurrentBlocks(engine) {
  if (!engine.currentPiece) return []
  var p = engine.currentPiece
  return getBlocks(p.type, p.state, p.x, p.y)
}

function getGhostBlocks(engine) {
  if (!engine.currentPiece) return []
  var p = engine.currentPiece
  var ghostY = getGhostY(engine.board, p.type, p.state, p.x, p.y)
  return getBlocks(p.type, p.state, p.x, ghostY)
}

module.exports = {
  COLS: COLS,
  ROWS: ROWS,
  SHAPES: SHAPES,
  COLORS: COLORS,
  ALL_TYPES: ALL_TYPES,
  WALL_KICKS: WALL_KICKS,
  createEmptyBoard: createEmptyBoard,
  getBlocks: getBlocks,
  hasCollision: hasCollision,
  tryRotate: tryRotate,
  clearLines: clearLines,
  lockPiece: lockPiece,
  getGhostY: getGhostY,
  canSpawn: canSpawn,
  randomBag: randomBag,
  createEngine: createEngine,
  spawnPiece: spawnPiece,
  moveLeft: moveLeft,
  moveRight: moveRight,
  moveDown: moveDown,
  hardDrop: hardDrop,
  rotate: rotate,
  holdPiece: holdPiece,
  lockAndClear: lockAndClear,
  getCurrentBlocks: getCurrentBlocks,
  getGhostBlocks: getGhostBlocks
}
