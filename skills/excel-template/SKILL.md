---
name: excel-template
description: "Excel 上传/下载模板处理最佳实践，涵盖样式、批注、下拉框、边框、列宽、ExcelReport 框架结构等。处理 scm-web2.0 项目中任何 Excel 模板相关需求时使用此 skill。"
metadata:
---

# Excel 模板处理技能

处理项目中任何 Excel 上传/下载模板的需求时，必须遵循以下规范。

## 一、下载模板（ExcelReport 框架）

### 1.1 行结构（必须）

ExcelReport 的 `init()` 方法用 `tmplRows.size() - 1` 计算 `headLines`，**最后一行读取字段定义**，前 `headLines` 行拷贝为表头，数据从 `headLines` 行开始写入。

**推荐两行结构**（headLines=1）：

| 行号 | 内容 | 示例 | 样式 |
|------|------|------|------|
| 第1行 | 中文表头（可见） | 设备编码、设备类型 | s=1（表头样式） |
| 第2行 | DTO 字段名 + 格式说明符（可见） | deviceCode、deviceType(enum[1:光电]) | s=2（带边框，供 copyTemplate 克隆） |

> **注意：** `copyTemplate()` 从模板最后一行（字段名行）克隆样式给数据行。字段名行所有单元格必须设置 `s` 属性指向带边框的样式，否则数据行没有边框。

### 1.2 字段名格式说明符

ExcelReport 的 `createItemDef()` 方法解析字段名，支持以下格式：

| 格式 | 语法 | 效果 |
|------|------|------|
| 普通文本 | `fieldName` | 原样写入 |
| 枚举转换 | `fieldName(enum[1:是,2:否])` | 值 '1' → '是'，'2' → '否' |
| 日期格式 | `fieldName(date[yyyy-MM-dd HH:mm:ss])` | Date 对象 → 格式化字符串 |
| 后缀追加 | `fieldName(append[千克])` | 值后追加单位 |
| 数字格式 | `fieldName(number[##0.00])` | 数字格式化 |

**枚举格式判断规则：**
1. 检查 Java 控制器的 download 方法 → 是否对字段做了手动转换
2. 检查 Service/Mapper → 是否在 SQL 或代码中做了枚举转换
3. **如果控制器/Service 没有转换**（直接把 DTO 传给 ExcelReport），而前端 Grid 有 renderer 做转换 → **必须加 enum 格式**
4. **如果控制器/Service 已做转换** → **不要加 enum 格式**，避免双重转换

**日期格式：** 所有 `Date` 类型字段**必须**加 `(date[yyyy-MM-dd HH:mm:ss])`，否则 ExcelReport 把 Date 当数字写入，列宽不够会显示 `#########`。

### 1.3 样式规范

**表头样式（cellXfs 1）：**
- 背景色使用浅蓝灰（固定 rgb，如 `FFB8CCE4`）
- 黑色加粗宋体 10pt
- 四边细黑边框（borderId=1）
- 居中对齐 + 自动换行

**数据样式（cellXfs 2）：**
- 无背景填充
- 黑色正常宋体 10pt
- 四边细黑边框（borderId=1）
- 垂直居中

```xml
<!-- fills 必须定义 3 个，前两个是保留项 -->
<fills count="3">
  <fill><patternFill patternType="none"/></fill>       <!-- 0: 无填充 -->
  <fill><patternFill patternType="gray125"/></fill>    <!-- 1: 保留（gray125 点状） -->
  <fill><patternFill patternType="solid"><fgColor rgb="FFB8CCE4"/><bgColor indexed="64"/></patternFill></fill>  <!-- 2: 表头背景色 -->
</fills>

<!-- cellXfs 定义 -->
<cellXfs count="3">
  <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>  <!-- 0: 默认 -->
  <xf numFmtId="0" fontId="0" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"><alignment horizontal="center" vertical="center" wrapText="1"/></xf>  <!-- 1: 表头（加粗+底色） -->
  <xf numFmtId="0" fontId="1" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1" applyAlignment="1"><alignment vertical="center"/></xf>  <!-- 2: 数据（正常字体+边框） -->
</cellXfs>
```

> **重要：** `fills` 数组索引 `0` 和 `1` 是 OpenXML 保留项（`none` 和 `gray125`）。表头背景色必须放在索引 `2`，cellXfs 中引用 `fillId="2"`。若把自定义颜色放在索引 `1`，WPS/Excel 会显示为 **gray125 麻点图案**。

### 1.4 sheetFormatPr（必须）

下载模板 sheet XML 必须包含：

```xml
<sheetFormatPr defaultRowHeight="12" outlineLevelRow="1"/>
```

位置：`</sheetViews>` 之后、`<cols>` 之前。**缺少此设置会导致 WPS 自动折叠表头行。**

