<template>
  <view class="kline-chart-container">
    <!-- 周期选择器 -->
    <view class="period-selector">
      <view 
        v-for="period in periods" 
        :key="period.value"
        :class="['period-item', { active: currentPeriod === period.value }]"
        @tap="changePeriod(period.value)"
      >
        {{ period.label }}
      </view>
      <!-- 调试控制器（可选，用于开发调试） -->
      <view class="debug-controls" v-if="currentPeriod !== 'minute'">
        <text class="current-count">{{ currentVisibleCount }}根</text>
        <button class="zoom-btn" @tap="manualZoom(-5)">-</button>
        <button class="zoom-btn" @tap="manualZoom(5)">+</button>
      </view>
    </view>
    
    <!-- 图表容器 -->
    <view class="chart-container" v-if="!loading && klineData.length" @wheel.prevent="onWheel">
      <!-- 十字线信息显示在顶部一行 -->
      <view v-if="showCrosshair && crosshairData" class="crosshair-info-top">
        <view class="info-content">
          <template v-if="currentPeriod === 'minute'">
            <text class="info-item">时间: {{ formatCrosshairTime(crosshairData.time) }}</text>
            <text class="info-item">价格: {{ formatPrice(crosshairData.price) }}</text>
            <text class="info-item" :class="getPriceChangeClass(crosshairData.price)">幅: {{ formatPriceChange(crosshairData.price) }}</text>
          </template>
          <template v-else>
            <text class="info-item">{{ formatCrosshairDate(crosshairData.date) }}</text>
            <text class="info-item">开: {{ formatPrice(crosshairData.open) }}</text>
            <text class="info-item">收: {{ formatPrice(crosshairData.close) }}</text>
            <text class="info-item" :class="getPriceChangeClass(crosshairData.close, crosshairData.open)">幅: {{ formatKlinePriceChange(crosshairData) }}</text>
          </template>
        </view>
      </view>
      
      <canvas 
        class="chart-canvas" 
        id="kline-chart"
        type="2d"
        :disable-scroll="false"
        :style="`width: ${canvasWidth}px; height: ${canvasHeight}px;`"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
        @wheel.prevent="onWheel"
      ></canvas>
    </view>
    
    <!-- 加载状态 -->
    <view v-else-if="loading" class="loading-container">
      <view class="loading-spinner"></view>
      <text class="loading-text">加载K线数据中...</text>
    </view>
    
    <!-- 错误状态 -->
    <view v-else-if="errorMessage" class="error-container">
      <text class="error-text">{{ errorMessage }}</text>
      <button class="retry-btn" @tap="loadKlineData">重试</button>
    </view>
    
    <!-- 无数据状态 -->
    <view v-else class="no-data-container">
      <text class="no-data-text">暂无K线数据</text>
    </view>
  </view>
</template>

<script>
import StockApi from '@/utils/stockApi.js'

