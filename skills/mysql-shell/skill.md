---
name: mysql-shell
description: "MySQL Shell 数据库查询 Skill。用于执行 SELECT 查询、查看表结构、分析数据等只读操作。直接使用 MySQL Shell 查询数据库。严禁主动执行任何增删改操作（INSERT/UPDATE/DELETE/DROP/ALTER/TRUNCATE），如需执行必须先询问用户确认。"
---

# MySQL Shell 数据库查询 Skill

直接使用 MySQL Shell 执行 SQL 查询。

## 安全要求（最高优先级）

**严禁主动执行任何数据增删改操作**，包括但不限于：
- INSERT（插入数据）
- UPDATE（更新数据）
- DELETE（删除数据）
- DROP（删除表/数据库）
- ALTER（修改表结构）
- TRUNCATE（清空表）

**当用户明确要求执行增删改操作时，必须：**
1. 先展示将要执行的 SQL 语句
2. 明确询问用户"是否确认执行此操作？"
3. 只有用户明确同意后才能执行

## 触发条件

当用户请求数据库查询操作时，直接使用此 skill 执行查询。

## 使用方式

### 基本命令

```bash
mysqlsh --sql -h 172.28.229.21 -P 3306 -u pms -pReplPass5! -D scm_intex_test_v2 -e "SQL语句"
```

### 项目快捷脚本

项目提供了简化脚本 `tools/db.sh`：

```bash
# 执行查询
bash tools/db.sh "SELECT * FROM table_name LIMIT 10"

# 查看表结构
bash tools/db.sh "DESCRIBE table_name"

# 显示所有表
bash tools/db.sh "SHOW TABLES"
```

## 输出格式选项

MySQL Shell 支持多种输出格式：

```bash
# 表格格式（默认）
mysqlsh --sql -h 172.28.229.21 -P 3306 -u pms -pReplPass5! -D scm_intex_test_v2 --resultFormat=table -e "SQL"

# JSON 格式
mysqlsh --sql -h 172.28.229.21 -P 3306 -u pms -pReplPass5! -D scm_intex_test_v2 --resultFormat=json -e "SQL"

# Tab 分隔格式
mysqlsh --sql -h 172.28.229.21 -P 3306 -u pms -pReplPass5! -D scm_intex_test_v2 --resultFormat=tab -e "SQL"
```

## 数据库连接信息

- **主机**: 172.28.229.21
- **端口**: 3306
- **用户**: pms
- **密码**: ReplPass5!
- **数据库**: scm_intex_test_v2

## 工作流程

1. 直接使用 `bash tools/db.sh` 执行查询
2. 返回查询结果

## 示例

```bash
# 查询用户信息
bash tools/db.sh "SELECT id, username, real_name FROM sys_user WHERE status = 1 LIMIT 10"

# 查看订单表结构
bash tools/db.sh "DESCRIBE scm_order"

# 统计订单数量
bash tools/db.sh "SELECT COUNT(*) as total FROM scm_order WHERE create_time > '2024-01-01'"
```

## 注意事项

- 密码在命令行中可见，注意安全
- 大结果集会输出到终端，建议使用 LIMIT 限制行数
- 中文字符在终端中可能显示正常，但 JSON 格式更可靠
