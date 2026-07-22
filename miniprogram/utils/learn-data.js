/**
 * 学习数据管理工具
 * 统一管理学习内容和进度
 */

// ===== 识字卡片数据 =====
var CARDS = [
  { id: 'c01', word: '人', pinyin: 'rén', meaning: '人类', category: '基础' },
  { id: 'c02', word: '大', pinyin: 'dà', meaning: '大的', category: '基础' },
  { id: 'c03', word: '小', pinyin: 'xiǎo', meaning: '小的', category: '基础' },
  { id: 'c04', word: '上', pinyin: 'shàng', meaning: '上面', category: '基础' },
  { id: 'c05', word: '下', pinyin: 'xià', meaning: '下面', category: '基础' },
  { id: 'c06', word: '天', pinyin: 'tiān', meaning: '天空', category: '基础' },
  { id: 'c07', word: '地', pinyin: 'dì', meaning: '大地', category: '基础' },
  { id: 'c08', word: '日', pinyin: 'rì', meaning: '太阳', category: '基础' },
  { id: 'c09', word: '月', pinyin: 'yuè', meaning: '月亮', category: '基础' },
  { id: 'c10', word: '水', pinyin: 'shuǐ', meaning: '水', category: '基础' },
  { id: 'c11', word: '火', pinyin: 'huǒ', meaning: '火', category: '基础' },
  { id: 'c12', word: '山', pinyin: 'shān', meaning: '山', category: '基础' },
  { id: 'c13', word: '石', pinyin: 'shí', meaning: '石头', category: '基础' },
  { id: 'c14', word: '木', pinyin: 'mù', meaning: '树木', category: '基础' },
  { id: 'c15', word: '花', pinyin: 'huā', meaning: '花朵', category: '植物' },
  { id: 'c16', word: '草', pinyin: 'cǎo', meaning: '小草', category: '植物' },
  { id: 'c17', word: '树', pinyin: 'shù', meaning: '大树', category: '植物' },
  { id: 'c18', word: '鸟', pinyin: 'niǎo', meaning: '小鸟', category: '动物' },
  { id: 'c19', word: '鱼', pinyin: 'yú', meaning: '鱼', category: '动物' },
  { id: 'c20', word: '马', pinyin: 'mǎ', meaning: '马', category: '动物' },
  { id: 'c21', word: '牛', pinyin: 'niú', meaning: '牛', category: '动物' },
  { id: 'c22', word: '羊', pinyin: 'yáng', meaning: '羊', category: '动物' },
  { id: 'c23', word: '猫', pinyin: 'māo', meaning: '猫咪', category: '动物' },
  { id: 'c24', word: '狗', pinyin: 'gǒu', meaning: '小狗', category: '动物' },
  { id: 'c25', word: '爸', pinyin: 'bà', meaning: '爸爸', category: '家人' },
  { id: 'c26', word: '妈', pinyin: 'mā', meaning: '妈妈', category: '家人' },
  { id: 'c27', word: '我', pinyin: 'wǒ', meaning: '我', category: '基础' },
  { id: 'c28', word: '你', pinyin: 'nǐ', meaning: '你', category: '基础' },
  { id: 'c29', word: '好', pinyin: 'hǎo', meaning: '好的', category: '基础' },
  { id: 'c30', word: '吃', pinyin: 'chī', meaning: '吃东西', category: '动作' },
  { id: 'c31', word: '一', pinyin: 'yī', meaning: '数字1', category: '数字' },
  { id: 'c32', word: '二', pinyin: 'èr', meaning: '数字2', category: '数字' },
  { id: 'c33', word: '三', pinyin: 'sān', meaning: '数字3', category: '数字' },
  { id: 'c34', word: '四', pinyin: 'sì', meaning: '数字4', category: '数字' },
  { id: 'c35', word: '五', pinyin: 'wǔ', meaning: '数字5', category: '数字' },
  { id: 'c36', word: '六', pinyin: 'liù', meaning: '数字6', category: '数字' },
  { id: 'c37', word: '七', pinyin: 'qī', meaning: '数字7', category: '数字' },
  { id: 'c38', word: '八', pinyin: 'bā', meaning: '数字8', category: '数字' },
  { id: 'c39', word: '九', pinyin: 'jiǔ', meaning: '数字9', category: '数字' },
  { id: 'c40', word: '十', pinyin: 'shí', meaning: '数字10', category: '数字' },
  { id: 'c41', word: '头', pinyin: 'tóu', meaning: '头', category: '身体' },
  { id: 'c42', word: '手', pinyin: 'shǒu', meaning: '手', category: '身体' },
  { id: 'c43', word: '脚', pinyin: 'jiǎo', meaning: '脚', category: '身体' },
  { id: 'c44', word: '眼', pinyin: 'yǎn', meaning: '眼睛', category: '身体' },
  { id: 'c45', word: '耳', pinyin: 'ěr', meaning: '耳朵', category: '身体' },
  { id: 'c46', word: '口', pinyin: 'kǒu', meaning: '嘴巴', category: '身体' },
  { id: 'c47', word: '鼻', pinyin: 'bí', meaning: '鼻子', category: '身体' },
  { id: 'c48', word: '爷', pinyin: 'yé', meaning: '爷爷', category: '家人' },
  { id: 'c49', word: '奶', pinyin: 'nǎi', meaning: '奶奶', category: '家人' },
  { id: 'c50', word: '哥', pinyin: 'gē', meaning: '哥哥', category: '家人' },
  { id: 'c51', word: '姐', pinyin: 'jiě', meaning: '姐姐', category: '家人' },
  { id: 'c52', word: '弟', pinyin: 'dì', meaning: '弟弟', category: '家人' },
  { id: 'c53', word: '妹', pinyin: 'mèi', meaning: '妹妹', category: '家人' },
  { id: 'c54', word: '鸡', pinyin: 'jī', meaning: '小鸡', category: '动物' },
  { id: 'c55', word: '鸭', pinyin: 'yā', meaning: '鸭子', category: '动物' },
  { id: 'c56', word: '兔', pinyin: 'tù', meaning: '兔子', category: '动物' },
  { id: 'c57', word: '龙', pinyin: 'lóng', meaning: '龙', category: '动物' },
  { id: 'c58', word: '蛇', pinyin: 'shé', meaning: '蛇', category: '动物' },
  { id: 'c59', word: '猪', pinyin: 'zhū', meaning: '猪', category: '动物' },
  { id: 'c60', word: '虫', pinyin: 'chóng', meaning: '虫子', category: '动物' },
  { id: 'c61', word: '苹果', pinyin: 'píng guǒ', meaning: '苹果', category: '水果' },
  { id: 'c62', word: '香蕉', pinyin: 'xiāng jiāo', meaning: '香蕉', category: '水果' },
  { id: 'c63', word: '葡萄', pinyin: 'pú táo', meaning: '葡萄', category: '水果' },
  { id: 'c64', word: '西瓜', pinyin: 'xī guā', meaning: '西瓜', category: '水果' },
  { id: 'c65', word: '草莓', pinyin: 'cǎo méi', meaning: '草莓', category: '水果' },
  { id: 'c66', word: '红', pinyin: 'hóng', meaning: '红色', category: '颜色' },
  { id: 'c67', word: '黄', pinyin: 'huáng', meaning: '黄色', category: '颜色' },
  { id: 'c68', word: '蓝', pinyin: 'lán', meaning: '蓝色', category: '颜色' },
  { id: 'c69', word: '绿', pinyin: 'lǜ', meaning: '绿色', category: '颜色' },
  { id: 'c70', word: '白', pinyin: 'bái', meaning: '白色', category: '颜色' },
  { id: 'c71', word: '黑', pinyin: 'hēi', meaning: '黑色', category: '颜色' },
  { id: 'c72', word: '走', pinyin: 'zǒu', meaning: '走路', category: '动作' },
  { id: 'c73', word: '跑', pinyin: 'pǎo', meaning: '跑步', category: '动作' },
  { id: 'c74', word: '跳', pinyin: 'tiào', meaning: '跳跃', category: '动作' },
  { id: 'c75', word: '飞', pinyin: 'fēi', meaning: '飞翔', category: '动作' },
  { id: 'c76', word: '看', pinyin: 'kàn', meaning: '看见', category: '动作' },
  { id: 'c77', word: '听', pinyin: 'tīng', meaning: '听见', category: '动作' },
  { id: 'c78', word: '说', pinyin: 'shuō', meaning: '说话', category: '动作' },
  { id: 'c79', word: '唱', pinyin: 'chàng', meaning: '唱歌', category: '动作' },
  { id: 'c80', word: '画', pinyin: 'huà', meaning: '画画', category: '动作' },
  { id: 'c81', word: '东', pinyin: 'dōng', meaning: '东方', category: '方位' },
  { id: 'c82', word: '西', pinyin: 'xī', meaning: '西方', category: '方位' },
  { id: 'c83', word: '南', pinyin: 'nán', meaning: '南方', category: '方位' },
  { id: 'c84', word: '北', pinyin: 'běi', meaning: '北方', category: '方位' },
  { id: 'c85', word: '左', pinyin: 'zuǒ', meaning: '左边', category: '方位' },
  { id: 'c86', word: '右', pinyin: 'yòu', meaning: '右边', category: '方位' },
  { id: 'c87', word: '前', pinyin: 'qián', meaning: '前面', category: '方位' },
  { id: 'c88', word: '后', pinyin: 'hòu', meaning: '后面', category: '方位' },
  { id: 'c89', word: '风', pinyin: 'fēng', meaning: '风', category: '自然' },
  { id: 'c90', word: '雨', pinyin: 'yǔ', meaning: '下雨', category: '自然' },
  { id: 'c91', word: '雪', pinyin: 'xuě', meaning: '下雪', category: '自然' },
  { id: 'c92', word: '云', pinyin: 'yún', meaning: '云朵', category: '自然' },
  { id: 'c93', word: '星', pinyin: 'xīng', meaning: '星星', category: '自然' },
  { id: 'c94', word: '光', pinyin: 'guāng', meaning: '光亮', category: '自然' },
  { id: 'c95', word: '衣', pinyin: 'yī', meaning: '衣服', category: '物品' },
  { id: 'c96', word: '裤', pinyin: 'kù', meaning: '裤子', category: '物品' },
  { id: 'c97', word: '鞋', pinyin: 'xié', meaning: '鞋子', category: '物品' },
  { id: 'c98', word: '帽', pinyin: 'mào', meaning: '帽子', category: '物品' },
  { id: 'c99', word: '书', pinyin: 'shū', meaning: '书本', category: '物品' },
  { id: 'c100', word: '笔', pinyin: 'bǐ', meaning: '笔', category: '物品' },
  { id: 'c101', word: '饭', pinyin: 'fàn', meaning: '米饭', category: '食物' },
  { id: 'c102', word: '菜', pinyin: 'cài', meaning: '蔬菜', category: '食物' },
  { id: 'c103', word: '肉', pinyin: 'ròu', meaning: '肉', category: '食物' },
  { id: 'c104', word: '蛋', pinyin: 'dàn', meaning: '鸡蛋', category: '食物' },
  { id: 'c105', word: '奶', pinyin: 'nǎi', meaning: '牛奶', category: '食物' },
  { id: 'c106', word: '快', pinyin: 'kuài', meaning: '快速', category: '形容' },
  { id: 'c107', word: '慢', pinyin: 'màn', meaning: '慢速', category: '形容' },
  { id: 'c108', word: '高', pinyin: 'gāo', meaning: '高大', category: '形容' },
  { id: 'c109', word: '矮', pinyin: 'ǎi', meaning: '矮小', category: '形容' },
  { id: 'c110', word: '长', pinyin: 'cháng', meaning: '长的', category: '形容' },
  { id: 'c111', word: '短', pinyin: 'duǎn', meaning: '短的', category: '形容' },
  { id: 'c112', word: '多', pinyin: 'duō', meaning: '很多', category: '形容' },
  { id: 'c113', word: '少', pinyin: 'shǎo', meaning: '很少', category: '形容' },
  { id: 'c114', word: '热', pinyin: 'rè', meaning: '热的', category: '形容' },
  { id: 'c115', word: '冷', pinyin: 'lěng', meaning: '冷的', category: '形容' },
  { id: 'c116', word: '早', pinyin: 'zǎo', meaning: '早上', category: '时间' },
  { id: 'c117', word: '晚', pinyin: 'wǎn', meaning: '晚上', category: '时间' },
  { id: 'c118', word: '年', pinyin: 'nián', meaning: '年', category: '时间' },
  { id: 'c119', word: '月', pinyin: 'yuè', meaning: '月份', category: '时间' },
  { id: 'c120', word: '天', pinyin: 'tiān', meaning: '一天', category: '时间' }
]

