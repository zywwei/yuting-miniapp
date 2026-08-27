/**
 * C2 修复配套：英语词库 id 重排（e001-e640 连续唯一）后的存量学习进度迁移
 *
 * 旧布局存在跨 level 的 id 重叠（240 个冲突 id 无法从进度数据归因其真实单词），
 * 按"宁丢勿错"原则丢弃；唯一归属的 80 条按下方映射迁移；
 * e001-e080 新旧同号，直接保留；非单词 id（字母 l01-l26）不在重排范围，原样保留。
 *
 * 完成标志 englishMigrateV2Flag 按孩子隔离（childStorage 白名单），
 * 确保多孩家庭每个孩子各自迁移一次、互不干扰。
 */
var childStorage = require('./child-storage.js')
var cloud = require('./cloud.js')

var DONE_FLAG = 'englishMigrateV2Flag'

// 旧 id -> 新 id（仅唯一归属条目）
// P1 修复（宁丢勿错）：原第一段 e151-e160 与补丁段 e074-e080 的映射已移除——
// 无法区分一条存量进度究竟来自旧布局还是新布局（新布局下学过 e151=Rice 的
// 用户会被错迁成 Big），错挂进度比丢失进度危害更大。这两段 id 现在直接
// dropped；e001-e073 新旧同词可安全保留。
var MAP = {
  'e331':'e571','e332':'e572',
  'e333':'e573','e334':'e574','e335':'e575','e336':'e576',
  'e337':'e577','e338':'e578','e339':'e579','e340':'e580',
  'e341':'e581','e342':'e582','e343':'e583','e344':'e584',
  'e345':'e585','e346':'e586','e347':'e587','e348':'e588',
  'e349':'e589','e350':'e590','e351':'e591','e352':'e592',
  'e353':'e593','e354':'e594','e355':'e595','e356':'e596',
  'e357':'e597','e358':'e598','e359':'e599','e360':'e600',
  'e361':'e601','e362':'e602','e363':'e603','e364':'e604',
  'e365':'e605','e366':'e606','e367':'e607','e368':'e608',
  'e369':'e609','e370':'e610','e371':'e611','e372':'e612',
  'e373':'e613','e374':'e614','e375':'e615','e376':'e616',
  'e377':'e617','e378':'e618','e379':'e619','e380':'e620',
  'e381':'e621','e382':'e622','e383':'e623','e384':'e624',
  'e385':'e625','e386':'e626','e387':'e627','e388':'e628',
  'e389':'e629','e390':'e630','e391':'e631','e392':'e632',
  'e393':'e633','e394':'e634','e395':'e635','e396':'e636',
  'e397':'e637','e398':'e638','e399':'e639','e400':'e640'
}

