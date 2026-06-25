/**
 * 涂色模板数据
 * 每个模板包含用于 Canvas 绘制的路径数据
 */

// 模板定义：使用简单的形状组合来绘制线稿
const templateDrawers = {
  // 小兔子
  rabbit: (ctx, w, h) => {
    const cx = w / 2, cy = h / 2
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'

    // 身体（椭圆）
    ctx.beginPath()
    ctx.ellipse(cx, cy + 60, 80, 100, 0, 0, Math.PI * 2)
    ctx.stroke()

    // 头（圆）
    ctx.beginPath()
    ctx.arc(cx, cy - 80, 65, 0, Math.PI * 2)
    ctx.stroke()

    // 左耳
    ctx.beginPath()
    ctx.ellipse(cx - 35, cy - 180, 20, 55, -0.15, 0, Math.PI * 2)
    ctx.stroke()

    // 右耳
    ctx.beginPath()
    ctx.ellipse(cx + 35, cy - 180, 20, 55, 0.15, 0, Math.PI * 2)
    ctx.stroke()

    // 左眼
    ctx.beginPath()
    ctx.arc(cx - 22, cy - 90, 8, 0, Math.PI * 2)
    ctx.fillStyle = '#333'
    ctx.fill()

    // 右眼
    ctx.beginPath()
    ctx.arc(cx + 22, cy - 90, 8, 0, Math.PI * 2)
    ctx.fill()

    // 鼻子
    ctx.beginPath()
    ctx.moveTo(cx, cy - 70)
    ctx.lineTo(cx - 6, cy - 62)
    ctx.lineTo(cx + 6, cy - 62)
    ctx.closePath()
    ctx.fill()

    // 嘴巴
    ctx.beginPath()
    ctx.arc(cx, cy - 58, 10, 0.1, Math.PI - 0.1)
    ctx.stroke()

    // 左手
    ctx.beginPath()
    ctx.ellipse(cx - 85, cy + 30, 22, 15, -0.3, 0, Math.PI * 2)
    ctx.stroke()

    // 右手
    ctx.beginPath()
    ctx.ellipse(cx + 85, cy + 30, 22, 15, 0.3, 0, Math.PI * 2)
    ctx.stroke()

    // 左脚
    ctx.beginPath()
    ctx.ellipse(cx - 40, cy + 160, 30, 18, -0.2, 0, Math.PI * 2)
    ctx.stroke()

    // 右脚
    ctx.beginPath()
    ctx.ellipse(cx + 40, cy + 160, 30, 18, 0.2, 0, Math.PI * 2)
    ctx.stroke()

    // 尾巴
    ctx.beginPath()
    ctx.arc(cx + 75, cy + 100, 15, 0, Math.PI * 2)
    ctx.stroke()
  },

  // 小猫咪
  cat: (ctx, w, h) => {
    const cx = w / 2, cy = h / 2
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2
    ctx.lineCap = 'round'

    // 身体
    ctx.beginPath()
    ctx.ellipse(cx, cy + 50, 75, 95, 0, 0, Math.PI * 2)
    ctx.stroke()

    // 头
    ctx.beginPath()
    ctx.arc(cx, cy - 80, 65, 0, Math.PI * 2)
    ctx.stroke()

    // 左耳（三角形）
    ctx.beginPath()
    ctx.moveTo(cx - 55, cy - 120)
    ctx.lineTo(cx - 30, cy - 175)
    ctx.lineTo(cx - 10, cy - 115)
    ctx.closePath()
    ctx.stroke()

    // 右耳
    ctx.beginPath()
    ctx.moveTo(cx + 55, cy - 120)
    ctx.lineTo(cx + 30, cy - 175)
    ctx.lineTo(cx + 10, cy - 115)
    ctx.closePath()
    ctx.stroke()

    // 左眼
    ctx.beginPath()
    ctx.ellipse(cx - 22, cy - 85, 10, 12, 0, 0, Math.PI * 2)
    ctx.stroke()

    // 右眼
    ctx.beginPath()
    ctx.ellipse(cx + 22, cy - 85, 10, 12, 0, 0, Math.PI * 2)
    ctx.stroke()

    // 瞳孔
    ctx.beginPath()
    ctx.ellipse(cx - 22, cy - 85, 5, 10, 0, 0, Math.PI * 2)
    ctx.fillStyle = '#333'
    ctx.fill()
    ctx.beginPath()
    ctx.ellipse(cx + 22, cy - 85, 5, 10, 0, 0, Math.PI * 2)
    ctx.fill()

    // 鼻子
    ctx.beginPath()
    ctx.moveTo(cx, cy - 65)
    ctx.lineTo(cx - 5, cy - 58)
    ctx.lineTo(cx + 5, cy - 58)
    ctx.closePath()
    ctx.fillStyle = '#FF6B8A'
    ctx.fill()

    // 嘴巴
    ctx.beginPath()
    ctx.moveTo(cx, cy - 58)
    ctx.lineTo(cx - 12, cy - 48)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx, cy - 58)
    ctx.lineTo(cx + 12, cy - 48)
    ctx.stroke()

    // 左胡须
    ctx.beginPath()
    ctx.moveTo(cx - 15, cy - 55)
    ctx.lineTo(cx - 55, cy - 65)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx - 15, cy - 50)
    ctx.lineTo(cx - 55, cy - 50)
    ctx.stroke()

    // 右胡须
    ctx.beginPath()
    ctx.moveTo(cx + 15, cy - 55)
    ctx.lineTo(cx + 55, cy - 65)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx + 15, cy - 50)
    ctx.lineTo(cx + 55, cy - 50)
    ctx.stroke()

    // 尾巴
    ctx.beginPath()
    ctx.moveTo(cx + 70, cy + 100)
    ctx.quadraticCurveTo(cx + 130, cy + 50, cx + 110, cy - 10)
    ctx.stroke()
  },

  // 小鱼
  fish: (ctx, w, h) => {
    const cx = w / 2, cy = h / 2
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2

    // 身体（椭圆）
    ctx.beginPath()
    ctx.ellipse(cx, cy, 100, 60, 0, 0, Math.PI * 2)
    ctx.stroke()

    // 尾巴
    ctx.beginPath()
    ctx.moveTo(cx + 90, cy)
    ctx.lineTo(cx + 150, cy - 50)
    ctx.lineTo(cx + 150, cy + 50)
    ctx.closePath()
    ctx.stroke()

    // 眼睛
    ctx.beginPath()
    ctx.arc(cx - 40, cy - 15, 12, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx - 40, cy - 15, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#333'
    ctx.fill()

    // 嘴巴
    ctx.beginPath()
    ctx.arc(cx - 80, cy, 8, -0.5, 0.5)
    ctx.stroke()

    // 鱼鳍（上）
    ctx.beginPath()
    ctx.moveTo(cx - 10, cy - 55)
    ctx.quadraticCurveTo(cx, cy - 100, cx + 30, cy - 55)
    ctx.stroke()

    // 鱼鳍（下）
    ctx.beginPath()
    ctx.moveTo(cx, cy + 55)
    ctx.quadraticCurveTo(cx + 10, cy + 85, cx + 30, cy + 55)
    ctx.stroke()

    // 鳞片纹理
    for (let i = 0; i < 3; i++) {
      ctx.beginPath()
      ctx.arc(cx - 10 + i * 25, cy, 18, -1, 1)
      ctx.stroke()
    }

    // 气泡
    ctx.beginPath()
    ctx.arc(cx - 100, cy - 40, 6, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx - 115, cy - 60, 4, 0, Math.PI * 2)
    ctx.stroke()
  },

  // 向日葵
  sunflower: (ctx, w, h) => {
    const cx = w / 2, cy = h / 2 - 30
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2

    // 花瓣
    for (let i = 0; i < 12; i++) {
      const angle = (i * 30) * Math.PI / 180
      const px = cx + Math.cos(angle) * 55
      const py = cy + Math.sin(angle) * 55
      ctx.beginPath()
      ctx.ellipse(px, py, 30, 15, angle, 0, Math.PI * 2)
      ctx.stroke()
    }

    // 花芯
    ctx.beginPath()
    ctx.arc(cx, cy, 35, 0, Math.PI * 2)
    ctx.stroke()

    // 花芯网格
    ctx.beginPath()
    ctx.arc(cx, cy, 35, 0, Math.PI * 2)
    ctx.stroke()

    // 茎
    ctx.beginPath()
    ctx.moveTo(cx, cy + 35)
    ctx.lineTo(cx, cy + 200)
    ctx.lineWidth = 4
    ctx.stroke()

    // 左叶
    ctx.lineWidth = 2
    ctx.beginPath()
    ctx.moveTo(cx, cy + 100)
    ctx.quadraticCurveTo(cx - 60, cy + 80, cx - 50, cy + 130)
    ctx.quadraticCurveTo(cx - 20, cy + 110, cx, cy + 100)
    ctx.stroke()

    // 右叶
    ctx.beginPath()
    ctx.moveTo(cx, cy + 140)
    ctx.quadraticCurveTo(cx + 60, cy + 120, cx + 50, cy + 170)
    ctx.quadraticCurveTo(cx + 20, cy + 150, cx, cy + 140)
    ctx.stroke()
  },

  // 小汽车
  car: (ctx, w, h) => {
    const cx = w / 2, cy = h / 2 + 20
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2

    // 车身
    ctx.beginPath()
    ctx.roundRect(cx - 120, cy - 30, 240, 70, 10)
    ctx.stroke()

    // 车顶
    ctx.beginPath()
    ctx.moveTo(cx - 60, cy - 30)
    ctx.lineTo(cx - 40, cy - 90)
    ctx.lineTo(cx + 60, cy - 90)
    ctx.lineTo(cx + 80, cy - 30)
    ctx.stroke()

    // 车窗（前）
    ctx.beginPath()
    ctx.moveTo(cx - 35, cy - 35)
    ctx.lineTo(cx - 25, cy - 82)
    ctx.lineTo(cx + 10, cy - 82)
    ctx.lineTo(cx + 10, cy - 35)
    ctx.stroke()

    // 车窗（后）
    ctx.beginPath()
    ctx.moveTo(cx + 18, cy - 35)
    ctx.lineTo(cx + 18, cy - 82)
    ctx.lineTo(cx + 55, cy - 82)
    ctx.lineTo(cx + 72, cy - 35)
    ctx.stroke()

    // 前灯
    ctx.beginPath()
    ctx.arc(cx - 115, cy, 8, 0, Math.PI * 2)
    ctx.stroke()

    // 后灯
    ctx.beginPath()
    ctx.arc(cx + 115, cy, 8, 0, Math.PI * 2)
    ctx.stroke()

    // 左轮
    ctx.beginPath()
    ctx.arc(cx - 65, cy + 45, 22, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx - 65, cy + 45, 10, 0, Math.PI * 2)
    ctx.stroke()

    // 右轮
    ctx.beginPath()
    ctx.arc(cx + 65, cy + 45, 22, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx + 65, cy + 45, 10, 0, Math.PI * 2)
    ctx.stroke()
  },

  // 蛋糕
  cake: (ctx, w, h) => {
    const cx = w / 2, cy = h / 2 + 30
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2

    // 底层蛋糕
    ctx.beginPath()
    ctx.roundRect(cx - 100, cy, 200, 60, 8)
    ctx.stroke()

    // 中层蛋糕
    ctx.beginPath()
    ctx.roundRect(cx - 80, cy - 55, 160, 55, 8)
    ctx.stroke()

    // 奶油波浪（中层顶部）
    ctx.beginPath()
    for (let i = 0; i < 8; i++) {
      const x = cx - 80 + i * 20
      ctx.arc(x + 10, cy - 55, 10, Math.PI, 0)
    }
    ctx.stroke()

    // 顶层蛋糕
    ctx.beginPath()
    ctx.roundRect(cx - 55, cy - 100, 110, 45, 8)
    ctx.stroke()

    // 奶油波浪（顶层顶部）
    ctx.beginPath()
    for (let i = 0; i < 6; i++) {
      const x = cx - 55 + i * 18
      ctx.arc(x + 9, cy - 100, 9, Math.PI, 0)
    }
    ctx.stroke()

    // 蜡烛
    ctx.beginPath()
    ctx.roundRect(cx - 4, cy - 140, 8, 40, 2)
    ctx.stroke()

    // 火焰
    ctx.beginPath()
    ctx.moveTo(cx, cy - 140)
    ctx.quadraticCurveTo(cx + 10, cy - 160, cx, cy - 155)
    ctx.quadraticCurveTo(cx - 10, cy - 160, cx, cy - 140)
    ctx.fillStyle = '#FF8800'
    ctx.fill()
    ctx.stroke()

    // 装饰圆点
    for (let i = 0; i < 5; i++) {
      ctx.beginPath()
      ctx.arc(cx - 60 + i * 30, cy + 30, 4, 0, Math.PI * 2)
      ctx.fillStyle = '#FF6B8A'
      ctx.fill()
    }
  },

  // 蝴蝶
  butterfly: (ctx, w, h) => {
    const cx = w / 2, cy = h / 2
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2

    // 身体
    ctx.beginPath()
    ctx.ellipse(cx, cy, 8, 50, 0, 0, Math.PI * 2)
    ctx.stroke()

    // 左上翅膀
    ctx.beginPath()
    ctx.moveTo(cx - 8, cy - 20)
    ctx.quadraticCurveTo(cx - 80, cy - 80, cx - 60, cy - 10)
    ctx.quadraticCurveTo(cx - 80, cy + 30, cx - 8, cy + 10)
    ctx.stroke()

    // 右上翅膀
    ctx.beginPath()
    ctx.moveTo(cx + 8, cy - 20)
    ctx.quadraticCurveTo(cx + 80, cy - 80, cx + 60, cy - 10)
    ctx.quadraticCurveTo(cx + 80, cy + 30, cx + 8, cy + 10)
    ctx.stroke()

    // 左下翅膀
    ctx.beginPath()
    ctx.moveTo(cx - 8, cy + 10)
    ctx.quadraticCurveTo(cx - 60, cy + 50, cx - 40, cy + 70)
    ctx.quadraticCurveTo(cx - 20, cy + 50, cx - 8, cy + 30)
    ctx.stroke()

    // 右下翅膀
    ctx.beginPath()
    ctx.moveTo(cx + 8, cy + 10)
    ctx.quadraticCurveTo(cx + 60, cy + 50, cx + 40, cy + 70)
    ctx.quadraticCurveTo(cx + 20, cy + 50, cx + 8, cy + 30)
    ctx.stroke()

    // 翅膀装饰圆
    ctx.beginPath()
    ctx.arc(cx - 40, cy - 25, 12, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx + 40, cy - 25, 12, 0, Math.PI * 2)
    ctx.stroke()

    // 触角
    ctx.beginPath()
    ctx.moveTo(cx - 3, cy - 48)
    ctx.quadraticCurveTo(cx - 20, cy - 80, cx - 25, cy - 85)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx - 25, cy - 88, 4, 0, Math.PI * 2)
    ctx.stroke()

    ctx.beginPath()
    ctx.moveTo(cx + 3, cy - 48)
    ctx.quadraticCurveTo(cx + 20, cy - 80, cx + 25, cy - 85)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx + 25, cy - 88, 4, 0, Math.PI * 2)
    ctx.stroke()
  },

  // 星星
  star: (ctx, w, h) => {
    const cx = w / 2, cy = h / 2
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2

    // 大星星
    const drawStar = (x, y, r, points) => {
      ctx.beginPath()
      for (let i = 0; i < points * 2; i++) {
        const radius = i % 2 === 0 ? r : r * 0.4
        const angle = (i * Math.PI / points) - Math.PI / 2
        const px = x + Math.cos(angle) * radius
        const py = y + Math.sin(angle) * radius
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
    }

    drawStar(cx, cy, 100, 5)

    // 小星星装饰
    drawStar(cx - 100, cy - 100, 30, 5)
    drawStar(cx + 110, cy - 80, 25, 5)
    drawStar(cx - 90, cy + 110, 20, 5)
    drawStar(cx + 100, cy + 100, 22, 5)

    // 中心笑脸
    ctx.beginPath()
    ctx.arc(cx - 20, cy - 15, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#333'
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx + 20, cy - 15, 6, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(cx, cy + 10, 25, 0.2, Math.PI - 0.2)
    ctx.stroke()
  },

  // 火箭
  rocket: (ctx, w, h) => {
    const cx = w / 2, cy = h / 2
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2

    // 火箭主体
    ctx.beginPath()
    ctx.moveTo(cx, cy - 120)
    ctx.quadraticCurveTo(cx + 50, cy - 80, cx + 40, cy + 40)
    ctx.lineTo(cx - 40, cy + 40)
    ctx.quadraticCurveTo(cx - 50, cy - 80, cx, cy - 120)
    ctx.stroke()

    // 火箭头（尖端）
    ctx.beginPath()
    ctx.moveTo(cx, cy - 120)
    ctx.lineTo(cx - 15, cy - 95)
    ctx.lineTo(cx + 15, cy - 95)
    ctx.closePath()
    ctx.stroke()

    // 窗户
    ctx.beginPath()
    ctx.arc(cx, cy - 40, 20, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx, cy - 40, 12, 0, Math.PI * 2)
    ctx.stroke()

    // 左翼
    ctx.beginPath()
    ctx.moveTo(cx - 40, cy + 10)
    ctx.lineTo(cx - 70, cy + 60)
    ctx.lineTo(cx - 40, cy + 50)
    ctx.stroke()

    // 右翼
    ctx.beginPath()
    ctx.moveTo(cx + 40, cy + 10)
    ctx.lineTo(cx + 70, cy + 60)
    ctx.lineTo(cx + 40, cy + 50)
    ctx.stroke()

    // 尾翼（中间）
    ctx.beginPath()
    ctx.moveTo(cx - 10, cy + 40)
    ctx.lineTo(cx, cy + 70)
    ctx.lineTo(cx + 10, cy + 40)
    ctx.stroke()

    // 火焰
    ctx.beginPath()
    ctx.moveTo(cx - 20, cy + 40)
    ctx.quadraticCurveTo(cx - 15, cy + 80, cx, cy + 100)
    ctx.quadraticCurveTo(cx + 15, cy + 80, cx + 20, cy + 40)
    ctx.stroke()

    // 火焰内层
    ctx.beginPath()
    ctx.moveTo(cx - 10, cy + 40)
    ctx.quadraticCurveTo(cx - 5, cy + 65, cx, cy + 75)
    ctx.quadraticCurveTo(cx + 5, cy + 65, cx + 10, cy + 40)
    ctx.stroke()

    // 星星装饰
    const drawSmallStar = (x, y, r) => {
      ctx.beginPath()
      for (let i = 0; i < 10; i++) {
        const radius = i % 2 === 0 ? r : r * 0.4
        const angle = (i * Math.PI / 5) - Math.PI / 2
        const px = x + Math.cos(angle) * radius
        const py = y + Math.sin(angle) * radius
        if (i === 0) ctx.moveTo(px, py)
        else ctx.lineTo(px, py)
      }
      ctx.closePath()
      ctx.stroke()
    }
    drawSmallStar(cx - 80, cy - 60, 12)
    drawSmallStar(cx + 85, cy - 30, 10)
    drawSmallStar(cx - 70, cy + 50, 8)
  },

  // 简单房子
  house: (ctx, w, h) => {
    const cx = w / 2, cy = h / 2 + 20
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2

    // 房身
    ctx.beginPath()
    ctx.rect(cx - 80, cy - 40, 160, 120)
    ctx.stroke()

    // 屋顶
    ctx.beginPath()
    ctx.moveTo(cx - 100, cy - 40)
    ctx.lineTo(cx, cy - 120)
    ctx.lineTo(cx + 100, cy - 40)
    ctx.closePath()
    ctx.stroke()

    // 门
    ctx.beginPath()
    ctx.roundRect(cx - 20, cy + 20, 40, 60, [4, 4, 0, 0])
    ctx.stroke()

    // 门把手
    ctx.beginPath()
    ctx.arc(cx + 12, cy + 55, 4, 0, Math.PI * 2)
    ctx.fillStyle = '#333'
    ctx.fill()

    // 左窗
    ctx.beginPath()
    ctx.rect(cx - 65, cy - 15, 30, 30)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx - 50, cy - 15)
    ctx.lineTo(cx - 50, cy + 15)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx - 65, cy)
    ctx.lineTo(cx - 35, cy)
    ctx.stroke()

    // 右窗
    ctx.beginPath()
    ctx.rect(cx + 35, cy - 15, 30, 30)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx + 50, cy - 15)
    ctx.lineTo(cx + 50, cy + 15)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(cx + 35, cy)
    ctx.lineTo(cx + 65, cy)
    ctx.stroke()

    // 烟囱
    ctx.beginPath()
    ctx.rect(cx + 40, cy - 100, 25, 45)
    ctx.stroke()

    // 烟
    ctx.beginPath()
    ctx.arc(cx + 52, cy - 110, 8, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(cx + 58, cy - 125, 6, 0, Math.PI * 2)
    ctx.stroke()
  },

  // 小象
  elephant: (ctx, w, h) => {
    const cx = w / 2, cy = h / 2
    ctx.strokeStyle = '#333'
    ctx.lineWidth = 2

    // 身体
    ctx.beginPath()
    ctx.ellipse(cx + 10, cy + 30, 90, 70, 0, 0, Math.PI * 2)
    ctx.stroke()

    // 头
    ctx.beginPath()
    ctx.arc(cx - 60, cy - 50, 55, 0, Math.PI * 2)
    ctx.stroke()

    // 鼻子
    ctx.beginPath()
    ctx.moveTo(cx - 100, cy - 30)
    ctx.quadraticCurveTo(cx - 130, cy + 20, cx - 110, cy + 70)
    ctx.quadraticCurveTo(cx - 100, cy + 80, cx - 90, cy + 70)
    ctx.quadraticCurveTo(cx - 100, cy + 20, cx - 85, cy - 25)
    ctx.stroke()

    // 左耳
    ctx.beginPath()
    ctx.ellipse(cx - 95, cy - 65, 30, 40, -0.3, 0, Math.PI * 2)
    ctx.stroke()

    // 右耳
    ctx.beginPath()
    ctx.ellipse(cx - 25, cy - 65, 30, 40, 0.3, 0, Math.PI * 2)
    ctx.stroke()

    // 眼睛
    ctx.beginPath()
    ctx.arc(cx - 70, cy - 60, 6, 0, Math.PI * 2)
    ctx.fillStyle = '#333'
    ctx.fill()

    // 象牙
    ctx.beginPath()
    ctx.moveTo(cx - 90, cy - 15)
    ctx.quadraticCurveTo(cx - 100, cy + 10, cx - 85, cy + 15)
    ctx.lineWidth = 3
    ctx.stroke()
    ctx.lineWidth = 2

    // 前腿
    ctx.beginPath()
    ctx.roundRect(cx - 45, cy + 70, 28, 60, 8)
    ctx.stroke()
    ctx.beginPath()
    ctx.roundRect(cx + 25, cy + 70, 28, 60, 8)
    ctx.stroke()

    // 后腿
    ctx.beginPath()
    ctx.roundRect(cx + 55, cy + 65, 28, 60, 8)
    ctx.stroke()

    // 尾巴
    ctx.beginPath()
    ctx.moveTo(cx + 95, cy + 20)
    ctx.quadraticCurveTo(cx + 120, cy + 10, cx + 115, cy + 30)
    ctx.stroke()
  }
}

