<template>
  <view class="stock-card-container">
    <!-- 股票卡片 -->
    <view 
      class="stock-card" 
      :class="{ 
        dragging: isDragging, 
        'drag-over': dragOver
      }"
      @click="onCardClick"
      @touchstart="onTouchStart" 
      @touchmove.prevent="onTouchMove" 
      @touchend="onTouchEnd"
    >
      <!-- 拖拽手柄 -->
      <view class="drag-handle" @touchstart.stop="startDrag">
        <u-icon name="more" size="18" color="#ccc" style="transform: rotate(90deg);"></u-icon>
      </view>
      
      <view class="stock-info">
        <text class="stock-name">{{ stock.name || stock.stock_name }}</text>
        <view class="code-line">
          <text class="market-name">{{ getMarketName() }}</text>
          <text class="stock-code">{{ stock.code || stock.stock_code }}</text>
        </view>
      </view>
      <view class="stock-price">
        <text :class="getPriceClass()">{{ stock.price || '--' }}</text>
      </view>
      <view class="stock-change">
        <text :class="getPriceClass()">{{ stock.upDownStr || '--' }}</text>
      </view>
      <view class="stock-turnover">
        <text>{{ stock.turnoverRate || '--' }}</text>
      </view>
      
      <!-- 操作按钮区域（只在股票详情关闭时显示） -->
      <view v-if="!expanded" class="action-buttons">
        <view class="action-btn edit-btn" @tap.stop="onEdit" @click.stop="onEdit">
          <u-icon name="edit-pen" size="14" color="#1976d2"></u-icon>
        </view>
        <view class="action-btn delete-btn" @tap.stop="onDelete" @click.stop="onDelete">
          <u-icon name="trash" size="14" color="#ff4757"></u-icon>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: "StockCard",
  props: {
    stock: { type: Object, required: true },
    expanded: { type: Boolean, default: false },
    dragOver: { type: Boolean, default: false }
  },
  data() {
    return {
      isDragging: false,
      dragStartY: 0,
      dragTimer: null,
      isDragMode: false
    }
  },
  methods: {
    // 点击卡片事件
    onCardClick() {
      if (!this.isDragMode) {
        this.$emit('expand')
      }
    },
    
    // 编辑股票
    onEdit() {
      // 确保不在拖拽模式下
      if (this.isDragMode) {
        return
      }
      this.$emit('edit', this.stock)
    },
    
    // 删除股票
    onDelete() {
      // 确保不在拖拽模式下
      if (this.isDragMode) {
        return
      }
      this.$emit('delete', this.stock)
    },
    
    // 开始拖拽模式
    startDrag(e) {
      this.isDragMode = true
      this.isDragging = true
      this.dragStartY = e.touches[0].clientY
      this.$emit('dragstart')
    },
    
    // 普通触摸开始
    onTouchStart(e) {
      if (this.isDragMode) return
      
      this.dragStartY = e.touches[0].clientY
      this.dragTimer = setTimeout(() => {
        if (!this.isDragMode) {
          this.isDragMode = true
          this.isDragging = true
          this.$emit('dragstart')
        }
      }, 800) // 长按800ms进入拖拽模式
    },
    
    onTouchMove(e) {
      if (this.isDragging) {
        const currentY = e.touches[0].clientY
        // 传递当前Y坐标，让父组件处理
        this.$emit('dragmove', currentY)
      } else if (this.dragTimer) {
        // 如果移动了，取消长按定时器
        const moveDistance = Math.abs(e.touches[0].clientY - this.dragStartY)
        if (moveDistance > 10) {
          clearTimeout(this.dragTimer)
          this.dragTimer = null
        }
      }
    },
    
    onTouchEnd(e) {
      clearTimeout(this.dragTimer)
      this.dragTimer = null
      
      if (this.isDragging) {
        this.isDragging = false
        this.isDragMode = false
        this.$emit('dragend')
      } else {
        // 立即重置拖拽模式，不需要延迟
        this.isDragMode = false
      }
    },
    
    getPriceClass() {
      if (!this.stock.upDown) return ''
      return this.stock.upDown > 0 ? 'stock-up' : (this.stock.upDown < 0 ? 'stock-down' : '')
    },
    
    // 获取市场名称
    getMarketName() {
      const stockCode = this.stock.stock_code || this.stock.code || ''
      
      if (stockCode.toUpperCase().startsWith('SH')) {
        return '沪'
      } else if (stockCode.toUpperCase().startsWith('SZ')) {
        return '深'
      } else if (stockCode.toUpperCase().startsWith('HK')) {
        return '港'
      } else if (stockCode.toUpperCase().startsWith('US')) {
        return '美'
      } else if (stockCode.match(/^[A-Z]+$/)) {
        // 纯字母代码，通常是美股
        return '美'
      } else if (stockCode.match(/^\d{6}$/)) {
        // 纯数字6位，根据开头判断
        const code = stockCode.substring(0, 1)
        if (code === '6') {
          return '沪'
        } else if (code === '0' || code === '3') {
          return '深'
        }
      }
      
      return ''
    }
  }
}
</script>

