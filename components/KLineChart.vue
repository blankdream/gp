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
            <text class="info-item">{{ formatDate(crosshairData.date, 'detailed') }}</text>
            <text class="info-item">开: {{ formatPrice(crosshairData.open) }}</text>
            <text class="info-item">收: {{ formatPrice(crosshairData.close) }}</text>
            <text class="info-item" :class="getPriceChangeClass(crosshairData.close, crosshairData.open)">幅: {{ formatKlinePriceChange(crosshairData) }}</text>
            <text v-if="crosshairData.ma5" class="info-item ma5">MA5: {{ formatPrice(crosshairData.ma5) }}</text>
            <text v-if="crosshairData.ma10" class="info-item ma10">MA10: {{ formatPrice(crosshairData.ma10) }}</text>
            <text v-if="crosshairData.ma30" class="info-item ma30">MA30: {{ formatPrice(crosshairData.ma30) }}</text>
            <!-- 显示当前选择指标的数值 -->
            <template v-if="currentIndicator === 'MACD'">
              <text v-if="crosshairData.macdDif" class="info-item macd-dif">DIF: {{ formatPrice(crosshairData.macdDif, 4) }}</text>
              <text v-if="crosshairData.macdDea" class="info-item macd-dea">DEA: {{ formatPrice(crosshairData.macdDea, 4) }}</text>
              <text v-if="crosshairData.macdHistogram" class="info-item macd-histogram">MACD: {{ formatPrice(crosshairData.macdHistogram, 4) }}</text>
            </template>
            <template v-else-if="currentIndicator === 'RSI'">
              <text v-if="crosshairData.rsi" class="info-item rsi">RSI: {{ formatPrice(crosshairData.rsi, 2) }}</text>
            </template>
            <template v-else-if="currentIndicator === 'BOLL'">
              <text v-if="crosshairData.bollUpper" class="info-item boll-upper">上轨: {{ formatPrice(crosshairData.bollUpper) }}</text>
              <text v-if="crosshairData.bollMiddle" class="info-item boll-middle">中轨: {{ formatPrice(crosshairData.bollMiddle) }}</text>
              <text v-if="crosshairData.bollLower" class="info-item boll-lower">下轨: {{ formatPrice(crosshairData.bollLower) }}</text>
            </template>
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
      
      <!-- 技术指标组件（替代原来的Canvas绘制） -->
      <VolumeIndicator
        ref="volumeIndicator"
        v-if="currentPeriod !== 'minute' && currentIndicator === 'VOLUME'"
        :kline-data="klineData"
        :visible-data="visibleData"
        :width="canvasWidth"
        :height="indicatorHeight"
        :left-padding="leftPadding"
        :right-padding="rightPadding"
        :top-padding="0"
        :bottom-padding="0"
        :crosshair-index="crosshairDataIndex"
        :crosshair-x="crosshairX"
        :crosshair-y="0"
        :show-crosshair="showCrosshair"
        :colors="indicatorColors"
        :style="indicatorStyle"
        @touch-start="onIndicatorTouchStart"
        @touch-move="onIndicatorTouchMove"
        @touch-end="onIndicatorTouchEnd"
      />
      
      <MACDIndicator
        ref="macdIndicator"
        v-if="currentPeriod !== 'minute' && currentIndicator === 'MACD'"
        :kline-data="klineData"
        :visible-data="visibleData"
        :width="canvasWidth"
        :height="indicatorHeight"
        :left-padding="leftPadding"
        :right-padding="rightPadding"
        :top-padding="0"
        :bottom-padding="0"
        :crosshair-index="crosshairDataIndex"
        :crosshair-x="crosshairX"
        :crosshair-y="0"
        :show-crosshair="showCrosshair"
        :colors="indicatorColors"
        :style="indicatorStyle"
        @touch-start="onIndicatorTouchStart"
        @touch-move="onIndicatorTouchMove"
        @touch-end="onIndicatorTouchEnd"
      />
      
      <RSIIndicator
        ref="rsiIndicator"
        v-if="currentPeriod !== 'minute' && currentIndicator === 'RSI'"
        :kline-data="klineData"
        :visible-data="visibleData"
        :width="canvasWidth"
        :height="indicatorHeight"
        :left-padding="leftPadding"
        :right-padding="rightPadding"
        :top-padding="0"
        :bottom-padding="0"
        :crosshair-index="crosshairDataIndex"
        :crosshair-x="crosshairX"
        :crosshair-y="0"
        :show-crosshair="showCrosshair"
        :colors="indicatorColors"
        :style="indicatorStyle"
        @touch-start="onIndicatorTouchStart"
        @touch-move="onIndicatorTouchMove"
        @touch-end="onIndicatorTouchEnd"
      />
      
      <KDJIndicator
        ref="kdjIndicator"
        v-if="currentPeriod !== 'minute' && currentIndicator === 'KDJ'"
        :kline-data="klineData"
        :visible-data="visibleData"
        :width="canvasWidth"
        :height="indicatorHeight"
        :left-padding="leftPadding"
        :right-padding="rightPadding"
        :top-padding="0"
        :bottom-padding="0"
        :crosshair-index="crosshairDataIndex"
        :crosshair-x="crosshairX"
        :crosshair-y="0"
        :show-crosshair="showCrosshair"
        :colors="indicatorColors"
        :style="indicatorStyle"
        @touch-start="onIndicatorTouchStart"
        @touch-move="onIndicatorTouchMove"
        @touch-end="onIndicatorTouchEnd"
      />
      
      <!-- 指标切换下拉框（仅在非分时图模式下显示，定位在指标图右上角） -->
      <view v-if="currentPeriod !== 'minute'" class="indicator-dropdown-container" :style="dropdownStyle">
        <view class="indicator-dropdown" @tap="toggleDropdown">
          <text class="dropdown-text">{{ getCurrentIndicatorLabel() }}</text>
          <text class="dropdown-arrow" :class="{ active: showDropdown }">▼</text>
        </view>
        <view v-if="showDropdown" class="dropdown-menu">
          <view 
            v-for="indicator in indicators" 
            :key="indicator.value"
            :class="['dropdown-item', { active: currentIndicator === indicator.value }]"
            @tap="selectIndicator(indicator.value)"
          >
            {{ indicator.label }}
          </view>
        </view>
      </view>
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
import TechnicalCalculator from '@/utils/TechnicalCalculator.js'

// 导入技术指标组件
import VolumeIndicator from '@/components/indicators/VolumeIndicator.vue'
import MACDIndicator from '@/components/indicators/MACDIndicator.vue'
import RSIIndicator from '@/components/indicators/RSIIndicator.vue'
import KDJIndicator from '@/components/indicators/KDJIndicator.vue'

