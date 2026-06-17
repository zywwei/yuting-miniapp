/**
 * 习惯打卡特色配置
 * 每种习惯都有自己的特色表单字段
 */

var HABIT_CONFIG = {
  // ===== 睡眠作息 =====
  early_up: {
    name: '早起',
    icon: '🌅',
    fields: [
      {
        key: 'wakeTime',
        label: '起床时间',
        type: 'time',
        placeholder: '选择起床时间',
        required: true,
        defaultToNow: true
      },
      {
        key: 'mood',
        label: '起床心情',
        type: 'mood',
        options: [
          { value: 'energetic', label: '精神满满', icon: '💪' },
          { value: 'sleepy', label: '还有点困', icon: '😴' },
          { value: 'happy', label: '心情不错', icon: '😊' },
          { value: 'normal', label: '一般般', icon: '😐' }
        ]
      }
    ],
    summary: function(data) {
      var parts = []
      if (data.wakeTime) parts.push('起床时间：' + data.wakeTime)
      if (data.mood) {
        var moodMap = { energetic: '精神满满', sleepy: '还有点困', happy: '心情不错', normal: '一般般' }
        parts.push('心情：' + (moodMap[data.mood] || data.mood))
      }
      return parts.join('，')
    }
  },

  early_sleep: {
    name: '早睡',
    icon: '🌙',
    fields: [
      {
        key: 'sleepTime',
        label: '睡觉时间',
        type: 'time',
        placeholder: '选择睡觉时间',
        required: true,
        defaultToNow: true
      }
    ],
    summary: function(data) {
      var parts = []
      if (data.sleepTime) parts.push('睡觉时间：' + data.sleepTime)
      return parts.join('，')
    }
  },

  nap: {
    name: '午睡',
    icon: '😴',
    fields: [
      {
        key: 'napDuration',
        label: '午睡时长',
        type: 'select',
        options: [
          { value: '30min', label: '30分钟', icon: '⏰' },
          { value: '1hour', label: '1小时', icon: '⏰' },
          { value: '1.5hour', label: '1.5小时', icon: '⏰' },
          { value: '2hour', label: '2小时', icon: '⏰' }
        ]
      }
    ],
    summary: function(data) {
      if (data.napDuration) {
        var durationMap = { '30min': '30分钟', '1hour': '1小时', '1.5hour': '1.5小时', '2hour': '2小时' }
        return '午睡时长：' + (durationMap[data.napDuration] || data.napDuration)
      }
      return ''
    }
  },

  // ===== 健康卫生 =====
  wash_hands: {
    name: '洗手',
    icon: '🧼',
    fields: [
      {
        key: 'washTimes',
        label: '洗手次数',
        type: 'counter',
        min: 1,
        max: 20,
        default: 1
      },
      {
        key: 'washOccasion',
        label: '什么时候洗的',
        type: 'select',
        multiple: true,
        options: [
          { value: 'before_eat', label: '饭前', icon: '🍚' },
          { value: 'after_eat', label: '饭后', icon: '🍽️' },
          { value: 'after_toilet', label: '上厕所后', icon: '🚽' },
          { value: 'outside', label: '从外面回来', icon: '🏠' },
          { value: 'dirty', label: '手脏了', icon: '🤲' }
        ]
      }
    ],
    summary: function(data) {
      var parts = []
      if (data.washTimes) parts.push('洗手 ' + data.washTimes + ' 次')
      if (data.washOccasion && data.washOccasion.length > 0) {
        var labelMap = { before_eat: '饭前', after_eat: '饭后', after_toilet: '上厕所后', outside: '从外面回来', dirty: '手脏了' }
        var labels = data.washOccasion.map(function(v) { return labelMap[v] || v })
        parts.push('场景：' + labels.join('、'))
      }
      return parts.join('，')
    }
  },

  drink: {
    name: '喝水',
    icon: '💧',
    fields: [
      {
        key: 'cupCount',
        label: '喝了几杯',
        type: 'counter',
        min: 1,
        max: 20,
        default: 1
      },
      {
        key: 'drinkType',
        label: '喝了什么',
        type: 'select',
        options: [
          { value: 'water', label: '白开水', icon: '💧' },
          { value: 'milk', label: '牛奶', icon: '🥛' },
          { value: 'juice', label: '果汁', icon: '🧃' },
          { value: 'soup', label: '汤', icon: '🍲' }
        ]
      }
    ],
    summary: function(data) {
      var parts = []
      if (data.cupCount) parts.push('喝了 ' + data.cupCount + ' 杯')
      if (data.drinkType) {
        var typeMap = { water: '白开水', milk: '牛奶', juice: '果汁', soup: '汤' }
        parts.push('类型：' + (typeMap[data.drinkType] || data.drinkType))
      }
      return parts.join('，')
    }
  },

  // ===== 吃饭 =====
  eat_breakfast: {
    name: '吃早餐',
    icon: '🥣',
    fields: [
      {
        key: 'foodAmount',
        label: '吃了多少',
        type: 'select',
        options: [
          { value: 'little', label: '吃了一点', icon: '🍽️' },
          { value: 'normal', label: '正常量', icon: '🍽️🍽️' },
          { value: 'lots', label: '吃了很多', icon: '🍽️🍽️🍽️' }
        ]
      },
      {
        key: 'foodItems',
        label: '吃了什么',
        type: 'select',
        multiple: true,
        options: [
          { value: 'rice', label: '米饭/粥', icon: '🍚' },
          { value: 'noodle', label: '面条', icon: '🍜' },
          { value: 'bread', label: '面包', icon: '🍞' },
          { value: 'egg', label: '鸡蛋', icon: '🥚' },
          { value: 'milk', label: '牛奶', icon: '🥛' },
          { value: 'fruit', label: '水果', icon: '🍎' },
          { value: 'vegetable', label: '蔬菜', icon: '🥬' }
        ]
      }
    ],
    summary: function(data) {
      var parts = []
      if (data.foodAmount) {
        var amountMap = { little: '吃了一点', normal: '正常量', lots: '吃了很多' }
        parts.push(amountMap[data.foodAmount] || data.foodAmount)
      }
      if (data.foodItems && data.foodItems.length > 0) {
        var labelMap = { rice: '米饭/粥', noodle: '面条', bread: '面包', egg: '鸡蛋', milk: '牛奶', fruit: '水果', vegetable: '蔬菜' }
        var labels = data.foodItems.map(function(v) { return labelMap[v] || v })
        parts.push('吃了：' + labels.join('、'))
      }
      return parts.join('，')
    }
  },

  eat_lunch: {
    name: '吃午餐',
    icon: '🍱',
    fields: [
      {
        key: 'riceBowl',
        label: '吃了几碗饭',
        type: 'counter',
        min: 0,
        max: 5,
        default: 1
      },
      {
        key: 'foodItems',
        label: '吃了什么菜',
        type: 'select',
        multiple: true,
        options: [
          { value: 'meat', label: '肉肉', icon: '🥩' },
          { value: 'fish', label: '鱼', icon: '🐟' },
          { value: 'egg', label: '鸡蛋', icon: '🥚' },
          { value: 'vegetable', label: '蔬菜', icon: '🥬' },
          { value: 'tofu', label: '豆腐', icon: '🧈' },
          { value: 'soup', label: '汤', icon: '🍲' }
        ]
      },
      {
        key: 'taste',
        label: '好吃吗',
        type: 'mood',
        options: [
          { value: 'delicious', label: '超好吃', icon: '😋' },
          { value: 'good', label: '好吃', icon: '😊' },
          { value: 'normal', label: '一般', icon: '😐' },
          { value: 'not_good', label: '不太喜欢', icon: '😕' }
        ]
      }
    ],
    summary: function(data) {
      var parts = []
      if (data.riceBowl !== undefined) parts.push('吃了 ' + data.riceBowl + ' 碗饭')
      if (data.foodItems && data.foodItems.length > 0) {
        var labelMap = { meat: '肉肉', fish: '鱼', egg: '鸡蛋', vegetable: '蔬菜', tofu: '豆腐', soup: '汤' }
        var labels = data.foodItems.map(function(v) { return labelMap[v] || v })
        parts.push('菜：' + labels.join('、'))
      }
      if (data.taste) {
        var tasteMap = { delicious: '超好吃', good: '好吃', normal: '一般', not_good: '不太喜欢' }
        parts.push('评价：' + (tasteMap[data.taste] || data.taste))
      }
      return parts.join('，')
    }
  },

  eat_dinner: {
    name: '吃晚餐',
    icon: '🍛',
    fields: [
      {
        key: 'riceBowl',
        label: '吃了几碗饭',
        type: 'counter',
        min: 0,
        max: 5,
        default: 1
      },
      {
        key: 'foodItems',
        label: '吃了什么菜',
        type: 'select',
        multiple: true,
        options: [
          { value: 'meat', label: '肉肉', icon: '🥩' },
          { value: 'fish', label: '鱼', icon: '🐟' },
          { value: 'egg', label: '鸡蛋', icon: '🥚' },
          { value: 'vegetable', label: '蔬菜', icon: '🥬' },
          { value: 'tofu', label: '豆腐', icon: '🧈' },
          { value: 'soup', label: '汤', icon: '🍲' }
        ]
      },
      {
        key: 'taste',
        label: '好吃吗',
        type: 'mood',
        options: [
          { value: 'delicious', label: '超好吃', icon: '😋' },
          { value: 'good', label: '好吃', icon: '😊' },
          { value: 'normal', label: '一般', icon: '😐' },
          { value: 'not_good', label: '不太喜欢', icon: '😕' }
        ]
      }
    ],
    summary: function(data) {
      var parts = []
      if (data.riceBowl !== undefined) parts.push('吃了 ' + data.riceBowl + ' 碗饭')
      if (data.foodItems && data.foodItems.length > 0) {
        var labelMap = { meat: '肉肉', fish: '鱼', egg: '鸡蛋', vegetable: '蔬菜', tofu: '豆腐', soup: '汤' }
        var labels = data.foodItems.map(function(v) { return labelMap[v] || v })
        parts.push('菜：' + labels.join('、'))
      }
      if (data.taste) {
        var tasteMap = { delicious: '超好吃', good: '好吃', normal: '一般', not_good: '不太喜欢' }
        parts.push('评价：' + (tasteMap[data.taste] || data.taste))
      }
      return parts.join('，')
    }
  },

  // ===== 生活自理 =====
  tidy: {
    name: '整理玩具',
    icon: '🧸',
    fields: [
      {
        key: 'tidyItems',
        label: '整理了什么',
        type: 'select',
        multiple: true,
        options: [
          { value: 'blocks', label: '积木', icon: '🧱' },
          { value: 'dolls', label: '娃娃', icon: '🧸' },
          { value: 'cars', label: '小车', icon: '🚗' },
          { value: 'books', label: '绘本', icon: '📚' },
          { value: 'puzzles', label: '拼图', icon: '🧩' },
          { value: 'other', label: '其他', icon: '✨' }
        ]
      },
      {
        key: 'tidyLevel',
        label: '整理得怎么样',
        type: 'mood',
        options: [
          { value: 'very_neat', label: '非常整齐', icon: '✨' },
          { value: 'neat', label: '挺整齐', icon: '😊' },
          { value: 'ok', label: '还可以', icon: '😐' },
          { value: 'messy', label: '有点乱', icon: '😅' }
        ]
      }
    ],
    summary: function(data) {
      var parts = []
      if (data.tidyItems && data.tidyItems.length > 0) {
        var labelMap = { blocks: '积木', dolls: '娃娃', cars: '小车', books: '绘本', puzzles: '拼图', other: '其他' }
        var labels = data.tidyItems.map(function(v) { return labelMap[v] || v })
        parts.push('整理了：' + labels.join('、'))
      }
      if (data.tidyLevel) {
        var levelMap = { very_neat: '非常整齐', neat: '挺整齐', ok: '还可以', messy: '有点乱' }
        parts.push('效果：' + (levelMap[data.tidyLevel] || data.tidyLevel))
      }
      return parts.join('，')
    }
  },

  housework: {
    name: '做家务',
    icon: '🧹',
    fields: [
      {
        key: 'houseworkType',
        label: '做了什么家务',
        type: 'select',
        multiple: true,
        options: [
          { value: 'sweep', label: '扫地', icon: '🧹' },
          { value: 'mop', label: '拖地', icon: '🧹' },
          { value: 'dishes', label: '洗碗', icon: '🍽️' },
          { value: 'clothes', label: '叠衣服', icon: '👕' },
          { value: 'water_plants', label: '浇花', icon: '🌱' },
          { value: 'feed_pet', label: '喂宠物', icon: '🐱' },
          { value: 'other', label: '其他', icon: '✨' }
        ]
      },
      {
        key: 'helpWho',
        label: '帮谁做的',
        type: 'select',
        options: [
          { value: 'mom', label: '帮妈妈', icon: '👩' },
          { value: 'dad', label: '帮爸爸', icon: '👨' },
          { value: 'self', label: '自己主动', icon: '💪' },
          { value: 'together', label: '全家一起', icon: '👨‍👩‍👧' }
        ]
      }
    ],
    summary: function(data) {
      var parts = []
      if (data.houseworkType && data.houseworkType.length > 0) {
        var labelMap = { sweep: '扫地', mop: '拖地', dishes: '洗碗', clothes: '叠衣服', water_plants: '浇花', feed_pet: '喂宠物', other: '其他' }
        var labels = data.houseworkType.map(function(v) { return labelMap[v] || v })
        parts.push('做了：' + labels.join('、'))
      }
      if (data.helpWho) {
        var whoMap = { mom: '帮妈妈', dad: '帮爸爸', self: '自己主动', together: '全家一起' }
        parts.push(whoMap[data.helpWho] || data.helpWho)
      }
      return parts.join('，')
    }
  },

  // ===== 学习成长 =====
  reading: {
    name: '阅读',
    icon: '📖',
    fields: [
      {
        key: 'bookName',
        label: '读了什么书',
        type: 'text',
        placeholder: '输入书名',
        required: true
      },
      {
        key: 'pageCount',
        label: '读了多少页',
        type: 'counter',
        min: 1,
        max: 100,
        default: 10
      },
      {
        key: 'readFeeling',
        label: '喜欢这本书吗',
        type: 'mood',
        options: [
          { value: 'love', label: '超喜欢', icon: '❤️' },
          { value: 'like', label: '喜欢', icon: '😊' },
          { value: 'normal', label: '一般', icon: '😐' },
          { value: 'dislike', label: '不太喜欢', icon: '😕' }
        ]
      }
    ],
    summary: function(data) {
      var parts = []
      if (data.bookName) parts.push('《' + data.bookName + '》')
      if (data.pageCount) parts.push('读了 ' + data.pageCount + ' 页')
      if (data.readFeeling) {
        var feelingMap = { love: '超喜欢', like: '喜欢', normal: '一般', dislike: '不太喜欢' }
        parts.push('感受：' + (feelingMap[data.readFeeling] || data.readFeeling))
      }
      return parts.join('，')
    }
  },

  exercise: {
    name: '运动',
    icon: '🏃',
    fields: [
      {
        key: 'exerciseType',
        label: '做了什么运动',
        type: 'select',
        multiple: true,
        options: [
          { value: 'run', label: '跑步', icon: '🏃' },
          { value: 'jump', label: '跳绳', icon: '🤸' },
          { value: 'bike', label: '骑车', icon: '🚲' },
          { value: 'swim', label: '游泳', icon: '🏊' },
          { value: 'ball', label: '球类', icon: '⚽' },
          { value: 'dance', label: '跳舞', icon: '💃' },
          { value: 'yoga', label: '瑜伽', icon: '🧘' },
          { value: 'walk', label: '散步', icon: '🚶' }
        ]
      },
      {
        key: 'duration',
        label: '运动了多久',
        type: 'select',
        options: [
          { value: '15min', label: '15分钟', icon: '⏰' },
          { value: '30min', label: '30分钟', icon: '⏰' },
          { value: '1hour', label: '1小时', icon: '⏰' },
          { value: 'more', label: '超过1小时', icon: '⏰' }
        ]
      },
      {
        key: 'feeling',
        label: '运动后感觉',
        type: 'mood',
        options: [
          { value: 'energetic', label: '精力充沛', icon: '💪' },
          { value: 'happy', label: '开心', icon: '😊' },
          { value: 'tired', label: '有点累', icon: '😓' },
          { value: 'very_tired', label: '好累', icon: '😩' }
        ]
      }
    ],
    summary: function(data) {
      var parts = []
      if (data.exerciseType && data.exerciseType.length > 0) {
        var labelMap = { run: '跑步', jump: '跳绳', bike: '骑车', swim: '游泳', ball: '球类', dance: '跳舞', yoga: '瑜伽', walk: '散步' }
        var labels = data.exerciseType.map(function(v) { return labelMap[v] || v })
        parts.push('运动：' + labels.join('、'))
      }
      if (data.duration) {
        var durationMap = { '15min': '15分钟', '30min': '30分钟', '1hour': '1小时', 'more': '超过1小时' }
        parts.push('时长：' + (durationMap[data.duration] || data.duration))
      }
      if (data.feeling) {
        var feelingMap = { energetic: '精力充沛', happy: '开心', tired: '有点累', very_tired: '好累' }
        parts.push('感受：' + (feelingMap[data.feeling] || data.feeling))
      }
      return parts.join('，')
    }
  },

  polite: {
    name: '礼貌用语',
    icon: '🙏',
    fields: [
      {
        key: 'politeWords',
        label: '说了什么',
        type: 'select',
        multiple: true,
        options: [
          { value: 'thank_you', label: '谢谢', icon: '🙏' },
          { value: 'please', label: '请', icon: '🙏' },
          { value: 'sorry', label: '对不起', icon: '😔' },
          { value: 'excuse_me', label: '打扰一下', icon: '👋' },
          { value: 'good_morning', label: '早上好', icon: '🌅' },
          { value: 'good_night', label: '晚安', icon: '🌙' },
          { value: 'hello', label: '你好', icon: '👋' },
          { value: 'goodbye', label: '再见', icon: '👋' }
        ]
      },
      {
        key: 'toWho',
        label: '对谁说的',
        type: 'select',
        options: [
          { value: 'parents', label: '爸爸妈妈', icon: '👨‍👩‍👧' },
          { value: 'teachers', label: '老师', icon: '👩‍🏫' },
          { value: 'friends', label: '小朋友', icon: '👶' },
          { value: 'elders', label: '长辈', icon: '👴' },
          { value: 'strangers', label: '陌生人', icon: '🧑' }
        ]
      }
    ],
    summary: function(data) {
      var parts = []
      if (data.politeWords && data.politeWords.length > 0) {
        var labelMap = { thank_you: '谢谢', please: '请', sorry: '对不起', excuse_me: '打扰一下', good_morning: '早上好', good_night: '晚安', hello: '你好', goodbye: '再见' }
        var labels = data.politeWords.map(function(v) { return labelMap[v] || v })
        parts.push('说了：' + labels.join('、'))
      }
      if (data.toWho) {
        var whoMap = { parents: '爸爸妈妈', teachers: '老师', friends: '小朋友', elders: '长辈', strangers: '陌生人' }
        parts.push('对' + (whoMap[data.toWho] || data.toWho) + '说的')
      }
      return parts.join('，')
    }
  }
}

// 默认配置（用于自定义习惯）
var DEFAULT_CONFIG = {
  fields: [
    {
      key: 'note',
      label: '打卡记录',
      type: 'text',
      placeholder: '记录一下吧~'
    }
  ],
  summary: function(data) {
    return data.note || ''
  }
}

/**
 * 获取习惯配置
 * @param {string} habitType - 习惯类型
 * @returns {Object} 配置对象
 */
function getHabitConfig(habitType) {
  return HABIT_CONFIG[habitType] || DEFAULT_CONFIG
}

module.exports = {
  HABIT_CONFIG: HABIT_CONFIG,
  DEFAULT_CONFIG: DEFAULT_CONFIG,
  getHabitConfig: getHabitConfig
}
