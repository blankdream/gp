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
import BaseIndicator from './BaseIndicator.vue'
import TechnicalCalculator from '@/utils/TechnicalCalculator.js'

export default {
  name: "VolumeIndicator",
  extends: BaseIndicator,
  
  data() {
    return {
      volumeData: []
    }
  },
  
  methods: {
    // 计算成交量数据
    calculateIndicatorData() {
      if (!this.visibleData || this.visibleData.length === 0) {
        this.volumeData = []
        return
      }
      
      // 成交量数据直接来自K线数据
      this.volumeData = this.visibleData.map(item => ({
        volume: item.volume || 0,
        isUp: item.close >= item.open,
        change: item.close - item.open
      }))
    },
    
    // 绘制成交量柱状图
    drawIndicatorContent() {
      if (!this.ctx || !this.volumeData.length) return
      
      // 计算成交量范围
      const volumes = this.volumeData.map(item => item.volume)
      const maxVolume = Math.max(...volumes)
      const minVolume = 0
      
      if (maxVolume === 0) return
      
      const rectWidth = Math.max(1, this.barWidth * 0.8)
      
      // 绘制成交量柱
      for (let i = 0; i < this.volumeData.length; i++) {
        const item = this.volumeData[i]
        
        if (item.volume > 0) {
          const x = this.leftPadding + i * this.barWidth + this.barWidth / 2
          const barHeight = (item.volume / maxVolume) * this.chartHeight
          const barY = this.topPadding + this.chartHeight - barHeight
          
          // 根据涨跌设置颜色
          let barColor = this.colors.NEUTRAL
          if (item.isUp) {
            barColor = this.colors.UP
          } else if (item.change < 0) {
            barColor = this.colors.DOWN
          }
          
          this.ctx.fillStyle = barColor
          this.ctx.fillRect(x - rectWidth / 2, barY, rectWidth, barHeight)
        }
      }
    },
    
    // 绘制成交量标签
    drawLabels() {
      if (!this.ctx || !this.volumeData.length) return
      
      const volumes = this.volumeData.map(item => item.volume)
      const maxVolume = Math.max(...volumes)
      
      if (maxVolume === 0) return
      
      this.ctx.fillStyle = '#666666'
      this.ctx.font = '11px sans-serif'
      this.ctx.textAlign = 'right'
      
      // 显示最大成交量
      const maxVolumeStr = this.formatVolumeShort(maxVolume)
      this.ctx.fillText(maxVolumeStr, this.leftPadding - 5, this.topPadding + 12)
      
      // 显示0
      this.ctx.fillText('0', this.leftPadding - 5, this.topPadding + this.chartHeight - 2)
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
      if (this.crosshairIndex >= 0 && this.crosshairIndex < this.volumeData.length) {
        const volumeData = this.volumeData[this.crosshairIndex]
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