/**
 * 英语语法知识点数据 - 适合小学生
 * 共30条，涵盖基础语法
 */
const grammarData = [
  {
    id: 1,
    title: "be动词的用法",
    rule: "I用am, you用are, is连着他她它",
    example: "I am a student. You are my friend. He is a boy.",
    tip: "记住口诀：我用am，你用are，is跟着他她它"
  },
  {
    id: 2,
    title: "名词单复数 - 规则变化",
    rule: "一般名词加s，以s/x/ch/sh结尾加es",
    example: "book→books, box→boxes, bus→buses",
    tip: "大部分名词变复数直接加s"
  },
  {
    id: 3,
    title: "名词单复数 - 不规则变化",
    rule: "有些名词变复数不规则，需要特殊记忆",
    example: "man→men, woman→women, child→children, foot→feet",
    tip: "这些不规则变化要一个一个记住哦"
  },
  {
    id: 4,
    title: "人称代词主格",
    rule: "主格代词作主语：I, you, he, she, it, we, they",
    example: "I like apples. She is beautiful. They are happy.",
    tip: "主格放在动词前面做主语"
  },
  {
    id: 5,
    title: "人称代词宾格",
    rule: "宾格代词作宾语：me, you, him, her, it, us, them",
    example: "Give me a book. Let us play. Help him please.",
    tip: "宾格放在动词后面做宾语"
  },
  {
    id: 6,
    title: "形容词性物主代词",
    rule: "my, your, his, her, its, our, their + 名词",
    example: "This is my book. That is her cat.",
    tip: "形容词性物主代词后面一定要跟名词"
  },
  {
    id: 7,
    title: "名词性物主代词",
    rule: "mine, yours, his, hers, its, ours, theirs 单独使用",
    example: "This book is mine. That cat is hers.",
    tip: "名词性物主代词后面不跟名词"
  },
  {
    id: 8,
    title: "一般现在时",
    rule: "表示经常发生的动作或事实",
    example: "I go to school every day. The sun rises in the east.",
    tip: "标志词：always, usually, often, every day"
  },
  {
    id: 9,
    title: "第三人称单数",
    rule: "he/she/it做主语时，动词要加s或es",
    example: "He likes music. She watches TV. It runs fast.",
    tip: "三单变化规则和名词复数类似"
  },
  {
    id: 10,
    title: "现在进行时",
    rule: "be动词 + 动词ing，表示正在做的事",
    example: "I am reading a book. They are playing football.",
    tip: "标志词：now, look, listen"
  },
  {
    id: 11,
    title: "动词ing的变化规则",
    rule: "一般加ing，去e加ing，双写加ing",
    example: "play→playing, make→making, run→running",
    tip: "以重读闭音节结尾的要双写末尾字母"
  },
  {
    id: 12,
    title: "一般过去时",
    rule: "表示过去发生的动作",
    example: "I watched TV yesterday. She went to school.",
    tip: "标志词：yesterday, last week, ago"
  },
  {
    id: 13,
    title: "动词过去式 - 规则变化",
    rule: "一般加ed，以e结尾加d，辅音y变ied",
    example: "play→played, like→liked, study→studied",
    tip: "不规则动词需要单独记忆"
  },
  {
    id: 14,
    title: "一般将来时 will",
    rule: "will + 动词原形，表示将要做的事",
    example: "I will go to Beijing. It will rain tomorrow.",
    tip: "标志词：tomorrow, next week, in the future"
  },
  {
    id: 15,
    title: "一般将来时 be going to",
    rule: "be going to + 动词原形，表示计划做某事",
    example: "I am going to visit my grandma. We are going to have a picnic.",
    tip: "be going to强调计划和打算"
  },
  {
    id: 16,
    title: "There is / There are",
    rule: "There is + 单数/不可数，There are + 复数",
    example: "There is a cat on the table. There are five apples.",
    tip: "就近原则：离be动词最近的名词决定用is还是are"
  },
  {
    id: 17,
    title: "冠词a和an",
    rule: "辅音音素前用a，元音音素前用an",
    example: "a book, a cat, an apple, an egg, an hour",
    tip: "注意是看发音，不是看字母！hour开头h不发音"
  },
  {
    id: 18,
    title: "冠词the",
    rule: "特指某个人或物时用the",
    example: "The book on the desk is mine. Open the door, please.",
    tip: "第二次提到的东西也用the"
  },
  {
    id: 19,
    title: "this / that / these / those",
    rule: "this/that是单数，these/those是复数",
    example: "This is a pen. Those are books.",
    tip: "this/these指近处，that/those指远处"
  },
  {
    id: 20,
    title: "疑问句 - 一般疑问句",
    rule: "把be动词/助动词提到句首，句末用问号",
    example: "Are you happy? Do you like apples? Can you swim?",
    tip: "回答用Yes或No开头"
  },
  {
    id: 21,
    title: "疑问句 - 特殊疑问句",
    rule: "用疑问词what/where/when/who/how开头",
    example: "What is your name? Where do you live? How are you?",
    tip: "不同疑问词问不同的内容"
  },
  {
    id: 22,
    title: "否定句",
    rule: "在be动词/助动词后加not",
    example: "I am not a teacher. He does not like fish. Do not run!",
    tip: "缩写：isn't, aren't, don't, doesn't"
  },
  {
    id: 23,
    title: "祈使句",
    rule: "以动词原形开头，表示命令、请求或建议",
    example: "Open the door, please. Don't run in the hall. Let's go!",
    tip: "否定祈使句用Don't + 动词原形"
  },
  {
    id: 24,
    title: "情态动词 can",
    rule: "can + 动词原形，表示能力或许可",
    example: "I can swim. She can sing. Can you help me?",
    tip: "can后面永远跟动词原形"
  },
  {
    id: 25,
    title: "介词 in / on / at",
    rule: "in用于年月季节，on用于具体某天，at用于时刻",
    example: "in May, in summer, on Monday, on Children's Day, at 8 o'clock",
    tip: "in在...里面，on在...上面，at在...时刻"
  },
  {
    id: 26,
    title: "介词 方位介词",
    rule: "in在...里，on在...上，under在...下，behind在...后",
    example: "The ball is under the table. The cat is behind the door.",
    tip: "方位介词表示位置关系"
  },
  {
    id: 27,
    title: "连词 and / but / or",
    rule: "and表并列，but表转折，or表选择",
    example: "I like apples and bananas. It's small but cute. Tea or coffee?",
    tip: "and和，but但是，or或者"
  },
  {
    id: 28,
    title: "How many 和 How much",
    rule: "How many + 可数名词复数，How much + 不可数名词",
    example: "How many books do you have? How much water do you want?",
    tip: "How many问数量(可数)，How much问数量(不可数)或价格"
  },
  {
    id: 29,
    title: "名词所有格",
    rule: "表示"...的"，加's或'",
    example: "Tom's bag, my mother's car, the teachers' office",
    tip: "单数名词加's，以s结尾的复数名词加'"
  },
  {
    id: 30,
    title: "感叹句",
    rule: "What + (a/an) + 形容词 + 名词! 或 How + 形容词!",
    example: "What a beautiful flower! How cute the dog is!",
    tip: "感叹句表达强烈的感情"
  }
];

module.exports = grammarData;
