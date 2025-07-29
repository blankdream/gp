/**
 * 存储管理工具类
 * 用于管理和清理本地存储，防止存储超限问题
 */
class StorageManager {
  constructor() {
    this.maxStorageSize = 10 * 1024 * 1024; // 10MB限制
    this.cleanupKeys = [
      'uni_storage_cache_',
      'uni_cache_',
      'vk_cache_',
      'temp_',
      'image_cache_'
    ];
  }

  /**
   * 获取存储使用情况
   */
  getStorageInfo() {
    try {
      const info = uni.getStorageInfoSync();
      return {
        keys: info.keys || [],
        currentSize: info.currentSize || 0,
        limitSize: info.limitSize || this.maxStorageSize,
        usage: ((info.currentSize || 0) / (info.limitSize || this.maxStorageSize) * 100).toFixed(2)
      };
    } catch (error) {
      console.error('获取存储信息失败:', error);
      return {
        keys: [],
        currentSize: 0,
        limitSize: this.maxStorageSize,
        usage: '0.00'
      };
    }
  }

  /**
   * 清理临时和缓存文件
   */
  cleanupStorage() {
    try {
      const info = this.getStorageInfo();
      console.log('清理前存储使用情况:', info);
      
      let cleanedCount = 0;
      
      // 清理匹配指定前缀的缓存数据
      info.keys.forEach(key => {
        const shouldClean = this.cleanupKeys.some(prefix => key.startsWith(prefix));
        if (shouldClean) {
          try {
            uni.removeStorageSync(key);
            cleanedCount++;
            console.log('已清理存储键:', key);
          } catch (error) {
            console.warn('清理存储键失败:', key, error);
          }
        }
      });

      // 清理过期的lifeData中的数据
      this.cleanupLifeData();
      
      const afterInfo = this.getStorageInfo();
      console.log('清理后存储使用情况:', afterInfo);
      console.log(`存储清理完成，清理了 ${cleanedCount} 个缓存项`);
      
      return {
        success: true,
        cleanedCount,
        beforeUsage: info.usage,
        afterUsage: afterInfo.usage
      };
    } catch (error) {
      console.error('存储清理失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 清理lifeData中的过期数据
   */
  cleanupLifeData() {
    try {
      const lifeData = uni.getStorageSync('lifeData');
      if (!lifeData || typeof lifeData !== 'object') {
        return;
      }

      let hasChanges = false;
      const cleanedLifeData = {};

      // 保留重要的用户数据，清理其他数据
      const importantKeys = ['$user', '$app', 'userInfo'];
      
      Object.keys(lifeData).forEach(key => {
        if (importantKeys.includes(key)) {
          cleanedLifeData[key] = lifeData[key];
        } else {
          hasChanges = true;
          console.log('从lifeData中清理:', key);
        }
      });

      if (hasChanges) {
        uni.setStorageSync('lifeData', cleanedLifeData);
        console.log('lifeData清理完成');
      }
    } catch (error) {
      console.error('清理lifeData失败:', error);
    }
  }

  /**
   * 检查存储使用率，如果超过阈值自动清理
   */
  checkAndCleanup(threshold = 80) {
    const info = this.getStorageInfo();
    const usage = parseFloat(info.usage);
    
    console.log(`当前存储使用率: ${usage}%`);
    
    if (usage > threshold) {
      console.log(`存储使用率超过${threshold}%，开始自动清理`);
      return this.cleanupStorage();
    }
    
    return {
      success: true,
      message: '存储使用率正常，无需清理'
    };
  }

  /**
   * 清理所有非必要存储
   */
  emergencyCleanup() {
    try {
      console.log('开始紧急清理存储...');
      
      const info = this.getStorageInfo();
      const preserveKeys = ['lifeData', 'uni_id_token', 'uni_id_token_expired'];
      
      let cleanedCount = 0;
      
      info.keys.forEach(key => {
        if (!preserveKeys.includes(key)) {
          try {
            uni.removeStorageSync(key);
            cleanedCount++;
          } catch (error) {
            console.warn('清理存储键失败:', key, error);
          }
        }
      });
      
      // 清理lifeData，只保留用户信息
      this.emergencyCleanupLifeData();
      
      console.log(`紧急清理完成，清理了 ${cleanedCount} 个存储项`);
      
      const afterInfo = this.getStorageInfo();
      return {
        success: true,
        cleanedCount,
        afterUsage: afterInfo.usage
      };
    } catch (error) {
      console.error('紧急清理失败:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * 紧急清理lifeData，只保留用户相关信息
   */
  emergencyCleanupLifeData() {
    try {
      const lifeData = uni.getStorageSync('lifeData');
      if (!lifeData || typeof lifeData !== 'object') {
        return;
      }

      const essentialData = {};
      
      // 只保留最基本的用户信息
      if (lifeData.$user) {
        essentialData.$user = {
          userInfo: lifeData.$user.userInfo
        };
      }

      uni.setStorageSync('lifeData', essentialData);
      console.log('lifeData紧急清理完成，只保留用户信息');
    } catch (error) {
      console.error('lifeData紧急清理失败:', error);
    }
  }

  /**
   * 获取存储使用详情
   */
  getStorageDetails() {
    try {
      const info = this.getStorageInfo();
      const details = {
        总体信息: info,
        存储项详情: []
      };

      info.keys.forEach(key => {
        try {
          const value = uni.getStorageSync(key);
          const size = JSON.stringify(value).length;
          details.存储项详情.push({
            键名: key,
            大小: `${(size / 1024).toFixed(2)} KB`,
            类型: typeof value
          });
        } catch (error) {
          details.存储项详情.push({
            键名: key,
            大小: '无法获取',
            类型: '无法获取',
            错误: error.message
          });
        }
      });

      // 按大小排序
      details.存储项详情.sort((a, b) => {
        const aSize = parseFloat(a.大小) || 0;
        const bSize = parseFloat(b.大小) || 0;
        return bSize - aSize;
      });

      return details;
    } catch (error) {
      console.error('获取存储详情失败:', error);
      return { error: error.message };
    }
  }
}

// 创建单例实例
const storageManager = new StorageManager();

export default storageManager;