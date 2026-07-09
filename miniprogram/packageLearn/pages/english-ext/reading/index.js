var learnData = require('../../../utils/learn-data.js')

Page({
  data: {
    articles: [
      { id: 'er01', title: 'My Family', level: 'A1', content: 'I have a happy family. There are four people in my family: my father, my mother, my sister and me. My father is a teacher. My mother is a doctor. My sister is a student. I love my family.', questions: ['How many people are there in the family?', 'What does the father do?'] },
      { id: 'er02', title: 'My School', level: 'A1', content: 'My school is big and beautiful. There are many classrooms in my school. There is a library, a playground and a garden. I like my school very much.', questions: ['Is the school big?', 'What is in the school?'] },
      { id: 'er03', title: 'My Day', level: 'A1', content: 'I get up at seven o\'clock every day. I go to school at eight. I have lunch at twelve. I go home at four. I do my homework at five. I go to bed at nine.', questions: ['What time does he get up?', 'What does he do at five?'] }
    ]
  },

  onLoad: function() {},

  markAsLearned: function(e) {
    var id = e.currentTarget.dataset.id
    learnData.markAsLearned('englishReading', id)
    wx.showToast({ title: '已学会', icon: 'success' })
  }
})