// K线图配置常量
const CHART_CONFIG = {
  // 布局配置
  PADDING: {
    LEFT: 20,      // 左边距，为价格标签预留足够空间
    RIGHT_MINUTE: 20,  // 分时图右边距，为涨跌幅标签预留足够空间
    RIGHT_KLINE: 5,    // K线图右边距
    TOP: 10,       // 顶部边距
    BOTTOM: 35,    // 分时图底部边距，为时间标签预留空间
    VOLUME_GAP: 20, // K线图和成交量图间隔
    VOLUME_HEIGHT: 80, // 成交量图高度
    EXTRA_SPACE: 0    // 额外空间
  },
  
  // 分时图时间轴配置
  MINUTE_CHART: {
    // A股交易时间配置
    A_STOCK: {
      TRADING_SESSIONS: [
        { start: 570, end: 690 },   // 09:30 - 11:30 (上午)
        { start: 780, end: 900 }    // 13:00 - 15:00 (下午)
      ],
      TIME_LABELS: [
        { time: '09:30', minutes: 570 },
        { time: '10:30', minutes: 630 },
        { time: '11:30/13:00', isMerged: true }, // 中午休市分界点，不需要minutes
        { time: '14:00', minutes: 840 },
        { time: '15:00', minutes: 900 }
      ],
      TOTAL_TRADING_MINUTES: 240, // 4小时 = 240分钟
      MORNING_MINUTES: 120,       // 上午2小时
      AFTERNOON_MINUTES: 120      // 下午2小时
    },
    
    // 港股交易时间配置
    HK_STOCK: {
      TRADING_SESSIONS: [
        { start: 570, end: 720 },   // 09:30 - 12:00 (上午)
        { start: 780, end: 960 }    // 13:00 - 16:00 (下午)
      ],
      TIME_LABELS: [
        { time: '09:30', minutes: 570 },
        { time: '11:00', minutes: 660 },
        { time: '12:00/13:00', isMerged: true }, // 中午休市分界点
        { time: '14:30', minutes: 870 },
        { time: '16:00', minutes: 960 }
      ],
      TOTAL_TRADING_MINUTES: 330, // 5.5小时 = 330分钟
      MORNING_MINUTES: 150,       // 上午2.5小时 (09:30-12:00)
      AFTERNOON_MINUTES: 180      // 下午3小时 (13:00-16:00)
    },
    
    // 美股交易时间配置（按北京时间，夏令时）
    US_STOCK: {
      TRADING_SESSIONS: [
        { start: 1290, end: 1440 }, // 21:30 - 24:00 (2.5小时)
        { start: 0, end: 240 }      // 00:00 - 04:00 (4小时)
      ],
      TIME_LABELS: [
        { time: '21:30', minutes: 1290 },
        { time: '23:00', minutes: 1380 },
        { time: '00:00/01:00', isMerged: true }, // 跨日分界点
        { time: '02:00', minutes: 120 },
        { time: '04:00', minutes: 240 }
      ],
      TOTAL_TRADING_MINUTES: 390, // 6.5小时 = 390分钟
      MORNING_MINUTES: 150,       // 21:30-24:00 = 2.5小时
      AFTERNOON_MINUTES: 240      // 00:00-04:00 = 4小时
    }
  },
  
  // 颜色配置
  COLORS: {
    UP: '#FF4444',        // 涨（红色）
    DOWN: '#00AA44',      // 跌（绿色）
    NEUTRAL: '#cccccc',   // 中性（灰色）
    GRID: 'rgba(160, 160, 160, 0.3)', // 网格线
    CROSSHAIR: '#666666', // 十字线
    YESTERDAY_CLOSE: '#999999', // 昨收价线
    MA5: '#FFB84D',       // 5日均线（橙色）
    MA10: '#9C7BF5',      // 10日均线（紫色）
    MA30: '#00BFFF',      // 30日均线（天蓝色）
    // 技术指标颜色
    MACD_DIF: '#FFD700',  // MACD DIF线（金色）
    MACD_DEA: '#FF69B4',  // MACD DEA线（粉色）
    MACD_HISTOGRAM: '#32CD32', // MACD柱状图（绿色）
    RSI_LINE: '#9370DB',  // RSI线（紫色）
    RSI_OVERBOUGHT: '#FF4500', // RSI超买线（橙红色）
    RSI_OVERSOLD: '#228B22',   // RSI超卖线（森林绿）
    KDJ_K: '#FF6347',     // KDJ K线（红色）
    KDJ_D: '#32CD32',     // KDJ D线（绿色）
    KDJ_J: '#9370DB'      // KDJ J线（紫色）
  },
  
  // 性能配置
  PERFORMANCE: {
    DRAW_THROTTLE_DELAY: 33,  // 绘制节流延迟（约30fps）
    MINUTE_REFRESH_INTERVAL: 3000, // 分时图刷新间隔（3秒）
    MAX_RETRY_COUNT: 3,       // 最大重试次数
    CANVAS_INIT_RETRY_DELAY: 200, // Canvas初始化重试延迟
    ANIMATION_FRAME_FALLBACK: 16  // requestAnimationFrame降级延迟
  },
  
  // 缩放配置
  ZOOM: {
    MIN_VISIBLE_COUNT: 30,    // 最小显示数量
    MAX_VISIBLE_COUNT: 200,   // 最大显示数量
    WHEEL_STEP: 3,            // 滚轮缩放步长
    TOUCH_SENSITIVITY: 0.5,   // 触摸缩放敏感度
    THROTTLE_DELAY: 16        // 缩放节流延迟
  },
  
  // 交互配置
  INTERACTION: {
    DOUBLE_CLICK_THRESHOLD: 400, // 双击检测阈值（毫秒）
    DRAG_THRESHOLD: 5,           // 拖拽检测阈值（像素）
    CROSSHAIR_RADIUS: 3,         // 十字线交叉点半径
    CROSSHAIR_DRAG_THROTTLE: 30  // 十字线拖拽节流延迟（毫秒）
  },
  
  // 字体配置
  FONTS: {
    PRICE_LABEL: '11px sans-serif',
    TIME_LABEL: '12px sans-serif',
    CROSSHAIR_LABEL: '12px sans-serif',
    VOLUME_LABEL: '11px sans-serif'
  }
}