### 1.5 列宽

根据前端 Grid 的 `width` 属性换算（像素 / 7 ≈ Excel 列宽），在 sheet XML 中用 `<cols>` 设置：

```xml
<cols>
  <col min="1" max="1" width="14" customWidth="1"/>  <!-- 100px -->
  <col min="8" max="8" width="21" customWidth="1"/>  <!-- 150px -->
</cols>
```

**日期列特殊处理：** `"yyyy-MM-dd HH:mm:ss"` 有 19 个字符，列宽至少 20-22。

---

## 二、下载模板标准流程

创建下载模板时，按以下步骤操作：

### Step 1：分析前端 Grid

读取 Grid JS 文件，提取：
- 所有**可见列**的 `text`（中文表头）和 `dataIndex`（字段名）
- 排除 `hidden: true` 的列
- 排除注释掉的列
- 检查 `.concat(gridUtils.getComItems(haveDesc))` — `true` 包含备注，`false` 不包含

### Step 2：分析后端转换

读取 Java 控制器的 download 方法：
- 检查是否对 DTO 字段做了手动转换（如枚举 ID → 中文名）
- 检查 Service/Mapper 是否在查询时做了转换
- 确定哪些字段需要在模板中加格式说明符

### Step 3：确定字段定义

对每个字段确定格式：
- `Date` 类型 → `(date[yyyy-MM-dd HH:mm:ss])`
- 枚举且后端未转换 → `(enum[1:是,2:否])`
- 其他 → 纯字段名

### Step 4：用纯 JSZip 生成模板

**不要用 xlsx-js-style 生成下载模板**（与 Apache POI 不兼容）。

用纯 JSZip 手写 XML，需要创建：
- `[Content_Types].xml` — 注册 sharedStrings.xml
- `_rels/.rels` — officeDocument 关系
- `xl/workbook.xml` — sheet 引用
- `xl/_rels/workbook.xml.rels` — worksheet、styles、sharedStrings 关系
- `xl/styles.xml` — fonts、fills、borders、cellXfs
- `xl/sharedStrings.xml` — 所有表头和字段名字符串
- `xl/worksheets/sheet1.xml` — 行列数据 + 列宽 + sheetFormatPr

### Step 5：同步并清理

```bash
# 同步到 target/classes
cp src/main/resources/conf/.../template.xlsx target/classes/conf/.../template.xlsx

# 清理临时文件
rm -rf node_modules package-lock.json package.json tools/create_xxx_template.js
```

---

## 三、上传模板

### 3.1 两行结构

| 行号 | 内容 |
|------|------|
| 第1行 | 英文字段名（device_code、device_type...） |
| 第2行 | 中文名称（设备编码、设备类型...） |

### 3.2 蓝色背景样式

必须用 `xlsx-js-style` + `JSZip` 两步生成：

**Step 1:** xlsx-js-style 创建基础文件（设置数据和列宽）
**Step 2:** JSZip 读取 xlsx，修改 `xl/styles.xml` 添加样式

styles.xml 关键结构：
```xml
<!-- fonts: 0=Calibri, 1=宋体, 2=粗体红字(必填), 3=粗体黑字(非必填) -->
<fonts count="4">
  <font><sz val="11"/><name val="Calibri"/></font>
  <font><sz val="10"/><name val="宋体"/><charset val="134"/></font>
  <font><b/><sz val="10"/><color rgb="FFFF0000"/><name val="宋体"/><charset val="134"/></font>
  <font><b/><sz val="10"/><name val="宋体"/><charset val="134"/></font>
</fonts>
<!-- fills: 2=蓝色背景 #8EB4E3 -->
<fills count="3">
  <fill><patternFill patternType="none"/></fill>
  <fill><patternFill patternType="gray125"/></fill>
  <fill><patternFill patternType="solid"><fgColor rgb="FF8EB4E3"/><bgColor indexed="64"/></patternFill></fill>
</fills>
<!-- cellXfs: 1=必填(蓝底红字), 2=非必填(蓝底黑字) -->
```

应用：必填字段 `s="1"`，非必填字段 `s="2"`，两行都应用。

### 3.3 数据验证下拉框

枚举字段在 sheet1.xml 中添加数据验证下拉框，放在 `</sheetData>` 之后：

```xml
<dataValidations count="2">
  <dataValidation type="list" allowBlank="1" showInputMessage="1" showErrorMessage="1" sqref="B3:B1000">
    <formula1>"光电,拉绳开关,指示灯"</formula1>
  </dataValidation>
</dataValidations>
```

**重要：下拉框的值必须使用中文显示值，而不是数字编码！**

例如：
- ✅ 正确：`"是,否"`、`"使用中,停用中"`、`"高,中,低"`
- ❌ 错误：`"1,2"`、`"1,2,3"`

