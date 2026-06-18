// 刷牙计时页 - 常量配置

// 6个刷牙区域
const BRUSH_AREAS = [
  { name: '左上', emoji: '🦷', duration: 20, color: '#FF9AAB' },
  { name: '上中', emoji: '🦷', duration: 20, color: '#FFB74D' },
  { name: '右上', emoji: '🦷', duration: 20, color: '#81C784' },
  { name: '右下', emoji: '🦷', duration: 20, color: '#4FC3F7' },
  { name: '下中', emoji: '🦷', duration: 20, color: '#BA68C8' },
  { name: '左下', emoji: '🦷', duration: 20, color: '#FF8A80' }
]

// 刷牙小知识（每完成一个区域显示一条）
const BRUSHING_TIPS = [
  '💡 刷牙要刷2分钟哦~',
  '💡 记得刷舌头表面~',
  '💡 上下刷比左右刷更好~',
  '💡 饭后30分钟刷牙最好~',
  '💡 用温水刷牙更舒服~',
  '💡 别忘了刷里面的牙齿~',
  '💡 每3个月要换牙刷哦~',
  '💡 早晚各刷一次牙~',
  '💡 刷牙不要太用力哦~',
  '💡 选择含氟牙膏更好~',
  '💡 刷完牙不要漱太多次~',
  '💡 牙刷要保持干燥~',
  '💡 少吃糖果保护牙齿~',
  '💡 定期看牙医很重要~',
  '💡 刷牙时照镜子更仔细~',
  '💡 牙齿也要做运动（咬苹果）~',
  '💡 好好刷牙牙齿会变白~',
  '💡 刷牙是世界上最简单的事~',
  '💡 坚持刷牙的小朋友最棒~',
  '💡 牙齿健康笑容更灿烂~'
]

// 早上和晚上的不同主题
const THEMES = {
  morning: {
    bg: 'linear-gradient(180deg, #FFE4EC 0%, #FFF0F5 30%, #FFF5F8 60%, #FFEEF2 100%)',
    greeting: '☀️ 早上好，钰婷！',
    emoji: '🌞',
    tip: '新的一天从刷牙开始~'
  },
  evening: {
    bg: 'linear-gradient(180deg, #F8E8EE 0%, #FFF0F5 30%, #FFF5F8 60%, #F5E6EE 100%)',
    greeting: '🌙 晚上好，钰婷！',
    emoji: '🌜',
    tip: '刷完牙睡觉，牙齿更健康~'
  }
}

const REWARD_TEXTS = ['准备开始！', '刷得好认真～', '继续加油！', '越来越棒！', '快完成啦！', '太完美了！']
const COMPLETED_TEXTS = [
  '牙齿变得好白好亮！✨',
  '刷得干干净净，真厉害！💪',
  '小牙齿在说谢谢钰婷！🦷',
  '今天又是棒棒的一天！🌈'
]
const CHEER_LEFT = ['加油', '好棒', '厉害', '继续', '加油', '棒棒']
const CHEER_RIGHT = ['真乖', '认真', '好快', '漂亮', '太强', '赞赞']

// 进度条颜色模式
const RING_MODES = [
  { name: '默认', colors: ['#FF9AAB', '#FFB74D', '#81C784'] },
  { name: '彩虹', colors: ['#FF6B8A', '#FFB74D', '#FFEB3B', '#81C784', '#4FC3F7', '#BA68C8', '#FF4081'] },
  { name: '海洋', colors: ['#4FC3F7', '#29B6F6', '#0288D1', '#01579B', '#00BCD4'] },
  { name: '森林', colors: ['#81C784', '#66BB6A', '#4CAF50', '#388E3C', '#2E7D32'] },
  { name: '夕阳', colors: ['#FF9AAB', '#FF6B8A', '#FF4081', '#E91E63', '#C2185B'] },
  { name: '星空', colors: ['#BA68C8', '#9C27B0', '#7B1FA2', '#6A1B9A', '#4A148C'] },
  { name: '糖果', colors: ['#FF9AAB', '#FFB6C1', '#FF69B4', '#FF1493', '#DB7093'] },
  { name: '金色', colors: ['#FFD700', '#FFC107', '#FF9800', '#FF5722', '#E64A19'] }
]

