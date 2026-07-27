/**
 * 英语口语场景对话数据 - 适合小学生
 * 共20个日常场景
 */
const speakingScenariosData = [
  {
    id: 1,
    title: '早上打招呼',
    scene: 'Morning Greeting',
    icon: '🌅',
    level: 'easy',
    description: '早上遇到同学或老师时的问候',
    dialogue: [
      { speaker: 'A', english: 'Good morning!', chinese: '早上好！' },
      { speaker: 'B', english: 'Good morning! How are you?', chinese: '早上好！你好吗？' },
      { speaker: 'A', english: "I'm fine, thank you. And you?", chinese: '我很好，谢谢。你呢？' },
      { speaker: 'B', english: "I'm great! Let's go to class.", chinese: '我很好！我们去上课吧。' }
    ],
    keyPhrases: ['Good morning!', "I'm fine.", 'How are you?']
  },
  {
    id: 2,
    title: '自我介绍',
    scene: 'Self Introduction',
    icon: '🙋',
    level: 'easy',
    description: '向新朋友介绍自己的名字和年龄',
    dialogue: [
      { speaker: 'A', english: "Hi! What's your name?", chinese: '嗨！你叫什么名字？' },
      { speaker: 'B', english: "My name is Lily. What's yours?", chinese: '我叫莉莉。你呢？' },
      { speaker: 'A', english: "I'm Tom. Nice to meet you!", chinese: '我是汤姆。很高兴认识你！' },
      { speaker: 'B', english: 'Nice to meet you too! How old are you?', chinese: '我也很高兴认识你！你几岁了？' },
      { speaker: 'A', english: "I'm eight years old.", chinese: '我八岁了。' }
    ],
    keyPhrases: ["What's your name?", 'Nice to meet you!', 'How old are you?']
  },
  {
    id: 3,
    title: '在教室里',
    scene: 'In the Classroom',
    icon: '🏫',
    level: 'easy',
    description: '课堂上老师和学生的对话',
    dialogue: [
      { speaker: 'Teacher', english: 'Good morning, class!', chinese: '同学们，早上好！' },
      { speaker: 'Students', english: 'Good morning, teacher!', chinese: '老师，早上好！' },
      { speaker: 'Teacher', english: 'Open your books, please.', chinese: '请打开你们的书。' },
      { speaker: 'Student', english: 'Teacher, may I borrow a pencil?', chinese: '老师，我可以借一支铅笔吗？' },
      { speaker: 'Teacher', english: 'Of course. Here you are.', chinese: '当然可以，给你。' },
      { speaker: 'Student', english: 'Thank you!', chinese: '谢谢！' }
    ],
    keyPhrases: ['Open your books.', 'May I borrow...?', 'Here you are.']
  },
  {
    id: 4,
    title: '问路',
    scene: 'Asking for Directions',
    icon: '🗺️',
    level: 'medium',
    description: '在街上问路和指路',
    dialogue: [
      { speaker: 'A', english: 'Excuse me, where is the library?', chinese: '请问，图书馆在哪里？' },
      { speaker: 'B', english: 'Go straight and turn left.', chinese: '直走然后左转。' },
      { speaker: 'A', english: 'Is it far from here?', chinese: '离这里远吗？' },
      { speaker: 'B', english: "No, it's near. You can walk there.", chinese: '不远，很近。你可以走过去。' },
      { speaker: 'A', english: 'Thank you very much!', chinese: '非常感谢！' }
    ],
    keyPhrases: ['Where is...?', 'Go straight.', 'Turn left/right.']
  },
  {
    id: 5,
    title: '在商店里',
    scene: 'At the Shop',
    icon: '🛒',
    level: 'easy',
    description: '在商店买东西的对话',
    dialogue: [
      { speaker: 'Shopkeeper', english: 'Can I help you?', chinese: '你需要什么？' },
      { speaker: 'Customer', english: 'I want a pencil box, please.', chinese: '我想要一个铅笔盒。' },
      { speaker: 'Shopkeeper', english: 'Here you are. It is 10 yuan.', chinese: '给你。10元。' },
      { speaker: 'Customer', english: 'Here you are. Thank you!', chinese: '给你钱。谢谢！' },
      { speaker: 'Shopkeeper', english: 'You are welcome!', chinese: '不客气！' }
    ],
    keyPhrases: ['Can I help you?', 'I want...', 'How much?']
  },
  {
    id: 6,
    title: '谈论天气',
    scene: 'Talking About Weather',
    icon: '🌤️',
    level: 'easy',
    description: '和朋友讨论今天的天气',
    dialogue: [
      { speaker: 'A', english: "What's the weather like today?", chinese: '今天天气怎么样？' },
      { speaker: 'B', english: "It's sunny and warm.", chinese: '今天晴朗又暖和。' },
      { speaker: 'A', english: 'Great! Let\'s go to the park!', chinese: '太好了！我们去公园吧！' },
      { speaker: 'B', english: "Good idea! Don't forget your hat.", chinese: '好主意！别忘了你的帽子。' }
    ],
    keyPhrases: ["What's the weather like?", "It's sunny.", "Don't forget..."]
  },
  {
    id: 7,
    title: '邀请朋友',
    scene: 'Inviting a Friend',
    icon: '🎉',
    level: 'medium',
    description: '邀请朋友一起玩耍',
    dialogue: [
      { speaker: 'A', english: 'Hi, Lily! Do you want to play with me?', chinese: '嗨，莉莉！你想和我一起玩吗？' },
      { speaker: 'B', english: "Yes, I'd love to! What shall we play?", chinese: '好呀！我们玩什么？' },
      { speaker: 'A', english: "Let's play football!", chinese: '我们踢足球吧！' },
      { speaker: 'B', english: "OK! Let's go to the playground.", chinese: '好的！我们去操场吧。' }
    ],
    keyPhrases: ['Do you want to...?', "I'd love to!", "Let's play..."]
  },
  {
    id: 8,
    title: '打电话',
    scene: 'Making a Phone Call',
    icon: '📞',
    level: 'medium',
    description: '给朋友打电话',
    dialogue: [
      { speaker: 'A', english: 'Hello! May I speak to Tom?', chinese: '你好！我可以和汤姆说话吗？' },
      { speaker: 'B', english: 'This is Tom speaking. Who is that?', chinese: '我就是汤姆。你是谁？' },
      { speaker: 'A', english: "It's Lily. Do you want to come to my birthday party?", chinese: '我是莉莉。你想来我的生日派对吗？' },
      { speaker: 'Tom', english: "Yes! I'd love to! When is it?", chinese: '想啊！什么时候？' },
      { speaker: 'A', english: "It's on Saturday at 3 o'clock.", chinese: '周六下午3点。' }
    ],
    keyPhrases: ['May I speak to...?', 'This is... speaking.', 'Who is that?']
  },
  {
    id: 9,
    title: '在餐厅',
    scene: 'At the Restaurant',
    icon: '🍽️',
    level: 'medium',
    description: '在餐厅点餐',
    dialogue: [
      { speaker: 'Waiter', english: 'Are you ready to order?', chinese: '你准备好点餐了吗？' },
      { speaker: 'A', english: 'Yes. I would like some rice and chicken, please.', chinese: '是的，我想要一些米饭和鸡肉。' },
      { speaker: 'Waiter', english: 'What would you like to drink?', chinese: '你想喝什么？' },
      { speaker: 'A', english: 'A glass of orange juice, please.', chinese: '请来一杯橙汁。' },
      { speaker: 'Waiter', english: 'OK, please wait a moment.', chinese: '好的，请稍等。' }
    ],
    keyPhrases: ['I would like...', 'What would you like to drink?', 'Please wait.']
  },
  {
    id: 10,
    title: '看医生',
    scene: 'Seeing a Doctor',
    icon: '🏥',
    level: 'medium',
    description: '生病时去看医生',
    dialogue: [
      { speaker: 'Doctor', english: "What's wrong with you?", chinese: '你怎么了？' },
      { speaker: 'A', english: 'I have a headache and a fever.', chinese: '我头疼还发烧。' },
      { speaker: 'Doctor', english: 'Open your mouth and say "Ah".', chinese: '张开嘴说"啊"。' },
      { speaker: 'A', english: 'Ah...', chinese: '啊……' },
      { speaker: 'Doctor', english: "Don't worry. Take this medicine and drink more water.", chinese: '别担心。吃这个药，多喝水。' }
    ],
    keyPhrases: ["What's wrong?", 'I have a...', "Don't worry."]
  },
  {
    id: 11,
    title: '谈论宠物',
    scene: 'Talking About Pets',
    icon: '🐱',
    level: 'easy',
    description: '和朋友聊宠物',
    dialogue: [
      { speaker: 'A', english: 'Do you have a pet?', chinese: '你有宠物吗？' },
      { speaker: 'B', english: 'Yes, I have a cat. Her name is Mimi.', chinese: '有，我有一只猫。她叫咪咪。' },
      { speaker: 'A', english: 'How cute! What colour is she?', chinese: '好可爱！她是什么颜色的？' },
      { speaker: 'B', english: 'She is white and very soft.', chinese: '她是白色的，非常柔软。' }
    ],
    keyPhrases: ['Do you have a pet?', 'What colour is it?', 'How cute!']
  },
  {
    id: 12,
    title: '谈论家庭',
    scene: 'Talking About Family',
    icon: '👨‍👩‍👧‍👦',
    level: 'easy',
    description: '介绍自己的家人',
    dialogue: [
      { speaker: 'A', english: 'How many people are there in your family?', chinese: '你家有几口人？' },
      { speaker: 'B', english: 'There are four. My dad, my mum, my sister and me.', chinese: '四口人。爸爸、妈妈、姐姐和我。' },
      { speaker: 'A', english: 'What does your father do?', chinese: '你爸爸做什么工作？' },
      { speaker: 'B', english: 'He is a teacher. He teaches English.', chinese: '他是一名老师。他教英语。' }
    ],
    keyPhrases: ['How many people...?', 'What does... do?', 'He is a...']
  },
  {
    id: 13,
    title: '在公园',
    scene: 'At the Park',
    icon: '🌳',
    level: 'easy',
    description: '在公园里玩耍',
    dialogue: [
      { speaker: 'A', english: 'The park is beautiful!', chinese: '公园真漂亮！' },
      { speaker: 'B', english: 'Look! There are many flowers.', chinese: '看！有很多花。' },
      { speaker: 'A', english: 'I like the red ones. What are they?', chinese: '我喜欢红色的那些。它们是什么？' },
      { speaker: 'B', english: 'They are roses. They smell nice.', chinese: '它们是玫瑰花。闻起来很香。' }
    ],
    keyPhrases: ['Look!', 'There are...', 'I like...']
  },
  {
    id: 14,
    title: '描述食物',
    scene: 'Describing Food',
    icon: '🍎',
    level: 'easy',
    description: '描述喜欢的食物',
    dialogue: [
      { speaker: 'A', english: "What's your favourite food?", chinese: '你最喜欢什么食物？' },
      { speaker: 'B', english: 'I like noodles. They are yummy!', chinese: '我喜欢面条。它们很好吃！' },
      { speaker: 'A', english: 'Do you like fruit?', chinese: '你喜欢水果吗？' },
      { speaker: 'B', english: 'Yes, I like apples and bananas.', chinese: '喜欢，我喜欢苹果和香蕉。' }
    ],
    keyPhrases: ["What's your favourite...?", 'I like...', 'They are yummy!']
  },
  {
    id: 15,
    title: '谈论学校科目',
    scene: 'Talking About Subjects',
    icon: '📚',
    level: 'medium',
    description: '讨论喜欢的学校科目',
    dialogue: [
      { speaker: 'A', english: 'What subject do you like?', chinese: '你喜欢什么科目？' },
      { speaker: 'B', english: 'I like maths. It is fun!', chinese: '我喜欢数学。很有趣！' },
      { speaker: 'A', english: "I like English. I can read many stories.", chinese: '我喜欢英语。我能读很多故事。' },
      { speaker: 'B', english: "That's great! Can you teach me some English?", chinese: '太好了！你能教我一些英语吗？' }
    ],
    keyPhrases: ['What subject do you like?', 'It is fun!', 'Can you teach me...?']
  },
  {
    id: 16,
    title: '在图书馆',
    scene: 'At the Library',
    icon: '📖',
    level: 'medium',
    description: '在图书馆借书',
    dialogue: [
      { speaker: 'A', english: 'Excuse me, I want to borrow a book.', chinese: '打扰了，我想借一本书。' },
      { speaker: 'Librarian', english: 'Sure! What book do you want?', chinese: '当然！你想要什么书？' },
      { speaker: 'A', english: 'I want a storybook about animals.', chinese: '我想要一本关于动物的故事书。' },
      { speaker: 'Librarian', english: 'Here is one. You can keep it for two weeks.', chinese: '这本给你。你可以借两周。' },
      { speaker: 'A', english: 'Thank you!', chinese: '谢谢！' }
    ],
    keyPhrases: ['I want to borrow...', 'What book do you want?', 'You can keep it for...']
  },
  {
    id: 17,
    title: '周末计划',
    scene: 'Weekend Plans',
    icon: '📅',
    level: 'medium',
    description: '讨论周末要做什么',
    dialogue: [
      { speaker: 'A', english: 'What are you going to do this weekend?', chinese: '这个周末你打算做什么？' },
      { speaker: 'B', english: "I'm going to visit my grandma.", chinese: '我打算去看望奶奶。' },
      { speaker: 'A', english: 'That sounds nice! What will you do there?', chinese: '听起来不错！你在那里会做什么？' },
      { speaker: 'B', english: 'I will help her make dumplings.', chinese: '我会帮她包饺子。' }
    ],
    keyPhrases: ['What are you going to do?', "I'm going to...", 'That sounds nice!']
  },
  {
    id: 18,
    title: '表达感谢',
    scene: 'Saying Thank You',
    icon: '🙏',
    level: 'easy',
    description: '收到礼物后表达感谢',
    dialogue: [
      { speaker: 'A', english: 'Happy birthday! This is for you!', chinese: '生日快乐！这是给你的！' },
      { speaker: 'B', english: 'Wow, a toy car! Thank you so much!', chinese: '哇，一辆玩具车！太谢谢了！' },
      { speaker: 'A', english: "You're welcome! I hope you like it.", chinese: '不客气！希望你喜欢。' },
      { speaker: 'B', english: 'I love it! You are my best friend!', chinese: '我太喜欢了！你是我最好的朋友！' }
    ],
    keyPhrases: ['Happy birthday!', 'Thank you so much!', "You're welcome!"]
  },
  {
    id: 19,
    title: '谈论爱好',
    scene: 'Talking About Hobbies',
    icon: '🎨',
    level: 'easy',
    description: '和朋友聊各自的爱好',
    dialogue: [
      { speaker: 'A', english: 'What do you like to do after school?', chinese: '放学后你喜欢做什么？' },
      { speaker: 'B', english: 'I like drawing pictures.', chinese: '我喜欢画画。' },
      { speaker: 'A', english: 'Really? What do you draw?', chinese: '真的吗？你画什么？' },
      { speaker: 'B', english: 'I draw animals and flowers. What about you?', chinese: '我画动物和花。你呢？' },
      { speaker: 'A', english: 'I like reading books. I read every day.', chinese: '我喜欢看书。我每天都读。' }
    ],
    keyPhrases: ['What do you like to do?', 'I like...', 'What about you?']
  },
  {
    id: 20,
    title: '放学告别',
    scene: 'Saying Goodbye After School',
    icon: '👋',
    level: 'easy',
    description: '放学时和同学告别',
    dialogue: [
      { speaker: 'A', english: 'School is over! Time to go home!', chinese: '放学了！该回家了！' },
      { speaker: 'B', english: 'Yes! See you tomorrow!', chinese: '是啊！明天见！' },
      { speaker: 'A', english: 'See you! Have a nice evening!', chinese: '再见！晚上愉快！' },
      { speaker: 'B', english: 'You too! Bye-bye!', chinese: '你也是！拜拜！' }
    ],
    keyPhrases: ['See you tomorrow!', 'Have a nice evening!', 'Bye-bye!']
  }
];

module.exports = speakingScenariosData;
