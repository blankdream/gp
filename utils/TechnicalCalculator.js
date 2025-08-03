/**
 * 技术指标计算工具类
 * 提供各种技术指标的标准计算方法
 */

export default class TechnicalCalculator {
  
  /**
   * 计算简单移动平均线 (SMA)
   * @param {Array} data K线数据数组
   * @param {number} period 均线周期
   * @returns {Array} 移动平均线数组
   */
  static calculateSMA(data, period) {
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
  }
  
  /**
   * 计算指数移动平均线 (EMA)
   * @param {Array} data K线数据数组
   * @param {number} period 周期
   * @returns {Array} EMA数组
   */
  static calculateEMA(data, period) {
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
  }
  
  /**
   * 计算多条移动平均线
   * @param {Array} data K线数据数组
   * @returns {Object} 包含MA5、MA10、MA30的对象
   */
  static calculateMovingAverages(data) {
    if (!data || data.length === 0) {
      return { ma5: [], ma10: [], ma30: [] }
    }
    
    return {
      ma5: this.calculateSMA(data, 5),
      ma10: this.calculateSMA(data, 10),
      ma30: this.calculateSMA(data, 30)
    }
  }
  
  /**
   * 计算MACD指标
   * @param {Array} data K线数据数组
   * @param {number} fastPeriod 快线周期，默认12
   * @param {number} slowPeriod 慢线周期，默认26
   * @param {number} signalPeriod 信号线周期，默认9
   * @returns {Object} 包含DIF、DEA、HISTOGRAM的对象
   */
  static calculateMACD(data, fastPeriod = 12, slowPeriod = 26, signalPeriod = 9) {
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
  }
  
  /**
   * 计算KDJ指标
   * @param {Array} data K线数据数组
   * @param {number} n 周期，默认9
   * @param {number} m1 K值平滑参数，默认3
   * @param {number} m2 D值平滑参数，默认3
   * @returns {Object} 包含K、D、J值的对象
   */
  static calculateKDJ(data, n = 9, m1 = 3, m2 = 3) {
    if (!data || data.length === 0) {
      return { k: [], d: [], j: [] }
    }
    
    const k = []
    const d = []
    const j = []
    const rsv = [] // 未成熟随机值
    
    // 计算RSV (Raw Stochastic Value)
    for (let i = 0; i < data.length; i++) {
      if (i < n - 1) {
        rsv.push(null)
        k.push(null)
        d.push(null)
        j.push(null)
      } else {
        // 计算n周期内的最高价和最低价
        let highestHigh = data[i].high
        let lowestLow = data[i].low
        
        for (let j_idx = i - n + 1; j_idx < i; j_idx++) {
          highestHigh = Math.max(highestHigh, data[j_idx].high)
          lowestLow = Math.min(lowestLow, data[j_idx].low)
        }
        
        // 计算RSV
        const currentRSV = (highestHigh === lowestLow) ? 50 : 
          ((data[i].close - lowestLow) / (highestHigh - lowestLow)) * 100
        rsv.push(currentRSV)
        
        // 计算K值（K值 = 前一日K值×(m1-1)/m1 + 当日RSV×1/m1）
        const prevK = i === n - 1 ? 50 : k[i - 1] // 初始K值为50
        const currentK = ((m1 - 1) * prevK + currentRSV) / m1
        k.push(currentK)
        
        // 计算D值（D值 = 前一日D值×(m2-1)/m2 + 当日K值×1/m2）
        const prevD = i === n - 1 ? 50 : d[i - 1] // 初始D值为50
        const currentD = ((m2 - 1) * prevD + currentK) / m2
        d.push(currentD)
        
        // 计算J值（J值 = 3K - 2D）
        const currentJ = 3 * currentK - 2 * currentD
        j.push(currentJ)
      }
    }
    
    return { k, d, j }
  }
  
  /**
   * 计算RSI指标
   * @param {Array} data K线数据数组
   * @param {number} period 周期，默认14
   * @returns {Array} RSI数组
   */
  static calculateRSI(data, period = 14) {
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
  }
  
  /**
   * 批量计算所有技术指标
   * @param {Array} data K线数据数组
   * @param {Object} config 配置参数
   * @returns {Object} 包含所有指标的对象
   */
  static calculateAllIndicators(data, config = {}) {
    const {
      macdParams = [12, 26, 9],
      rsiPeriod = 14,
      kdjParams = [9, 3, 3]
    } = config
    
    return {
      ma: this.calculateMovingAverages(data),
      macd: this.calculateMACD(data, ...macdParams),
      rsi: this.calculateRSI(data, rsiPeriod),
      kdj: this.calculateKDJ(data, ...kdjParams)
    }
  }
  
  /**
   * 格式化数值显示
   * @param {number} value 数值
   * @param {number} decimal 小数位数
   * @returns {string} 格式化后的字符串
   */
  static formatValue(value, decimal = 2) {
    if (value === null || value === undefined || isNaN(value)) {
      return '--'
    }
    return value.toFixed(decimal)
  }
  
  /**
   * 计算数值范围（用于绘制坐标轴）
   * @param {Array} values 数值数组
   * @param {number} padding 边距比例，默认0.1
   * @returns {Object} 包含min和max的对象
   */
  static calculateValueRange(values, padding = 0.1) {
    const validValues = values.filter(v => v !== null && v !== undefined && !isNaN(v))
    
    if (validValues.length === 0) {
      return { min: 0, max: 100 }
    }
    
    let min = Math.min(...validValues)
    let max = Math.max(...validValues)
    
    if (min === max) {
      // 避免除零错误
      min -= 1
      max += 1
    }
    
    const range = max - min
    const paddingValue = range * padding
    
    return {
      min: min - paddingValue,
      max: max + paddingValue
    }
  }
}