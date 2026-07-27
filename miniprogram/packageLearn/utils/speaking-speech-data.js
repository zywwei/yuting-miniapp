/**
 * 英语口语朗读/演讲数据 - 适合小学生
 * 共15篇短文，包含简单演讲和朗读材料
 */
const speakingSpeechData = [
  {
    id: 1,
    title: 'My Family',
    titleChinese: '我的家人',
    level: 'easy',
    type: 'speech',
    icon: '👨‍👩‍👧‍👦',
    content: "Hello! My name is Li Ming. I have a happy family. There are four people in my family: my father, my mother, my sister and me. My father is a doctor. He is very tall. My mother is a teacher. She is very kind. My sister is five years old. She is cute. I love my family very much.",
    contentChinese: '大家好！我叫李明。我有一个幸福的家。我家有四口人：爸爸、妈妈、姐姐和我。我爸爸是医生，他很高。我妈妈是老师，她很和蔼。我姐姐五岁，她很可爱。我非常爱我的家人。',
    wordCount: 72,
    keyVocabulary: ['family', 'doctor', 'teacher', 'kind', 'cute', 'love']
  },
  {
    id: 2,
    title: 'My School',
    titleChinese: '我的学校',
    level: 'easy',
    type: 'speech',
    icon: '🏫',
    content: "My school is very beautiful. There are many trees and flowers in the garden. I have many friends at school. We play together at break time. My favourite subject is English. I like my school very much. Every day I go to school happily.",
    contentChinese: '我的学校非常漂亮。花园里有很多树和花。我在学校有很多朋友。课间休息时我们一起玩耍。我最喜欢的科目是英语。我非常喜欢我的学校。每天我都高高兴兴地去上学。',
    wordCount: 55,
    keyVocabulary: ['beautiful', 'trees', 'flowers', 'friends', 'favourite', 'subject', 'happily']
  },
  {
    id: 3,
    title: 'My Best Friend',
    titleChinese: '我最好的朋友',
    level: 'easy',
    type: 'speech',
    icon: '👫',
    content: "My best friend is Wang Lei. He is nine years old. He is in my class. He likes playing football. After school, we often play football together. He is very funny. He always makes me laugh. I am happy to have such a good friend.",
    contentChinese: '我最好的朋友是王磊。他九岁，和我同班。他喜欢踢足球。放学后，我们经常一起踢足球。他很有趣，总是逗我笑。我很高兴有这样一个好朋友。',
    wordCount: 56,
    keyVocabulary: ['best friend', 'play football', 'funny', 'laugh', 'happy']
  },
  {
    id: 4,
    title: 'My Favourite Animal',
    titleChinese: '我最喜欢的动物',
    level: 'easy',
    type: 'speech',
    icon: '🐼',
    content: "My favourite animal is the panda. Pandas live in China. They are black and white. They eat bamboo every day. Baby pandas are very small and cute. I think pandas are the cutest animals in the world. I hope to see a real panda one day.",
    contentChinese: '我最喜欢的动物是熊猫。熊猫生活在中国。它们是黑白相间的。它们每天吃竹子。熊猫宝宝又小又可爱。我觉得熊猫是世界上最可爱的动物。我希望有一天能看到真正的熊猫。',
    wordCount: 57,
    keyVocabulary: ['panda', 'bamboo', 'black and white', 'cute', 'real']
  },
  {
    id: 5,
    title: 'My Favourite Season',
    titleChinese: '我最喜欢的季节',
    level: 'medium',
    type: 'speech',
    icon: '🌸',
    content: "My favourite season is spring. In spring, the weather is warm. The trees turn green and the flowers start to bloom. The birds sing in the trees. I can fly kites in the park with my friends. Sometimes we have a picnic. I love spring because everything is so beautiful.",
    contentChinese: '我最喜欢的季节是春天。春天天气暖和。树木变绿了，花儿开始绽放。鸟儿在树上歌唱。我可以和朋友在公园里放风筝。有时我们去野餐。我爱春天，因为一切都是那么美好。',
    wordCount: 60,
    keyVocabulary: ['spring', 'warm', 'bloom', 'fly kites', 'picnic', 'beautiful']
  },
  {
    id: 6,
    title: 'A Happy Day',
    titleChinese: '快乐的一天',
    level: 'easy',
    type: 'story',
    icon: '😊',
    content: "Last Sunday was a happy day. In the morning, I went to the park with my parents. We played on the swings and the slides. Then we had lunch at a restaurant. I ate noodles and drank orange juice. In the afternoon, I read a storybook at home. It was a wonderful day!",
    contentChinese: '上个星期天是快乐的一天。早上，我和爸爸妈妈去了公园。我们荡秋千、滑滑梯。然后我们在餐厅吃了午饭。我吃了面条，喝了橙汁。下午，我在家读了一本故事书。真是美好的一天！',
    wordCount: 62,
    keyVocabulary: ['went to', 'swings', 'slides', 'restaurant', 'noodles', 'wonderful']
  },
  {
    id: 7,
    title: 'My Pet',
    titleChinese: '我的宠物',
    level: 'easy',
    type: 'speech',
    icon: '🐶',
    content: "I have a pet dog. His name is Lucky. He is brown and white. He has big eyes and a short tail. Every morning, I take him for a walk. He likes to play with a ball. When I come home from school, he wags his tail happily. Lucky is my best friend!",
    contentChinese: '我有一只宠物狗。他叫Lucky。他是棕白色的。他有大眼睛和短尾巴。每天早上我带他去散步。他喜欢玩球。当我放学回家时，他开心地摇尾巴。Lucky是我最好的朋友！',
    wordCount: 60,
    keyVocabulary: ['pet', 'brown', 'white', 'take a walk', 'wags his tail', 'happily']
  },
  {
    id: 8,
    title: 'Children\'s Day',
    titleChinese: '儿童节',
    level: 'medium',
    type: 'speech',
    icon: '🎈',
    content: "Children's Day is on June 1st. It is my favourite day. On this day, we don't go to school. Our school has a big party. We sing, dance and play games. Last year, I danced with my classmates. We were very happy. I love Children's Day because it is our special day.",
    contentChinese: '儿童节在六月一日。这是我最喜欢的日子。这一天我们不用上学。学校会举办大型派对。我们唱歌、跳舞、玩游戏。去年，我和同学们一起跳舞。我们很开心。我爱儿童节，因为这是属于我们的特别日子。',
    wordCount: 63,
    keyVocabulary: ["Children's Day", 'June 1st', 'party', 'sing', 'dance', 'games', 'special']
  },
  {
    id: 9,
    title: 'My Favourite Food',
    titleChinese: '我最喜欢的食物',
    level: 'easy',
    type: 'speech',
    icon: '🍕',
    content: "My favourite food is pizza. I like pizza with cheese and tomatoes. My mum can make pizza at home. She puts vegetables and meat on it. It smells good and tastes delicious. I eat pizza every Friday evening. My family all like pizza. We are very happy when we eat together.",
    contentChinese: '我最喜欢的食物是披萨。我喜欢有奶酪和番茄的披萨。我妈妈会在家做披萨。她放蔬菜和肉在上面。闻起来很香，吃起来很美味。每个星期五晚上我都吃披萨。我的家人都喜欢披萨。我们一起吃饭时很开心。',
    wordCount: 60,
    keyVocabulary: ['pizza', 'cheese', 'tomato', 'delicious', 'vegetables', 'together']
  },
  {
    id: 10,
    title: 'Spring Festival',
    titleChinese: '春节',
    level: 'medium',
    type: 'speech',
    icon: '🧧',
    content: "Spring Festival is the most important festival in China. It is usually in January or February. Before the festival, we clean our house and put up red decorations. On New Year's Day, we wear new clothes and visit our grandparents. Children can get red packets. We eat dumplings and watch TV together. I love Spring Festival!",
    contentChinese: '春节是中国最重要的节日。通常在一月或二月。节前我们打扫房子，贴上红色装饰。新年那天，我们穿新衣，去看望爷爷奶奶。小朋友们可以收到红包。我们一起吃饺子、看电视。我爱春节！',
    wordCount: 66,
    keyVocabulary: ['Spring Festival', 'important', 'clean', 'red packets', 'dumplings', 'new clothes']
  },
  {
    id: 11,
    title: 'I Want to Be a Teacher',
    titleChinese: '我想当老师',
    level: 'medium',
    type: 'speech',
    icon: '👩‍🏫',
    content: "When I grow up, I want to be a teacher. My teacher is very nice. She teaches us many things. She is patient and kind. I want to be like her. I will teach children English and maths. I will help my students learn new things. I think being a teacher is a great job.",
    contentChinese: '我长大后想当老师。我的老师非常好。她教我们很多东西。她既耐心又和蔼。我想像她一样。我要教孩子们英语和数学。我要帮助我的学生学习新东西。我觉得当老师是一份很棒的工作。',
    wordCount: 60,
    keyVocabulary: ['grow up', 'patient', 'kind', 'teach', 'students', 'great job']
  },
  {
    id: 12,
    title: 'A Trip to the Zoo',
    titleChinese: '去动物园',
    level: 'medium',
    type: 'story',
    icon: '🦁',
    content: "Last weekend, I went to the zoo with my family. First, we saw the monkeys. They were jumping and playing. Then we visited the elephants. They were so big! My favourite was the tiger. It looked very strong. We also saw many birds. They had beautiful feathers. I took many photos. It was a fun trip!",
    contentChinese: '上个周末，我和家人去了动物园。首先我们看了猴子。它们又跳又玩。然后我们参观了大象。它们真大！我最喜欢的是老虎。它看起来很强壮。我们还看到了很多鸟。它们有漂亮的羽毛。我拍了很多照片。真是一次有趣的旅行！',
    wordCount: 66,
    keyVocabulary: ['zoo', 'monkeys', 'elephants', 'tiger', 'strong', 'birds', 'feathers', 'photos']
  },
  {
    id: 13,
    title: 'My Daily Life',
    titleChinese: '我的日常生活',
    level: 'medium',
    type: 'speech',
    icon: '⏰',
    content: "I get up at seven o'clock every morning. I brush my teeth and wash my face. Then I have breakfast with my family. I go to school at eight. I have four classes in the morning and two in the afternoon. After school, I do my homework first. Then I play with my friends. I go to bed at nine o'clock.",
    contentChinese: '我每天早上七点起床。刷牙洗脸，然后和家人一起吃早餐。八点去上学。上午四节课，下午两节课。放学后，我先做作业。然后和朋友一起玩。我九点上床睡觉。',
    wordCount: 67,
    keyVocabulary: ['get up', 'brush my teeth', 'breakfast', 'homework', 'go to bed']
  },
  {
    id: 14,
    title: 'My Holiday',
    titleChinese: '我的假期',
    level: 'medium',
    type: 'speech',
    icon: '✈️',
    content: "Last summer holiday, I went to Beijing with my parents. We visited the Great Wall. It was very long and amazing. We also went to Tian'anmen Square. It was very big. I ate Beijing Duck. It was very yummy. I bought some gifts for my friends. Beijing is a beautiful city. I hope to go there again.",
    contentChinese: '去年暑假，我和爸爸妈妈去了北京。我们参观了长城。它很长很壮观。我们还去了天安门广场。那里很大。我吃了北京烤鸭，非常好吃。我给朋友们买了一些礼物。北京是一座美丽的城市。我希望再去一次。',
    wordCount: 66,
    keyVocabulary: ['holiday', 'Great Wall', 'amazing', 'Beijing Duck', 'yummy', 'gifts', 'beautiful']
  },
  {
    id: 15,
    title: 'How to Keep Healthy',
    titleChinese: '如何保持健康',
    level: 'medium',
    type: 'speech',
    icon: '💪',
    content: "It is important to keep healthy. First, we should eat more fruits and vegetables. They are good for our body. Second, we need to exercise every day. I like running and swimming. Third, we should go to bed early and get up early. Don't watch too much TV. Remember to wash your hands often. If we do these things, we will be strong and happy.",
    contentChinese: '保持健康很重要。首先，我们应该多吃水果和蔬菜。它们对身体好。第二，我们需要每天锻炼。我喜欢跑步和游泳。第三，我们应该早睡早起。不要看太多电视。记得经常洗手。如果我们做到这些，我们就会强壮又快乐。',
    wordCount: 73,
    keyVocabulary: ['healthy', 'fruits', 'vegetables', 'exercise', 'running', 'swimming', 'strong']
  }
];

module.exports = speakingSpeechData;