<style scoped>
.stock-card-container {
  position: relative;
  overflow: visible;
}

.stock-card {
  display: flex;
  align-items: center;
  padding: 28rpx 16rpx;
  border-bottom: 1px solid #f0f0f0;
  background: #fff;
  position: relative;
  z-index: 2;
}

.stock-card.dragging {
  opacity: 0.8;
  background: #f0f4ff;
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 10;
}

.stock-card.drag-over {
  background: #e8f5e8;
  border-color: #4caf50;
}

.stock-card .stock-info {
  flex: 2.5;
  min-width: 0;
  margin-right: 16rpx;
  padding-left: 16rpx; /* 与表头的padding-left对应 */
}

.stock-card .stock-info .stock-name {
  display: block;
  font-weight: bold;
  font-size: 32rpx;
  color: #333;
  margin-bottom: 4rpx;
}

.stock-card .stock-info .code-line {
  display: flex;
  align-items: center;
}

.stock-card .stock-info .market-name {
  font-size: 20rpx;
  color: #fff;
  background: #e53935;
  padding: 2rpx 6rpx;
  border-radius: 4rpx;
  line-height: 1;
  margin-right: 8rpx;
  min-width: 24rpx;
  text-align: center;
}

.stock-card .stock-info .stock-code {
  font-size: 24rpx;
  color: #999;
}

.stock-card .stock-price {
  flex: 1.2;
  text-align: center;
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.stock-card .stock-change {
  flex: 1.2;
  text-align: center;
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}

.stock-card .stock-turnover {
  flex: 1.2;
  text-align: center;
  font-size: 28rpx;
  font-weight: bold;
  color: #1976d2;
}

.drag-handle {
  padding: 8rpx;
  margin-right: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}

/* 操作按钮样式 */
.action-buttons {
  flex: 1.5;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 12rpx;
}

.action-btn {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s ease;
  transform: scale(1);
  cursor: pointer;
  position: relative;
  z-index: 10;
}

.edit-btn {
  background: rgba(25, 118, 210, 0.1);
  border: 2rpx solid rgba(25, 118, 210, 0.2);
  color: #1976d2;
}

.edit-btn:active {
  background: rgba(25, 118, 210, 0.2);
  transform: scale(0.9);
}

.delete-btn {
  background: rgba(255, 71, 87, 0.1);
  border: 2rpx solid rgba(255, 71, 87, 0.2);
  color: #ff4757;
}

.delete-btn:active {
  background: rgba(255, 71, 87, 0.2);
  transform: scale(0.9);
}

.stock-up {
  color: #e53935 !important;
}

.stock-down {
  color: #388e3c !important;
}
</style>