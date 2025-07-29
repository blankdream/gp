import App from './App'
import store from './store'
import config from '@/app.config.js'

// 全局错误处理：兼容小程序环境的性能API
try {
  // 早期拦截和修复性能API访问
  const originalObjectDefineProperty = Object.defineProperty;
  Object.defineProperty = function(obj, prop, descriptor) {
    try {
      // 如果尝试访问navigationStart相关属性，提供兜底值
      if (prop === 'navigationStart' || (prop === 'timing' && descriptor.get)) {
        const safeDescriptor = {
          ...descriptor,
          get: function() {
            try {
              return descriptor.get ? descriptor.get.call(this) : Date.now();
            } catch (e) {
              console.warn('navigationStart访问失败，使用兜底值:', e);
              return Date.now();
            }
          }
        };
        return originalObjectDefineProperty.call(this, obj, prop, safeDescriptor);
      }
      return originalObjectDefineProperty.call(this, obj, prop, descriptor);
    } catch (e) {
      console.warn('defineProperty失败:', prop, e);
      return obj;
    }
  };

  // 为小程序环境提供 performance 兜底
  if (typeof performance === 'undefined') {
    global.performance = {
      now: () => Date.now(),
      navigationStart: Date.now(),
      timing: {
        navigationStart: Date.now()
      }
    }
  } else if (performance && typeof performance.navigationStart === 'undefined') {
    // 如果 performance 存在但 navigationStart 不存在，添加兜底值
    try {
      performance.navigationStart = Date.now();
      if (!performance.timing) {
        performance.timing = {};
      }
      if (typeof performance.timing.navigationStart === 'undefined') {
        performance.timing.navigationStart = Date.now();
      }
    } catch (e) {
      console.warn('无法设置 navigationStart 兜底值:', e)
    }
  }
} catch (e) {
  console.warn('性能API兜底处理失败:', e)
}

// 引入 uView UI
import uView from './uni_modules/vk-uview-ui';
// 引入 vk框架前端
import vk from './uni_modules/vk-unicloud';

// #ifdef VUE2
import Vue from 'vue'

// 全局错误处理
Vue.config.errorHandler = function (err, vm, info) {
  console.warn('Vue错误捕获:', err, info);
  
  // 特别处理navigationStart相关错误
  if (err.message && err.message.includes('navigationStart')) {
    console.warn('检测到navigationStart错误，已忽略');
    return;
  }
  
  // 特别处理WebSocket相关错误
  if (err.message && err.message.includes('closeSocket') || 
      err.message && err.message.includes('WebSocket')) {
    console.warn('检测到WebSocket连接错误，已忽略');
    return;
  }
  
  // 其他错误正常处理
  console.error('应用错误:', err);
};

// 引入 uView UI
Vue.use(uView);

// 引入 vk框架前端
Vue.use(vk, config);

Vue.config.productionTip = false

App.mpType = 'app'

const app = new Vue({
  store,
  ...App
});

app.$mount();
// #endif

// #ifdef VUE3
import { createSSRApp } from 'vue'

export function createApp() {
  const app  = createSSRApp(App)
  
  // 引入vuex
  app.use(store)
  
  // 引入 uView UI
  app.use(uView)
  
  // 引入 vk框架前端
  app.use(vk, config);
  
  return { app }
}
// #endif