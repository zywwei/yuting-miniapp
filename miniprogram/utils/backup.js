/**
 * 数据备份与恢复工具
 * 支持导出所有数据（包括图片）为备份文件，以及从备份文件导入还原
 */

var util = require('./util.js')

// ===== 需要备份的 Storage Keys =====
var STORAGE_KEYS = [
  'brushingRecords',     // 刷牙记录
  'habitRecords',        // 习惯打卡记录
  'drawings',            // 画作
  'notes',               // 笔记
  'habits',              // 自定义习惯
  'achievements',        // 成就
  'brushingStory',       // 刷牙故事进度
  'brushingAvatar',      // 刷牙角色
  'toothDecorations',    // 牙齿贴纸装饰
  'totalBrushPoints',    // 刷牙积分
  'brushingReminder',    // 刷牙提醒设置
  'learnProgress',       // 学习进度（含汉字/古诗/数字/英语）
  'settings'             // 用户设置（生日、孩子姓名等）
]

/**
 * 导出所有数据
 * @returns {Promise<Object>} 备份数据对象
 */
function exportAllData() {
  return new Promise(function(resolve, reject) {
    try {
      var backupData = {
        version: 1,
        exportTime: new Date().toISOString(),
        deviceInfo: {
          platform: wx.getSystemInfoSync().platform,
          model: wx.getSystemInfoSync().model
        },
        storage: {},
        images: []
      }

      // 1. 读取所有 storage 数据
      STORAGE_KEYS.forEach(function(key) {
        var value = wx.getStorageSync(key)
        if (value !== '' && value !== undefined && value !== null) {
          backupData.storage[key] = value
        }
      })

      // 2. 收集所有图片路径
      var imagePaths = collectImagePaths(backupData.storage)

      // 3. 将图片转为 base64
      var failedImages = []
      var imagePromises = imagePaths.map(function(imgPath) {
        return imageToBase64(imgPath).then(function(base64) {
          return {
            path: imgPath,
            base64: base64
          }
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

/**
 * 导入数据
 * @param {Object} backupData - 备份数据对象
 * @returns {Promise<Object>} 导入结果
 */
function importAllData(backupData) {
  return new Promise(function(resolve, reject) {
    try {
      if (!backupData || !backupData.version) {
        reject(new Error('无效的备份文件'))
        return
      }

      // 版本兼容性检查
      if (backupData.version > 1) {
        reject(new Error('备份文件版本过高，请更新应用后再导入'))
        return
      }

      // 结构完整性校验
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

      // 1. 恢复图片（base64 转文件）
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
        // 2. 构建路径映射
        var pathMap = {}
        imageMappings.forEach(function(mapping) {
          if (mapping) {
            pathMap[mapping.originalPath] = mapping.savedPath
          }
        })

        // 3. 恢复 storage 数据（替换图片路径）
        Object.keys(backupData.storage).forEach(function(key) {
          try {
            var value = backupData.storage[key]
            var replaced = replaceImagePaths(value, pathMap)
            wx.setStorageSync(key, replaced)
            result.importedKeys++
          } catch (err) {
            result.errors.push('恢复 ' + key + ' 失败: ' + err.message)
          }
        })

        resolve(result)
      }).catch(function(err) {
        reject(err)
      })
    } catch (err) {
      reject(err)
    }
  })
}

/**
 * 将备份数据保存到文件
 * @param {Object} backupData - 备份数据
 * @returns {Promise<string>} 文件路径
 */
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

/**
 * 从文件读取备份数据
 * @param {string} filePath - 文件路径
 * @returns {Promise<Object>} 备份数据
 */
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

// ===== 内部工具函数 =====

/**
 * 收集数据中所有图片路径
 */
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

  // 去重
  return paths.filter(function(path, index, self) {
    return self.indexOf(path) === index
  })
}

/**
 * 判断是否为图片路径
 */
function isImagePath(str) {
  if (typeof str !== 'string') return false
  // 本地文件路径或云存储路径
  return str.startsWith(wx.env.USER_DATA_PATH) ||
         str.startsWith('cloud://') ||
         str.match(/\.(jpg|jpeg|png|gif|webp)$/i) !== null
}

/**
 * 图片转 base64
 */
function imageToBase64(filePath) {
  return new Promise(function(resolve, reject) {
    var fs = wx.getFileSystemManager()

    // 云存储文件需要先下载
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

/**
 * base64 转图片文件
 */
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

/**
 * 从路径获取扩展名
 */
function getExtensionFromPath(path) {
  if (!path) return 'jpg'
  var match = path.match(/\.([a-zA-Z0-9]+)$/)
  return match ? match[1].toLowerCase() : 'jpg'
}

/**
 * 递归替换对象中的图片路径
 */
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

/**
 * 获取备份文件大小（用于显示）
 */
function getBackupSize(backupData) {
  var jsonStr = JSON.stringify(backupData)
  var bytes = jsonStr.length * 2 // 粗略估算
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
