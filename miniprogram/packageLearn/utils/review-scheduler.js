/**
 * 复习调度器
 * 基于艾宾浩斯遗忘曲线安排复习
 */

var childStorage = require('../../utils/child-storage.js')

// 复习间隔（小时）
var REVIEW_INTERVALS = [1, 24, 72, 168, 336, 720]

/**
 * 获取下次复习时间
 * @param {number} reviewCount - 已复习次数
 * @param {string} lastReview - 上次复习时间
 */
var getNextReviewTime = function(reviewCount, lastReview) {
  var interval = REVIEW_INTERVALS[Math.min(reviewCount, REVIEW_INTERVALS.length - 1)]
  var nextReview = new Date(lastReview)
  nextReview.setHours(nextReview.getHours() + interval)
  return nextReview.toISOString()
}

/**
 * 检查是否需要复习
 * @param {object} progress - 学习进度
 * @param {string} itemId - 学习项ID
 */
var needsReview = function(progress, itemId) {
  if (!progress || !progress[itemId]) return false
  if (!progress[itemId].nextReview) return true
  return new Date(progress[itemId].nextReview) <= new Date()
}

/**
 * 标记已复习
 * @param {string} module - 模块名称
 * @param {string} itemId - 学习项ID
 */
var markReviewed = function(module, itemId) {
  var learnProgress = childStorage.get('learnProgress') || {}
  if (!learnProgress[module] || !learnProgress[module][itemId]) return false
  
  var item = learnProgress[module][itemId]
  item.reviewCount = (item.reviewCount || 0) + 1
  item.lastReview = new Date().toISOString()
  item.nextReview = getNextReviewTime(item.reviewCount, item.lastReview)
  
  childStorage.set('learnProgress', learnProgress)
  return true
}

module.exports = {
  getNextReviewTime: getNextReviewTime,
  needsReview: needsReview,
  markReviewed: markReviewed,
  REVIEW_INTERVALS: REVIEW_INTERVALS
}
