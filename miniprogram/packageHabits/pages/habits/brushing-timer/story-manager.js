const util = require('/utils/util.js')
const { CHAPTERS, HIDDEN_CHAPTERS, getOrSelectTodayChapter, STORY_DIALOGUES } = require('./constants.js')

/**
 * 故事系统管理器
 * 负责：章节、敌人、对话、胜利流程
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

  /**
   * 获取开始战斗的对话
   */
  getStartDialogues() {
    const { currentChapter, currentEnemy } = this.page.data
    return [
      { emoji: currentChapter.emoji, text: `${currentChapter.name}！`, delay: 600 },
      { emoji: currentEnemy.emoji, text: `${currentEnemy.name}出现了！`, delay: 600 },
      { emoji: '⚔️', text: '战斗开始！', delay: 600 }
    ]
  }

  /**
   * 获取战斗中的对话（根据HP状态）
   */
  getBattleDialogues() {
    const { currentEnemy, enemyCurrentHp } = this.page.data
    if (!currentEnemy) return []

    const dialogues = []
    const { BATTLE_CONFIG } = require('./constants.js')
    const enemyAngry = (enemyCurrentHp / currentEnemy.hp) < BATTLE_CONFIG.ENEMY_ANGER_THRESHOLD

    if (enemyAngry) {
      dialogues.push({ emoji: '😡', text: `${currentEnemy.name}愤怒了！`, delay: 600 })
    } else if (enemyCurrentHp < currentEnemy.hp && enemyCurrentHp > 0) {
      dialogues.push({
        emoji: currentEnemy.emoji,
        text: `${currentEnemy.name}还剩${enemyCurrentHp}点血量！`,
        delay: 600
      })
    }

    return dialogues
  }

  /**
   * 获取胜利对话
   */
  getVictoryDialogues() {
    const { currentChapter, currentEnemy, storyExpGained } = this.page.data
    return [
      { emoji: currentEnemy.emoji, text: `${currentEnemy.name}被打败了！`, delay: 600 },
      { emoji: '⭐', text: currentEnemy.defeatText || '胜利啦！', delay: 600 },
      { emoji: '🏆', text: `获得${storyExpGained}经验值！`, delay: 600 }
    ]
  }

  /**
   * 触发胜利流程
   */
  triggerVictory() {
    const { currentChapter, currentEnemy } = this.page.data

    // 标记敌人被击败
    util.defeatEnemy(currentEnemy.id, currentChapter.id)

    // 获取胜利对话
    const victoryDialogues = this.getVictoryDialogues()

    this.page.setData({
      showVictoryDialog: true,
      victoryDialogues,
      isEnemyDefeated: true
    })
  }

  /**
   * 计算击败敌人获得的经验值
   */
  calcExpGained() {
    const { currentEnemy, enemyCurrentHp } = this.page.data
    if (!currentEnemy) return 0

    const damageDealt = currentEnemy.hp - enemyCurrentHp
    const baseExp = Math.floor(damageDealt * 2)
    const bonusExp = currentEnemy.hp <= 0 ? 10 : 0
    return baseExp + bonusExp
  }
}

module.exports = StoryManager