// 公主鼓励语（随机出现在动物气泡中）
const PRINCESS_CHEER = [
  { emoji: '👑', text: '艾莎说：你很棒！' },
  { emoji: '❄️', text: '冰雪奇缘加油！' },
  { emoji: '👸', text: '小公主加油！' },
  { emoji: '🦄', text: '独角兽说：真厉害！' },
  { emoji: '🐷', text: '佩奇说：太棒了！' },
  { emoji: '🐽', text: '乔治说：哇哦~' },
  { emoji: '🏰', text: '城堡里的公主~' },
  { emoji: '✨', text: '魔法闪闪亮~' }
]

// 公主角色列表
const PRINCESS_CHARACTERS = [
  // 小猪佩奇家族
  { id: 'peppa', emoji: '🐷', name: '佩奇', bubble: '刷得真棒！', color: '#FFB6C1', group: 'peppa' },
  { id: 'george', emoji: '🐽', name: '乔治', bubble: '加油加油！', color: '#FFB6C1', group: 'peppa' },
  { id: 'dinosaur', emoji: '🦕', name: '乔治的恐龙', bubble: '刷得好认真！', color: '#98FB98', group: 'dinosaur' },
  { id: 'daddy_pig', emoji: '🐽', name: '猪爸爸', bubble: '宝贝真棒！', color: '#FFB6C1', group: 'peppa' },
  { id: 'mummy_pig', emoji: '🐽', name: '猪妈妈', bubble: '继续加油哦！', color: '#FFB6C1', group: 'peppa' },
  { id: 'suzy', emoji: '🐑', name: '小羊苏西', bubble: '刷得真干净！', color: '#FFFFFF', group: 'peppa' },
  { id: 'danny', emoji: '🐶', name: '小狗丹尼', bubble: '好厉害呀！', color: '#DEB887', group: 'peppa' },
  { id: 'emily', emoji: '🐘', name: '小象艾米丽', bubble: '越来越棒！', color: '#D3D3D3', group: 'peppa' },
  // 迪士尼公主
  { id: 'elsa', emoji: '👸', name: '艾莎', bubble: '刷得闪闪亮！', color: '#87CEEB', group: 'disney' },
  { id: 'anna', emoji: '👸', name: '安娜', bubble: '加油小公主！', color: '#FFB74D', group: 'disney' },
  { id: 'rapunzel', emoji: '👸', name: '乐佩', bubble: '牙齿好白呀！', color: '#FFD700', group: 'disney' },
  { id: 'ariel', emoji: '🧜‍♀️', name: '爱丽儿', bubble: '刷得真认真！', color: '#4FC3F7', group: 'disney' },
  { id: 'belle', emoji: '👸', name: '贝儿', bubble: '好棒好棒！', color: '#FFD700', group: 'disney' },
  { id: 'cinderella', emoji: '👸', name: '灰姑娘', bubble: '继续加油！', color: '#87CEEB', group: 'disney' },
  { id: 'snow_white', emoji: '👸', name: '白雪公主', bubble: '刷得真干净！', color: '#FFB6C1', group: 'disney' },
  // 可爱动物
  { id: 'unicorn', emoji: '🦄', name: '独角兽', bubble: '闪闪发光！', color: '#DDA0DD', group: 'animal' },
  { id: 'butterfly', emoji: '🦋', name: '蝴蝶仙子', bubble: '翩翩起舞！', color: '#98FB98', group: 'animal' },
  { id: 'fairy', emoji: '🧚', name: '花仙子', bubble: '花花世界！', color: '#FF9AAB', group: 'animal' },
  { id: 'bunny', emoji: '🐰', name: '小白兔', bubble: '蹦蹦跳跳！', color: '#FFFFFF', group: 'animal' },
  { id: 'kitty', emoji: '🐱', name: '小猫咪', bubble: '喵喵加油！', color: '#FFB74D', group: 'animal' },
  { id: 'puppy', emoji: '🐶', name: '小狗狗', bubble: '汪汪加油！', color: '#DEB887', group: 'animal' },
  { id: 'bear', emoji: '🐻', name: '小熊', bubble: '抱抱加油！', color: '#8B4513', group: 'animal' },
  { id: 'panda', emoji: '🐼', name: '大熊猫', bubble: '竹子加油！', color: '#000000', group: 'animal' },
  { id: 'koala', emoji: '🐨', name: '考拉', bubble: '呼呼加油！', color: '#A9A9A9', group: 'animal' },
  // 海洋生物
  { id: 'mermaid', emoji: '🧜‍♀️', name: '美人鱼', bubble: '海底加油！', color: '#4FC3F7', group: 'ocean' },
  { id: 'fish', emoji: '🐠', name: '小丑鱼', bubble: '游啊游加油！', color: '#FF6347', group: 'ocean' },
  { id: 'dolphin', emoji: '🐬', name: '海豚', bubble: '跳跃加油！', color: '#4FC3F7', group: 'ocean' },
  { id: 'turtle', emoji: '🐢', name: '小海龟', bubble: '慢慢加油！', color: '#3CB371', group: 'ocean' },
  { id: 'starfish', emoji: '⭐', name: '海星星', bubble: '闪闪加油！', color: '#FFEB3B', group: 'ocean' },
  // 其他可爱角色
  { id: 'princess', emoji: '👑', name: '小公主', bubble: '加油加油！', color: '#FFD700', group: 'other' },
  { id: 'angel', emoji: '👼', name: '小天使', bubble: '祝福加油！', color: '#FFFFFF', group: 'other' },
  { id: 'fairy2', emoji: '✨', name: '魔法精灵', bubble: '魔法加油！', color: '#FFEB3B', group: 'other' },
  { id: 'clown', emoji: '🤡', name: '小丑', bubble: '哈哈加油！', color: '#FF6347', group: 'other' },
  { id: 'robot', emoji: '🤖', name: '机器人', bubble: '滴滴加油！', color: '#A9A9A9', group: 'other' },
  { id: 'astronaut', emoji: '👨‍🚀', name: '宇航员', bubble: '飞向太空！', color: '#FFFFFF', group: 'other' },
  { id: 'ninja', emoji: '🥷', name: '小忍者', bubble: '嘿哈加油！', color: '#2F4F4F', group: 'other' }
]

