/**
 * 英语口语练习数据 - 适合小学生
 * 共20条练习题
 */
const speakingPracticeData = [
  {
    id: 1,
    type: 'fill',
    level: 'easy',
    topic: '打招呼',
    instruction: '请大声读出下面的句子，注意语调',
    english: 'Hello! How are you today?',
    chinese: '你好！你今天怎么样？',
    tips: 'How are you 后面语调要上扬',
    keywords: ['Hello', 'How are you', 'today']
  },
  {
    id: 2,
    type: 'repeat',
    level: 'easy',
    topic: '数字',
    instruction: '请跟着读出这些数字',
    english: 'One, two, three, four, five, six, seven, eight, nine, ten.',
    chinese: '一、二、三、四、五、六、七、八、九、十。',
    tips: '注意 three 的发音，舌头要伸出来',
    keywords: ['one', 'two', 'three', 'four', 'five']
  },
  {
    id: 3,
    type: 'roleplay',
    level: 'easy',
    topic: '购物',
    instruction: '扮演顾客，大声说出你想买的东西',
    english: 'I want a red pencil, please.',
    chinese: '我想要一支红色的铅笔。',
    tips: 'please 放在句尾表示礼貌',
    keywords: ['I want', 'please']
  },
  {
    id: 4,
    type: 'describe',
    level: 'easy',
    topic: '颜色',
    instruction: '看着你身边的物品，用英语说出它的颜色',
    english: 'My bag is blue. My book is green.',
    chinese: '我的书包是蓝色的。我的书是绿色的。',
    tips: 'is 后面接颜色词',
    keywords: ['My', 'is', 'blue', 'green', 'red', 'yellow']
  },
  {
    id: 5,
    type: 'repeat',
    level: 'easy',
    topic: '星期',
    instruction: '请跟着读出一周七天',
    english: 'Monday, Tuesday, Wednesday, Thursday, Friday, Saturday, Sunday.',
    chinese: '星期一、星期二、星期三、星期四、星期五、星期六、星期日。',
    tips: 'Wednesday 的 d 不发音',
    keywords: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
  },
  {
    id: 6,
    type: 'roleplay',
    level: 'medium',
    topic: '问路',
    instruction: '扮演一个迷路的人，向别人问路',
    english: 'Excuse me, how can I get to the hospital?',
    chinese: '请问，我怎么去医院？',
    tips: 'Excuse me 用来引起别人注意',
    keywords: ['Excuse me', 'how can I get to']
  },
  {
    id: 7,
    type: 'describe',
    level: 'easy',
    topic: '动物',
    instruction: '描述你喜欢的动物',
    english: 'I like rabbits. They have long ears and short tails.',
    chinese: '我喜欢兔子。它们有长耳朵和短尾巴。',
    tips: 'They 用来指代复数的动物',
    keywords: ['I like', 'They have', 'long', 'short']
  },
  {
    id: 8,
    type: 'fill',
    level: 'medium',
    topic: '日常用语',
    instruction: '补全下面的对话并大声读出来',
    english: "A: What's the date today? B: It's June 1st. Happy Children's Day!",
    chinese: 'A: 今天几号？B: 六月一日。儿童节快乐！',
    tips: "月份和日期之间不要加 of",
    keywords: ["What's the date", "It's", 'Happy']
  },
  {
    id: 9,
    type: 'repeat',
    level: 'medium',
    topic: '月份',
    instruction: '请跟着读出十二个月份',
    english: 'January, February, March, April, May, June, July, August, September, October, November, December.',
    chinese: '一月到十二月。',
    tips: 'February 注意 r 的发音',
    keywords: ['January', 'February', 'March', 'April', 'May', 'June']
  },
  {
    id: 10,
    type: 'roleplay',
    level: 'medium',
    topic: '看医生',
    instruction: '扮演一个生病的小朋友，告诉医生你哪里不舒服',
    english: 'Doctor, I have a stomachache. I feel terrible.',
    chinese: '医生，我肚子疼。我感觉很难受。',
    tips: "stomachache 的 ch 发 /k/ 的音",
    keywords: ['I have a', 'I feel']
  },
  {
    id: 11,
    type: 'describe',
    level: 'medium',
    topic: '家庭成员',
    instruction: '用英语介绍你的家人',
    english: "My father is tall. My mother is kind. I love my family.",
    chinese: '我爸爸很高。我妈妈很和蔼。我爱我的家人。',
    tips: '介绍家人时用 My...',
    keywords: ['My father', 'My mother', 'tall', 'kind', 'love']
  },
  {
    id: 12,
    type: 'fill',
    level: 'easy',
    topic: '年龄',
    instruction: '用你自己的年龄回答下面的问题',
    english: "How old are you? I'm ___ years old.",
    chinese: '你几岁了？我___岁了。',
    tips: 'years old 连读，不要分开',
    keywords: ['How old', "I'm", 'years old']
  },
  {
    id: 13,
    type: 'roleplay',
    level: 'medium',
    topic: '打电话',
    instruction: '给你的朋友打电话，邀请他/她来你家玩',
    english: "Hello! This is Tom. Can you come to my house this afternoon?",
    chinese: '你好！我是汤姆。今天下午你能来我家吗？',
    tips: '电话里介绍自己用 This is...',
    keywords: ['This is', 'Can you come to']
  },
  {
    id: 14,
    type: 'describe',
    level: 'medium',
    topic: '天气',
    instruction: '描述今天的天气',
    english: "Today is sunny and hot. The sky is blue. It's a beautiful day.",
    chinese: '今天晴朗又热。天空是蓝色的。今天天气真好。',
    tips: "描述天气用 It's...",
    keywords: ['sunny', 'hot', 'cold', 'cloudy', 'rainy', "It's"]
  },
  {
    id: 15,
    type: 'repeat',
    level: 'easy',
    topic: '水果',
    instruction: '跟着读出这些水果的名字',
    english: 'Apple, banana, orange, grape, watermelon, strawberry, peach, pear.',
    chinese: '苹果、香蕉、橙子、葡萄、西瓜、草莓、桃子、梨。',
    tips: 'strawberry 有三个音节，慢慢读',
    keywords: ['apple', 'banana', 'orange', 'grape', 'watermelon']
  },
  {
    id: 16,
    type: 'roleplay',
    level: 'medium',
    topic: '在餐厅',
    instruction: '扮演一个小顾客，向服务员点餐',
    english: "I'd like a hamburger and a glass of milk, please.",
    chinese: '我想要一个汉堡和一杯牛奶。',
    tips: "I'd like 比 I want 更礼貌",
    keywords: ["I'd like", 'a glass of', 'please']
  },
  {
    id: 17,
    type: 'describe',
    level: 'medium',
    topic: '我的房间',
    instruction: '描述你的房间',
    english: "My room is small but clean. There is a bed and a desk. I have many books.",
    chinese: '我的房间很小但是很干净。有一张床和一张桌子。我有很多书。',
    tips: 'There is 表示"有"',
    keywords: ['My room is', 'There is', 'I have']
  },
  {
    id: 18,
    type: 'fill',
    level: 'medium',
    topic: '能力',
    instruction: '说出你会做的事情',
    english: "I can swim. I can ride a bike. I can't drive a car.",
    chinese: '我会游泳。我会骑自行车。我不会开车。',
    tips: "can't 表示不会/不能",
    keywords: ['I can', "I can't"]
  },
  {
    id: 19,
    type: 'roleplay',
    level: 'medium',
    topic: '道歉',
    instruction: '你不小心弄坏了同学的铅笔，向他道歉',
    english: "I'm sorry I broke your pencil. I will buy you a new one.",
    chinese: '对不起我弄坏了你的铅笔。我会给你买一支新的。',
    tips: "I'm sorry 后面可以说明原因",
    keywords: ["I'm sorry", 'I will']
  },
  {
    id: 20,
    type: 'describe',
    level: 'medium',
    topic: '最喜欢的节日',
    instruction: '说说你最喜欢的节日',
    english: "My favourite festival is Spring Festival. I can get red packets and eat dumplings. I'm very happy.",
    chinese: '我最喜欢的节日是春节。我可以收到红包，吃饺子。我很开心。',
    tips: 'festival 是节日的意思',
    keywords: ['My favourite', 'festival', 'I can', "I'm happy"]
  }
];

module.exports = speakingPracticeData;
