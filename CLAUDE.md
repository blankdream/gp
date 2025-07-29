# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **股票池 (Stock Pool)** application - a uni-app cross-platform stock management system built with the **vk-unicloud-router** framework. The app allows users to create and manage personal stock portfolios with real-time quotes, custom grouping, and price alert functionality. It supports H5, mini-programs (WeChat, Alipay, Baidu, QQ, TikTok), and mobile apps using a cloud function router architecture.

## Key Technologies

- **Framework**: uni-app with Vue 3.0 support
- **Backend**: uniCloud with Aliyun cloud functions
- **Router**: vk-unicloud-router (cloud function routing framework)
- **UI Library**: vk-uview-ui (based on uView)
- **State Management**: Vuex with persistence
- **User System**: Built-in uni-id integration

## Development Commands

This is a uni-app project developed primarily through HBuilderX IDE. There are no traditional npm scripts or build commands.

### Frontend Development
- **Run H5**: Use HBuilderX "运行 > 运行到浏览器" or press Ctrl+R
- **Run Mini-program**: Use HBuilderX "运行 > 运行到小程序模拟器"
  - WeChat: Configure appid in `manifest.json` → mp-weixin → appid
  - Other platforms: Configure respective appids in manifest.json
- **Run App**: Use HBuilderX "运行 > 运行到手机或模拟器"
- **Production Build**: Use HBuilderX "发行 > 构建"

### Backend Development
- **Upload Cloud Functions**: Right-click `uniCloud-aliyun/cloudfunctions/router` and select "上传并运行云函数"
- **Deploy Database Schema**: Right-click database schema files in `uniCloud-aliyun/database/` and select "上传DB Schema"
- **View Cloud Console**: Right-click `uniCloud-aliyun` and select "打开uniCloud admin web控制台"

### Environment Switching
- Edit `uniCloud-aliyun/cloudfunctions/router/config.js` to switch between development and production
- Modify `app.config.js` → `functionName` to use different cloud functions (e.g., "router" for production, "router-test" for development)

## Project Architecture

### Frontend Structure
- `pages/` - Main application pages
  - `index/` - 股票池主页 (Stock Pool homepage)
  - `alert/` - 预警中心 (Alert Center) 
  - `user/` - 个人中心 (User Profile)
  - `test/` - 演示页面 (Demo pages)
- `pages_template/` - Template pages and demos (uni-id, openapi examples)
- `components/` - Custom components for stock management
- `utils/` - Utility functions (including stock API wrappers)
- `uni_modules/` - Plugin modules (vk-uview-ui, vk-unicloud, uni-id)
- `static/` - Static assets including tab bar icons

### Backend Structure (uniCloud-aliyun)
- `cloudfunctions/router/` - Main cloud function with routing
  - `service/` - Business logic layer
    - `stock/` - **Stock management APIs**
      - `kh/` - User authenticated stock functions (pool.js, group.js, alert.js)
      - `pub/` - Public stock functions (quote.js for real-time data)
    - `admin/` - Admin panel APIs
    - `user/` - User center APIs (login, registration, etc.)
    - `template/` - API templates and examples
  - `middleware/` - Filters and interceptors
  - `dao/` - Database access layer
  - `util/` - Utility functions
- `database/` - **Stock database schemas**
  - `stock_pool.schema.json` - User stock portfolios
  - `stock_group.schema.json` - Stock grouping/categories
  - `stock_alert.schema.json` - Price alerts and notifications

### Service Layer Organization
- `kh/` - Authenticated user functions (requires login)
- `pub/` - Public functions (no authentication required)
- `sys/` - Admin/system functions (admin access only)

## Stock Application Specific APIs

This project focuses on stock management functionality. Key API endpoints include:

### Stock Pool Management (`stock/kh/pool.js`)
```javascript
// Get user's stock list
this.vk.callFunction({
    url: 'stock/kh/pool/getList',
    data: { group_name: 'technology' },
    success: (res) => {
        // Handle stock list
    }
});

// Add stock to pool
this.vk.callFunction({
    url: 'stock/kh/pool/add',
    data: { stock_code: 'SH000001', group_name: 'personal' },
    success: (res) => {
        // Handle add success
    }
});
```

### Real-time Stock Quotes (`stock/pub/quote.js`)
```javascript
// Get real-time quotes (public API)
this.vk.callFunction({
    url: 'stock/pub/quote/getBatch',
    data: { codes: ['SH000001', 'SZ399001'] },
    success: (res) => {
        // Handle quote data
    }
});
```

### Stock Groups (`stock/kh/group.js`)
```javascript
// Manage stock categories/groups
this.vk.callFunction({
    url: 'stock/kh/group/list',
    success: (res) => {
        // Handle groups list
    }
});
```

### Price Alerts (`stock/kh/alert.js`)
```javascript
// Set price alert
this.vk.callFunction({
    url: 'stock/kh/alert/create',
    data: {
        stock_code: 'SH000001',
        alert_price: 3000,
        alert_type: 'above'
    },
    success: (res) => {
        // Handle alert creation
    }
});
```

## Configuration Files

- `manifest.json` - uni-app configuration (platforms, permissions, etc.)
- `pages.json` - Page routing and navigation configuration
- `uniCloud-aliyun/cloudfunctions/common/uni-config-center/` - Cloud configuration
- `app.config.js` - VK framework configuration

## Key Features

### Stock Management Features
- **Personal Stock Pool**: Create and manage custom stock portfolios
- **Real-time Quotes**: Live stock price data integration via Tencent Finance API
- **Stock Grouping**: Organize stocks by custom categories (technology, finance, personal, etc.)
- **Price Alerts**: Set price-based notifications and alerts
- **Drag & Drop Sorting**: Reorder stocks with custom sort functionality
- **Stock Search**: Find and add stocks to portfolio
- **Tab Navigation**: Dedicated sections for Stock Pool, Alert Center, and User Profile