// 角色分组对应的点击反应
const REACTION_MAP = {
  peppa: [
    { emoji: '💪', text: '刷得真棒！' },
    { emoji: '⭐', text: '好厉害呀！' },
    { emoji: '🌟', text: '继续加油！' },
    { emoji: '💖', text: '越来越棒！' },
    { emoji: '✨', text: '刷得好认真！' }
  ],
  dinosaur: [
    { emoji: '🦕', text: '嗷呜~真棒！' },
    { emoji: '🦖', text: '吼~好厉害！' },
    { emoji: '💪', text: '加油加油！' },
    { emoji: '⭐', text: '刷得真好！' },
    { emoji: '🌟', text: '继续加油！' }
  ],
  disney: [
    { emoji: '✨', text: '闪闪发光！' },
    { emoji: '💖', text: '好棒好棒！' },
    { emoji: '👑', text: '小公主加油！' },
    { emoji: '🌟', text: '越来越棒！' },
    { emoji: '💫', text: '刷得真认真！' }
  ],
  animal: [
    { emoji: '🐾', text: '爪爪拍拍！' },
    { emoji: '💕', text: '好可爱呀！' },
    { emoji: '🌈', text: '彩虹加油！' },
    { emoji: '✨', text: '闪闪发光！' },
    { emoji: '💖', text: '爱你爱你！' }
  ],
  ocean: [
    { emoji: '🌊', text: '浪花加油！' },
    { emoji: '🐚', text: '贝壳加油！' },
    { emoji: '🐠', text: '游啊游加油！' },
    { emoji: '🐬', text: '跳跃加油！' },
    { emoji: '⭐', text: '闪闪加油！' }
  ],
  other: [
    { emoji: '💪', text: '刷得真棒！' },
    { emoji: '⭐', text: '好厉害呀！' },
    { emoji: '🌟', text: '继续加油！' },
    { emoji: '💖', text: '越来越棒！' },
    { emoji: '✨', text: '刷得好认真！' }
  ]
}

const BUBBLE_LIST = [
  { x: 15, delay: 0, size: 28, emoji: '🫧' },
  { x: 30, delay: 0.4, size: 22, emoji: '✨' },
  { x: 50, delay: 0.8, size: 26, emoji: '💫' },
  { x: 70, delay: 1.2, size: 20, emoji: '🫧' },
  { x: 85, delay: 0.6, size: 24, emoji: '⭐' },
  { x: 40, delay: 1.5, size: 18, emoji: '🌟' },
  { x: 60, delay: 1.8, size: 22, emoji: '💖' },
  { x: 25, delay: 2.0, size: 20, emoji: '🫧' }
]

