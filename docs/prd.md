# 项目架构分析

## 1. 项目概述

这是一个基于 `vk-unicloud-router` 框架开发的股票监控应用，主要功能包括股票行情实时查看、自选股管理、价格预警等。项目采用前后端一体化开发模式，使用 uni-app 跨平台开发框架，支持多端部署。

## 2. 技术栈

- **前端框架**: uni-app + Vue.js
- **UI组件库**: uView UI
- **后端服务**: uniCloud + vk-unicloud-router 云函数路由框架
- **状态管理**: Vuex
- **数据库**: 云数据库（支持 MongoDB 等）
- **开发工具**: HBuilderX

## 3. 项目结构

```
gupiao/
├── common/                 # 公共资源目录
│   ├── css/                # 公共样式文件
│   └── function/           # 公共函数
├── components/             # 公共组件
├── pages/                  # 主要页面
├── pages_template/         # 模板页面
├── static/                 # 静态资源
├── store/                  # Vuex 状态管理
├── uniCloud-aliyun/        # uniCloud 云服务
│   ├── cloudfunctions/     # 云函数
│   └── database/           # 数据库 schema
├── uni_modules/            # uni-app 模块
├── utils/                  # 工具类
├── App.vue                 # 应用入口文件
├── main.js                 # 应用主配置
├── pages.json              # 页面路由配置
└── app.config.js           # 应用配置文件
```

## 4. 核心功能模块

### 4.1 前端页面结构

项目包含以下主要页面：

1. **首页 (pages/index/index)**
   - 股票池展示页面
   - 支持股票搜索、分组管理
   - 股票列表展示实时行情
   - 支持拖拽排序和股票详情查看

2. **预警中心 (pages/alert/alert)**
   - 股价预警设置和管理
   - 预警通知展示

3. **个人中心 (pages/user/user)**
   - 用户个人信息管理
   - 系统设置

4. **测试页面 (pages/test/test)**
   - 功能演示页面

### 4.2 核心组件

1. **StockCard.vue** - 股票卡片组件
   - 展示股票基本信息（名称、代码、价格、涨跌幅等）
   - 支持拖拽排序
   - 提供编辑和删除功能

2. **StockSearchBar.vue** - 股票搜索组件
   - 实现股票代码/名称搜索功能

3. **StockDetail.vue** - 股票详情组件
   - 展示股票详细行情数据

4. **KLineChart.vue** - K线图组件
   - 展示股票K线图表

5. **GroupSelector.vue** - 分组选择器
   - 实现股票分组管理

### 4.3 工具类

1. **stockApi.js** - 股票API工具类
   - 对接腾讯财经API获取实时行情数据
   - 解析股票数据格式

2. **cacheManager.js** - 缓存管理器
   - 管理应用数据缓存

3. **storageManager.js** - 存储管理器
   - 处理本地数据存储

### 4.4 后端架构

使用 `vk-unicloud-router` 云函数路由框架，具有以下特点：

1. **路由模式开发**：通过路由分发请求到不同业务处理函数
2. **集成 uni-id**：内置用户认证系统
3. **数据库访问**：提供便捷的数据库操作API
4. **模块化结构**：
   - dao/ - 数据访问对象
   - middleware/ - 中间件
   - service/ - 业务服务层
   - util/ - 工具函数

### 4.5 数据库设计

数据库使用 uniCloud 云数据库，主要数据表包括：

1. **stock_pool** - 股票池数据
2. **stock_group** - 股票分组
3. **stock_alert** - 股价预警设置
4. **uni-id-users** - 用户信息表
5. **uni-id-log** - 用户操作日志

## 5. 项目特色

1. **实时行情获取**：通过腾讯财经API获取实时股票数据
2. **多平台支持**：基于uni-app框架，支持H5、小程序、App等多端
3. **云开发集成**：使用uniCloud实现后端服务，无需额外部署服务器
4. **组件化设计**：功能模块组件化，便于维护和扩展
5. **用户系统**：集成完整的用户认证和权限管理

## 6. 运行机制

1. 前端通过工具类 stockApi.js 调用腾讯财经API获取实时行情
2. 用户数据（自选股、分组、预警设置等）存储在云数据库中
3. 通过 `vk-unicloud-router` 框架处理业务逻辑和数据访问
4. 前端页面通过Vuex进行状态管理，实现数据共享

## 7. 可扩展性分析

1. **功能扩展**：组件化设计便于添加新功能模块
2. **平台扩展**：uni-app框架支持快速部署到多平台
3. **数据源扩展**：可接入更多金融数据API
4. **云服务扩展**：uniCloud支持弹性扩容，满足业务增长需求