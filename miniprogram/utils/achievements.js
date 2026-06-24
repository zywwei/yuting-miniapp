/**
 * 成就系统
 * 管理成就的解锁、进度追踪和展示
 * 支持分类、稀有度、进度条
 */

var learnData = require('./learn-data.js')
var util = require('./util.js')
var habitManager = require('./habit-manager.js')
var childStorage = require('./child-storage.js')

// 成就总数常量（用于 legend 成就的 maxProgress）
var TOTAL_ACHIEVEMENTS = 64

// 稀有度定义
var RARITY = {
  common: { name: '普通', color: '#4CAF50', bg: '#E8F5E9' },
  rare: { name: '稀有', color: '#2196F3', bg: '#E3F2FD' },
  legendary: { name: '传说', color: '#FF9800', bg: '#FFF3E0' }
}

// 成就定义
var ACHIEVEMENTS = [
  // ===== 刷牙成就 =====
  { id: 'brush_3', icon: '🦷', title: '刷牙新手', desc: '连续刷牙3天', category: 'habit', rarity: 'common',
    condition: function(data) { return data.brushingStreak >= 3 },
    progress: function(data) { return Math.min(data.brushingStreak, 3) }, maxProgress: 3 },
  { id: 'brush_7', icon: '🥇', title: '刷牙达人', desc: '连续刷牙7天', category: 'habit', rarity: 'common',
    condition: function(data) { return data.brushingStreak >= 7 },
    progress: function(data) { return Math.min(data.brushingStreak, 7) }, maxProgress: 7 },
  { id: 'brush_30', icon: '🏆', title: '刷牙冠军', desc: '连续刷牙30天', category: 'habit', rarity: 'rare',
    condition: function(data) { return data.brushingStreak >= 30 },
    progress: function(data) { return Math.min(data.brushingStreak, 30) }, maxProgress: 30 },

  // ===== 习惯打卡成就 =====
  { id: 'habit_3', icon: '🎯', title: '习惯入门', desc: '连续完成任意习惯3天', category: 'habit', rarity: 'common',
    condition: function(data) { return data.habitMaxStreak >= 3 },
    progress: function(data) { return Math.min(data.habitMaxStreak, 3) }, maxProgress: 3 },
  { id: 'habit_7', icon: '💪', title: '习惯达人', desc: '连续完成任意习惯7天', category: 'habit', rarity: 'common',
    condition: function(data) { return data.habitMaxStreak >= 7 },
    progress: function(data) { return Math.min(data.habitMaxStreak, 7) }, maxProgress: 7 },
  { id: 'habit_30', icon: '🏅', title: '习惯大师', desc: '连续完成任意习惯30天', category: 'habit', rarity: 'rare',
    condition: function(data) { return data.habitMaxStreak >= 30 },
    progress: function(data) { return Math.min(data.habitMaxStreak, 30) }, maxProgress: 30 },
  { id: 'habit_all_day', icon: '✅', title: '全勤小达人', desc: '一天内完成所有习惯', category: 'habit', rarity: 'rare',
    condition: function(data) { return data.allHabitsDoneToday },
    progress: function(data) { return data.allHabitsDoneToday ? 1 : 0 }, maxProgress: 1 },
  { id: 'habit_100', icon: '💯', title: '百次打卡', desc: '累计打卡100次', category: 'habit', rarity: 'rare',
    condition: function(data) { return data.totalHabitRecords >= 100 },
    progress: function(data) { return Math.min(data.totalHabitRecords, 100) }, maxProgress: 100 },

  // ===== 识字成就 =====
  { id: 'cards_10', icon: '📖', title: '识字入门', desc: '认识10个汉字', category: 'learn', rarity: 'common',
    condition: function(data) { return data.cardsLearned >= 10 },
    progress: function(data) { return Math.min(data.cardsLearned, 10) }, maxProgress: 10 },
  { id: 'cards_50', icon: '📚', title: '识字能手', desc: '认识50个汉字', category: 'learn', rarity: 'common',
    condition: function(data) { return data.cardsLearned >= 50 },
    progress: function(data) { return Math.min(data.cardsLearned, 50) }, maxProgress: 50 },
  { id: 'cards_100', icon: '🎓', title: '识字大师', desc: '认识100个汉字', category: 'learn', rarity: 'rare',
    condition: function(data) { return data.cardsLearned >= 100 },
    progress: function(data) { return Math.min(data.cardsLearned, 100) }, maxProgress: 100 },
  { id: 'cards_all_120', icon: '👑', title: '汉字全通', desc: '学完全部120个汉字', category: 'learn', rarity: 'legendary',
    condition: function(data) { return data.cardsLearned >= 120 },
    progress: function(data) { return Math.min(data.cardsLearned, 120) }, maxProgress: 120 },

  // ===== 古诗成就 =====
  { id: 'poems_5', icon: '📜', title: '诗歌入门', desc: '背诵5首古诗', category: 'learn', rarity: 'common',
    condition: function(data) { return data.poemsMemorized >= 5 },
    progress: function(data) { return Math.min(data.poemsMemorized, 5) }, maxProgress: 5 },
  { id: 'poems_10', icon: '🎭', title: '诗歌达人', desc: '背诵10首古诗', category: 'learn', rarity: 'common',
    condition: function(data) { return data.poemsMemorized >= 10 },
    progress: function(data) { return Math.min(data.poemsMemorized, 10) }, maxProgress: 10 },
  { id: 'poems_25', icon: '🏅', title: '诗歌大师', desc: '背诵全部25首古诗', category: 'learn', rarity: 'legendary',
    condition: function(data) { return data.poemsMemorized >= 25 },
    progress: function(data) { return Math.min(data.poemsMemorized, 25) }, maxProgress: 25 },

  // ===== 数字学习成就 =====
  { id: 'numbers_10', icon: '🔢', title: '数字入门', desc: '学习10个数字', category: 'learn', rarity: 'common',
    condition: function(data) { return data.numbersLearned >= 10 },
    progress: function(data) { return Math.min(data.numbersLearned, 10) }, maxProgress: 10 },
  { id: 'numbers_50', icon: '🔟', title: '数字能手', desc: '学习50个数字', category: 'learn', rarity: 'common',
    condition: function(data) { return data.numbersLearned >= 50 },
    progress: function(data) { return Math.min(data.numbersLearned, 50) }, maxProgress: 50 },
  { id: 'numbers_100', icon: '💯', title: '数字大师', desc: '学完全部100个数字', category: 'learn', rarity: 'rare',
    condition: function(data) { return data.numbersLearned >= 100 },
    progress: function(data) { return Math.min(data.numbersLearned, 100) }, maxProgress: 100 },

  // ===== 英语学习成就 =====
  { id: 'english_10', icon: '🔤', title: '英语入门', desc: '学习10个英语单词', category: 'learn', rarity: 'common',
    condition: function(data) { return data.englishLearned >= 10 },
    progress: function(data) { return Math.min(data.englishLearned, 10) }, maxProgress: 10 },
  { id: 'english_30', icon: '📝', title: '英语能手', desc: '学习30个英语单词', category: 'learn', rarity: 'common',
    condition: function(data) { return data.englishLearned >= 30 },
    progress: function(data) { return Math.min(data.englishLearned, 30) }, maxProgress: 30 },
  { id: 'english_56', icon: '🌍', title: '英语大师', desc: '学完全部56个英语单词', category: 'learn', rarity: 'rare',
    condition: function(data) { return data.englishLearned >= 56 },
    progress: function(data) { return Math.min(data.englishLearned, 56) }, maxProgress: 56 },

  // ===== 学习综合成就 =====
  { id: 'learn_all', icon: '🌟', title: '学习全能', desc: '四个学习模块各学过至少1个', category: 'learn', rarity: 'rare',
    condition: function(data) { return data.cardsLearned >= 1 && data.poemsMemorized >= 1 && data.numbersLearned >= 1 && data.englishLearned >= 1 },
    progress: function(data) { return (data.cardsLearned >= 1 ? 1 : 0) + (data.poemsMemorized >= 1 ? 1 : 0) + (data.numbersLearned >= 1 ? 1 : 0) + (data.englishLearned >= 1 ? 1 : 0) }, maxProgress: 4 },

  // ===== 画画成就 =====
  { id: 'draw_1', icon: '🎨', title: '第一幅画', desc: '画第一幅画', category: 'special', rarity: 'common',
    condition: function(data) { return data.drawingsCount >= 1 },
    progress: function(data) { return Math.min(data.drawingsCount, 1) }, maxProgress: 1 },
  { id: 'draw_5', icon: '🖌️', title: '绘画入门', desc: '画5幅画', category: 'special', rarity: 'common',
    condition: function(data) { return data.drawingsCount >= 5 },
    progress: function(data) { return Math.min(data.drawingsCount, 5) }, maxProgress: 5 },
  { id: 'draw_20', icon: '🖼️', title: '绘画达人', desc: '画20幅画', category: 'special', rarity: 'rare',
    condition: function(data) { return data.drawingsCount >= 20 },
    progress: function(data) { return Math.min(data.drawingsCount, 20) }, maxProgress: 20 },
  { id: 'draw_50', icon: '🏆', title: '绘画大师', desc: '画50幅画', category: 'special', rarity: 'legendary',
    condition: function(data) { return data.drawingsCount >= 50 },
    progress: function(data) { return Math.min(data.drawingsCount, 50) }, maxProgress: 50 },

  // ===== 笔记成就 =====
  { id: 'notes_1', icon: '✏️', title: '第一篇笔记', desc: '写第一篇笔记', category: 'special', rarity: 'common',
    condition: function(data) { return data.notesCount >= 1 },
    progress: function(data) { return Math.min(data.notesCount, 1) }, maxProgress: 1 },
  { id: 'notes_3', icon: '📝', title: '笔记入门', desc: '写3篇笔记', category: 'special', rarity: 'common',
    condition: function(data) { return data.notesCount >= 3 },
    progress: function(data) { return Math.min(data.notesCount, 3) }, maxProgress: 3 },
  { id: 'notes_10', icon: '📓', title: '笔记达人', desc: '写10篇笔记', category: 'special', rarity: 'common',
    condition: function(data) { return data.notesCount >= 10 },
    progress: function(data) { return Math.min(data.notesCount, 10) }, maxProgress: 10 },
  { id: 'notes_30', icon: '📖', title: '笔记大师', desc: '写30篇笔记', category: 'special', rarity: 'rare',
    condition: function(data) { return data.notesCount >= 30 },
    progress: function(data) { return Math.min(data.notesCount, 30) }, maxProgress: 30 },

  // ===== 故事冒险成就 =====
  { id: 'story_ch1', icon: '⚔️', title: '初出茅庐', desc: '完成第1章故事', category: 'story', rarity: 'common',
    condition: function(data) { return data.storyChapter >= 2 || data.storyRound >= 2 },
    progress: function(data) { return (data.storyChapter >= 2 || data.storyRound >= 2) ? 1 : 0 }, maxProgress: 1 },
  { id: 'story_round2', icon: '🔄', title: '二周目', desc: '进入第2轮冒险', category: 'story', rarity: 'rare',
    condition: function(data) { return data.storyRound >= 2 },
    progress: function(data) { return data.storyRound >= 2 ? 1 : 0 }, maxProgress: 1 },
  { id: 'story_10_enemies', icon: '🐉', title: '怪物猎人', desc: '累计击败10个敌人', category: 'story', rarity: 'rare',
    condition: function(data) { return data.totalEnemiesDefeated >= 10 },
    progress: function(data) { return Math.min(data.totalEnemiesDefeated, 10) }, maxProgress: 10 },
  { id: 'story_3_rounds', icon: '🏰', title: '冒险老手', desc: '完成3轮冒险', category: 'story', rarity: 'legendary',
    condition: function(data) { return data.storyRound >= 3 },
    progress: function(data) { return Math.min(data.storyRound, 3) }, maxProgress: 3 },

  // ===== 摆摊成就 =====
  { id: 'stall_1', icon: '🏪', title: '小老板', desc: '完成第一笔销售', category: 'special', rarity: 'common',
    condition: function(data) { return data.stallSalesCount >= 1 },
    progress: function(data) { return Math.min(data.stallSalesCount, 1) }, maxProgress: 1 },
  { id: 'stall_10', icon: '💰', title: '赚钱能手', desc: '累计完成10笔销售', category: 'special', rarity: 'common',
    condition: function(data) { return data.stallSalesCount >= 10 },
    progress: function(data) { return Math.min(data.stallSalesCount, 10) }, maxProgress: 10 },
  { id: 'stall_50', icon: '🏆', title: '销售冠军', desc: '累计完成50笔销售', category: 'special', rarity: 'rare',
    condition: function(data) { return data.stallSalesCount >= 50 },
    progress: function(data) { return Math.min(data.stallSalesCount, 50) }, maxProgress: 50 },
  { id: 'stall_100', icon: '👑', title: '商业大亨', desc: '累计完成100笔销售', category: 'special', rarity: 'legendary',
    condition: function(data) { return data.stallSalesCount >= 100 },
    progress: function(data) { return Math.min(data.stallSalesCount, 100) }, maxProgress: 100 },
  { id: 'stall_revenue_50', icon: '💵', title: '第一桶金', desc: '累计销售额达到50元', category: 'special', rarity: 'common',
    condition: function(data) { return data.stallTotalRevenue >= 50 },
    progress: function(data) { return Math.min(data.stallTotalRevenue, 50) }, maxProgress: 50 },
  { id: 'stall_revenue_200', icon: '💎', title: '小富翁', desc: '累计销售额达到200元', category: 'special', rarity: 'rare',
    condition: function(data) { return data.stallTotalRevenue >= 200 },
    progress: function(data) { return Math.min(data.stallTotalRevenue, 200) }, maxProgress: 200 },
  { id: 'stall_profit', icon: '📈', title: '理财小能手', desc: '累计盈利达到50元', category: 'special', rarity: 'rare',
    condition: function(data) { return data.stallTotalProfit >= 50 },
    progress: function(data) { return Math.min(data.stallTotalProfit, 50) }, maxProgress: 50 },
  { id: 'stall_products_5', icon: '📦', title: '货如轮转', desc: '拥有5种不同商品', category: 'special', rarity: 'common',
    condition: function(data) { return data.stallProductTypes >= 5 },
    progress: function(data) { return Math.min(data.stallProductTypes, 5) }, maxProgress: 5 },

  // ===== 猜拳游戏成就 =====
  { id: 'rps_first_win', icon: '🥊', title: '初战告捷', desc: '猜拳首次获胜', category: 'game', rarity: 'common',
    condition: function(data) { return data.rpsWins >= 1 },
    progress: function(data) { return Math.min(data.rpsWins, 1) }, maxProgress: 1 },
  { id: 'rps_10_wins', icon: '✊', title: '猜拳高手', desc: '猜拳累计获胜10次', category: 'game', rarity: 'common',
    condition: function(data) { return data.rpsWins >= 10 },
    progress: function(data) { return Math.min(data.rpsWins, 10) }, maxProgress: 10 },
  { id: 'rps_50_wins', icon: '🏆', title: '猜拳大师', desc: '猜拳累计获胜50次', category: 'game', rarity: 'rare',
    condition: function(data) { return data.rpsWins >= 50 },
    progress: function(data) { return Math.min(data.rpsWins, 50) }, maxProgress: 50 },
  { id: 'rps_streak_5', icon: '🔥', title: '连胜达人', desc: '猜拳5连胜', category: 'game', rarity: 'rare',
    condition: function(data) { return data.rpsBestStreak >= 5 },
    progress: function(data) { return Math.min(data.rpsBestStreak, 5) }, maxProgress: 5 },
  { id: 'rps_challenge_5', icon: '⚔️', title: '闯关勇士', desc: '闯关挑战达到第5关', category: 'game', rarity: 'common',
    condition: function(data) { return data.rpsChallengeLevel >= 5 },
    progress: function(data) { return Math.min(data.rpsChallengeLevel - 1, 5) }, maxProgress: 5 },
  { id: 'rps_challenge_10', icon: '👑', title: '闯关王者', desc: '通关闯关挑战第10关', category: 'game', rarity: 'legendary',
    condition: function(data) { return data.rpsChallengeLevel >= 11 },
    progress: function(data) { return Math.min(data.rpsChallengeLevel - 1, 10) }, maxProgress: 10 },
  { id: 'rps_story_done', icon: '🐉', title: '故事英雄', desc: '通关故事冒险模式', category: 'game', rarity: 'legendary',
    condition: function(data) { return data.rpsStoryDone },
    progress: function(data) { return data.rpsStoryDone ? 1 : 0 }, maxProgress: 1 },

  // ===== 骰子游戏成就 =====
  { id: 'dice_first_win', icon: '🎲', title: '首掷制胜', desc: '骰子游戏首次获胜', category: 'game', rarity: 'common',
    condition: function(data) { return data.diceWins >= 1 },
    progress: function(data) { return Math.min(data.diceWins, 1) }, maxProgress: 1 },
  { id: 'dice_10_wins', icon: '🎯', title: '骰子高手', desc: '骰子累计获胜10次', category: 'game', rarity: 'common',
    condition: function(data) { return data.diceWins >= 10 },
    progress: function(data) { return Math.min(data.diceWins, 10) }, maxProgress: 10 },
  { id: 'dice_leopard', icon: '🐆', title: '豹子玩家', desc: '摇出1次豹子', category: 'game', rarity: 'rare',
    condition: function(data) { return data.diceLeopardCount >= 1 },
    progress: function(data) { return Math.min(data.diceLeopardCount, 1) }, maxProgress: 1 },
  { id: 'dice_leopard_5', icon: '💎', title: '豹子大师', desc: '摇出5次豹子', category: 'game', rarity: 'legendary',
    condition: function(data) { return data.diceLeopardCount >= 5 },
    progress: function(data) { return Math.min(data.diceLeopardCount, 5) }, maxProgress: 5 },
  { id: 'dice_mission_10', icon: '📋', title: '任务达人', desc: '完成10个任务骰子任务', category: 'game', rarity: 'common',
    condition: function(data) { return data.diceMissionsDone >= 10 },
    progress: function(data) { return Math.min(data.diceMissionsDone, 10) }, maxProgress: 10 },
  { id: 'dice_mission_all', icon: '🌟', title: '任务大师', desc: '完成全部30个任务骰子任务', category: 'game', rarity: 'legendary',
    condition: function(data) { return data.diceMissionsDone >= 30 },
    progress: function(data) { return Math.min(data.diceMissionsDone, 30) }, maxProgress: 30 },
  { id: 'dice_streak_5', icon: '🔥', title: '连胜骰神', desc: '骰子游戏5连胜', category: 'game', rarity: 'rare',
    condition: function(data) { return data.diceBestStreak >= 5 },
    progress: function(data) { return Math.min(data.diceBestStreak, 5) }, maxProgress: 5 },

  // ===== 飞行棋成就 =====
  { id: 'flight_first_win', icon: '✈️', title: '首次飞行', desc: '赢得第一局飞行棋', category: 'game', rarity: 'common',
    condition: function(data) { return data.flightWins >= 1 },
    progress: function(data) { return Math.min(data.flightWins, 1) }, maxProgress: 1 },
  { id: 'flight_10_wins', icon: '🛫', title: '飞行达人', desc: '赢得10局飞行棋', category: 'game', rarity: 'rare',
    condition: function(data) { return data.flightWins >= 10 },
    progress: function(data) { return Math.min(data.flightWins, 10) }, maxProgress: 10 },
  { id: 'flight_perfect', icon: '🏆', title: '完美飞行', desc: '4架飞机全部到达且无人被撞回', category: 'game', rarity: 'legendary',
    condition: function(data) { return data.flightPerfect >= 1 },
    progress: function(data) { return Math.min(data.flightPerfect, 1) }, maxProgress: 1 },
  { id: 'flight_speed', icon: '⚡', title: '闪电飞行', desc: '20回合内完成一局', category: 'game', rarity: 'rare',
    condition: function(data) { return data.flightSpeedWin >= 1 },
    progress: function(data) { return Math.min(data.flightSpeedWin, 1) }, maxProgress: 1 },
  { id: 'flight_item_master', icon: '🎁', title: '道具大师', desc: '一局中使用3个道具', category: 'game', rarity: 'common',
    condition: function(data) { return data.flightItemMaster >= 1 },
    progress: function(data) { return Math.min(data.flightItemMaster, 1) }, maxProgress: 1 },
  { id: 'flight_hard_win', icon: '💎', title: '困难征服者', desc: '在困难模式下获胜', category: 'game', rarity: 'legendary',
    condition: function(data) { return data.flightHardWin >= 1 },
    progress: function(data) { return Math.min(data.flightHardWin, 1) }, maxProgress: 1 },

  // ===== 游戏综合成就 =====
  { id: 'game_play_30', icon: '🎮', title: '游戏迷', desc: '游戏累计游玩30局', category: 'game', rarity: 'common',
    condition: function(data) { return data.gameTotalPlays >= 30 },
    progress: function(data) { return Math.min(data.gameTotalPlays, 30) }, maxProgress: 30 },
  { id: 'game_play_100', icon: '🎪', title: '游戏狂人', desc: '游戏累计游玩100局', category: 'game', rarity: 'rare',
    condition: function(data) { return data.gameTotalPlays >= 100 },
    progress: function(data) { return Math.min(data.gameTotalPlays, 100) }, maxProgress: 100 },

  // ===== 特殊成就 =====
  { id: 'early_bird', icon: '🐦', title: '早起鸟儿', desc: '早上7点前完成打卡', category: 'special', rarity: 'rare',
    condition: function(data) { return data.hasEarlyBird },
    progress: function(data) { return data.hasEarlyBird ? 1 : 0 }, maxProgress: 1 },
  { id: 'night_owl', icon: '🦉', title: '夜猫子', desc: '晚上9点后完成打卡', category: 'special', rarity: 'common',
    condition: function(data) { return data.hasNightOwl },
    progress: function(data) { return data.hasNightOwl ? 1 : 0 }, maxProgress: 1 },
  { id: 'weekend_warrior', icon: '🎉', title: '周末战士', desc: '周末完成所有习惯', category: 'special', rarity: 'rare',
    condition: function(data) { return data.weekendWarrior },
    progress: function(data) { return data.weekendWarrior ? 1 : 0 }, maxProgress: 1 },

  // ===== 综合成就 =====
  { id: 'all_rounder', icon: '⭐', title: '全面发展', desc: '每个模块都有记录', category: 'special', rarity: 'rare',
    condition: function(data) { return data.brushingStreak >= 1 && data.cardsLearned >= 1 && data.drawingsCount >= 1 && data.notesCount >= 1 },
    progress: function(data) { return (data.brushingStreak >= 1 ? 1 : 0) + (data.cardsLearned >= 1 ? 1 : 0) + (data.drawingsCount >= 1 ? 1 : 0) + (data.notesCount >= 1 ? 1 : 0) }, maxProgress: 4 },
  { id: 'super_star', icon: '🌟', title: '超级之星', desc: '解锁15个成就', category: 'special', rarity: 'rare',
    condition: function(data) { return data.unlockedCount >= 15 },
    progress: function(data) { return Math.min(data.unlockedCount, 15) }, maxProgress: 15 },
  { id: 'legend', icon: '👑', title: '传说之子', desc: '解锁全部成就', category: 'special', rarity: 'legendary',
    condition: function(data) { return data.unlockedCount >= TOTAL_ACHIEVEMENTS },
    progress: function(data) { return Math.min(data.unlockedCount, TOTAL_ACHIEVEMENTS) }, maxProgress: TOTAL_ACHIEVEMENTS }
]

