<template>
  <view class="base-indicator">
    <canvas 
      class="indicator-canvas" 
      :id="canvasId"
      type="2d"
      :disable-scroll="false"
      :style="`width: ${width}px; height: ${height}px;`"
      @touchstart="onTouchStart"
      @touchmove="onTouchMove"
      @touchend="onTouchEnd"
    ></canvas>
  </view>
</template>

<script>
import TechnicalCalculator from '@/utils/TechnicalCalculator.js'

export default {
  name: "BaseIndicator",
  props: {
    // 基础数据
    klineData: {
      type: Array,
      required: true
    },
    visibleData: {
      type: Array,
      required: true
    },
    
    // 布局信息
    width: {
      type: Number,
      required: true
    },
    height: {
      type: Number,
      required: true
    },
    leftPadding: {
      type: Number,
      default: 20
    },
    rightPadding: {
      type: Number,
      default: 5
    },
    topPadding: {
      type: Number,
      default: 10
    },
    bottomPadding: {
      type: Number,
      default: 5
    },
    
    // 十字线信息
    crosshairIndex: {
      type: Number,
      default: -1
    },
    crosshairX: {
      type: Number,
      default: 0
    },
    crosshairY: {
      type: Number,
      default: 0
    },
    showCrosshair: {
      type: Boolean,
      default: false
    },
    
    // 指标配置
    indicatorConfig: {
      type: Object,
      default: () => ({})
    },
    
    // 颜色配置
    colors: {
      type: Object,
      default: () => ({
        UP: '#FF4444',
        DOWN: '#00AA44',
        NEUTRAL: '#cccccc',
        GRID: 'rgba(160, 160, 160, 0.3)',
        CROSSHAIR: '#666666'
      })
    }
  },
  
  data() {
    return {
      canvas: null,
      ctx: null,
      indicatorData: null,
      isDrawing: false,
      canvasId: `indicator-canvas-${Math.random().toString(36).substr(2, 9)}`
    }
  },
  
  computed: {
    // 计算有效绘制区域
    chartWidth() {
      return this.width - this.leftPadding - this.rightPadding
    },
    
    chartHeight() {
      return this.height - this.topPadding - this.bottomPadding
    },
    
    // 计算每个K线的宽度
    barWidth() {
      return this.visibleData.length > 0 ? this.chartWidth / this.visibleData.length : 0
    }
  },
  
  watch: {
    visibleData: {
      handler(newData, oldData) {
        if (typeof this.calculateIndicatorData === 'function') {
          this.calculateIndicatorData()
          this.drawIndicator()
        }
      },
      deep: true
    },
    
    crosshairIndex() {
      if (this.showCrosshair) {
        this.drawIndicator()
      }
    },
    
    showCrosshair() {
      this.drawIndicator()
    }
  },
  
  mounted() {
    this.$nextTick(() => {
      this.initCanvas()
    })
  },
  
  methods: {
    // 初始化Canvas
    async initCanvas() {
      try {
        const query = uni.createSelectorQuery().in(this)
        query.select(`#${this.canvasId}`)
          .fields({ node: true, size: true })
          .exec((res) => {
            if (res && res[0] && res[0].node) {
              const canvas = res[0].node
              const ctx = canvas.getContext('2d')
              
              if (ctx) {
                const dpr = uni.getSystemInfoSync().pixelRatio || 1
                canvas.width = this.width * dpr
                canvas.height = this.height * dpr
                
                ctx.scale(dpr, dpr)
                
                this.canvas = canvas
                this.ctx = ctx
                
                // 触发初始化完成事件，让子组件可以绑定方法
                this.$emit('indicator-ready')
                
                // 延迟一点时间让子组件绑定方法，然后开始计算
                this.$nextTick(() => {
                  this.calculateIndicatorData()
                  this.drawIndicator()
                })
              }
            }
          })
      } catch (error) {
        console.error('Canvas初始化失败:', error)
      }
    },
    
    // 计算指标数据（子类需要重写）
    calculateIndicatorData() {
      // 基类默认实现，子类应该重写此方法
      console.warn('calculateIndicatorData 方法需要在子类中实现')
    },
    
    // 绘制指标（子类需要重写）
    drawIndicator() {
      if (!this.ctx || this.isDrawing) return
      
      this.isDrawing = true
      
      try {
        // 清除画布
        this.ctx.clearRect(0, 0, this.width, this.height)
        
        // 绘制背景网格
        this.drawGrid()
        
        // 绘制指标内容（子类实现）
        this.drawIndicatorContent()
        
        // 绘制十字线
        if (this.showCrosshair) {
          this.drawCrosshair()
        }
        
        // 绘制标签
        this.drawLabels()
        
      } catch (error) {
        console.error('绘制指标失败:', error)
      } finally {
        this.isDrawing = false
      }
    },
    
    // 绘制网格
    drawGrid() {
      if (!this.ctx) return
      
      this.ctx.strokeStyle = this.colors.GRID
      this.ctx.lineWidth = 0.5
      
      // 绘制水平网格线
      for (let i = 0; i <= 4; i++) {
        const y = this.topPadding + (this.chartHeight / 4) * i
        this.ctx.beginPath()
        this.ctx.moveTo(this.leftPadding, y)
        this.ctx.lineTo(this.leftPadding + this.chartWidth, y)
        this.ctx.stroke()
      }
      
      // 绘制垂直网格线
      const step = Math.max(1, Math.floor(this.visibleData.length / 4))
      for (let i = 0; i < this.visibleData.length; i += step) {
        const x = this.leftPadding + i * this.barWidth + this.barWidth / 2
        this.ctx.beginPath()
        this.ctx.moveTo(x, this.topPadding)
        this.ctx.lineTo(x, this.topPadding + this.chartHeight)
        this.ctx.stroke()
      }
    },
    
    // 绘制指标内容（子类需要重写）
    drawIndicatorContent() {
      // 基类默认实现，子类应该重写此方法
      console.warn('drawIndicatorContent 方法需要在子类中实现')
    },
    
    // 绘制标签（子类需要重写）
    drawLabels() {
      // 基类默认实现，子类应该重写此方法
      console.warn('drawLabels 方法需要在子类中实现')
    },
    
    // 获取十字线数值（子类需要重写）
    getCrosshairValue() {
      // 基类默认实现，子类应该重写此方法
      return null
    },
    
    // 绘制十字线
    drawCrosshair() {
      if (!this.ctx || this.crosshairIndex < 0) return
      
      const x = this.leftPadding + this.crosshairIndex * this.barWidth + this.barWidth / 2
      
      this.ctx.strokeStyle = this.colors.CROSSHAIR
      this.ctx.lineWidth = 1
      this.ctx.setLineDash([3, 3])
      
      // 绘制垂直线
      this.ctx.beginPath()
      this.ctx.moveTo(x, this.topPadding)
      this.ctx.lineTo(x, this.topPadding + this.chartHeight)
      this.ctx.stroke()
      
      this.ctx.setLineDash([])
    },
    
    // 绘制标签（子类可以重写）
    drawLabels() {
      // 基类默认实现，子类可以重写
    },
    
    // 绘制线条的通用方法
    drawLine(values, color, lineWidth = 1, minValue = null, maxValue = null) {
      if (!this.ctx || !values || values.length === 0) return
      
      // 如果没有提供范围，自动计算
      if (minValue === null || maxValue === null) {
        const range = TechnicalCalculator.calculateValueRange(values)
        minValue = range.min
        maxValue = range.max
      }
      
      if (maxValue === minValue) return
      
      this.ctx.strokeStyle = color
      this.ctx.lineWidth = lineWidth
      this.ctx.beginPath()
      
      let pathStarted = false
      
      for (let i = 0; i < values.length; i++) {
        const value = values[i]
        
        if (value !== null && value !== undefined && !isNaN(value)) {
          const x = this.leftPadding + i * this.barWidth + this.barWidth / 2
          const y = this.topPadding + this.chartHeight - ((value - minValue) / (maxValue - minValue)) * this.chartHeight
          
          if (!pathStarted) {
            this.ctx.moveTo(x, y)
            pathStarted = true
          } else {
            this.ctx.lineTo(x, y)
          }
        } else {
          if (pathStarted) {
            this.ctx.stroke()
            this.ctx.beginPath()
            pathStarted = false
          }
        }
      }
      
      if (pathStarted) {
        this.ctx.stroke()
      }
    },
    
    // 绘制柱状图的通用方法
    drawBars(values, color, minValue = null, maxValue = null, barWidthRatio = 0.8) {
      if (!this.ctx || !values || values.length === 0) return
      
      // 如果没有提供范围，自动计算
      if (minValue === null || maxValue === null) {
        const range = TechnicalCalculator.calculateValueRange(values)
        minValue = range.min
        maxValue = range.max
      }
      
      if (maxValue === minValue) return
      
      const rectWidth = this.barWidth * barWidthRatio
      
      for (let i = 0; i < values.length; i++) {
        const value = values[i]
        
        if (value !== null && value !== undefined && !isNaN(value)) {
          const x = this.leftPadding + i * this.barWidth + this.barWidth / 2
          const barHeight = Math.abs((value - minValue) / (maxValue - minValue)) * this.chartHeight
          const barY = value >= 0 ? 
            this.topPadding + this.chartHeight - barHeight : 
            this.topPadding + this.chartHeight
          
          this.ctx.fillStyle = typeof color === 'function' ? color(value) : color
          this.ctx.fillRect(x - rectWidth / 2, barY, rectWidth, barHeight)
        }
      }
    },
    
    // 触摸事件处理
    onTouchStart(e) {
      this.$emit('touch-start', e)
    },
    
    onTouchMove(e) {
      this.$emit('touch-move', e)
    },
    
    onTouchEnd(e) {
      this.$emit('touch-end', e)
    },
    
    // 获取指标在十字线位置的数值（子类可以重写）
    getCrosshairValue() {
      return null
    }
  }
}
</script>

<style lang="scss" scoped>
.base-indicator {
  position: relative;
  width: 100%;
  height: 100%;
  
  .indicator-canvas {
    width: 100%;
    height: 100%;
    display: block;
  }
}
</style>