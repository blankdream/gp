/**
 * 股票API工具类 - 直接调用腾讯财经API
 */

class StockApi {
  // 预编译正则表达式
  static QUOTE_REGEX = /v_([^=]+)="([^"]+)";/g
  static US_STOCK_REGEX = /^[A-Z]+\.US$/
  static CN_STOCK_REGEX = /~(\d{5,6})~([^~]+)~([a-z]{2}\d{5,6})~/g
  static US_SEARCH_REGEX = /~([A-Z]{1,5})~([^~]+)~/g
  
  /**
   * 处理美股代码格式
   * @param {string} code 股票代码
   * @returns {string} 处理后的代码
   */
  static processUSStockCode(code) {
    if (code.toUpperCase().startsWith('US')) {
      const stockCode = code.substring(2)
      return 'us' + stockCode.toUpperCase()
    } else if (this.US_STOCK_REGEX.test(code)) {
      const cleanCode = code.split('.')[0]
      return 'us' + cleanCode.toUpperCase()
    }
    return code
  }
  
  /**
   * 获取实时行情数据
   * @param {string} codes 股票代码，多个用逗号分隔，如：sh600000,sz000001,hk00700
   * @returns {Promise<Array>} 行情数据数组
   */
  static async getRealTimeQuotes(codes) {
    if (!codes) return []
    
    try {
      const processedCodes = codes.split(',').map(code => this.processUSStockCode(code)).join(',')
      
      const { data } = await uni.request({
        url: `https://qt.gtimg.cn/q=${processedCodes}`,
        method: 'GET'
      })
      
      return this.parseQuoteData(data)
      
    } catch (error) {
      console.error('获取实时行情失败:', error)
      return []
    }
  }
  
  /**
   * 解析实时行情数据
   * @param {string} data 腾讯API返回的原始数据
   * @returns {Array} 解析后的行情数据
   */
  static parseQuoteData(data) {
    if (!data || typeof data !== 'string') return []
    
    const quotes = []
    this.QUOTE_REGEX.lastIndex = 0
    let match
    
    while ((match = this.QUOTE_REGEX.exec(data))) {
      const stockCode = match[1]
      const stockData = match[2]
      
      if (stockData && stockData !== 'UNKOWN') {
        const quote = this.parseQuoteString(stockCode, stockData)
        if (quote) {
          quotes.push(quote)
        }
      }
    }
    
    return quotes
  }
  
  /**
   * 解析单个股票的行情字符串
   * @param {string} fullCode 带前缀的股票代码，如sh600000
   * @param {string} dataStr 行情数据字符串
   * @returns {Object|null} 解析后的行情数据
   */
  static parseQuoteString(fullCode, dataStr) {
    const arr = dataStr.split('~')
    if (arr.length < 33) return null
    
    try {
      return {
        fullcode: fullCode,
        code: arr[2] || fullCode.replace(/^[a-z]{2}/, ''), // 纯数字代码
        name: arr[1] || '',
        now: parseFloat(arr[3]) || 0,      // 当前价格
        close: parseFloat(arr[4]) || 0,    // 昨收
        open: parseFloat(arr[5]) || 0,     // 今开
        volume: parseInt(arr[6]) || 0,     // 成交量(手)
        amount: parseFloat(arr[7]) || 0,   // 成交额(万元)
        high: parseFloat(arr[33]) || 0,    // 今日最高
        low: parseFloat(arr[34]) || 0,     // 今日最低
        updown: parseFloat(arr[31]) || 0,  // 涨跌额
        percent: parseFloat(arr[32]) || 0, // 涨跌幅%
        turnover: parseFloat(arr[38]) || 0, // 换手率%
        pe: parseFloat(arr[39]) || 0,      // 市盈率
        amplitude: parseFloat(arr[43]) || 0, // 振幅%
        total_mv: parseFloat(arr[45]) || 0, // 总市值(万元)  
        flow_mv: parseFloat(arr[44]) || 0,  // 流通市值(万元)
        time: arr[30] || '',               // 更新时间
        isMarketClosed: this.isMarketClosedByTime(arr[30] || '')
      }
    } catch (error) {
      console.error('解析行情数据失败:', error, dataStr)
      return null
    }
  }
  
  static createSafeDate(dateStr) {
    if (!dateStr) return new Date()
    try {
      const date = new Date(dateStr.includes('-') ? dateStr.replace(/-/g, '/') : dateStr)
      return isNaN(date.getTime()) ? new Date() : date
    } catch {
      return new Date()
    }
  }

  static testDateCompatibility() {
    try {
      const testStr = '20250726161500'
      const formatted = `${testStr.substring(0, 4)}/${testStr.substring(4, 6)}/${testStr.substring(6, 8)} ${testStr.substring(8, 10)}:${testStr.substring(10, 12)}:${testStr.substring(12, 14)}`
      return !isNaN(this.createSafeDate(formatted).getTime())
    } catch {
      return false
    }
  }

  /**
   * 根据更新时间判断市场是否已收市
   * @param {string} timeStr 时间字符串，格式如: 20250725161406
   * @returns {boolean} 是否已收市
   */
  static isMarketClosedByTime(timeStr) {
    if (!timeStr) return true
    
    const clean = timeStr.replace(/[^\d]/g, '')
    if (clean.length !== 14) return true
    
    try {
      const hour = parseInt(clean.substring(8, 10))
      const minute = parseInt(clean.substring(10, 12))
      
      if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return true
      
      const dateStr = `${clean.substring(0, 4)}/${clean.substring(4, 6)}/${clean.substring(6, 8)} ${clean.substring(8, 10)}:${clean.substring(10, 12)}:${clean.substring(12, 14)}`
      const updateTime = this.createSafeDate(dateStr)
      
      if (isNaN(updateTime.getTime())) return true
      
      // 超过5分钟没更新认为已收市
      const minutesDiff = Math.floor((Date.now() - updateTime.getTime()) / 60000)
      if (minutesDiff > 5) return true
      
      // A股交易时间: 9:30-11:30, 13:00-15:00
      const currentMinutes = hour * 60 + minute
      return !((currentMinutes >= 570 && currentMinutes <= 690) || (currentMinutes >= 780 && currentMinutes <= 900))
      
    } catch {
      return true
    }
  }
  
  /**
   * 获取K线数据
   * @param {string} code 股票代码，如sh600000
   * @param {string} period 周期类型：day/week/month/minute
   * @param {number} count 数据条数，默认320
   * @returns {Promise<Array>} K线数据数组
   */
  static async getKlineData(code, period = 'day', count = 320) {
    if (!code) return []
    
    try {
      const processedCode = this.processUSStockCode(code)
      const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${processedCode},${period},,,${count},qfq`
      
      const { data } = await uni.request({ url, method: 'GET', timeout: 10000 })
      const stockData = data?.data?.[processedCode]
      if (!stockData) return []
      
      // 按优先级尝试不同字段名
      const keys = [period, `qfq${period}`, `${period}qfq`, `${period}_qfq`, `hk${period}`]
      for (const key of keys) {
        if (stockData[key]) {
          return this.parseKlineData(stockData[key])
        }
      }
      
      return []
      
    } catch (error) {
      console.error('获取K线数据失败:', error, '代码:', code, '周期:', period)
      return []
    }
  }
  
  static async debugKlineDataStructure(code, period = 'day') {
    if (!code) return null
    
    try {
      const processedCode = this.processUSStockCode(code)
      const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${processedCode},${period},,,320,qfq`
      
      const { data } = await uni.request({ url, method: 'GET', timeout: 10000 })
      
      const stockData = data?.data?.[processedCode]
      if (stockData) {
        const result = { code, processedCode, period, url, availableFields: Object.keys(stockData), fullData: stockData }
        console.log('K线调试信息:', result)
        return result
      }
      
      return { error: '未找到股票数据', data }
      
    } catch (error) {
      console.error('调试K线数据失败:', error)
      return { error: error.message }
    }
  }
  
  /**
   * 获取分时数据
   * @param {string} code 股票代码，如sh600000
   * @returns {Promise<Array>} 分时数据数组
   */
  static async getMinuteData(code) {
    if (!code) return []
    
    try {
      const { data } = await uni.request({
        url: `https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=${code}`,
        method: 'GET',
        timeout: 10000
      })
      
      const codeData = data?.data?.[code]
      if (!codeData) return []
      
      if (codeData.data?.data) return this.parseMinuteStrings(codeData.data.data)
      if (codeData.data) return this.parseMinuteData(codeData.data)
      if (Array.isArray(codeData)) return this.parseMinuteData(codeData)
      
      return []
      
    } catch (error) {
      console.error('获取分时数据失败:', error)
      return []
    }
  }

  /**
   * 解析K线数据
   * @param {Array} klineArray K线原始数据数组
   * @returns {Array} 解析后的K线数据
   */
  static parseKlineData(klineArray) {
    if (!Array.isArray(klineArray)) return []
    
    return klineArray.filter(item => Array.isArray(item) && item.length >= 6)
      .map(item => ({
        date: item[0] || '',
        open: parseFloat(item[1]) || 0,
        close: parseFloat(item[2]) || 0,
        high: parseFloat(item[3]) || 0,
        low: parseFloat(item[4]) || 0,
        volume: parseInt(item[5]) || 0,
        amount: (item.length > 6 && typeof item[6] !== 'object') ? parseFloat(item[6]) || 0 : 0
      }))
  }

  /**
   * 解析分时数据字符串数组
   * @param {Array} minuteStrings 分时字符串数组，格式如: ["0930 26.65 1141 3040765.00", ...]
   * @returns {Array} 解析后的分时数据
   */
  static parseMinuteStrings(minuteStrings) {
    if (!Array.isArray(minuteStrings)) return []
    
    return minuteStrings.filter(str => typeof str === 'string')
      .map(str => str.trim().split(/\s+/))
      .filter(parts => parts.length >= 4)
      .map(parts => ({
        time: parts[0] || '',
        price: parseFloat(parts[1]) || 0,
        volume: parseInt(parts[2]) || 0,
        amount: parseFloat(parts[3]) || 0
      }))
  }

  /**
   * 解析分时数据
   * @param {Array} minuteArray 分时原始数据数组
   * @returns {Array} 解析后的分时数据
   */
  static parseMinuteData(minuteArray) {
    if (!Array.isArray(minuteArray)) return []
    
    return minuteArray.map(item => ({
      time: item[0] || '',
      price: parseFloat(item[1]) || 0,
      volume: parseInt(item[2]) || 0,
      amount: parseFloat(item[3]) || 0
    }))
  }
  
  /**
   * 搜索股票
   * @param {string} keyword 搜索关键词
   * @returns {Promise<Array>} 股票搜索结果
   */
  static async searchStock(keyword) {
    if (!keyword || !keyword.trim()) return []
    
    try {
      const { data } = await uni.request({
        url: `https://smartbox.gtimg.cn/s3/?t=all&q=${encodeURIComponent(keyword.trim())}`,
        method: 'GET'
      })
      
      return this.parseSearchResult(data)
      
    } catch (error) {
      console.error('搜索股票失败:', error)
      return []
    }
  }
  
  /**
   * 解析股票搜索结果
   * @param {string} data 搜索API返回的原始数据
   * @returns {Array} 解析后的股票列表
   */
  static parseSearchResult(data) {
    if (!data || typeof data !== 'string') return []
    
    try {
      const stocks = []
      
      // 解析A股和港股
      this.CN_STOCK_REGEX.lastIndex = 0
      let match
      while ((match = this.CN_STOCK_REGEX.exec(data))) {
        const [, code, name, fullcode] = match
        if (code && name && fullcode) {
          stocks.push({ code, name: name.trim(), fullcode, market: this.getMarketName(fullcode) })
        }
      }
      
      // 解析美股
      this.US_SEARCH_REGEX.lastIndex = 0
      while ((match = this.US_SEARCH_REGEX.exec(data))) {
        const [, code, name] = match
        if (code && name && /^[A-Z]+$/.test(code)) {
          stocks.push({ code, name: name.trim(), fullcode: 'us' + code.toUpperCase(), market: '美股' })
        }
      }
      
      return stocks
      
    } catch (error) {
      console.error('解析搜索结果失败:', error)
      return []
    }
  }
  
  /**
   * 获取股票详细信息
   * @param {string} code 股票代码，如sh600000
   * @returns {Promise<Object>} 股票详细信息
   */
  static async getStockDetail(code) {
    if (!code) return null
    
    try {
      const { data } = await uni.request({
        url: `https://stock.gtimg.cn/data/index.php?appn=detail&action=info&c=${code}`,
        method: 'GET'
      })
      
      if (data && data.code && data.name) {
        const info = {}
        if (data.list && Array.isArray(data.list)) {
          data.list.forEach(item => {
            if (item.key && item.value) {
              info[item.key] = item.value
            }
          })
        }
        
        return {
          code: data.code,
          name: data.name,
          info: info
        }
      }
      
      return null
      
    } catch (error) {
      console.error('获取股票详情失败:', error)
      return null
    }
  }
  
  /**
   * 获取市场名称
   * @param {string} fullcode 带前缀的股票代码
   * @returns {string} 市场名称
   */
  static getMarketName(fullcode) {
    if (fullcode.startsWith('sh')) return '上海'
    if (fullcode.startsWith('sz')) return '深圳'
    if (fullcode.startsWith('hk')) return '香港'
    if (fullcode.startsWith('us')) return '美股'
    return '未知'
  }
  
  /**
   * 格式化涨跌幅显示
   * @param {number} percent 涨跌幅百分比
   * @returns {string} 格式化后的涨跌幅
   */
  static formatPercent(percent) {
    if (!percent && percent !== 0) return '--'
    const formatted = percent.toFixed(2)
    return percent > 0 ? `+${formatted}%` : `${formatted}%`
  }
  
  /**
   * 格式化价格显示
   * @param {number} price 价格
   * @param {number} decimal 小数位数，默认2位
   * @returns {string} 格式化后的价格
   */
  static formatPrice(price, decimal = 2) {
    if (!price && price !== 0) return '--'
    return price.toFixed(decimal)
  }
  
  /**
   * 格式化成交量显示
   * @param {number} volume 成交量
   * @returns {string} 格式化后的成交量
   */
  static formatVolume(volume) {
    if (!volume) return '--'
    
    if (volume >= 100000000) {
      return (volume / 100000000).toFixed(1) + '亿'
    } else if (volume >= 10000) {
      return (volume / 10000).toFixed(1) + '万'
    } else {
      return volume.toString()
    }
  }
}

export default StockApi