// ===== 数据采集 =====

// 计算习惯打卡相关数据
var getHabitExtraData = function() {
  var records = childStorage.get('habitRecords') || []
  var today = util.getTodayStr()

  // 获取所有习惯类型
  var allHabits = habitManager.getAllHabits()

  // 计算每个习惯的连续天数，取最大值
  var maxStreak = 0
  var typeMap = {}
  records.forEach(function(r) {
    if (!typeMap[r.type]) typeMap[r.type] = []
    typeMap[r.type].push(r)
  })
  Object.keys(typeMap).forEach(function(type) {
    var streak = calcStreakFromRecords(typeMap[type])
    if (streak > maxStreak) maxStreak = streak
  })

  // 今日是否完成所有习惯
  var todayRecords = records.filter(function(r) { return r.date === today })
  var todayTypes = {}
  todayRecords.forEach(function(r) { todayTypes[r.type] = true })
  var allDone = allHabits.length > 0 && allHabits.every(function(h) { return todayTypes[h.type] })

  // 是否有早起打卡（7点前）
  var hasEarlyBird = records.some(function(r) {
    return r.time && r.time < '07:00'
  })

  // 是否有晚间打卡（21点后）
  var hasNightOwl = records.some(function(r) {
    return r.time && r.time >= '21:00'
  })

  // 周末是否完成所有习惯
  var weekendWarrior = false
  var now = new Date()
  var dayOfWeek = now.getDay()
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    var weekendToday = todayRecords.map(function(r) { return r.type })
    var uniqueTypes = weekendToday.filter(function(v, i, a) { return a.indexOf(v) === i })
    weekendWarrior = allHabits.length > 0 && uniqueTypes.length >= allHabits.length
  }

  return {
    habitMaxStreak: maxStreak,
    allHabitsDoneToday: allDone,
    totalHabitRecords: records.length,
    hasEarlyBird: hasEarlyBird,
    hasNightOwl: hasNightOwl,
    weekendWarrior: weekendWarrior
  }
}