// ===== 古诗数据 =====
var POEMS = [
  { id: 'p01', title: '静夜思', author: '李白', dynasty: '唐', content: '床前明月光，\n疑是地上霜。\n举头望明月，\n低头思故乡。' },
  { id: 'p02', title: '春晓', author: '孟浩然', dynasty: '唐', content: '春眠不觉晓，\n处处闻啼鸟。\n夜来风雨声，\n花落知多少。' },
  { id: 'p03', title: '咏鹅', author: '骆宾王', dynasty: '唐', content: '鹅鹅鹅，\n曲项向天歌。\n白毛浮绿水，\n红掌拨清波。' },
  { id: 'p04', title: '悯农', author: '李绅', dynasty: '唐', content: '锄禾日当午，\n汗滴禾下土。\n谁知盘中餐，\n粒粒皆辛苦。' },
  { id: 'p05', title: '登鹳雀楼', author: '王之涣', dynasty: '唐', content: '白日依山尽，\n黄河入海流。\n欲穷千里目，\n更上一层楼。' },
  { id: 'p06', title: '相思', author: '王维', dynasty: '唐', content: '红豆生南国，\n春来发几枝。\n愿君多采撷，\n此物最相思。' },
  { id: 'p07', title: '江雪', author: '柳宗元', dynasty: '唐', content: '千山鸟飞绝，\n万径人踪灭。\n孤舟蓑笠翁，\n独钓寒江雪。' },
  { id: 'p08', title: '寻隐者不遇', author: '贾岛', dynasty: '唐', content: '松下问童子，\n言师采药去。\n只在此山中，\n云深不知处。' },
  { id: 'p09', title: '风', author: '李峤', dynasty: '唐', content: '解落三秋叶，\n能开二月花。\n过江千尺浪，\n入竹万竿斜。' },
  { id: 'p10', title: '小池', author: '杨万里', dynasty: '宋', content: '泉眼无声惜细流，\n树阴照水爱晴柔。\n小荷才露尖尖角，\n早有蜻蜓立上头。' },
  { id: 'p11', title: '望庐山瀑布', author: '李白', dynasty: '唐', content: '日照香炉生紫烟，\n遥看瀑布挂前川。\n飞流直下三千尺，\n疑是银河落九天。' },
  { id: 'p12', title: '绝句', author: '杜甫', dynasty: '唐', content: '两个黄鹂鸣翠柳，\n一行白鹭上青天。\n窗含西岭千秋雪，\n门泊东吴万里船。' },
  { id: 'p13', title: '咏柳', author: '贺知章', dynasty: '唐', content: '碧玉妆成一树高，\n万条垂下绿丝绦。\n不知细叶谁裁出，\n二月春风似剪刀。' },
  { id: 'p14', title: '回乡偶书', author: '贺知章', dynasty: '唐', content: '少小离家老大回，\n乡音无改鬓毛衰。\n儿童相见不相识，\n笑问客从何处来。' },
  { id: 'p15', title: '九月九日忆山东兄弟', author: '王维', dynasty: '唐', content: '独在异乡为异客，\n每逢佳节倍思亲。\n遥知兄弟登高处，\n遍插茱萸少一人。' },
  { id: 'p16', title: '望天门山', author: '李白', dynasty: '唐', content: '天门中断楚江开，\n碧水东流至此回。\n两岸青山相对出，\n孤帆一片日边来。' },
  { id: 'p17', title: '别董大', author: '高适', dynasty: '唐', content: '千里黄云白日曛，\n北风吹雁雪纷纷。\n莫愁前路无知己，\n天下谁人不识君。' },
  { id: 'p18', title: '江南春', author: '杜牧', dynasty: '唐', content: '千里莺啼绿映红，\n水村山郭酒旗风。\n南朝四百八十寺，\n多少楼台烟雨中。' },
  { id: 'p19', title: '早发白帝城', author: '李白', dynasty: '唐', content: '朝辞白帝彩云间，\n千里江陵一日还。\n两岸猿声啼不住，\n轻舟已过万重山。' },
  { id: 'p20', title: '清明', author: '杜牧', dynasty: '唐', content: '清明时节雨纷纷，\n路上行人欲断魂。\n借问酒家何处有，\n牧童遥指杏花村。' },
  { id: 'p21', title: '游子吟', author: '孟郊', dynasty: '唐', content: '慈母手中线，\n游子身上衣。\n临行密密缝，\n意恐迟迟归。\n谁言寸草心，\n报得三春晖。' },
  { id: 'p22', title: '赋得古原草送别', author: '白居易', dynasty: '唐', content: '离离原上草，\n一岁一枯荣。\n野火烧不尽，\n春风吹又生。' },
  { id: 'p23', title: '出塞', author: '王昌龄', dynasty: '唐', content: '秦时明月汉时关，\n万里长征人未还。\n但使龙城飞将在，\n不教胡马度阴山。' },
  { id: 'p24', title: '凉州词', author: '王翰', dynasty: '唐', content: '葡萄美酒夜光杯，\n欲饮琵琶马上催。\n醉卧沙场君莫笑，\n古来征战几人回。' },
  { id: 'p25', title: '芙蓉楼送辛渐', author: '王昌龄', dynasty: '唐', content: '寒雨连江夜入吴，\n平明送客楚山孤。\n洛阳亲友如相问，\n一片冰心在玉壶。' }
]

