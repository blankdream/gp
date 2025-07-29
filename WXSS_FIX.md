# 微信小程序样式修复说明

## 问题描述
在微信小程序编译时出现警告：
```
[pages/index/index] Some selectors are not allowed in component wxss, including tag name selectors, ID selectors, and attribute selectors.(./components/AddStockModal.wxss:50:1)
```

## 原因分析
微信小程序的组件样式文件（.wxss）中不允许使用以下选择器：
- **标签选择器**（如 `label`、`textarea`、`input`、`button`）
- **ID选择器**（如 `#my-id`）
- **属性选择器**（如 `[type="text"]`）

只允许使用**类选择器**（如 `.my-class`）和**元素选择器**（如 `view`、`text`）。

## 修复内容

### AddStockModal.vue 修复

#### 模板修改：
```html
<!-- 修复前 -->
<label>股票</label>
<textarea v-model="remark" placeholder="可填写备注" rows="3" />

<!-- 修复后 -->
<view class="modal-label">股票</view>
<textarea class="modal-textarea" v-model="remark" placeholder="可填写备注" rows="3" />
```

#### 样式修改：
```scss
/* 修复前 - 使用标签选择器 */
label {
  min-width: 48px;
  color: #555;
}
textarea {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 1em;
  min-height: 60px;
}

/* 修复后 - 使用类选择器 */
.modal-label {
  min-width: 48px;
  color: #555;
}
.modal-textarea {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 1em;
  min-height: 60px;
}
```

## 检查结果
- ✅ **AddStockModal.vue**: 已修复标签选择器问题
- ✅ **EditStockModal.vue**: 无问题，已正确使用类选择器
- ✅ **GroupManageModal.vue**: 无问题，已正确使用类选择器

## 最佳实践
在开发uni-app微信小程序组件时，请遵循以下样式编写规范：

1. **只使用类选择器**: `.my-class`
2. **避免标签选择器**: 不要使用 `div`、`span`、`input` 等
3. **避免ID选择器**: 不要使用 `#my-id`
4. **避免属性选择器**: 不要使用 `[attr="value"]`
5. **推荐使用BEM命名规范**: `.component__element--modifier`

## 解决效果
修复后，微信小程序编译将不再出现样式选择器警告，组件样式功能保持不变。