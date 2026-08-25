var childStorage = require('../../utils/child-storage.js')
var cloud = require('../../utils/cloud.js')
var learnProgress = require('./learn-progress.js')
var modulesData = require('./modules-data.js')

var cachedData = { cards: null, poems: null, english: null, math: { formulas: null, concepts: null, practice: null } }

var getBuiltinCards = function() {
  return [
    { id: 'c01', word: '\u4eba', pinyin: 'r\u00e9n', meaning: '\u4eba\u7c7b', category: '\u57fa\u7840', level: 1 },
    { id: 'c02', word: '\u5927', pinyin: 'd\u00e0', meaning: '\u5927\u7684', category: '\u57fa\u7840', level: 1 },
    { id: 'c03', word: '\u5c0f', pinyin: 'xi\u01ceo', meaning: '\u5c0f\u7684', category: '\u57fa\u7840', level: 1 },
    { id: 'c04', word: '\u4e0a', pinyin: 'sh\u00e0ng', meaning: '\u4e0a\u9762', category: '\u57fa\u7840', level: 1 },
    { id: 'c05', word: '\u4e0b', pinyin: 'xi\u00e0', meaning: '\u4e0b\u9762', category: '\u57fa\u7840', level: 1 },
    { id: 'c06', word: '\u5929', pinyin: 'ti\u0101n', meaning: '\u5929\u7a7a', category: '\u57fa\u7840', level: 1 },
    { id: 'c07', word: '\u5730', pinyin: 'd\u00ec', meaning: '\u5927\u5730', category: '\u57fa\u7840', level: 1 },
    { id: 'c08', word: '\u65e5', pinyin: 'r\u00ec', meaning: '\u592a\u9633', category: '\u57fa\u7840', level: 1 },
    { id: 'c09', word: '\u6708', pinyin: 'yu\u00e8', meaning: '\u6708\u4eae', category: '\u57fa\u7840', level: 1 },
    { id: 'c10', word: '\u6c34', pinyin: 'shu\u01d0', meaning: '\u6c34', category: '\u57fa\u7840', level: 1 }
  ]
}

// 古诗/英语真实数据在主包 utils/poems-level-* 与 english-level-*（分包允许引用主包模块）。
// require 路径必须逐个写死：小程序打包工具无法静态分析动态拼接的路径。
var getBuiltinPoems = function() {
  if (!cachedData.poems) {
    var poems = []
    try {
      var p1 = require('../../utils/poems-level-1.js')
      var p2 = require('../../utils/poems-level-2.js')
      var p3 = require('../../utils/poems-level-3.js')
      var p4 = require('../../utils/poems-level-4.js')
      ;[p1, p2, p3, p4].forEach(function(level) {
        if (Array.isArray(level)) poems = poems.concat(level)
      })
    } catch (e) {
      console.warn('古诗数据聚合失败:', e)
    }
    cachedData.poems = poems
  }
  return cachedData.poems
}

var getBuiltinEnglish = function() {
  if (!cachedData.english) {
    var words = []
    try {
      var e1 = require('../../utils/english-level-1.js')
      var e2 = require('../../utils/english-level-2.js')
      var e3 = require('../../utils/english-level-3.js')
      var e4 = require('../../utils/english-level-4.js')
      var e5 = require('../../utils/english-level-5.js')
      ;[e1, e2, e3, e4, e5].forEach(function(level) {
        if (Array.isArray(level)) words = words.concat(level)
      })
    } catch (e) {
      console.warn('英语单词数据聚合失败:', e)
    }
    cachedData.english = words
  }
  return cachedData.english
}