var childStorage = require('./child-storage.js')
var cardsData = require('./cards-data.js')
var numbersData = require('./numbers-data.js')
var englishData = require('./english-data.js')

// ===== 进度管理 =====
var getProgress = function() {
  var learnProgress = childStorage.get('learnProgress') || {}
  return {
    cards: learnProgress.cards || {},
    poems: learnProgress.poems || {},
    numbers: learnProgress.numbers || {},
    english: learnProgress.english || {}
  }
}

var getCardsLearnedCount = function() {
  return Object.keys(getProgress().cards).length
}

var getPoemsMemorizedCount = function() {
  return Object.keys(getProgress().poems).length
}

var getNumbersLearnedCount = function() {
  return Object.keys(getProgress().numbers).length
}

var getEnglishLearnedCount = function() {
  return Object.keys(getProgress().english).length
}

// 标记卡片已学
var markCardLearned = function(cardId) {
  var progress = getProgress()
  if (!progress.cards[cardId]) {
    progress.cards[cardId] = { learnedAt: new Date().toISOString() }
    var learnProgress = childStorage.get('learnProgress') || {}
    learnProgress.cards = progress.cards
    childStorage.set('learnProgress', learnProgress)
  }
}

// 标记古诗已背诵
var markPoemMemorized = function(poemId) {
  var progress = getProgress()
  if (!progress.poems[poemId]) {
    progress.poems[poemId] = { memorizedAt: new Date().toISOString() }
    var learnProgress = childStorage.get('learnProgress') || {}
    learnProgress.poems = progress.poems
    childStorage.set('learnProgress', learnProgress)
  }
}