function migrate() {
  if (childStorage.get(DONE_FLAG)) {
    // P1 修复（C-1）：已完成迁移的设备将文档级标记补写入本地与云端，使
    // learnProgress 自身携带「已迁移」身份随云同步传播——否则其他设备
    // fetch 到该文档后仅凭独立 DONE_FLAG 无法识别，仍会误跑迁移损毁数据。
    // P1 修复（P2-1 防洗白）：补写前必须验证数据带新布局特征（存在 >400 的
    // id）——本地标记缺失通常意味着文档被旧版本客户端的旧布局写入经 fetch
    // 回滚覆盖（乐观锁判云端较新），无条件盖章会把旧布局数据「洗白」为已
    // 迁移，e074-e400 的错位进度在全端永久固化、迁移通道永久关闭
    var lp0 = childStorage.get('learnProgress') || {}
    var eng0 = lp0.english
    if (eng0 && typeof eng0 === 'object' && lp0.migratedLayoutV2 !== true) {
      var looksMigrated0 = Object.keys(eng0).some(function (id) {
        var n = parseInt(String(id).replace(/^e/, ''), 10)
        return n > 400
      })
      if (looksMigrated0) {
        lp0.migratedLayoutV2 = true
        childStorage.set('learnProgress', lp0)
        if (cloud.isCloudReady()) {
          cloud.uploadLearnProgress(lp0).catch(function (err) {
            console.warn('[english-migrate] 标记补写上云失败:', err)
          })
        } else {
          cloud.queueSingletonUpload('learnProgress', lp0)
        }
      } else {
        console.warn('[english-migrate] 本地进度缺迁移标记且无新布局特征，疑似被旧版本客户端写入回滚，跳过标记补写')
      }
    }
    return
  }

  var learnProgress = childStorage.get('learnProgress') || {}

  // P1 修复（C-1）：云端下发的进度自带文档级标记 = 已完成迁移的权威状态，
  // 同步本地标志并早退——堵住「fetch 新布局覆盖本地后 migrate 把合法新 id
  // 当旧布局处理」（新词库 L1/L2/L3 前段共 400 个合法 id 均 ≤400，
  // looksMigrated 的 n>400 特征无法识别这批用户）
  if (learnProgress.migratedLayoutV2 === true) {
    childStorage.set(DONE_FLAG, true)
    return
  }

  var eng = learnProgress.english
  if (!eng || typeof eng !== 'object' || Object.keys(eng).length === 0) {
    // 无存量进度也要打标，避免日后首次学习前重复进入本流程
    childStorage.set(DONE_FLAG, true)
    return
  }

  // 防御：若已含新布局特征（编号 > 400 不存在于旧布局），说明迁移已完成
  var looksMigrated = Object.keys(eng).some(function (id) {
    var n = parseInt(String(id).replace(/^e/, ''), 10)
    return n > 400
  })
  if (looksMigrated) {
    childStorage.set(DONE_FLAG, true)
    return
  }

  var migrated = {}
  var kept = 0
  var dropped = 0
  Object.keys(eng).forEach(function (oldId) {
    var value = eng[oldId]
    if (!value) return
    if (Object.prototype.hasOwnProperty.call(MAP, oldId)) {
      migrated[MAP[oldId]] = value
      kept++
      return
    }
    var idStr = String(oldId)
    if (/^e\d+$/.test(idStr)) {
      // 仅单词 id 参与新旧布局映射
      // P1 修复记录：原「e001-e080 新旧同号」前提不成立——旧 L1 自然段仅 6 词，
      // 新库在该段插入 Grass/Sky/Rain/Snow/Wind/Cloud/River 并把 Water 移到食物段，
      // 旧 e074-e080（Water/Book/Ball/Kite/Cake/Milk/Egg）与新同号词完全不同。
      // 同号保留收窄为 e001-e073；e074-e080 与 e151-e160 在新旧两代布局中
      // 语义二义、无法从进度数据归因其真实单词，按「宁丢勿错」一并 dropped
      //（见文件头注释，MAP 中不设映射即自动落入下方 dropped 分支）。
      var n = parseInt(idStr.replace(/^e/, ''), 10)
      if (n >= 1 && n <= 73) {
        migrated[oldId] = value
        kept++
      } else {
        dropped++
      }
    } else {
      // 非单词 id（如字母 l01-l26）不在重排范围，原样保留
      migrated[oldId] = value
      kept++
    }
  })

  learnProgress.english = migrated
  // C-1：文档级标记随云同步传播，他端 fetch 后凭此跳过迁移
  learnProgress.migratedLayoutV2 = true
  childStorage.set('learnProgress', learnProgress)
  childStorage.set(DONE_FLAG, true)
  console.log('[english-migrate] kept=' + kept + ' dropped=' + dropped)

  // 迁移结果整体上云，多端收敛。
  // P1 修复：upload 在云未就绪（isCloudReady 为 false）时直接 return 不入队——
  // 离线首启迁移后 DONE_FLAG 已打标，云端仍是旧布局，联网后下次 fetch 会按
  // 乐观锁用云端旧文档回滚本地迁移结果且不会重迁。云未就绪时显式入 syncQueue，
  // 联网后由 flush 调 upsertSingleton 补推（upload 自身在云就绪但调用失败时
  // 已自动入队，无需重复处理）
  if (cloud.isCloudReady()) {
    cloud.uploadLearnProgress(learnProgress).catch(function (err) {
      console.warn('[english-migrate] 进度云同步失败:', err)
    })
  } else {
    cloud.queueSingletonUpload('learnProgress', learnProgress)
  }
}

module.exports = {
  migrate: migrate
}
