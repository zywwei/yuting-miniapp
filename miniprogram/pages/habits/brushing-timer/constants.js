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
    emoji: '🌞',
    tip: '新的一天从刷牙开始~'
  },
  evening: {
    bg: 'linear-gradient(180deg, #F8E8EE 0%, #FFF0F5 30%, #FFF5F8 60%, #F5E6EE 100%)',
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

  // 暴击动画配置（20种模式）
  CRIT_ANIMATIONS: [
    { name: '星辰爆发', emoji: '⭐', particleEmoji: '✨', color: '#FFD700', shakeIntensity: 'heavy' },
    { name: '火焰冲击', emoji: '🔥', particleEmoji: '💥', color: '#FF4500', shakeIntensity: 'heavy' },
    { name: '冰霜冻结', emoji: '❄️', particleEmoji: '💎', color: '#00BFFF', shakeIntensity: 'medium' },
    { name: '雷电一击', emoji: '⚡', particleEmoji: '💫', color: '#FFD700', shakeIntensity: 'heavy' },
    { name: '彩虹绽放', emoji: '🌈', particleEmoji: '🎀', color: '#FF69B4', shakeIntensity: 'medium' },
    { name: '花瓣飞舞', emoji: '🌸', particleEmoji: '💮', color: '#FFB7C5', shakeIntensity: 'light' },
    { name: '钻石闪耀', emoji: '💎', particleEmoji: '✨', color: '#87CEEB', shakeIntensity: 'medium' },
    { name: '旋风斩', emoji: '🌀', particleEmoji: '💨', color: '#20B2AA', shakeIntensity: 'heavy' },
    { name: '月亮斩', emoji: '🌙', particleEmoji: '⭐', color: '#C0C0C0', shakeIntensity: 'medium' },
    { name: '太阳拳', emoji: '☀️', particleEmoji: '✨', color: '#FFA500', shakeIntensity: 'heavy' },
    { name: '爱心暴击', emoji: '💖', particleEmoji: '💕', color: '#FF1493', shakeIntensity: 'light' },
    { name: '音符冲击', emoji: '🎵', particleEmoji: '🎶', color: '#9370DB', shakeIntensity: 'medium' },
    { name: '泡泡爆破', emoji: '🫧', particleEmoji: '💫', color: '#87CEEB', shakeIntensity: 'light' },
    { name: '糖果炸弹', emoji: '🍬', particleEmoji: '🍭', color: '#FF69B4', shakeIntensity: 'medium' },
    { name: '星星雨', emoji: '🌟', particleEmoji: '⭐', color: '#FFD700', shakeIntensity: 'heavy' },
    { name: '蝴蝶之舞', emoji: '🦋', particleEmoji: '✨', color: '#DA70D6', shakeIntensity: 'light' },
    { name: '闪电链', emoji: '⚡', particleEmoji: '💥', color: '#FFD700', shakeIntensity: 'heavy' },
    { name: '水晶碎裂', emoji: '🔮', particleEmoji: '💎', color: '#8A2BE2', shakeIntensity: 'medium' },
    { name: '气旋风暴', emoji: '🌪️', particleEmoji: '💨', color: '#708090', shakeIntensity: 'heavy' },
    { name: '神圣之光', emoji: '✨', particleEmoji: '🌟', color: '#FFD700', shakeIntensity: 'heavy' },
  ],

  // 暴击敌人动画类型（10种，各带中文名）
  CRIT_ENEMY_ANIMS: [
    { id: 'crit-knockback',    name: '🌪️ 飞旋重击' },
    { id: 'crit-shrink-bounce', name: '💥 极限缩放' },
    { id: 'crit-spin',         name: '🌀 高速旋转' },
    { id: 'crit-squash',       name: '🔨 重击砸地' },
    { id: 'crit-teleport',     name: '✨ 瞬移闪烁' },
    { id: 'crit-shake-big',    name: '⚡ 剧烈摇晃' },
    { id: 'crit-knockright',   name: '🚀 右上抛飞' },
    { id: 'crit-bounce',       name: '🏹 弹射升空' },
    { id: 'crit-distort',      name: '🌊 极端扭曲' },
    { id: 'crit-tremble',      name: '🔥 高频颤抖' },
  ],

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
    eveningEnemy: {
      id: 'candy_bat',
      name: '糖果蝙蝠',
      emoji: '🦇',
      hp: 6,
      description: '夜里偷吃糖果的坏蝙蝠！',
      defeatText: '糖果蝙蝠飞走啦！牙齿们可以安心睡觉了~'
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
    eveningEnemy: {
      id: 'germ_ghost',
      name: '细菌幽灵',
      emoji: '👻',
      hp: 6,
      description: '夜晚出没的幽灵细菌！',
      defeatText: '细菌幽灵消散了！沼泽恢复了宁静~'
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
    eveningEnemy: {
      id: 'plaque_ninja',
      name: '牙菌斑忍者',
      emoji: '🥷',
      hp: 6,
      description: '趁你睡觉时偷袭的忍者！',
      defeatText: '牙菌斑忍者被发现了！牙齿王国安全了~'
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
      emoji: '🐛',
      hp: 6,
      description: '专门制造蛀牙的坏蛋！',
      defeatText: '龋齿怪被消灭了！牙齿再也不怕蛀牙啦~'
    },
    eveningEnemy: {
      id: 'cavity_spider',
      name: '蛀牙蜘蛛',
      emoji: '🕷️',
      hp: 6,
      description: '在黑暗洞穴里织网的坏蜘蛛！',
      defeatText: '蛀牙蜘蛛的网被打破了！洞穴恢复光明~'
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
    eveningEnemy: {
      id: 'breath_wolf',
      name: '口气灰狼',
      emoji: '🐺',
      hp: 6,
      description: '夜晚嚎叫释放臭气的灰狼！',
      defeatText: '口气灰狼跑远了！森林空气清新了~'
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
    eveningEnemy: {
      id: 'candy_witch',
      name: '糖果女巫',
      emoji: '🧙‍♀️',
      hp: 6,
      description: '用魔法糖果施咒的女巫！',
      defeatText: '糖果女巫的魔法失效了！牙齿们清醒过来~'
    },
    rewards: { points: 95, exp: 75 }
  },
  {
    id: 7,
    name: '终极挑战：牙齿守护者',
    emoji: '🏆',
    description: '最终挑战！蛀牙大王亲自出马，证明你是真正的牙齿守护者！',
    bg: 'linear-gradient(180deg, #FFD700 0%, #FFA500 100%)',
    enemy: {
      id: 'final_boss',
      name: '蛀牙大王',
      emoji: '🐲',
      hp: 6,
      description: '所有牙齿敌人的首领！',
      defeatText: '蛀牙大王被打败了！你是真正的牙齿守护者！🏆'
    },
    eveningEnemy: {
      id: 'final_boss_night',
      name: '暗夜蛀牙魔王',
      emoji: '😈',
      hp: 6,
      description: '黑暗中觉醒的终极魔王！',
      defeatText: '暗夜蛀牙魔王被封印了！你是最勇敢的牙齿勇士！🌟'
    },
    rewards: { points: 100, exp: 80 }
  }
]

// 隐藏章节主题（随机组合生成100个隐藏章节）
const HIDDEN_THEMES = [
  // 场景名称
  { name: '彩虹糖果屋', emoji: '🌈', bg: 'linear-gradient(180deg, #FF9A9E 0%, #FAD0C4 100%)' },
  { name: '泡泡水世界', emoji: '🫧', bg: 'linear-gradient(180deg, #A1C4FD 0%, #C2E9FB 100%)' },
  { name: '星星魔法阵', emoji: '⭐', bg: 'linear-gradient(180deg, #667EEA 0%, #764BA2 100%)' },
  { name: '云朵城堡', emoji: '☁️', bg: 'linear-gradient(180deg, #E0E5EC 0%, #F5F7FA 100%)' },
  { name: '花朵花园', emoji: '🌸', bg: 'linear-gradient(180deg, #FFB6C1 0%, #FFC0CB 100%)' },
  { name: '水果乐园', emoji: '🍓', bg: 'linear-gradient(180deg, #FF6B6B 0%, #FFE66D 100%)' },
  { name: '冰淇淋山峰', emoji: '🍦', bg: 'linear-gradient(180deg, #FDFCFB 0%, #E2D1C3 100%)' },
  { name: '巧克力河', emoji: '🍫', bg: 'linear-gradient(180deg, #3E2723 0%, #795548 100%)' },
  { name: '饼干小屋', emoji: '🍪', bg: 'linear-gradient(180deg, #D4A574 0%, #E8C9A0 100%)' },
  { name: '蛋糕城堡', emoji: '🎂', bg: 'linear-gradient(180deg, #FFE4E1 0%, #FFF0F5 100%)' },
  { name: '果汁河流', emoji: '🧃', bg: 'linear-gradient(180deg, #FF9A76 0%, #FFDCB4 100%)' },
  { name: '棉花糖云', emoji: '🍥', bg: 'linear-gradient(180deg, #FAD0C4 0%, #FFD1FF 100%)' },
  { name: '果冻海洋', emoji: '🍮', bg: 'linear-gradient(180deg, #43E97B 0%, #38F9D7 100%)' },
  { name: '蜜糖蜂巢', emoji: '🍯', bg: 'linear-gradient(180deg, #F6D365 0%, #FDA085 100%)' },
  { name: '奶酪迷宫', emoji: '🧀', bg: 'linear-gradient(180deg, #FFD89B 0%, #19547B 100%)' },
  { name: '薯片峡谷', emoji: '🥔', bg: 'linear-gradient(180deg, #F093FB 0%, #F5576C 100%)' },
  { name: '西瓜田地', emoji: '🍉', bg: 'linear-gradient(180deg, #4CAF50 0%, #8BC34A 100%)' },
  { name: '香蕉滑梯', emoji: '🍌', bg: 'linear-gradient(180deg, #FFE082 0%, #FFD54F 100%)' },
  { name: '葡萄庄园', emoji: '🍇', bg: 'linear-gradient(180deg, #9C27B0 0%, #CE93D8 100%)' },
  { name: '橙子果园', emoji: '🍊', bg: 'linear-gradient(180deg, #FF9800 0%, #FFB74D 100%)' },
  { name: '苹果树林', emoji: '🍎', bg: 'linear-gradient(180deg, #F44336 0%, #EF9A9A 100%)' },
  { name: '柠檬酸泉', emoji: '🍋', bg: 'linear-gradient(180deg, #FFEB3B 0%, #FFF9C4 100%)' },
  { name: '桃子仙岛', emoji: '🍑', bg: 'linear-gradient(180deg, #FFAB91 0%, #FFCCBC 100%)' },
  { name: '樱桃小溪', emoji: '🍒', bg: 'linear-gradient(180deg, #E91E63 0%, #F8BBD0 100%)' },
  { name: '蓝莓森林', emoji: '🫐', bg: 'linear-gradient(180deg, #3F51B5 0%, #7986CB 100%)' },
  { name: '芒果沙漠', emoji: '🥭', bg: 'linear-gradient(180deg, #FF6F00 0%, #FFB300 100%)' },
  { name: '椰子海岛', emoji: '🥥', bg: 'linear-gradient(180deg, #00BCD4 0%, #80DEEA 100%)' },
  { name: '草莓田园', emoji: '🍓', bg: 'linear-gradient(180deg, #E91E63 0%, #F48FB1 100%)' },
  { name: '菠萝王国', emoji: '🍍', bg: 'linear-gradient(180deg, #FFC107 0%, #FFD54F 100%)' },
  { name: '猕猴桃谷', emoji: '🥝', bg: 'linear-gradient(180deg, #4CAF50 0%, #A5D6A7 100%)' },
  // 动物主题
  { name: '小兔兔乐园', emoji: '🐰', bg: 'linear-gradient(180deg, #FFB6C1 0%, #FFC0CB 100%)' },
  { name: '小熊维尼家', emoji: '🐻', bg: 'linear-gradient(180deg, #FFD54F 0%, #FFE082 100%)' },
  { name: '小猫咪花园', emoji: '🐱', bg: 'linear-gradient(180deg, #F8BBD0 0%, #FCE4EC 100%)' },
  { name: '小狗乐园', emoji: '🐶', bg: 'linear-gradient(180deg, #FFE0B2 0%, #FFF3E0 100%)' },
  { name: '小猪农场', emoji: '🐷', bg: 'linear-gradient(180deg, #F48FB1 0%, #F8BBD0 100%)' },
  { name: '小鸡家园', emoji: '🐥', bg: 'linear-gradient(180deg, #FFF9C4 0%, #FFEE58 100%)' },
  { name: '小鸭池塘', emoji: '🦆', bg: 'linear-gradient(180deg, #B3E5FC 0%, #81D4FA 100%)' },
  { name: '小鱼海洋', emoji: '🐟', bg: 'linear-gradient(180deg, #4FC3F7 0%, #29B6F6 100%)' },
  { name: '蝴蝶花园', emoji: '🦋', bg: 'linear-gradient(180deg, #CE93D8 0%, #E1BEE7 100%)' },
  { name: '蜜蜂花田', emoji: '🐝', bg: 'linear-gradient(180deg, #FFE082 0%, #FFD54F 100%)' },
  // 童话主题
  { name: '公主城堡', emoji: '👸', bg: 'linear-gradient(180deg, #E1BEE7 0%, #F3E5F5 100%)' },
  { name: '王子宫殿', emoji: '🤴', bg: 'linear-gradient(180deg, #BBDEFB 0%, #E3F2FD 100%)' },
  { name: '魔法森林', emoji: '🧙', bg: 'linear-gradient(180deg, #81C784 0%, #A5D6A7 100%)' },
  { name: '精灵小屋', emoji: '🧝', bg: 'linear-gradient(180deg, #C8E6C9 0%, #E8F5E9 100%)' },
  { name: '龙之洞穴', emoji: '🐉', bg: 'linear-gradient(180deg, #FF8A65 0%, #FFAB91 100%)' },
  { name: '独角兽草原', emoji: '🦄', bg: 'linear-gradient(180deg, #F8BBD0 0%, #E1BEE7 100%)' },
  { name: '美人鱼海湾', emoji: '🧜', bg: 'linear-gradient(180deg, #4DD0E1 0%, #80DEEA 100%)' },
  { name: '海盗宝藏岛', emoji: '🏴‍☠️', bg: 'linear-gradient(180deg, #795548 0%, #A1887F 100%)' },
  { name: '宇航员太空', emoji: '👨‍🚀', bg: 'linear-gradient(180deg, #263238 0%, #37474F 100%)' },
  { name: '机器人城市', emoji: '🤖', bg: 'linear-gradient(180deg, #607D8B 0%, #90A4AE 100%)' },
  // 运动主题
  { name: '足球赛场', emoji: '⚽', bg: 'linear-gradient(180deg, #4CAF50 0%, #81C784 100%)' },
  { name: '篮球公园', emoji: '🏀', bg: 'linear-gradient(180deg, #FF9800 0%, #FFB74D 100%)' },
  { name: '游泳池', emoji: '🏊', bg: 'linear-gradient(180deg, #29B6F6 0%, #4FC3F7 100%)' },
  { name: '滑雪场', emoji: '⛷️', bg: 'linear-gradient(180deg, #ECEFF1 0%, #CFD8DC 100%)' },
  { name: '游乐场', emoji: '🎪', bg: 'linear-gradient(180deg, #FF5252 0%, #FF8A80 100%)' },
  // 节日主题
  { name: '圣诞节', emoji: '🎄', bg: 'linear-gradient(180deg, #F44336 0%, #4CAF50 100%)' },
  { name: '万圣节', emoji: '🎃', bg: 'linear-gradient(180deg, #FF9800 0%, #9C27B0 100%)' },
  { name: '春节', emoji: '🧧', bg: 'linear-gradient(180deg, #F44336 0%, #FFD700 100%)' },
  { name: '中秋节', emoji: '🥮', bg: 'linear-gradient(180deg, #FFD700 0%, #FF9800 100%)' },
  { name: '儿童节', emoji: '🎈', bg: 'linear-gradient(180deg, #FF4081 0%, #FF80AB 100%)' },
  { name: '生日派对', emoji: '🎂', bg: 'linear-gradient(180deg, #FF80AB 0%, #FFB74D 100%)' },
  // 自然主题
  { name: '日出山峰', emoji: '🌅', bg: 'linear-gradient(180deg, #FF7043 0%, #FFB74D 100%)' },
  { name: '月亮湖', emoji: '🌙', bg: 'linear-gradient(180deg, #263238 0%, #37474F 100%)' },
  { name: '彩虹瀑布', emoji: '🌈', bg: 'linear-gradient(180deg, #FF4081 0%, #536DFE 100%)' },
  { name: '沙漠绿洲', emoji: '🏜️', bg: 'linear-gradient(180deg, #FFD54F 0%, #FF9800 100%)' },
  { name: '北极冰川', emoji: '🧊', bg: 'linear-gradient(180deg, #E1F5FE 0%, #B3E5FC 100%)' },
  { name: '热带雨林', emoji: '🌴', bg: 'linear-gradient(180deg, #2E7D32 0%, #66BB6A 100%)' },
  { name: '海底世界', emoji: '🐙', bg: 'linear-gradient(180deg, #0277BD 0%, #4FC3F7 100%)' },
  { name: '火山岛', emoji: '🌋', bg: 'linear-gradient(180deg, #BF360C 0%, #FF8A65 100%)' },
  { name: '水晶洞穴', emoji: '💎', bg: 'linear-gradient(180deg, #7C4DFF 0%, #B388FF 100%)' },
  { name: '蘑菇森林', emoji: '🍄', bg: 'linear-gradient(180deg, #8D6E63 0%, #BCAAA4 100%)' },
  // 音乐主题
  { name: '音乐厅', emoji: '🎵', bg: 'linear-gradient(180deg, #7B1FA2 0%, #AB47BC 100%)' },
  { name: '舞蹈教室', emoji: '💃', bg: 'linear-gradient(180deg, #EC407A 0%, #F48FB1 100%)' },
  { name: '画画工作室', emoji: '🎨', bg: 'linear-gradient(180deg, #42A5F5 0%, #90CAF9 100%)' },
  { name: '图书馆', emoji: '📚', bg: 'linear-gradient(180deg, #795548 0%, #A1887F 100%)' },
  { name: '电影院', emoji: '🎬', bg: 'linear-gradient(180deg, #212121 0%, #424242 100%)' },
  // 科技主题
  { name: '太空站', emoji: '🚀', bg: 'linear-gradient(180deg, #1A237E 0%, #3F51B5 100%)' },
  { name: '恐龙世界', emoji: '🦕', bg: 'linear-gradient(180deg, #33691E 0%, #689F38 100%)' },
  { name: '时光机', emoji: '⏰', bg: 'linear-gradient(180deg, #4E342E 0%, #795548 100%)' },
  { name: '发明工坊', emoji: '🔧', bg: 'linear-gradient(180deg, #455A64 0%, #78909C 100%)' },
  { name: '探险队', emoji: '🧭', bg: 'linear-gradient(180deg, #33691E 0%, #558B2F 100%)' },
  // 梦幻主题
  { name: '梦之国', emoji: '💭', bg: 'linear-gradient(180deg, #E8EAF6 0%, #C5CAE9 100%)' },
  { name: '仙境', emoji: '✨', bg: 'linear-gradient(180deg, #F3E5F5 0%, #E1BEE7 100%)' },
  { name: '精灵森林', emoji: '🧝‍♀️', bg: 'linear-gradient(180deg, #C8E6C9 0%, #DCEDC8 100%)' },
  { name: '魔法学校', emoji: '🪄', bg: 'linear-gradient(180deg, #7E57C2 0%, #9575CD 100%)' },
  { name: '糖果王国', emoji: '🍭', bg: 'linear-gradient(180deg, #FF80AB 0%, #FF4081 100%)' },
  { name: '玩具工厂', emoji: '🧸', bg: 'linear-gradient(180deg, #FFB74D 0%, #FFA726 100%)' },
  { name: '贴纸世界', emoji: '🏷️', bg: 'linear-gradient(180deg, #4FC3F7 0%, #29B6F6 100%)' },
  { name: '画画天堂', emoji: '🖌️', bg: 'linear-gradient(180deg, #FF7043 0%, #FF5722 100%)' },
  { name: '游戏乐园', emoji: '🎮', bg: 'linear-gradient(180deg, #7C4DFF 0%, #651FFF 100%)' },
  { name: '积木城堡', emoji: '🧱', bg: 'linear-gradient(180deg, #F44336 0%, #E53935 100%)' },
  { name: '泡泡糖王国', emoji: '🎈', bg: 'linear-gradient(180deg, #F48FB1 0%, #F06292 100%)' },
  { name: '橡皮泥乐园', emoji: '🎭', bg: 'linear-gradient(180deg, #FFB74D 0%, #FF9800 100%)' },
  { name: '水彩画廊', emoji: '🖼️', bg: 'linear-gradient(180deg, #81C784 0%, #66BB6A 100%)' },
  { name: '蜡笔小屋', emoji: '🖍️', bg: 'linear-gradient(180deg, #FF8A65 0%, #FF7043 100%)' },
  { name: '折纸工坊', emoji: '📄', bg: 'linear-gradient(180deg, #E0E0E0 0%, #BDBDBD 100%)' },
  { name: '风筝草原', emoji: '🪁', bg: 'linear-gradient(180deg, #4FC3F7 0%, #81D4FA 100%)' },
  { name: '秋千公园', emoji: '🎠', bg: 'linear-gradient(180deg, #A5D6A7 0%, #C8E6C9 100%)' },
  { name: '滑梯乐园', emoji: '🛝', bg: 'linear-gradient(180deg, #FF8A80 0%, #FF5252 100%)' },
  { name: '蹦床中心', emoji: '🤸', bg: 'linear-gradient(180deg, #FFD740 0%, #FFC400 100%)' },
  { name: '迷宫花园', emoji: '🌿', bg: 'linear-gradient(180deg, #66BB6A 0%, #43A047 100%)' },
]

// 敌人模板（随机组合）
const HIDDEN_ENEMIES = [
  { name: '小蛀虫', emoji: '🐛', description: '偷偷啃牙齿的坏家伙！', defeatText: '小蛀虫被赶跑啦！' },
  { name: '酸酸怪', emoji: '🍋', description: '用酸性物质腐蚀牙齿！', defeatText: '酸酸怪被中和了！' },
  { name: '甜甜圈', emoji: '🍩', description: '用甜蜜诱惑牙齿的坏蛋！', defeatText: '甜甜圈的甜蜜陷阱被打破啦！' },
  { name: '冰淇淋怪', emoji: '🍦', description: '让牙齿冻得发抖的坏家伙！', defeatText: '冰淇淋怪融化了！' },
  { name: '巧克力兽', emoji: '🍫', description: '黏在牙齿上不走的坏蛋！', defeatText: '巧克力兽被刷掉啦！' },
  { name: '棒棒糖妖', emoji: '🍭', description: '用棍子戳牙齿的坏家伙！', defeatText: '棒棒糖妖被吃掉了！' },
  { name: '蛋糕精灵', emoji: '🎂', description: '在牙齿上涂奶油的坏蛋！', defeatText: '蛋糕精灵被清理了！' },
  { name: '果冻怪', emoji: '🍮', description: '黏糊糊的牙齿敌人！', defeatText: '果冻怪被冲走啦！' },
  { name: '泡泡糖魔', emoji: '🎈', description: '把牙齿粘在一起的坏蛋！', defeatText: '泡泡糖魔被吹走啦！' },
  { name: '薯片精', emoji: '🥔', description: '在牙齿缝隙里藏碎片的坏蛋！', defeatText: '薯片精被扫走啦！' },
  { name: '果汁妖', emoji: '🧃', description: '用糖分攻击牙齿的坏家伙！', defeatText: '果汁妖被稀释了！' },
  { name: '蜂蜜怪', emoji: '🍯', description: '黏黏的牙齿敌人！', defeatText: '蜂蜜怪被冲走啦！' },
  { name: '奶酪兽', emoji: '🧀', description: '在牙齿上留下臭味的坏蛋！', defeatText: '奶酪兽被刷掉啦！' },
  { name: '饼干精', emoji: '🍪', description: '碎成渣渣藏在牙缝的坏蛋！', defeatText: '饼干精被清理了！' },
  { name: '糖果魔', emoji: '🍬', description: '用甜蜜攻击牙齿的坏家伙！', defeatText: '糖果魔被打败啦！' },
  { name: '西瓜虫', emoji: '🐛', description: '在牙齿上打洞的坏蛋！', defeatText: '西瓜虫被赶跑啦！' },
  { name: '香蕉皮', emoji: '🍌', description: '让牙齿滑倒的坏家伙！', defeatText: '香蕉皮被捡走啦！' },
  { name: '苹果核', emoji: '🍎', description: '在牙齿上留下残渣的坏蛋！', defeatText: '苹果核被清理了！' },
  { name: '葡萄籽', emoji: '🍇', description: '卡在牙缝里的坏家伙！', defeatText: '葡萄籽被剔出来啦！' },
  { name: '橙子皮', emoji: '🍊', description: '用酸性物质攻击牙齿的坏蛋！', defeatText: '橙子皮被剥掉啦！' },
  { name: '草莓酱', emoji: '🍓', description: '黏在牙齿上不走的坏家伙！', defeatText: '草莓酱被擦掉啦！' },
  { name: '芒果核', emoji: '🥭', description: '在牙齿上留下痕迹的坏蛋！', defeatText: '芒果核被清理了！' },
  { name: '椰子壳', emoji: '🥥', description: '硬硬的牙齿敌人！', defeatText: '椰子壳被敲碎啦！' },
  { name: '猕猴桃毛', emoji: '🥝', description: '让牙齿发痒的坏家伙！', defeatText: '猕猴桃毛被刷掉啦！' },
  { name: '菠萝刺', emoji: '🍍', description: '扎牙齿的坏蛋！', defeatText: '菠萝刺被拔掉啦！' },
  { name: '樱桃核', emoji: '🍒', description: '卡在牙齿里的坏家伙！', defeatText: '樱桃核被吐出来啦！' },
  { name: '蓝莓汁', emoji: '🫐', description: '把牙齿染色的坏蛋！', defeatText: '蓝莓汁被洗掉啦！' },
  { name: '柠檬酸', emoji: '🍋', description: '腐蚀牙齿的坏家伙！', defeatText: '柠檬酸被中和了！' },
  { name: '桃子毛', emoji: '🍑', description: '让牙齿过敏的坏蛋！', defeatText: '桃子毛被洗掉啦！' },
  { name: '西瓜汁', emoji: '🍉', description: '用糖分攻击牙齿的坏家伙！', defeatText: '西瓜汁被冲走啦！' },
]

// 生成隐藏章节（100个，ID从10000开始）
const generateHiddenChapters = () => {
  const chapters = []
  for (let i = 0; i < 100; i++) {
    const theme = HIDDEN_THEMES[i % HIDDEN_THEMES.length]
    const enemy = HIDDEN_ENEMIES[i % HIDDEN_ENEMIES.length]
    const eveningEnemy = HIDDEN_ENEMIES[(i + 33) % HIDDEN_ENEMIES.length]
    // 基于索引的确定化奖励（避免跨页面不一致）
    const points = 20 + (i * 7) % 40 // 20-59 积分
    const exp = 10 + (i * 11) % 30   // 10-39 经验

    chapters.push({
      id: 10000 + i,
      name: theme.name,
      emoji: theme.emoji,
      description: `${enemy.name}在${theme.name}捣乱，快去打败它！`,
      bg: theme.bg,
      isHidden: true,
      enemy: {
        id: `hidden_${10000 + i}`,
        name: enemy.name,
        emoji: enemy.emoji,
        hp: 6,
        description: enemy.description,
        defeatText: enemy.defeatText
      },
      eveningEnemy: {
        id: `hidden_evening_${10000 + i}`,
        name: eveningEnemy.name,
        emoji: eveningEnemy.emoji,
        hp: 6,
        description: eveningEnemy.description,
        defeatText: eveningEnemy.defeatText
      },
      rewards: { points, exp }
    })
  }
  return chapters
}

// 隐藏章节数组
const HIDDEN_CHAPTERS = generateHiddenChapters()

// 获取随机隐藏章节
const getRandomHiddenChapter = () => {
  const index = Math.floor(Math.random() * HIDDEN_CHAPTERS.length)
  return HIDDEN_CHAPTERS[index]
}

/**
 * 获取或选择今天的章节（持久化，避免每次加载页面都换）
 * @param {number} currentChapterId - 当前主线章节ID
 * @param {Function} getTodayStr - 获取今天日期字符串的函数
 * @returns {Object} 章节对象
 */
const getOrSelectTodayChapter = (currentChapterId, getTodayStr) => {
  const today = getTodayStr()

  // 检查今天是否已选择章节
  const savedChapter = wx.getStorageSync('todayChapter')
  if (savedChapter && savedChapter.date === today) {
    if (savedChapter.isHidden) {
      const found = HIDDEN_CHAPTERS.find(c => c.id === savedChapter.id)
      if (found) return found
    }
    const found = CHAPTERS.find(c => c.id === savedChapter.id)
    if (found) return found
  }

  // 80%概率触发隐藏章节
  let chapter
  if (Math.random() < 0.8) {
    chapter = getRandomHiddenChapter()
  } else {
    chapter = CHAPTERS.find(c => c.id === currentChapterId) || CHAPTERS[0]
  }

  // 保存今天的选择
  wx.setStorageSync('todayChapter', {
    date: today,
    id: chapter.id,
    isHidden: !!chapter.isHidden
  })

  return chapter
}

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
  ],
  enemy_crit_taunt: [
    '哼！这点伤害算什么！',
    '你激怒我了！🔥',
    '不痛不痒！再来！',
    '哈哈哈，太弱了！',
    '我要加倍还击！',
    '你以为这样就能赢？',
    '我可是无敌的！💪',
    '牙齿注定是我的！😈',
    '就这？给我挠痒痒吗？',
    '你的牙刷是棉花做的吧！',
    '太慢了太慢了！',
    '嘿嘿，打不中我！',
    '再来再来，我还没热身呢！',
    '你的攻击对我无效！',
    '可笑！这点力气也想打败我？',
    '我可是黑暗军团的精英！',
    '哈哈哈，继续挣扎吧！',
    '你越打我越强！💪',
    '这就是你的全部实力吗？',
    '我可不会手下留情！'
  ],
  enemy_low_hp_taunt: [
    '不...不可能！',
    '我还没输！',
    '可恶...我不会认输的！',
    '你逼我的...我要爆发了！💥',
    '这不可能！我可是大魔王！',
    '别高兴得太早！',
    '我还有最后一招！',
    '就算倒下也要拉你垫背！',
    '可恶的牙刷...我恨你！',
    '这一定是做梦...',
    '我不会就这样被打败的！',
    '我的力量...在消失...',
    '最后的反击！⚡',
    '你以为赢了吗？还早呢！',
    '我的主人会为我报仇的！'
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
  HIDDEN_CHAPTERS,
  getRandomHiddenChapter,
  getOrSelectTodayChapter,
  STORY_DIALOGUES,
  BATTLE_CONFIG
}
