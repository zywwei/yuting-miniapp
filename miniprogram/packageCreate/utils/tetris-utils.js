/**
 * 俄罗斯方块工具函数
 * 负责：计分、难度、关卡数据、格式化
 */

var LINE_SCORES = [0, 100, 300, 500, 800]

var LEVEL_SPEEDS = [800, 720, 630, 550, 470, 380, 300, 220, 150, 100]

function calculateScore(linesCleared, level, combo) {
  var base = LINE_SCORES[linesCleared] || 0
  var levelMul = 1 + level * 0.1
  var comboMul = combo > 1 ? Math.pow(1.5, combo - 1) : 1
  return Math.floor(base * levelMul * comboMul)
}

function getSpeed(level) {
  return LEVEL_SPEEDS[Math.min(level, LEVEL_SPEEDS.length - 1)]
}

function getCoins(score) {
  return Math.floor(score / 100)
}

function getLevel(totalLines) {
  return Math.min(Math.floor(totalLines / 5), 9)
}

function formatDuration(seconds) {
  var min = Math.floor(seconds / 60)
  var sec = seconds % 60
  return min + ':' + (sec < 10 ? '0' : '') + sec
}

function generateId() {
  return 'tetris_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6)
}

// 冒险模式怪物数据
var ADVENTURE_MONSTERS = [
  { chapter: 1, id: 'mushroom', name: '小蘑菇怪', emoji: '🍄', hp: 10, speed: 0, reward: 15 },
  { chapter: 2, id: 'ghost', name: '幽灵', emoji: '👻', hp: 15, speed: 1, reward: 20 },
  { chapter: 3, id: 'crab', name: '螃蟹将军', emoji: '🦀', hp: 20, speed: 1, reward: 25 },
  { chapter: 4, id: 'bat', name: '蝙蝠王', emoji: '🦇', hp: 25, speed: 2, reward: 30 },
  { chapter: 5, id: 'fire', name: '火焰精灵', emoji: '🔥', hp: 30, speed: 2, reward: 35 },
  { chapter: 6, id: 'thunder', name: '雷电鸟', emoji: '⚡', hp: 35, speed: 3, reward: 40 },
  { chapter: 7, id: 'boss', name: '大魔王', emoji: '👹', hp: 50, speed: 3, reward: 50 }
]

// 冒险模式道具数据
var ADVENTURE_ITEMS = [
  { id: 'bomb', name: '炸弹', emoji: '💣', desc: '清除底部3行', price: 30 },
  { id: 'freeze', name: '冰冻', emoji: '🧊', desc: '暂停5秒', price: 20 },
  { id: 'rainbow', name: '彩虹', emoji: '🌈', desc: '随机消除5格', price: 25 },
  { id: 'undo', name: '悔棋', emoji: '↩️', desc: '撤销上一步', price: 15 }
]

// 攻击力计算
function calculateAttack(linesCleared) {
  var attacks = [0, 1, 3, 5, 8]
  return attacks[linesCleared] || 0
}

