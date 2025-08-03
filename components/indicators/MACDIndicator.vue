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
  name: "MACDIndicator",
  components: {
    BaseIndicator
  },
  
  props: {
    // 继承BaseIndicator的所有props
    ...BaseIndicator.props,
    
    // MACD特有配置
    fastPeriod: {
      type: Number,
      default: 12
    },
    slowPeriod: {
      type: Number,
      default: 26
    },
    signalPeriod: {
      type: Number,
      default: 9
    }
  },
  
  data() {
    return {
      macdData: {
        dif: [],
        dea: [],
        histogram: []
      },
      valueRange: { min: 0, max: 0 }
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
    
    // 计算MACD数据
    calculateIndicatorData() {
      const baseIndicator = this.$refs.baseIndicator
      if (!baseIndicator || !baseIndicator.visibleData || baseIndicator.visibleData.length === 0) {
        this.macdData = { dif: [], dea: [], histogram: [] }
        this.valueRange = { min: 0, max: 0 }
        return
      }
      
      // 计算MACD指标
      this.macdData = TechnicalCalculator.calculateMACD(
        baseIndicator.visibleData, 
        this.fastPeriod, 
        this.slowPeriod, 
        this.signalPeriod
      )
      
      // 计算数值范围
      const allValues = [
        ...this.macdData.dif,
        ...this.macdData.dea,
        ...this.macdData.histogram
      ].filter(v => v !== null && !isNaN(v))
      
      if (allValues.length > 0) {
        this.valueRange = TechnicalCalculator.calculateValueRange(allValues)
      }
    },
    
    // 绘制MACD图表
    drawIndicatorContent() {
      const baseIndicator = this.$refs.baseIndicator
      if (!baseIndicator || !baseIndicator.ctx || !this.macdData.dif.length) return
      
      const ctx = baseIndicator.ctx
      const { min: minValue, max: maxValue } = this.valueRange
      
      if (maxValue === minValue) return
      
      // 绘制0轴线
      const zeroY = baseIndicator.topPadding + baseIndicator.chartHeight - 
        ((0 - minValue) / (maxValue - minValue)) * baseIndicator.chartHeight
      
      ctx.strokeStyle = 'rgba(128, 128, 128, 0.5)'
      ctx.lineWidth = 1
      ctx.setLineDash([2, 2])
      ctx.beginPath()
      ctx.moveTo(baseIndicator.leftPadding, zeroY)
      ctx.lineTo(baseIndicator.leftPadding + baseIndicator.chartWidth, zeroY)
      ctx.stroke()
      ctx.setLineDash([])
      
      // 绘制HISTOGRAM柱状图
      const barWidth = baseIndicator.barWidth
      const rectWidth = Math.max(1, barWidth * 0.6)
      
      for (let i = 0; i < this.macdData.histogram.length; i++) {
        const value = this.macdData.histogram[i]
        
        if (value !== null && !isNaN(value)) {
          const x = baseIndicator.leftPadding + i * barWidth + barWidth / 2
          const barHeight = Math.abs(value / (maxValue - minValue)) * baseIndicator.chartHeight
          const barY = value >= 0 ? zeroY - barHeight : zeroY
          
          ctx.fillStyle = value >= 0 ? baseIndicator.colors.UP : baseIndicator.colors.DOWN
          ctx.fillRect(x - rectWidth / 2, barY, rectWidth, Math.abs(barHeight))
        }
      }
      
      // 绘制DIF线
      this.drawLine(this.macdData.dif, this.getColor('MACD_DIF'), 1.5)
      
      // 绘制DEA线
      this.drawLine(this.macdData.dea, this.getColor('MACD_DEA'), 1.5)
    },
    
    // 绘制线条
    drawLine(values, color, lineWidth) {
      const baseIndicator = this.$refs.baseIndicator
      if (!baseIndicator || !baseIndicator.ctx || !values || values.length === 0) return
      
      const ctx = baseIndicator.ctx
      const { min: minValue, max: maxValue } = this.valueRange
      
      if (maxValue === minValue) return
      
      ctx.strokeStyle = color
      ctx.lineWidth = lineWidth
      ctx.beginPath()
      
      let pathStarted = false
      const barWidth = baseIndicator.barWidth
      
      for (let i = 0; i < values.length; i++) {
        const value = values[i]
        
        if (value !== null && value !== undefined && !isNaN(value)) {
          const x = baseIndicator.leftPadding + i * barWidth + barWidth / 2
          const y = baseIndicator.topPadding + baseIndicator.chartHeight - 
            ((value - minValue) / (maxValue - minValue)) * baseIndicator.chartHeight
          
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
    
    // 绘制MACD标签
    drawLabels() {
      const baseIndicator = this.$refs.baseIndicator
      if (!baseIndicator || !baseIndicator.ctx) return
      
      const ctx = baseIndicator.ctx
      const { min: minValue, max: maxValue } = this.valueRange
      
      ctx.fillStyle = '#666666'
      ctx.font = '11px sans-serif'
      ctx.textAlign = 'right'
      
      // 显示最大值和最小值
      ctx.fillText(maxValue.toFixed(3), baseIndicator.leftPadding - 5, baseIndicator.topPadding + 12)
      ctx.fillText(minValue.toFixed(3), baseIndicator.leftPadding - 5, baseIndicator.topPadding + baseIndicator.chartHeight - 2)
    },
    
    // 获取颜色
    getColor(colorKey) {
      const baseIndicator = this.$refs.baseIndicator
      const colorMap = {
        'MACD_DIF': '#FFD700',
        'MACD_DEA': '#FF69B4',
        'MACD_HISTOGRAM': '#32CD32'
      }
      return (baseIndicator && baseIndicator.colors && baseIndicator.colors[colorKey]) || colorMap[colorKey] || '#666666'
    },
    
    // 获取十字线位置的MACD数值
    getCrosshairValue() {
      const baseIndicator = this.$refs.baseIndicator
      if (!baseIndicator) return null
      
      if (baseIndicator.crosshairIndex >= 0 && baseIndicator.crosshairIndex < this.macdData.dif.length) {
        return {
          dif: this.macdData.dif[baseIndicator.crosshairIndex],
          dea: this.macdData.dea[baseIndicator.crosshairIndex],
          histogram: this.macdData.histogram[baseIndicator.crosshairIndex],
          difStr: TechnicalCalculator.formatValue(this.macdData.dif[baseIndicator.crosshairIndex], 4),
          deaStr: TechnicalCalculator.formatValue(this.macdData.dea[baseIndicator.crosshairIndex], 4),
          histogramStr: TechnicalCalculator.formatValue(this.macdData.histogram[baseIndicator.crosshairIndex], 4)
        }
      }
      return null
    }
  }
}
</script>