// 从记录计算连续天数
var calcStreakFromRecords = function(records) {
  if (records.length === 0) return 0
  var dateSet = {}
  records.forEach(function(r) { dateSet[r.date] = true })
  var dates = Object.keys(dateSet).sort().reverse()
  var streak = 0
  for (var i = 0; i < dates.length; i++) {
    var expectedDate = new Date()
    expectedDate.setDate(expectedDate.getDate() - i)
    var year = expectedDate.getFullYear()
    var month = String(expectedDate.getMonth() + 1).padStart(2, '0')
    var day = String(expectedDate.getDate()).padStart(2, '0')
    var expectedStr = year + '-' + month + '-' + day
    if (dates[i] === expectedStr) {
      streak++
    } else {
      break
    }
  }
  return streak
}

// 获取故事系统数据（累计击败敌人数跨轮次计算）
var getStoryExtraData = function() {
  var story = childStorage.get('brushingStory') || {}
  var CHAPTER_COUNT = 7

  // 计算累计击败敌人数：已完成轮次 * 每轮章节数 + 当前轮已击败数
  var completedRounds = (story.round || 1) - 1
  var currentRoundDefeated = (story.defeatedEnemies || []).length
  var totalEnemiesDefeated = completedRounds * CHAPTER_COUNT + currentRoundDefeated

  return {
    storyChapter: story.currentChapter || 1,
    storyRound: story.round || 1,
    totalEnemiesDefeated: totalEnemiesDefeated
  }
}