// 刷牙前小游戏：可点击赶走的脏东西
const PRE_GERM_TYPES = [
  { emoji: '🦠', name: '小细菌', points: 3 },
  { emoji: '🐛', name: '小虫虫', points: 3 },
  { emoji: '👾', name: '小菌斑', points: 3 },
  { emoji: '🍬', name: '小糖糖', points: 2 }
]

// 刷牙后贴纸装饰
const STICKERS = [
  { id: 'crown', emoji: '👑' },
  { id: 'bow', emoji: '🎀' },
  { id: 'flower', emoji: '🌸' },
  { id: 'heart', emoji: '💖' },
  { id: 'star', emoji: '⭐' },
  { id: 'gem', emoji: '💎' }
]

// 女孩喜欢的泡泡元素（刷牙时随机出现）
const GIRL_BUBBLES = ['👑', '👸', '🦄', '🐷', '🦋', '🌸', '💖', '💝', '💕', '💗', '✨', '⭐', '🌟', '💫', '🎀', '🎊']

// 牙齿分区上的细菌类型
const ZONE_GERM_TYPES = ['🦠', '🍬', '🍭', '🍰', '🐛', '👾']

// 战斗系统配置
const BATTLE_CONFIG = {
  // 暴击系统
  CRIT_RATE: 0.15,           // 基础暴击率 15%
  CRIT_MULTIPLIER: 2,        // 暴击伤害倍数
  CRIT_TEXT: '暴击！',        // 暴击提示文字

  // 连击系统
  COMBO_TIMEOUT: 3000,       // 连击超时时间（毫秒）
  COMBO_BONUS_PER_HIT: 0.05, // 每连击+5%伤害
  COMBO_MAX_BONUS: 0.5,      // 最大连击加成 50%

  // 怪物状态
  ENEMY_ANGER_THRESHOLD: 0.3, // 血量低于30%进入愤怒状态

  // 积分配置
  AREA_COMPLETE_POINTS: 10,  // 区域完成基础积分
  GERM_BONUS_POINTS: 5,      // 每个细菌额外积分
  ATTACK_BASE_POINTS: 10,    // 基础攻击积分
  CRIT_ATTACK_POINTS: 20,    // 暴击攻击积分

  // 小怪物配置
  MINION_COUNT: 3,           // 每波小怪物数量
  MINION_HP: 1,              // 小怪物血量（1下打死）

  // 小怪物类型
  MINION_TYPES: [
    { emoji: '🦠', name: '小细菌', color: '#4CAF50' },
    { emoji: '🐛', name: '小虫虫', color: '#FF9800' },
    { emoji: '👾', name: '小菌斑', color: '#9C27B0' },
    { emoji: '🍬', name: '小糖糖', color: '#E91E63' },
    { emoji: '🍭', name: '棒棒糖', color: '#FF5722' },
    { emoji: '🍰', name: '小蛋糕', color: '#795548' }
  ],

  // 伤害类型
  DAMAGE_TYPES: {
    NORMAL: { color: '#FF6B8A', size: 48, text: '' },
    CRIT: { color: '#FFD700', size: 64, text: '暴击！' },
    COMBO: { color: '#FF4081', size: 56, text: '连击！' }
  }
}

// ===== 主线故事系统 =====

