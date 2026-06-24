/**
 * 飞行棋棋盘数据定义
 * 定义棋盘格子坐标、类型、特殊格子位置
 */

var BOARD_WIDTH = 660
var BOARD_HEIGHT = 800
var CELL_SIZE = 50

// 四色起始位置（在主赛道上的索引）
var START_POSITIONS = {
  red: 0,
  yellow: 13,
  blue: 26,
  green: 39
}

// 主赛道52个格子坐标（十字形布局，逆时针方向）
// 从红色起点开始，依次为红→黄→蓝→绿
var MAIN_TRACK = [
  // 红色区域（底部右侧，向左移动）
  { x: 370, y: 650, type: 'start', color: 'red' },
  { x: 320, y: 650, type: 'normal' },
  { x: 270, y: 650, type: 'normal' },
  { x: 220, y: 650, type: 'normal' },
  { x: 170, y: 650, type: 'normal' },
  { x: 120, y: 650, type: 'normal' },
  { x: 120, y: 600, type: 'normal' },
  { x: 120, y: 550, type: 'normal' },
  { x: 120, y: 500, type: 'normal' },
  { x: 120, y: 450, type: 'normal' },
  { x: 120, y: 400, type: 'normal' },
  { x: 120, y: 350, type: 'normal' },
  { x: 120, y: 300, type: 'normal' },
  
  // 黄色区域（左侧，向上移动）
  { x: 120, y: 250, type: 'start', color: 'yellow' },
  { x: 120, y: 200, type: 'normal' },
  { x: 120, y: 150, type: 'normal' },
  { x: 120, y: 100, type: 'normal' },
  { x: 120, y: 50, type: 'normal' },
  { x: 170, y: 50, type: 'normal' },
  { x: 220, y: 50, type: 'normal' },
  { x: 270, y: 50, type: 'normal' },
  { x: 320, y: 50, type: 'normal' },
  { x: 370, y: 50, type: 'normal' },
  { x: 420, y: 50, type: 'normal' },
  { x: 470, y: 50, type: 'normal' },
  { x: 520, y: 50, type: 'normal' },
  
  // 蓝色区域（顶部，向右移动）
  { x: 570, y: 50, type: 'start', color: 'blue' },
  { x: 570, y: 100, type: 'normal' },
  { x: 570, y: 150, type: 'normal' },
  { x: 570, y: 200, type: 'normal' },
  { x: 570, y: 250, type: 'normal' },
  { x: 570, y: 300, type: 'normal' },
  { x: 570, y: 350, type: 'normal' },
  { x: 570, y: 400, type: 'normal' },
  { x: 570, y: 450, type: 'normal' },
  { x: 570, y: 500, type: 'normal' },
  { x: 570, y: 550, type: 'normal' },
  { x: 570, y: 600, type: 'normal' },
  { x: 570, y: 650, type: 'normal' },
  
  // 绿色区域（右侧，向下移动）
  { x: 570, y: 700, type: 'start', color: 'green' },
  { x: 520, y: 700, type: 'normal' },
  { x: 470, y: 700, type: 'normal' },
  { x: 420, y: 700, type: 'normal' },
  { x: 370, y: 700, type: 'normal' },
  { x: 320, y: 700, type: 'normal' },
  { x: 270, y: 700, type: 'normal' },
  { x: 220, y: 700, type: 'normal' },
  { x: 170, y: 700, type: 'normal' },
  { x: 120, y: 700, type: 'normal' },
  { x: 70, y: 700, type: 'normal' },
  { x: 70, y: 650, type: 'normal' },
  { x: 70, y: 600, type: 'normal' }
]

// 终点跑道（每色4格，指向中心）
var HOME_STRETCH = {
  red: [
    { x: 170, y: 600 },
    { x: 220, y: 600 },
    { x: 270, y: 600 },
    { x: 320, y: 600 }
  ],
  yellow: [
    { x: 170, y: 100 },
    { x: 170, y: 150 },
    { x: 170, y: 200 },
    { x: 170, y: 250 }
  ],
  blue: [
    { x: 520, y: 100 },
    { x: 470, y: 100 },
    { x: 420, y: 100 },
    { x: 370, y: 100 }
  ],
  green: [
    { x: 520, y: 650 },
    { x: 520, y: 600 },
    { x: 520, y: 550 },
    { x: 520, y: 500 }
  ]
}

// 停机坪位置（四角，每色4架飞机）
var HANGARS = {
  red: [
    { x: 50, y: 620 },
    { x: 100, y: 620 },
    { x: 50, y: 670 },
    { x: 100, y: 670 }
  ],
  yellow: [
    { x: 50, y: 50 },
    { x: 100, y: 50 },
    { x: 50, y: 100 },
    { x: 100, y: 100 }
  ],
  blue: [
    { x: 520, y: 50 },
    { x: 570, y: 50 },
    { x: 520, y: 100 },
    { x: 570, y: 100 }
  ],
  green: [
    { x: 520, y: 620 },
    { x: 570, y: 620 },
    { x: 520, y: 670 },
    { x: 570, y: 670 }
  ]
}

