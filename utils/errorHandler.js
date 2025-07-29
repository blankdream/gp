/**
 * 错误处理工具类
 */
import StorageManager from './storageManager.js'

class ErrorHandler {
  
  /**
   * 处理网络错误
   * @param {Object} error 错误对象
   * @returns {String} 用户友好的错误信息
   */
  static handleNetworkError(error) {
    if (!error) return '未知错误'
    
    // 网络连接错误
    if (error.errMsg && error.errMsg.includes('request:fail')) {
      if (error.errMsg.includes('timeout')) {
        return '网络连接超时，请检查网络后重试'
      } else if (error.errMsg.includes('url not in domain list')) {
        return '网络请求被拦截，请在开发者工具中配置域名白名单'
      } else {
        return '网络连接失败，请检查网络后重试'
      }
    }
    
    // HTTP状态码错误
    if (error.statusCode) {
      const statusCode = error.statusCode
      switch (statusCode) {
        case 400:
          return '请求参数错误'
        case 401:
          return '用户未登录或登录已过期'
        case 403:
          return '访问被拒绝，权限不足'
        case 404:
          return '请求的资源不存在'
        case 500:
          return '服务器内部错误'
        case 502:
        case 503:
        case 504:
          return '服务器暂时不可用，请稍后重试'
        default:
          return `网络错误 (${statusCode})`
      }
    }
    
    // API业务错误
    if (error.code && error.msg) {
      return error.msg
    }
    
    // 其他错误
    return error.message || error.errMsg || '网络异常，请稍后重试'
  }
  
  /**
   * 处理股票API相关错误
   * @param {Object} error 错误对象
   * @returns {String} 用户友好的错误信息
   */
  static handleStockApiError(error) {
    if (!error) return '获取股票数据失败'
    
    // 腾讯财经API相关错误
    if (error.message && error.message.includes('qt.gtimg.cn')) {
      return '股票行情服务暂时不可用，请稍后重试'
    }
    
    if (error.message && error.message.includes('smartbox.gtimg.cn')) {
      return '股票搜索服务暂时不可用，请稍后重试'
    }
    
    if (error.message && error.message.includes('ifzq.gtimg.cn')) {
      return 'K线数据服务暂时不可用，请稍后重试'
    }
    
    // 股票代码格式错误
    if (error.message && error.message.includes('股票代码')) {
      return '股票代码格式错误，请检查后重试'
    }
    
    // 默认处理
    return this.handleNetworkError(error)
  }
  
  /**
   * 处理云函数错误
   * @param {Object} error 错误对象
   * @returns {String} 用户友好的错误信息
   */
  static handleCloudFunctionError(error) {
    if (!error) return '服务调用失败'
    
    // 云函数业务错误
    if (error.code && error.msg) {
      return error.msg
    }
    
    // 云函数系统错误
    if (error.errCode) {
      switch (error.errCode) {
        case 'FUNCTION_NOT_FOUND':
          return '服务功能不存在'
        case 'FUNCTION_INVOKE_FAIL':
          return '服务调用失败'
        case 'TIMEOUT':
          return '服务响应超时'
        default:
          return '服务异常，请稍后重试'
      }
    }
    
    // 权限相关错误
    if (error.message && error.message.includes('permission')) {
      return '操作权限不足，请先登录'
    }
    
    if (error.message && error.message.includes('token')) {
      return '登录状态已过期，请重新登录'
    }
    
    // 默认处理
    return this.handleNetworkError(error)
  }
  
