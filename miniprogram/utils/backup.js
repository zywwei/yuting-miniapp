/**
 * 数据备份与恢复工具（版本3）
 * 支持家庭角色系统、摆摊模块的数据结构
 */

var util = require('./util.js')
var auth = require('./auth.js')
var childStorage = require('./child-storage.js')

var STORAGE_KEYS = childStorage.CHILD_KEYS

function exportAllData() {
  return new Promise(function(resolve, reject) {
    try {
      var member = auth.getMember()
      var family = auth.getFamily()
      var children = auth.getChildren()

      var backupData = {
        version: 3,
        exportTime: new Date().toISOString(),
        deviceInfo: {
          platform: wx.getSystemInfoSync().platform,
          model: wx.getSystemInfoSync().model
        },
        family: family || null,
        member: member || null,
        children: children || [],
        storage: {},
        images: []
      }

      STORAGE_KEYS.forEach(function(key) {
        var value = childStorage.get(key)
        if (value !== '' && value !== undefined && value !== null) {
          backupData.storage[key] = value
        }
      })

      var imagePaths = collectImagePaths(backupData.storage)

      var failedImages = []
      var imagePromises = imagePaths.map(function(imgPath) {
        return imageToBase64(imgPath).then(function(base64) {
          return { path: imgPath, base64: base64 }
        }).catch(function(err) {
          console.warn('图片转换失败:', imgPath, err)
          failedImages.push(imgPath)
          return null
        })
      })

      Promise.all(imagePromises).then(function(images) {
        backupData.images = images.filter(function(img) { return img !== null })
        if (failedImages.length > 0) {
          backupData._failedImages = failedImages
        }
        resolve(backupData)
      })
    } catch (err) {
      reject(err)
    }
  })
}

function importAllData(backupData) {
  return new Promise(function(resolve, reject) {
    try {
      if (!backupData || !backupData.version) {
        reject(new Error('无效的备份文件'))
        return
      }

      // 支持版本1、2、3
      if (backupData.version < 1 || backupData.version > 3) {
        reject(new Error('不支持此备份版本'))
        return
      }

      if (backupData.storage && typeof backupData.storage !== 'object') {
        reject(new Error('备份文件数据格式错误'))
        return
      }
      if (backupData.images && !Array.isArray(backupData.images)) {
        reject(new Error('备份文件图片数据格式错误'))
        return
      }

      var result = {
        importedKeys: 0,
        importedImages: 0,
        errors: []
      }

      var imagePromises = (backupData.images || []).map(function(img) {
        return base64ToImage(img.base64, img.path).then(function(savedPath) {
          result.importedImages++
          return { originalPath: img.path, savedPath: savedPath }
        }).catch(function(err) {
          result.errors.push('图片恢复失败: ' + img.path + ' (' + (err.message || '未知错误') + ')')
          return null
        })
      })

      Promise.all(imagePromises).then(function(imageMappings) {
        var pathMap = {}
        imageMappings.forEach(function(mapping) {
          if (mapping) {
            pathMap[mapping.originalPath] = mapping.savedPath
          }
        })

        Object.keys(backupData.storage).forEach(function(key) {
          try {
            var value = backupData.storage[key]
            var replaced = replaceImagePaths(value, pathMap)
            childStorage.set(key, replaced)
            result.importedKeys++
          } catch (err) {
            result.errors.push('恢复 ' + key + ' 失败: ' + err.message)
          }
        })

        // 恢复家庭信息（版本2+）
        if (backupData.version >= 2) {
          if (backupData.family) {
            auth.setFamily(backupData.family)
          }
          if (backupData.member) {
            auth.setMember(backupData.member)
          }
          if (backupData.children && backupData.children.length > 0) {
            auth.setChildren(backupData.children)
            if (!auth.getCurrentChildId()) {
              auth.switchChild(backupData.children[0].childId)
            }
          }
        }

        resolve(result)
      }).catch(function(err) {
        reject(err)
      })
    } catch (err) {
      reject(err)
    }
  })
}

function saveBackupToFile(backupData) {
  return new Promise(function(resolve, reject) {
    try {
      var fs = wx.getFileSystemManager()
      var fileName = 'backup_' + util.formatDate(new Date()).replace(/[:\s]/g, '-') + '.json'
      var filePath = wx.env.USER_DATA_PATH + '/' + fileName

      var jsonData = JSON.stringify(backupData)

      fs.writeFile({
        filePath: filePath,
        data: jsonData,
        encoding: 'utf8',
        success: function() {
          resolve(filePath)
        },
        fail: function(err) {
          reject(err)
        }
      })
    } catch (err) {
      reject(err)
    }
  })
}

