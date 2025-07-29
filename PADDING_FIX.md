# K线图价格标签修复说明

## 问题分析
用户反馈K线图左右两边的价格和涨跌幅标签被遮挡，这是因为之前为了最大化图表宽度，过度减少了边距导致标签显示空间不足。

## 修复方案

### 1. 调整画布宽度
- 从 `screenWidth - 2` 改为 `screenWidth - 8`
- 预留更多空间确保标签不被遮挡

### 2. 优化边距设置
- **左边距**: 从8px增加到45px，为左侧价格标签预留足够空间
- **右边距**: 从2px增加到50px，为右侧涨跌幅标签预留足够空间

### 3. 更新标签位置
- **左侧价格标签**: 从 `leftPadding - 1` 改为 `leftPadding - 5`
- **右侧涨跌幅标签**: 从 `canvasWidth - 30` 改为 `canvasWidth - 45`

### 4. 统一所有绘制函数
更新了以下函数中的padding值，确保一致性：
- `drawChart()` 
- `drawChartAndCrosshair()`
- `drawCrosshair()`
- `isPointInChartArea()`
- `updateCrosshairY()`

## 预期效果

### 之前的问题:
- 左侧价格标签被遮挡或显示不全
- 右侧涨跌幅百分比标签被裁切
- 图表过度拉伸导致标签无显示空间

### 修复后的效果:
- 左侧价格标签完全可见，有足够的显示空间(45px)
- 右侧涨跌幅标签完全可见，有足够的显示空间(50px)
- 图表宽度仍然充分利用屏幕空间，但为标签预留了合理的空间
- 整体布局更加平衡和美观

## 验证方法

查看控制台日志确认修复生效：
```
组件版本: KLineChart_v2.2_PaddingFixed
VERSION_CHECK: KLineChart_v2.2_PaddingFixed
=== 绘制参数调试 v2.2_PaddingFixed ===
边距设置: {leftPadding: 45, rightPadding: 50, topPadding: 20}
```

现在K线图应该能够：
1. 左侧价格标签完全显示，不被遮挡
2. 右侧涨跌幅百分比标签完全显示，不被裁切
3. 保持图表的良好视觉比例和可读性