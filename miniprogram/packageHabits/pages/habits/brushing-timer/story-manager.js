const util = getApp().globalData.util
const { getOrSelectTodayChapter } = require('./constants.js')

/**
 * 故事系统管理器
 * 负责：章节、敌人、胜利对话
 */
class StoryManager {
  constructor(page) {
    this.page = page
  }

  /**
   * 加载故事进度并设置敌人数据
   * @param {string} timeOfDay - 'morning' | 'evening'
   */
  loadProgress(timeOfDay) {
    const storyProgress = util.getStoryProgress()
    const round = storyProgress.round || 1
    const currentChapterId = storyProgress.currentChapter || 1

    const chapter = getOrSelectTodayChapter(currentChapterId, util.getTodayStr)

    // 根据早晚选择不同敌人
    const isEvening = timeOfDay === 'evening'
    const baseEnemy = isEvening && chapter.eveningEnemy ? chapter.eveningEnemy : chapter.enemy
    const enemyHpMax = chapter.isHidden ? 6 : baseEnemy.hp + (round - 1) * 3
    const enemy = { ...baseEnemy, hp: enemyHpMax }

    const enemyHp = util.getEnemyCurrentHp(enemy.id, enemy.hp)
    const hpRatio = enemyHp > 0 ? Math.max(enemyHp / enemy.hp, 0) : 0
    const enemyScale = 0.5 + hpRatio * 0.8

    this.page.setData({
      round,
      currentChapter: chapter,
      currentEnemy: enemy,
      enemyCurrentHp: enemyHp,
      isEnemyDefeated: enemyHp <= 0,
      enemyScale
    })

    return { chapter, enemy, enemyHp }
  }
}

module.exports = StoryManager
