/**
 * 数学公式数据
 * 集中管理数学公式定义
 */

var MATH_FORMULAS = [
  // 基础运算
  { id: 'f001', title: '加法交换律', category: 'basic', grade: '1', formula: 'a + b = b + a', explanation: '两个数相加，交换位置，结果不变' },
  { id: 'f002', title: '加法结合律', category: 'basic', grade: '1', formula: '(a + b) + c = a + (b + c)', explanation: '三个数相加，先加前两个或先加后两个，结果不变' },
  { id: 'f003', title: '乘法交换律', category: 'basic', grade: '2', formula: 'a × b = b × a', explanation: '两个数相乘，交换位置，结果不变' },
  { id: 'f004', title: '乘法结合律', category: 'basic', grade: '2', formula: '(a × b) × c = a × (b × c)', explanation: '三个数相乘，先乘前两个或先乘后两个，结果不变' },
  { id: 'f005', title: '乘法分配律', category: 'basic', grade: '3', formula: '(a + b) × c = a × c + b × c', explanation: '两个数的和乘以一个数，等于分别相乘再相加' },
  
  // 几何图形
  { id: 'f010', title: '长方形面积', category: 'geometry', grade: '3', formula: 'S = a × b', explanation: '长方形的面积等于长乘以宽' },
  { id: 'f011', title: '正方形面积', category: 'geometry', grade: '3', formula: 'S = a × a', explanation: '正方形的面积等于边长乘以边长' },
  { id: 'f012', title: '三角形面积', category: 'geometry', grade: '4', formula: 'S = a × h ÷ 2', explanation: '三角形的面积等于底乘以高除以2' },
  { id: 'f013', title: '圆的面积', category: 'geometry', grade: '6', formula: 'S = π × r × r', explanation: '圆的面积等于π乘以半径的平方' },
  { id: 'f014', title: '圆的周长', category: 'geometry', grade: '6', formula: 'C = 2 × π × r', explanation: '圆的周长等于2乘以π乘以半径' },
  
  // 常用数量关系
  { id: 'f020', title: '路程公式', category: 'application', grade: '4', formula: '路程 = 速度 × 时间', explanation: '路程等于速度乘以时间' },
  { id: 'f021', title: '总价公式', category: 'application', grade: '3', formula: '总价 = 单价 × 数量', explanation: '总价等于单价乘以数量' },
  { id: 'f022', title: '工作总量', category: 'application', grade: '4', formula: '工作总量 = 工作效率 × 工作时间', explanation: '工作总量等于工作效率乘以工作时间' }
]

module.exports = MATH_FORMULAS
