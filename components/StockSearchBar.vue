<template>
  <view class="stock-search-bar">
    <input class="search-input" v-model="keyword" placeholder="搜索股票代码/名称" @input="onInput" />
    <view v-if="showDropdown" class="search-dropdown">
      <view v-for="(item, idx) in searchResults" :key="item.fullcode" class="dropdown-item" @click="onSelect(item)">
        <view class="stock-info">
          <text class="stock-name">{{ item.name }}</text>
          <text class="stock-code">{{ item.code }}</text>
        </view>
        <text class="stock-market">{{ item.market }}</text>
      </view>
    </view>
  </view>
</template>

<script>
import StockApi from '@/utils/stockApi.js'

export default {
  name: "StockSearchBar",
  data() {
    return {
      keyword: '',
      searchResults: [],
      showDropdown: false,
      searchTimer: null
    }
  },
  methods: {
    onInput(e) {
      this.keyword = e.detail.value
      
      // 清除之前的搜索定时器
      if (this.searchTimer) {
        clearTimeout(this.searchTimer)
      }
      
      if (this.keyword.trim().length > 0) {
        // 先显示测试数据
        if (this.keyword.trim() === 'test') {
          this.searchResults = [
            { name: '测试股票1', code: '000001', fullcode: 'sz000001', market: '深圳' },
            { name: '测试股票2', code: '600000', fullcode: 'sh600000', market: '上海' }
          ]
          this.showDropdown = true
          return
        }
        
        // 延迟搜索，避免频繁请求
        this.searchTimer = setTimeout(() => {
          this.searchStock()
        }, 300)
      } else {
        this.showDropdown = false
        this.searchResults = []
      }
    },
    
    // 搜索股票
    async searchStock() {
      if (!this.keyword.trim()) return
      
      try {
        // 开始搜索股票
        
        // 直接调用腾讯财经搜索API
        const res = await uni.request({
          url: `https://smartbox.gtimg.cn/s3/?t=all&q=${encodeURIComponent(this.keyword.trim())}`,
          method: 'GET'
        })
        
        // API原始返回数据已接收
        
        if (res.statusCode === 200 && res.data) {
          const results = this.parseSearchResult(res.data)
          // 解析后结果已获取
          
          this.searchResults = results.slice(0, 10) // 最多显示10个结果
          this.showDropdown = this.searchResults.length > 0
          
          // 设置下拉状态
        } else {
          this.searchResults = []
          this.showDropdown = false
        }
      } catch (error) {
        console.error('搜索股票失败:', error)
        this.searchResults = []
        this.showDropdown = false
      }
    },
    
    // 解析搜索结果 - 按照新的解析规则
    parseSearchResult(data) {
      if (!data || typeof data !== 'string') {
        // 数据为空或非字符串
        return []
      }
      
      try {
        // 开始解析数据
        
        // 第一步：截取双引号里面的内容
        const quotesMatch = data.match(/"([^"]+)"/);
        if (!quotesMatch) {
          // 未找到双引号内容
          return []
        }
        
        const quotedContent = quotesMatch[1]
        // 双引号内容已提取
        
        // 第二步：用-进行字符串分割，得到每个股票的数据字符串
        const stockDataList = quotedContent.split('^')
        // 按-分割后的股票数据已获取
        
        const stocks = []
        
        // 第三步：对每个股票字符串用~进行分割
        stockDataList.forEach((stockDataStr, index) => {
          if (!stockDataStr.trim()) return
          
          // 处理股票数据
          
          const fields = stockDataStr.split('~')
          // 字段分割结果已获取
          
          if (fields.length >= 3) {
            const marketCode = fields[0]      // 第一个字段：市场代码 (sz/sh/hk/us)
            const stockCode = fields[1]       // 第二个字段：股票代码
            const unicodeName = fields[2]     // 第三个字段：Unicode编码的股票名称
            
            // 检查数据有效性
            if (marketCode && stockCode && unicodeName) {
              // 拼接完整股票代码
              const fullcode = marketCode + stockCode
              
              // 解码Unicode股票名称
              const stockName = this.decodeUnicodeName(unicodeName)
              
              // 获取市场名称
              const marketName = this.getMarketName(marketCode)
              
              stocks.push({
                code: stockCode,
                name: stockName,
                fullcode: fullcode,
                market: marketName
              })
              
              // 解析完成
            }
          }
        })
        
        // 最终解析结果已获取
        return stocks
        
      } catch (error) {
        console.error('解析搜索结果失败:', error)
        return []
      }
    },
    
    // 解码Unicode编码的股票名称
    decodeUnicodeName(unicodeName) {
      try {
        // 如果包含Unicode编码（如\u4E2D\u56FD），则进行解码
        if (unicodeName.includes('\\u')) {
          return unicodeName.replace(/\\u[\dA-Fa-f]{4}/g, (match) => {
            return String.fromCharCode(parseInt(match.replace(/\\u/g, ''), 16))
          })
        }
        // 如果已经是中文，直接返回
        return unicodeName
      } catch (error) {
        console.error('Unicode解码失败:', error, unicodeName)
        return unicodeName
      }
    },
    
    // 获取市场名称
    getMarketName(marketCode) {
      switch (marketCode) {
        case 'sh': return '上海'
        case 'sz': return '深圳'
        case 'hk': return '香港'
        case 'us': return '美股'
        default: return '未知'
      }
    },
    
    onSelect(item) {
      this.$emit('select', item)
      this.keyword = ''
      this.showDropdown = false
      this.searchResults = []
    }
  }
}
</script>

<style lang="scss" scoped>
.stock-search-bar {
  position: relative;
  margin-top: 32rpx;
}

.search-input {
  width: 100%;
  padding: 16rpx 24rpx;
  border: 1px solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 30rpx;
  background: #fff;
}

.search-dropdown {
  position: absolute;
  left: 0; 
  right: 0; 
  top: 80rpx;
  z-index: 999;
  background: #fff;
  border: 1px solid #e0e0e0;
  border-radius: 8rpx;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-height: 400rpx;
  overflow-y: auto;
}

.dropdown-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18rpx 24rpx;
  border-bottom: 1rpx solid #f5f5f5;
  
  &:last-child {
    border-bottom: none;
  }
  
  &:active {
    background: #f5faff;
  }
  
  .stock-info {
    flex: 1;
    
    .stock-name {
      display: block;
      font-size: 30rpx;
      color: #333;
      margin-bottom: 4rpx;
    }
    
    .stock-code {
      display: block;
      font-size: 26rpx;
      color: #666;
    }
  }
  
  .stock-market {
    font-size: 24rpx;
    color: #1976d2;
    padding: 4rpx 12rpx;
    background: #e3f2fd;
    border-radius: 12rpx;
  }
}
</style>