var stallManager = require('../../../../utils/stall-manager.js')

Page({
  data: {
    id: '',
    name: '',
    imagePath: '',
    category: '',
    costPrice: '',
    salePrice: '',
    quantity: '',
    description: '',
    categories: [],
    profitRate: 0,
    uploading: false
  },

  onLoad: function(options) {
    this.setData({ categories: stallManager.getCategories() })
    if (options.id) {
      this.setData({ id: options.id })
      this.loadProduct(options.id)
    }
  },

  loadProduct: function(id) {
    var product = stallManager.getProduct(id)
    if (product) {
      this.setData({
        name: product.name,
        imagePath: product.imagePath,
        category: product.category,
        costPrice: String(product.costPrice),
        salePrice: String(product.salePrice),
        quantity: String(product.quantity),
        description: product.description
      })
      this.calcProfitRate()
    }
  },

  onInput: function(e) {
    var field = e.currentTarget.dataset.field
    var update = {}
    update[field] = e.detail.value
    this.setData(update)
    if (field === 'costPrice' || field === 'salePrice') {
      this.calcProfitRate()
    }
  },

  selectCategory: function(e) {
    this.setData({ category: e.currentTarget.dataset.category })
  },

  chooseImage: function() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sizeType: ['compressed'],
      success: function(res) {
        var tempPath = res.tempFiles[0].tempFilePath
        this.uploadImage(tempPath)
      }.bind(this)
    })
  },

  uploadImage: function(tempPath) {
    this.setData({ uploading: true })
    wx.showLoading({ title: '上传中...' })

    if (wx.cloud) {
      var cloudPath = 'stall/products/' + Date.now() + '_' + Math.random().toString(36).substr(2, 6) + '.png'
      wx.cloud.uploadFile({
        cloudPath: cloudPath,
        filePath: tempPath,
        success: function(res) {
          this.setData({ imagePath: res.fileID })
          wx.showToast({ title: '上传成功', icon: 'success' })
        }.bind(this),
        fail: function(err) {
          console.warn('云存储上传失败，使用本地路径:', err)
          this.setData({ imagePath: tempPath })
          wx.showToast({ title: '已保存本地', icon: 'none' })
        }.bind(this),
        complete: function() {
          this.setData({ uploading: false })
          wx.hideLoading()
        }.bind(this)
      })
    } else {
      // 无云环境，直接用临时路径
      this.setData({ imagePath: tempPath, uploading: false })
      wx.hideLoading()
    }
  },

  calcProfitRate: function() {
    var cost = parseFloat(this.data.costPrice) || 0
    var sale = parseFloat(this.data.salePrice) || 0
    if (cost > 0 && sale > 0) {
      var rate = Math.round((sale - cost) / cost * 100)
      this.setData({ profitRate: rate })
    } else {
      this.setData({ profitRate: 0 })
    }
  },

  save: function() {
    var data = this.data
    if (!data.name.trim()) {
      wx.showToast({ title: '请输入商品名称', icon: 'none' })
      return
    }
    if (!data.salePrice || parseFloat(data.salePrice) <= 0) {
      wx.showToast({ title: '请输入售价', icon: 'none' })
      return
    }
    if (data.uploading) {
      wx.showToast({ title: '图片上传中', icon: 'none' })
      return
    }

    var product = {
      name: data.name.trim(),
      imagePath: data.imagePath,
      category: data.category || '其他',
      costPrice: parseFloat(data.costPrice) || 0,
      salePrice: parseFloat(data.salePrice) || 0,
      quantity: parseInt(data.quantity) || 0,
      description: data.description.trim()
    }

    if (data.id) {
      stallManager.updateProduct(data.id, product)
      wx.showToast({ title: '已更新', icon: 'success' })
    } else {
      stallManager.addProduct(product)
      wx.showToast({ title: '已添加', icon: 'success' })
    }

    setTimeout(function() {
      wx.navigateBack()
    }, 1000)
  }
})
