/**
 * 股票API工具类 - 直接调用腾讯财经API
 */

class StockApi {
  
  /**
   * 获取实时行情数据
   * @param {string} codes 股票代码，多个用逗号分隔，如：sh600000,sz000001,hk00700
   * @returns {Promise<Array>} 行情数据数组
   */
  static async getRealTimeQuotes(codes) {
    if (!codes) return []
    
    try {
      // 处理美股代码 - us前缀保持小写，股票代码变大写
      const processedCodes = codes.split(',').map(code => {
        if (code.toUpperCase().startsWith('US')) {
          // 如果已经是US开头：USAAPL -> usAAPL
          const stockCode = code.substring(2) // 去掉前缀US
          return 'us' + stockCode.toUpperCase()
        } else if (code.match(/^[A-Z]+\.US$/)) {
          // 如果是 AAPL.US 格式，转为 usAAPL
          const cleanCode = code.split('.')[0]
          return 'us' + cleanCode.toUpperCase()
        }
        return code
      }).join(',')
      
      
      // 使用uni.request调用腾讯财经API
      const { data } = await uni.request({
        url: `https://qt.gtimg.cn/q=${processedCodes}`,
        method: 'GET'
      })
      
      // 解析返回的字符串数据
      const quotes = this.parseQuoteData(data)
      return quotes
      
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
    // 匹配所有的股票数据
    const regex = /v_([^=]+)="([^"]+)";/g
    let match
    
