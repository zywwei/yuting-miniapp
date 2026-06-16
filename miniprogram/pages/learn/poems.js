var speak = require('../../utils/speak.js')

// 内置古诗数据（25首经典古诗）
var BUILTIN_POEMS = [
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

Page({
  data: {
    poems: [],
    currentIndex: 0,
    memorizedCount: 0
  },

  onLoad: function() {
    this.loadPoems()
  },

  loadPoems: function() {
    var learnProgress = wx.getStorageSync('learnProgress') || {}
    var poemProgress = learnProgress.poems || {}

    var poems = BUILTIN_POEMS.map(function(poem) {
      return {
        id: poem.id,
        title: poem.title,
        author: poem.author,
        dynasty: poem.dynasty,
        content: poem.content,
        memorized: !!poemProgress[poem.id]
      }
    })

    var memorizedCount = poems.filter(function(p) { return p.memorized }).length

    this.setData({
      poems: poems,
      memorizedCount: memorizedCount,
      currentIndex: 0
    })
  },

  prevPoem: function() {
    var currentIndex = this.data.currentIndex
    if (currentIndex > 0) {
      this.setData({ currentIndex: currentIndex - 1 })
    }
  },

  nextPoem: function() {
    var currentIndex = this.data.currentIndex
    var poems = this.data.poems
    if (currentIndex < poems.length - 1) {
      this.setData({ currentIndex: currentIndex + 1 })
    }
  },

  markMemorized: function() {
    var self = this
    var poems = self.data.poems
    var currentIndex = self.data.currentIndex
    var poem = poems[currentIndex]

    var learnProgress = wx.getStorageSync('learnProgress') || {}
    if (!learnProgress.poems) learnProgress.poems = {}

    learnProgress.poems[poem.id] = {
      memorizedAt: new Date().toISOString(),
      title: poem.title
    }

    wx.setStorageSync('learnProgress', learnProgress)

    poems[currentIndex].memorized = true
    var memorizedCount = poems.filter(function(p) { return p.memorized }).length

    self.setData({ poems: poems, memorizedCount: memorizedCount })

    speak.speakSuccess()

    wx.showToast({ title: '已背诵！', icon: 'success' })

    if (currentIndex < poems.length - 1) {
      setTimeout(function() {
        self.setData({ currentIndex: currentIndex + 1 })
      }, 500)
    }
  },

  // 朗读古诗标题
  speakTitle: function() {
    var poem = this.data.poems[this.data.currentIndex]
    if (!poem) return
    speak.speak(poem.title)
  }
})
