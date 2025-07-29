<template>
  <view class="stock-detail">
    <view class="detail-grid">
      <view class="detail-item">
        <text class="label">今开</text>
        <text class="value">{{ formatPrice(quoteData.open) }}</text>
      </view>
      <view class="detail-item">
        <text class="label">昨收</text>
        <text class="value">{{ formatPrice(quoteData.close) }}</text>
      </view>
      <view class="detail-item">
        <text class="label">成交量</text>
        <text class="value">{{ formatVolume(quoteData.volume) }}</text>
      </view>
      <view class="detail-item">
        <text class="label">成交额</text>
        <text class="value">{{ formatAmount(quoteData.amount) }}</text>
      </view>
      <view class="detail-item">
        <text class="label">涨跌额</text>
        <text class="value" :class="getPriceClass()">{{ formatPrice(quoteData.updown) }}</text>
      </view>
      <view class="detail-item">
        <text class="label">涨跌幅</text>
        <text class="value" :class="getPriceClass()">{{ formatPercent(quoteData.percent) }}</text>
      </view>
      <view class="detail-item">
        <text class="label">最高</text>
        <text class="value">{{ formatPrice(quoteData.high) }}</text>
      </view>
      <view class="detail-item">
        <text class="label">最低</text>
        <text class="value">{{ formatPrice(quoteData.low) }}</text>
      </view>
      <view class="detail-item">
        <text class="label">振幅</text>
        <text class="value">{{ quoteData.amplitude ? quoteData.amplitude.toFixed(2) + '%' : '--' }}</text>
      </view>
      <view class="detail-item">
        <text class="label">市盈率</text>
        <text class="value">{{ quoteData.pe ? quoteData.pe.toFixed(1) : '--' }}</text>
      </view>
      <view class="detail-item">
        <text class="label">总市值</text>
        <text class="value">{{ formatMarketValue(quoteData.total_mv) }}</text>
      </view>
      <view class="detail-item" v-if="stock.remark">
        <text class="label">备注</text>
        <text class="value">{{ stock.remark }}</text>
      </view>
    </view>
    
    <!-- K线图区域 -->
    <view class="kline-section">
      <KLineChart :stockCode="stock.stock_code || stockCode" :height="380" />
    </view>
  </view>
</template>

<script>
import StockApi from '@/utils/stockApi.js'
import KLineChart from '@/components/KLineChart.vue'

export default {
  name: "StockDetail",
  components: {
    KLineChart
  },
  props: {
    stock: { type: Object, required: true },
    stockCode: { type: String, default: '' }
  },
  data() {
    return {
      klineData: [],
      klineQuoteData: null // 从K线数据提取的行情信息
    }
  },
  computed: {
    // 显示用的股票名称
    displayName() {
      return this.stock.name || this.stock.stock_name || '--'
    },
    
    // 显示用的股票代码（纯数字）
    displayCode() {
      // 优先使用已处理的code字段，否则从stock_code中提取
      if (this.stock.code) {
        // 移除.和后面的内容（美股常见格式如 AAPL.US）
        return this.stock.code.split('.')[0]
      }
      if (this.stock.stock_code) {
        // 移除前缀和.后缀
        return this.stock.stock_code.replace(/^(sh|sz|hk|us)/, '').split('.')[0]
      }
      if (this.stockCode) {
        return this.stockCode.replace(/^(sh|sz|hk|us)/, '').split('.')[0]
      }
      return '--'
    },
    
    // 行情数据
    quoteData() {
      return this.stock.quote || this.klineQuoteData || {}
    },
    
    // 判断是否是美股
    isUSStock() {
      const stockCode = this.stock.stock_code || this.stockCode || ''
      return stockCode.toUpperCase().startsWith('US') || stockCode.match(/^[A-Z]+$/)
    }
  },
  methods: {
    
    // 格式化价格
    formatPrice(price) {
      return StockApi.formatPrice(price)
    },
    
    // 格式化百分比
    formatPercent(percent) {
      return StockApi.formatPercent(percent)
    },
    
    // 格式化成交量
    formatVolume(volume) {
      return StockApi.formatVolume(volume)
    },
    
    // 格式化成交额
    formatAmount(amount) {
      if (!amount) return '--'
      
      if (amount >= 100000000) {
        return (amount / 100000000).toFixed(2) + '亿'
      } else if (amount >= 10000) {
        return (amount / 10000).toFixed(2) + '万'
      } else {
        return amount.toFixed(2)
      }
    },
    
    // 格式化市值
    formatMarketValue(value) {
      if (!value) return '--'
      
      if (value >= 10000) {
        return (value / 10000).toFixed(0) + '亿'
      } else {
        return value.toFixed(0) + '万'
      }
    },
    
    // 获取价格样式类
    getPriceClass() {
      const percent = this.quoteData.percent
      if (!percent && percent !== 0) return ''
      return percent > 0 ? 'price-up' : (percent < 0 ? 'price-down' : '')
    }
  }
}
</script>

<style lang="scss" scoped>
.stock-detail {
  background: #f9f9fb;
  border-radius: 16rpx;
  margin: 16rpx 0 0 0;
  padding: 24rpx;
  font-size: 28rpx;
}

.detail-header {
  font-weight: bold;
  font-size: 32rpx;
  color: #333;
  margin-bottom: 24rpx;
  text-align: center;
}

.detail-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20rpx 32rpx;
  margin-bottom: 32rpx;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  
  .label {
    font-size: 26rpx;
    color: #666;
    flex-shrink: 0;
  }
  
  .value {
    font-size: 28rpx;
    color: #333;
    font-weight: 500;
    text-align: right;
    
    &.price-up {
      color: #e53935;
    }
    
    &.price-down {
      color: #388e3c;
    }
  }
}

.kline-section {
  .section-title {
    font-size: 30rpx;
    font-weight: bold;
    color: #333;
    margin-bottom: 16rpx;
  }
}
</style>