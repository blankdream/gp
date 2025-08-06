/**
 * 缓存管理工具类
 * 用于管理股票列表和分组列表的缓存
 */
class CacheManager {
  constructor() {
    this.cache = new Map()
    this.cacheTimeout = new Map()
    this.defaultTTL = 2 * 60 * 60 * 1000 // 默认缓存2小时
    this.storagePrefix = 'cache_'
    
    // 初始化时从本地存储恢复缓存
    this.loadFromStorage()
  }

  /**
   * 从本地存储加载缓存
   */
  loadFromStorage() {
    try {
      const keys = uni.getStorageInfoSync().keys
      const now = Date.now()
      
      keys.forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          try {
            const cachedItem = uni.getStorageSync(key)
            if (cachedItem && cachedItem.timestamp && cachedItem.data) {
              // 检查是否过期
              const expireTime = cachedItem.timestamp + (cachedItem.ttl || this.defaultTTL)
              if (now < expireTime) {
                // 未过期，恢复到内存缓存
                const cacheKey = key.replace(this.storagePrefix, '')
                this.cache.set(cacheKey, cachedItem)
                
                // 设置过期定时器
                const remainingTTL = expireTime - now
                const timeoutId = setTimeout(() => {
                  this.delete(cacheKey)
                }, remainingTTL)
                this.cacheTimeout.set(cacheKey, timeoutId)
              } else {
                // 已过期，从本地存储删除
                uni.removeStorageSync(key)
              }
            }
          } catch (e) {
            // 恢复单个缓存项失败，删除该项
            uni.removeStorageSync(key)
          }
        }
      })
    } catch (error) {
      console.warn('加载缓存失败:', error)
    }
  }

  /**
   * 保存缓存到本地存储
   * @param {string} key 缓存键
   * @param {object} cachedItem 缓存项
   */
  saveToStorage(key, cachedItem) {
    try {
      const storageKey = this.storagePrefix + key
      uni.setStorageSync(storageKey, cachedItem)
    } catch (error) {
      console.warn('保存缓存到本地存储失败:', error)
    }
  }

  /**
   * 从本地存储删除缓存
   * @param {string} key 缓存键
   */
  removeFromStorage(key) {
    try {
      const storageKey = this.storagePrefix + key
      uni.removeStorageSync(storageKey)
    } catch (error) {
      console.warn('从本地存储删除缓存失败:', error)
    }
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
    // 创建缓存项
    const cachedItem = {
      data: data,
      timestamp: Date.now(),
      ttl: ttl
    }
    
    // 设置内存缓存
    this.cache.set(key, cachedItem)
    
    // 保存到本地存储
    this.saveToStorage(key, cachedItem)

    // 清除之前的定时器
    if (this.cacheTimeout.has(key)) {
      clearTimeout(this.cacheTimeout.get(key))
    }

    // 设置新的过期定时器
    const timeoutId = setTimeout(() => {
      this.delete(key)
    }, ttl)

    this.cacheTimeout.set(key, timeoutId)
    
    // 缓存已设置
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

    // 缓存命中
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
    
    // 从本地存储删除
    this.removeFromStorage(key)
    
    // 缓存已删除
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
    
    // 同时清理本地存储中的相关缓存
    try {
      const allKeys = uni.getStorageInfoSync().keys
      allKeys.forEach(storageKey => {
        if (storageKey.startsWith(this.storagePrefix) && 
            storageKey.includes(`${type}_${userId}`)) {
          uni.removeStorageSync(storageKey)
        }
      })
    } catch (error) {
      console.warn('清理本地存储缓存失败:', error)
    }
    
    // 类型缓存已清除
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
    
    // 清除所有本地存储的缓存
    try {
      const keys = uni.getStorageInfoSync().keys
      keys.forEach(key => {
        if (key.startsWith(this.storagePrefix)) {
          uni.removeStorageSync(key)
        }
      })
    } catch (error) {
      console.warn('清除本地存储缓存失败:', error)
    }
    
    // 所有缓存已清除
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