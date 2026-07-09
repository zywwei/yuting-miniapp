var learnData = require('../../utils/learn-data.js')
var childStorage = require('../../../utils/child-storage.js')

Page({
  data: {
    stats: {
      totalLearned: 0,
      byModule: {},
      streak: 0,
      todayLearned: 0
    }
  },

  onLoad: function() {
    this.loadStats()
  },

  onShow: function() {
    this.loadStats()
  },

  loadStats: function() {
    var progress = learnData.getProgress()
    var totalLearned = 0
    var byModule = {}

    var modules = ['cards', 'poems', 'numbers', 'english', 'mathFormulas', 'mathConcepts', 'mathPractice',
      'chineseReading', 'chineseWriting', 'chineseRhetoric', 'chineseClassical',
      'englishGrammar', 'englishSentences', 'englishReading', 'englishListening',
      'scienceExperiments', 'sciencePhysics', 'scienceChemistry', 'scienceBiology',
      'codingThinking', 'codingLogic', 'codingAlgorithm', 'codingScratch',
      'artMusic', 'artPainting', 'artCalligraphy',
      'classicsGwd', 'classicsPoetryRules', 'classicsIdioms', 'classicsConfucius',
      'speakingScenarios', 'speakingPractice', 'speakingSpeech',
      'socialGeography', 'socialHistory', 'socialPolitics',
      'sportsKnowledge', 'sportsHealth', 'sportsSkills',
      'lifeSafety', 'lifeMental', 'lifeSkills'
    ]

    modules.forEach(function(module) {
      var count = Object.keys(progress[module] || {}).length
      if (count > 0) {
        byModule[module] = count
        totalLearned += count
      }
    })

    this.setData({
      stats: {
        totalLearned: totalLearned,
        byModule: byModule,
        streak: this.calculateStreak(),
        todayLearned: this.getTodayLearned()
      }
    })
  },

  calculateStreak: function() {
    var logs = childStorage.get('learnLogs') || []
    if (logs.length === 0) return 0

    var today = new Date().toDateString()
    var streak = 0
    var currentDate = new Date()

    for (var i = 0; i < 365; i++) {
      var dateStr = currentDate.toDateString()
      var hasLog = logs.some(function(log) {
        return new Date(log.time).toDateString() === dateStr
      })

      if (hasLog) {
        streak++
      } else if (i > 0) {
        break
      }

      currentDate.setDate(currentDate.getDate() - 1)
    }

    return streak
  },

  getTodayLearned: function() {
    var logs = childStorage.get('learnLogs') || []
    var today = new Date().toDateString()

    return logs.filter(function(log) {
      return new Date(log.time).toDateString() === today
    }).length
  }
})