// 获取摆摊额外数据
var getStallExtraData = function() {
  var sales = childStorage.get('stallSales') || []
  var products = childStorage.get('stallProducts') || []
  var totalRevenue = 0
  var totalProfit = 0

  // 构建商品当前成本价映射（供无快照的老订单 fallback）
  var productCostMap = {}
  for (var i = 0; i < products.length; i++) {
    productCostMap[products[i].id] = products[i].costPrice || 0
  }

  // 使用订单快照成本价计算利润（与 stall-manager 口径一致）
  for (var i = 0; i < sales.length; i++) {
    var sale = sales[i]
    totalRevenue += sale.total || 0
    var discount = sale.discount || 10
    for (var j = 0; j < sale.items.length; j++) {
      var item = sale.items[j]
      var costPrice = item.costPrice || productCostMap[item.productId] || 0
      var itemRevenue = discount < 10
        ? Math.round((item.subtotal || 0) * discount / 10 * 100) / 100
        : (item.subtotal || 0)
      totalProfit += itemRevenue - costPrice * (item.quantity || 0)
    }
  }

  return {
    stallSalesCount: sales.length,
    stallTotalRevenue: Math.round(totalRevenue * 100) / 100,
    stallTotalProfit: Math.round(totalProfit * 100) / 100,
    stallProductTypes: products.length
  }
}

