/**
 * 缓存管理工具类
 * 用于管理股票列表和分组列表的缓存
 */
class CacheManager {
  constructor() {
    this.cache = new Map()
    this.cacheTimeout = new Map()
    this.defaultTTL = 2 * 60 * 60 * 1000 // 默认缓存2小时
  }

  /**
   * 生成缓存键
   * @param {string} type 缓存类型 (stocks/groups)
   * @param {string} userId 用户ID
   * @param {string} groupName 分组名称（可选）
   * @returns {string} 缓存键
   */
  generateKey(type, userId, groupName = '') {
    return `${type}_${userId}_${groupName}`
  }

  /**
   * 设置缓存
   * @param {string} key 缓存键
   * @param {any} data 缓存数据
   * @param {number} ttl 过期时间（毫秒），默认2小时
   */
  set(key, data, ttl = this.defaultTTL) {
    // 设置缓存数据
    this.cache.set(key, {
      data: data,
      timestamp: Date.now()
    })

    // 清除之前的定时器
    if (this.cacheTimeout.has(key)) {
      clearTimeout(this.cacheTimeout.get(key))
    }

    // 设置新的过期定时器
    const timeoutId = setTimeout(() => {
      this.delete(key)
    }, ttl)

    this.cacheTimeout.set(key, timeoutId)
    
    console.log(`缓存已设置: ${key}, TTL: ${ttl}ms`)
  }

  /**
   * 获取缓存
   * @param {string} key 缓存键
   * @returns {any|null} 缓存数据，如果不存在或已过期返回null
   */
  get(key) {
    const cached = this.cache.get(key)
    
    if (!cached) {
      return null
    }

    console.log(`缓存命中: ${key}`)
    return cached.data
  }

  /**
   * 删除缓存
   * @param {string} key 缓存键
   */
  delete(key) {
    this.cache.delete(key)
    
    // 清除对应的定时器
    if (this.cacheTimeout.has(key)) {
      clearTimeout(this.cacheTimeout.get(key))
      this.cacheTimeout.delete(key)
    }
    
    console.log(`缓存已删除: ${key}`)
  }

  /**
   * 清除指定类型的所有缓存
   * @param {string} type 缓存类型 (stocks/groups)
   * @param {string} userId 用户ID
   */
  clearByType(type, userId) {
    const keysToDelete = []
    
    for (const key of this.cache.keys()) {
      if (key.startsWith(`${type}_${userId}`)) {
        keysToDelete.push(key)
      }
    }
    
    keysToDelete.forEach(key => this.delete(key))
    console.log(`已清除 ${type} 类型的所有缓存，用户: ${userId}`)
  }

  /**
   * 清除所有缓存
   */
  clearAll() {
    // 清除所有定时器
    for (const timeoutId of this.cacheTimeout.values()) {
      clearTimeout(timeoutId)
    }
    
    this.cache.clear()
    this.cacheTimeout.clear()
    console.log('所有缓存已清除')
  }

  /**
   * 获取缓存统计信息
   * @returns {object} 缓存统计
   */
  getStats() {
    return {
      cacheSize: this.cache.size,
      keys: Array.from(this.cache.keys()),
      totalMemory: JSON.stringify(Array.from(this.cache.entries())).length
    }
  }

  /**
   * 检查缓存是否存在
   * @param {string} key 缓存键
   * @returns {boolean} 是否存在
   */
  has(key) {
    return this.cache.has(key)
  }
}

// 创建单例实例
const cacheManager = new CacheManager()

export default cacheManager