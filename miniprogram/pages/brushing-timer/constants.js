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
  '💡 别忘了刷里面的牙齿~'
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
  ZONE_GERM_TYPES
}
