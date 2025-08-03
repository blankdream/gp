<template>
  <BaseIndicator
    v-bind="$props"
    ref="baseIndicator"
    @touch-start="$emit('touch-start', $event)"
    @touch-move="$emit('touch-move', $event)"
    @touch-end="$emit('touch-end', $event)"
  />
</template>

<script>
import BaseIndicator from './BaseIndicator.vue'
import TechnicalCalculator from '@/utils/TechnicalCalculator.js'

export default {
  name: "RSIIndicator",
  components: {
    BaseIndicator
  },
  
  props: {
    // 继承BaseIndicator的所有props
    ...BaseIndicator.props,
    
    // RSI特有配置
    period: {
      type: Number,
      default: 14
    }
  },
  
  data() {
    return {
      rsiData: [],
      // RSI范围固定为0-100
      valueRange: { min: 0, max: 100 }
    }
  },
  
  mounted() {
    // 等待基类初始化完成
    this.$nextTick(() => {
      if (this.$refs.baseIndicator) {
        // 重写基类的方法
        this.$refs.baseIndicator.calculateIndicatorData = this.calculateIndicatorData.bind(this)
        this.$refs.baseIndicator.drawIndicatorContent = this.drawIndicatorContent.bind(this)
        this.$refs.baseIndicator.drawLabels = this.drawLabels.bind(this)
        this.$refs.baseIndicator.getCrosshairValue = this.getCrosshairValue.bind(this)
      }
    })
  },
  
  methods: {
    // 计算RSI数据
    calculateIndicatorData() {
      if (!this.visibleData || this.visibleData.length === 0) {
        this.rsiData = []
        return
      }
      
      // 计算RSI指标
      this.rsiData = TechnicalCalculator.calculateRSI(this.visibleData, this.period)
    },
    
    // 绘制RSI图表
    drawIndicatorContent() {
      if (!this.$refs.baseIndicator.ctx || !this.rsiData.length) return
      
      const ctx = this.$refs.baseIndicator.ctx
      
      // 绘制超买超卖线
      this.drawOverboughtOversoldLines()
      
      // 绘制RSI线
      this.drawRSILine()
    },
    
    // 绘制超买超卖线
    drawOverboughtOversoldLines() {
      const ctx = this.$refs.baseIndicator.ctx
      
      // 70线（超买线）
      const overboughtY = this.topPadding + this.$refs.baseIndicator.chartHeight * (1 - 70 / 100)
      // 30线（超卖线）
      const oversoldY = this.topPadding + this.$refs.baseIndicator.chartHeight * (1 - 30 / 100)
      
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      
      // 绘制70线
      ctx.strokeStyle = this.getColor('RSI_OVERBOUGHT')
      ctx.beginPath()
      ctx.moveTo(this.leftPadding, overboughtY)
      ctx.lineTo(this.leftPadding + this.$refs.baseIndicator.chartWidth, overboughtY)
      ctx.stroke()
      
      // 绘制30线
      ctx.strokeStyle = this.getColor('RSI_OVERSOLD')
      ctx.beginPath()
      ctx.moveTo(this.leftPadding, oversoldY)
      ctx.lineTo(this.leftPadding + this.$refs.baseIndicator.chartWidth, oversoldY)
      ctx.stroke()
      
      ctx.setLineDash([])
    },
    
    // 绘制RSI线
    drawRSILine() {
      if (!this.rsiData || this.rsiData.length === 0) return
      
      const ctx = this.$refs.baseIndicator.ctx
      const barWidth = this.$refs.baseIndicator.barWidth
      
      ctx.strokeStyle = this.getColor('RSI_LINE')
      ctx.lineWidth = 2
      ctx.beginPath()
      
      let pathStarted = false
      
      for (let i = 0; i < this.rsiData.length; i++) {
        const value = this.rsiData[i]
        
        if (value !== null && value !== undefined && !isNaN(value)) {
          const x = this.leftPadding + i * barWidth + barWidth / 2
          const y = this.topPadding + this.$refs.baseIndicator.chartHeight * (1 - value / 100)
          
          if (!pathStarted) {
            ctx.moveTo(x, y)
            pathStarted = true
          } else {
            ctx.lineTo(x, y)
          }
        } else {
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
    },
    
    // 绘制RSI标签
    drawLabels() {
      if (!this.$refs.baseIndicator.ctx) return
      
      const ctx = this.$refs.baseIndicator.ctx
      
      ctx.fillStyle = '#666666'
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'right'
      
      // RSI显示0, 30, 70, 100
      const labels = [
        { value: 100, text: '100' },
        { value: 70, text: '70' },
        { value: 30, text: '30' },
        { value: 0, text: '0' }
      ]
      
      labels.forEach(({ value, text }) => {
        const y = this.topPadding + this.$refs.baseIndicator.chartHeight * (1 - value / 100)
        ctx.fillText(text, this.leftPadding - 5, y + 3)
      })
    },
    
    // 获取颜色
    getColor(colorKey) {
      const colorMap = {
        'RSI_LINE': '#9370DB',
        'RSI_OVERBOUGHT': '#FF4500',
        'RSI_OVERSOLD': '#228B22'
      }
      return this.colors[colorKey] || colorMap[colorKey] || '#666666'
    },
    
    // 获取十字线位置的RSI数值
    getCrosshairValue() {
      if (this.crosshairIndex >= 0 && this.crosshairIndex < this.rsiData.length) {
        const rsiValue = this.rsiData[this.crosshairIndex]
        return {
          rsi: rsiValue,
          rsiStr: TechnicalCalculator.formatValue(rsiValue, 2),
          level: this.getRSILevel(rsiValue)
        }
      }
      return null
    },
    
    // 获取RSI水平描述
    getRSILevel(value) {
      if (value === null || value === undefined || isNaN(value)) return '无数据'
      if (value >= 70) return '超买'
      if (value <= 30) return '超卖'
      return '正常'
    }
  }
}
</script>