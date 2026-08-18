# 刷牙暴击无攻击喝声问题分析文档

## 1. 问题描述

刷牙战斗过程中触发暴击时，界面上会显示喝声文字（如"烈焰风暴！""银河爆裂！"），但**没有任何声音播放**，仅有视觉气泡，缺少声音反馈。

## 2. 现象

- 暴击时屏幕出现喝声文字气泡（视觉正常）
- 扬声器无任何"喝声"类音频输出
- 其他音效（滴答、区域切换、完成）均正常

## 3. 原因分析

攻击喝声功能**从未实现声音播放逻辑，只是视觉文字气泡**，并非播放失败。

代码链路如下：

1. **喝声文字生成**：`packageHabits/pages/habits/brushing-timer/battle-manager.js:102`
   ```js
   const attackCry = isCritical ? (skin.critCry || '暴击！') : (skin.attackCry || '嘿！')
   ```
   暴击时取皮肤专属文案（`constants.js` 中 `critCry`，如"烈焰风暴！"），非暴击取 `attackCry`。

2. **仅 setData 传文字**：`battle-manager.js:163-164` 仅将 `showAttackCry: true` 与 `attackCryText` 写入页面数据，**没有调用任何音频播放**。

3. **WXML 仅渲染文字**：`brushing-timer.wxml:234-235`
   ```xml
   <view wx:if="{{showAttackCry}}" class="attack-cry {{isCritical ? 'attack-cry-crit' : ''}}">
     <text>{{attackCryText}}</text>
   </view>
   ```
   只是文字气泡展示，无音频组件。

4. **页面现有声音调用**：`brushing-timer.js` 中仅使用了 `beep.playBeep('start'/'tick'/'countdown'/'areaChange'/'complete')` 这几种预定义合成音效，全项目搜不到任何"喝声"音效或播放调用。

5. **TTS 未接入**：项目已有现成的 TTS 朗读工具 `miniprogram/utils/speak.js`（`speak.speak(text)`，学习模块、AI 聊天均在使用），但刷牙计时器页面从未 require 或调用它。

**结论**：喝声相关代码（`attackCryText`、`showAttackCry`、`attackCry-crit` 样式）是纯视觉设计，声音通道从未接通。

## 4. 现有基础设施

| 模块 | 位置 | 说明 |
| ---- | ---- | ---- |
| `beep.js` | 主包 `miniprogram/utils/` | 运行时用代码合成 WAV 写入用户目录，预创建播放器，`playBeep()` 内置 `audio.enabled` 开关检查，零延迟、离线可用 |
| `audio.js` | 主包 `miniprogram/utils/` | 全局音频开关管理 |
| `speak.js` | 主包 `miniprogram/utils/` | TTS 语音合成（Edge TTS / 百度 TTS / 大模型 TTS），有网络延迟 |

## 5. 建议方案

### 方案一（推荐）：beep.js 新增合成暴击音效

- 参照 `rpsShoot`（出拳声，短促扫频）或 `planeKnock`（碰撞声，低频下滑）的写法，在 `beep.js` 的 `init()` 中新增一个音效（如低频 200→100Hz 下滑 + 高频闪光叠加），模拟"哈！"的气势感
- 在 `battle-manager.js` 的 `triggerAttack()` 中（生成 `attackCry` 处）调用 `beep.playBeep('critHit')`；普通攻击可复用现有 `rpsShoot`
- 优点：零延迟、离线可用、包体零增加、自动遵守音频开关，与现有架构完全一致
- 实现成本：`beep.js` 加一个音效定义 + `battle-manager.js` 加两行调用

### 方案二（可选增强）：接入 speak.js TTS 朗读喝声文字

- 能真正读出"烈焰风暴！"等皮肤专属文案，代入感强
- **不推荐作为主要方案**：
  - TTS 有网络延迟（1~3 秒），攻击动画仅 600ms，声音明显滞后
  - 当前逻辑每次区域完成都强制暴击（约 20 秒一次），频繁朗读会互相打断，且可能与其他朗读冲突
  - 若使用需节流：如仅间隔若干次暴击才朗读，或 setTimeout 延后播放并在下次攻击前清理

### 方案三：真实音频文件

- 因 `beep.js` 位于主包，**主包无法引用分包资源**，真实音频文件若要由 beep 统一管理只能放主包（增加主包体积，注意 2MB 上限）
- 若放 `packageHabits` 分包（刷牙页面同分包，可合法引用），需在 `brushing-timer.js` 中自行创建 `InnerAudioContext` 播放，并自行处理 `audio.enabled` 开关与 `onUnload` 销毁
- 短音效用合成音效（方案一）即可，一般无需引入真实音频文件

## 6. 补充建议

- 普通攻击（非暴击）目前基本静音，应有短音效，否则暴击音效突兀
- 敌人嘲讽（`enemy_crit_taunt`）目前也是纯文字，可加低沉"哼哼"类合成音
- 保持项目"程序化合成音"风格，不引入新音频资源

## 7. 涉及文件清单

| 文件 | 操作 |
| ---- | ---- |
| `miniprogram/utils/beep.js` | 新增合成音效定义（方案一） |
| `miniprogram/packageHabits/pages/habits/brushing-timer/battle-manager.js` | 攻击时播放音效 |
| `miniprogram/packageHabits/pages/habits/brushing-timer/brushing-timer.js` | 如需 TTS 朗读则接入 speak |
