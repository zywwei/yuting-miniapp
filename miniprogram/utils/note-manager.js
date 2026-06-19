/**
 * 笔记管理工具
 * 管理成长笔记的增删改查
 * 支持云同步，离线可用
 */

var util = require('./util.js')
var cloud = require('./cloud.js')

var getAllNotes = function() {
  return wx.getStorageSync('notes') || []
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
    voice: note.voice || '',
    createTime: new Date().toISOString()
  }
  notes.unshift(newNote)
  wx.setStorageSync('notes', notes)

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
    notes[index] = updated
    wx.setStorageSync('notes', notes)

    cloud.updateNoteInCloud(id, updated).catch(function() {})

    return notes[index]
  }
  return null
}

var deleteNote = function(id) {
  var notes = getAllNotes()
  var filtered = notes.filter(function(n) { return n.id !== id })
  wx.setStorageSync('notes', filtered)

  cloud.removeNote(id).catch(function() {})
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

var searchNotes = function(keyword) {
  var notes = getAllNotes()
  var lowerKeyword = keyword.toLowerCase()
  return notes.filter(function(n) {
    return n.title.toLowerCase().indexOf(lowerKeyword) !== -1 ||
           n.content.toLowerCase().indexOf(lowerKeyword) !== -1
  })
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
