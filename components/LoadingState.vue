<template>
  <view class="loading-state" v-if="visible">
    <!-- 骨架屏 -->
    <view v-if="type === 'skeleton'" class="skeleton-container">
      <view class="skeleton-item" v-for="n in count" :key="n">
        <view class="skeleton-line skeleton-title"></view>
        <view class="skeleton-line skeleton-text"></view>
        <view class="skeleton-line skeleton-text short"></view>
      </view>
    </view>
    
    <!-- 加载中 -->
    <view v-else-if="type === 'loading'" class="loading-container">
      <view class="loading-spinner"></view>
      <text class="loading-text">{{ text || '加载中...' }}</text>
    </view>
    
    <!-- 错误状态 -->
    <view v-else-if="type === 'error'" class="error-container">
      <view class="error-icon">⚠️</view>
      <text class="error-text">{{ text || '加载失败' }}</text>
      <button v-if="showRetry" class="retry-btn" @tap="$emit('retry')">重试</button>
    </view>
    
    <!-- 空数据状态 -->
    <view v-else-if="type === 'empty'" class="empty-container">
      <view class="empty-icon">📭</view>
      <text class="empty-text">{{ text || '暂无数据' }}</text>
    </view>
  </view>
</template>

<script>
export default {
  name: "LoadingState",
  props: {
    // 是否显示
    visible: {
      type: Boolean,
      default: false
    },
    // 类型：skeleton, loading, error, empty
    type: {
      type: String,
      default: 'loading'
    },
    // 显示文本
    text: {
      type: String,
      default: ''
    },
    // 骨架屏数量
    count: {
      type: Number,
      default: 3
    },
    // 是否显示重试按钮
    showRetry: {
      type: Boolean,
      default: true
    }
  }
}
</script>

<style lang="scss" scoped>
.loading-state {
  width: 100%;
  padding: 40rpx 32rpx;
}

// 骨架屏样式
.skeleton-container {
  .skeleton-item {
    margin-bottom: 32rpx;
    
    &:last-child {
      margin-bottom: 0;
    }
  }
  
  .skeleton-line {
    height: 32rpx;
    background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: skeleton-loading 1.5s infinite;
    border-radius: 4rpx;
    margin-bottom: 16rpx;
    
    &.skeleton-title {
      height: 40rpx;
      width: 60%;
    }
    
    &.skeleton-text {
      width: 100%;
      
      &.short {
        width: 40%;
        margin-bottom: 0;
      }
    }
  }
}

@keyframes skeleton-loading {
  0% {
    background-position: -200% 0;
  }
  100% {
    background-position: 200% 0;
  }
}

// 加载中样式
.loading-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200rpx;
  
  .loading-spinner {
    width: 60rpx;
    height: 60rpx;
    border: 4rpx solid #e0e0e0;
    border-top: 4rpx solid #1976d2;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16rpx;
  }
  
  .loading-text {
    color: #666;
    font-size: 28rpx;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}

// 错误状态样式
.error-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200rpx;
  
  .error-icon {
    font-size: 80rpx;
    margin-bottom: 16rpx;
  }
  
  .error-text {
    color: #666;
    font-size: 28rpx;
    margin-bottom: 24rpx;
  }
  
  .retry-btn {
    padding: 16rpx 32rpx;
    background: #1976d2;
    color: #fff;
    border: none;
    border-radius: 8rpx;
    font-size: 26rpx;
  }
}

// 空数据状态样式
.empty-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 200rpx;
  
  .empty-icon {
    font-size: 80rpx;
    margin-bottom: 16rpx;
  }
  
  .empty-text {
    color: #666;
    font-size: 28rpx;
  }
}
</style>