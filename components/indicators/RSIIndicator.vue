<template>
  <BaseIndicator
    v-bind="$props"
    ref="baseIndicator"
    @indicator-ready="onIndicatorReady"
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
    // 方法绑定现在通过 indicator-ready 事件处理
  },
  
  methods: {
    // BaseIndicator初始化完成回调
    onIndicatorReady() {
      // 绑定自定义方法
      this.$refs.baseIndicator.calculateIndicatorData = this.calculateIndicatorData.bind(this)
      this.$refs.baseIndicator.drawIndicatorContent = this.drawIndicatorContent.bind(this)
      this.$refs.baseIndicator.drawLabels = this.drawLabels.bind(this)
      this.$refs.baseIndicator.getCrosshairValue = this.getCrosshairValue.bind(this)
    },
    
    // 计算RSI数据
    calculateIndicatorData() {
      const baseIndicator = this.$refs.baseIndicator
      if (!baseIndicator || !baseIndicator.visibleData || baseIndicator.visibleData.length === 0) {
        this.rsiData = []
        return
      }
      
      // 计算RSI指标
      this.rsiData = TechnicalCalculator.calculateRSI(baseIndicator.visibleData, this.period)
    },
    
    // 绘制RSI图表
    drawIndicatorContent() {
      const baseIndicator = this.$refs.baseIndicator
      if (!baseIndicator || !baseIndicator.ctx || !this.rsiData.length) return
      
      const ctx = baseIndicator.ctx
      
      // 绘制超买超卖线
      this.drawOverboughtOversoldLines()
      
      // 绘制RSI线
      this.drawRSILine()
    },
    
    // 绘制超买超卖线
    drawOverboughtOversoldLines() {
      const baseIndicator = this.$refs.baseIndicator
      if (!baseIndicator || !baseIndicator.ctx) return
      
      const ctx = baseIndicator.ctx
      
      // 70线（超买线）
      const overboughtY = baseIndicator.topPadding + baseIndicator.chartHeight * (1 - 70 / 100)
      // 30线（超卖线）
      const oversoldY = baseIndicator.topPadding + baseIndicator.chartHeight * (1 - 30 / 100)
      
      ctx.lineWidth = 1
      ctx.setLineDash([3, 3])
      
      // 绘制70线
      ctx.strokeStyle = this.getColor('RSI_OVERBOUGHT')
      ctx.beginPath()
      ctx.moveTo(baseIndicator.leftPadding, overboughtY)
      ctx.lineTo(baseIndicator.leftPadding + baseIndicator.chartWidth, overboughtY)
      ctx.stroke()
      
      // 绘制30线
      ctx.strokeStyle = this.getColor('RSI_OVERSOLD')
      ctx.beginPath()
      ctx.moveTo(baseIndicator.leftPadding, oversoldY)
      ctx.lineTo(baseIndicator.leftPadding + baseIndicator.chartWidth, oversoldY)
      ctx.stroke()
      
      ctx.setLineDash([])
    },
    
    // 绘制RSI线
    drawRSILine() {
      const baseIndicator = this.$refs.baseIndicator
      if (!baseIndicator || !baseIndicator.ctx || !this.rsiData || this.rsiData.length === 0) return
      
      const ctx = baseIndicator.ctx
      const barWidth = baseIndicator.barWidth
      
      ctx.strokeStyle = this.getColor('RSI_LINE')
      ctx.lineWidth = 2
      ctx.beginPath()
      
      let pathStarted = false
      
      for (let i = 0; i < this.rsiData.length; i++) {
        const value = this.rsiData[i]
        
        if (value !== null && value !== undefined && !isNaN(value)) {
          const x = baseIndicator.leftPadding + i * barWidth + barWidth / 2
          const y = baseIndicator.topPadding + baseIndicator.chartHeight * (1 - value / 100)
          
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
      const baseIndicator = this.$refs.baseIndicator
      if (!baseIndicator || !baseIndicator.ctx) return
      
      const ctx = baseIndicator.ctx
      
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
        const y = baseIndicator.topPadding + baseIndicator.chartHeight * (1 - value / 100)
        ctx.fillText(text, baseIndicator.leftPadding - 5, y + 3)
      })
    },
    
    // 获取颜色
    getColor(colorKey) {
      const baseIndicator = this.$refs.baseIndicator
      const colorMap = {
        'RSI_LINE': '#9370DB',
        'RSI_OVERBOUGHT': '#FF4500',
        'RSI_OVERSOLD': '#228B22'
      }
      return (baseIndicator && baseIndicator.colors && baseIndicator.colors[colorKey]) || colorMap[colorKey] || '#666666'
    },
    
    // 获取十字线位置的RSI数值
    getCrosshairValue() {
      const baseIndicator = this.$refs.baseIndicator
      if (baseIndicator && baseIndicator.crosshairIndex >= 0 && baseIndicator.crosshairIndex < this.rsiData.length) {
        const rsiValue = this.rsiData[baseIndicator.crosshairIndex]
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