**原因：** 用户在 Excel 中看到和选择的是中文值。校验框架（check-xxx.xml）会根据 `var-value`（中文）和 `var-key`（数字）的对应关系自动转换，无需在 Service 中手动转换。

**注意：** 下拉框 sqref 从第3行开始，表头行不受影响。

---

## 四、批注（Comments）

### 4.1 核心规则

- 枚举字段在中文表头单元格加**批注**展示可选值
- 每个值单独一行，批注默认隐藏
- **无底色**（必须去掉 fillcolor 和 v:fill）

### 4.2 创建批注

用 `xlsx-js-style` 的 `.c` 属性：

```javascript
ws['B2'].c = [{t: '光电\n拉绳开关\n指示灯', a: 'System'}];
```

### 4.3 重写 VML（必须）

xlsx-js-style 生成的 VML 有默认绿色背景，**必须完全重写 VML**：

```xml
<v:shape id="_x0000_s1025" type="#_x0000_t202"
    style="position:absolute;margin-left:80pt;margin-top:5pt;width:104pt;height:64pt;z-index:10;visibility:hidden">
 <v:shadow on="t" color="black" obscured="t"/>
 <v:path o:connecttype="none"/>
 <v:textbox style='mso-direction-alt:auto'/>
 <x:ClientData ObjectType="Note">
  <x:MoveWithCells/>
  <x:SizeWithCells/>
  <x:Anchor>1, 15, 0, 2, 3, 15, 2, 2</x:Anchor>
  <x:AutoFill>False</x:AutoFill>
  <x:Row>1</x:Row>
  <x:Column>1</x:Column>
 </x:ClientData>
</v:shape>
```

**关键点：**
1. **`visibility:hidden`** — CSS 级别控制，WPS 和 Excel 都认
2. **去掉 `fillcolor` 属性** — 否则有绿色背景
3. **去掉 `<v:fill>` 标签** — 否则有渐变背景
4. **`<x:Hidden/>` 无效** — WPS 不支持，必须用 `visibility:hidden`

### 4.4 相关 XML 文件

| 文件 | 作用 |
|------|------|
| `xl/comments1.xml` | 注释文本内容 |
| `xl/drawings/vmlDrawing1.vml` | VML 形状定义（位置、可见性） |
| `xl/worksheets/_rels/sheet1.xml.rels` | 关联 VML 和 comments |
| `[Content_Types].xml` | 注册 VML 和 comments 类型 |

---

## 五、常见陷阱

1. **`<xf/>` 空标签** — 会导致 cellXfs 索引错位，样式应用到错误的单元格
2. **`select t.*` + JOIN 同名列** — 数据库未删除旧字段时会报 Duplicate column name，改用显式字段列表
3. **`<x:Hidden/>` 无效** — WPS 不认此标签，必须用 `visibility:hidden`
4. **忘记同步 target/classes** — 开发环境读取的是 target 下的文件
5. **缺少 sheetFormatPr** — WPS 会自动折叠表头行
6. **VML 有绿色背景** — xlsx-js-style 生成的 VML 默认有 `fillcolor="#ecfada"` 和 `<v:fill>`，必须去掉
7. **数据验证下拉框 sqref 从第3行开始** — 表头行不应受下拉框影响
8. **`XLSX.writeFile` 覆盖样式** — 用 xlsx-js-style 写入会丢失原有样式，必须用 JSZip 修改现有文件
9. **xlsx-js-style 与 Apache POI 不兼容** — `cloneStyleFrom()` 报 `HSSFCellStyle to XSSFCellStyle` 错误。**解决：下载模板用纯 JSZip 手写 XML**
10. **日期列显示 `#########`** — 字段名没带 `(date[yyyy-MM-dd HH:mm:ss])`，Date 被当数字写入。**解决：Date 字段必须加 date 格式说明符**
11. **数据行没有边框** — 字段名行单元格没设置 `s` 属性。**解决：字段名行所有单元格必须 `s="2"`（带边框样式）**
12. **日期列宽度不够** — `"yyyy-MM-dd HH:mm:ss"` 有 19 字符，列宽至少 20-22
13. **枚举字段下载显示原始值** — 后端没做转换，模板也没加 enum 格式。**解决：检查后端是否转换，未转换则模板加 `(enum[...])`**
14. **fills 索引错位导致表头显示麻点** — OpenXML 规范中 `fills[0]=none`、`fills[1]=gray125` 是保留项。自定义背景色必须放在索引 `2`，cellXfs 引用 `fillId="2"`。若将颜色放在索引 `1`，WPS/Excel 会显示为 gray125 点状图案。**解决：fills 定义 3 个，表头 fillId="2"**