var getBuiltinMathFormulas = function() {
  return [
    // 基础运算
    { id: 'f001', title: '\u52a0\u6cd5\u4ea4\u6362\u5f8b', category: 'basic', grade: '1', formula: 'a + b = b + a', explanation: '\u4e24\u4e2a\u6570\u76f8\u52a0\uff0c\u4ea4\u6362\u4f4d\u7f6e\uff0c\u7ed3\u679c\u4e0d\u53d8' },
    { id: 'f002', title: '\u52a0\u6cd5\u7ed3\u5408\u5f8b', category: 'basic', grade: '1', formula: '(a + b) + c = a + (b + c)', explanation: '\u4e09\u4e2a\u6570\u76f8\u52a0\uff0c\u5148\u52a0\u524d\u4e24\u4e2a\u6216\u5148\u52a0\u540e\u4e24\u4e2a\uff0c\u7ed3\u679c\u4e0d\u53d8' },
    { id: 'f003', title: '\u4e58\u6cd5\u4ea4\u6362\u5f8b', category: 'basic', grade: '2', formula: 'a \u00d7 b = b \u00d7 a', explanation: '\u4e24\u4e2a\u6570\u76f8\u4e58\uff0c\u4ea4\u6362\u4f4d\u7f6e\uff0c\u7ed3\u679c\u4e0d\u53d8' },
    { id: 'f004', title: '\u4e58\u6cd5\u7ed3\u5408\u5f8b', category: 'basic', grade: '2', formula: '(a \u00d7 b) \u00d7 c = a \u00d7 (b \u00d7 c)', explanation: '\u4e09\u4e2a\u6570\u76f8\u4e58\uff0c\u5148\u4e58\u524d\u4e24\u4e2a\u6216\u5148\u4e58\u540e\u4e24\u4e2a\uff0c\u7ed3\u679c\u4e0d\u53d8' },
    { id: 'f005', title: '\u4e58\u6cd5\u5206\u914d\u5f8b', category: 'basic', grade: '3', formula: '(a + b) \u00d7 c = a \u00d7 c + b \u00d7 c', explanation: '\u4e24\u4e2a\u6570\u7684\u548c\u4e58\u4ee5\u4e00\u4e2a\u6570\uff0c\u7b49\u4e8e\u5206\u522b\u76f8\u4e58\u518d\u76f8\u52a0' },
    { id: 'f006', title: '\u51cf\u6cd5\u6027\u8d28', category: 'basic', grade: '1', formula: 'a - b - c = a - (b + c)', explanation: '\u4e00\u4e2a\u6570\u8fde\u7eed\u51cf\u53bb\u4e24\u4e2a\u6570\uff0c\u7b49\u4e8e\u51cf\u53bb\u8fd9\u4e24\u4e2a\u6570\u7684\u548c' },
    { id: 'f007', title: '\u9664\u6cd5\u6027\u8d28', category: 'basic', grade: '2', formula: 'a \u00f7 b \u00f7 c = a \u00f7 (b \u00d7 c)', explanation: '\u4e00\u4e2a\u6570\u8fde\u7eed\u9664\u4ee5\u4e24\u4e2a\u6570\uff0c\u7b49\u4e8e\u9664\u4ee5\u8fd9\u4e24\u4e2a\u6570\u7684\u79ef' },
    { id: 'f008', title: '\u548c\u4e0d\u53d8\u89c4\u5f8b', category: 'basic', grade: '2', formula: 'a + b = (a + n) + (b - n)', explanation: '\u4e00\u4e2a\u52a0\u6570\u589e\u52a0\uff0c\u53e6\u4e00\u4e2a\u52a0\u6570\u51cf\u5c11\u76f8\u540c\u7684\u6570\uff0c\u548c\u4e0d\u53d8' },
    { id: 'f009', title: '\u5dee\u4e0d\u53d8\u89c4\u5f8b', category: 'basic', grade: '2', formula: 'a - b = (a + n) - (b + n)', explanation: '\u88ab\u51cf\u6570\u548c\u51cf\u6570\u540c\u65f6\u589e\u52a0\u76f8\u540c\u7684\u6570\uff0c\u5dee\u4e0d\u53d8' },
    // 数与代数
    { id: 'f030', title: '\u7b49\u5f0f\u6027\u8d28', category: 'algebra', grade: '3', formula: '\u82e5 a = b\uff0c\u5219 a + c = b + c', explanation: '\u7b49\u5f0f\u4e24\u8fb9\u540c\u65f6\u52a0\u6216\u51cf\u540c\u4e00\u4e2a\u6570\uff0c\u7b49\u5f0f\u4ecd\u7136\u6210\u7acb' },
    { id: 'f031', title: '\u89e3\u65b9\u7a0b\u57fa\u672c\u539f\u5219', category: 'algebra', grade: '5', formula: 'x + a = b \u2192 x = b - a', explanation: '\u6c42\u672a\u77e5\u6570\u65f6\uff0c\u5229\u7528\u52a0\u51cf\u6cd5\u4e92\u9006\u5173\u7cfb' },
    { id: 'f032', title: '\u4e58\u9664\u6cd5\u4e92\u9006', category: 'algebra', grade: '5', formula: 'x \u00d7 a = b \u2192 x = b \u00f7 a', explanation: '\u6c42\u672a\u77e5\u6570\u65f6\uff0c\u5229\u7528\u4e58\u9664\u6cd5\u4e92\u9006\u5173\u7cfb' },
    { id: 'f033', title: '\u6bd4\u4f8b\u7684\u57fa\u672c\u6027\u8d28', category: 'algebra', grade: '6', formula: 'a:b = (a\u00d7n):(b\u00d7n)', explanation: '\u6bd4\u7684\u524d\u9879\u548c\u540e\u9879\u540c\u65f6\u4e58\u6216\u9664\u4ee5\u76f8\u540c\u7684\u6570\uff0c\u6bd4\u503c\u4e0d\u53d8' },
    { id: 'f034', title: '\u6b63\u6bd4\u4f8b\u516c\u5f0f', category: 'algebra', grade: '6', formula: 'y/x = k (\u5e38\u6570)', explanation: '\u4e24\u4e2a\u91cf\u6210\u6b63\u6bd4\u4f8b\uff0c\u5b83\u4eec\u7684\u6bd4\u503c\u662f\u4e00\u4e2a\u5e38\u6570' },
    { id: 'f035', title: '\u53cd\u6bd4\u4f8b\u516c\u5f0f', category: 'algebra', grade: '6', formula: 'x \u00d7 y = k (\u5e38\u6570)', explanation: '\u4e24\u4e2a\u91cf\u6210\u53cd\u6bd4\u4f8b\uff0c\u5b83\u4eec\u7684\u4e58\u79ef\u662f\u4e00\u4e2a\u5e38\u6570' },
    // 几何图形
    { id: 'f010', title: '\u957f\u65b9\u5f62\u9762\u79ef', category: 'geometry', grade: '3', formula: 'S = a \u00d7 b', explanation: '\u957f\u65b9\u5f62\u7684\u9762\u79ef\u7b49\u4e8e\u957f\u4e58\u4ee5\u5bbd' },
    { id: 'f011', title: '\u6b63\u65b9\u5f62\u9762\u79ef', category: 'geometry', grade: '3', formula: 'S = a \u00d7 a', explanation: '\u6b63\u65b9\u5f62\u7684\u9762\u79ef\u7b49\u4e8e\u8fb9\u957f\u4e58\u4ee5\u8fb9\u957f' },
    { id: 'f012', title: '\u4e09\u89d2\u5f62\u9762\u79ef', category: 'geometry', grade: '4', formula: 'S = a \u00d7 h \u00f7 2', explanation: '\u4e09\u89d2\u5f62\u7684\u9762\u79ef\u7b49\u4e8e\u5e95\u4e58\u4ee5\u9ad8\u9664\u4ee52' },
    { id: 'f013', title: '\u5706\u7684\u9762\u79ef', category: 'geometry', grade: '6', formula: 'S = \u03c0 \u00d7 r \u00d7 r', explanation: '\u5706\u7684\u9762\u79ef\u7b49\u4e8e\u03c0\u4e58\u4ee5\u534a\u5f84\u7684\u5e73\u65b9' },
    { id: 'f014', title: '\u5706\u7684\u5468\u957f', category: 'geometry', grade: '6', formula: 'C = 2 \u00d7 \u03c0 \u00d7 r', explanation: '\u5706\u7684\u5468\u957f\u7b49\u4e8e2\u4e58\u4ee5\u03c0\u4e58\u4ee5\u534a\u5f84' },
    { id: 'f015', title: '\u957f\u65b9\u4f53\u4f53\u79ef', category: 'geometry', grade: '5', formula: 'V = a \u00d7 b \u00d7 h', explanation: '\u957f\u65b9\u4f53\u7684\u4f53\u79ef\u7b49\u4e8e\u957f\u4e58\u4ee5\u5bbd\u4e58\u4ee5\u9ad8' },
    { id: 'f016', title: '\u6b63\u65b9\u4f53\u4f53\u79ef', category: 'geometry', grade: '5', formula: 'V = a \u00d7 a \u00d7 a', explanation: '\u6b63\u65b9\u4f53\u7684\u4f53\u79ef\u7b49\u4e8e\u68f1\u957f\u7684\u7acb\u65b9' },
    { id: 'f017', title: '\u5e73\u884c\u56db\u8fb9\u5f62\u9762\u79ef', category: 'geometry', grade: '5', formula: 'S = a \u00d7 h', explanation: '\u5e73\u884c\u56db\u8fb9\u5f62\u7684\u9762\u79ef\u7b49\u4e8e\u5e95\u4e58\u4ee5\u9ad8' },
    { id: 'f018', title: '\u68af\u5f62\u9762\u79ef', category: 'geometry', grade: '5', formula: 'S = (a + b) \u00d7 h \u00f7 2', explanation: '\u68af\u5f62\u7684\u9762\u79ef\u7b49\u4e8e\u4e0a\u5e95\u52a0\u4e0b\u5e95\u7684\u548c\u4e58\u4ee5\u9ad8\u9664\u4ee52' },
    // 单位换算
    { id: 'f040', title: '\u957f\u5ea6\u5355\u4f4d\u6362\u7b97', category: 'units', grade: '2', formula: '1\u7c73 = 100\u5398\u7c73 = 1000\u6beb\u7c73', explanation: '\u957f\u5ea6\u5355\u4f4d\u4e4b\u95f4\u7684\u8fdb\u7387\u5173\u7cfb' },
    { id: 'f041', title: '\u91cd\u91cf\u5355\u4f4d\u6362\u7b97', category: 'units', grade: '3', formula: '1\u5343\u514b = 1000\u514b', explanation: '\u91cd\u91cf\u5355\u4f4d\u4e4b\u95f4\u7684\u8fdb\u7387\u5173\u7cfb' },
    { id: 'f042', title: '\u9762\u79ef\u5355\u4f4d\u6362\u7b97', category: 'units', grade: '3', formula: '1\u5e73\u65b9\u7c73 = 10000\u5e73\u65b9\u5398\u7c73', explanation: '\u9762\u79ef\u5355\u4f4d\u4e4b\u95f4\u7684\u8fdb\u7387\u5173\u7cfb' },
    { id: 'f043', title: '\u4f53\u79ef\u5355\u4f4d\u6362\u7b97', category: 'units', grade: '5', formula: '1\u7acb\u65b9\u7c73 = 1000\u7acb\u65b9\u5206\u7c73 = 1000\u5347', explanation: '\u4f53\u79ef\u5355\u4f4d\u4e4b\u95f4\u7684\u8fdb\u7387\u5173\u7cfb' },
    { id: 'f044', title: '\u65f6\u95f4\u5355\u4f4d\u6362\u7b97', category: 'units', grade: '2', formula: '1\u5c0f\u65f6 = 60\u5206\u949f = 3600\u79d2', explanation: '\u65f6\u95f4\u5355\u4f4d\u4e4b\u95f4\u7684\u8fdb\u7387\u5173\u7cfb' },
    { id: 'f045', title: '\u8d27\u5e01\u5355\u4f4d\u6362\u7b97', category: 'units', grade: '2', formula: '1\u5143 = 10\u89d2 = 100\u5206', explanation: '\u4eba\u6c11\u5e01\u5355\u4f4d\u4e4b\u95f4\u7684\u8fdb\u7387\u5173\u7cfb' },
    // 数列规律
    { id: 'f050', title: '\u7b49\u5dee\u6570\u5217\u901a\u9879\u516c\u5f0f', category: 'sequence', grade: '4', formula: 'a\u2099 = a\u2081 + (n-1)d', explanation: '\u7b49\u5dee\u6570\u5217\u4e2d\u7b2cn\u4e2a\u6570\u7b49\u4e8e\u9996\u9879\u52a0\u4e0a(n-1)\u4e2a\u516c\u5dee' },
    { id: 'f051', title: '\u7b49\u6bd4\u6570\u5217\u901a\u9879\u516c\u5f0f', category: 'sequence', grade: '6', formula: 'a\u2099 = a\u2081 \u00d7 q^(n-1)', explanation: '\u7b49\u6bd4\u6570\u5217\u4e2d\u7b2cn\u4e2a\u6570\u7b49\u4e8e\u9996\u9879\u4e58\u4ee5\u516c\u6bd4\u7684(n-1)\u6b21\u65b9' },
    { id: 'f052', title: '\u7b49\u5dee\u6570\u5217\u6c42\u548c', category: 'sequence', grade: '6', formula: 'S\u2099 = (a\u2081 + a\u2099) \u00d7 n \u00f7 2', explanation: '\u7b49\u5dee\u6570\u5217\u524dn\u9879\u548c\u7b49\u4e8e\u9996\u672b\u9879\u4e4b\u548c\u4e58\u4ee5\u9879\u6570\u9664\u4ee52' },
    { id: 'f053', title: '\u6590\u6ce2\u90a3\u5951\u6570\u5217', category: 'sequence', grade: '5', formula: 'F(n) = F(n-1) + F(n-2)', explanation: '\u4ece\u7b2c\u4e09\u9879\u5f00\u59cb\uff0c\u6bcf\u4e00\u9879\u90fd\u662f\u524d\u4e24\u9879\u4e4b\u548c: 1,1,2,3,5,8,13...' },
    { id: 'f054', title: '\u5e73\u65b9\u6570\u5217', category: 'sequence', grade: '4', formula: 'a\u2099 = n\u00b2', explanation: '\u5e73\u65b9\u6570\u5217: 1,4,9,16,25,36...\u6bcf\u4e2a\u6570\u662f\u5e8f\u53f7\u7684\u5e73\u65b9' },
    { id: 'f055', title: '\u4e09\u89d2\u6570\u5217', category: 'sequence', grade: '5', formula: 'a\u2099 = n(n+1)/2', explanation: '\u4e09\u89d2\u6570\u5217: 1,3,6,10,15,21...\u6bcf\u4e2a\u6570\u662f\u8fde\u7eed\u81ea\u7136\u6570\u4e4b\u548c' },
    // 统计概率
    { id: 'f060', title: '\u5e73\u5747\u6570', category: 'statistics', grade: '4', formula: '\u5e73\u5747\u6570 = \u603b\u6570 \u00f7 \u4e2a\u6570', explanation: '\u6240\u6709\u6570\u7684\u548c\u9664\u4ee5\u6570\u7684\u4e2a\u6570' },
    { id: 'f061', title: '\u4e2d\u4f4d\u6570', category: 'statistics', grade: '5', formula: '\u6392\u5e8f\u540e\u53d6\u4e2d\u95f4\u503c', explanation: '\u5c06\u6570\u636e\u4ece\u5c0f\u5230\u5927\u6392\u5217\uff0c\u53d6\u4e2d\u95f4\u4f4d\u7f6e\u7684\u6570' },
    { id: 'f062', title: '\u4f17\u6570', category: 'statistics', grade: '5', formula: '\u51fa\u73b0\u6b21\u6570\u6700\u591a\u7684\u6570', explanation: '\u5728\u4e00\u7ec4\u6570\u636e\u4e2d\u51fa\u73b0\u6b21\u6570\u6700\u591a\u7684\u90a3\u4e2a\u6570' },
    { id: 'f063', title: '\u6781\u5dee', category: 'statistics', grade: '5', formula: '\u6781\u5dee = \u6700\u5927\u503c - \u6700\u5c0f\u503c', explanation: '\u4e00\u7ec4\u6570\u636e\u4e2d\u6700\u5927\u503c\u4e0e\u6700\u5c0f\u503c\u7684\u5dee' },
    { id: 'f064', title: '\u53ef\u80fd\u6027\u5927\u5c0f', category: 'statistics', grade: '5', formula: '\u53ef\u80fd\u6027 = \u6ee1\u8db3\u6761\u4ef6\u7684\u6570 \u00f7 \u603b\u6570', explanation: '\u67d0\u4e8b\u4ef6\u53d1\u751f\u7684\u53ef\u80fd\u6027\u5927\u5c0f\u7528\u5206\u6570\u8868\u793a' },
    // 应用题
    { id: 'f020', title: '\u8def\u7a0b\u516c\u5f0f', category: 'application', grade: '4', formula: '\u8def\u7a0b = \u901f\u5ea6 \u00d7 \u65f6\u95f4', explanation: '\u8def\u7a0b\u7b49\u4e8e\u901f\u5ea6\u4e58\u4ee5\u65f6\u95f4' },
    { id: 'f021', title: '\u603b\u4ef7\u516c\u5f0f', category: 'application', grade: '3', formula: '\u603b\u4ef7 = \u5355\u4ef7 \u00d7 \u6570\u91cf', explanation: '\u603b\u4ef7\u7b49\u4e8e\u5355\u4ef7\u4e58\u4ee5\u6570\u91cf' },
    { id: 'f022', title: '\u5de5\u4f5c\u603b\u91cf', category: 'application', grade: '4', formula: '\u5de5\u4f5c\u603b\u91cf = \u5de5\u4f5c\u6548\u7387 \u00d7 \u5de5\u4f5c\u65f6\u95f4', explanation: '\u5de5\u4f5c\u603b\u91cf\u7b49\u4e8e\u5de5\u4f5c\u6548\u7387\u4e58\u4ee5\u5de5\u4f5c\u65f6\u95f4' },
    { id: 'f023', title: '\u6d41\u6c34\u95ee\u9898', category: 'application', grade: '6', formula: '\u987a\u6c34\u901f\u5ea6 = \u8239\u901f + \u6c34\u901f', explanation: '\u8239\u987a\u6c34\u884c\u9a76\u65f6\uff0c\u5b9e\u9645\u901f\u5ea6\u7b49\u4e8e\u8239\u901f\u52a0\u6c34\u901f' },
    { id: 'f024', title: '\u6df7\u5408\u95ee\u9898', category: 'application', grade: '5', formula: '\u6d53\u5ea6 = \u6eb6\u8d28 \u00f7 \u6eb6\u6db2', explanation: '\u6d53\u5ea6\u7b49\u4e8e\u6eb6\u8d28\u8d28\u91cf\u9664\u4ee5\u6eb6\u6db2\u8d28\u91cf' }
  ]
}