// 获取游戏额外数据
var getGameExtraData = function() {
  // 猜拳数据
  var rpsStats = childStorage.get('rpsStats') || {}
  var rpsStory = childStorage.get('rpsStory') || {}
  var rpsChallenge = childStorage.get('rpsChallenge') || {}

  // 骰子数据
  var diceStats = childStorage.get('diceStats') || {}
  var diceMissions = childStorage.get('diceMissions') || []

  return {
    rpsWins: rpsStats.wins || 0,
    rpsTotalGames: rpsStats.totalGames || 0,
    rpsBestStreak: rpsStats.bestStreak || 0,
    rpsStoryDone: (rpsStory.currentChapter || 1) > 7,
    rpsChallengeLevel: rpsChallenge.currentLevel || 1,
    rpsChallengeStars: rpsChallenge.totalStars || 0,
    diceWins: diceStats.wins || 0,
    diceTotalGames: diceStats.totalGames || 0,
    diceBestStreak: diceStats.bestStreak || 0,
    diceLeopardCount: diceStats.leopardCount || 0,
    diceMissionsDone: diceMissions.length,
    gameTotalPlays: (rpsStats.totalGames || 0) + (diceStats.totalGames || 0)
  }
}

// 获取当前完整数据
var getCurrentData = function(records) {
  var drawings = childStorage.get('drawings') || []
  var notes = childStorage.get('notes') || []

  // 刷牙连续天数（使用传入的记录或本地记录）
  var brushingStats = util.getBrushingStats(records)

  // 学习进度
  var cardsLearned = learnData.getCardsLearnedCount()
  var poemsMemorized = learnData.getPoemsMemorizedCount()
  var numbersLearned = learnData.getNumbersLearnedCount()
  var englishLearned = learnData.getEnglishLearnedCount()

  // 已解锁成就数量
  var unlocked = getUnlockedAchievements()
  var unlockedCount = unlocked.length

  // 习惯额外数据
  var habitData = getHabitExtraData()

  // 故事额外数据
  var storyData = getStoryExtraData()

  // 摆摊额外数据
  var stallData = getStallExtraData()

  // 游戏额外数据
  var gameData = getGameExtraData()

  return {
    brushingStreak: brushingStats.streak,
    cardsLearned: cardsLearned,
    poemsMemorized: poemsMemorized,
    numbersLearned: numbersLearned,
    englishLearned: englishLearned,
    drawingsCount: drawings.length,
    notesCount: notes.length,
    unlockedCount: unlockedCount,
    habitMaxStreak: habitData.habitMaxStreak,
    allHabitsDoneToday: habitData.allHabitsDoneToday,
    totalHabitRecords: habitData.totalHabitRecords,
    hasEarlyBird: habitData.hasEarlyBird,
    hasNightOwl: habitData.hasNightOwl,
    weekendWarrior: habitData.weekendWarrior,
    storyChapter: storyData.storyChapter,
    storyRound: storyData.storyRound,
    totalEnemiesDefeated: storyData.totalEnemiesDefeated,
    stallSalesCount: stallData.stallSalesCount,
    stallTotalRevenue: stallData.stallTotalRevenue,
    stallTotalProfit: stallData.stallTotalProfit,
    stallProductTypes: stallData.stallProductTypes,
    rpsWins: gameData.rpsWins,
    rpsTotalGames: gameData.rpsTotalGames,
    rpsBestStreak: gameData.rpsBestStreak,
    rpsStoryDone: gameData.rpsStoryDone,
    rpsChallengeLevel: gameData.rpsChallengeLevel,
    rpsChallengeStars: gameData.rpsChallengeStars,
    diceWins: gameData.diceWins,
    diceTotalGames: gameData.diceTotalGames,
    diceBestStreak: gameData.diceBestStreak,
    diceLeopardCount: gameData.diceLeopardCount,
    diceMissionsDone: gameData.diceMissionsDone,
    gameTotalPlays: gameData.gameTotalPlays
  }
}