export default {
  name: "KLineChart",
  components: {
    VolumeIndicator,
    MACDIndicator,
    RSIIndicator,
    KDJIndicator
  },
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
      drawThrottleDelay: CHART_CONFIG.PERFORMANCE.DRAW_THROTTLE_DELAY,
      // Canvas初始化状态
      canvasInitializing: false, // 新增：防止重复初始化
      // 防止initChart重复执行
      chartInitialized: false,
      initChartTimeout: null,
      // 缩放功能相关
      currentVisibleCount: 50, // 当前可见的K线数量（动态调整）
      isZooming: false, // 是否正在缩放
      lastDistance: 0, // 上次双指间距离
      zoomStartDistance: 0, // 缩放开始时的双指距离
      zoomStartVisibleCount: 50, // 缩放开始时的可见数量
      zoomThrottleTimer: null, // 缩放节流定时器
      crosshairDragThrottleTimer: null, // 十字线拖拽节流定时器
      // 缩放边界设置
      minVisibleCount: CHART_CONFIG.ZOOM.MIN_VISIBLE_COUNT, // 最小显示数量
      maxVisibleCount: CHART_CONFIG.ZOOM.MAX_VISIBLE_COUNT, // 最大显示数量
      // 缩放敏感度设置
      wheelZoomStep: CHART_CONFIG.ZOOM.WHEEL_STEP, // 滚轮每次缩放的步长
      touchZoomSensitivity: CHART_CONFIG.ZOOM.TOUCH_SENSITIVITY, // 触摸缩放敏感度
      lastWheelDirection: 1, // 用于交替滚轮方向的变量
      
      // 分时图专用数据
      minuteLinePath: [], // 分时线路径数据，用于十字线交互
      
      // 技术指标相关
      currentIndicator: 'VOLUME', // 当前显示的指标：VOLUME, MACD, RSI, KDJ
      indicators: [
        { label: '成交量', value: 'VOLUME' },
        { label: 'MACD', value: 'MACD' },
        { label: 'RSI', value: 'RSI' },
        { label: 'KDJ', value: 'KDJ' }
      ],
      indicatorData: {}, // 缓存计算好的指标数据
      showDropdown: false, // 控制下拉菜单显示
      dropdownTimer: null // 下拉框自动关闭定时器
    }
  },
  
  computed: {
    // 指标区域高度
    indicatorHeight() {
      return CHART_CONFIG.PADDING.VOLUME_HEIGHT
    },
    
    // 指标颜色配置
    indicatorColors() {
      return {
        UP: CHART_CONFIG.COLORS.UP,
        DOWN: CHART_CONFIG.COLORS.DOWN,
        NEUTRAL: CHART_CONFIG.COLORS.NEUTRAL,
        GRID: CHART_CONFIG.COLORS.GRID, // 添加网格线颜色传递
        CROSSHAIR: CHART_CONFIG.COLORS.CROSSHAIR, // 添加十字线颜色传递
        MACD_DIF: CHART_CONFIG.COLORS.MACD_DIF,
        MACD_DEA: CHART_CONFIG.COLORS.MACD_DEA,
        MACD_HISTOGRAM: CHART_CONFIG.COLORS.MACD_HISTOGRAM,
        RSI_LINE: CHART_CONFIG.COLORS.RSI_LINE,
        RSI_OVERBOUGHT: CHART_CONFIG.COLORS.RSI_OVERBOUGHT,
        RSI_OVERSOLD: CHART_CONFIG.COLORS.RSI_OVERSOLD,
        KDJ_K: CHART_CONFIG.COLORS.KDJ_K,
        KDJ_D: CHART_CONFIG.COLORS.KDJ_D,
        KDJ_J: CHART_CONFIG.COLORS.KDJ_J
      }
    },
    
    // 指标组件样式
    indicatorStyle() {
      const layout = this.calculateChartLayout()
      return {
        position: 'absolute',
        left: '0px',
        top: `${layout.volumeChartTop}px`,
        width: `${this.canvasWidth}px`,
        height: `${this.indicatorHeight}px`,
        zIndex: 1
      }
    },
    
    // 下拉框动态样式，定位到指标图右上角
    dropdownStyle() {
      try {
        const layout = this.calculateChartLayout()
        // 安全检查，如果layout还没准备好，使用默认位置
        if (!layout || layout.volumeChartTop === undefined) {
          return {
            position: 'absolute',
            bottom: '10px', // 默认位置
            right: '0px',
            zIndex: 20
          }
        }
        
        return {
          position: 'absolute',
          top: `${layout.volumeChartTop + 5}px`, // 指标图顶部往下5px
          right: '0px',
          zIndex: 20
        }
      } catch (error) {
        // 如果计算失败，使用默认位置
        return {
          position: 'absolute',
          bottom: '10px',
          right: '0px',
          zIndex: 20
        }
      }
    },
    
    // 布局参数（供指标组件使用）
    leftPadding() {
      return CHART_CONFIG.PADDING.LEFT
    },
    
    rightPadding() {
      return this.getRightPadding()
    },
    
    // 当前可见数据（供指标组件使用）
    visibleData() {
      if (!this.klineData.length) return []
      
      if (this.currentPeriod === 'minute') {
        return this.klineData
      } else {
        const endIndex = this.klineData.length
        const visibleCount = this.getVisibleCount()
        const startIndex = Math.max(0, endIndex - visibleCount)
        const result = this.klineData.slice(startIndex, endIndex)
        
        // 强制返回新的数组引用以触发响应式更新
        return [...result]
      }
    }
  },
  
  created() {
    // 完全移除 animationScheduler 初始化
  },
  mounted() {
    try {
      if (!this.stockCode) {
        this.errorMessage = '股票代码为空'
        return
      }
      
      // 强制清除Vue组件缓存，确保代码更新生效
      this.$forceUpdate()
      
      // 确保组件挂载后加载数据
      this.$nextTick(() => {
        this.initChart()
        // 移除重复的loadKlineData调用，initChart方法已经处理了数据加载
      })
      
      // 添加全局点击事件监听器，用于关闭下拉框（仅在H5环境下）
      // 暂时注释掉，避免小程序环境报错
      // #ifdef H5
      // if (typeof document !== 'undefined') {
      //   document.addEventListener('click', this.handleGlobalClick)
      // }
      // #endif
      
      // 添加调试信息
      // K线图组件已挂载
    } catch (error) {
      console.error('KLineChart mounted error:', error)
      this.errorMessage = '组件初始化失败'
    }
  },
  beforeDestroy() {
    this.cleanup()
    // 暂时注释掉，避免小程序环境报错
    // #ifdef H5
    // if (typeof document !== 'undefined') {
    //   document.removeEventListener('click', this.handleGlobalClick)
    // }
    // #endif
  },
  beforeUnmount() {
    // Vue 3 兼容性
    this.cleanup()
    // 暂时注释掉，避免小程序环境报错
    // #ifdef H5
    // if (typeof document !== 'undefined') {
    //   document.removeEventListener('click', this.handleGlobalClick)
    // }
    // #endif
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
    },
    
    // 监听可见数量变化，手动触发指标更新
    currentVisibleCount(newCount, oldCount) {
      
      // 手动触发指标组件更新
      this.$nextTick(() => {
        this.updateIndicators()
      })
    }
  },
  methods: {
    // 手动更新所有指标组件
    updateIndicators() {
      // 获取所有指标组件的引用
      const indicatorRefs = [
        this.$refs.volumeIndicator,
        this.$refs.macdIndicator, 
        this.$refs.rsiIndicator,
        this.$refs.kdjIndicator
      ].filter(ref => ref) // 过滤掉不存在的引用
      
      // 强制更新每个指标组件
      indicatorRefs.forEach((indicatorRef, index) => {
        if (indicatorRef && indicatorRef.$refs && indicatorRef.$refs.baseIndicator) {
          const baseIndicator = indicatorRef.$refs.baseIndicator
          
          if (typeof baseIndicator.calculateIndicatorData === 'function') {
            // 强制更新指标组件，让Vue重新传递props
            indicatorRef.$forceUpdate()
            
            // 等待组件更新完成再调用计算方法
            this.$nextTick(() => {
              baseIndicator.calculateIndicatorData()
              baseIndicator.drawIndicator()
            })
          }
        }
      })
    },
    
    // 时间转换辅助方法
    
    /**
     * 根据股票代码识别市场类型
     * @param {string} stockCode 股票代码
     * @returns {string} 市场类型：A_STOCK, HK_STOCK, US_STOCK
     */
    getMarketType(stockCode) {
      if (!stockCode) return 'A_STOCK'
      
      const code = stockCode.toUpperCase()
      
      // 港股：hk开头或5位数字
      if (code.startsWith('HK') || /^\d{5}$/.test(code)) {
        return 'HK_STOCK'
      }
      
      // 美股：us开头或纯字母
      if (code.startsWith('US') || /^[A-Z]+$/.test(code) || code.includes('.US')) {
        return 'US_STOCK'
      }
      
      // 默认A股
      return 'A_STOCK'
    },
    
    /**
     * 获取当前市场的时间配置
     * @returns {Object} 时间配置对象
     */
    getCurrentMarketConfig() {
      const marketType = this.getMarketType(this.stockCode)
      return CHART_CONFIG.MINUTE_CHART[marketType]
    },
    
    /**
     * 将时间字符串转换为分钟数（从00:00开始计算）
     * @param {string} timeStr 时间字符串，如 "0930" 或 "09:30"
     * @returns {number} 分钟数
     */
    timeToMinutes(timeStr) {
      if (!timeStr) return 0
      
      // 处理不同格式的时间字符串
      let cleanTime = timeStr.replace(/[^0-9]/g, '') // 移除所有非数字字符
      if (cleanTime.length < 4) {
        cleanTime = cleanTime.padStart(4, '0')
      }
      
      const hour = parseInt(cleanTime.substring(0, 2), 10)
      const minute = parseInt(cleanTime.substring(2, 4), 10)
      
      return hour * 60 + minute
    },
    
    /**
     * 根据时间计算在分时图中的X坐标位置
     * @param {string} timeStr 时间字符串
     * @param {number} chartWidth 图表宽度
     * @param {number} leftPadding 左边距
     * @returns {number} X坐标
     */
    getMinuteChartXPosition(timeStr, chartWidth, leftPadding) {
      const minutes = this.timeToMinutes(timeStr)
      const config = this.getCurrentMarketConfig()
      const marketType = this.getMarketType(this.stockCode)
      
      let adjustedMinutes = minutes
      
      // 美股特殊处理：次日时间（0-4点）需要特殊映射到第二个交易时段
      if (marketType === 'US_STOCK' && minutes >= 0 && minutes <= 240) {
        // 次日时间直接对应第二个交易时段
        const sessionMinutes = minutes - config.TRADING_SESSIONS[1].start
        const sessionProgress = sessionMinutes / config.AFTERNOON_MINUTES // 0-1
        const sessionWidth = chartWidth * 0.5 // 第二时段占50%宽度
        return leftPadding + chartWidth * 0.5 + sessionProgress * sessionWidth
      }
      
      // 判断属于哪个交易时段
      if (adjustedMinutes >= config.TRADING_SESSIONS[0].start && adjustedMinutes <= config.TRADING_SESSIONS[0].end) {
        // 第一个交易时段（上午或美股前半段）
        const sessionMinutes = adjustedMinutes - config.TRADING_SESSIONS[0].start
        const sessionProgress = sessionMinutes / config.MORNING_MINUTES // 0-1
        const sessionWidth = chartWidth * 0.5 // 第一时段占50%宽度
        return leftPadding + sessionProgress * sessionWidth
      } else if (config.TRADING_SESSIONS[1] && 
                 adjustedMinutes >= config.TRADING_SESSIONS[1].start && 
                 adjustedMinutes <= config.TRADING_SESSIONS[1].end) {
        // 第二个交易时段（下午或美股后半段）
        const sessionMinutes = adjustedMinutes - config.TRADING_SESSIONS[1].start
        const sessionProgress = sessionMinutes / config.AFTERNOON_MINUTES // 0-1
        const sessionWidth = chartWidth * 0.5 // 第二时段占50%宽度
        return leftPadding + chartWidth * 0.5 + sessionProgress * sessionWidth
      } else {
        // 非交易时间，返回最近的边界位置
        if (adjustedMinutes < config.TRADING_SESSIONS[0].start) {
          return leftPadding // 开盘前
        } else if (config.TRADING_SESSIONS[1] && 
                   adjustedMinutes > config.TRADING_SESSIONS[0].end && 
                   adjustedMinutes < config.TRADING_SESSIONS[1].start) {
          return leftPadding + chartWidth * 0.5 // 中间休息
        } else {
          return leftPadding + chartWidth // 收盘后
        }
      }
    },
    
    /**
     * 处理不同市场的时间调整（主要针对美股跨日）
     * @param {number} minutes 原始分钟数
     * @returns {number} 调整后的分钟数
     */
    adjustMinutesForMarket(minutes) {
      const marketType = this.getMarketType(this.stockCode)
      
      // 美股需要处理跨日情况，但保持原始分钟数，因为我们的配置已经调整了
      if (marketType === 'US_STOCK') {
        // 不需要额外转换，配置中已正确定义了时间范围
        return minutes
      }
      
      return minutes
    },
    
    /**
     * 根据X坐标反推对应的时间
     * @param {number} x X坐标
     * @param {number} chartWidth 图表宽度
     * @param {number} leftPadding 左边距
     * @returns {string} 时间字符串
     */
    getTimeFromXPosition(x, chartWidth, leftPadding) {
      const relativeX = x - leftPadding
      const progress = relativeX / chartWidth
      const config = this.getCurrentMarketConfig()
      
      if (progress <= 0.5) {
        // 第一个交易时段
        const sessionProgress = progress * 2 // 0-1
        const sessionMinutes = sessionProgress * config.MORNING_MINUTES
        const totalMinutes = config.TRADING_SESSIONS[0].start + sessionMinutes
        return this.formatMinutesToTime(totalMinutes)
      } else {
        // 第二个交易时段
        const sessionProgress = (progress - 0.5) * 2 // 0-1
        const sessionMinutes = sessionProgress * config.AFTERNOON_MINUTES
        const totalMinutes = config.TRADING_SESSIONS[1].start + sessionMinutes
        return this.formatMinutesToTime(totalMinutes)
      }
    },
    
    /**
     * 将分钟数格式化为时间字符串
     * @param {number} minutes 分钟数
     * @returns {string} 时间字符串
     */
    formatMinutesToTime(minutes) {
      const marketType = this.getMarketType(this.stockCode)
      
      // 美股需要处理跨日显示
      if (marketType === 'US_STOCK' && minutes > 1440) {
        minutes = minutes - 1440 // 减去24小时，显示次日时间
      }
      
      const hour = Math.floor(minutes / 60)
      const minute = Math.floor(minutes % 60)
      return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`
    },
    
    // 统一的清理方法
    cleanup() {
      this.stopMinuteRefresh()
      if (this.loadKlineDataTimer) {
        clearTimeout(this.loadKlineDataTimer)
        this.loadKlineDataTimer = null
      }
      if (this.initChartTimeout) {
        clearTimeout(this.initChartTimeout)
        this.initChartTimeout = null
      }
      // 清理下拉框定时器
      if (this.dropdownTimer) {
        clearTimeout(this.dropdownTimer)
        this.dropdownTimer = null
      }
      // 清理缩放相关定时器
      if (this.zoomThrottleTimer) {
        clearTimeout(this.zoomThrottleTimer)
        this.zoomThrottleTimer = null
      }
      // 清理十字线拖拽节流定时器
      if (this.crosshairDragThrottleTimer) {
        clearTimeout(this.crosshairDragThrottleTimer)
        this.crosshairDragThrottleTimer = null
      }
    },
    
    // 计算图表布局参数
    calculateChartLayout() {
      const leftPadding = CHART_CONFIG.PADDING.LEFT
      const rightPadding = this.getRightPadding()
      const topPadding = CHART_CONFIG.PADDING.TOP
      
      let bottomPadding = CHART_CONFIG.PADDING.BOTTOM
      let volumeChartHeight = 0
      let volumeChartTop = 0
      
      if (this.currentPeriod !== 'minute') {
        volumeChartHeight = CHART_CONFIG.PADDING.VOLUME_HEIGHT
        const volumeGap = CHART_CONFIG.PADDING.VOLUME_GAP
        const extraSpace = CHART_CONFIG.PADDING.EXTRA_SPACE
        bottomPadding = volumeGap + volumeChartHeight + extraSpace
        volumeChartTop = topPadding + (this.canvasHeight - topPadding - bottomPadding) + volumeGap
      }
      
      const chartWidth = this.canvasWidth - leftPadding - rightPadding
      const mainChartHeight = this.canvasHeight - topPadding - bottomPadding
      
      return {
        leftPadding,
        rightPadding,
        topPadding,
        bottomPadding,
        chartWidth,
        mainChartHeight,
        volumeChartHeight,
        volumeChartTop
      }
    },
    
    // 获取右边距（根据图表类型动态调整）
    getRightPadding() {
      return this.currentPeriod === 'minute' ? CHART_CONFIG.PADDING.RIGHT_MINUTE : CHART_CONFIG.PADDING.RIGHT_KLINE
    },
    
    // createAnimationScheduler方法已移除，直接使用setTimeout
    
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
      
      // 缩放时关闭十字线和详情，因为数据范围改变后十字线位置无效
      this.showCrosshair = false
      this.crosshairData = null
      this.crosshairDataIndex = -1
      
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
        }, CHART_CONFIG.ZOOM.THROTTLE_DELAY)
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
    
    // 获取Canvas 2D上下文（优化缓存）
    async getCanvasContext() {
      if (!this.canvasWidth || !this.canvasHeight) {
        return null
      }
      
      // 如果已有有效的上下文，直接返回
      if (this.canvas2D && this.ctx2D) {
        // 验证上下文是否仍然有效
        try {
          this.ctx2D.save()
          this.ctx2D.restore()
          return {
            ctx: this.ctx2D,
            canvas: this.canvas2D,
            width: this.canvasWidth,
            height: this.canvasHeight
          }
        } catch (error) {
          // 上下文已失效，需要重新初始化
          this.canvas2D = null
          this.ctx2D = null
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
    
    // 初始化Canvas 2D API（带重试机制，使用配置常量）
    async initCanvas2D(retryCount = 0) {
      const maxRetries = CHART_CONFIG.PERFORMANCE.MAX_RETRY_COUNT
      const retryDelay = CHART_CONFIG.PERFORMANCE.CANVAS_INIT_RETRY_DELAY + (retryCount * 100) // 递增延迟
      
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
    
    // 节流绘制方法（使用统一动画调度器）
    throttledDraw() {
      const now = Date.now()
      if (now - this.lastDrawTimestamp < this.drawThrottleDelay) {
        return
      }
      this.lastDrawTimestamp = now
      
      if (!this.isDrawing) {
        setTimeout(() => {
          this.drawChart()
        }, 16)
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
      const topPadding = CHART_CONFIG.PADDING.TOP
      const mainChartHeight = 220 // 主图表固定高度
      
      if (this.currentPeriod === 'minute') {
        // 分时图：主图 + 时间标签空间
        const bottomPadding = CHART_CONFIG.PADDING.BOTTOM
        return topPadding + mainChartHeight + bottomPadding
      } else {
        // K线图：主图 + 成交量图（日期标签在中间，不需要额外空间）
        const volumeChartHeight = CHART_CONFIG.PADDING.VOLUME_HEIGHT
        const volumeGap = CHART_CONFIG.PADDING.VOLUME_GAP
        const extraSpace = CHART_CONFIG.PADDING.EXTRA_SPACE
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
        if (!this.klineData.length) {
          // 统一在这里加载数据，避免重复调用
          this.loadKlineData()
        } else if (this.klineData.length > 0 && this.canvasWidth > 0) {
          if (!this.isDrawing) {
            this.drawChartSafely()
          }
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
      
      // 防止重复调用：如果已经在加载相同的数据，直接返回
      if (this.loading && this.currentLoadingPeriod === this.currentPeriod) {
        return
      }
      
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
          this.minVisibleCount = CHART_CONFIG.ZOOM.MIN_VISIBLE_COUNT  // 最少显示30根月K线
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
        
        // 使用统一的布局计算
        const layout = this.calculateChartLayout()
        const { leftPadding, topPadding, chartWidth, mainChartHeight, volumeChartHeight, volumeChartTop } = layout
        
        // 绘制参数调试
        
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
          // 在K线和成交量之间绘制日期标签，上移5px避免遮挡成交量图
          this.drawKlineDateLabels(ctx, visibleData, leftPadding, topPadding + mainChartHeight + 25, chartWidth)
          
          // 指标图表现在由动态组件处理，不再在这里绘制
        }
        
        this.drawPriceLabels(ctx, leftPadding, topPadding, mainChartHeight, minPrice, maxPrice)
        
        // 如果需要显示十字线，在同一个上下文中绘制
        if (this.showCrosshair && this.crosshairX && this.crosshairY) {
          
          ctx.strokeStyle = CHART_CONFIG.COLORS.CROSSHAIR
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
          ctx.fillStyle = CHART_CONFIG.COLORS.CROSSHAIR
          ctx.beginPath()
          ctx.arc(this.crosshairX, this.crosshairY, CHART_CONFIG.INTERACTION.CROSSHAIR_RADIUS, 0, 2 * Math.PI)
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
            ctx.font = CHART_CONFIG.FONTS.CROSSHAIR_LABEL
            ctx.textAlign = 'center'
            ctx.fillText(priceText, 30, this.crosshairY + 3)
            
            ctx.fillStyle = 'rgba(102, 102, 102, 0.8)'
            ctx.fillRect(leftPadding + chartWidth + 5, this.crosshairY - 10, 50, 20)
            ctx.fillStyle = '#ffffff'
            ctx.fillText(priceText, leftPadding + chartWidth + 30, this.crosshairY + 3)
          }
        } else {
          // 十字线绘制条件不满足
        }
        
        this.lastDrawnDataLength = this.klineData.length
        this.lastDrawnPeriod = this.currentPeriod
      } catch (error) {
        console.error('drawChart: 绘制出错:', error)
      } finally {
        this.isDrawing = false
      }
    },
    
    // 绘制网格
    drawGrid(ctx, leftPadding, topPadding, width, height, minPrice, maxPrice) {
      ctx.strokeStyle = CHART_CONFIG.COLORS.GRID  // 使用配置的网格线颜色
      ctx.lineWidth = 0.8  // 增加线条粗细，确保清晰可见
      
      // 绘制水平网格线（价格线）- 与价格标签精确对应，9条线
      for (let i = 0; i <= 8; i++) {
        const y = topPadding + (height / 8) * i  // 与价格标签位置完全对应
        
        // 为了确保可见性，对中间的几条线使用稍微粗一点的线条
        if (i >= 1 && i <= 7) {
          ctx.lineWidth = 1.0  // 中间线条稍粗
        } else {
          ctx.lineWidth = 0.8  // 边界线条
        }
        
        ctx.beginPath()
        ctx.moveTo(leftPadding, y)
        ctx.lineTo(leftPadding + width, y)
        ctx.stroke()
      }
      
      // 绘制垂直网格线（时间线）- 与日期标签对应
      // 只在左、中、右三个位置绘制垂直线，对应3个日期标签
      const marginLR = 20
      const labelWidth = width - (marginLR * 2)
      
      // 左边网格线 - 对应左边日期标签
      const leftX = leftPadding + marginLR
      ctx.beginPath()
      ctx.moveTo(leftX, topPadding)
      ctx.lineTo(leftX, topPadding + height)
      ctx.stroke()
      
      // 中间网格线 - 对应中间日期标签
      const middleX = leftPadding + width / 2
      ctx.beginPath()
      ctx.moveTo(middleX, topPadding)
      ctx.lineTo(middleX, topPadding + height)
      ctx.stroke()
      
      // 右边网格线 - 对应右边日期标签
      const rightX = leftPadding + marginLR + labelWidth
      ctx.beginPath()
      ctx.moveTo(rightX, topPadding)
      ctx.lineTo(rightX, topPadding + height)
      ctx.stroke()
      
      // 添加边界网格线
      ctx.beginPath()
      ctx.moveTo(leftPadding, topPadding)
      ctx.lineTo(leftPadding, topPadding + height)
      ctx.stroke()
      
      ctx.beginPath()
      ctx.moveTo(leftPadding + width, topPadding)
      ctx.lineTo(leftPadding + width, topPadding + height)
      ctx.stroke()
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
      const upColor = CHART_CONFIG.COLORS.UP   // 红色 - 涨
      const downColor = CHART_CONFIG.COLORS.DOWN // 绿色 - 跌
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
      
      // 绘制移动平均线（只在K线图模式下）
      if (this.currentPeriod !== 'minute') {
        this.drawMovingAverages(ctx, data, leftPadding, topPadding, width, height, minPrice, maxPrice, barWidth)
      }
    },
    
    // 绘制移动平均线
    drawMovingAverages(ctx, data, leftPadding, topPadding, width, height, minPrice, maxPrice, barWidth) {
      if (!data || data.length === 0) return
      
      const priceRange = maxPrice - minPrice
      if (priceRange === 0) return
      
      // 计算移动平均线
      const { ma5, ma10, ma30 } = this.calculateMovingAverages(data)
      
      // 绘制配置
      const maLines = [
        { values: ma5, color: CHART_CONFIG.COLORS.MA5, lineWidth: 1.5 },
        { values: ma10, color: CHART_CONFIG.COLORS.MA10, lineWidth: 1.5 },
        { values: ma30, color: CHART_CONFIG.COLORS.MA30, lineWidth: 1.5 }
      ]
      
      // 绘制每条移动平均线
      maLines.forEach(({ values, color, lineWidth }) => {
        if (!values || values.length === 0) return
        
        ctx.strokeStyle = color
        ctx.lineWidth = lineWidth
        ctx.beginPath()
        
        let pathStarted = false
        
        for (let i = 0; i < values.length; i++) {
          const maValue = values[i]
          
          if (maValue !== null && maValue !== undefined && !isNaN(maValue)) {
            const x = leftPadding + i * barWidth + barWidth / 2
            const y = topPadding + height - ((maValue - minPrice) / priceRange) * height
            
            if (!pathStarted) {
              ctx.moveTo(x, y)
              pathStarted = true
            } else {
              ctx.lineTo(x, y)
            }
          } else {
            // 遇到null值，结束当前路径并开始新的路径
            if (pathStarted) {
              ctx.stroke()
              ctx.beginPath()
              pathStarted = false
            }
          }
        }
        
        if (pathStarted) {
          ctx.stroke()
        }
      })
    },
    
    // 指标相关的旧方法已移至独立组件
    
    // 绘制分时线（使用固定时间轴）
    drawMinuteLine(ctx, data, leftPadding, topPadding, width, height, minPrice, maxPrice) {
      if (data.length < 1) return
      
      const priceRange = maxPrice - minPrice
      if (priceRange === 0) return // 防止除零错误
      
      // 获取昨收价（使用第一个数据点的价格作为参考，或者可以从API获取真实昨收价）
      const yesterdayClose = data[0] ? data[0].price : 0
      
      // 确保昨收价在价格范围内，如果不在则不绘制昨收价线
      let yesterdayCloseY = null
      if (yesterdayClose >= minPrice && yesterdayClose <= maxPrice) {
        yesterdayCloseY = topPadding + height - ((yesterdayClose - minPrice) / priceRange) * height
        
        // 绘制昨收价基准线（虚线）
        ctx.strokeStyle = CHART_CONFIG.COLORS.YESTERDAY_CLOSE
        ctx.lineWidth = 1
        ctx.setLineDash([5, 5])
        ctx.beginPath()
        ctx.moveTo(leftPadding, yesterdayCloseY)
        ctx.lineTo(leftPadding + width, yesterdayCloseY)
        ctx.stroke()
        ctx.setLineDash([])
      }
      
      // 根据时间轴创建数据点路径
      const linePath = []
      
      for (let i = 0; i < data.length; i++) {
        const item = data[i]
        if (!item || !item.time) continue
        
        // 使用固定时间轴计算X坐标
        const x = this.getMinuteChartXPosition(item.time, width, leftPadding)
        const y = topPadding + height - ((item.price - minPrice) / priceRange) * height
        
        linePath.push({ 
          x, 
          y, 
          price: item.price, 
          time: item.time,
          volume: item.volume || 0,
          amount: item.amount || 0
        })
      }
      
      if (linePath.length === 0) return
      
      // 按X坐标排序，确保连线正确
      linePath.sort((a, b) => a.x - b.x)
      
      // 根据价格相对昨收的位置决定颜色
      const currentPrice = linePath[linePath.length - 1].price
      const isUp = currentPrice >= yesterdayClose
      const lineColor = isUp ? CHART_CONFIG.COLORS.UP : CHART_CONFIG.COLORS.DOWN
      
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
        const point = linePath[i]
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
      
      // 绘制固定时间标签
      this.drawFixedTimeLabels(ctx, leftPadding, topPadding, width, height)
      
      // 存储线路径供十字线使用
      this.minuteLinePath = linePath
    },
    
    // 绘制固定时间标签（分时图专用）
    drawFixedTimeLabels(ctx, leftPadding, topPadding, width, height) {
      ctx.fillStyle = '#666'
      ctx.font = CHART_CONFIG.FONTS.TIME_LABEL
      
      const config = this.getCurrentMarketConfig()
      const labels = config.TIME_LABELS
      
      // 绘制每个时间标签
      labels.forEach((labelConfig, index) => {
        const y = topPadding + height + 20
        
        if (labelConfig.isMerged) {
          // 合并标签：在中间位置显示
          const x = leftPadding + width * 0.5
          ctx.textAlign = 'center'
          ctx.fillText(labelConfig.time, x, y)
        } else {
          // 普通标签：根据时间计算位置
          const x = this.getMinuteChartXPosition(labelConfig.time, width, leftPadding)
          
          // 根据位置调整对齐方式
          if (index === 0) {
            // 第一个标签左对齐
            ctx.textAlign = 'left'
            ctx.fillText(labelConfig.time, leftPadding + 5, y)
          } else if (index === labels.length - 1) {
            // 最后一个标签右对齐
            ctx.textAlign = 'right'
            ctx.fillText(labelConfig.time, leftPadding + width - 5, y)
          } else {
            // 中间标签居中对齐
            ctx.textAlign = 'center'
            ctx.fillText(labelConfig.time, x, y)
          }
        }
      })
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
    
    // 绘制K线日期标签（3个均匀分布的日期标签）
    drawKlineDateLabels(ctx, data, leftPadding, yPosition, width) {
      if (!data || data.length === 0) return
      
      ctx.fillStyle = '#666666'
      ctx.font = CHART_CONFIG.FONTS.TIME_LABEL
      ctx.textAlign = 'center'
      
      // 设置左右边距为20px
      const marginLR = 20
      const labelWidth = width - (marginLR * 2)
      const labelStartX = leftPadding + marginLR
      
      // 计算3个标签的位置索引：左边、中间、右边
      const leftIndex = 0
      const middleIndex = Math.floor(data.length / 2)
      const rightIndex = data.length - 1
      
      // 计算每个标签对应的K线中心位置
      const barWidth = width / data.length
      
      // 左边标签
      if (data[leftIndex] && data[leftIndex].date) {
        const leftX = labelStartX
        const leftDate = this.formatDate(data[leftIndex].date)
        ctx.textAlign = 'left'
        ctx.fillText(leftDate, leftX, yPosition)
      }
      
      // 中间标签
      if (data[middleIndex] && data[middleIndex].date) {
        const middleX = leftPadding + middleIndex * barWidth + barWidth / 2
        // 确保中间标签在可用区域内
        const clampedMiddleX = Math.max(labelStartX + 50, Math.min(labelStartX + labelWidth - 50, middleX))
        const middleDate = this.formatDate(data[middleIndex].date)
        ctx.textAlign = 'center'
        ctx.fillText(middleDate, clampedMiddleX, yPosition)
      }
      
      // 右边标签
      if (data[rightIndex] && data[rightIndex].date) {
        const rightX = labelStartX + labelWidth
        const rightDate = this.formatDate(data[rightIndex].date)
        ctx.textAlign = 'right'
        ctx.fillText(rightDate, rightX, yPosition)
      }
    },
    // 格式化日期显示（统一方法）
    formatDate(date, format = 'simple') {
      if (!date) return '--'
      
      if (format === 'simple') {
        // 简单格式：直接返回接口返回的日期字符串
        return date.toString()
      } else {
        // 详细格式：用于十字线显示
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
      }
    },
    
    // 绘制时间轴标签（K线图专用）
    drawTimeLabels(ctx, data, leftPadding, topPadding, width, height) {
      if (!data || data.length === 0) return
      
      ctx.fillStyle = '#666'
      ctx.font = '12px sans-serif'  // 从10px增加为12px，提高清晰度
      
      // 分时图使用专门的固定时间标签方法，这里只处理K线图
      if (this.currentPeriod === 'minute') {
        return // 分时图已在 drawFixedTimeLabels 中处理
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
      ctx.font = CHART_CONFIG.FONTS.PRICE_LABEL  // 使用配置的字体
      ctx.textAlign = 'right'
      
      // 绘制左侧价格标签 - 保持适中数量(9个)，不需要匹配所有网格线
      for (let i = 0; i <= 8; i++) {
        const price = minPrice + (maxPrice - minPrice) * (1 - i / 8)
        const y = topPadding + (height / 8) * i
        
        // 价格标签位置优化，K线图继续向右移动10px
        if (i === 8) {
          ctx.fillText(price.toFixed(2), leftPadding + 15, y - 8)  // 最底部标签上移一点，继续向右移动10px
        } else {
          ctx.fillText(price.toFixed(2), leftPadding + 15, y + 3)  // 继续向右移动10px
        }
      }
      
      // 如果是分时图，在右侧显示涨跌幅百分比
      if (this.currentPeriod === 'minute' && this.klineData.length > 0) {
        // 获取昨收价 - 通常分时图的第一个数据点或者单独的昨收价字段
        let yesterdayClose = 0
        if (this.klineData[0] && this.klineData[0].yesterdayClose) {
          yesterdayClose = this.klineData[0].yesterdayClose
        } else if (this.klineData[0] && this.klineData[0].price) {
          // 如果没有昨收价字段，使用第一个价格作为基准
          yesterdayClose = this.klineData[0].price
        }
        
        if (yesterdayClose && yesterdayClose > 0) {
          ctx.textAlign = 'left'
          for (let i = 0; i <= 8; i++) {
            const price = minPrice + (maxPrice - minPrice) * (1 - i / 8)
            const y = topPadding + (height / 8) * i
            const change = ((price - yesterdayClose) / yesterdayClose) * 100
            
            // 根据涨跌情况设置颜色
            if (change > 0) {
              ctx.fillStyle = CHART_CONFIG.COLORS.UP // 使用配置的上涨颜色
            } else if (change < 0) {
              ctx.fillStyle = CHART_CONFIG.COLORS.DOWN // 使用配置的下跌颜色
            } else {
              ctx.fillStyle = '#666666' // 平盘显示灰色
            }
            
            // 显示涨跌幅百分比 - 分时图继续向左移动10px
            const changeText = change > 0 ? `+${change.toFixed(2)}%` : `${change.toFixed(2)}%`
            ctx.fillText(changeText, this.canvasWidth - this.getRightPadding() - 15, y + 3)  // 继续向左移动10px
            
            // 重置颜色为默认值
            ctx.fillStyle = '#666666'
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
        // 获取Canvas元素的边界矩形，计算相对坐标
        const rect = e.currentTarget.getBoundingClientRect ? 
                     e.currentTarget.getBoundingClientRect() : 
                     { left: 0, top: 0 }
        
        // 计算相对于Canvas的坐标
        this.startX = (touch.clientX || touch.x || 0) - rect.left
        this.startY = (touch.clientY || touch.y || 0) - rect.top
        
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
          }, CHART_CONFIG.ZOOM.THROTTLE_DELAY) // 约60fps
        }
        
        return
      }
      
      // 单指操作（原有逻辑）
      if (e.touches.length === 1 && !this.isZooming) {
        const touch = e.touches[0]
        // 获取Canvas元素的边界矩形，计算相对坐标
        const rect = e.currentTarget.getBoundingClientRect ? 
                     e.currentTarget.getBoundingClientRect() : 
                     { left: 0, top: 0 }
        
        const touchX = (touch.clientX || touch.x || 0) - rect.left
        const touchY = (touch.clientY || touch.y || 0) - rect.top
        const deltaX = Math.abs(touchX - this.startX)
        const deltaY = Math.abs(touchY - this.startY)
        
        // 如果移动距离超过阈值，标记为拖拽
        if (deltaX > CHART_CONFIG.INTERACTION.DRAG_THRESHOLD || deltaY > CHART_CONFIG.INTERACTION.DRAG_THRESHOLD) {
          this.isDragging = true
        }
        
        // 如果十字线已经显示且正在拖拽，更新十字线位置（节流处理）
        if (this.showCrosshair && this.isDragging) {
          // 清除之前的节流定时器
          if (this.crosshairDragThrottleTimer) {
            clearTimeout(this.crosshairDragThrottleTimer)
          }
          
          // 节流处理十字线拖拽更新
          this.crosshairDragThrottleTimer = setTimeout(() => {
            setTimeout(() => {
              this.updateCrosshair(touchX, touchY)
            }, 16)
          }, CHART_CONFIG.INTERACTION.CROSSHAIR_DRAG_THROTTLE)
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
      
      // 清除十字线拖拽节流定时器
      if (this.crosshairDragThrottleTimer) {
        clearTimeout(this.crosshairDragThrottleTimer)
        this.crosshairDragThrottleTimer = null
      }
      
      // 如果是缩放操作结束
      if (this.isZooming) {
        this.isZooming = false
        this.lastDistance = 0
        this.zoomStartDistance = 0
        this.zoomStartVisibleCount = 0
        return
      }
      
      // 微信小程序环境使用setTimeout替代
      setTimeout(() => {
        // 只有在点击（非拖拽）时才处理十字线
        if (!this.isDragging) {
          const currentTime = Date.now()
          const isDoubleClick = this.lastTapTime > 0 && (currentTime - this.lastTapTime < CHART_CONFIG.INTERACTION.DOUBLE_CLICK_THRESHOLD) // 双击检测阈值
          
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
      }, 16) // setTimeout结束
    },
    
    // 更新十字线位置和数据
    updateCrosshair(touchX, touchY) {
      if (!this.klineData.length || !this.canvasWidth) {
        return
      }
      
      // 使用统一的布局计算
      const layout = this.calculateChartLayout()
      const { leftPadding, topPadding, chartWidth, mainChartHeight } = layout
      
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
        // 分时图：使用固定时间轴的路径数据
        if (!this.minuteLinePath || this.minuteLinePath.length === 0) {
          return
        }
        
        // 在分时线路径中找到最接近触摸点的数据点
        let closestPoint = null
        let minDistance = Infinity
        
        for (let i = 0; i < this.minuteLinePath.length; i++) {
          const point = this.minuteLinePath[i]
          const distance = Math.abs(point.x - touchX)
          
          if (distance < minDistance) {
            minDistance = distance
            closestPoint = point
            dataIndex = i
          }
        }
        
        if (closestPoint) {
          alignedX = closestPoint.x
          this.crosshairData = {
            time: closestPoint.time,
            price: closestPoint.price,
            volume: closestPoint.volume,
            amount: closestPoint.amount
          }
        } else {
          return // 没有找到合适的数据点
        }
      } else {
        // K线图：按柱状图计算
        const barWidth = chartWidth / visibleData.length
        dataIndex = Math.floor(relativeX / barWidth)
        dataIndex = Math.max(0, Math.min(visibleData.length - 1, dataIndex))
        alignedX = leftPadding + dataIndex * barWidth + barWidth / 2
        
        // 获取K线数据和移动平均线数据
        this.crosshairData = visibleData[dataIndex]
        
        // 计算移动平均线在该位置的值
        if (this.crosshairData) {
          const { ma5, ma10, ma30 } = this.calculateMovingAverages(visibleData)
          this.crosshairData.ma5 = ma5[dataIndex] || null
          this.crosshairData.ma10 = ma10[dataIndex] || null
          this.crosshairData.ma30 = ma30[dataIndex] || null
          
          // 根据当前选择的指标添加对应的数值
          if (this.currentIndicator === 'MACD') {
            const { dif, dea, histogram } = this.calculateMACD(visibleData)
            this.crosshairData.macdDif = dif[dataIndex] || null
            this.crosshairData.macdDea = dea[dataIndex] || null
            this.crosshairData.macdHistogram = histogram[dataIndex] || null
          } else if (this.currentIndicator === 'RSI') {
            const rsiValues = this.calculateRSI(visibleData)
            this.crosshairData.rsi = rsiValues[dataIndex] || null
          } else if (this.currentIndicator === 'BOLL') {
            const { upper, middle, lower } = this.calculateBOLL(visibleData)
            this.crosshairData.bollUpper = upper[dataIndex] || null
            this.crosshairData.bollMiddle = middle[dataIndex] || null
            this.crosshairData.bollLower = lower[dataIndex] || null
          }
        }
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
      
      // 使用统一的布局计算
      const layout = this.calculateChartLayout()
      const { topPadding, mainChartHeight } = layout
      
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
    // 格式化十字线时间显示
    formatCrosshairTime(time) {
      if (!time) return '--'
      if (typeof time === 'string' && time.length >= 4) {
        return time.substring(0, 2) + ':' + time.substring(2, 4)
      }
      return time
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
    formatPrice(price, decimal = 2) {
      if (!price && price !== 0) return '--'
      return price.toFixed(decimal)
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
      // 使用统一的布局计算
      const layout = this.calculateChartLayout()
      const { leftPadding, topPadding, chartWidth, mainChartHeight, volumeChartHeight } = layout
      
      // 对于分时图，只检查主图表区域
      if (this.currentPeriod === 'minute') {
        const inArea = x >= leftPadding && 
               x <= leftPadding + chartWidth && 
               y >= topPadding && 
               y <= topPadding + mainChartHeight
               
        return inArea
      } else {
        // 对于K线图，包括主图表区域和成交量图区域
        const volumeGap = CHART_CONFIG.PADDING.VOLUME_GAP
        const totalInteractiveHeight = mainChartHeight + volumeGap + volumeChartHeight
        
        const inArea = x >= leftPadding && 
               x <= leftPadding + chartWidth && 
               y >= topPadding && 
               y <= topPadding + totalInteractiveHeight
               
        return inArea
      }
    },
    
    // 获取价格变化样式类
    getPriceChangeClass(currentPrice, basePrice) {
      if (arguments.length === 1) {
        // 分时图模式，需要与昨收价比较
        const yesterdayClose = this.klineData.length > 0 ? this.klineData[0].price : 0
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
      
      // 如果已经有分时数据，直接使用现有数据判断市场状态，避免重复请求
      let shouldStartTimer = true
      
      if (this.klineData && this.klineData.length > 0) {
        // 使用现有数据的最后一条记录判断市场状态
        const lastTime = this.klineData[this.klineData.length - 1].time
        const isMarketClosed = this.isMarketClosedByTime(lastTime)
        
        if (isMarketClosed) {
          // 市场已关闭，不需要启动定时器
          shouldStartTimer = false
        }
      }
      
      if (!shouldStartTimer) {
        return
      }
      
      // 设置定时器，每3秒刷新一次分时数据（优化频率）
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
      }, CHART_CONFIG.PERFORMANCE.MINUTE_REFRESH_INTERVAL) // 使用配置的刷新间隔
    },
    
    // 通过时间判断市场状态（支持不同市场）
    isMarketClosedByTime(timeStr) {
      if (!timeStr) return true
      
      try {
        const minutes = this.timeToMinutes(timeStr)
        const adjustedMinutes = this.adjustMinutesForMarket(minutes)
        const config = this.getCurrentMarketConfig()
        
        // 判断是否在交易时间内
        const inTradingTime = config.TRADING_SESSIONS.some(session => 
          adjustedMinutes >= session.start && adjustedMinutes <= session.end
        )
        
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
    
    // 计算移动平均线
    /**
     * 计算简单移动平均线 (SMA)
     * @param {Array} data K线数据数组
     * @param {number} period 均线周期
     * @returns {Array} 移动平均线数组
     */
    calculateSMA(data, period) {
      if (!data || data.length < period) return []
      
      const smaValues = []
      
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
          // 前面不足周期的数据点设为null
          smaValues.push(null)
        } else {
          // 计算当前点的移动平均值
          let sum = 0
          for (let j = i - period + 1; j <= i; j++) {
            sum += data[j].close
          }
          smaValues.push(sum / period)
        }
      }
      
      return smaValues
    },
    
    /**
     * 计算多条移动平均线
     * @param {Array} data K线数据数组
     * @returns {Object} 包含MA5、MA10、MA30的对象
     */
    calculateMovingAverages(data) {
      if (!data || data.length === 0) {
        return { ma5: [], ma10: [], ma30: [] }
      }
      
      return {
        ma5: this.calculateSMA(data, 5),
        ma10: this.calculateSMA(data, 10),
        ma30: this.calculateSMA(data, 30)
      }
    },
    
    // 技术指标计算函数
    
    /**
     * 计算指数移动平均线 (EMA)
     * @param {Array} data K线数据数组
     * @param {number} period 周期
     * @returns {Array} EMA数组
     */
    calculateEMA(data, period) {
      if (!data || data.length === 0) return []
      
      const emaValues = []
      const multiplier = 2 / (period + 1)
      
      // 第一个值使用SMA
      let sum = 0
      for (let i = 0; i < Math.min(period, data.length); i++) {
        sum += data[i].close
      }
      emaValues[0] = sum / Math.min(period, data.length)
      
      // 后续值使用EMA公式
      for (let i = 1; i < data.length; i++) {
        emaValues[i] = (data[i].close * multiplier) + (emaValues[i - 1] * (1 - multiplier))
      }
      
      return emaValues
    },
    
    /**
     * 计算MACD指标
     * @param {Array} data K线数据数组
     * @param {number} fastPeriod 快线周期，默认12
     * @param {number} slowPeriod 慢线周期，默认26
     * @param {number} signalPeriod 信号线周期，默认9
     * @returns {Object} 包含DIF、DEA、HISTOGRAM的对象
     */
    calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
      if (!data || data.length === 0) {
        return { dif: [], dea: [], histogram: [] }
      }
      
      // 计算快线和慢线EMA
      const fastEMA = this.calculateEMA(data, fastPeriod)
      const slowEMA = this.calculateEMA(data, slowPeriod)
      
      // 计算DIF线 (快线EMA - 慢线EMA)
      const dif = []
      for (let i = 0; i < data.length; i++) {
        dif[i] = fastEMA[i] - slowEMA[i]
      }
      
      // 计算DEA线 (DIF的EMA)
      const dea = []
      const deaMultiplier = 2 / (signalPeriod + 1)
      dea[0] = dif[0] || 0
      
      for (let i = 1; i < dif.length; i++) {
        dea[i] = (dif[i] * deaMultiplier) + (dea[i - 1] * (1 - deaMultiplier))
      }
      
      // 计算HISTOGRAM (DIF - DEA) * 2
      const histogram = []
      for (let i = 0; i < data.length; i++) {
        histogram[i] = (dif[i] - dea[i]) * 2
      }
      
      return { dif, dea, histogram }
    },
    
    /**
     * 计算布林带 (BOLL)
     * @param {Array} data K线数据数组
     * @param {number} period 周期，默认20
     * @param {number} multiplier 标准差倍数，默认2
     * @returns {Object} 包含上轨、中轨、下轨的对象
     */
    calculateBOLL(data, period = 20, multiplier = 2) {
      if (!data || data.length === 0) {
        return { upper: [], middle: [], lower: [] }
      }
      
      const upper = []
      const middle = []
      const lower = []
      
      for (let i = 0; i < data.length; i++) {
        if (i < period - 1) {
          // 前面不足周期的数据点设为null
          upper.push(null)
          middle.push(null)
          lower.push(null)
        } else {
          // 计算当前周期内的平均价格和标准差
          let sum = 0
          const prices = []
          
          for (let j = i - period + 1; j <= i; j++) {
            const price = data[j].close
            sum += price
            prices.push(price)
          }
          
          const ma = sum / period // 中轨（移动平均线）
          
          // 计算标准差
          let variance = 0
          for (let k = 0; k < prices.length; k++) {
            variance += Math.pow(prices[k] - ma, 2)
          }
          const stdDev = Math.sqrt(variance / period)
          
          // 计算上轨和下轨
          const upperBand = ma + (multiplier * stdDev)
          const lowerBand = ma - (multiplier * stdDev)
          
          upper.push(upperBand)
          middle.push(ma)
          lower.push(lowerBand)
        }
      }
      
      return { upper, middle, lower }
    },
    
    /**
     * 计算RSI指标
     * @param {Array} data K线数据数组
     * @param {number} period 周期，默认14
     * @returns {Array} RSI数组
     */
    calculateRSI(data, period = 14) {
      if (!data || data.length === 0) return []
      
      const rsiValues = []
      const gains = []
      const losses = []
      
      // 计算每日涨跌
      for (let i = 1; i < data.length; i++) {
        const change = data[i].close - data[i - 1].close
        gains.push(change > 0 ? change : 0)
        losses.push(change < 0 ? Math.abs(change) : 0)
      }
      
      // 第一个RSI值为null（需要前一日数据）
      rsiValues.push(null)
      
      // 计算第一个周期的平均增益和平均损失
      if (gains.length >= period) {
        let avgGain = 0
        let avgLoss = 0
        
        for (let i = 0; i < period; i++) {
          avgGain += gains[i]
          avgLoss += losses[i]
        }
        
        avgGain /= period
        avgLoss /= period
        
        // 计算第一个RSI值
        const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
        const rsi = 100 - (100 / (1 + rs))
        rsiValues.push(rsi)
        
        // 计算后续RSI值（使用Wilder's平滑方法）
        for (let i = period; i < gains.length; i++) {
          avgGain = ((avgGain * (period - 1)) + gains[i]) / period
          avgLoss = ((avgLoss * (period - 1)) + losses[i]) / period
          
          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss
          const rsi = 100 - (100 / (1 + rs))
          rsiValues.push(rsi)
        }
      }
      
      // 填充剩余的null值
      while (rsiValues.length < data.length) {
        rsiValues.push(null)
      }
      
      return rsiValues
    },
    
    // 指标切换方法
    /**
     * 切换显示的技术指标
     * @param {string} indicator 指标类型：VOLUME, MACD, BOLL, RSI
     */
    changeIndicator(indicator) {
      if (this.currentIndicator === indicator) return
      
      this.currentIndicator = indicator
      
      // 清除十字线状态，因为指标改变了
      this.showCrosshair = false
      this.crosshairData = null
      
      // 重新绘制图表
      if (!this.isDrawing && this.klineData.length > 0) {
        this.drawChartSafely()
      }
    },
    
    // 下拉框相关方法
    /**
     * 切换下拉框显示状态
     */
    toggleDropdown() {
      this.showDropdown = !this.showDropdown
      
      // #ifndef H5
      // 在非H5环境下，设置定时器自动关闭下拉框
      if (this.showDropdown) {
        // 清除之前的定时器
        if (this.dropdownTimer) {
          clearTimeout(this.dropdownTimer)
        }
        // 5秒后自动关闭下拉框
        this.dropdownTimer = setTimeout(() => {
          this.showDropdown = false
        }, 5000)
      }
      // #endif
    },
    
    /**
     * 选择指标并关闭下拉框
     */
    selectIndicator(indicator) {
      // 清除自动关闭定时器
      if (this.dropdownTimer) {
        clearTimeout(this.dropdownTimer)
        this.dropdownTimer = null
      }
      
      this.changeIndicator(indicator)
      this.showDropdown = false
    },
    
    /**
     * 获取当前指标的显示标签
     */
    getCurrentIndicatorLabel() {
      const current = this.indicators.find(item => item.value === this.currentIndicator)
      return current ? current.label : '成交量'
    },
    
    /**
     * 处理全局点击事件，用于关闭下拉框
     */
    handleGlobalClick(event) {
      // 暂时注释掉整个方法，避免小程序环境报错
      // #ifdef H5
      // if (event && event.target && typeof event.target.closest === 'function') {
      //   const dropdownContainer = event.target.closest('.indicator-dropdown-container')
      //   if (!dropdownContainer && this.showDropdown) {
      //     this.showDropdown = false
      //   }
      // }
      // #endif
    },
    
    // 指标组件事件处理
    onIndicatorTouchStart(event) {
      // 转发触摸事件到主图表处理逻辑
      this.onTouchStart(event)
    },
    
    onIndicatorTouchMove(event) {
      // 转发触摸事件到主图表处理逻辑
      this.onTouchMove(event)
    },
    
    onIndicatorTouchEnd(event) {
      // 转发触摸事件到主图表处理逻辑
      this.onTouchEnd(event)
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
  
  .indicator-dropdown-container {
    /* 位置通过内联样式控制 */
    
    .indicator-dropdown {
      background: rgba(255, 255, 255, 0.95);
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 4px;
      padding: 6px 12px;
      display: flex;
      align-items: center;
      justify-content: space-between;
      min-width: 70px;
      cursor: pointer;
      transition: all 0.2s;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
      
      &:hover {
        background: rgba(255, 255, 255, 1);
        border-color: #1976d2;
      }
      
      .dropdown-text {
        font-size: 12px;
        color: #333;
        font-weight: 500;
      }
      
      .dropdown-arrow {
        font-size: 10px;
        color: #666;
        margin-left: 8px;
        transition: transform 0.2s;
        
        &.active {
          transform: rotate(180deg);
        }
      }
    }
    
    .dropdown-menu {
      position: absolute;
      top: 100%;
      left: 0;
      right: 0;
      background: rgba(255, 255, 255, 0.98);
      border: 1px solid rgba(0, 0, 0, 0.15);
      border-radius: 4px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      margin-top: 2px;
      overflow: hidden;
      animation: dropdown-fade-in 0.2s ease-out;
      
      .dropdown-item {
        padding: 8px 12px;
        font-size: 12px;
        color: #333;
        cursor: pointer;
        transition: background-color 0.2s;
        border-bottom: 1px solid rgba(0, 0, 0, 0.05);
        
        &:last-child {
          border-bottom: none;
        }
        
        &:hover {
          background: rgba(25, 118, 210, 0.1);
          color: #1976d2;
        }
        
        &.active {
          background: #1976d2;
          color: #fff;
          font-weight: 500;
        }
      }
    }
  }
  
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
      
      &.ma5 {
        color: #FFB84D;
        font-weight: 500;
      }
      
      &.ma10 {
        color: #9C7BF5;
        font-weight: 500;
      }
      
      &.ma30 {
        color: #00BFFF;
        font-weight: 500;
      }
      
      &.macd-dif {
        color: #FFD700;
        font-weight: 500;
      }
      
      &.macd-dea {
        color: #FF69B4;
        font-weight: 500;
      }
      
      &.macd-histogram {
        color: #32CD32;
        font-weight: 500;
      }
      
      &.rsi {
        color: #9370DB;
        font-weight: 500;
      }
      
      &.boll-upper {
        color: #FF6347;
        font-weight: 500;
      }
      
      &.boll-middle {
        color: #FFD700;
        font-weight: 500;
      }
      
      &.boll-lower {
        color: #32CD32;
        font-weight: 500;
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
  width: calc(100% - 90px); /* 适应新的左右边距各45px */
  background: rgba(255, 255, 255, 0.95); /* 提高透明度 */
  border: 1px solid rgba(0, 0, 0, 0.08); /* 更淡的边框 */
  border-radius: 6px; /* 增加圆角 */
  padding: 8px 15px; /* 增加内边距 */
  z-index: 10;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08); /* 更柔和的阴影 */
  margin: 5px auto; /* 居中显示 */
  margin-left: 45px; /* 适应新的左边距45px，确保十字线对齐 */
  
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

@keyframes dropdown-fade-in {
  0% { 
    opacity: 0; 
    transform: translateY(-4px); 
  }
  100% { 
    opacity: 1; 
    transform: translateY(0); 
  }
}
</style>