// 模板列表（与 templates 页面对应）
const templateList = [
  { id: 'rabbit', name: '小兔子', emoji: '🐰', category: 'animal', difficulty: 2 },
  { id: 'cat', name: '小猫咪', emoji: '🐱', category: 'animal', difficulty: 1 },
  { id: 'fish', name: '小鱼', emoji: '🐟', category: 'animal', difficulty: 1 },
  { id: 'elephant', name: '小象', emoji: '🐘', category: 'animal', difficulty: 2 },
  { id: 'butterfly', name: '蝴蝶', emoji: '🦋', category: 'animal', difficulty: 2 },
  { id: 'sunflower', name: '向日葵', emoji: '🌻', category: 'plant', difficulty: 1 },
  { id: 'car', name: '小汽车', emoji: '🚗', category: 'vehicle', difficulty: 1 },
  { id: 'rocket', name: '火箭', emoji: '🚀', category: 'vehicle', difficulty: 2 },
  { id: 'cake', name: '蛋糕', emoji: '🎂', category: 'food', difficulty: 1 },
  { id: 'house', name: '房子', emoji: '🏠', category: 'cartoon', difficulty: 2 },
  { id: 'star', name: '星星', emoji: '⭐', category: 'cartoon', difficulty: 1 }
]

module.exports = {
  templateDrawers,
  templateList
}