// 拼图模式关卡数据（20关）
var PUZZLE_LEVELS = [
  {
    id: 1, name: '入门',
    desc: '拼出一个正方形',
    pieces: ['O', 'O'],
    target: [[3,0],[4,0],[3,1],[4,1]],
    targetRows: 2,
    starThresholds: [60, 30]
  },
  {
    id: 2, name: '横条',
    desc: '填满一行',
    // P1 修复：目标原在第 0 行——方块出生 y=0 且只能下移，横向 I 无法进入
    // 第 0 行（踢墙 [0,-1] 在空棋盘永不触发），数学上无解且卡死全部后续关卡。
    // 下移 1 行后经求解器验证可解（两块横向 I 精确覆盖，零溢出）。
    pieces: ['I', 'I'],
    target: [[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1]],
    targetRows: 2,
    starThresholds: [60, 30]
  },
  {
    id: 3, name: 'L形',
    desc: '拼出一个L',
    // P1 修复：原 [L,O] 组合无解——O(2×2) 无法精确贴合 L 形目标的空缺区，
    // 且目标顶行在第 0 行（横向方块不可达，见 L2 注释）。
    // 下移 1 行并改为 [I,L] 后经求解器验证可解（I 横铺底行溢出 1 格）。
    pieces: ['I', 'L'],
    target: [[0,1],[1,1],[2,1],[0,2],[0,3],[1,3],[2,3]],
    targetRows: 3,
    starThresholds: [60, 30]
  },
  {
    id: 4, name: 'T形',
    desc: '拼出一个T',
    // P1 修复：目标原在第 0 行（横向 I 无法进入第 0 行，见 L2 注释），无解。
    // 下移 1 行后经求解器验证可解。
    pieces: ['T', 'I'],
    target: [[1,1],[2,1],[3,1],[2,2],[2,3]],
    targetRows: 3,
    starThresholds: [60, 30]
  },
  {
    id: 5, name: '楼梯',
    desc: '拼出阶梯形状',
    pieces: ['S', 'Z'],
    target: [[1,0],[2,0],[0,1],[1,1],[2,1],[3,1]],
    targetRows: 2,
    starThresholds: [60, 30]
  },
  {
    id: 6, name: '小屋',
    desc: '拼出一个小房子',
    // P1 修复：原 3 块 12 格 < 目标 14 格，数学上无法填满（无解关）；
    // 补 1 块 O 至 16 格，经求解器验证存在完全覆盖序列
    pieces: ['L', 'J', 'O', 'O'],
    target: [[2,0],[3,0],[4,0],[5,0],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[1,2],[2,2],[5,2],[6,2]],
    targetRows: 3,
    starThresholds: [90, 45]
  },
  {
    id: 7, name: '十字',
    desc: '拼出十字形',
    // P1 修复：原方块序 [T,T,I] 配第 0 行顶行无解（见 L2 注释）。
    // 下移 1 行并调整顺序为 [T,I,T] 后经求解器验证可解（竖 I 立中轴）。
    pieces: ['T', 'I', 'T'],
    target: [[2,1],[3,1],[4,1],[1,2],[2,2],[3,2],[4,2],[5,2],[2,3],[3,3],[4,3]],
    targetRows: 3,
    starThresholds: [90, 45]
  },
  {
    id: 8, name: '方块阵',
    desc: '填满2x2方块',
    pieces: ['O', 'O', 'O', 'O'],
    target: [[0,0],[1,0],[2,0],[3,0],[0,1],[1,1],[2,1],[3,1],[0,2],[1,2],[2,2],[3,2],[0,3],[1,3],[2,3],[3,3]],
    targetRows: 4,
    starThresholds: [90, 45]
  },
  {
    id: 9, name: '锯齿',
    desc: '拼出锯齿形',
    pieces: ['S', 'Z', 'S'],
    target: [[1,0],[2,0],[0,1],[1,1],[2,1],[3,1],[1,2],[2,2]],
    targetRows: 3,
    starThresholds: [90, 45]
  },
  {
    id: 10, name: '火箭',
    desc: '拼出火箭形状',
    pieces: ['I', 'T', 'L', 'J'],
    target: [[3,0],[3,1],[3,2],[2,3],[3,3],[4,3],[1,4],[2,4],[4,4],[5,4],[1,5],[5,5]],
    targetRows: 6,
    starThresholds: [120, 60]
  },
  {
    id: 11, name: '钻石',
    desc: '拼出菱形',
    pieces: ['T', 'T', 'S', 'Z'],
    target: [[2,0],[3,0],[1,1],[2,1],[3,1],[4,1],[2,2],[3,2]],
    targetRows: 3,
    starThresholds: [90, 45]
  },
  {
    id: 12, name: '蛇形',
    desc: '拼出S形长蛇',
    pieces: ['S', 'S', 'Z', 'Z'],
    target: [[1,0],[2,0],[0,1],[1,1],[2,1],[3,1],[1,2],[2,2],[0,3],[1,3],[2,3],[3,3]],
    targetRows: 4,
    starThresholds: [120, 60]
  },
  {
    id: 13, name: '城堡',
    desc: '拼出城堡',
    // P1 修复：目标原在第 0 行（横向 I 无法进入第 0 行，见 L2 注释），无解。
    // 下移 1 行后经求解器验证可解。
    pieces: ['I', 'L', 'J', 'O', 'O'],
    target: [[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[7,2],[0,3],[1,3],[6,3],[7,3]],
    targetRows: 3,
    starThresholds: [120, 60]
  },
  {
    id: 14, name: '心形',
    desc: '拼出爱心',
    // P1 修复：原 [L,J,S,Z,O] 组合对心形目标无解（5 块 20 格 = 目标 20 格，
    // 需精确覆盖，穷举证明不存在）。改为 [I,I,I,T,T]（三竖 I 立心壁 + 双 T
    // 补顶部圆弧）后经求解器验证存在零溢出精确覆盖；目标同步下移 1 行
    // （顶行方块可达性，见 L2 注释）。
    pieces: ['I', 'I', 'I', 'T', 'T'],
    target: [[1,1],[2,1],[4,1],[5,1],[0,2],[1,2],[2,2],[3,2],[4,2],[5,2],[6,2],[1,3],[2,3],[3,3],[4,3],[5,3],[2,4],[3,4],[4,4],[3,5]],
    targetRows: 5,
    starThresholds: [120, 60]
  },
  {
    id: 15, name: '迷宫',
    desc: '填满迷宫通道',
    // P1 修复（二轮）：原 5 块 20 格 < 目标 22 格为无解关，改 6 块后仍无解——
    // 根因是目标顶行在第 0 行：方块出生 y=0 且只能下移，横向 I 进入第 0 行
    // 仅能靠踢墙 [0,-1]，而该踢位仅在常规踢位全部被占时触发（空棋盘永不生效）；
    // 其余 T,T,L,J 在第 0 行的覆盖上限 1+1+2+2=6 格 < 顶行 8 格，数学上无解。
    // 目标整体下移 1 行（迷宫形状不变）后，经含可达性 BFS 的求解器验证：
    // 按给定顺序放置存在解（溢出 2 格 = 24-22 预算内）。
    pieces: ['I', 'I', 'T', 'T', 'L', 'J'],
    target: [[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[6,1],[7,1],[0,2],[3,2],[7,2],[0,3],[3,3],[7,3],[0,4],[1,4],[2,4],[3,4],[4,4],[5,4],[6,4],[7,4]],
    targetRows: 4,
    starThresholds: [120, 60]
  },
  {
    id: 16, name: '飞机',
    desc: '拼出飞机',
    pieces: ['I', 'T', 'L', 'J', 'O'],
    target: [[3,0],[2,1],[3,1],[4,1],[1,2],[2,2],[3,2],[4,2],[5,2],[3,3],[3,4],[2,4],[4,4]],
    targetRows: 5,
    starThresholds: [120, 60]
  },
  {
    id: 17, name: '蝴蝶',
    desc: '拼出蝴蝶',
    pieces: ['L', 'J', 'S', 'Z', 'T', 'O'],
    target: [[0,0],[1,0],[4,0],[5,0],[0,1],[1,1],[2,1],[3,1],[4,1],[5,1],[1,2],[2,2],[3,2],[4,2],[2,3],[3,3]],
    targetRows: 4,
    starThresholds: [150, 75]
  },
  {
    id: 18, name: '龙',
    desc: '拼出龙形',
    pieces: ['L', 'J', 'S', 'Z', 'T', 'I'],
    target: [[2,0],[3,0],[1,1],[2,1],[3,1],[4,1],[0,2],[1,2],[4,2],[5,2],[1,3],[2,3],[3,3],[4,3],[2,4],[3,4],[4,4],[5,4],[3,5],[4,5]],
    targetRows: 6,
    starThresholds: [150, 75]
  },
  {
    id: 19, name: '完美',
    desc: '填满底部2行',
    pieces: ['I', 'I', 'I', 'I', 'O', 'O', 'O', 'O'],
    target: (function() {
      var t = []
      for (var x = 0; x < 10; x++) { t.push([x, 0]); t.push([x, 1]) }
      return t
    })(),
    targetRows: 2,
    starThresholds: [150, 75]
  },
  {
    id: 20, name: '终极',
    desc: '填满底部3行',
    pieces: ['I', 'I', 'I', 'T', 'S', 'Z', 'L', 'J', 'O'],
    target: (function() {
      var t = []
      for (var x = 0; x < 10; x++) { t.push([x, 0]); t.push([x, 1]); t.push([x, 2]) }
      return t
    })(),
    targetRows: 3,
    starThresholds: [180, 90]
  }
]

function getRecentRecords(count) {
  var childStorage = getApp().globalData.childStorage
  var records = childStorage.get('tetrisRecords') || []
  return records.slice(0, count || 5)
}

module.exports = {
  LINE_SCORES: LINE_SCORES,
  LEVEL_SPEEDS: LEVEL_SPEEDS,
  calculateScore: calculateScore,
  getSpeed: getSpeed,
  getCoins: getCoins,
  getLevel: getLevel,
  formatDuration: formatDuration,
  generateId: generateId,
  ADVENTURE_MONSTERS: ADVENTURE_MONSTERS,
  ADVENTURE_ITEMS: ADVENTURE_ITEMS,
  calculateAttack: calculateAttack,
  PUZZLE_LEVELS: PUZZLE_LEVELS,
  getRecentRecords: getRecentRecords
}