    while ((match = regex.exec(data))) {
      const stockCode = match[1] // 如：sh600000
      const stockData = match[2] // 如：1~浦发银行~600000~10.12~...
      
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
        // 添加市场状态判断
        isMarketClosed: this.isMarketClosedByTime(arr[30] || '')
      }
    } catch (error) {
      console.error('解析行情数据失败:', error, dataStr)
      return null
    }
  }
  
  /**
   * 安全的日期构造函数，兼容iOS
   * @param {string} dateStr 日期字符串
   * @returns {Date} Date对象
   */
  static createSafeDate(dateStr) {
    try {
      // 验证输入字符串格式
      if (!dateStr || typeof dateStr !== 'string') {
        throw new Error(`无效的日期字符串: ${dateStr}`)
      }
      
      // 先尝试原始字符串
      let date = new Date(dateStr)
      if (!isNaN(date.getTime())) {
        return date
      }
      
      // 如果是格式如 "2025/07/25 16:14:06" 的字符串，直接使用
      if (dateStr.includes('/') && dateStr.includes(':')) {
        date = new Date(dateStr)
        if (!isNaN(date.getTime())) {
          return date
        }
      }
      
      // 如果是格式如 "2025-07-25 16:14:06" 的字符串，转换为iOS兼容格式
      if (dateStr.includes('-') && dateStr.includes(':')) {
        const iOSCompatibleStr = dateStr.replace(/-/g, '/')
        date = new Date(iOSCompatibleStr)
        if (!isNaN(date.getTime())) {
          return date
        }
      }
      
      // 如果还是失败，抛出错误
      throw new Error(`无法解析日期: ${dateStr}`)
    } catch (error) {
      console.error('日期解析失败:', error)
      return new Date() // 返回当前时间作为fallback
    }
  }

  /**
   * 测试日期格式兼容性
   * @returns {boolean} 测试是否通过
   */
  static testDateCompatibility() {
    try {
      const testTimeStr = '20250726161500' // 2025-07-26 16:15:00
      const year = testTimeStr.substring(0, 4)
      const month = testTimeStr.substring(4, 6)
      const day = testTimeStr.substring(6, 8) 
      const hour = testTimeStr.substring(8, 10)
      const minute = testTimeStr.substring(10, 12)
      const second = testTimeStr.substring(12, 14)
      
      const dateTimeString = `${year}/${month}/${day} ${hour}:${minute}:${second}`
      const testDate = this.createSafeDate(dateTimeString)
      
      // 日期兼容性测试完成
      
      return !isNaN(testDate.getTime())
    } catch (error) {
      console.error('日期兼容性测试失败:', error)
      return false
    }
  }

  /**
   * 根据更新时间判断市场是否已收市
   * @param {string} timeStr 时间字符串，格式如: 20250725161406
   * @returns {boolean} 是否已收市
   */
  static isMarketClosedByTime(timeStr) {
    // 验证输入参数
    if (!timeStr || typeof timeStr !== 'string') {
      console.warn('时间字符串为空或无效:', timeStr)
      return true // 如果没有时间数据，认为已收市
    }
    
    // 去除可能的空格和特殊字符
    const cleanTimeStr = timeStr.replace(/[^\d]/g, '')
    
    // 验证时间字符串长度和格式
    if (cleanTimeStr.length !== 14) {
      console.warn('时间字符串长度错误:', timeStr, '清理后:', cleanTimeStr, '长度:', cleanTimeStr.length)
      return true // 如果长度不对，认为已收市
    }
    
    // 检查是否为纯数字
    if (!/^\d{14}$/.test(cleanTimeStr)) {
      console.warn('时间字符串格式错误，应为14位数字:', cleanTimeStr)
      return true // 格式错误，认为已收市
    }
    
    try {
      // 解析时间字符串: 20250725161406 -> 2025/07/25 16:14:06
      const year = cleanTimeStr.substring(0, 4)
      const month = cleanTimeStr.substring(4, 6)
      const day = cleanTimeStr.substring(6, 8)
      const hour = cleanTimeStr.substring(8, 10)
      const minute = cleanTimeStr.substring(10, 12)
      const second = cleanTimeStr.substring(12, 14)
      
      // 验证提取的时间组件是否合理
      const yearNum = parseInt(year, 10)
      const monthNum = parseInt(month, 10)
      const dayNum = parseInt(day, 10)
      const hourNum = parseInt(hour, 10)
      const minuteNum = parseInt(minute, 10)
      const secondNum = parseInt(second, 10)
      
      if (yearNum < 2020 || yearNum > 2030 || 
          monthNum < 1 || monthNum > 12 || 
          dayNum < 1 || dayNum > 31 || 
          hourNum < 0 || hourNum > 23 || 
          minuteNum < 0 || minuteNum > 59 || 
          secondNum < 0 || secondNum > 59) {
        console.error('时间组件超出合理范围:', { year: yearNum, month: monthNum, day: dayNum, hour: hourNum, minute: minuteNum, second: secondNum })
        return true
      }
      
      // 使用iOS兼容的日期格式 yyyy/MM/dd HH:mm:ss
      // 确保月份和日期是两位数
      const paddedMonth = month.padStart(2, '0')
      const paddedDay = day.padStart(2, '0')
      const paddedHour = hour.padStart(2, '0')
      const paddedMinute = minute.padStart(2, '0')
      const paddedSecond = second.padStart(2, '0')
      
      const dateTimeString = `${year}/${paddedMonth}/${paddedDay} ${paddedHour}:${paddedMinute}:${paddedSecond}`
      // 日期字符串构建完成
      
      const updateTime = this.createSafeDate(dateTimeString)
      
      // 验证日期是否有效
      if (isNaN(updateTime.getTime())) {
        console.error('日期解析失败:', dateTimeString)
        return true // 解析失败，认为已收市
      }
      
      const now = new Date()
      
      // 如果更新时间超过5分钟没更新，认为已收市
      const timeDiff = now.getTime() - updateTime.getTime()
      const minutesDiff = Math.floor(timeDiff / (1000 * 60))
      
      if (minutesDiff > 5) {
        return true
      }
      
      // 根据更新时间的小时判断是否在交易时间内
      const updateHour = hourNum
      const updateMinute = minuteNum
      
      // A股交易时间: 9:30-11:30, 13:00-15:00
      const morningStart = 9 * 60 + 30  // 9:30
      const morningEnd = 11 * 60 + 30   // 11:30
      const afternoonStart = 13 * 60    // 13:00
      const afternoonEnd = 15 * 60      // 15:00
      
      const currentMinutes = updateHour * 60 + updateMinute
      
      // 判断是否在交易时间内
      const inTradingTime = (currentMinutes >= morningStart && currentMinutes <= morningEnd) ||
                           (currentMinutes >= afternoonStart && currentMinutes <= afternoonEnd)
      
      return !inTradingTime
      
    } catch (error) {
      console.error('解析时间失败:', error, '原始时间字符串:', timeStr)
      return true // 解析失败，认为已收市
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
      // K线数据获取开始
      
      // 处理美股代码 - us前缀保持小写，股票代码变大写
      let processedCode = code
      if (code.toUpperCase().startsWith('US')) {
        // 如果已经是US开头：USAAPL -> usAAPL
        const stockCode = code.substring(2) // 去掉前缀US
        processedCode = 'us' + stockCode.toUpperCase()
      } else if (code.match(/^[A-Z]+\.US$/)) {
        // 如果是 AAPL.US 格式，转为 usAAPL
        const cleanCode = code.split('.')[0]
        processedCode = 'us' + cleanCode.toUpperCase()
      }
      
      // 代码处理完成
      
      // 构建请求URL - 根据搜索结果优化参数
      const url = `https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${processedCode},${period},,,${count},qfq`
      // K线请求URL已构建
      
      const { data } = await uni.request({
        url: url,
        method: 'GET',
        timeout: 10000
      })
      
      // K线API返回数据已接收
      
      // 详细分析返回数据结构
      if (data) {
        // 处理API返回数据
        
        if (data.data) {
          // data.data存在，开始解析
          
          // 检查是否有对应的股票代码数据
          if (data.data[processedCode]) {
            // 找到股票数据，开始解析
            
            // 美股数据结构不同，直接检查day字段
            if (data.data[processedCode].day) {
              // 美股day数据处理
              const klineArray = data.data[processedCode].day
              // 美股K线数据解析
              
              const parsedData = this.parseKlineData(klineArray)
              // K线数据解析完成
              
              return parsedData
            }
            
            // 根据周期类型获取对应的数据字段（A股和港股）
            let dataKey = ''
            switch (period) {
              case 'day':
                dataKey = 'qfqday'
                break
              case 'week':
                dataKey = 'qfqweek'
                break
              case 'month':
                dataKey = 'qfqmonth'
                break
              default:
                dataKey = 'qfqday'
            }
            
            // 查找数据字段
            
            if (data.data[processedCode][dataKey]) {
              const klineArray = data.data[processedCode][dataKey]
              // 数据字段解析
              
              const parsedData = this.parseKlineData(klineArray)
              // K线数据解析完成
              
              return parsedData
            } else {
              // 数据字段不存在
            }
          } else {
            // 股票数据不存在
          }
        } else {
          // 数据结构异常
        }
      } else {
        // 返回数据为空
      }
      
      // 未找到K线数据
      return []
      
    } catch (error) {
      console.error('获取K线数据失败:', error)
      return []
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
      // 获取分时数据
      
      const url = `https://web.ifzq.gtimg.cn/appstock/app/minute/query?code=${code}`
      // 分时请求URL已构建
      
      const { data } = await uni.request({
        url: url,
        method: 'GET',
        timeout: 10000
      })
      
      // 分时API返回数据已接收
      
      // 详细分析分时数据结构
      if (data) {
        // 处理分时数据
        
        if (data.data) {
          // data.data存在，开始解析
          
          if (data.data[code]) {
            // 找到股票分时数据
            
            // 检查分时数据的嵌套结构
            if (data.data[code].data && data.data[code].data.data) {
              // 从多层结构获取分时数据
              const minuteStrings = data.data[code].data.data
              // 分时数据获取完成
              
              // 解析分时字符串数组
              const parsedMinuteData = this.parseMinuteStrings(minuteStrings)
              return parsedMinuteData
            }
            
            // 尝试其他可能的数据路径
            if (data.data[code].data) {
              // 从单层结构获取分时数据
              return this.parseMinuteData(data.data[code].data)
            }
            
            if (Array.isArray(data.data[code])) {
              // 直接解析数组数据
              return this.parseMinuteData(data.data[code])
            }
          }
        }
      }
      
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
    if (!Array.isArray(klineArray)) {
      // K线数据格式错误
      return []
    }
    
    // 开始解析K线数据
    
    const parsed = klineArray.map((item, index) => {
      if (!Array.isArray(item)) {
        // 数据项格式错误
        return null
      }
      
      const result = {
        date: item[0] || '',
        open: parseFloat(item[1]) || 0,
        close: parseFloat(item[2]) || 0,
        high: parseFloat(item[3]) || 0,  // 修正：第3个位置是最高价
        low: parseFloat(item[4]) || 0,   // 修正：第4个位置是最低价
        volume: parseInt(item[5]) || 0,
        amount: parseFloat(item[6]) || 0,
      }
      
      // 记录前几条的解析结果
      if (index < 3) {
        // K线数据解析
      }
      
      return result
    }).filter(item => item !== null)
    
    // K线数据解析完成
    return parsed
  }

  /**
   * 解析分时数据字符串数组
   * @param {Array} minuteStrings 分时字符串数组，格式如: ["0930 26.65 1141 3040765.00", ...]
   * @returns {Array} 解析后的分时数据
   */
  static parseMinuteStrings(minuteStrings) {
    if (!Array.isArray(minuteStrings)) {
      // 分时数据格式错误
      return []
    }
    
    // 开始解析分时数据
    
    const parsed = minuteStrings.map((str, index) => {
      if (typeof str !== 'string') {
        // 分时数据项格式错误
        return null
      }
      
      // 按空格分割: "0930 26.65 1141 3040765.00" -> ["0930", "26.65", "1141", "3040765.00"]
      const parts = str.trim().split(/\s+/)
      if (parts.length < 4) {
        // 分时数据格式错误
        return null
      }
      
      const result = {
        time: parts[0] || '',
        price: parseFloat(parts[1]) || 0,
        volume: parseInt(parts[2]) || 0,
        amount: parseFloat(parts[3]) || 0
      }
      
      // 记录前几条的解析结果
      if (index < 3) {
        // 分时数据解析
      }
      
      return result
    }).filter(item => item !== null)
    
    // 分时数据解析完成
    return parsed
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
      
      // 匹配A股和港股：~数字代码~股票名称~带前缀代码~
      const regCN = /~(\d{5,6})~([^~]+)~([a-z]{2}\d{5,6})~/g
      let match
      
      while ((match = regCN.exec(data))) {
        const code = match[1]      // 如：600000
        const name = match[2]      // 如：浦发银行  
        const fullcode = match[3]  // 如：sh600000
        
        // 过滤掉不需要的结果
        if (code && name && fullcode) {
          stocks.push({
            code: code,
            name: name.trim(),
            fullcode: fullcode,
            market: this.getMarketName(fullcode)
          })
        }
      }
      
      // 匹配美股：~字母代码~股票名称~
      const regUS = /~([A-Z]{1,5})~([^~]+)~/g
      
      while ((match = regUS.exec(data))) {
        const code = match[1]      // 如：AAPL
        const name = match[2]      // 如：苹果公司
        
        // 美股代码格式：usAAPL（us前缀小写，股票代码大写）
        const fullcode = 'us' + code.toUpperCase()
        
        if (code && name && code.match(/^[A-Z]+$/)) {
          stocks.push({
            code: code,
            name: name.trim(),
            fullcode: fullcode,
            market: '美股'
          })
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