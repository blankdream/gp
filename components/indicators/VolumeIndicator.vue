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
  name: "VolumeIndicator",
  components: {
    BaseIndicator
  },
  
  data() {
    return {
      volumeData: []
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
    
    // 计算成交量数据
    calculateIndicatorData() {
      const baseIndicator = this.$refs.baseIndicator
      if (!baseIndicator || !baseIndicator.visibleData || baseIndicator.visibleData.length === 0) {
        this.volumeData = []
        return
      }
      
      // 成交量数据直接来自K线数据
      this.volumeData = baseIndicator.visibleData.map(item => ({
        volume: item.volume || 0,
        isUp: item.close >= item.open,
        change: item.close - item.open
      }))
    },
    
    // 绘制成交量柱状图
    drawIndicatorContent() {
      const baseIndicator = this.$refs.baseIndicator
      if (!baseIndicator || !baseIndicator.ctx || !this.volumeData.length) return
      
      // 计算成交量范围
      const volumes = this.volumeData.map(item => item.volume)
      const maxVolume = Math.max(...volumes)
      const minVolume = 0
      
      if (maxVolume === 0) return
      
      const rectWidth = Math.max(1, baseIndicator.barWidth * 0.8)
      
      // 绘制成交量柱
      for (let i = 0; i < this.volumeData.length; i++) {
        const item = this.volumeData[i]
        
        if (item.volume > 0) {
          const x = baseIndicator.leftPadding + i * baseIndicator.barWidth + baseIndicator.barWidth / 2
          const barHeight = (item.volume / maxVolume) * baseIndicator.chartHeight
          const barY = baseIndicator.topPadding + baseIndicator.chartHeight - barHeight
          
          // 根据涨跌设置颜色
          let barColor = baseIndicator.colors.NEUTRAL
          if (item.isUp) {
            barColor = baseIndicator.colors.UP
          } else if (item.change < 0) {
            barColor = baseIndicator.colors.DOWN
          }
          
          baseIndicator.ctx.fillStyle = barColor
          baseIndicator.ctx.fillRect(x - rectWidth / 2, barY, rectWidth, barHeight)
        }
      }
    },
    
    // 绘制成交量标签
    drawLabels() {
      const baseIndicator = this.$refs.baseIndicator
      if (!baseIndicator || !baseIndicator.ctx || !this.volumeData.length) return
      
      const volumes = this.volumeData.map(item => item.volume)
      const maxVolume = Math.max(...volumes)
      
      if (maxVolume === 0) return
      
      baseIndicator.ctx.fillStyle = '#666666'
      baseIndicator.ctx.font = '11px sans-serif'
      baseIndicator.ctx.textAlign = 'right'
      
      // 显示最大成交量
      const maxVolumeStr = this.formatVolumeShort(maxVolume)
      baseIndicator.ctx.fillText(maxVolumeStr, baseIndicator.leftPadding - 5, baseIndicator.topPadding + 12)
      
      // 显示0
      baseIndicator.ctx.fillText('0', baseIndicator.leftPadding - 5, baseIndicator.topPadding + baseIndicator.chartHeight - 2)
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
    
    // 获取十字线位置的成交量数值
    getCrosshairValue() {
      const baseIndicator = this.$refs.baseIndicator
      if (baseIndicator && baseIndicator.crosshairIndex >= 0 && baseIndicator.crosshairIndex < this.volumeData.length) {
        const volumeData = this.volumeData[baseIndicator.crosshairIndex]
        return {
          volume: volumeData ? volumeData.volume : 0,
          volumeStr: volumeData ? this.formatVolumeShort(volumeData.volume) : '--'
        }
      }
      return null
    }
  }
}
</script>