export default {
  name: "KLineChart",
  props: {
    stockCode: {
      type: String,
      required: true
    },
    height: {
      type: Number,
      default: 300
    }
  },
  data() {
    return {
      klineData: [], // K线数据
      loading: true, // 加载状态
      errorMessage: '', // 错误信息
      currentPeriod: 'minute', // 当前周期 minute/day/week/month
      periods: [
        { label: '分时', value: 'minute' },
        { label: '日K', value: 'day' },
        { label: '周K', value: 'week' },
        { label: '月K', value: 'month' }
      ],
      // 画布尺寸
      canvasWidth: 0,
      canvasHeight: 300,
      // 触摸和拖拽相关
      isDragging: false,
      startX: 0,
      startY: 0,
      translateX: 0,
      visibleCount: 50, // 可见的K线数量（日K线默认）
      isDrawing: false, // 防止重复绘制
      lastDrawnDataLength: 0, // 记录上次绘制的数据长度
      lastDrawnPeriod: '', // 记录上次绘制的周期
      // 十字线相关
      showCrosshair: false,
      crosshairX: 0,
      crosshairY: 0,
      crosshairDataIndex: -1,
      crosshairData: null,
      // 昨收价
      yesterdayClosePrice: 0,
      // 双击检测
      lastTapTime: 0,
      tapTimeout: null,
      // 分时图定时刷新
      minuteRefreshTimer: null,
      // 市场状态检查
      lastMarketCheck: 0,
      // 刷新错误计数
      refreshErrorCount: 0,
      // 防重复加载
      loadKlineDataTimer: null, // 防抖定时器
      currentLoadingPeriod: '', // 当前正在加载的周期
      lastSuccessfulLoadKey: '', // 上次成功加载的key（stockCode + period）
      loadRetryCount: 0, // 加载重试次数
      maxRetryCount: 3, // 最大重试次数
      loadFailedPeriods: new Set(), // 记录加载失败的周期
      // Canvas 2D 相关
      canvas2D: null,
      ctx2D: null,
      // 防重复绘制的优化
      lastDrawTimestamp: 0,
      drawThrottleDelay: 30, // 调整节流延迟到30ms以平衡性能和流畅度
      // 绘制优化已简化，移除复杂的key检查
      // Canvas初始化状态
      canvasInitializing: false, // 新增：防止重复初始化
      // 防止initChart重复执行
      chartInitialized: false,
      // 防止initChart内部的setTimeout重复执行
      initChartTimeout: null,
      // 缩放功能相关
      currentVisibleCount: 50, // 当前可见的K线数量（动态调整）
      isZooming: false, // 是否正在缩放
      lastDistance: 0, // 上次双指间距离
      zoomStartDistance: 0, // 缩放开始时的双指距离
      zoomStartVisibleCount: 50, // 缩放开始时的可见数量
      zoomThrottleTimer: null, // 缩放节流定时器
      // 缩放边界设置
      minVisibleCount: 30, // 最小显示数量（动态设置为当前周期的默认值）
      maxVisibleCount: 200, // 最大显示数量
      // 缩放敏感度设置
      wheelZoomStep: 3, // 滚轮每次缩放的步长
      touchZoomSensitivity: 0.5, // 触摸缩放敏感度
      lastWheelDirection: 1, // 用于交替滚轮方向的变量
    }
  },
  mounted() {
    if (!this.stockCode) {
      this.errorMessage = '股票代码为空'
      return
    }
    
    // 强制清除Vue组件缓存，确保代码更新生效
    this.$forceUpdate()
    
    // 确保组件挂载后加载数据
    this.$nextTick(() => {
      this.initChart()
      // 直接调用加载数据方法，确保即使在特定条件下也能加载数据
      setTimeout(() => {
        if (this.loading && !this.klineData.length) {
          this.loadKlineData()
        }
      }, 200)
    })
    
    // 添加调试信息
    // K线图组件已挂载
  },
  beforeDestroy() {
    this.stopMinuteRefresh()
    if (this.loadKlineDataTimer) {
      clearTimeout(this.loadKlineDataTimer)
      this.loadKlineDataTimer = null
    }
    if (this.initChartTimeout) {
      clearTimeout(this.initChartTimeout)
      this.initChartTimeout = null
    }
    // 清理缩放相关定时器
    if (this.zoomThrottleTimer) {
      clearTimeout(this.zoomThrottleTimer)
      this.zoomThrottleTimer = null
    }
  },
  beforeUnmount() {
    // Vue 3 兼容性
    this.stopMinuteRefresh()
    if (this.loadKlineDataTimer) {
      clearTimeout(this.loadKlineDataTimer)
      this.loadKlineDataTimer = null
    }
    if (this.initChartTimeout) {
      clearTimeout(this.initChartTimeout)
      this.initChartTimeout = null
    }
    // 清理缩放相关定时器
    if (this.zoomThrottleTimer) {
      clearTimeout(this.zoomThrottleTimer)
      this.zoomThrottleTimer = null
    }
  },
  deactivated() {
    // keep-alive 组件失活时停止定时器
    this.stopMinuteRefresh()
  },
  activated() {
    // keep-alive 组件激活时，如果是分时图则恢复定时器
    if (this.currentPeriod === 'minute' && this.klineData.length > 0) {
      this.startMinuteRefresh()
    }
  },
  watch: {
    stockCode(newCode, oldCode) {
      if (newCode && newCode !== oldCode) {
        this.stopMinuteRefresh()
        
        if (this.loadKlineDataTimer) {
          clearTimeout(this.loadKlineDataTimer)
          this.loadKlineDataTimer = null
        }
        
        this.lastSuccessfulLoadKey = ''
        
        this.loadKlineDataTimer = setTimeout(() => {
          this.loadKlineData()
        }, 100)
      }
    }
  },
  methods: {
    // 鼠标滚轮缩放事件处理
    onWheel(e) {
      // 强制阻止页面滚动
      e.preventDefault()
      e.stopPropagation()
      
      // 只在非分时图模式下支持缩放
      if (this.currentPeriod === 'minute') {
        return false
      }
      
      // 检查是否有K线数据
      if (!this.klineData.length) {
        return false
      }
      
      // 获取滚轮方向 - 兼容不同浏览器和环境
      let delta = 0
      
      // 尝试多种可能的属性
      if (e.deltaY !== undefined && e.deltaY !== null && !isNaN(e.deltaY)) {
        delta = e.deltaY
      } else if (e.wheelDelta !== undefined && e.wheelDelta !== null && !isNaN(e.wheelDelta)) {
        delta = -e.wheelDelta // wheelDelta方向相反
      } else if (e.detail !== undefined && e.detail !== null && !isNaN(e.detail) && typeof e.detail === 'number') {
        delta = e.detail * 40 // Firefox
      } else if (e.wheelDeltaY !== undefined && e.wheelDeltaY !== null && !isNaN(e.wheelDeltaY)) {
        delta = -e.wheelDeltaY
      } else if (e.wheelDeltaX !== undefined && e.wheelDeltaX !== null && !isNaN(e.wheelDeltaX)) {
        delta = -e.wheelDeltaX
      } else {
        // 尝试从嵌套对象中获取
        if (typeof e.detail === 'object' && e.detail !== null) {
          if (e.detail.deltaY !== undefined && !isNaN(e.detail.deltaY)) {
            delta = e.detail.deltaY
          } else if (e.detail.wheelDelta !== undefined && !isNaN(e.detail.wheelDelta)) {
            delta = -e.detail.wheelDelta
          }
        }
        
        // 最终备用方案：使用交替方向（适用于无法检测滚轮方向的环境）
        if (delta === 0 || isNaN(delta)) {
          // 使用交替机制确保可以双向缩放
          if (!this.lastWheelDirection) {
            this.lastWheelDirection = 1
          }
          this.lastWheelDirection *= -1  // 交替方向
          delta = this.lastWheelDirection * 100
        }
      }
      
      let newVisibleCount = this.currentVisibleCount
      
      if (delta > 0) {
        // 向下滚动，增加显示数量（缩小K线）
        newVisibleCount += this.wheelZoomStep
      } else if (delta < 0) {
        // 向上滚动，减少显示数量（放大K线）
        newVisibleCount -= this.wheelZoomStep
      } else {
        return false
      }
      
      // 应用边界限制
      newVisibleCount = Math.max(this.minVisibleCount, Math.min(this.maxVisibleCount, newVisibleCount))
      
      // 如果数量没有变化，不需要重绘
      if (newVisibleCount === this.currentVisibleCount) {
        return false
      }
      
      // 调用统一的缩放处理方法
      this.handleZoomScale(newVisibleCount, 'wheel')
      
      return false
    },
    
    // 统一的缩放处理方法
    handleZoomScale(newVisibleCount, source = 'unknown') {
      // 边界检查和数据验证
      if (!this.klineData.length) {
        return
      }
      
      // 应用边界限制
      const validCount = Math.max(
        this.minVisibleCount, 
        Math.min(this.maxVisibleCount, Math.min(newVisibleCount, this.klineData.length))
      )
      
      // 检查是否真的需要更新
      if (validCount === this.currentVisibleCount) {
        return
      }
      
      // 更新当前可见数量
      this.currentVisibleCount = validCount
      
      // 根据来源选择不同的重绘策略
      if (source === 'wheel') {
        // 滚轮缩放：立即重绘
        if (!this.isDrawing) {
          this.drawChartSafely()
        }
      } else if (source === 'touch') {
        // 触摸缩放：已在onTouchMove中处理节流
        // 这里不需要额外操作
      } else {
        // 其他来源：使用节流重绘
        if (this.zoomThrottleTimer) {
          clearTimeout(this.zoomThrottleTimer)
        }
        this.zoomThrottleTimer = setTimeout(() => {
          if (!this.isDrawing && this.klineData.length > 0) {
            this.drawChartSafely()
          }
        }, 16)
      }
    },
    
    // 手动缩放方法（用于调试）
    manualZoom(step) {
      const newCount = this.currentVisibleCount + step
      this.handleZoomScale(newCount, 'manual')
    },
    
    // 计算两点间距离（用于双指缩放）
    calculateDistance(touch1, touch2) {
      const dx = touch1.x - touch2.x
      const dy = touch1.y - touch2.y
      return Math.sqrt(dx * dx + dy * dy)
    },
    
    // 检测是否为双指手势
    isTwoFingerGesture(touches) {
      return touches && touches.length === 2
    },
    
    // 获取Canvas 2D上下文
    async getCanvasContext() {
      if (!this.canvasWidth || !this.canvasHeight) {
        return null
      }
      
      if (this.canvas2D && this.ctx2D) {
        return {
          ctx: this.ctx2D,
          canvas: this.canvas2D,
          width: this.canvasWidth,
          height: this.canvasHeight
        }
      }
      
      try {
        const canvasInfo = await this.initCanvas2D()
        return canvasInfo
      } catch (error) {
        console.error('Canvas 2D初始化失败:', error)
        return null
      }
    },
    
    // 初始化Canvas 2D API（带重试机制）
    async initCanvas2D(retryCount = 0) {
      const maxRetries = 3
      const retryDelay = 200 + (retryCount * 100) // 递增延迟
      
      return new Promise((resolve, reject) => {
        this.$nextTick(() => {
          setTimeout(() => {
            const query = uni.createSelectorQuery().in(this)
            query.select('#kline-chart')
              .fields({ node: true, size: true })
              .exec((res) => {
                if (res && res[0] && res[0].node) {
                  const canvas = res[0].node
                  const ctx = canvas.getContext('2d')
                  
                  if (ctx) {
                    try {
                      const dpr = uni.getSystemInfoSync().pixelRatio || 1
                      canvas.width = this.canvasWidth * dpr
                      canvas.height = this.canvasHeight * dpr
                      
                      ctx.scale(dpr, dpr)
                      
                      this.canvas2D = canvas
                      this.ctx2D = ctx
                      
                      resolve({
                        ctx,
                        canvas,
                        width: this.canvasWidth,
                        height: this.canvasHeight,
                        dpr
                      })
                    } catch (error) {
                      console.error('Canvas 2D上下文设置失败:', error)
                      if (retryCount < maxRetries) {
                        setTimeout(() => {
                          this.initCanvas2D(retryCount + 1).then(resolve).catch(reject)
                        }, retryDelay)
                      } else {
                        reject(error)
                      }
                    }
                  } else {
                    console.warn('无法获取Canvas 2D上下文，重试中...')
                    if (retryCount < maxRetries) {
                      setTimeout(() => {
                        this.initCanvas2D(retryCount + 1).then(resolve).catch(reject)
                      }, retryDelay)
                    } else {
                      reject(new Error('无法获取Canvas 2D上下文'))
                    }
                  }
                } else {
                  console.warn(`Canvas节点获取失败，重试次数: ${retryCount}/${maxRetries}`)
                  if (retryCount < maxRetries) {
                    setTimeout(() => {
                      this.initCanvas2D(retryCount + 1).then(resolve).catch(reject)
                    }, retryDelay)
                  } else {
                    reject(new Error('无法获取Canvas 2D节点'))
                  }
                }
              })
          }, retryDelay)
        })
      })
    },
    
    // 节流绘制方法
    throttledDraw() {
      const now = Date.now()
      if (now - this.lastDrawTimestamp < this.drawThrottleDelay) {
        return
      }
      this.lastDrawTimestamp = now
      
      if (!this.isDrawing) {
        // 微信小程序环境使用相应的API
        const raf = uni.requestAnimationFrame || ((callback) => setTimeout(callback, 16));
        raf(() => {
          this.drawChart()
        })
      }
    },
    
    // 强制绘制方法（用于调试）
    forceDrawChart() {
      // 重置所有绘制状态
      this.isDrawing = false
      this.lastDrawTimestamp = 0
      
      if (this.klineData.length > 0 && this.canvasWidth > 0 && this.canvasHeight > 0) {
        this.drawChart()
      }
    },

    // 安全绘制方法
    drawChartSafely() {
      if (this.isDrawing) {
        return
      }
      
      if (!this.klineData.length) {
        return
      }
      
      if (!this.canvasWidth || !this.canvasHeight) {
        return
      }
      
      // 如果Canvas上下文不存在且没有正在初始化，则开始初始化
      if (!this.canvas2D || !this.ctx2D) {
        if (!this.canvasInitializing) {
          this.canvasInitializing = true
          this.initCanvas2D().then(() => {
            this.canvasInitializing = false
            if (!this.isDrawing && this.klineData.length > 0) {
              this.throttledDraw()
            }
          }).catch(error => {
            this.canvasInitializing = false
            console.error('Canvas初始化失败，跳过绘制:', error)
          })
        }
        return
      }
      
      // 如果显示十字线，直接调用绘制方法
      if (this.showCrosshair) {
        this.drawChart()
      } else {
        this.throttledDraw()
      }
    },
    
    // 计算最优画布高度
    calculateOptimalHeight() {
      const topPadding = 20
      const mainChartHeight = 220 // 主图表固定高度
      
      if (this.currentPeriod === 'minute') {
        // 分时图：主图 + 时间标签空间
        const bottomPadding = 40
        return topPadding + mainChartHeight + bottomPadding
      } else {
        // K线图：主图 + 成交量图 + 间隔（移除了时间标签空间）
        const volumeChartHeight = 35
        const volumeGap = 20
        const extraSpace = 10 // 少量额外空间
        const bottomPadding = volumeGap + volumeChartHeight + extraSpace
        return topPadding + mainChartHeight + bottomPadding
      }
    },
    
    // 初始化图表
    initChart() {
      if (this.chartInitialized) {
        return
      }
      
      const systemInfo = uni.getSystemInfoSync()
      const screenWidth = systemInfo.screenWidth || 375
      
      // K线图初始化调试信息
      
      // 立即标记为初始化中，防止重复调用
      this.chartInitialized = true
      
      // 使用完整屏幕宽度，预留价格标签显示空间
      const width = screenWidth - 8  // 预留8px空间确保价格标签不被遮挡
      const height = this.calculateOptimalHeight()
      
      // 计算的画布尺寸
      
      this.canvasWidth = width
      this.canvasHeight = height
      
      // 设置后的画布尺寸
      
      // 清除之前的定时器，防止重复执行
      if (this.initChartTimeout) {
        clearTimeout(this.initChartTimeout)
        this.initChartTimeout = null
      }
      
      // 使用requestAnimationFrame替代setTimeout以提高性能
      this.initChartTimeout = setTimeout(() => {
        if (!this.klineData.length && this.loading) {
          this.loadKlineData()
        } else if (this.klineData.length > 0 && this.canvasWidth > 0) {
          if (!this.isDrawing) {
            this.drawChartSafely()
          }
        } else if (!this.klineData.length && !this.loading) {
          // 如果没有数据且未在加载状态，则尝试加载数据
          this.loadKlineData()
        }
        this.initChartTimeout = null // 清除引用
      }, 100) // 减少延迟时间以提高响应速度
    },
    
    // 加载K线数据（带防抖和重复请求检查）
    async loadKlineData() {
      if (!this.stockCode) {
        this.errorMessage = '股票代码为空'
        this.loading = false
        return
      }
      
      // 创建当前请求的唯一key
      const currentLoadKey = `${this.stockCode}_${this.currentPeriod}`
      
      // 检查是否已经加载失败超过最大重试次数
      if (this.loadFailedPeriods.has(currentLoadKey)) {
        this.errorMessage = `${this.getPeriodName()}数据加载失败，已停止重试`
        this.loading = false
        return
      }
      
      // 设置加载状态
      this.loading = true
      this.currentLoadingPeriod = this.currentPeriod
      this.errorMessage = ''
      
      try {
        let data = []
        
        if (this.currentPeriod === 'minute') {
          // 获取分时数据
          data = await StockApi.getMinuteData(this.stockCode)
        } else {
          // 获取K线数据 - 根据周期调整数据量
          let count = 200 // 默认200条
          switch (this.currentPeriod) {
            case 'day':
              count = 120 // 日K线显示4个月数据
              break
            case 'week':
              count = 100 // 周K线显示2年数据
              break
            case 'month':
              count = 60  // 月K线显示5年数据
              break
          }
          
          data = await StockApi.getKlineData(this.stockCode, this.currentPeriod, count)
        }
        
        this.klineData = data || []
        
        if (this.klineData.length === 0) {
          throw new Error(`暂无${this.getPeriodName()}数据`)
        } else {
          // 重置绘制状态，确保能够重新绘制
          this.lastDrawnDataLength = 0
          this.lastDrawnPeriod = ''
          this.isDrawing = false
          // 绘制状态已重置
          
          // 验证数据有效性
          if (this.validateKlineData()) {
            // 加载成功，重置重试计数和记录成功加载的key
            this.loadRetryCount = 0
            this.lastSuccessfulLoadKey = currentLoadKey
            
            // 等待下一个tick确保DOM和canvas完全就绪后再绘制
            this.$nextTick(() => {
              setTimeout(() => {
                if (!this.isDrawing && this.klineData.length > 0) {
                  this.drawChartSafely()
                }
              }, 50)
            })
            
            // 如果是分时图，启动定时刷新
            if (this.currentPeriod === 'minute') {
              this.startMinuteRefresh()
            }
          } else {
            throw new Error(`${this.getPeriodName()}数据格式错误`)
          }
        }
        
      } catch (error) {
        this.loadRetryCount++
        
        // 检查是否达到最大重试次数
        if (this.loadRetryCount >= this.maxRetryCount) {
          this.loadFailedPeriods.add(currentLoadKey)
          this.errorMessage = error.message || `${this.getPeriodName()}数据加载失败，已停止重试`
          this.loadRetryCount = 0 // 重置计数器，为下次切换做准备
        } else {
          this.errorMessage = error.message || `${this.getPeriodName()}数据加载失败，正在重试(${this.loadRetryCount}/${this.maxRetryCount})`
        }
        
        this.klineData = []
      } finally {
        this.loading = false
        this.currentLoadingPeriod = ''
      }
    },
    
    // 获取周期名称
    getPeriodName() {
      switch (this.currentPeriod) {
        case 'minute': return '分时'
        case 'day': return '日K'
        case 'week': return '周K'
        case 'month': return '月K'
        default: return 'K线'
      }
    },
    
    // 验证K线数据有效性
    validateKlineData() {
      if (!this.klineData || this.klineData.length === 0) {
        return false
      }
      
      // 验证K线数据
      
      for (let i = 0; i < Math.min(3, this.klineData.length); i++) {
        const item = this.klineData[i]
        if (!item) {
          console.warn(`第${i}条数据为空`)
          return false
        }
        
        if (this.currentPeriod === 'minute') {
          if (!item.time || typeof item.price !== 'number' || item.price <= 0) {
            console.warn(`第${i}条分时数据验证失败:`, item)
            return false
          }
        } else {
          // K线数据验证
          if (!item.date || 
              typeof item.open !== 'number' || 
              typeof item.close !== 'number' || 
              typeof item.high !== 'number' || 
              typeof item.low !== 'number' ||
              item.open <= 0 || item.close <= 0 || item.high <= 0 || item.low <= 0) {
            console.warn(`第${i}条K线数据基础验证失败:`, item)
            return false
          }
          
          // 更宽松的逻辑验证：最高价应该 >= 开盘价和收盘价，最低价应该 <= 开盘价和收盘价
          if (item.high < item.open || item.high < item.close || 
              item.low > item.open || item.low > item.close) {
            console.warn(`第${i}条K线数据逻辑验证失败:`, {
              数据: item,
              问题: `high(${item.high}) low(${item.low}) open(${item.open}) close(${item.close})`
            })
            return false
          }
        }
      }
      
      // K线数据验证通过
      return true
    },
    
    // 获取当前周期的可见数量
    getVisibleCount() {
      // 分时图不支持缩放，始终显示全部数据
      if (this.currentPeriod === 'minute') {
        return this.klineData.length
      }
      
      // K线图使用动态可见数量，但不能超过实际数据长度
      return Math.min(this.currentVisibleCount, this.klineData.length)
    },
    
    // 切换周期
    changePeriod(period) {
      if (this.currentPeriod === period) {
        return
      }
      
      if (this.loadKlineDataTimer) {
        clearTimeout(this.loadKlineDataTimer)
        this.loadKlineDataTimer = null
      }
      
      this.stopMinuteRefresh()
      
      this.showCrosshair = false
      this.crosshairData = null
      this.lastTapTime = 0
      
      this.currentPeriod = period
      this.canvasHeight = this.calculateOptimalHeight()
      this.klineData = []
      
      // 重置为每个周期的默认可见数量，并设置对应的最小值
      switch (period) {
        case 'day':
          this.currentVisibleCount = 50
          this.minVisibleCount = 50  // 最少显示50根日K线
          break
        case 'week':
          this.currentVisibleCount = 40
          this.minVisibleCount = 40  // 最少显示40根周K线
          break
        case 'month':
          this.currentVisibleCount = 30
          this.minVisibleCount = 30  // 最少显示30根月K线
          break
        default:
          this.currentVisibleCount = 50
          this.minVisibleCount = 50
      }
      
      // 完全重置绘制状态和缓存
      this.lastDrawnDataLength = 0
      this.lastDrawnPeriod = ''
      this.isDrawing = false
      this.lastSuccessfulLoadKey = '' // 重置成功加载key，强制重新加载
      this.loadRetryCount = 0
      this.currentLoadingPeriod = ''
      
      // 重置缩放相关状态
      this.isZooming = false
      this.lastDistance = 0
      this.zoomStartDistance = 0
      this.zoomStartVisibleCount = 0
      if (this.zoomThrottleTimer) {
        clearTimeout(this.zoomThrottleTimer)
        this.zoomThrottleTimer = null
      }
      
      // 重置Canvas上下文，强制重新初始化
      this.canvas2D = null
      this.ctx2D = null
      this.canvasInitializing = false // 重置初始化状态
      this.chartInitialized = false // 重置图表初始化状态，允许重新初始化
      
      // 清除initChart的定时器
      if (this.initChartTimeout) {
        clearTimeout(this.initChartTimeout)
        this.initChartTimeout = null
      }
      
      // 等待更长时间确保DOM完全更新后再初始化和加载数据
      this.$nextTick(() => {
        setTimeout(() => {
          // 先重新初始化图表（设置画布尺寸）
          this.initChart()
          // 然后加载数据
          setTimeout(() => {
            this.loadKlineData()
          }, 100)
        }, 300) // 增加延迟到300ms
      })
    },
    
    // 强制重绘图表（用于隐藏十字线时）
    forceRedraw() {
      // 重置绘制状态，强制重新绘制
      this.lastDrawnDataLength = 0
      this.lastDrawnPeriod = ''
      this.isDrawing = false
      // 调用普通绘制方法（当十字线被隐藏时，应该用普通绘制）
      this.drawChart()
    },
    
    // 绘制图表
    async drawChart() {
      if (this.isDrawing || !this.klineData.length || !this.canvasWidth) {
        // 绘制条件不满足
        return
      }
      
      this.isDrawing = true
      
      try {
        const canvasInfo = await this.getCanvasContext()
        if (!canvasInfo) {
          this.errorMessage = '画布初始化失败'
          return
        }
        
        const { ctx } = canvasInfo
        
        ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
        
        const leftPadding = 60  // 进一步增加左边距为价格标签预留更多空间
        const rightPadding = 50  // 右边距保持不变
        const topPadding = 20
        
        // 绘制参数调试
        
        let bottomPadding = 40
        let volumeChartHeight = 0
        let volumeChartTop = 0
        
        if (this.currentPeriod !== 'minute') {
          volumeChartHeight = 35
          const volumeGap = 20
          const extraSpace = 10
          bottomPadding = volumeGap + volumeChartHeight + extraSpace
          volumeChartTop = topPadding + (this.canvasHeight - topPadding - bottomPadding) + volumeGap
        }
        
        const chartWidth = this.canvasWidth - leftPadding - rightPadding
        const mainChartHeight = this.canvasHeight - topPadding - bottomPadding
        
        const endIndex = this.klineData.length
        let startIndex, visibleData
        
        if (this.currentPeriod === 'minute') {
          startIndex = 0
          visibleData = this.klineData
        } else {
          const visibleCount = this.getVisibleCount()
          startIndex = Math.max(0, endIndex - visibleCount)
          visibleData = this.klineData.slice(startIndex, endIndex)
        }
        
        if (!visibleData.length) {
          ctx.fillStyle = '#999999'
          ctx.font = '16px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('暂无K线数据', this.canvasWidth / 2, this.canvasHeight / 2)
          return
        }
        
        let minPrice = Infinity
        let maxPrice = -Infinity
        
        if (this.currentPeriod === 'minute') {
          visibleData.forEach(item => {
            minPrice = Math.min(minPrice, item.price)
            maxPrice = Math.max(maxPrice, item.price)
          })
        } else {
          visibleData.forEach(item => {
            minPrice = Math.min(minPrice, item.low)
            maxPrice = Math.max(maxPrice, item.high)
          })
        }
        
        const priceRange = maxPrice - minPrice
        const pricePadding = priceRange * 0.1
        minPrice -= pricePadding
        maxPrice += pricePadding
        
        this.drawGrid(ctx, leftPadding, topPadding, chartWidth, mainChartHeight, minPrice, maxPrice)
        
        if (this.currentPeriod === 'minute') {
          this.drawMinuteLine(ctx, visibleData, leftPadding, topPadding, chartWidth, mainChartHeight, minPrice, maxPrice)
        } else {
          this.drawKlines(ctx, visibleData, leftPadding, topPadding, chartWidth, mainChartHeight, minPrice, maxPrice)
          this.drawSeparatorLine(ctx, leftPadding, topPadding + mainChartHeight + 10, chartWidth)
          this.drawVolumeChart(ctx, visibleData, leftPadding, volumeChartTop, chartWidth, volumeChartHeight)
        }
        
        this.drawPriceLabels(ctx, leftPadding, topPadding, mainChartHeight, minPrice, maxPrice)
        
        this.lastDrawnDataLength = this.klineData.length
        this.lastDrawnPeriod = this.currentPeriod
        this.isDrawing = false
      } catch (error) {
        this.isDrawing = false
      }
    },
    
    // 绘制网格
    drawGrid(ctx, leftPadding, topPadding, width, height, minPrice, maxPrice) {
      ctx.strokeStyle = 'rgba(224, 224, 224, 0.5)'
      ctx.lineWidth = 0.5
      
      for (let i = 0; i <= 4; i++) {
        const y = topPadding + (height / 4) * i
        ctx.beginPath()
        ctx.moveTo(leftPadding, y)
        ctx.lineTo(leftPadding + width, y)
        ctx.stroke()
      }
      
      for (let i = 0; i <= 3; i++) {
        const x = leftPadding + (width / 3) * i
        ctx.beginPath()
        ctx.moveTo(x, topPadding)
        ctx.lineTo(x, topPadding + height)
        ctx.stroke()
      }
    },
    
    // 绘制分割线
    drawSeparatorLine(ctx, leftPadding, yPosition, width) {
      ctx.strokeStyle = '#e0e0e0'
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(leftPadding, yPosition)
      ctx.lineTo(leftPadding + width, yPosition) 
      ctx.stroke()
    },
    
    // 绘制K线
    drawKlines(ctx, data, leftPadding, topPadding, width, height, minPrice, maxPrice) {
      if (!data || data.length === 0) return
      
      const barWidth = width / data.length
      const priceRange = maxPrice - minPrice
      
      // 避免除零错误
      if (priceRange === 0) {
        return
      }
      
      // 优化：预计算颜色和样式
      const upColor = '#FF4444'   // 红色 - 涨
      const downColor = '#00AA44' // 绿色 - 跌
      const minRectWidth = Math.max(1, Math.min(8, barWidth * 0.7)) // 限制最小和最大宽度
      
      // 批量绘制影线 - 使用传统for循环替代forEach提高性能
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        // 数据验证
        if (!item || typeof item.open !== 'number' || typeof item.close !== 'number' ||
            typeof item.high !== 'number' || typeof item.low !== 'number') {
          continue; // 跳过无效数据
        }
        
        const x = leftPadding + i * barWidth + barWidth / 2
        const openY = topPadding + height - ((item.open - minPrice) / priceRange) * height
        const closeY = topPadding + height - ((item.close - minPrice) / priceRange) * height
        const highY = topPadding + height - ((item.high - minPrice) / priceRange) * height
        const lowY = topPadding + height - ((item.low - minPrice) / priceRange) * height
        
        // 判断涨跌
        const isUp = item.close >= item.open
        const color = isUp ? upColor : downColor
        
        // 绘制影线（上下影线）
        if (highY !== lowY) {
          ctx.strokeStyle = color
          ctx.lineWidth = 1
          ctx.beginPath()
          ctx.moveTo(x, highY)
          ctx.lineTo(x, lowY)
          ctx.stroke()
        }
        
        // 绘制实体
        const rectWidth = minRectWidth
        const rectHeight = Math.max(0.5, Math.abs(closeY - openY)) // 最小高度0.5像素
        const rectY = Math.min(openY, closeY)
        
        if (isUp) {
          // 阳线：红色空心
          ctx.strokeStyle = color
          ctx.lineWidth = 1
          
          // 只有当实体有足够大小时才绘制边框
          if (rectHeight > 1) {
            ctx.strokeRect(x - rectWidth / 2, rectY, rectWidth, rectHeight)
            // 填充白色背景
            ctx.fillStyle = '#ffffff'
            ctx.fillRect(x - rectWidth / 2 + 0.5, rectY + 0.5, rectWidth - 1, Math.max(0, rectHeight - 1))
          } else {
            // 十字星或小实体，绘制实线
            ctx.beginPath()
            ctx.moveTo(x - rectWidth / 2, rectY + rectHeight / 2)
            ctx.lineTo(x + rectWidth / 2, rectY + rectHeight / 2)
            ctx.stroke()
          }
        } else {
          // 阴线：绿色实心
          ctx.fillStyle = color
          ctx.fillRect(x - rectWidth / 2, rectY, rectWidth, rectHeight)
        }
      }
    },
    
    // 绘制分时线
    drawMinuteLine(ctx, data, leftPadding, topPadding, width, height, minPrice, maxPrice) {
      if (data.length < 2) return
      
      const priceRange = maxPrice - minPrice
      if (priceRange === 0) return // 防止除零错误
      
      const stepX = width / (data.length - 1)
      
      // 获取昨收价（使用第一个数据点的价格作为参考，或者可以从API获取真实昨收价）
      const yesterdayClose = data[0] ? data[0].price : 0
      
      // 确保昨收价在价格范围内，如果不在则不绘制昨收价线
      let yesterdayCloseY = null
      if (yesterdayClose >= minPrice && yesterdayClose <= maxPrice) {
        yesterdayCloseY = topPadding + height - ((yesterdayClose - minPrice) / priceRange) * height
        
        // 绘制昨收价基准线（虚线）
        ctx.strokeStyle = '#999999'
        ctx.lineWidth = 1
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(leftPadding, yesterdayCloseY)
        ctx.lineTo(leftPadding + width, yesterdayCloseY)
        ctx.stroke()
        ctx.setLineDash([])
      }
      
      // 创建分时线路径
      const linePath = []
      // 使用传统for循环替代forEach提高性能
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        const x = leftPadding + i * stepX
        const y = topPadding + height - ((item.price - minPrice) / priceRange) * height
        linePath.push({ x, y, price: item.price })
      }
      
      if (linePath.length === 0) return
      
      // 根据价格相对昨收的位置决定颜色
      const currentPrice = data[data.length - 1].price
      const isUp = currentPrice >= yesterdayClose
      const lineColor = isUp ? '#FF4444' : '#00AA44'
      
      // 绘制背景填充区域
      if (linePath.length > 1) {
        // 创建渐变
        const gradient = ctx.createLinearGradient(0, topPadding, 0, topPadding + height)
        if (isUp) {
          gradient.addColorStop(0, 'rgba(255, 68, 68, 0.2)')
          gradient.addColorStop(1, 'rgba(255, 68, 68, 0.02)')
        } else {
          gradient.addColorStop(0, 'rgba(0, 170, 68, 0.2)')
          gradient.addColorStop(1, 'rgba(0, 170, 68, 0.02)')
        }
        
        // 绘制填充区域
        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.moveTo(linePath[0].x, linePath[0].y)
        
        // 绘制价格线的路径
        for (let i = 1; i < linePath.length; i++) {
          ctx.lineTo(linePath[i].x, linePath[i].y)
        }
        
        // 连接到底部形成封闭区域
        ctx.lineTo(linePath[linePath.length - 1].x, topPadding + height)
        ctx.lineTo(linePath[0].x, topPadding + height)
        ctx.closePath()
        ctx.fill()
      }
      
      // 绘制价格线
      ctx.strokeStyle = lineColor
      ctx.lineWidth = 2
      ctx.beginPath()
      
      for (let i = 0; i < linePath.length; i++) {
        const point = linePath[i];
        if (i === 0) {
          ctx.moveTo(point.x, point.y)
        } else {
          ctx.lineTo(point.x, point.y)
        }
      }
      
      ctx.stroke()
      
      // 绘制最新价格点
      if (linePath.length > 0) {
        const lastPoint = linePath[linePath.length - 1]
        ctx.fillStyle = lineColor
        ctx.beginPath()
        ctx.arc(lastPoint.x, lastPoint.y, 3, 0, 2 * Math.PI)
        ctx.fill()
        
        // 添加白色边框
        ctx.strokeStyle = '#ffffff'
        ctx.lineWidth = 1
        ctx.stroke()
      }
      
      // 绘制时间轴标签
      this.drawTimeLabels(ctx, data, leftPadding, topPadding, width, height)
    },
    
    // 绘制成交量图
    drawVolumeChart(ctx, data, leftPadding, topPadding, width, height) {
      if (!data || data.length === 0 || height <= 0) return
      
      const barWidth = width / data.length
      
      // 计算成交量范围
      let minVolume = 0
      let maxVolume = 0
      
      // 优化：只遍历一次计算最大成交量 - 使用传统for循环提高性能
      for (let i = 0; i < data.length; i++) {
        const volume = data[i]?.volume || 0
        if (volume > maxVolume) {
          maxVolume = volume
        }
      }
      
      // 如果最大成交量为0，则不绘制
      if (maxVolume === 0) return
      
      // 预计算颜色
      const upColor = '#FF4444'   // 红色（涨）
      const downColor = '#00AA44' // 绿色（跌）
      const neutralColor = '#cccccc' // 默认灰色
      
      // 绘制成交量柱状图 - 使用传统for循环提高性能
      for (let i = 0; i < data.length; i++) {
        const item = data[i];
        if (!item) continue
        
        const volume = item.volume || 0
        if (volume === 0) continue // 跳过无成交量的数据
        
        const x = leftPadding + i * barWidth + barWidth / 2
        
        // 计算柱子高度（成交量越大，柱子越高）
        const barHeight = (volume / maxVolume) * height
        const barY = topPadding + height - barHeight
        
        // 优化：根据K线涨跌设置颜色
        let barColor = neutralColor
        
        if (item.close && item.open) {
          barColor = item.close > item.open ? upColor : 
                    item.close < item.open ? downColor : neutralColor
        } else if (i > 0 && item.close && data[i - 1]?.close) {
          // 与前一日比较
          barColor = item.close > data[i - 1].close ? upColor :
                    item.close < data[i - 1].close ? downColor : neutralColor
        }
        
        // 绘制成交量柱
        ctx.fillStyle = barColor
        const rectWidth = Math.max(0.5, barWidth * 0.8) // 柱子宽度，最小0.5像素
        ctx.fillRect(x - rectWidth / 2, barY, rectWidth, barHeight)
      }
      
      // 绘制成交量标签（在左侧显示最大成交量）
      ctx.fillStyle = '#666666'
      ctx.font = '11px sans-serif'  // 从9px增加为11px，提高清晰度
      ctx.textAlign = 'right'
      
      // 显示最大成交量 - 也向右移动10px保持对齐
      const maxVolumeStr = this.formatVolumeShort(maxVolume)
      ctx.fillText(maxVolumeStr, leftPadding + 15, topPadding + 12)  // 从+5改为+15
      
      // 显示0
      ctx.fillText('0', leftPadding + 15, topPadding + height - 2)  // 从+5改为+15
    },
    
    // 格式化成交量显示（简短版本）
    formatVolumeShort(volume) {
      if (!volume) return '0'
      
      if (volume >= 100000000) {
        return (volume / 100000000).toFixed(1) + '亿'
      } else if (volume >= 10000) {
        return (volume / 10000).toFixed(0) + '万'
      } else {
        return volume.toString()
      }
    },
    
    // 绘制K线时间标签
    drawKlineTimeLabels(ctx, data, leftPadding, yPosition, width) {
      if (!data || data.length === 0) return
      
      ctx.fillStyle = '#666'
      ctx.font = '12px sans-serif'  // 从10px增加为12px，提高清晰度
      ctx.textAlign = 'center'
      
      const barWidth = width / data.length
      
      // 根据数据长度和周期类型决定显示多少个时间标签
      let step = 1
      if (data.length > 20) {
        step = Math.floor(data.length / 6) // 显示大约6个时间标签
      } else if (data.length > 10) {
        step = Math.floor(data.length / 4) // 显示大约4个时间标签
      }
      
      // 绘制时间标签
      for (let i = 0; i < data.length; i += step) {
        const item = data[i]
        if (!item || !item.date) continue
        
        const x = leftPadding + i * barWidth + barWidth / 2
        
        // 格式化日期显示
        let dateStr = item.date
        if (typeof dateStr === 'string') {
          // 格式化日期字符串，如 "20231201" -> "12-01"
          if (dateStr.length >= 8) {
            const month = dateStr.substring(4, 6)
            const day = dateStr.substring(6, 8)
            dateStr = `${month}-${day}`
          } else if (dateStr.length >= 6) {
            const month = dateStr.substring(2, 4)
            const day = dateStr.substring(4, 6)
            dateStr = `${month}-${day}`
          }
        }
        
        // 第一个和最后一个标签的特殊处理
        if (i === 0) {
          ctx.textAlign = 'left'
          ctx.fillText(dateStr, leftPadding + 2, yPosition)
        } else if (i >= data.length - step) {
          ctx.textAlign = 'right'
          ctx.fillText(dateStr, leftPadding + width - 2, yPosition)
        } else {
          ctx.textAlign = 'center'
          ctx.fillText(dateStr, x, yPosition)
        }
      }
    },

    // 绘制时间轴标签
    drawTimeLabels(ctx, data, leftPadding, topPadding, width, height) {
      if (!data || data.length === 0) return
      
      ctx.fillStyle = '#666'
      ctx.font = '12px sans-serif'  // 从10px增加为12px，提高清晰度
      
      // 分时图使用固定的时间标签
      if (this.currentPeriod === 'minute') {
        const fixedTimes = ['09:30', '10:30', '13:00', '14:00', '15:00']
        const stepX = width / (data.length - 1)
        const labels = []
        
        // 为每个固定时间点找到对应的数据索引
        fixedTimes.forEach((timeLabel, labelIndex) => {
          const targetTime = timeLabel.replace(':', '') // 09:30 -> 0930
          
          // 在数据中查找最接近的时间点
          let bestIndex = -1
          let minTimeDiff = Infinity
          
          for (let i = 0; i < data.length; i++) {
            if (data[i] && data[i].time) {
              const dataTime = data[i].time.substring(0, 4) // 取前4位作为时间
              const timeDiff = Math.abs(parseInt(dataTime) - parseInt(targetTime))
              
              if (timeDiff < minTimeDiff) {
                minTimeDiff = timeDiff
                bestIndex = i
              }
            }
          }
          
          // 如果找到了匹配的时间点，添加到标签数组
          if (bestIndex !== -1) {
            labels.push({
              index: bestIndex,
              label: timeLabel,
              x: leftPadding + bestIndex * stepX,
              isFirst: labelIndex === 0,
              isLast: labelIndex === fixedTimes.length - 1
            })
          }
        })
        
        // 绘制固定时间标签
        labels.forEach(({ x, label, isFirst, isLast }) => {
          if (isFirst) {
            // 第一个标签左对齐
            ctx.textAlign = 'left'
            ctx.fillText(label, leftPadding + 5, topPadding + height + 20)
          } else if (isLast) {
            // 最后一个标签右对齐
            ctx.textAlign = 'right'
            ctx.fillText(label, leftPadding + width - 5, topPadding + height + 20)
          } else {
            // 中间标签居中显示
            ctx.textAlign = 'center'
            ctx.fillText(label, x, topPadding + height + 20)
          }
        })
        
        return
      }
      
      // K线图使用原有的动态时间标签逻辑
      // 根据画布宽度和数据长度计算合适的时间标签数量
      const minLabelDistance = 60 // 最小标签间距（像素）
      const maxLabels = Math.floor(width / minLabelDistance)
      const actualMaxLabels = Math.min(maxLabels, 6) // 最多显示6个时间标签
      
      // 如果数据量少，减少标签数量
      const labelCount = Math.min(actualMaxLabels, Math.max(3, Math.floor(data.length / 30)))
      
      const stepX = width / (data.length - 1)
      const labels = []
      
      // 计算需要显示的时间点索引
      const indices = []
      if (labelCount <= 3) {
        // 少量标签：开始、中间、结束
        indices.push(0)
        if (labelCount > 2) {
          indices.push(Math.floor(data.length / 2))
        }
        indices.push(data.length - 1)
      } else {
        // 更多标签：均匀分布
        for (let i = 0; i < labelCount; i++) {
          const index = Math.floor((data.length - 1) * i / (labelCount - 1))
          indices.push(index)
        }
      }
      
      // 为每个索引生成时间标签
      indices.forEach((dataIndex, labelIndex) => {
        const item = data[dataIndex]
        if (item && item.time) {
          // 格式化时间显示
          let timeLabel = item.time
          if (typeof timeLabel === 'string' && timeLabel.length >= 4) {
            const hour = timeLabel.substring(0, 2)
            const minute = timeLabel.substring(2, 4)
            timeLabel = `${hour}:${minute}`
          }
          
          labels.push({
            index: dataIndex,
            label: timeLabel,
            x: leftPadding + dataIndex * stepX,
            isFirst: labelIndex === 0,
            isLast: labelIndex === indices.length - 1
          })
        }
      })
      
      // 绘制时间标签
      labels.forEach(({ x, label, isFirst, isLast }) => {
        if (isFirst) {
          // 第一个标签左对齐
          ctx.textAlign = 'left'
          ctx.fillText(label, leftPadding + 5, topPadding + height + 20)
        } else if (isLast) {
          // 最后一个标签右对齐
          ctx.textAlign = 'right'
          ctx.fillText(label, leftPadding + width - 5, topPadding + height + 20)
        } else {
          // 中间标签居中显示
          ctx.textAlign = 'center'
          ctx.fillText(label, x, topPadding + height + 20)
        }
      })
    },

    // 绘制价格标签
    drawPriceLabels(ctx, leftPadding, topPadding, height, minPrice, maxPrice) {
      ctx.fillStyle = '#666666'
      ctx.font = '11px sans-serif'  // 字体大小从10px增加到11px，提高清晰度
      ctx.textAlign = 'right'
      
      // 绘制左侧价格标签
      for (let i = 0; i <= 4; i++) {
        const price = minPrice + (maxPrice - minPrice) * (1 - i / 4)
        const y = topPadding + (height / 4) * i
        
        // 价格标签再向右移动10px，确保完全可见
        if (i === 4) {
          ctx.fillText(price.toFixed(2), leftPadding + 15, y - 8)  // 从+5改为+15
        } else {
          ctx.fillText(price.toFixed(2), leftPadding + 15, y + 3)   // 从+5改为+15
        }
      }
      
      // 如果是分时图，在右侧显示涨跌幅百分比
      if (this.currentPeriod === 'minute' && this.klineData.length > 0) {
        const yesterdayClose = this.klineData[0].price || 0
        if (yesterdayClose) {
          ctx.textAlign = 'left'
          for (let i = 0; i <= 4; i++) {
            const price = minPrice + (maxPrice - minPrice) * (1 - i / 4)
            const y = topPadding + (height / 4) * i
            const change = ((price - yesterdayClose) / yesterdayClose) * 100
            
            // 根据涨跌情况设置颜色
            if (change > 0) {
              ctx.fillStyle = '#ff4949' // 红色表示上涨
            } else if (change < 0) {
              ctx.fillStyle = '#66cc66' // 绿色表示下跌
            } else {
              ctx.fillStyle = '#666666' // 平盘显示灰色
            }
            
            // 显示涨跌幅百分比 - 在右侧预留的空间内显示
            const changeText = change > 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`
            // 现在有足够的右边距空间显示涨跌幅标签
            ctx.fillText(changeText, this.canvasWidth - 45, y + 3)
          }
        }
      }
    },
    
    // 触摸开始
    onTouchStart(e) {
      if (!e.touches || e.touches.length === 0) return
      
      // 检查是否为双指缩放手势
      if (this.isTwoFingerGesture(e.touches) && this.currentPeriod !== 'minute') {
        // 双指缩放模式
        this.isZooming = true
        this.isDragging = false
        this.showCrosshair = false // 隐藏十字线
        
        // 计算初始距离
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        this.lastDistance = this.calculateDistance(touch1, touch2)
        this.zoomStartDistance = this.lastDistance
        this.zoomStartVisibleCount = this.currentVisibleCount
        
        return
      }
      
      // 单指操作（原有逻辑）
      if (e.touches.length === 1) {
        const touch = e.touches[0]
        this.startX = touch.x
        this.startY = touch.y
        this.isDragging = false
        this.isZooming = false
        
        // 不立即显示十字线，等待触摸结束判断是否为点击
      }
    },
    
    // 触摸移动
    onTouchMove(e) {
      if (!e.touches || e.touches.length === 0) return
      
      // 双指缩放处理
      if (this.isZooming && this.isTwoFingerGesture(e.touches)) {
        const touch1 = e.touches[0]
        const touch2 = e.touches[1]
        const currentDistance = this.calculateDistance(touch1, touch2)
        
        // 计算缩放比例
        const distanceChange = currentDistance - this.zoomStartDistance
        const scaleFactor = 1 + (distanceChange * this.touchZoomSensitivity / 100)
        
        // 计算新的可见数量
        let newVisibleCount = Math.round(this.zoomStartVisibleCount / scaleFactor)
        
        // 应用边界限制
        newVisibleCount = Math.max(this.minVisibleCount, Math.min(this.maxVisibleCount, newVisibleCount))
        
        // 如果数量有明显变化才更新
        if (Math.abs(newVisibleCount - this.currentVisibleCount) >= 1) {
          // 使用统一的缩放处理方法，但传递'touch'标识
          this.currentVisibleCount = newVisibleCount
          
          // 节流重绘
          if (this.zoomThrottleTimer) {
            clearTimeout(this.zoomThrottleTimer)
          }
          this.zoomThrottleTimer = setTimeout(() => {
            if (!this.isDrawing && this.klineData.length > 0) {
              this.drawChartSafely()
            }
          }, 16) // 约60fps
        }
        
        return
      }
      
      // 单指操作（原有逻辑）
      if (e.touches.length === 1 && !this.isZooming) {
        const touch = e.touches[0]
        const deltaX = Math.abs(touch.x - this.startX)
        const deltaY = Math.abs(touch.y - this.startY)
        
        // 如果移动距离超过阈值，标记为拖拽
        if (deltaX > 5 || deltaY > 5) {
          this.isDragging = true
        }
        
        // 如果十字线已经显示且正在拖拽，更新十字线位置
        if (this.showCrosshair && this.isDragging) {
          // 微信小程序环境使用相应的API
          const raf = uni.requestAnimationFrame || ((callback) => setTimeout(callback, 16));
          raf(() => {
            this.updateCrosshair(touch.x, touch.y)
          })
        }
      }
    },
    
    // 触摸结束
    onTouchEnd(e) {
      // 清除缩放节流定时器
      if (this.zoomThrottleTimer) {
        clearTimeout(this.zoomThrottleTimer)
        this.zoomThrottleTimer = null
      }
      
      // 如果是缩放操作结束
      if (this.isZooming) {
        this.isZooming = false
        this.lastDistance = 0
        this.zoomStartDistance = 0
        this.zoomStartVisibleCount = 0
        return
      }
      
      // 微信小程序环境使用相应的API
      const raf = uni.requestAnimationFrame || ((callback) => setTimeout(callback, 16));
      raf(() => {
        // 只有在点击（非拖拽）时才处理十字线
        if (!this.isDragging) {
          const currentTime = Date.now()
          const isDoubleClick = this.lastTapTime > 0 && (currentTime - this.lastTapTime < 400) // 400ms内的连续点击认为是双击
          
          // 检查点击位置是否在图表区域内
          if (this.isPointInChartArea(this.startX, this.startY)) {
            if (isDoubleClick && this.showCrosshair) {
              // 双击隐藏十字线
              this.showCrosshair = false
              this.crosshairData = null
              // 强制重绘图表（不带十字线）
              this.forceRedraw()
              // 重置点击时间，避免连续点击干扰
              this.lastTapTime = 0
            } else {
              // 单击显示或更新十字线，十字线保持显示状态
              this.showCrosshair = true
              this.updateCrosshair(this.startX, this.startY)
              // 记录点击时间用于双击检测
              this.lastTapTime = currentTime
            }
          } else {
            // 点击空白处（图表区域外），隐藏十字线
            if (this.showCrosshair) {
              this.showCrosshair = false
              this.crosshairData = null
              this.forceRedraw()
            }
            // 重置点击时间
            this.lastTapTime = 0
          }
        }
        
        // 重置拖拽状态
        this.isDragging = false
      })
    },
    
    // 更新十字线位置和数据
    updateCrosshair(touchX, touchY) {
      if (!this.klineData.length || !this.canvasWidth) {
        return
      }
      
      // 计算图表区域
      const leftPadding = 60  // 进一步增加左边距为价格标签预留更多空间
      const rightPadding = 50  // 右边距保持不变
      const topPadding = 20
      const chartWidth = this.canvasWidth - leftPadding - rightPadding
      let bottomPadding = 40
      if (this.currentPeriod !== 'minute') {
        const volumeChartHeight = 35
        const volumeGap = 20
        const extraSpace = 10
        bottomPadding = volumeGap + volumeChartHeight + extraSpace
      }
      const mainChartHeight = this.canvasHeight - topPadding - bottomPadding
      
      // 检查触摸点是否在图表区域内
      if (touchX < leftPadding || touchX > leftPadding + chartWidth || 
          touchY < topPadding || touchY > topPadding + mainChartHeight) {
        return
      }
      
      // 获取可见数据
      const endIndex = this.klineData.length
      let startIndex, visibleData
      
      if (this.currentPeriod === 'minute') {
        // 分时图显示全部数据
        startIndex = 0
        visibleData = this.klineData
      } else {
        // K线图使用动态可见数量限制
        const visibleCount = this.getVisibleCount()
        startIndex = Math.max(0, endIndex - visibleCount)
        visibleData = this.klineData.slice(startIndex, endIndex)
      }
      
      if (!visibleData.length) {
        return
      }
      
      // 计算对应的数据索引
      const relativeX = touchX - leftPadding
      let dataIndex, alignedX
      
      if (this.currentPeriod === 'minute') {
        // 分时图：按连续坐标计算
        const stepX = chartWidth / (visibleData.length - 1)
        dataIndex = Math.round(relativeX / stepX)
        dataIndex = Math.max(0, Math.min(visibleData.length - 1, dataIndex))
        alignedX = leftPadding + dataIndex * stepX
      } else {
        // K线图：按柱状图计算
        const barWidth = chartWidth / visibleData.length
        dataIndex = Math.floor(relativeX / barWidth)
        dataIndex = Math.max(0, Math.min(visibleData.length - 1, dataIndex))
        alignedX = leftPadding + dataIndex * barWidth + barWidth / 2
      }
      
      // 检查是否点击了同一个数据点，避免不必要的重绘
      if (this.crosshairDataIndex === dataIndex && this.showCrosshair) {
        return
      }
      
      // 先设置基本数据
      this.crosshairDataIndex = dataIndex
      this.crosshairData = visibleData[dataIndex]
      
      // 更新十字线X坐标（立即更新，无需重新计算价格范围）
      this.crosshairX = alignedX
      
      // 更新十字线Y坐标
      this.updateCrosshairY()
      
      // 立即重绘十字线
      this.drawChartSafely()
    },
    
    // 更新十字线Y坐标
    updateCrosshairY() {
      if (!this.crosshairData) return
      
      const leftPadding = 60  // 进一步增加左边距为价格标签预留更多空间
      const topPadding = 20
      let bottomPadding = 40
      if (this.currentPeriod !== 'minute') {
        const volumeChartHeight = 35
        const volumeGap = 20
        const extraSpace = 10
        bottomPadding = volumeGap + volumeChartHeight + extraSpace
      }
      const mainChartHeight = this.canvasHeight - topPadding - bottomPadding
      
      // 获取可见数据
      const endIndex = this.klineData.length
      let visibleData
      
      if (this.currentPeriod === 'minute') {
        visibleData = this.klineData
      } else {
        const startIndex = Math.max(0, endIndex - this.getVisibleCount())
        visibleData = this.klineData.slice(startIndex, endIndex)
      }
      
      // 计算价格范围
      let minPrice = Infinity, maxPrice = -Infinity
      if (this.currentPeriod === 'minute') {
        visibleData.forEach(item => {
          minPrice = Math.min(minPrice, item.price)
          maxPrice = Math.max(maxPrice, item.price)
        })
      } else {
        visibleData.forEach(item => {
          minPrice = Math.min(minPrice, item.low)
          maxPrice = Math.max(maxPrice, item.high)
        })
      }
      
      const priceRange = maxPrice - minPrice
      const pricePadding = priceRange * 0.1
      minPrice -= pricePadding
      maxPrice += pricePadding
      
      // 根据当前数据的价格计算Y坐标
      const currentPrice = this.currentPeriod === 'minute' ? 
        this.crosshairData.price : this.crosshairData.close
      this.crosshairY = topPadding + mainChartHeight - ((currentPrice - minPrice) / (maxPrice - minPrice)) * mainChartHeight
    },
    
    // 绘制图表
    async drawChart() {
      if (this.isDrawing || !this.klineData.length || !this.canvasWidth) {
        return
      }
      
      this.isDrawing = true
      
      try {
        const canvasInfo = await this.getCanvasContext()
        if (!canvasInfo) {
          this.errorMessage = '画布初始化失败'
          return
        }
        
        const { ctx } = canvasInfo
        
        ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
        
        const leftPadding = 15  // 大幅减少左边距，从30减少到15
        const rightPadding = 5   // 优化右边距，增加图表宽度
        const topPadding = 20
        
        let bottomPadding = 40
        let volumeChartHeight = 0
        let volumeChartTop = 0
        
        if (this.currentPeriod !== 'minute') {
          volumeChartHeight = 35
          const volumeGap = 20
          const extraSpace = 10
          bottomPadding = volumeGap + volumeChartHeight + extraSpace
          volumeChartTop = topPadding + (this.canvasHeight - topPadding - bottomPadding) + volumeGap
        }
        
        const chartWidth = this.canvasWidth - leftPadding - rightPadding
        const mainChartHeight = this.canvasHeight - topPadding - bottomPadding
        
        const endIndex = this.klineData.length
        let startIndex, visibleData
        
        if (this.currentPeriod === 'minute') {
          startIndex = 0
          visibleData = this.klineData
        } else {
          const visibleCount = this.getVisibleCount()
          startIndex = Math.max(0, endIndex - visibleCount)
          visibleData = this.klineData.slice(startIndex, endIndex)
        }
        
        if (!visibleData.length) {
          ctx.fillStyle = '#999999'
          ctx.font = '16px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('暂无K线数据', this.canvasWidth / 2, this.canvasHeight / 2)
          return
        }
        
        let minPrice = Infinity
        let maxPrice = -Infinity
        
        if (this.currentPeriod === 'minute') {
          visibleData.forEach(item => {
            minPrice = Math.min(minPrice, item.price)
            maxPrice = Math.max(maxPrice, item.price)
          })
        } else {
          visibleData.forEach(item => {
            minPrice = Math.min(minPrice, item.low)
            maxPrice = Math.max(maxPrice, item.high)
          })
        }
        
        const priceRange = maxPrice - minPrice
        const pricePadding = priceRange * 0.1
        minPrice -= pricePadding
        maxPrice += pricePadding
        
        this.drawGrid(ctx, leftPadding, topPadding, chartWidth, mainChartHeight, minPrice, maxPrice)
        
        if (this.currentPeriod === 'minute') {
          this.drawMinuteLine(ctx, visibleData, leftPadding, topPadding, chartWidth, mainChartHeight, minPrice, maxPrice)
        } else {
          this.drawKlines(ctx, visibleData, leftPadding, topPadding, chartWidth, mainChartHeight, minPrice, maxPrice)
          this.drawSeparatorLine(ctx, leftPadding, topPadding + mainChartHeight + 10, chartWidth)
          this.drawVolumeChart(ctx, visibleData, leftPadding, volumeChartTop, chartWidth, volumeChartHeight)
        }
        
        this.drawPriceLabels(ctx, leftPadding, topPadding, mainChartHeight, minPrice, maxPrice)
        
        // 如果需要显示十字线，在同一个上下文中绘制
        if (this.showCrosshair && this.crosshairX && this.crosshairY) {
          ctx.strokeStyle = '#666666'
          ctx.lineWidth = 1
          ctx.setLineDash([5, 5])
          
          // 绘制垂直线
          ctx.beginPath()
          ctx.moveTo(this.crosshairX, topPadding)
          ctx.lineTo(this.crosshairX, topPadding + mainChartHeight)
          ctx.stroke()
          
          // 绘制水平线
          ctx.beginPath()
          ctx.moveTo(leftPadding, this.crosshairY)
          ctx.lineTo(leftPadding + chartWidth, this.crosshairY)
          ctx.stroke()
          
          ctx.setLineDash([])
          
          // 绘制交叉点
          ctx.fillStyle = '#666666'
          ctx.beginPath()
          ctx.arc(this.crosshairX, this.crosshairY, 3, 0, 2 * Math.PI)
          ctx.fill()
          
          // 绘制价格标签
          if (this.crosshairData) {
            let currentPrice = 0
            if (this.currentPeriod === 'minute') {
              currentPrice = this.crosshairData.price || 0
            } else {
              currentPrice = this.crosshairData.close || 0
            }
            
            const priceText = this.formatPrice(currentPrice)
            ctx.fillStyle = 'rgba(102, 102, 102, 0.8)'
            ctx.fillRect(5, this.crosshairY - 10, 50, 20)
            ctx.fillStyle = '#ffffff'
            ctx.font = '12px sans-serif'  // 从10px增加为12px，提高清晰度
            ctx.textAlign = 'center'
            ctx.fillText(priceText, 30, this.crosshairY + 3)
            
            ctx.fillStyle = 'rgba(102, 102, 102, 0.8)'
            ctx.fillRect(leftPadding + chartWidth + 5, this.crosshairY - 10, 50, 20)
            ctx.fillStyle = '#ffffff'
            ctx.fillText(priceText, leftPadding + chartWidth + 30, this.crosshairY + 3)
          }
        }
        
        this.lastDrawnDataLength = this.klineData.length
        this.lastDrawnPeriod = this.currentPeriod
        this.isDrawing = false
      } catch (error) {
        this.isDrawing = false
      }
    },
    
    // 单次绘制图表和十字线
    async drawChartAndCrosshairOnce() {
      if (this.isDrawing || !this.klineData.length || !this.canvasWidth) {
        return
      }
      
      this.isDrawing = true
      
      try {
        const canvasInfo = await this.getCanvasContext()
        if (!canvasInfo) {
          return
        }
        
        const { ctx } = canvasInfo
        
        ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
        ctx.fillStyle = '#ffffff'
        ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
        
        const leftPadding = 15  // 大幅减少左边距，从30减少到15
        const rightPadding = 5   // 优化右边距，增加图表宽度
        const topPadding = 20
        
        let bottomPadding = 40
        let volumeChartHeight = 0
        let volumeChartTop = 0
        
        if (this.currentPeriod !== 'minute') {
          volumeChartHeight = 35
          const volumeGap = 20
          const extraSpace = 10
          bottomPadding = volumeGap + volumeChartHeight + extraSpace
          volumeChartTop = topPadding + (this.canvasHeight - topPadding - bottomPadding) + volumeGap
        }
        
        const chartWidth = this.canvasWidth - leftPadding - rightPadding
        const mainChartHeight = this.canvasHeight - topPadding - bottomPadding
        
        const endIndex = this.klineData.length
        let startIndex, visibleData
        
        if (this.currentPeriod === 'minute') {
          startIndex = 0
          visibleData = this.klineData
        } else {
          const visibleCount = this.getVisibleCount()
          startIndex = Math.max(0, endIndex - visibleCount)
          visibleData = this.klineData.slice(startIndex, endIndex)
        }
        
        if (!visibleData.length) {
          ctx.fillStyle = '#999999'
          ctx.font = '16px sans-serif'
          ctx.textAlign = 'center'
          ctx.fillText('暂无K线数据', this.canvasWidth / 2, this.canvasHeight / 2)
          return
        }
        
        let minPrice = Infinity, maxPrice = -Infinity
        
        if (this.currentPeriod === 'minute') {
          visibleData.forEach(item => {
            minPrice = Math.min(minPrice, item.price)
            maxPrice = Math.max(maxPrice, item.price)
          })
        } else {
          visibleData.forEach(item => {
            minPrice = Math.min(minPrice, item.low)
            maxPrice = Math.max(maxPrice, item.high)
          })
        }
        
        const priceRange = maxPrice - minPrice
        const pricePadding = priceRange * 0.1
        minPrice -= pricePadding
        maxPrice += pricePadding
        
        // 绘制背景网格
        this.drawGrid(ctx, leftPadding, topPadding, chartWidth, mainChartHeight, minPrice, maxPrice)
        
        if (this.currentPeriod === 'minute') {
          this.drawMinuteLine(ctx, visibleData, leftPadding, topPadding, chartWidth, mainChartHeight, minPrice, maxPrice)
        } else {
          this.drawKlines(ctx, visibleData, leftPadding, topPadding, chartWidth, mainChartHeight, minPrice, maxPrice)
          this.drawSeparatorLine(ctx, leftPadding, topPadding + mainChartHeight + 10, chartWidth)
          this.drawVolumeChart(ctx, visibleData, leftPadding, volumeChartTop, chartWidth, volumeChartHeight)
        }
        
        this.drawPriceLabels(ctx, leftPadding, topPadding, mainChartHeight, minPrice, maxPrice)
        
        // 如果需要显示十字线，在同一个上下文中绘制
        if (this.showCrosshair && this.crosshairX && this.crosshairY) {
          ctx.strokeStyle = '#666666'
          ctx.lineWidth = 1
          ctx.setLineDash([5, 5])
          
          // 绘制垂直线
          ctx.beginPath()
          ctx.moveTo(this.crosshairX, topPadding)
          ctx.lineTo(this.crosshairX, topPadding + mainChartHeight)
          ctx.stroke()
          
          // 绘制水平线
          ctx.beginPath()
          ctx.moveTo(leftPadding, this.crosshairY)
          ctx.lineTo(leftPadding + chartWidth, this.crosshairY)
          ctx.stroke()
          
          ctx.setLineDash([])
          
          // 绘制交叉点
          ctx.fillStyle = '#666666'
          ctx.beginPath()
          ctx.arc(this.crosshairX, this.crosshairY, 3, 0, 2 * Math.PI)
          ctx.fill()
          
          // 绘制十字线标签
          this.drawCrosshairLabels(ctx, leftPadding, rightPadding, topPadding, chartWidth, mainChartHeight)
        }
        
        // Canvas 2D绘制是立即的，不需要调用draw()
        
        // 更新绘制状态
        this.lastDrawnDataLength = this.klineData.length
        this.lastDrawnPeriod = this.currentPeriod
        
      } catch (error) {
        console.error('绘制图表失败:', error)
      } finally {
        this.isDrawing = false
      }
    },

    // 绘制十字线标签
    drawCrosshairLabels(ctx, leftPadding, rightPadding, topPadding, chartWidth, mainChartHeight) {
      // 计算当前价格
      let currentPrice = 0
      if (this.currentPeriod === 'minute') {
        currentPrice = this.crosshairData.price || 0
      } else {
        currentPrice = this.crosshairData.close || 0
      }
      
      // 在左侧显示价格
      const priceText = this.formatPrice(currentPrice)
      ctx.fillStyle = 'rgba(102, 102, 102, 0.8)'
      ctx.fillRect(5, this.crosshairY - 10, 50, 20)
      ctx.fillStyle = '#ffffff'
      ctx.font = '12px sans-serif'  // 从10px增加为12px，提高清晰度
      ctx.textAlign = 'center'
      ctx.fillText(priceText, 30, this.crosshairY + 3)
      
      // 在右侧显示价格和涨跌幅
      ctx.fillStyle = 'rgba(102, 102, 102, 0.8)'
      ctx.fillRect(leftPadding + chartWidth + 5, this.crosshairY - 15, 50, 30)
      ctx.fillStyle = '#ffffff'
      
      // 显示价格
      ctx.fillText(priceText, leftPadding + chartWidth + 30, this.crosshairY - 2)
      
      // 如果是分时图，显示涨跌幅
      if (this.currentPeriod === 'minute' && this.klineData.length > 0) {
        const changeText = this.formatPriceChange(currentPrice)
        // 根据涨跌情况设置颜色
        const yesterdayClose = this.klineData[0].price || 0
        if (yesterdayClose && currentPrice > yesterdayClose) {
          ctx.fillStyle = '#ff4949' // 红色表示上涨
        } else if (yesterdayClose && currentPrice < yesterdayClose) {
          ctx.fillStyle = '#66cc66' // 绿色表示下跌
        } else {
          ctx.fillStyle = '#ffffff' // 平盘显示白色
        }
        ctx.fillText(changeText, leftPadding + chartWidth + 30, this.crosshairY + 10)
      }
      
      // Canvas 2D绘制是立即的，不需要调用draw()
    },

    // 绘制带十字线的图表
    drawChartWithCrosshair() {
      // 防止重复调用 - 添加关键的防护检查
      if (this.isDrawing) {
        return
      }
      
      // 检查数据是否已变化，避免无效重复绘制
      if (this.lastDrawnDataLength === this.klineData.length && 
          this.lastDrawnPeriod === this.currentPeriod && 
          this.klineData.length > 0) {
        return
      }
      
      // 如果需要显示十字线，在绘制完普通图表后立即绘制十字线
      if (this.showCrosshair) {
        // 使用安全绘制方法，避免循环调用
        this.drawChartSafely()
      } else {
        // 只绘制普通图表
        this.drawChart()
      }
    },
    
    // 同时绘制图表和十字线
    async drawChartAndCrosshair() {
      // 防止重复绘制
      if (this.isDrawing) {
        return
      }
      
      // 无论是否显示十字线，都要检查数据变化，避免无效重复绘制
      if (this.lastDrawnDataLength === this.klineData.length && 
          this.lastDrawnPeriod === this.currentPeriod && 
          this.klineData.length > 0) {
        return
      }
      
      if (!this.klineData.length) {
        return
      }
      
      if (!this.canvasWidth) {
        return
      }
      
      this.isDrawing = true
      
      try {
        // 获取传统Canvas上下文
        const canvasInfo = await this.getCanvasContext()
        if (!canvasInfo) {
          console.error('无法获取Canvas上下文')
          this.errorMessage = '画布初始化失败'
          return
        }
        
        const { ctx } = canvasInfo
        
        // 直接使用 Canvas 2D API，不需要适配层
      // 设置画布尺寸
      ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight)
      
      // 设置画布背景色
      ctx.fillStyle = '#ffffff'
      ctx.fillRect(0, 0, this.canvasWidth, this.canvasHeight)
      
      // 计算绘制参数
      const leftPadding = 60  // 进一步增加左边距为价格标签预留更多空间
      const rightPadding = 50  // 右边距保持不变
      const topPadding = 20
      
      // 动态计算底部空间
      let bottomPadding = 40 // 分时图的底部空间（时间标签）
      let volumeChartHeight = 0
      let volumeChartTop = 0
      
      if (this.currentPeriod !== 'minute') {
        // K线图需要额外空间给成交量图（移除了时间标签空间）
        volumeChartHeight = 35
        const volumeGap = 20 // K线图和成交量图间隔
        const extraSpace = 10 // 少量额外空间
        bottomPadding = volumeGap + volumeChartHeight + extraSpace
        volumeChartTop = topPadding + (this.canvasHeight - topPadding - bottomPadding) + volumeGap
      }
      
      const chartWidth = this.canvasWidth - leftPadding - rightPadding
      const mainChartHeight = this.canvasHeight - topPadding - bottomPadding
      
      // 获取可见数据
      const endIndex = this.klineData.length
      let startIndex, visibleData
      
      if (this.currentPeriod === 'minute') {
        // 分时图显示全部数据
        startIndex = 0
        visibleData = this.klineData
      } else {
        // K线图使用动态可见数量限制
        const visibleCount = this.getVisibleCount()
        startIndex = Math.max(0, endIndex - visibleCount)
        visibleData = this.klineData.slice(startIndex, endIndex)
      }
      
      if (!visibleData.length) {
        ctx.fillStyle = '#999999'
        ctx.font = '16px sans-serif'
        ctx.textAlign = 'center'
        ctx.fillText('暂无K线数据', this.canvasWidth / 2, this.canvasHeight / 2)
        // Canvas 2D绘制是立即的，不需要调用draw()
        return
      }
      
      // 计算价格范围
      let minPrice = Infinity, maxPrice = -Infinity
      
      if (this.currentPeriod === 'minute') {
        visibleData.forEach(item => {
          minPrice = Math.min(minPrice, item.price)
          maxPrice = Math.max(maxPrice, item.price)
        })
      } else {
        visibleData.forEach(item => {
          minPrice = Math.min(minPrice, item.low)
          maxPrice = Math.max(maxPrice, item.high)
        })
      }
      
      const priceRange = maxPrice - minPrice
      const pricePadding = priceRange * 0.1
      minPrice -= pricePadding
      maxPrice += pricePadding
      
      // 绘制背景网格
      this.drawGrid(ctx, leftPadding, topPadding, chartWidth, mainChartHeight, minPrice, maxPrice)
      
      if (this.currentPeriod === 'minute') {
        this.drawMinuteLine(ctx, visibleData, leftPadding, topPadding, chartWidth, mainChartHeight, minPrice, maxPrice)
      } else {
        this.drawKlines(ctx, visibleData, leftPadding, topPadding, chartWidth, mainChartHeight, minPrice, maxPrice)
        this.drawSeparatorLine(ctx, leftPadding, topPadding + mainChartHeight + 10, chartWidth)
        this.drawVolumeChart(ctx, visibleData, leftPadding, volumeChartTop, chartWidth, volumeChartHeight)
        // 移除K线时间标签显示
        // this.drawKlineTimeLabels(ctx, visibleData, leftPadding, topPadding + mainChartHeight + volumeChartHeight + 30, chartWidth)
      }
      
      this.drawPriceLabels(ctx, leftPadding, topPadding, mainChartHeight, minPrice, maxPrice)
      
      // 如果需要显示十字线，在同一个上下文中绘制
      if (this.showCrosshair && this.crosshairX && this.crosshairY) {
        ctx.strokeStyle = '#666666'
        ctx.lineWidth = 1
        ctx.setLineDash([5, 5])
        
        // 绘制垂直线
        ctx.beginPath()
        ctx.moveTo(this.crosshairX, topPadding)
        ctx.lineTo(this.crosshairX, topPadding + mainChartHeight)
        ctx.stroke()
        
        // 绘制水平线
        ctx.beginPath()
        ctx.moveTo(leftPadding, this.crosshairY)
        ctx.lineTo(leftPadding + chartWidth, this.crosshairY)
        ctx.stroke()
        
        ctx.setLineDash([])
        
        // 绘制交叉点
        ctx.fillStyle = '#666666'
        ctx.beginPath()
        ctx.arc(this.crosshairX, this.crosshairY, 3, 0, 2 * Math.PI)
        ctx.fill()
        
        // 绘制价格标签
        if (this.crosshairData) {
          let currentPrice = 0
          if (this.currentPeriod === 'minute') {
            currentPrice = this.crosshairData.price || 0
          } else {
            currentPrice = this.crosshairData.close || 0
          }
          
          const priceText = this.formatPrice(currentPrice)
          ctx.fillStyle = 'rgba(102, 102, 102, 0.8)'
          ctx.fillRect(5, this.crosshairY - 10, 50, 20)
          ctx.fillStyle = '#ffffff'
          ctx.font = '12px sans-serif'  // 从10px增加为12px，提高清晰度
          ctx.textAlign = 'center'
          ctx.fillText(priceText, 30, this.crosshairY + 3)
          
          ctx.fillStyle = 'rgba(102, 102, 102, 0.8)'
          ctx.fillRect(leftPadding + chartWidth + 5, this.crosshairY - 10, 50, 20)
          ctx.fillStyle = '#ffffff'
          ctx.fillText(priceText, leftPadding + chartWidth + 30, this.crosshairY + 3)
        }
      }
      
      // Canvas 2D绘制是立即的，不需要调用draw()
      
      // 绘制完成，重置状态
      this.lastDrawnDataLength = this.klineData.length
      this.lastDrawnPeriod = this.currentPeriod
      this.isDrawing = false
    } catch (error) {
      console.error('绘制图表失败:', error)
      this.isDrawing = false
    }
    },
    
    // 绘制十字线
    async drawCrosshair() {
      // 获取传统Canvas上下文
      const canvasInfo = await this.getCanvasContext()
      if (!canvasInfo) {
        return
      }
      
      const { ctx } = canvasInfo
      
      // 直接使用 Canvas 2D API
      
      const leftPadding = 60  // 进一步增加左边距为价格标签预留更多空间
      const rightPadding = 50  // 右边距保持不变
      const topPadding = 20
      const chartWidth = this.canvasWidth - leftPadding - rightPadding
      let bottomPadding = 60
      if (this.currentPeriod !== 'minute') {
        bottomPadding = 140
      }
      const totalAvailableHeight = this.canvasHeight - topPadding - bottomPadding
      let mainChartHeight = totalAvailableHeight
      
      // 设置十字线样式
      ctx.strokeStyle = '#666666'
      ctx.lineWidth = 1
      ctx.setLineDash([5, 5])
      
      // 绘制垂直线
      ctx.beginPath()
      ctx.moveTo(this.crosshairX, topPadding)
      ctx.lineTo(this.crosshairX, topPadding + mainChartHeight)
      ctx.stroke()
      
      // 绘制水平线
      ctx.beginPath()
      ctx.moveTo(leftPadding, this.crosshairY)
      ctx.lineTo(leftPadding + chartWidth, this.crosshairY)
      ctx.stroke()
      
      // 重置线条样式
      ctx.setLineDash([])
      
      // 在十字线交叉点绘制小圆点
      ctx.fillStyle = '#666666'
      ctx.beginPath()
      ctx.arc(this.crosshairX, this.crosshairY, 3, 0, 2 * Math.PI)
      ctx.fill()
      
      // 在十字线两端显示价格信息
      if (this.crosshairData) {
        this.drawCrosshairLabels(ctx, leftPadding, rightPadding, topPadding, chartWidth, mainChartHeight)
      }
      
      // Canvas 2D绘制是立即的，不需要调用draw()
    },
    
    // 绘制十字线标签
    drawCrosshairLabels(ctx, leftPadding, rightPadding, topPadding, chartWidth, mainChartHeight) {
      // 计算当前价格
      let currentPrice = 0
      if (this.currentPeriod === 'minute') {
        currentPrice = this.crosshairData.price || 0
      } else {
        currentPrice = this.crosshairData.close || 0
      }
      
      // 在左侧显示价格
      const priceText = this.formatPrice(currentPrice)
      ctx.fillStyle = 'rgba(102, 102, 102, 0.8)'
      ctx.fillRect(5, this.crosshairY - 10, 50, 20)
      ctx.fillStyle = '#ffffff'
      ctx.font = '12px sans-serif'  // 从10px增加为12px，提高清晰度
      ctx.textAlign = 'center'
      ctx.fillText(priceText, 30, this.crosshairY + 3)
      
      // 在右侧也显示价格
      ctx.fillStyle = 'rgba(102, 102, 102, 0.8)'
      ctx.fillRect(leftPadding + chartWidth + 5, this.crosshairY - 10, 50, 20)
      ctx.fillStyle = '#ffffff'
      ctx.fillText(priceText, leftPadding + chartWidth + 30, this.crosshairY + 3)
      
      // Canvas 2D绘制是立即的，不需要调用draw()
    },
    
    // 格式化十字线时间显示
    formatCrosshairTime(time) {
      if (!time) return '--'
      if (typeof time === 'string' && time.length >= 4) {
        return time.substring(0, 2) + ':' + time.substring(2, 4)
      }
      return time
    },
    
    // 格式化十字线日期显示
    formatCrosshairDate(date) {
      if (!date) return '--'
      
      // 处理字符串格式的日期
      if (typeof date === 'string') {
        // 如果是 "20250726" 格式（8位）
        if (date.length === 8 && /^\d{8}$/.test(date)) {
          const year = date.substring(0, 4)
          const month = date.substring(4, 6)
          const day = date.substring(6, 8)
          return `${year}-${month}-${day}`
        }
        // 如果是 "2025-07-26" 格式，直接返回
        if (date.includes('-')) {
          return date
        }
      }
      
      // 处理数字格式的日期
      if (typeof date === 'number') {
        const dateStr = date.toString()
        if (dateStr.length === 8) {
          const year = dateStr.substring(0, 4)
          const month = dateStr.substring(4, 6)
          const day = dateStr.substring(6, 8)
          return `${year}-${month}-${day}`
        }
      }
      
      return date.toString()
    },
    
    // 格式化分时图价格变化
    formatPriceChange(currentPrice) {
      if (!currentPrice) return '--'
      
      // 获取昨收价
      const yesterdayClose = this.klineData.length > 0 ? this.klineData[0].price : 0
      if (!yesterdayClose) return '--'
      
      // 计算涨跌幅
      const change = currentPrice - yesterdayClose
      const percent = (change / yesterdayClose) * 100
      return percent > 0 ? `+${percent.toFixed(2)}%` : `${percent.toFixed(2)}%`
    },
    
    // 格式化价格显示
    formatPrice(price) {
      if (!price && price !== 0) return '--'
      return price.toFixed(2)
    },
    
    // 格式化K线价格变化
    formatKlinePriceChange(data) {
      if (!data || !data.open || !data.close) return '--'
      const change = data.close - data.open
      const percent = (change / data.open) * 100
      return percent > 0 ? `+${percent.toFixed(2)}%` : `${percent.toFixed(2)}%`
    },
    
    // 检查点击位置是否在可交互的图表区域内
    isPointInChartArea(x, y) {
      const leftPadding = 60  // 进一步增加左边距为价格标签预留更多空间
      const rightPadding = 50  // 右边距保持不变
      const topPadding = 20
      const chartWidth = this.canvasWidth - leftPadding - rightPadding
      let bottomPadding = 40
      
      // 对于分时图，只检查主图表区域
      if (this.currentPeriod === 'minute') {
        const mainChartHeight = this.canvasHeight - topPadding - bottomPadding
        
        return x >= leftPadding && 
               x <= leftPadding + chartWidth && 
               y >= topPadding && 
               y <= topPadding + mainChartHeight
      } else {
        // 对于K线图，包括主图表区域和成交量图区域
        const volumeChartHeight = 35
        const volumeGap = 20
        const extraSpace = 10
        bottomPadding = volumeGap + volumeChartHeight + extraSpace
        const mainChartHeight = this.canvasHeight - topPadding - bottomPadding
        const totalInteractiveHeight = mainChartHeight + volumeGap + volumeChartHeight
        
        return x >= leftPadding && 
               x <= leftPadding + chartWidth && 
               y >= topPadding && 
               y <= topPadding + totalInteractiveHeight
      }
    },
    
    // 获取价格变化样式类
    getPriceChangeClass(currentPrice, basePrice) {
      if (arguments.length === 1) {
        // 分时图模式，需要与昨收价比较
        const yesterdayClose = this.yesterdayClosePrice || (this.klineData.length > 0 ? this.klineData[0].open : 0)
        if (!currentPrice || !yesterdayClose) return ''
        if (currentPrice > yesterdayClose) return 'price-up'
        if (currentPrice < yesterdayClose) return 'price-down'
        return ''
      } else {
        // K线图模式
        if (!currentPrice || !basePrice) return ''
        if (currentPrice > basePrice) return 'price-up'
        if (currentPrice < basePrice) return 'price-down'
        return ''
      }
    },
    
    // 开始分时图定时刷新
    async startMinuteRefresh() {
      // 先停止已有的定时器
      this.stopMinuteRefresh()
      
      // 只对分时图模式启动定时器
      if (this.currentPeriod !== 'minute') {
        return
      }
      
      // 启动前先检查市场状态
      try {
        const data = await StockApi.getMinuteData(this.stockCode)
        if (data && data.length > 0) {
          // 通过最新分时数据的时间判断市场状态
          const lastTime = data[data.length - 1].time
          const isMarketClosed = this.isMarketClosedByTime(lastTime)
          
          if (isMarketClosed) {
            // 仍然显示数据，但不启动定时器
            this.klineData = data
            if (!this.isDrawing) {
              this.drawChartSafely()
            }
            return
          } else {
            // 显示初始数据
            this.klineData = data
            if (!this.isDrawing) {
              this.drawChartSafely()
            }
          }
        }
      } catch (error) {
        console.warn('检查市场状态失败，仍然启动定时刷新:', error)
      }
      
      // 设置定时器，每2秒刷新一次分时数据（从3秒调整为2秒以提高流畅度）
      this.minuteRefreshTimer = setInterval(async () => {
        // 只有在分时图模式下才刷新
        if (this.currentPeriod === 'minute' && this.stockCode) {
          try {
            const data = await StockApi.getMinuteData(this.stockCode)
            if (data && data.length > 0) {
              // 通过最新分时数据的时间判断市场状态
              const lastTime = data[data.length - 1].time
              const isMarketClosed = this.isMarketClosedByTime(lastTime)
              
              if (isMarketClosed) {
                this.stopMinuteRefresh()
                return
              }
              
              // 检查数据是否真的有更新（对比数据长度和最后一条数据）
              const hasNewData = !this.klineData.length || 
                                data.length !== this.klineData.length ||
                                (data.length > 0 && this.klineData.length > 0 && 
                                 data[data.length - 1].time !== this.klineData[this.klineData.length - 1].time)
              
              if (hasNewData) {
                this.klineData = data
                // 重新绘制图表（保持十字线状态）
                if (!this.isDrawing) {
                  this.drawChartSafely()
                }
              }
            }
            
            // 重置错误计数
            this.refreshErrorCount = 0
            
          } catch (error) {
            console.error('分时图定时刷新失败:', error)
            // 如果连续失败多次，可以考虑停止刷新
            if (!this.refreshErrorCount) {
              this.refreshErrorCount = 0
            }
            this.refreshErrorCount++
            
            if (this.refreshErrorCount >= 3) {
              this.stopMinuteRefresh()
            }
          }
        } else {
          // 如果不是分时图模式，停止定时器
          this.stopMinuteRefresh()
        }
      }, 2000) // 2秒间隔更新分时数据（从3秒调整为2秒）
    },
    
    // 通过时间判断市场状态
    isMarketClosedByTime(timeStr) {
      if (!timeStr) return true
      
      try {
        // 解析时间 "0930" -> 9:30
        const hour = parseInt(timeStr.substring(0, 2))
        const minute = parseInt(timeStr.substring(2, 4))
        const currentMinutes = hour * 60 + minute
        
        // A股交易时间: 9:30-11:30, 13:00-15:00
        const morningStart = 9 * 60 + 30  // 9:30
        const morningEnd = 11 * 60 + 30   // 11:30
        const afternoonStart = 13 * 60    // 13:00
        const afternoonEnd = 15 * 60      // 15:00
        
        // 判断是否在交易时间内
        const inTradingTime = (currentMinutes >= morningStart && currentMinutes <= morningEnd) ||
                             (currentMinutes >= afternoonStart && currentMinutes <= afternoonEnd)
        
        // 如果当前时间是15:00，表示收市
        if (currentMinutes >= afternoonEnd) {
          return true
        }
        
        return !inTradingTime
      } catch (error) {
        console.error('解析交易时间失败:', error)
        return true // 解析失败认为已收市
      }
    },
    
    // 停止分时图定时刷新
    stopMinuteRefresh() {
      if (this.minuteRefreshTimer) {
        clearInterval(this.minuteRefreshTimer)
        this.minuteRefreshTimer = null
      }
      // 重置相关状态
      this.lastMarketCheck = 0
      this.refreshErrorCount = 0
    },
  }
}
</script>

<style lang="scss" scoped>
.kline-chart-container {
  background: #fff;
  border-radius: 12rpx;
  overflow: visible; /* 改为visible确保Canvas可见 */
  width: 100%;
  padding: 0; /* 移除内边距，让图表更充分利用空间 */
  margin: 0; /* 确保没有外边距 */
  /* 移除可能影响同层渲染的CSS属性 */
}

.period-selector {
  display: flex;
  background: #f5f5f5;
  padding: 16rpx;
  gap: 16rpx;
  align-items: center;
  
  .period-item {
    flex: 1;
    text-align: center;
    padding: 12rpx 0;
    background: #fff;
    border-radius: 8rpx;
    font-size: 26rpx;
    color: #666;
    transition: all 0.3s;
    
    &.active {
      background: #1976d2;
      color: #fff;
    }
  }
  
  .debug-controls {
    display: flex;
    align-items: center;
    gap: 8rpx;
    margin-left: 16rpx;
    
    .current-count {
      font-size: 24rpx;
      color: #666;
      min-width: 80rpx;
      text-align: center;
    }
    
    .zoom-btn {
      width: 60rpx;
      height: 60rpx;
      border-radius: 50%;
      background: #ffffff;
      color: #000000;
      border: 2px solid #e0e0e0;
      font-size: 28rpx;
      font-weight: bold;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0;
      margin: 0;
      box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
      transition: all 0.2s ease;
      
      &:active {
        background: #f5f5f5;
        transform: scale(0.95);
        box-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
      }
      
      &:hover {
        border-color: #1976d2;
        box-shadow: 0 3px 6px rgba(0, 0, 0, 0.15);
      }
    }
  }
}

.chart-container {
  position: relative;
  width: 100%;
  height: auto;
  min-height: 200px;
  border: 1px solid #e0e0e0;
  overflow: visible;
  margin: 0; /* 移除外边距 */
  /* 确保可以接收滚轮事件 */
  user-select: none;
  -webkit-user-select: none;
  -moz-user-select: none;
  -ms-user-select: none;
  
  .chart-canvas {
    width: 100%;
    height: 100%;
    display: block;
    position: static !important;
    z-index: auto;
    transform: none !important;
    will-change: auto;
    backface-visibility: visible;
    touch-action: auto;
    pointer-events: auto;
    margin: 0; /* 移除画布边距 */
    /* 确保滚轮事件被正确处理 */
    overflow: hidden;
    -webkit-overflow-scrolling: touch;
  }
}

/* 十字线信息显示 */
.crosshair-info {
  position: absolute;
  top: 10px;
  left: 10px;
  background: rgba(255, 255, 255, 0.95); /* 改为白色半透明背景 */
  border: 1px solid rgba(0, 0, 0, 0.1); /* 添加淡边框 */
  border-radius: 6px;
  padding: 8px 12px;
  z-index: 10;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15); /* 添加阴影 */
  backdrop-filter: blur(4px); /* 增强模糊效果 */
  /* 移除固定宽度，改为自适应 */
  
  .info-content {
    display: flex;
    flex-direction: column;
    gap: 3px;
    
    .info-item {
      font-size: 12px;
      color: #333333;
      white-space: nowrap;
      font-weight: 500;
      line-height: 1.3; /* 添加行高 */
      /* 移除文字阴影，在白色背景下不需要 */
      
      &:first-child {
        color: #666666; /* 日期/时间用稍浅的颜色 */
        font-size: 11px;
        margin-bottom: 2px;
      }
      
      &.price-up {
        color: #FF4444;
        font-weight: 600; /* 涨跌数据用更粗的字体 */
      }
      
      &.price-down {
        color: #00AA44;
        font-weight: 600;
      }
    }
  }
}

/* 十字线信息显示在顶部一行 */
.crosshair-info-top {
  position: absolute;
  top: -2px;
  left: 0;
  right: 0;
  width: calc(100% - 40px); /* 适应极小左边距15px */
  background: rgba(255, 255, 255, 0.95); /* 提高透明度 */
  border: 1px solid rgba(0, 0, 0, 0.08); /* 更淡的边框 */
  border-radius: 6px; /* 增加圆角 */
  padding: 8px 15px; /* 增加内边距 */
  z-index: 10;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08); /* 更柔和的阴影 */
  margin: 5px auto; /* 居中显示 */
  margin-left: 20px; /* 适应新的极小左边距15px */
  
  .info-content {
    display: flex;
    flex-direction: row;
    align-items: center;
    justify-content: center; /* 内容居中显示 */
    
    .info-item {
      font-size: 13px; /* 从12px增加为13px，提高可读性 */
      color: #333333;
      margin-right: 12px; /* 适当增加间距 */
      white-space: nowrap;
      font-weight: 500;
      
      &:last-child {
        margin-right: 0; /* 最后一个元素去除右边距 */
      }
      
      &.price-up {
        color: #ff4949; /* 红色表示上涨 */
        font-weight: 600; /* 加粗涨跌数据 */
      }
      
      &.price-down {
        color: #66cc66; /* 绿色表示下跌 */
        font-weight: 600; /* 加粗涨跌数据 */
      }
    }
  }
}


/* 涨跌幅颜色 */
.price-up {
  color: #ff4949; /* 红色表示上涨 */
}

.price-down {
  color: #66cc66; /* 绿色表示下跌 */
}

.loading-container,
.error-container,
.no-data-container {
  min-height: 200px; // 设置最小高度与chart-container一致
  height: auto; // 改为自动高度
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  
  .loading-spinner {
    width: 40rpx;
    height: 40rpx;
    border: 3rpx solid #e0e0e0;
    border-top: 3rpx solid #1976d2;
    border-radius: 50%;
    animation: spin 1s linear infinite;
    margin-bottom: 16rpx;
  }
  
  .loading-text,
  .error-text,
  .no-data-text {
    color: #999;
    font-size: 28rpx;
    margin-bottom: 16rpx;
  }
  
  .retry-btn {
    padding: 12rpx 24rpx;
    background: #1976d2;
    color: #fff;
    border: none;
    border-radius: 6rpx;
    font-size: 24rpx;
  }
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>