var getBuiltinMathConcepts = function() {
  return [
    // 数的认识
    { id: 'm001', title: '\u81ea\u7136\u6570', category: 'numbers', grade: '1', content: '\u7528\u6765\u8868\u793a\u7269\u4f53\u4e2a\u6570\u7684\u6570\u53eb\u505a\u81ea\u7136\u6570\u3002\u81ea\u7136\u6570\u4ece0\u5f00\u59cb\uff0c0, 1, 2, 3...\u90fd\u662f\u81ea\u7136\u6570\u3002', example: '3\u4e2a\u82f9\u679c\u4e2d\u76843\u5c31\u662f\u81ea\u7136\u6570\u3002' },
    { id: 'm002', title: '\u6574\u6570', category: 'numbers', grade: '4', content: '\u6574\u6570\u5305\u62ec\u6b63\u6574\u6570\u30010\u548c\u8d1f\u6574\u6570\u3002\u6b63\u6574\u6570\u548c0\u7edf\u79f0\u4e3a\u81ea\u7136\u6570\u3002', example: '-3, -2, -1, 0, 1, 2, 3\u90fd\u662f\u6574\u6570\u3002' },
    { id: 'm003', title: '\u5206\u6570', category: 'numbers', grade: '3', content: '\u628a\u5355\u4f4d"1"\u5e73\u5747\u5206\u6210\u82e5\u5e72\u4efd\uff0c\u8868\u793a\u8fd9\u6837\u7684\u4e00\u4efd\u6216\u51e0\u4efd\u7684\u6570\u53eb\u505a\u5206\u6570\u3002', example: '1/2\u8868\u793a\u628a\u5e73\u5747\u5206\u62102\u4efd\uff0c\u53d6\u5176\u4e2d1\u4efd\u3002' },
    { id: 'm004', title: '\u5c0f\u6570', category: 'numbers', grade: '3', content: '\u628a\u6574\u6570"1"\u5e73\u5747\u5206\u621010\u4efd\u3001100\u4efd\u30011000\u4efd...\u8fd9\u6837\u7684\u4e00\u4efd\u6216\u51e0\u4efd\u53ef\u4ee5\u7528\u5c0f\u6570\u8868\u793a\u3002', example: '0.5\u8868\u793a\u5341\u5206\u4e4b\u4e94\u3002' },
    { id: 'm005', title: '\u56e0\u6570\u4e0e\u500d\u6570', category: 'numbers', grade: '4', content: '\u5982\u679ca\u00d7b=c\uff0c\u90a3\u4e48a\u548cb\u662fc\u7684\u56e0\u6570\uff0cc\u662fa\u548cb\u7684\u500d\u6570\u3002', example: '3\u00d74=12\uff0c3\u548c4\u662f12\u7684\u56e0\u6570\uff0c12\u662f3\u548c4\u7684\u500d\u6570\u3002' },
    { id: 'm006', title: '\u8d28\u6570\u4e0e\u5408\u6570', category: 'numbers', grade: '4', content: '\u53ea\u67091\u548c\u5b83\u672c\u8eab\u4e24\u4e2a\u56e0\u6570\u7684\u6570\u53eb\u8d28\u6570\uff0c\u9664\u4e861\u548c\u5b83\u672c\u8eab\u8fd8\u6709\u5176\u4ed6\u56e0\u6570\u7684\u6570\u53eb\u5408\u6570\u3002', example: '2, 3, 5, 7\u662f\u8d28\u6570\uff1b4, 6, 8, 9\u662f\u5408\u6570\u3002' },
    // 运算原理
    { id: 'm010', title: '\u56db\u5219\u8fd0\u7b97\u987a\u5e8f', category: 'operations', grade: '2', content: '\u5148\u4e58\u9664\u540e\u52a0\u51cf\uff0c\u6709\u62ec\u53f7\u5148\u7b97\u62ec\u53f7\u91cc\u9762\u7684\u3002', example: '2 + 3 \u00d7 4 = 2 + 12 = 14' },
    { id: 'm011', title: '\u52a0\u51cf\u6cd5\u7684\u5173\u7cfb', category: 'operations', grade: '1', content: '\u52a0\u6cd5\u548c\u51cf\u6cd5\u4e92\u4e3a\u9006\u8fd0\u7b97\u3002\u5982\u679ca + b = c\uff0c\u90a3\u4e48 c - b = a\u3002', example: '5 + 3 = 8\uff0c\u6240\u4ee5 8 - 3 = 5' },
    { id: 'm012', title: '\u4e58\u9664\u6cd5\u7684\u5173\u7cfb', category: 'operations', grade: '2', content: '\u4e58\u6cd5\u548c\u9664\u6cd5\u4e92\u4e3a\u9006\u8fd0\u7b97\u3002\u5982\u679ca \u00d7 b = c\uff0c\u90a3\u4e48 c \u00f7 b = a\u3002', example: '4 \u00d7 5 = 20\uff0c\u6240\u4ee5 20 \u00f7 5 = 4' },
    { id: 'm013', title: '\u5546\u4e0d\u53d8\u89c4\u5f8b', category: 'operations', grade: '4', content: '\u88ab\u9664\u6570\u548c\u9664\u6570\u540c\u65f6\u4e58\u6216\u9664\u4ee5\u76f8\u540c\u7684\u6570\uff080\u9664\u5916\uff09\uff0c\u5546\u4e0d\u53d8\u3002', example: '12 \u00f7 4 = 3\uff0c(12\u00d72) \u00f7 (4\u00d72) = 24 \u00f7 8 = 3' },
    // 几何概念
    { id: 'm020', title: '\u89d2\u7684\u5206\u7c7b', category: 'geometry', grade: '4', content: '\u9510\u89d2\u5c0f\u4e8e90\u00b0\uff0c\u76f4\u89d2\u7b49\u4e8e90\u00b0\uff0c\u949d\u89d2\u5927\u4e8e90\u00b0\u4e14\u5c0f\u4e8e180\u00b0\uff0c\u5e73\u89d2\u7b49\u4e8e180\u00b0\u3002', example: '\u4e09\u89d2\u5f62\u5185\u89d2\u548c\u662f180\u00b0' },
    { id: 'm021', title: '\u4e09\u89d2\u5f62\u5206\u7c7b', category: 'geometry', grade: '4', content: '\u6309\u89d2\u5206\uff1a\u9510\u89d2\u4e09\u89d2\u5f62\u3001\u76f4\u89d2\u4e09\u89d2\u5f62\u3001\u949d\u89d2\u4e09\u89d2\u5f62\u3002\u6309\u8fb9\u5206\uff1a\u7b49\u8fb9\u4e09\u89d2\u5f62\u3001\u7b49\u8170\u4e09\u89d2\u5f62\u3001\u4e00\u822c\u4e09\u89d2\u5f62\u3002', example: '\u7b49\u8fb9\u4e09\u89d2\u5f62\u4e09\u4e2a\u89d2\u90fd\u662f60\u00b0' },
    { id: 'm022', title: '\u5706\u7684\u8ba4\u8bc6', category: 'geometry', grade: '6', content: '\u5706\u7531\u5706\u5fc3\u3001\u534a\u5f84\u3001\u76f4\u5f84\u7ec4\u6210\u3002\u5706\u5fc3\u5230\u5706\u4e0a\u4efb\u610f\u4e00\u70b9\u7684\u8ddd\u79bb\u90fd\u76f8\u7b49\uff0c\u8fd9\u4e2a\u8ddd\u79bb\u53eb\u534a\u5f84\u3002', example: '\u534a\u5f84\u76842\u500d\u662f\u76f4\u5f84' },
    // 量与计量
    { id: 'm030', title: '\u5468\u957f\u7684\u610f\u4e49', category: 'measurement', grade: '3', content: '\u5c01\u95ed\u56fe\u5f62\u4e00\u5468\u7684\u957f\u5ea6\u53eb\u505a\u8fd9\u4e2a\u56fe\u5f62\u7684\u5468\u957f\u3002', example: '\u957f\u65b9\u5f62\u5468\u957f = (\u957f + \u5bbd) \u00d7 2' },
    { id: 'm031', title: '\u9762\u79ef\u7684\u610f\u4e49', category: 'measurement', grade: '3', content: '\u7269\u4f53\u8868\u9762\u6216\u56fe\u5f62\u6240\u5360\u5e73\u9762\u7684\u5927\u5c0f\u53eb\u505a\u9762\u79ef\u3002', example: '1\u5e73\u65b9\u5398\u7c73\u7ea6\u624b\u6307\u7532\u5927\u5c0f' },
    { id: 'm032', title: '\u4f53\u79ef\u7684\u610f\u4e49', category: 'measurement', grade: '5', content: '\u7269\u4f53\u6240\u5360\u7a7a\u95f4\u7684\u5927\u5c0f\u53eb\u505a\u4f53\u79ef\u3002', example: '1\u7acb\u65b9\u5206\u7c73\u7ea61\u5347\u6c34\u7684\u4f53\u79ef' },
    // 数学思想
    { id: 'm040', title: '\u6570\u5f62\u7ed3\u5408', category: 'thinking', grade: '4', content: '\u628a\u6570\u5b57\u548c\u56fe\u5f62\u7ed3\u5408\u8d77\u6765\u89e3\u51b3\u95ee\u9898\uff0c\u4f7f\u95ee\u9898\u66f4\u76f4\u89c2\u3002', example: '\u7528\u7ebf\u6bb5\u56fe\u8868\u793a\u8def\u7a0b\u95ee\u9898' },
    { id: 'm041', title: '\u8f6c\u5316\u601d\u60f3', category: 'thinking', grade: '3', content: '\u628a\u65b0\u95ee\u9898\u8f6c\u5316\u4e3a\u5df2\u7ecf\u89e3\u51b3\u8fc7\u7684\u65e7\u95ee\u9898\u3002', example: '\u6c42\u4e0d\u89c4\u5219\u56fe\u5f62\u9762\u79ef\u65f6\uff0c\u53ef\u4ee5\u8f6c\u5316\u4e3a\u51e0\u4e2a\u89c4\u5219\u56fe\u5f62\u7684\u548c' },
    { id: 'm042', title: '\u5206\u7c7b\u8ba8\u8bba', category: 'thinking', grade: '5', content: '\u6839\u636e\u4e0d\u540c\u60c5\u51b5\u5206\u6210\u82e5\u5e72\u7c7b\uff0c\u5206\u522b\u8ba8\u8bba\u3002', example: '\u4e09\u89d2\u5f62\u6309\u89d2\u5206\u4e3a\u9510\u89d2\u3001\u76f4\u89d2\u3001\u949d\u89d2\u4e09\u7c7b' }
  ]
}

