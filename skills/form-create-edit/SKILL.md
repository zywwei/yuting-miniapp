---
name: form-create-edit
description: "ExtJS 表单创建与修改规范。涵盖表单组件定义、字段类型、只读控制、必填样式、控制器事件处理、formUtils.doUpdate 弹窗配置等。创建或修改 Form 表单时使用此 skill。"
metadata:
---

# Form 表单创建修改 Skill

## 概述

本项目使用 ExtJS 框架，表单页面由前端 JS 文件组成，通过 `formUtils.doUpdate` 方法弹出窗体进行数据的添加和修改操作。

## 文件结构

```
view/
  └── XxxForm.js          # 表单组件定义
controller/
  └── XxxController.js    # 控制器，处理按钮事件和提交逻辑
```

## 一、表单组件创建 (XxxForm.js)

### 1.1 基本结构

```javascript
Ext.define('arms.scm.page.mstr.xxx.view.XxxForm', {
    extend: 'Ext.form.Panel',
    alias: 'widget.ScmXxxForm',

    width: 400,
    height: 130,
    layout: 'anchor',

    defaults: {
        anchor: '99%'
    },

    items: [],

    initComponent: function () {
        this.items = [/* 表单字段 */];
        this.callParent(arguments);
    }
});
```

### 1.2 常用字段类型

#### 文本框
```javascript
{
    xtype: 'textfield',
    fieldLabel: '字段名称',
    name: 'fieldName',
    allowBlank: false,  // false=必填, true=非必填
    maxLength: 50
}
```

#### 下拉框 - 静态数据
```javascript
{
    xtype: 'combobox',
    fieldLabel: '字段名称',
    name: 'fieldName',
    store: Ext.create('Ext.data.Store', {
        fields: ['value', 'text'],
        data: [
            {value: '1', text: '选项1'},
            {value: '2', text: '选项2'}
        ]
    }),
    displayField: 'text',
    valueField: 'value',
    editable: false,  // 不允许手动输入
    allowBlank: false
}
```

#### 下拉框 - 代码表
```javascript
{
    xtype: 'combobox',
    fieldLabel: '字段名称',
    name: 'fieldName',
    queryMode: 'local',
    displayField: 'codeName',
    valueField: 'codeValue',
    store: scmUtils.createStore('model1'),  // 代码表名称
    allowBlank: false
}
```

#### 下拉框 - 自定义 Store
```javascript
{
    xtype: 'combobox',
    fieldLabel: '字段名称',
    name: 'fieldName',
    store: storeUtils.createStore({
        storeCls: 'arms.scm.page.mstr.xxx.store.XxxStore'
    }),
    displayField: 'fieldName',
    valueField: 'fieldName',
    allowBlank: false
}
```

## 二、只读样式控制

### 2.1 使用 formUtils.readOnly()

```javascript
var field = form.form.findField('fieldName');
formUtils.readOnly(field, true);   // 设置只读
formUtils.readOnly(field, false);  // 取消只读
```

**注意**: `formUtils.readOnly` 会自动设置 `readOnlyStyle` 样式（灰色背景）

### 2.2 禁用字段

```javascript
field.disable();  // 禁用（不参与校验和提交）
field.enable();   // 启用
```

**注意**: `disable()` 的字段不会参与表单校验，也不会被提交

## 三、必填标签样式控制

### 3.1 allowBlank2 函数

用于动态控制字段标签的红色必填样式：

```javascript
/**
 * 设置必填标签样式
 * @param {Ext.form.field.Field} itemCt 字段组件
 * @param {Boolean} flag true=非必填(移除红色), false=必填(显示红色)
 */
function allowBlank2(itemCt, flag) {
    if (Ext.isEmpty(itemCt.labelEl)) {
        return;
    }
    var el = itemCt.labelEl.dom.querySelector('[class=x-form-item-label-text]');
    if (Ext.isEmpty(el)) {
        return;
    }
    if (flag) {
        el.innerHTML = itemCt.fieldLabel.replace('<span style="color:red">', '').replace('</span>', '') + ':';
        itemCt.allowBlank = true;
    } else {
        el.innerHTML = '<span style="color:red">' + itemCt.fieldLabel + ':</span>';
        itemCt.allowBlank = false;
    }
}
```

### 3.2 使用示例