// 标记数字已学
var markNumberLearned = function(number) {
  var progress = getProgress()
  if (!progress.numbers[number]) {
    progress.numbers[number] = { learnedAt: new Date().toISOString() }
    var learnProgress = childStorage.get('learnProgress') || {}
    learnProgress.numbers = progress.numbers
    childStorage.set('learnProgress', learnProgress)
  }
}

// 标记英语已学
var markEnglishLearned = function(id) {
  var progress = getProgress()
  if (!progress.english[id]) {
    progress.english[id] = { learnedAt: new Date().toISOString() }
    var learnProgress = childStorage.get('learnProgress') || {}
    learnProgress.english = progress.english
    childStorage.set('learnProgress', learnProgress)
  }
}

// 获取推荐内容（基于学习进度）
var getRecommendations = function() {
  var recommendations = []
  var progress = getProgress()

  // 未学的识字卡片（用新字表，取最简单的未学字，与识字主页定位一致）
  var cardsResult = cardsData.loadCards()
  var unlearnedCards = cardsResult.cards.filter(function(c) { return !c.learned })
  if (unlearnedCards.length > 0) {
    var card = unlearnedCards[0]
    recommendations.push({
      type: 'learn',
      icon: '🔤',
      text: '学一个汉字: ' + card.word + ' (' + card.meaning + ')',
      target: '/packageLearn/pages/cards/index?id=' + card.id
    })
  }

  // 未背的古诗
  var unmemorizedPoems = POEMS.filter(function(p) { return !progress.poems[p.id] })
  if (unmemorizedPoems.length > 0) {
    var poem = unmemorizedPoems[0]
    recommendations.push({
      type: 'learn',
      icon: '📜',
      text: '学一首古诗《' + poem.title + '》',
      target: '/packageLearn/pages/poems/index?id=' + poem.id
    })
  }

  // 数字学习（用新数据层，取第一个未学，与数字主页定位一致）
  var numbersResult = numbersData.loadNumbers()
  var unlearnedNumbers = numbersResult.numbers.filter(function(n) { return !n.learned })
  if (unlearnedNumbers.length > 0) {
    var num = unlearnedNumbers[0]
    recommendations.push({
      type: 'learn',
      icon: '🔢',
      text: '学数字: ' + num.number + ' (' + num.chinese + ')',
      target: '/packageLearn/pages/numbers/index?id=' + num.number
    })
  }

  // 英语学习（用新数据层，优先推荐未学字母，其次推荐未学单词）
  var lettersResult = englishData.loadLetters()
  var unlearnedLetters = lettersResult.letters.filter(function(l) { return !l.learned })
  if (unlearnedLetters.length > 0) {
    var letter = unlearnedLetters[0]
    recommendations.push({
      type: 'learn',
      icon: '🔤',
      text: '学字母: ' + letter.letter + ' (' + letter.word + ')',
      target: '/packageLearn/pages/english/index?mode=letters&id=' + letter.id
    })
  } else {
    var wordsResult = englishData.loadWords()
    var unlearnedWords = wordsResult.words.filter(function(w) { return !w.learned })
    if (unlearnedWords.length > 0) {
      var w = unlearnedWords[0]
      recommendations.push({
        type: 'learn',
        icon: '🔤',
        text: '学单词: ' + w.word + ' (' + w.meaning + ')',
        target: '/packageLearn/pages/english/index?mode=words&id=' + w.id
      })
    }
  }

  // 创作推荐
  var drawings = childStorage.get('drawings') || []
  if (drawings.length < 10) {
    recommendations.push({
      type: 'create',
      icon: '🎨',
      text: '画一幅画',
      target: '/packageCreate/pages/create/draw/draw?mode=free'
    })
  }

  // 笔记推荐
  var notes = childStorage.get('notes') || []
  if (notes.length < 5) {
    recommendations.push({
      type: 'notes',
      icon: '📝',
      text: '记录今天的成长故事',
      target: '/pages/notes/add'
    })
  }

  return recommendations.slice(0, 3)
}

module.exports = {
  CARDS: CARDS,
  POEMS: POEMS,
  getProgress: getProgress,
  getCardsLearnedCount: getCardsLearnedCount,
  getPoemsMemorizedCount: getPoemsMemorizedCount,
  getNumbersLearnedCount: getNumbersLearnedCount,
  getEnglishLearnedCount: getEnglishLearnedCount,
  markCardLearned: markCardLearned,
  markPoemMemorized: markPoemMemorized,
  markNumberLearned: markNumberLearned,
  markEnglishLearned: markEnglishLearned,
  getRecommendations: getRecommendations
}