// ===== 核心 API =====

// 获取已解锁成就
var getUnlockedAchievements = function() {
  return childStorage.get('achievements') || []
}

// 检查并解锁新成就
var checkAchievements = function(records) {
  var data = getCurrentData(records)
  var unlocked = getUnlockedAchievements()
  var unlockedIds = {}
  unlocked.forEach(function(a) { unlockedIds[a.id] = true })

  var newAchievements = []

  ACHIEVEMENTS.forEach(function(achievement) {
    if (!unlockedIds[achievement.id] && achievement.condition(data)) {
      newAchievements.push({
        id: achievement.id,
        icon: achievement.icon,
        title: achievement.title,
        desc: achievement.desc,
        category: achievement.category,
        rarity: achievement.rarity,
        unlockedAt: new Date().toISOString()
      })
    }
  })

  if (newAchievements.length > 0) {
    var allUnlocked = unlocked.concat(newAchievements)
    try {
      childStorage.set('achievements', allUnlocked)
      var cloud = require('./cloud.js')
      cloud.uploadAchievements(allUnlocked).catch(function() {})
    } catch (e) {
      console.error('保存成就数据失败:', e)
    }
  }

  return newAchievements
}

// 获取所有成就（含解锁状态和进度）
var getAllAchievements = function() {
  var unlocked = getUnlockedAchievements()
  var unlockedIds = {}
  unlocked.forEach(function(a) { unlockedIds[a.id] = true })
  var data = getCurrentData()

  return ACHIEVEMENTS.map(function(a) {
    var isUnlocked = !!unlockedIds[a.id]
    var unlockedInfo = isUnlocked ? unlocked.filter(function(u) { return u.id === a.id })[0] : null
    return {
      id: a.id,
      icon: a.icon,
      title: a.title,
      desc: a.desc,
      category: a.category,
      rarity: a.rarity,
      rarityInfo: RARITY[a.rarity],
      unlocked: isUnlocked,
      unlockedAt: unlockedInfo ? unlockedInfo.unlockedAt : null,
      progress: a.progress(data),
      maxProgress: a.maxProgress,
      progressPercent: Math.round((a.progress(data) / a.maxProgress) * 100)
    }
  })
}