// 特殊格子定义（在主赛道上的索引）
var SPECIAL_CELLS_EASY = [
  { index: 5, type: 'jump', icon: '🚀', desc: '前进4步' },
  { index: 12, type: 'item', icon: '🎁', desc: '获得道具' },
  { index: 18, type: 'back', icon: '⬅️', desc: '后退3步' },
  { index: 25, type: 'shield', icon: '🛡️', desc: '获得护盾' },
  { index: 32, type: 'jump', icon: '🚀', desc: '前进4步' },
  { index: 38, type: 'item', icon: '🎁', desc: '获得道具' },
  { index: 44, type: 'stop', icon: '⏸️', desc: '停一回合' },
  { index: 50, type: 'jump', icon: '🚀', desc: '前进4步' }
]

var SPECIAL_CELLS_MEDIUM = [
  { index: 3, type: 'jump', icon: '🚀', desc: '前进4步' },
  { index: 7, type: 'back', icon: '⬅️', desc: '后退3步' },
  { index: 12, type: 'item', icon: '🎁', desc: '获得道具' },
  { index: 16, type: 'speed', icon: '⚡', desc: '加速+2' },
  { index: 20, type: 'shield', icon: '🛡️', desc: '获得护盾' },
  { index: 25, type: 'jump', icon: '🚀', desc: '前进4步' },
  { index: 30, type: 'back', icon: '⬅️', desc: '后退3步' },
  { index: 35, type: 'item', icon: '🎁', desc: '获得道具' },
  { index: 40, type: 'stop', icon: '⏸️', desc: '停一回合' },
  { index: 44, type: 'teleport', icon: '🌀', desc: '传送' },
  { index: 48, type: 'speed', icon: '⚡', desc: '加速+2' },
  { index: 51, type: 'jump', icon: '🚀', desc: '前进4步' }
]

var SPECIAL_CELLS_HARD = [
  { index: 2, type: 'jump', icon: '🚀', desc: '前进4步' },
  { index: 5, type: 'back', icon: '⬅️', desc: '后退3步' },
  { index: 8, type: 'slow', icon: '🐌', desc: '减速-1' },
  { index: 12, type: 'item', icon: '🎁', desc: '获得道具' },
  { index: 15, type: 'speed', icon: '⚡', desc: '加速+2' },
  { index: 19, type: 'shield', icon: '🛡️', desc: '获得护盾' },
  { index: 23, type: 'jump', icon: '🚀', desc: '前进4步' },
  { index: 27, type: 'back', icon: '⬅️', desc: '后退3步' },
  { index: 31, type: 'item', icon: '🎁', desc: '获得道具' },
  { index: 35, type: 'stop', icon: '⏸️', desc: '停一回合' },
  { index: 39, type: 'teleport', icon: '🌀', desc: '传送' },
  { index: 42, type: 'speed', icon: '⚡', desc: '加速+2' },
  { index: 46, type: 'slow', icon: '🐌', desc: '减速-1' },
  { index: 49, type: 'shield', icon: '🛡️', desc: '获得护盾' },
  { index: 50, type: 'jump', icon: '🚀', desc: '前进4步' },
  { index: 51, type: 'back', icon: '⬅️', desc: '后退3步' }
]

// 获取特殊格子配置
function getSpecialCells(difficulty) {
  switch (difficulty) {
    case 'easy':
      return SPECIAL_CELLS_EASY
    case 'medium':
      return SPECIAL_CELLS_MEDIUM
    case 'hard':
      return SPECIAL_CELLS_HARD
    default:
      return SPECIAL_CELLS_MEDIUM
  }
}

// 获取格子坐标
function getCellPosition(position, color) {
  if (position < 0) {
    return null
  }
  if (position < 52) {
    return MAIN_TRACK[position]
  }
  // 终点跑道
  var homeIndex = position - 52
  if (homeIndex < 4 && HOME_STRETCH[color]) {
    return HOME_STRETCH[color][homeIndex]
  }
  return null
}

// 获取停机坪坐标
function getHangarPosition(color, index) {
  if (HANGARS[color] && HANGARS[color][index]) {
    return HANGARS[color][index]
  }
  return { x: 0, y: 0 }
}

module.exports = {
  BOARD_WIDTH: BOARD_WIDTH,
  BOARD_HEIGHT: BOARD_HEIGHT,
  CELL_SIZE: CELL_SIZE,
  START_POSITIONS: START_POSITIONS,
  MAIN_TRACK: MAIN_TRACK,
  HOME_STRETCH: HOME_STRETCH,
  HANGARS: HANGARS,
  getSpecialCells: getSpecialCells,
  getCellPosition: getCellPosition,
  getHangarPosition: getHangarPosition
}