function loadBackupFromFile(filePath) {
  return new Promise(function(resolve, reject) {
    try {
      var fs = wx.getFileSystemManager()

      fs.readFile({
        filePath: filePath,
        encoding: 'utf8',
        success: function(res) {
          try {
            var data = JSON.parse(res.data)
            resolve(data)
          } catch (err) {
            reject(new Error('备份文件格式错误'))
          }
        },
        fail: function(err) {
          reject(err)
        }
      })
    } catch (err) {
      reject(err)
    }
  })
}

function collectImagePaths(data) {
  var paths = []

  function findPaths(obj) {
    if (!obj || typeof obj !== 'object') return

    if (Array.isArray(obj)) {
      obj.forEach(function(item) { findPaths(item) })
    } else {
      Object.keys(obj).forEach(function(key) {
        var value = obj[key]
        if (typeof value === 'string' && isImagePath(value)) {
          paths.push(value)
        } else if (typeof value === 'object') {
          findPaths(value)
        }
      })
    }
  }

  findPaths(data)

  return paths.filter(function(path, index, self) {
    return self.indexOf(path) === index
  })
}

function isImagePath(str) {
  if (typeof str !== 'string') return false
  return str.startsWith(wx.env.USER_DATA_PATH) ||
         str.startsWith('cloud://') ||
         str.match(/\.(jpg|jpeg|png|gif|webp)$/i) !== null
}

function imageToBase64(filePath) {
  return new Promise(function(resolve, reject) {
    var fs = wx.getFileSystemManager()

    if (filePath.startsWith('cloud://')) {
      wx.cloud.downloadFile({
        fileID: filePath,
        success: function(res) {
          readFileAsBase64(res.tempFilePath, resolve, reject)
        },
        fail: reject
      })
    } else {
      readFileAsBase64(filePath, resolve, reject)
    }
  })
}

function readFileAsBase64(filePath, resolve, reject) {
  var fs = wx.getFileSystemManager()
  fs.readFile({
    filePath: filePath,
    success: function(res) {
      var base64 = wx.arrayBufferToBase64(res.data)
      resolve(base64)
    },
    fail: reject
  })
}

function base64ToImage(base64, originalPath) {
  return new Promise(function(resolve, reject) {
    try {
      var fs = wx.getFileSystemManager()
      var ext = getExtensionFromPath(originalPath) || 'jpg'
      var fileName = 'restored_' + Date.now() + '_' + Math.random().toString(36).substr(2, 6) + '.' + ext
      var filePath = wx.env.USER_DATA_PATH + '/' + fileName

      var arrayBuffer = wx.base64ToArrayBuffer(base64)

      fs.writeFile({
        filePath: filePath,
        data: arrayBuffer,
        success: function() {
          resolve(filePath)
        },
        fail: reject
      })
    } catch (err) {
      reject(err)
    }
  })
}

function getExtensionFromPath(path) {
  if (!path) return 'jpg'
  var match = path.match(/\.([a-zA-Z0-9]+)$/)
  return match ? match[1].toLowerCase() : 'jpg'
}

function replaceImagePaths(obj, pathMap) {
  if (!obj || typeof obj !== 'object') return obj

  if (Array.isArray(obj)) {
    return obj.map(function(item) { return replaceImagePaths(item, pathMap) })
  }

  var result = {}
  Object.keys(obj).forEach(function(key) {
    var value = obj[key]
    if (typeof value === 'string' && pathMap[value]) {
      result[key] = pathMap[value]
    } else if (typeof value === 'object') {
      result[key] = replaceImagePaths(value, pathMap)
    } else {
      result[key] = value
    }
  })
  return result
}

function getBackupSize(backupData) {
  var jsonStr = JSON.stringify(backupData)
  var bytes = jsonStr.length * 2
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

module.exports = {
  exportAllData: exportAllData,
  importAllData: importAllData,
  saveBackupToFile: saveBackupToFile,
  loadBackupFromFile: loadBackupFromFile,
  getBackupSize: getBackupSize,
  STORAGE_KEYS: STORAGE_KEYS
}
