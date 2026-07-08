// 习惯表单处理通用方法（checkin/detail 页面共用）
// 使用路径更新 setData，避免整对象过桥传输

function onFieldInput(page, e) {
  var key = e.currentTarget.dataset.key
  page.setData({ ['formData.' + key]: e.detail.value })
}

function onFieldTimeChange(page, e) {
  var key = e.currentTarget.dataset.key
  page.setData({ ['formData.' + key]: e.detail.value })
}

function onFieldCounter(page, e) {
  var key = e.currentTarget.dataset.key
  var action = e.currentTarget.dataset.action
  var field = page.data.habitFields.find(function(f) { return f.key === key })
  var value = page.data.formData[key] || 0

  if (action === 'add') {
    value = Math.min(value + 1, field.max || 99)
  } else {
    value = Math.max(value - 1, field.min || 0)
  }

  page.setData({ ['formData.' + key]: value })
}

function onFieldSelect(page, e) {
  var key = e.currentTarget.dataset.key
  var value = e.currentTarget.dataset.value
  var field = page.data.habitFields.find(function(f) { return f.key === key })

  var newData = {}
  if (field.multiple) {
    var arr = (page.data.formData[key] || []).slice()
    var index = arr.indexOf(value)
    if (index > -1) {
      arr.splice(index, 1)
    } else {
      arr.push(value)
    }
    newData['formData.' + key] = arr
  } else {
    newData['formData.' + key] = value
  }

  var selectedValues = newData['formData.' + key]
  var habitFields = page.data.habitFields.map(function(f) {
    if (f.key === key && f.options) {
      var updatedOptions = f.options.map(function(opt) {
        var isSelected = false
        if (Array.isArray(selectedValues)) {
          isSelected = selectedValues.indexOf(opt.value) > -1
        } else {
          isSelected = selectedValues === opt.value
        }
        return Object.assign({}, opt, { selected: isSelected })
      })
      return Object.assign({}, f, { options: updatedOptions })
    }
    return f
  })
  newData.habitFields = habitFields
  page.setData(newData)
}

function onFieldMood(page, e) {
  var key = e.currentTarget.dataset.key
  page.setData({ ['formData.' + key]: e.currentTarget.dataset.value })
}

module.exports = {
  onFieldInput: onFieldInput,
  onFieldTimeChange: onFieldTimeChange,
  onFieldCounter: onFieldCounter,
  onFieldSelect: onFieldSelect,
  onFieldMood: onFieldMood
}
