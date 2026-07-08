/**
 * 笔记管理工具
 * 管理成长笔记的增删改查
 * 支持云同步，离线可用
 */

var util = require('./util.js')
var cloud = require('./cloud.js')
var childStorage = require('./child-storage.js')

var getAllNotes = function() {
  return childStorage.get('notes') || []
}

var getNotes = function(limit) {
  limit = limit || 20
  var notes = getAllNotes()
  var sorted = notes.slice().sort(function(a, b) {
    return new Date(b.createTime) - new Date(a.createTime)
  })
  return sorted.slice(0, limit)
}

var getNote = function(id) {
  var notes = getAllNotes()
  return notes.find(function(n) { return n.id === id })
}

var addNote = function(note) {
  var notes = getAllNotes()
  var newNote = {
    id: util.generateId(),
    type: note.type || 'diary',
    title: note.title,
    content: note.content || '',
    mood: note.mood || 'happy',
    tags: note.tags || [],
    images: note.images || [],
    imagePath: note.imagePath || (note.images && note.images[0]) || '',
    voice: note.voice || '',
    visibility: note.visibility || 'family',
    visibleTo: note.visibleTo || [],
    createTime: new Date().toISOString(),
    updateTime: null,
    createdBy: note.createdBy || '',
    createdByName: note.createdByName || ''
  }
  notes.unshift(newNote)
  childStorage.set('notes', notes)

  cloud.uploadNote(newNote).catch(function() {})

  return newNote
}

var updateNote = function(id, updates) {
  var notes = getAllNotes()
  var index = -1
  for (var i = 0; i < notes.length; i++) {
    if (notes[i].id === id) {
      index = i
      break
    }
  }
  if (index !== -1) {
    var updated = {}
    for (var key in notes[index]) {
      updated[key] = notes[index][key]
    }
    for (var key in updates) {
      updated[key] = updates[key]
    }
    updated.updateTime = new Date().toISOString()
    notes[index] = updated
    childStorage.set('notes', notes)

    cloud.updateNoteInCloud(id, updated).catch(function() {})

    return notes[index]
  }
  return null
}

var deleteNote = async function(id) {
  var notes = getAllNotes()
  var filtered = notes.filter(function(n) { return n.id !== id })
  childStorage.set('notes', filtered)

  try {
    await cloud.removeNote(id)
    return { success: true }
  } catch (err) {
    console.warn('删除笔记失败:', err)
    return { success: false, error: err }
  }
}

var getNotesByTag = function(tag) {
  var notes = getAllNotes()
  return notes.filter(function(n) {
    return n.tags && n.tags.indexOf(tag) !== -1
  })
}

var getAllTags = function() {
  var notes = getAllNotes()
  var tagSet = {}
  notes.forEach(function(n) {
    if (n.tags) {
      n.tags.forEach(function(t) { tagSet[t] = true })
    }
  })
  return Object.keys(tagSet)
}

var searchNotes = function(options, notesList) {
  var notes = notesList || getAllNotes()
  
  // 支持简单关键词搜索（向后兼容）
  if (typeof options === 'string') {
    var keyword = options.toLowerCase()
    return notes.filter(function(n) {
      return (n.title && n.title.toLowerCase().indexOf(keyword) !== -1) ||
             (n.content && n.content.toLowerCase().indexOf(keyword) !== -1)
    })
  }
  
  // 支持高级搜索
  var keyword = (options.keyword || '').toLowerCase()
  var startDate = options.startDate || ''
  var endDate = options.endDate || ''
  var type = options.type || 'all'
  var tag = options.tag || ''
  var sortOrder = options.sortOrder || 'desc'
  
  var filtered = notes.filter(function(n) {
    // 关键词匹配（标题+内容+标签）
    var keywordMatch = !keyword || 
      (n.title && n.title.toLowerCase().indexOf(keyword) >= 0) ||
      (n.content && n.content.toLowerCase().indexOf(keyword) >= 0) ||
      (n.tags && n.tags.some(function(t) { return t.toLowerCase().indexOf(keyword) >= 0 }))
    
    // 时间范围匹配
    var dateMatch = true
    if (startDate || endDate) {
      var noteDate = new Date(n.createTime)
      if (startDate) dateMatch = dateMatch && noteDate >= new Date(startDate)
      if (endDate) dateMatch = dateMatch && noteDate <= new Date(endDate + 'T23:59:59')
    }
    
    // 类型匹配
    var typeMatch = type === 'all' || n.type === type
    
    // 标签匹配
    var tagMatch = !tag || (n.tags && n.tags.indexOf(tag) >= 0)
    
    return keywordMatch && dateMatch && typeMatch && tagMatch
  })
  
  // 排序
  filtered.sort(function(a, b) {
    var timeA = new Date(a.createTime).getTime()
    var timeB = new Date(b.createTime).getTime()
    return sortOrder === 'desc' ? timeB - timeA : timeA - timeB
  })
  
  return filtered
}

module.exports = {
  getAllNotes: getAllNotes,
  getNotes: getNotes,
  getNote: getNote,
  addNote: addNote,
  updateNote: updateNote,
  deleteNote: deleteNote,
  getNotesByTag: getNotesByTag,
  getAllTags: getAllTags,
  searchNotes: searchNotes
}
