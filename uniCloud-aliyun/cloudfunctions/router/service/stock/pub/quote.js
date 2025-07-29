/**
 * 股票行情API - 公开接口
 */
module.exports = {
  /**
   * 获取实时行情数据
   * @param {String} data.codes 股票代码，多个用逗号分隔，如：sh600000,sz000001,hk00700
   */
  async getRealTimeQuotes(event) {
    let { data = {}, userInfo, util, filterResponse, originalParam } = event;
    let { customUtil, uniID, config, pubFun, vk, db, _, $ } = util;
    let res = { code: 0, msg: "" };
    
    try {
      let { codes } = data;
      
      if (!codes) {
        return { code: -1, msg: "股票代码不能为空" };
      }
      
      // 调用腾讯财经API获取实时行情
      const requestRes = await uniCloud.httpclient.request(`https://qt.gtimg.cn/q=${codes}`, {
        method: 'GET',
        dataType: 'text'
      });
      
      if (requestRes.status === 200 && requestRes.data) {
        // 解析返回的行情数据
        const quotes = this.parseQuoteData(requestRes.data);
        res.data = quotes;
      } else {
        res.code = -1;
        res.msg = "获取行情数据失败";
      }
      
    } catch (err) {
      res.code = -1;
      res.msg = err.message || "获取行情数据异常";
      console.error('获取实时行情失败:', err);
    }
    
    return res;
  },
  
  /**
   * 获取K线数据
   * @param {String} data.code 股票代码，如sh600000
   * @param {String} data.period 周期类型：day/week/month/minute
   * @param {Number} data.count 数据条数，默认320
   */
  async getKlineData(event) {
    let { data = {}, userInfo, util, filterResponse, originalParam } = event;
    let { customUtil, uniID, config, pubFun, vk, db, _, $ } = util;
    let res = { code: 0, msg: "" };
    
    try {
      let { code, period = 'day', count = 320 } = data;
      
      if (!code) {
        return { code: -1, msg: "股票代码不能为空" };
      }
      
      // 调用腾讯财经API获取K线数据
      const requestRes = await uniCloud.httpclient.request(`https://web.ifzq.gtimg.cn/appstock/app/fqkline/get?param=${code},${period},,,${count}`, {
        method: 'GET',
        dataType: 'json'
      });
      
      if (requestRes.status === 200 && requestRes.data && requestRes.data.data) {
        const klineData = requestRes.data.data[code];
        if (klineData && klineData[period]) {
          res.data = this.parseKlineData(klineData[period]);
        } else {
          res.data = [];
        }
      } else {
        res.code = -1;
        res.msg = "获取K线数据失败";
      }
      
    } catch (err) {
      res.code = -1;
      res.msg = err.message || "获取K线数据异常";
      console.error('获取K线数据失败:', err);
    }
    
    return res;
  },
  
  /**
   * 搜索股票
   * @param {String} data.keyword 搜索关键词
   */
  async searchStock(event) {
    let { data = {}, userInfo, util, filterResponse, originalParam } = event;
    let { customUtil, uniID, config, pubFun, vk, db, _, $ } = util;
    let res = { code: 0, msg: "" };
    
    try {
      let { keyword } = data;
      
      if (!keyword || !keyword.trim()) {
        return { code: -1, msg: "搜索关键词不能为空" };
      }
      
      // 调用腾讯财经API搜索股票
      const requestRes = await uniCloud.httpclient.request(`https://smartbox.gtimg.cn/s3/?t=all&q=${encodeURIComponent(keyword.trim())}`, {
        method: 'GET',
        dataType: 'text'
      });
      
      if (requestRes.status === 200 && requestRes.data) {
        const stocks = this.parseSearchResult(requestRes.data);
        res.data = stocks;
      } else {
        res.code = -1;
        res.msg = "搜索股票失败";
      }
      
    } catch (err) {
      res.code = -1;
      res.msg = err.message || "搜索股票异常";
      console.error('搜索股票失败:', err);
    }
    
    return res;
  },
  
  /**
   * 解析实时行情数据
   * @param {String} data 腾讯API返回的原始数据
   * @returns {Array} 解析后的行情数据
   */
  parseQuoteData(data) {
    if (!data || typeof data !== 'string') return [];
    
    const quotes = [];
    // 匹配所有的股票数据
    const regex = /v_([^=]+)="([^"]+)";/g;
    let match;
    
    while ((match = regex.exec(data))) {
      const stockCode = match[1]; // 如：sh600000
      const stockData = match[2]; // 如：1~浦发银行~600000~10.12~...
      
      if (stockData && stockData !== 'UNKOWN') {
        const quote = this.parseQuoteString(stockCode, stockData);
        if (quote) {
          quotes.push(quote);
        }
      }
    }
    
    return quotes;
  },
  
  /**
   * 解析单个股票的行情字符串
   * @param {String} fullCode 带前缀的股票代码，如sh600000
   * @param {String} dataStr 行情数据字符串
   * @returns {Object|null} 解析后的行情数据
   */
  parseQuoteString(fullCode, dataStr) {
    const arr = dataStr.split('~');
    if (arr.length < 33) return null;
    
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
      };
    } catch (error) {
      console.error('解析行情数据失败:', error, dataStr);
      return null;
    }
  },
  
  /**
   * 解析K线数据
   * @param {Array} klineArray K线原始数据数组
   * @returns {Array} 解析后的K线数据
   */
  parseKlineData(klineArray) {
    if (!Array.isArray(klineArray)) return [];
    
    return klineArray.map(item => ({
      date: item[0] || '',
      open: parseFloat(item[1]) || 0,
      close: parseFloat(item[2]) || 0,
      low: parseFloat(item[3]) || 0,
      high: parseFloat(item[4]) || 0,
      volume: parseInt(item[5]) || 0,
      amount: parseFloat(item[6]) || 0,
    }));
  },
  
  /**
   * 解析股票搜索结果
   * @param {String} data 搜索API返回的原始数据
   * @returns {Array} 解析后的股票列表
   */
  parseSearchResult(data) {
    if (!data || typeof data !== 'string') return [];
    
    try {
      // 匹配A股和港股：~数字代码~股票名称~带前缀代码~
      const reg = /~(\d{5,6})~([^~]+)~([a-z]{2}\d{5,6})~/g;
      const stocks = [];
      let match;
      
      while ((match = reg.exec(data))) {
        const code = match[1];      // 如：600000
        const name = match[2];      // 如：浦发银行  
        const fullcode = match[3];  // 如：sh600000
        
        // 过滤掉不需要的结果
        if (code && name && fullcode) {
          stocks.push({
            code: code,
            name: name.trim(),
            fullcode: fullcode,
            market: this.getMarketName(fullcode)
          });
        }
      }
      
      return stocks;
      
    } catch (error) {
      console.error('解析搜索结果失败:', error);
      return [];
    }
  },
  
  /**
   * 获取市场名称
   * @param {String} fullcode 带前缀的股票代码
   * @returns {String} 市场名称
   */
  getMarketName(fullcode) {
    if (fullcode.startsWith('sh')) return '上海';
    if (fullcode.startsWith('sz')) return '深圳';
    if (fullcode.startsWith('hk')) return '香港';
    return '未知';
  }
};