var getBuiltinMathPractice = function() {
  return [
    { id: 'q001', type: 'addition', difficulty: 1, question: '23 + 45 = ?', answer: 68, steps: ['\u4e2a\u4f4d: 3 + 5 = 8', '\u5341\u4f4d: 2 + 4 = 6', '\u7ed3\u679c: 68'], hint: '\u5148\u7b97\u4e2a\u4f4d\uff0c\u518d\u7b97\u5341\u4f4d' },
    { id: 'q002', type: 'addition', difficulty: 1, question: '12 + 34 = ?', answer: 46, steps: ['\u4e2a\u4f4d: 2 + 4 = 6', '\u5341\u4f4d: 1 + 3 = 4', '\u7ed3\u679c: 46'], hint: '\u5148\u7b97\u4e2a\u4f4d\uff0c\u518d\u7b97\u5341\u4f4d' },
    { id: 'q003', type: 'addition', difficulty: 2, question: '156 + 278 = ?', answer: 434, steps: ['\u4e2a\u4f4d: 6 + 8 = 14\uff0c\u51994\u8fdb1', '\u5341\u4f4d: 5 + 7 + 1 = 13\uff0c\u51993\u8fdb1', '\u767e\u4f4d: 1 + 2 + 1 = 4', '\u7ed3\u679c: 434'], hint: '\u6ce8\u610f\u8fdb\u4f4d' },
    { id: 'q004', type: 'subtraction', difficulty: 1, question: '56 - 23 = ?', answer: 33, steps: ['\u4e2a\u4f4d: 6 - 3 = 3', '\u5341\u4f4d: 5 - 2 = 3', '\u7ed3\u679c: 33'], hint: '\u5148\u7b97\u4e2a\u4f4d\uff0c\u518d\u7b97\u5341\u4f4d' },
    { id: 'q005', type: 'subtraction', difficulty: 2, question: '302 - 156 = ?', answer: 146, steps: ['\u4e2a\u4f4d: 12 - 6 = 6\uff0c\u5341\u4f4d\u501f1', '\u5341\u4f4d: 9 - 5 = 4\uff0c\u767e\u4f4d\u501f1', '\u767e\u4f4d: 2 - 1 = 1', '\u7ed3\u679c: 146'], hint: '\u4e0d\u591f\u51cf\u65f6\u8981\u501f\u4f4d' },
    { id: 'q006', type: 'multiplication', difficulty: 1, question: '7 \u00d7 8 = ?', answer: 56, steps: ['7 \u00d7 8 = 56'], hint: '\u4e58\u6cd5\u53e3\u8bc0: \u4e03\u516b\u4e94\u5341\u516d' },
    { id: 'q007', type: 'multiplication', difficulty: 2, question: '12 \u00d7 3 = ?', answer: 36, steps: ['2 \u00d7 3 = 6', '10 \u00d7 3 = 30', '30 + 6 = 36'], hint: '\u53ef\u4ee5\u62c6\u5206\u6210\u6574\u5341\u6570\u548c\u4e2a\u4f4d\u6570\u5206\u522b\u4e58' },
    { id: 'q008', type: 'multiplication', difficulty: 3, question: '23 \u00d7 14 = ?', answer: 322, steps: ['23 \u00d7 4 = 92', '23 \u00d7 10 = 230', '92 + 230 = 322'], hint: '\u7528\u7ad6\u5f0f\u8ba1\u7b97\u6216\u62c6\u5206\u4e58\u6570' },
    { id: 'q009', type: 'division', difficulty: 1, question: '36 \u00f7 4 = ?', answer: 9, steps: ['36 \u00f7 4 = 9'], hint: '\u60f3\u4e58\u6cd5\u53e3\u8bc0: 4\u00d79=36' },
    { id: 'q010', type: 'division', difficulty: 2, question: '84 \u00f7 7 = ?', answer: 12, steps: ['84 \u00f7 7 = 12'], hint: '\u60f3 7\u00d712=84' },
    { id: 'q011', type: 'division', difficulty: 3, question: '156 \u00f7 12 = ?', answer: 13, steps: ['156 \u00f7 12 = 13'], hint: '\u7528\u7ad6\u5f0f\u9664\u6cd5\u6216\u60f3 12\u00d713=156' },
    { id: 'q012', type: 'fraction', difficulty: 3, question: '1/2 + 1/3 = ?', answer: '5/6', steps: ['\u901a\u5206: 1/2 = 3/6, 1/3 = 2/6', '3/6 + 2/6 = 5/6'], hint: '\u5148\u901a\u5206\u518d\u76f8\u52a0' },
    { id: 'q013', type: 'fraction', difficulty: 3, question: '3/4 - 1/2 = ?', answer: '1/4', steps: ['\u901a\u5206: 3/4 = 3/4, 1/2 = 2/4', '3/4 - 2/4 = 1/4'], hint: '\u5148\u901a\u5206\u518d\u76f8\u51cf' },
    { id: 'q014', type: 'decimal', difficulty: 2, question: '3.5 + 2.8 = ?', answer: 6.3, steps: ['\u5c0f\u6570\u70b9\u5bf9\u9f50', '5 + 8 = 13\uff0c\u51993\u8fdb1', '3 + 2 + 1 = 6', '\u7ed3\u679c: 6.3'], hint: '\u5c0f\u6570\u70b9\u8981\u5bf9\u9f50' },
    { id: 'q015', type: 'decimal', difficulty: 2, question: '5.6 - 2.9 = ?', answer: 2.7, steps: ['\u5c0f\u6570\u70b9\u5bf9\u9f50', '16 - 9 = 7\uff0c\u6574\u6570\u501f1', '4 - 2 = 2', '\u7ed3\u679c: 2.7'], hint: '\u4e0d\u591f\u51cf\u65f6\u8981\u501f\u4f4d' },
    { id: 'q016', type: 'mixed', difficulty: 3, question: '2 + 3 \u00d7 4 = ?', answer: 14, steps: ['\u5148\u7b97\u4e58\u6cd5: 3 \u00d7 4 = 12', '\u518d\u7b97\u52a0\u6cd5: 2 + 12 = 14'], hint: '\u5148\u4e58\u9664\u540e\u52a0\u51cf' },
    { id: 'q017', type: 'mixed', difficulty: 3, question: '(2 + 3) \u00d7 4 = ?', answer: 20, steps: ['\u5148\u7b97\u62ec\u53f7: 2 + 3 = 5', '\u518d\u7b97\u4e58\u6cd5: 5 \u00d7 4 = 20'], hint: '\u6709\u62ec\u53f7\u5148\u7b97\u62ec\u53f7' },
    { id: 'q018', type: 'percentage', difficulty: 3, question: '20\u768425%\u662f\u591a\u5c11\uff1f', answer: 5, steps: ['25% = 25/100 = 1/4', '20 \u00d7 1/4 = 5'], hint: '\u767e\u5206\u6570\u8f6c\u5316\u4e3a\u5206\u6570\u518d\u8ba1\u7b97' },
    { id: 'q019', type: 'percentage', difficulty: 4, question: '\u4ece12\u523015\uff0c\u589e\u52a0\u4e86\u767e\u5206\u4e4b\u51e0\uff1f', answer: '25%', steps: ['\u589e\u52a0\u4e86: 15 - 12 = 3', '3 \u00f7 12 = 0.25 = 25%'], hint: '\u589e\u52a0\u7684\u90e8\u5206\u9664\u4ee5\u539f\u6765\u7684\u6570' },
    { id: 'q020', type: 'geometry', difficulty: 2, question: '\u957f\u65b9\u5f62\u957f5\u5398\u7c73\uff0c\u5bbd3\u5398\u7c73\uff0c\u9762\u79ef\u662f\u591a\u5c11\uff1f', answer: 15, steps: ['\u9762\u79ef = \u957f \u00d7 \u5bbd', '5 \u00d7 3 = 15\u5e73\u65b9\u5398\u7c73'], hint: '\u957f\u65b9\u5f62\u9762\u79ef = \u957f \u00d7 \u5bbd' },
    { id: 'q021', type: 'geometry', difficulty: 3, question: '\u4e09\u89d2\u5f62\u5e958\u5398\u7c73\uff0c\u9ad85\u5398\u7c73\uff0c\u9762\u79ef\u662f\u591a\u5c11\uff1f', answer: 20, steps: ['\u9762\u79ef = \u5e95 \u00d7 \u9ad8 \u00f7 2', '8 \u00d7 5 \u00f7 2 = 20\u5e73\u65b9\u5398\u7c73'], hint: '\u4e09\u89d2\u5f62\u9762\u79ef = \u5e95 \u00d7 \u9ad8 \u00f7 2' },
    { id: 'q022', type: 'word_problem', difficulty: 2, question: '\u5c0f\u660e\u67095\u4e2a\u82f9\u679c\uff0c\u5403\u4e862\u4e2a\uff0c\u8fd8\u5269\u51e0\u4e2a\uff1f', answer: 3, steps: ['5 - 2 = 3', '\u8fd8\u52693\u4e2a\u82f9\u679c'], hint: '\u7528\u51cf\u6cd5\u8ba1\u7b97' },
    { id: 'q023', type: 'word_problem', difficulty: 3, question: '\u4e703\u652f\u7b14\uff0c\u6bcf\u652f2\u5143\uff0c\u4ed810\u5143\u627e\u56de\u591a\u5c11\uff1f', answer: 4, steps: ['3 \u00d7 2 = 6\u5143', '10 - 6 = 4\u5143', '\u627e\u56de4\u5143'], hint: '\u5148\u7b97\u603b\u4ef7\uff0c\u518d\u7b97\u627e\u96f6' },
    { id: 'q024', type: 'word_problem', difficulty: 4, question: '\u4e00\u6839\u7ef3\u5b503\u7c73\uff0c\u7528\u53bb1/3\uff0c\u8fd8\u5269\u591a\u5c11\u7c73\uff1f', answer: 2, steps: ['3 \u00d7 1/3 = 1\u7c73', '3 - 1 = 2\u7c73', '\u8fd8\u52692\u7c73'], hint: '\u5148\u7b97\u7528\u53bb\u591a\u5c11\uff0c\u518d\u7b97\u5269\u591a\u5c11' }
  ]
}