```javascript
// 在 change 事件中动态控制
listeners: {
    change: function (combo, newValue, oldValue, eOpts) {
        var field = form.form.findField('fieldName');
        if (newValue === '1') {
            allowBlank2(field, false);  // 显示红色必填
        } else {
            allowBlank2(field, true);   // 移除红色，设为非必填
        }
    }
}
```

## 四、控制器事件处理 (XxxController.js)

### 4.1 注册视图

```javascript
views: [
    'arms.scm.page.mstr.xxx.view.XxxForm',
    'arms.scm.page.mstr.xxx.view.XxxGrid'
],
```

### 4.2 按钮选择模式

```javascript
var sSelBtn = ['update', 'bindUld'];  // 单选按钮（选中单条时启用）
var mSelBtn = ['delete', 'batchEnable'];  // 多选按钮（选中多条时启用）
```

### 4.3 弹出表单 - formUtils.doUpdate

```javascript
eventLst['ScmXxxGrid button[ref=add]'] = {
    click: function (btn, o) {
        var gridCt = btn.up('ScmXxxGrid');
        formUtils.doUpdate({
            winTitle: '标题',
            iconCls: 'table-add',
            nestObj: 'ScmXxxForm',        // 表单 xtype
            renderTo: 'ScmXxxPanel',       // 渲染到的容器 xtype
            grid: gridCt,
            initHandle: function (win, cfg) {
                // 初始化处理
                var form = win.down(cfg.nestObj);
                form.form.findField('fieldName').setValue('defaultValue');
            },
            init: {
                focusItem: 'fieldName'  // 默认聚焦字段
            },
            submitHandle: that.onSubmit,  // 提交处理函数
            submit: {
                action: 'scm/mstr/xxx/addXxx',
                grid: gridCt,
                // 自定义参数
                customParam: 'value'
            }
        });
    }
};
```

### 4.4 提交处理函数

```javascript
onSubmit: function (win, cfg) {
    var form = win.down(cfg.nestObj);
    if (!form.isValid()) {
        return;
    }
    var grid = cfg.grid;
    var params = form.form.getValues();
    // 添加自定义参数
    params.customParam = cfg.submit.customParam;

    baseUtils.ajaxReq({
        maskCt: win,
        grid: grid,
        url: cfg.submit.action,
        jsonData: params,  // JSON 提交
        successCallback: function (cfg, resp) {
            var ret = Ext.decode(resp.responseText);
            if (ret.code === baseData.respCode.SUCCESS) {
                gridUtils.refreshPage(cfg.grid);
                win.close();
            } else {
                baseUtils.errorMsgBox(ret.msg);
            }
        }
    });
}
```

## 五、后端 Controller

### 5.1 接口定义

```java
@RestApiAuthMode("session")
@AccessAuth(moduleId = "scm.page.mstr.xxx", functionId = "add")
@PostMapping("/addXxx")
public RestDesktopResult addXxx(@RequestBody XxxModel model) {
    return xxxService.addXxx(model);
}
```

**重要**: 使用 `@RequestBody` 注解接收 JSON 数据

### 5.2 Model 类

```java
public class XxxModel extends PagingModel {
    private static final long serialVersionUID = -294871563284190583L;

    private String field1;
    private String field2;

    // getter/setter
}
```

## 六、代码表使用

### 6.1 前端定义 (AppData.js)

```javascript
codeId: {
    WH_PACK_MODE: 'wh_pack_mode'  // 货架模型
}
```

### 6.2 创建代码表 Store

```javascript
store: scmUtils.createStore('model1')
```

### 6.3 后端获取代码表

```java
// 获取单个代码表详情
ArmsCodeDetailDto codeDto = ComUtils.getCodeDetail(CodeId.WH_BUS.getValue(), "常数名称");

// 获取代码表列表
List<ArmsCodeDetailDto> codeDtos = ComUtils.getCodeDetailList(CodeId.WH_PACK_MODE.getValue());
```

## 七、常用工具函数

| 函数 | 说明 |
|------|------|
| `formUtils.readOnly(field, flag)` | 设置字段只读样式 |
| `formUtils.doReadOnly(form, {includeCts: []})` | 批量设置只读 |
| `allowBlank2(field, flag)` | 设置必填标签样式 |
| `gridUtils.refreshPage(grid)` | 刷新表格数据 |
| `baseUtils.errorMsgBox(msg)` | 显示错误消息 |
| `baseUtils.ajaxReq(cfg)` | 发送 AJAX 请求 |