  /**
   * 显示错误提示
   * @param {Object} error 错误对象
   * @param {String} context 错误上下文，如：'加载股票列表', '添加股票'
   */
  static showError(error, context = '') {
    // 首先检查是否为存储相关错误
    const errorMsg = error?.message || error?.errMsg || ''
    if (errorMsg.includes('storage') || errorMsg.includes('writeFile') || 
        errorMsg.includes('maximum size') || errorMsg.includes('exceed')) {
      this.showStorageError(error, context)
      return
    }
    
    let message = this.handleNetworkError(error)
    
    if (context) {
      message = `${context}失败：${message}`
    }
    
    // 使用uni.showToast显示错误
    uni.showToast({
      title: message,
      icon: 'none',
      duration: 3000
    })
    
    // 开发环境下输出详细错误信息
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${context}] 错误详情:`, error)
    }
  }
  
  /**
   * 显示股票API错误
   * @param {Object} error 错误对象
   * @param {String} context 错误上下文
   */
  static showStockApiError(error, context = '') {
    let message = this.handleStockApiError(error)
    
    if (context) {
      message = `${context}失败：${message}`
    }
    
    uni.showToast({
      title: message,
      icon: 'none',
      duration: 3000
    })
    
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${context}] 股票API错误:`, error)
    }
  }
  
  /**
   * 显示云函数错误
   * @param {Object} error 错误对象
   * @param {String} context 错误上下文
   */
  static showCloudFunctionError(error, context = '') {
    let message = this.handleCloudFunctionError(error)
    
    if (context) {
      message = `${context}失败：${message}`
    }
    
    uni.showToast({
      title: message,
      icon: 'none',
      duration: 3000
    })
    
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${context}] 云函数错误:`, error)
    }
  }
  
  /**
   * 网络状态检查
   * @returns {Promise<Boolean>} 是否有网络连接
   */
  static async checkNetworkStatus() {
    try {
      const networkInfo = await uni.getNetworkType()
      return networkInfo.networkType !== 'none'
    } catch (error) {
      return false
    }
  }
  
  /**
   * 重试机制
   * @param {Function} fn 要重试的函数
   * @param {Number} maxRetries 最大重试次数
   * @param {Number} delay 重试间隔（毫秒）
   * @returns {Promise} 执行结果
   */
  static async retry(fn, maxRetries = 3, delay = 1000) {
    let lastError
    
    for (let i = 0; i <= maxRetries; i++) {
      try {
        return await fn()
      } catch (error) {
        lastError = error
        
        // 最后一次重试失败，直接抛出错误
        if (i === maxRetries) {
          throw error
        }
        
        // 检查是否是网络错误，如果不是则不重试
        if (!this.isRetryableError(error)) {
          throw error
        }
        
        // 等待后重试
        await new Promise(resolve => setTimeout(resolve, delay * (i + 1)))
      }
    }
    
    throw lastError
  }
  
  /**
   * 判断错误是否可重试
   * @param {Object} error 错误对象
   * @returns {Boolean} 是否可重试
   */
  static isRetryableError(error) {
    // 网络错误可重试
    if (error.errMsg && error.errMsg.includes('request:fail')) {
      return true
    }
    
    // 5xx服务器错误可重试
    if (error.statusCode >= 500 && error.statusCode <= 599) {
      return true
    }
    
    // 超时错误可重试
    if (error.errMsg && error.errMsg.includes('timeout')) {
      return true
    }
    
    return false
  }
  
  /**
   * 处理存储相关错误
   * @param {Object} error 错误对象
   * @returns {String} 用户友好的错误信息
   */
  static handleStorageError(error) {
    if (!error) return '存储操作失败'
    
    const errorMsg = error.message || error.errMsg || ''
    
    // 存储空间超限
    if (errorMsg.includes('storage limit') || 
        errorMsg.includes('maximum size') ||
        errorMsg.includes('exceed')) {
      
      console.log('检测到存储空间超限，尝试自动清理...')
      
      // 尝试自动清理存储
      try {
        const cleanupResult = StorageManager.emergencyCleanup()
        if (cleanupResult.success) {
          console.log('存储清理成功，释放了', cleanupResult.cleanedCount, '个存储项')
          return '存储空间不足，已自动清理，请重新操作'
        } else {
          return '存储空间不足，清理失败，请手动清理应用数据'
        }
      } catch (cleanupError) {
        console.error('存储清理失败:', cleanupError)
        return '存储空间不足，请清理应用数据后重试'
      }
    }
    
    // 其他存储错误
    if (errorMsg.includes('setStorage') || errorMsg.includes('writeFile')) {
      return '数据保存失败，请重试'
    }
    
    return '存储操作异常，请重试'
  }
  
  /**
   * 显示存储错误
   * @param {Object} error 错误对象
   * @param {String} context 错误上下文
   */
  static showStorageError(error, context = '') {
    let message = this.handleStorageError(error)
    
    if (context) {
      message = `${context}：${message}`
    }
    
    uni.showToast({
      title: message,
      icon: 'none',
      duration: 4000 // 存储错误提示时间稍长一些
    })
    
    if (process.env.NODE_ENV === 'development') {
      console.error(`[${context}] 存储错误:`, error)
      // 开发环境下显示存储状态
      try {
        const storageInfo = StorageManager.getStorageInfo()
        console.log('当前存储状态:', storageInfo)
      } catch (e) {
        console.error('获取存储状态失败:', e)
      }
    }
  }
}

export default ErrorHandler