var loadCardsData = function(level) { return getBuiltinCards() }
var loadAllCards = function() { if (!cachedData.cards) cachedData.cards = getBuiltinCards(); return cachedData.cards }
var loadCardsByCategory = function(category) { return loadAllCards().filter(function(c) { return c.category === category }) }
var loadCardsByLevel = function(level) { return loadAllCards().filter(function(c) { return c.level === level }) }
var loadPoemsData = function(dynasty) { return getBuiltinPoems() }
var loadEnglishData = function(level) { return getBuiltinEnglish() }
var loadAllEnglish = function() { if (!cachedData.english) cachedData.english = getBuiltinEnglish(); return cachedData.english }

// P1-12：公式/概念列表委托 modules-data 同源数据（详情页同源，id 互通，
// 点条目不再打开错误的第 1 条）；内置 f001/m001 兜底废弃不再使用
var loadMathFormulas = function(category) {
  var items = modulesData.loadModuleData('math-formulas').items
  if (category) return items.filter(function(f) { return f.category === category })
  return items
}

var loadMathConcepts = function(category) {
  var items = modulesData.loadModuleData('math-concepts').items
  if (category) return items.filter(function(c) { return c.category === category })
  return items
}

var loadMathPractice = function(type, difficulty) {
  if (!cachedData.math.practice) { try { cachedData.math.practice = require('../data/math/practice/index.js') } catch (e) { cachedData.math.practice = getBuiltinMathPractice() } }
  var filtered = cachedData.math.practice
  if (type) filtered = filtered.filter(function(q) { return q.type === type })
  if (difficulty) filtered = filtered.filter(function(q) { return q.difficulty === difficulty })
  return filtered
}