// 故事章节定义（7个章节，每周不重复）
const CHAPTERS = [
  {
    id: 1,
    name: '糖果森林大冒险',
    emoji: '🍬',
    description: '糖糖怪占领了糖果森林，牙齿们都在哭泣！快去拯救它们吧！',
    bg: 'linear-gradient(180deg, #FFE4EC 0%, #FFF5F8 100%)',
    enemy: {
      id: 'candy_monster',
      name: '糖糖怪',
      emoji: '🍬',
      hp: 6,
      description: '用甜食攻击牙齿的坏家伙！',
      defeatText: '糖糖怪被打败啦！牙齿们开心地跳舞~'
    },
    rewards: { points: 50, exp: 30 }
  },
  {
    id: 2,
    name: '细菌沼泽探险',
    emoji: '🦠',
    description: '细菌们在沼泽里建了大本营，准备偷袭牙齿城堡！',
    bg: 'linear-gradient(180deg, #E8F5E9 0%, #F1F8E9 100%)',
    enemy: {
      id: 'germ_king',
      name: '细菌大王',
      emoji: '👾',
      hp: 6,
      description: '统领所有细菌的首领！',
      defeatText: '细菌大王逃跑了！沼泽恢复了平静~'
    },
    rewards: { points: 60, exp: 40 }
  },
  {
    id: 3,
    name: '牙菌王国保卫战',
    emoji: '👑',
    description: '牙菌斑大军来袭，牙菌王国危在旦夕！',
    bg: 'linear-gradient(180deg, #E3F2FD 0%, #E8EAF6 100%)',
    enemy: {
      id: 'plaque_army',
      name: '牙菌斑将军',
      emoji: '🛡️',
      hp: 6,
      description: '顽固的牙菌斑军团首领！',
      defeatText: '牙菌斑将军投降了！牙菌王国恢复和平~'
    },
    rewards: { points: 70, exp: 50 }
  },
  {
    id: 4,
    name: '龋齿洞穴大作战',
    emoji: '🕳️',
    description: '龋齿怪在洞穴里制造蛀牙，快去阻止它！',
    bg: 'linear-gradient(180deg, #FFF3E0 0%, #FFE0B2 100%)',
    enemy: {
      id: 'cavity_beast',
      name: '龋齿怪',
      emoji: '😈',
      hp: 6,
      description: '专门制造蛀牙的坏蛋！',
      defeatText: '龋齿怪被消灭了！牙齿再也不怕蛀牙啦~'
    },
    rewards: { points: 80, exp: 60 }
  },
  {
    id: 5,
    name: '口气迷雾森林',
    emoji: '💨',
    description: '口气怪释放了迷雾，牙齿们看不清路了！',
    bg: 'linear-gradient(180deg, #F3E5F5 0%, #E1BEE7 100%)',
    enemy: {
      id: 'breath_dragon',
      name: '口气恶龙',
      emoji: '🐉',
      hp: 6,
      description: '用臭气攻击的恶龙！',
      defeatText: '口气恶龙飞走了！牙齿们又能自由呼吸啦~'
    },
    rewards: { points: 90, exp: 70 }
  },
  {
    id: 6,
    name: '甜食陷阱谷',
    emoji: '🍭',
    description: '棒棒糖精在山谷设下甜蜜陷阱，牙齿勇士们小心！',
    bg: 'linear-gradient(180deg, #FFEBEE 0%, #FFCDD2 100%)',
    enemy: {
      id: 'lollipop_spirit',
      name: '棒棒糖精',
      emoji: '🍭',
      hp: 6,
      description: '用甜蜜诱惑牙齿的狡猾家伙！',
      defeatText: '棒棒糖精的陷阱被打破啦！牙齿们不再被诱惑~'
    },
    rewards: { points: 95, exp: 75 }
  },
  {
    id: 7,
    name: '终极挑战：牙齿守护者',
    emoji: '🏆',
    description: '最终挑战！蛀牙魔王亲自出马，证明你是真正的牙齿守护者！',
    bg: 'linear-gradient(180deg, #FFD700 0%, #FFA500 100%)',
    enemy: {
      id: 'final_boss',
      name: '蛀牙魔王',
      emoji: '👹',
      hp: 6,
      description: '所有牙齿敌人的首领！',
      defeatText: '蛀牙魔王被打败了！你是真正的牙齿守护者！🏆'
    },
    rewards: { points: 100, exp: 80 }
  }
]

// 故事对话
const STORY_DIALOGUES = {
  chapter_start: [
    { emoji: '👸', text: '牙齿王国需要你！', delay: 0 },
    { emoji: '🦷', text: '快拿起牙刷出发吧！', delay: 800 }
  ],
  chapter_victory: [
    { emoji: '🎉', text: '太棒啦！', delay: 0 },
    { emoji: '⭐', text: '牙齿们得救了！', delay: 600 }
  ],
  area_complete: [
    '又前进了一步！',
    '牙齿们在加油！',
    '继续战斗！',
    '胜利在望！'
  ],
  enemy_taunt: [
    '你能打败我吗？',
    '嘿嘿，我可不怕你！',
    '放弃吧！',
    '牙齿们是我的！'
  ]
}

module.exports = {
  BRUSH_AREAS,
  BRUSHING_TIPS,
  THEMES,
  REWARD_TEXTS,
  COMPLETED_TEXTS,
  CHEER_LEFT,
  CHEER_RIGHT,
  RING_MODES,
  PRINCESS_CHEER,
  PRINCESS_CHARACTERS,
  REACTION_MAP,
  BUBBLE_LIST,
  PRE_GERM_TYPES,
  STICKERS,
  GIRL_BUBBLES,
  ZONE_GERM_TYPES,
  CHAPTERS,
  STORY_DIALOGUES,
  BATTLE_CONFIG
}