// 按分类获取成就
var getAchievementsByCategory = function(category) {
  var all = getAllAchievements()
  if (!category || category === 'all') return all
  return all.filter(function(a) { return a.category === category })
}

// 获取成就统计
var getAchievementStats = function() {
  var unlocked = getUnlockedAchievements()
  return {
    total: ACHIEVEMENTS.length,
    unlocked: unlocked.length,
    percentage: ACHIEVEMENTS.length > 0 ? Math.round((unlocked.length / ACHIEVEMENTS.length) * 100) : 0
  }
}

// 获取最近解锁的成就
var getRecentUnlocked = function(limit) {
  var unlocked = getUnlockedAchievements()
  return unlocked.slice(-(limit || 4)).reverse()
}

// 获取稀有度定义
var getRarityInfo = function(rarity) {
  return RARITY[rarity] || RARITY.common
}

// 异步版本：先同步云端数据再检查成就
var checkAchievementsAsync = async function() {
  var cloud = require('./cloud.js')
  var records = await cloud.fetchBrushingRecords()
  return checkAchievements(records)
}

module.exports = {
  RARITY: RARITY,
  ACHIEVEMENTS: ACHIEVEMENTS,
  checkAchievements: checkAchievements,
  checkAchievementsAsync: checkAchievementsAsync,
  getUnlockedAchievements: getUnlockedAchievements,
  getAllAchievements: getAllAchievements,
  getAchievementsByCategory: getAchievementsByCategory,
  getAchievementStats: getAchievementStats,
  getRecentUnlocked: getRecentUnlocked,
  getRarityInfo: getRarityInfo
}