var getProgress = function() { return childStorage.get('learnProgress') || {} }

var getModuleProgress = function(module) {
  var progress = getProgress()
  return Object.keys(progress[module] || {}).length
}

var markAsLearned = function(module, itemId) {
  var progress = getProgress()
  if (!progress[module]) progress[module] = {}
  if (!progress[module][itemId]) {
    progress[module][itemId] = { learnedAt: new Date().toISOString(), reviewCount: 0 }
    childStorage.set('learnProgress', progress)
    // P1-13：写入学习日志，激活 stats 连续天数与 history 页（此前 addLearnLog 零调用）
    learnProgress.addLearnLog(module, itemId, 'learn')
    // F2：与 modules-data 版本对齐——进度上云，否则这批科目换设备丢进度
    cloud.uploadLearnProgress(progress).catch(function(err) {
      console.warn('学习进度同步失败:', err)
    })
  }
  return progress[module][itemId]
}

var isLearned = function(module, itemId) {
  var progress = getProgress()
  return !!(progress[module] && progress[module][itemId])
}

module.exports = {
  loadCardsData: loadCardsData,
  loadAllCards: loadAllCards,
  loadCardsByCategory: loadCardsByCategory,
  loadCardsByLevel: loadCardsByLevel,
  getBuiltinCards: getBuiltinCards,
  loadPoemsData: loadPoemsData,
  getBuiltinPoems: getBuiltinPoems,
  loadEnglishData: loadEnglishData,
  loadAllEnglish: loadAllEnglish,
  getBuiltinEnglish: getBuiltinEnglish,
  loadMathFormulas: loadMathFormulas,
  loadMathConcepts: loadMathConcepts,
  loadMathPractice: loadMathPractice,
  getProgress: getProgress,
  getModuleProgress: getModuleProgress,
  markAsLearned: markAsLearned,
  isLearned: isLearned
}
