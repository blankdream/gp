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
  name: "KDJIndicator",
  components: {
    BaseIndicator
  },
  
  props: {
    // KDJ特有配置
    n: {
      type: Number,
      default: 9
    },
    m1: {
      type: Number,
      default: 3
    },
    m2: {
      type: Number,
      default: 3
    }
  },
  
  data() {
    return {
      kdjData: {
        k: [],
        d: [],
        j: []
      },
      // KDJ范围固定为0-100
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
      
      // 方法绑定完成后，手动触发一次计算
      if (this.$refs.baseIndicator.visibleData && this.$refs.baseIndicator.visibleData.length > 0) {
        this.$refs.baseIndicator.calculateIndicatorData()
        this.$refs.baseIndicator.drawIndicator()
      }
    },
    
    // 计算KDJ数据
    calculateIndicatorData() {
      const baseIndicator = this.$refs.baseIndicator
      if (!baseIndicator || !baseIndicator.visibleData || baseIndicator.visibleData.length === 0) {
        this.kdjData = { k: [], d: [], j: [] }
        return
      }
      
      try {
        // 计算KDJ指标
        this.kdjData = TechnicalCalculator.calculateKDJ(
          baseIndicator.visibleData, 
          this.n, 
          this.m1, 
          this.m2
        )
      } catch (error) {
        console.error('KDJ计算失败:', error)
        this.kdjData = { k: [], d: [], j: [] }
      }
    },
    
    // 绘制KDJ图表
    drawIndicatorContent() {
      const baseIndicator = this.$refs.baseIndicator
      if (!baseIndicator || !baseIndicator.ctx) {
        return
      }
      
      if (!this.kdjData.k.length) {
        return
      }
      
      // KDJ范围固定为0-100
      const minValue = 0
      const maxValue = 100
      
      try {
        // 绘制超买超卖线
        this.drawOverboughtOversoldLines(minValue, maxValue)
        
        // 使用父类的drawLine方法绘制K线
        baseIndicator.drawLine(this.kdjData.k, this.getColor('KDJ_K'), 2, minValue, maxValue)
        
        // 绘制D线
        baseIndicator.drawLine(this.kdjData.d, this.getColor('KDJ_D'), 2, minValue, maxValue)
        
        // 绘制J线
        baseIndicator.drawLine(this.kdjData.j, this.getColor('KDJ_J'), 1.5, minValue, maxValue)
      } catch (error) {
        console.error('KDJ绘制失败:', error)
      }
    },
    
    // 绘制超买超卖线
    drawOverboughtOversoldLines(minValue, maxValue) {
      const baseIndicator = this.$refs.baseIndicator
      if (!baseIndicator || !baseIndicator.ctx) return
      
      // 绘制80超买线
      const overboughtY = baseIndicator.topPadding + baseIndicator.chartHeight * (1 - 80 / 100)
      // 绘制20超卖线  
      const oversoldY = baseIndicator.topPadding + baseIndicator.chartHeight * (1 - 20 / 100)
      
      baseIndicator.ctx.strokeStyle = 'rgba(255, 69, 0, 0.6)' // 橙红色
      baseIndicator.ctx.lineWidth = 1
      baseIndicator.ctx.setLineDash([3, 3])
      baseIndicator.ctx.beginPath()
      baseIndicator.ctx.moveTo(baseIndicator.leftPadding, overboughtY)
      baseIndicator.ctx.lineTo(baseIndicator.leftPadding + baseIndicator.chartWidth, overboughtY)
      baseIndicator.ctx.stroke()
      
      baseIndicator.ctx.strokeStyle = 'rgba(34, 139, 34, 0.6)' // 绿色
      baseIndicator.ctx.beginPath()
      baseIndicator.ctx.moveTo(baseIndicator.leftPadding, oversoldY)
      baseIndicator.ctx.lineTo(baseIndicator.leftPadding + baseIndicator.chartWidth, oversoldY)
      baseIndicator.ctx.stroke()
      baseIndicator.ctx.setLineDash([])
    },
    
    // 绘制KDJ标签
    drawLabels() {
      const baseIndicator = this.$refs.baseIndicator
      if (!baseIndicator || !baseIndicator.ctx) return
      
      baseIndicator.ctx.fillStyle = '#666666'
      baseIndicator.ctx.font = '11px sans-serif'
      baseIndicator.ctx.textAlign = 'right'
      
      // 显示100, 80, 50, 20, 0
      const labels = [
        { value: 100, text: '100' },
        { value: 80, text: '80' },
        { value: 50, text: '50' },
        { value: 20, text: '20' },
        { value: 0, text: '0' }
      ]
      
      labels.forEach(({ value, text }) => {
        const y = baseIndicator.topPadding + baseIndicator.chartHeight * (1 - value / 100)
        baseIndicator.ctx.fillText(text, baseIndicator.leftPadding - 5, y + 3)
      })
    },
    
    // 获取颜色
    getColor(colorKey) {
      const baseIndicator = this.$refs.baseIndicator
      const colorMap = {
        'KDJ_K': '#FF6347',  // K线：红色
        'KDJ_D': '#32CD32',  // D线：绿色  
        'KDJ_J': '#9370DB'   // J线：紫色
      }
      return (baseIndicator && baseIndicator.colors && baseIndicator.colors[colorKey]) || colorMap[colorKey] || '#666666'
    },
    
    // 获取十字线位置的KDJ数值
    getCrosshairValue() {
      const baseIndicator = this.$refs.baseIndicator
      if (baseIndicator && baseIndicator.crosshairIndex >= 0 && baseIndicator.crosshairIndex < this.kdjData.k.length) {
        return {
          k: this.kdjData.k[baseIndicator.crosshairIndex],
          d: this.kdjData.d[baseIndicator.crosshairIndex],
          j: this.kdjData.j[baseIndicator.crosshairIndex],
          kStr: TechnicalCalculator.formatValue(this.kdjData.k[baseIndicator.crosshairIndex], 2),
          dStr: TechnicalCalculator.formatValue(this.kdjData.d[baseIndicator.crosshairIndex], 2),
          jStr: TechnicalCalculator.formatValue(this.kdjData.j[baseIndicator.crosshairIndex], 2)
        }
      }
      return null
    }
  }
}
</script>