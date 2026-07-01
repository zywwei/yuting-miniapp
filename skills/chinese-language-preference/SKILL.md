---
name: chinese-language-preference
description: 全局中文语言偏好设置。强制所有思考过程、最终回复和代码注释使用简体中文，代码本身保持英文。适用于需要中文交互的开发场景。
license: MIT
---

# 中文语言偏好设置

本 skill 定义了与用户交互时的语言规范，确保所有沟通使用标准、流畅的简体中文。

**适用场景：** 所有需要中文交互的开发和对话场景。

## 核心规范

### 1. 思考过程（Thinking/Reasoning）

在生成最终回答前，所有内部逻辑推理、代码分析和思考过程**必须使用中文（简体）**。

**示例：**
- ✅ 正确：分析这段代码的逻辑，需要考虑三个关键点...
- ❌ 错误：Analyzing this code logic, there are three key points to consider...

### 2. 最终回复（Response）

对用户的所有回复、解释、总结和交互，**必须使用标准、流畅的中文（简体）**。

**要求：**
- 使用规范的中文标点符号（，。！？等）
- 避免中英文混杂的表达
- 技术术语首次出现时可附英文原文，后续使用中文
- 保持语言简洁、专业

**示例：**
- ✅ 正确：这段代码实现了一个异步任务队列（Async Task Queue），用于处理后台任务。
- ❌ 错误：This code implements an async task queue for handling background tasks.

### 3. 代码与注释（Code & Comments）

编写代码时，遵循以下规范：

**代码部分（保持英文）：**
- 变量名、函数名、类名使用英文
- 代码逻辑和结构保持业界规范的英文命名
- 遵循项目现有的命名约定

**注释部分（使用中文）：**
- 所有代码注释使用中文
- 原理解释使用中文
- 修改说明使用中文
- TODO/FIXME 等标记可使用英文或中英混合

**示例：**
```java
// ✅ 正确示例
/**
 * 计算订单总金额
 * @param orderItems 订单项列表
 * @return 总金额（含税）
 */
public BigDecimal calculateTotalAmount(List<OrderItem> orderItems) {
    // 遍历所有订单项，累加金额
    BigDecimal total = BigDecimal.ZERO;
    for (OrderItem item : orderItems) {
        total = total.add(item.getAmount());
    }
    return total;
}

// ❌ 错误示例
/**
 * Calculate order total amount
 * @param orderItems list of order items
 * @return total amount (including tax)
 */
public BigDecimal calculateTotalAmount(List<OrderItem> orderItems) {
    // Iterate through all order items and accumulate amount
    BigDecimal total = BigDecimal.ZERO;
    for (OrderItem item : orderItems) {
        total = total.add(item.getAmount());
    }
    return total;
}
```

## 特殊情况处理

### 技术术语

以下情况可保留英文：
- 广泛接受的技术缩写：API、SQL、HTTP、REST、JSON 等
- 框架和库的专有名称：Spring、MyBatis、React 等
- 代码中的标识符：变量名、方法名、类名等

**处理方式：** 首次出现时中文+英文，后续可只用中文
- ✅ 应用程序编程接口（API）
- ✅ 后续：接口

### 代码输出

当展示代码时：
- 代码块本身保持英文
- 代码块前后的解释文字使用中文
- 代码内的注释使用中文

### 错误信息

- 系统/编译器错误信息可保留原文
- 对错误的解释和修复建议使用中文

## 执行检查清单

在每次交互前，确认：

- [ ] 思考过程是否使用中文？
- [ ] 最终回复是否使用中文？
- [ ] 代码注释是否使用中文？
- [ ] 代码变量/函数名是否保持英文？
- [ ] 是否使用了规范的中文标点？
- [ ] 技术术语处理是否恰当？

## 与用户沟通

当用户使用中文时：
- 自动应用本规范
- 无需用户每次提醒

当用户使用英文时：
- 仍以中文回复
- 但可适当保留用户使用的英文术语

当用户明确要求英文时：
- 可临时切换为英文模式
- 但默认仍应优先使用中文

## 优先级

本规范的优先级低于：
1. 用户明确的语言要求
2. 项目特定的语言约定（如 CLAUDE.md 中的规定）
3. 代码库现有的注释风格

在其他情况下，本规范应被严格遵守。
