/**
 * 英语阅读理解数据 - 适合小学生
 * 共20篇，短文+问题
 */
const readingData = [
  {
    id: 1,
    title: "My Family",
    passage: "I have a happy family. There are four people in my family: my father, my mother, my sister and me. My father is a doctor. My mother is a teacher. My sister is five years old. She is cute. I love my family.",
    questions: [
      { q: "How many people are there in the family?", options: ["Three", "Four", "Five", "Six"], answer: "B" },
      { q: "What is the father's job?", options: ["A teacher", "A doctor", "A driver", "A cook"], answer: "B" },
      { q: "How old is the sister?", options: ["Four", "Six", "Five", "Three"], answer: "C" }
    ]
  },
  {
    id: 2,
    title: "My School",
    passage: "My school is big and beautiful. There are many trees and flowers in the school. We have a big playground. I play football with my friends after class. There is a library in my school. I like reading books there.",
    questions: [
      { q: "What is the school like?", options: ["Small and old", "Big and beautiful", "Small and new", "Old and ugly"], answer: "B" },
      { q: "What does the writer do after class?", options: ["Read books", "Play basketball", "Play football", "Do homework"], answer: "C" },
      { q: "Where does the writer like reading?", options: ["In the classroom", "At home", "In the library", "In the park"], answer: "C" }
    ]
  },
  {
    id: 3,
    title: "My Pet",
    passage: "I have a pet dog. Its name is Lucky. It is white and brown. Lucky is very friendly. It likes playing with a ball. Every morning, I walk with Lucky in the park. Lucky is my best friend.",
    questions: [
      { q: "What pet does the writer have?", options: ["A cat", "A bird", "A dog", "A fish"], answer: "C" },
      { q: "What color is Lucky?", options: ["Black and white", "White and brown", "Brown and yellow", "All white"], answer: "B" },
      { q: "What does Lucky like playing with?", options: ["A stick", "A ball", "A toy", "A bone"], answer: "B" }
    ]
  },
  {
    id: 4,
    title: "My Favourite Food",
    passage: "My name is Tom. I like eating fruits. My favourite fruit is apple. I eat an apple every day. Apples are red and sweet. My mother says apples are good for health. I also like bananas and oranges.",
    questions: [
      { q: "What is Tom's favourite fruit?", options: ["Banana", "Orange", "Apple", "Grape"], answer: "C" },
      { q: "What color are the apples?", options: ["Green", "Yellow", "Red", "Orange"], answer: "C" },
      { q: "Who says apples are good for health?", options: ["Tom's father", "Tom's mother", "Tom's teacher", "Tom"], answer: "B" }
    ]
  },
  {
    id: 5,
    title: "My Day",
    passage: "I get up at seven o'clock every day. I have breakfast at seven thirty. I go to school at eight o'clock. I have four classes in the morning. I have lunch at twelve o'clock. I go home at four thirty in the afternoon.",
    questions: [
      { q: "When does the writer get up?", options: ["Six o'clock", "Seven o'clock", "Eight o'clock", "Seven thirty"], answer: "B" },
      { q: "How many classes in the morning?", options: ["Three", "Four", "Five", "Six"], answer: "B" },
      { q: "When does the writer go home?", options: ["Three thirty", "Four o'clock", "Four thirty", "Five o'clock"], answer: "C" }
    ]
  },
  {
    id: 6,
    title: "The Weather",
    passage: "Today is Sunday. The weather is sunny and warm. I go to the park with my parents. There are many people in the park. Some children are flying kites. Some old people are dancing. We have a good time.",
    questions: [
      { q: "What day is it today?", options: ["Saturday", "Sunday", "Monday", "Friday"], answer: "B" },
      { q: "What is the weather like?", options: ["Rainy and cold", "Cloudy and cool", "Sunny and warm", "Windy and cold"], answer: "C" },
      { q: "What are the children doing?", options: ["Dancing", "Running", "Singing", "Flying kites"], answer: "D" }
    ]
  },
  {
    id: 7,
    title: "My Favourite Season",
    passage: "My favourite season is spring. In spring, the trees are green and the flowers are beautiful. The birds sing in the trees. I can fly kites with my friends. Spring is warm and nice. I love spring!",
    questions: [
      { q: "What is the writer's favourite season?", options: ["Summer", "Autumn", "Winter", "Spring"], answer: "D" },
      { q: "What color are the trees in spring?", options: ["Red", "Yellow", "Green", "Brown"], answer: "C" },
      { q: "What can the writer do in spring?", options: ["Make a snowman", "Go swimming", "Fly kites", "Pick apples"], answer: "C" }
    ]
  },
  {
    id: 8,
    title: "At the Zoo",
    passage: "Last Sunday, I went to the zoo with my family. We saw many animals. The monkeys were funny. They were jumping up and down. The pandas were eating bamboo. They were so cute. I liked the elephants best. They were very big.",
    questions: [
      { q: "When did they go to the zoo?", options: ["Last Saturday", "Last Sunday", "Last Monday", "Last Friday"], answer: "B" },
      { q: "What were the monkeys doing?", options: ["Sleeping", "Eating", "Jumping", "Running"], answer: "C" },
      { q: "Which animal did the writer like best?", options: ["Monkeys", "Pandas", "Elephants", "Lions"], answer: "C" }
    ]
  },
  {
    id: 9,
    title: "My Birthday",
    passage: "Today is my birthday. I am ten years old. My friends come to my home. They give me many presents. I get a new book from Lily and a toy car from Tom. My mother makes a big cake for me. We eat cake and sing songs. I am very happy.",
    questions: [
      { q: "How old is the writer?", options: ["Eight", "Nine", "Ten", "Eleven"], answer: "C" },
      { q: "What does Lily give?", options: ["A toy car", "A book", "A cake", "A pen"], answer: "B" },
      { q: "Who makes the cake?", options: ["The writer", "Father", "Mother", "Tom"], answer: "C" }
    ]
  },
  {
    id: 10,
    title: "My Teacher",
    passage: "Miss Wang is my English teacher. She is young and kind. She has big eyes and long hair. She speaks English very well. She often plays games with us in class. We all like her very much.",
    questions: [
      { q: "What subject does Miss Wang teach?", options: ["Chinese", "Math", "English", "Music"], answer: "C" },
      { q: "What does Miss Wang look like?", options: ["She has small eyes", "She has big eyes and long hair", "She has short hair", "She is old"], answer: "B" },
      { q: "What does she often do in class?", options: ["Tell stories", "Play games", "Sing songs", "Watch TV"], answer: "B" }
    ]
  },
  {
    id: 11,
    title: "My Hobby",
    passage: "My name is Amy. I have many hobbies. I like drawing pictures. I draw every day after school. I also like singing and dancing. But my favourite hobby is reading. I have many books at home. Books are my best friends.",
    questions: [
      { q: "What is Amy's favourite hobby?", options: ["Drawing", "Singing", "Dancing", "Reading"], answer: "D" },
      { q: "When does Amy draw?", options: ["Before school", "After school", "At night", "In the morning"], answer: "B" },
      { q: "What does Amy think of books?", options: ["They are boring", "They are difficult", "They are her best friends", "They are heavy"], answer: "C" }
    ]
  },
  {
    id: 12,
    title: "A Picnic",
    passage: "Last Saturday, my family had a picnic in the park. My father drove us there. My mother prepared sandwiches and juice. My brother and I played games. We also flew a kite. The weather was nice. We had a great time.",
    questions: [
      { q: "When did they have a picnic?", options: ["Last Sunday", "Last Saturday", "Last Friday", "Last Monday"], answer: "B" },
      { q: "What did mother prepare?", options: ["Rice and tea", "Bread and milk", "Sandwiches and juice", "Noodles and water"], answer: "C" },
      { q: "How was the weather?", options: ["Rainy", "Cloudy", "Nice", "Cold"], answer: "C" }
    ]
  },
  {
    id: 13,
    title: "My Room",
    passage: "I have my own room. It is small but clean. There is a bed, a desk and a chair in my room. There are many books on the desk. I have a blue lamp on the desk too. I do my homework in my room every day. I love my room.",
    questions: [
      { q: "What is the room like?", options: ["Big and clean", "Small but clean", "Big but dirty", "Small and dirty"], answer: "B" },
      { q: "What color is the lamp?", options: ["Red", "Green", "Blue", "Yellow"], answer: "C" },
      { q: "What does the writer do in the room?", options: ["Play games", "Watch TV", "Do homework", "Cook food"], answer: "C" }
    ]
  },
  {
    id: 14,
    title: "Going Shopping",
    passage: "Yesterday, I went shopping with my mother. We went to a supermarket. Mother bought some vegetables and fruit. I bought a new pencil box. It has pictures of animals on it. I like it very much.",
    questions: [
      { q: "Where did they go?", options: ["To a park", "To a school", "To a supermarket", "To a hospital"], answer: "C" },
      { q: "What did mother buy?", options: ["Clothes and shoes", "Vegetables and fruit", "Books and toys", "Fish and meat"], answer: "B" },
      { q: "What is on the pencil box?", options: ["Flowers", "Stars", "Animals", "Fruits"], answer: "C" }
    ]
  },
  {
    id: 15,
    title: "My Best Friend",
    passage: "My best friend is Li Ming. He is eleven years old. He is tall and thin. He likes playing basketball. We are in the same class. We often do homework together. Sometimes we play computer games on weekends. Li Ming is a good boy.",
    questions: [
      { q: "How old is Li Ming?", options: ["Ten", "Eleven", "Twelve", "Nine"], answer: "B" },
      { q: "What does Li Ming look like?", options: ["Short and fat", "Tall and thin", "Short and thin", "Tall and fat"], answer: "B" },
      { q: "What do they do on weekends?", options: ["Play football", "Do homework", "Play computer games", "Go shopping"], answer: "C" }
    ]
  },
  {
    id: 16,
    title: "My School Day",
    passage: "On Monday, I have Chinese, math and English in the morning. I have art and music in the afternoon. I like English best because our English teacher is funny. I don't like math because it is too difficult for me.",
    questions: [
      { q: "What classes in the morning?", options: ["Chinese, math, music", "Chinese, math, English", "English, art, music", "Math, English, art"], answer: "B" },
      { q: "Which subject does the writer like best?", options: ["Chinese", "Math", "Art", "English"], answer: "D" },
      { q: "Why doesn't the writer like math?", options: ["It is boring", "It is too difficult", "The teacher is strict", "There is too much homework"], answer: "B" }
    ]
  },
  {
    id: 17,
    title: "Making a Snowman",
    passage: "It is winter now. It snowed last night. The ground is white. I am very excited. I go outside with my brother. We make a snowman together. We use a carrot for the nose and two stones for the eyes. The snowman looks funny. We are very happy.",
    questions: [
      { q: "What season is it?", options: ["Spring", "Summer", "Autumn", "Winter"], answer: "D" },
      { q: "What do they use for the nose?", options: ["A stone", "A stick", "A carrot", "A ball"], answer: "C" },
      { q: "How do they feel?", options: ["Sad", "Angry", "Happy", "Tired"], answer: "C" }
    ]
  },
  {
    id: 18,
    title: "The New Student",
    passage: "We have a new student in our class. Her name is Mary. She comes from America. She has blue eyes and blonde hair. She can speak English and a little Chinese. She is very friendly. We all want to be her friend.",
    questions: [
      { q: "Where does Mary come from?", options: ["England", "China", "America", "Canada"], answer: "C" },
      { q: "What color are Mary's eyes?", options: ["Brown", "Black", "Green", "Blue"], answer: "D" },
      { q: "What languages can Mary speak?", options: ["Only English", "Only Chinese", "English and a little Chinese", "Chinese and Japanese"], answer: "C" }
    ]
  },
  {
    id: 19,
    title: "Planting Trees",
    passage: "Today is March 12th. It is Tree Planting Day. My classmates and I plant trees near the school. We dig holes first. Then we put the young trees in the holes. We fill the holes with earth and water the trees. We plant ten trees today. We are tired but happy.",
    questions: [
      { q: "What day is it?", options: ["March 8th", "March 12th", "May 1st", "June 1st"], answer: "B" },
      { q: "What do they do first?", options: ["Water the trees", "Dig holes", "Put trees in holes", "Fill holes"], answer: "B" },
      { q: "How many trees do they plant?", options: ["Five", "Eight", "Ten", "Twelve"], answer: "C" }
    ]
  },
  {
    id: 20,
    title: "A Rainy Day",
    passage: "It is raining today. I can't go out to play. I stay at home. I read a storybook in the morning. The story is about a brave boy. In the afternoon, I help my mother cook dinner. We make dumplings together. It is a nice day at home.",
    questions: [
      { q: "What is the weather like today?", options: ["Sunny", "Cloudy", "Rainy", "Windy"], answer: "C" },
      { q: "What does the writer do in the morning?", options: ["Watch TV", "Play games", "Read a storybook", "Cook dinner"], answer: "C" },
      { q: "What do they make for dinner?", options: ["Noodles", "Rice", "Bread", "Dumplings"], answer: "D" }
    ]
  }
];

module.exports = readingData;