### Technical Features  
- **Multi-platform Support**: H5, WeChat Mini Program, Alipay, Baidu, QQ, TikTok, Android, iOS
- **Cloud Function Router**: Single cloud function handling multiple API endpoints
- **Built-in User System**: Registration, login, SMS/email verification
- **Real-time Data**: Automatic quote refresh and live market data
- **Database APIs**: vk.baseDao for simplified database operations
- **State Persistence**: Vuex store with automatic local storage

## Important Notes

- This project uses Vue 3.0 as specified in `manifest.json`
- Cloud functions are deployed to Aliyun (uniCloud-aliyun)
- The main cloud function is `router` which handles all API requests
- UI components are from vk-uview-ui (enhanced uView)
- Database operations use the vk.baseDao API for simplified queries

## Development Workflow

1. Frontend development in `pages/` and components
2. Backend API development in `uniCloud-aliyun/cloudfunctions/router/service/`
3. Database schema changes in `uniCloud-aliyun/database/`
4. Test using the template pages in `pages_template/`
5. Deploy cloud functions through HBuilderX

## Cloud Function Development Guidelines

### Creating New APIs
1. Copy `uniCloud-aliyun/cloudfunctions/router/service/muban.js` as a template
2. Place in appropriate service directory:
   - `service/client/` for client APIs
   - `service/admin/` for admin APIs  
   - `service/user/` for unified user center APIs
3. Use subdirectories for access control:
   - `pub/` - Public access (no authentication)
   - `kh/` - User authentication required
   - `sys/` - Admin/system access only

### API Function Structure
```javascript
module.exports = {
  main: async (event) => {
    let { data = {}, userInfo, util, filterResponse, originalParam } = event;
    let { customUtil, uniID, config, pubFun, vk, db, _, $ } = util;
    let { uid } = data; // Available in kh/ functions only
    let res = { code: 0, msg: "" };
    
    // Business logic here
    
    return res;
  }
}
```

## Database Operations

The project uses vk.baseDao for simplified database operations. Key database collections:

### Stock Pool Database (`stock_pool`)
```javascript
// Get user's stock list
let stockList = await vk.baseDao.getList({
  dbName: "stock_pool",
  whereJson: { uid },
  sortArr: [{ name: "sort_order", type: "asc" }]
});

// Add stock to user's pool
await vk.baseDao.add({
  dbName: "stock_pool",
  dataJson: {
    uid,
    stock_code: "SH000001",
    stock_name: "上证指数",
    group_name: "personal",
    sort_order: 100
  }
});
```

### Stock Groups Database (`stock_group`)
```javascript
// Get user's stock groups
let groups = await vk.baseDao.getList({
  dbName: "stock_group",
  whereJson: { uid }
});
```

### Stock Alerts Database (`stock_alert`)
```javascript
// Create price alert
await vk.baseDao.add({
  dbName: "stock_alert",
  dataJson: {
    uid,
    stock_code: "SH000001",
    alert_price: 3000,
    alert_type: "above",
    is_active: true
  }
});
```

## Frontend API Calls

Use the vk.callFunction method for all cloud function calls:

```javascript
// In Vue components
this.vk.callFunction({
  url: 'service/path/function',  // Maps to service directory structure
  title: 'Loading...',          // Loading indicator text
  data: { /* request data */ },  // Parameters to send
  success: (data) => {
    // Success callback - data.code === 0 indicates success
  },
  fail: (err) => {
    // Error callback
  }
});
```

## Configuration Management

### App Configuration (`app.config.js`)
- `functionName`: Cloud function name to use ("router" for production)
- `debug`: Enable/disable development logging
- `color`: App theme colors
- `checkTokenPages`: Configure which pages require login
- `staticUrl`: Static asset URLs

### Cloud Function Configuration (`router/config.js`)
- Database connection settings
- Third-party service configurations (WeChat, SMS, etc.)
- Environment-specific settings

## Important Development Notes

### Stock Application Specific
- **Stock Codes**: Use standard format (SH000001 for Shanghai, SZ399001 for Shenzhen)
- **Real-time Data**: Stock quotes are fetched from Tencent Finance API (qt.gtimg.cn)
- **Auto Refresh**: Stock prices auto-refresh every 2-3 seconds on active pages
- **User Data**: All stock pools, groups, and alerts are user-specific (uid-based)
- **Drag & Drop**: Stocks can be reordered using sort_order field

### Technical Environment
- **Vue Version**: Project uses Vue 3.0 (check `manifest.json` → vueVersion)
- **Cloud Provider**: Uses Aliyun uniCloud (not Tencent)
- **Database**: Uses uniCloud database with vk.baseDao abstraction
- **Authentication**: Built on uni-id with VK enhancements  
- **File Upload**: Supports uniCloud storage, external storage (Qiniu), and Aliyun OSS
- **Routing**: All APIs go through single cloud function with internal routing
- **Development IDE**: Primarily HBuilderX with no traditional npm build process

## Common Patterns

### Page Navigation with Login Check
```javascript
// Use vk.navigateTo instead of uni.navigateTo for automatic login checking
this.vk.navigateTo({
  url: '/pages/user/profile'
});
```

### State Management
```javascript
// Get Vuex state
let userInfo = this.vk.getVuex('$user.userInfo');

// Set Vuex state (automatically persisted)
this.vk.setVuex('$user.userInfo', newUserInfo);
```

### File Upload
```javascript
this.vk.uploadFile({
  cloudPath: 'avatars/' + Date.now() + '.jpg',
  success: (res) => {
    console.log('Upload success:', res.fileID);
  }
});
```