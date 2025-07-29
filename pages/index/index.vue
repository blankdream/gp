<template>
  <view class="index-page">
    <!-- 顶部搜索栏 -->
    <view class="top-search">
      <StockSearchBar @select="onStockSelect" />
    </view>
    
    <!-- Tab 切换栏 -->
    <view class="tab-bar">
      <scroll-view class="tab-scroll" scroll-x>
        <view class="tab-container">
          <view 
            v-for="(tab, index) in groupOptions" 
            :key="index"
            class="tab-item" 
            :class="{ active: selectedGroup === index }"
            @click="onGroupChange(index)"
          >
            {{ tab }}
          </view>
        </view>
      </scroll-view>
      
      <!-- 分组管理按钮 -->
      <view class="manage-btn" @click="onGroupManage">
        <u-icon name="more-dot-fill" size="20" color="#666"></u-icon>
      </view>
    </view>
    
    <!-- 内容区域（移除scroll-view，使用页面级滚动） -->
    <view class="content-container">
      <!-- 加载状态 -->
      <LoadingState
        :visible="loading && !stockList.length"
        type="skeleton"
        :count="5"
      />
      
      <!-- 股票列表 -->
      <view class="stock-list" v-if="!loading && stockList.length > 0" @click="closeAllMenus">
        <!-- 表头 -->
        <view class="stock-header">
          <view class="header-item name">名称</view>
          <view class="header-item price clickable" @click="onSort('price')">
            <text>价格</text>
            <view class="sort-icon" v-if="sortField === 'price'">
              <u-icon :name="sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'" size="12" color="#1976d2"></u-icon>
            </view>
          </view>
          <view class="header-item change clickable" @click="onSort('percent')">
            <text>涨跌幅</text>
            <view class="sort-icon" v-if="sortField === 'percent'">
              <u-icon :name="sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'" size="12" color="#1976d2"></u-icon>
            </view>
          </view>
          <view class="header-item turnover clickable" @click="onSort('turnover')">
            <text>换手率</text>
            <view class="sort-icon" v-if="sortField === 'turnover'">
              <u-icon :name="sortOrder === 'asc' ? 'arrow-up' : 'arrow-down'" size="12" color="#1976d2"></u-icon>
            </view>
          </view>
          <view class="header-item actions">操作</view>
        </view>
        
        <!-- 股票卡片 -->
        <view v-for="(stock, idx) in stockList" :key="stock._id || stock.code">
          <StockCard 
            :ref="`stockCard${idx}`"
            :stock="stock" 
            :expanded="expandedIdx === idx"
            :dragOver="dragOverIdx === idx"
            @expand="onExpand(idx)" 
            @dragstart="onDragStart(idx)" 
            @dragmove="onDragMove($event, idx)" 
            @dragend="onDragEnd(idx)"
            @delete="onDeleteStock"
            @edit="onEditStock"
          />
          <StockDetail 
            v-if="expandedIdx === idx" 
            :stock="stock" 
            :stockCode="stock.stock_code || stock.code"
          />
        </view>
      </view>
      
      <!-- 空状态 -->
      <LoadingState
        v-else-if="!loading && stockList.length === 0"
        :visible="true"
        type="empty"
        text="暂无股票数据，点击上方搜索添加股票"
      />
      
      <!-- 错误状态 -->
      <LoadingState
        v-if="errorState.show"
        :visible="true"
        type="error"
        :text="errorState.message"
        @retry="retryLoad"
      />
    </view>
    
    <!-- 分组管理弹窗 -->
    <GroupManageModal 
      :visible="showGroupManage" 
      :groupList="groups.map(g => g.group_name)" 
      @close="showGroupManage=false" 
      @add="onGroupAdd" 
      @delete="onGroupDelete" 
      @update="onGroupUpdate"
      @reorder="onGroupReorder"
    />
    
    <!-- 添加股票弹窗 -->
    <AddStockModal 
      :visible="showAddStock" 
      :stock="addStockItem" 
      :groupList="groups.map(g => g.group_name)" 
      @close="showAddStock=false" 
      @add="onAddStock" 
    />
    
    <!-- 编辑股票弹窗 -->
    <EditStockModal 
      :visible="showEditStock" 
      :stock="editStockItem" 
      :groupList="groups.map(g => g.group_name)" 
      @close="showEditStock=false" 
      @save="onUpdateStock" 
    />
  </view>
</template>

<script>
import StockCard from '@/components/StockCard.vue'
import StockDetail from '@/components/StockDetail.vue'
import StockSearchBar from '@/components/StockSearchBar.vue'
import GroupManageModal from '@/components/GroupManageModal.vue'
import AddStockModal from '@/components/AddStockModal.vue'
import EditStockModal from '@/components/EditStockModal.vue'
import LoadingState from '@/components/LoadingState.vue'
import StockApi from '@/utils/stockApi.js'
import ErrorHandler from '@/utils/errorHandler.js'
import CacheManager from '@/utils/cacheManager.js'
import StorageManager from '@/utils/storageManager.js'

export default {
  name: "IndexPage",
  components: { 
    StockCard, 
    StockDetail, 
    StockSearchBar, 
    GroupManageModal, 
    AddStockModal,
    EditStockModal,
    LoadingState
  },
  data() {
    return {
      stockList: [],
      groups: [],
      selectedGroup: 0,
      expandedIdx: null,
      errorState: {
        show: false,
        message: ''
      },
      showGroupManage: false,
      showAddStock: false,
      addStockItem: {},
      showEditStock: false,
      editStockItem: {},
      draggingIdx: null,
      dragOverIdx: null,
      dragStartY: null,
      refreshTimer: null,
      loading: false,
      // 排序相关
      sortField: '',
      sortOrder: 'desc' // 'asc' 升序, 'desc' 降序
    }
  },
  computed: {
    groupOptions() {
      return ['全部分组', ...this.groups.map(g => g.group_name)]
    },
    currentGroupName() {
      if (this.selectedGroup === 0) return ''
      return this.groups[this.selectedGroup - 1]?.group_name || ''
    }
  },
  onLoad() {
    // 检查存储使用情况，防止存储超限
    try {
      const cleanupResult = StorageManager.checkAndCleanup(75); // 超过75%使用率时清理
      if (cleanupResult.cleanedCount > 0) {
        console.log('自动清理了存储空间，释放了', cleanupResult.cleanedCount, '个缓存项');
      }
    } catch (error) {
      console.warn('存储检查失败:', error);
      // 如果检查失败，尝试紧急清理
      try {
        StorageManager.emergencyCleanup();
      } catch (e) {
        console.error('紧急清理也失败了:', e);
      }
    }
    
    // 测试日期兼容性
    StockApi.testDateCompatibility()
    
    this.initPage()
  },
  onHide() {
    this.stopAutoRefresh()
    // 如果有展开的详情，通知K线图组件停止刷新
    if (this.expandedIdx !== null) {
      // 可以通过事件或ref来通知K线图组件
      this.$nextTick(() => {
        const stockCards = this.$refs[`stockCard${this.expandedIdx}`]
        if (stockCards && stockCards[0]) {
          // 这里可以添加停止K线图刷新的逻辑
        }
      })
    }
  },
  onShow() {
    // 如果没有展开详情，恢复股票列表刷新
    if (this.expandedIdx === null) {
      this.startAutoRefresh()
    }
  },
  onUnload() {
    this.stopAutoRefresh()
  },
  // 页面级下拉刷新
  async onPullDownRefresh() {
    try {
      // 下拉刷新时强制从服务器重新加载数据，跳过缓存
      await this.loadGroups(true) // forceRefresh = true
      await this.loadStockList(true) // forceRefresh = true
      if (this.stockList.length > 0) {
        await this.loadRealTimeQuotes()
      }
      
      // 显示刷新成功提示
      this.vk.toast('刷新成功')
    } catch (error) {
      this.vk.toast('刷新失败')
      console.error('下拉刷新失败:', error)
    } finally {
      // 停止下拉刷新的加载状态
      uni.stopPullDownRefresh()
    }
  },
  methods: {
    // 初始化页面
    async initPage() {
      await this.loadGroups()
      await this.loadStockList()
      await this.loadRealTimeQuotes()
    },

    // 加载分组列表
    async loadGroups(forceRefresh = false) {
      try {
        // 获取用户ID
        const userInfo = this.vk.getVuex('$user.userInfo')
        const userId = userInfo?.uid || 'anonymous'
        const cacheKey = CacheManager.generateKey('groups', userId)
        
        // 如果不强制刷新，先尝试从缓存获取
        if (!forceRefresh) {
          const cachedGroups = CacheManager.get(cacheKey)
          if (cachedGroups) {
            this.groups = cachedGroups
            console.log('从缓存加载分组列表')
            return
          }
        }
        
        console.log('从服务器加载分组列表')
        const res = await this.vk.callFunction({
          url: 'stock/kh/group',
          data: { action: 'list' }
        })
        
        if (res.code === 0) {
          this.groups = res.data || []
          // 存入缓存
          CacheManager.set(cacheKey, this.groups)
        } else {
          ErrorHandler.showCloudFunctionError(res, '加载分组')
        }
      } catch (err) {
        ErrorHandler.showCloudFunctionError(err, '加载分组')
      }
    },

    // 加载股票列表
    async loadStockList(forceRefresh = false) {
      this.loading = true
      this.errorState.show = false
      
      try {
        // 获取用户ID
        const userInfo = this.vk.getVuex('$user.userInfo')
        const userId = userInfo?.uid || 'anonymous'
        const cacheKey = CacheManager.generateKey('stocks', userId, this.currentGroupName)
        
        // 如果不强制刷新，先尝试从缓存获取
        if (!forceRefresh) {
          const cachedStocks = CacheManager.get(cacheKey)
          if (cachedStocks) {
            this.stockList = cachedStocks
            console.log(`从缓存加载股票列表: ${this.currentGroupName || '全部'}`)
            return
          }
        }
        
        console.log(`从服务器加载股票列表: ${this.currentGroupName || '全部'}`)
        const res = await this.vk.callFunction({
          url: 'stock/kh/pool',
          data: {
            action: 'list',
            group_name: this.currentGroupName
          }
        })
        
        if (res.code === 0) {
          this.stockList = (res.data || []).map(stock => ({
            ...stock,
            // 添加显示用的字段
            name: stock.stock_name,
            // code字段用于显示纯代码，去掉前缀和后缀
            code: stock.stock_code.replace(/^(sh|sz|hk|us)/, '').split('.')[0],
            price: '--',
            upDown: 0,
            upDownStr: '--',
            turnoverRate: '--',
            // 保留原有字段
            quote: null
          }))
          
          // 存入缓存
          CacheManager.set(cacheKey, this.stockList)
        } else {
          this.showError(res, '加载股票列表')
        }
      } catch (err) {
        this.showError(err, '加载股票列表')
      } finally {
        this.loading = false
      }
    },

    // 加载行情 - 使用腾讯财经API
    async loadRealTimeQuotes() {
      if (this.stockList.length === 0) return

      try {
        // 提取股票代码 - 使用fullcode格式（带前缀）
        const codes = this.stockList.map(stock => stock.stock_code).join(',')
        
        // 直接调用腾讯财经API
        const quotes = await StockApi.getRealTimeQuotes(codes)
        
        if (quotes && quotes.length > 0) {
          let allMarketsClosed = true
          
          // 更新股票行情数据
          this.stockList.forEach(stock => {
            const quote = quotes.find(q => q.fullcode === stock.stock_code)
            
            if (quote) {
              // 更新显示字段
              stock.price = StockApi.formatPrice(quote.now)
              stock.upDown = quote.percent > 0 ? 1 : (quote.percent < 0 ? -1 : 0)
              stock.upDownStr = StockApi.formatPercent(quote.percent)
              stock.turnoverRate = quote.turnover ? quote.turnover.toFixed(2) + '%' : '--'
              
              // 保存完整行情数据，供详情页使用
              stock.quote = quote
              
              // 检查是否有任何股票市场还在开市
              if (!quote.isMarketClosed) {
                allMarketsClosed = false
              }
            }
          })
          
          // 如果所有股票市场都已收市，停止自动刷新
          if (allMarketsClosed) {
            console.log('所有市场已收市，停止自动刷新')
            this.stopAutoRefresh()
          }
        }
      } catch (err) {
        ErrorHandler.showStockApiError(err, '加载行情数据')
      }
    },

    // 分组切换
    async onGroupChange(val) {
      this.selectedGroup = val
      this.expandedIdx = null // 收起详情
      await this.loadStockList()
      await this.loadRealTimeQuotes()
      // 确保恢复定时刷新
      this.startAutoRefresh()
    },

    // 分组管理
    onGroupManage() {
      this.showGroupManage = true
    },

    // 展开/收起详情
    onExpand(idx) {
      const wasExpanded = this.expandedIdx === idx
      
      // 如果点击的是已展开的项，则收起
      if (wasExpanded) {
        this.expandedIdx = null
        // 恢复股票列表定时刷新
        this.startAutoRefresh()
      } else {
        // 展开新的详情，自动关闭之前的详情
        this.expandedIdx = idx
        // 暂停股票列表定时刷新
        this.stopAutoRefresh()
      }
    },

    // 选择股票
    onStockSelect(item) {
      this.addStockItem = item
      this.showAddStock = true
    },
    
    // 编辑股票
    onEditStock(stock) {
      this.editStockItem = stock
      this.showEditStock = true
    },

    // 添加股票
    async onAddStock({ stock, group, remark }) {
      try {
        const res = await this.vk.callFunction({
          url: 'stock/kh/pool',
          title: '添加中...',
          data: {
            action: 'add',
            stock_code: stock.fullcode,
            stock_name: stock.name,
            group_name: group,
            remark: remark || ''
          }
        })
        
        if (res.code === 0) {
          this.vk.toast('添加成功')
          this.showAddStock = false
          
          // 清除股票相关缓存，因为添加了新股票
          this.clearStockCaches()
          
          // 如果添加到当前分组，刷新列表
          if (!this.currentGroupName || group === this.currentGroupName) {
            await this.loadStockList()
            await this.loadRealTimeQuotes()
          }
        } else {
          ErrorHandler.showCloudFunctionError(res, '添加股票')
        }
      } catch (err) {
        ErrorHandler.showCloudFunctionError(err, '添加股票')
      }
    },
    
    // 更新股票信息
    async onUpdateStock({ stock, group_name, remark }) {
      try {
        const res = await this.vk.callFunction({
          url: 'stock/kh/pool',
          title: '更新中...',
          data: {
            action: 'update',
            _id: stock._id,
            group_name: group_name,
            remark: remark || ''
          }
        })
        
        if (res.code === 0) {
          this.vk.toast('更新成功')
          this.showEditStock = false
          
          // 清除股票相关缓存，因为更新了股票信息
          this.clearStockCaches()
          
          // 刷新股票列表
          await this.loadStockList()
          await this.loadRealTimeQuotes()
        } else {
          ErrorHandler.showCloudFunctionError(res, '更新股票信息')
        }
      } catch (err) {
        ErrorHandler.showCloudFunctionError(err, '更新股票信息')
      }
    },

    // 添加分组
    async onGroupAdd(groupName) {
      try {
        const res = await this.vk.callFunction({
          url: 'stock/kh/group',
          data: { action: 'add', group_name: groupName }
        })
        
        if (res.code === 0) {
          this.vk.toast('添加成功')
          
          // 清除分组相关缓存，因为添加了新分组
          this.clearGroupCaches()
          
          await this.loadGroups()
        } else {
          this.vk.toast(res.msg || '添加失败')
        }
      } catch (err) {
        console.error('添加分组失败:', err)
        this.vk.toast('添加失败')
      }
    },

    // 删除分组
    async onGroupDelete(index) {
      try {
        const group = this.groups[index]
        if (!group) return
        
        const res = await this.vk.callFunction({
          url: 'stock/kh/group',
          data: { action: 'delete', _id: group._id }
        })
        
        if (res.code === 0) {
          this.vk.toast('删除成功')
          
          // 清除分组相关缓存，因为删除了分组
          this.clearGroupCaches()
          // 同时清除股票缓存，因为分组删除可能影响股票分组
          this.clearStockCaches()
          
          await this.loadGroups()
          
          // 如果删除的是当前分组，切换到全部分组
          if (this.selectedGroup - 1 === index) {
            this.selectedGroup = 0
            await this.loadStockList()
            await this.loadRealTimeQuotes()
          }
        } else {
          this.vk.toast(res.msg || '删除失败')
        }
      } catch (err) {
        console.error('删除分组失败:', err)
        this.vk.toast('删除失败')
      }
    },

    // 分组更新
    async onGroupUpdate() {
      // 清除分组相关缓存，因为分组信息已更新
      this.clearGroupCaches()
      await this.loadGroups()
    },

    // 删除股票
    async onDeleteStock(stock) {
      try {
        const res = await uni.showModal({
          title: '确认删除',
          content: `确定要从股票池中删除"${stock.stock_name || stock.name}"吗？`,
          showCancel: true
        })
        
        // 检查用户是否确认删除
        if (!res.confirm) {
          // 用户点击了取消，直接返回不执行删除
          return
        }
        
        // 调用删除接口
        const deleteRes = await this.vk.callFunction({
          url: 'stock/kh/pool',
          title: '删除中...',
          data: {
            action: 'delete',
            _id: stock._id
          }
        })
        
        if (deleteRes.code === 0) {
          this.vk.toast('删除成功')
          
          // 清除股票相关缓存，因为删除了股票
          this.clearStockCaches()
          
          // 刷新股票列表
          await this.loadStockList()
          await this.loadRealTimeQuotes()
        } else {
          this.vk.toast(deleteRes.msg || '删除失败')
        }
      } catch (err) {
        // 用户取消删除或其他错误
        if (err.errMsg && !err.errMsg.includes('cancel')) {
          console.error('删除股票失败:', err)
          this.vk.toast('删除失败')
        }
      }
    },

    // 排序功能
    onSort(field) {
      // 如果点击的是同一个字段，切换排序顺序
      if (this.sortField === field) {
        this.sortOrder = this.sortOrder === 'asc' ? 'desc' : 'asc'
      } else {
        // 点击新字段，设置为降序（大到小）
        this.sortField = field
        this.sortOrder = 'desc'
      }
      
      // 执行排序
      this.sortStockList()
    },
    
    // 执行股票列表排序
    sortStockList() {
      if (!this.sortField) return
      
      this.stockList.sort((a, b) => {
        let valueA, valueB
        
        switch (this.sortField) {
          case 'price':
            valueA = parseFloat(a.quote?.now || 0)
            valueB = parseFloat(b.quote?.now || 0)
            break
          case 'percent':
            valueA = parseFloat(a.quote?.percent || 0)
            valueB = parseFloat(b.quote?.percent || 0)
            break
          case 'turnover':
            valueA = parseFloat(a.quote?.turnover || 0)
            valueB = parseFloat(b.quote?.turnover || 0)
            break
          default:
            return 0
        }
        
        // 处理无效值
        if (isNaN(valueA)) valueA = 0
        if (isNaN(valueB)) valueB = 0
        
        // 根据排序顺序返回结果
        if (this.sortOrder === 'asc') {
          return valueA - valueB
        } else {
          return valueB - valueA
        }
      })
    },

    // 分组重排序
    async onGroupReorder({ fromIndex, toIndex }) {
      try {
        // 调用后端API重排序分组
        const res = await this.vk.callFunction({
          url: 'stock/kh/group',
          data: {
            action: 'reorder',
            fromIndex,
            toIndex
          }
        })
        
        if (res.code === 0) {
          this.vk.toast('排序成功')
          
          // 清除分组相关缓存，因为分组顺序已变更
          this.clearGroupCaches()
          
          await this.loadGroups()
        } else {
          this.vk.toast(res.msg || '排序失败')
        }
      } catch (err) {
        console.error('分组排序失败:', err)
        this.vk.toast('排序失败')
      }
    },

    // 股票拖拽相关方法
    onDragStart(idx) {
      this.draggingIdx = idx
      this.dragOverIdx = null
    },
    
    onDragMove(clientY, currentIdx) {
      if (this.draggingIdx === null) return
      
      // 根据拖拽距离计算目标位置
      const cardHeight = 80 // 估算每个股票卡片的高度（rpx转px约为40px）
      const startY = this.dragStartY || clientY
      const deltaY = clientY - startY
      const moveSteps = Math.round(deltaY / cardHeight)
      
      // 计算目标索引
      let targetIdx = this.draggingIdx + moveSteps
      targetIdx = Math.max(0, Math.min(this.stockList.length - 1, targetIdx))
      
      if (targetIdx !== this.draggingIdx) {
        this.dragOverIdx = targetIdx
      }
      
      // 记录起始位置（首次调用时）
      if (!this.dragStartY) {
        this.dragStartY = clientY
      }
    },
    
    async onDragEnd(idx) {
      if (this.draggingIdx !== null && 
          this.dragOverIdx !== null && 
          this.draggingIdx !== this.dragOverIdx) {
        
        // 交换数组元素
        const dragItem = this.stockList[this.draggingIdx]
        const dropItem = this.stockList[this.dragOverIdx]
        
        // 更新排序
        try {
          await this.vk.callFunction({
            url: 'stock/kh/pool',
            data: {
              action: 'updateSort',
              sortList: [
                { _id: dragItem._id, sort_order: dropItem.sort_order },
                { _id: dropItem._id, sort_order: dragItem.sort_order }
              ]
            }
          })
          
          // 清除股票相关缓存，因为股票排序已变更
          this.clearStockCaches()
          
          // 本地更新
          const moved = this.stockList.splice(this.draggingIdx, 1)[0]
          this.stockList.splice(this.dragOverIdx, 0, moved)
          
        } catch (err) {
          ErrorHandler.showCloudFunctionError(err, '更新排序')
        }
      }
      
      // 重置拖拽状态
      this.draggingIdx = null
      this.dragOverIdx = null
      this.dragStartY = null
    },

    // 开始自动刷新
    startAutoRefresh() {
      this.stopAutoRefresh() // 先停止已有的定时器
      
      // 立即执行一次
      this.loadRealTimeQuotes()
      
      // 设置定时器，每2秒执行一次
      // loadRealTimeQuotes内部会根据API返回的市场状态自动停止刷新
      this.refreshTimer = setInterval(() => {
        this.loadRealTimeQuotes()
      }, 2000)
    },

    // 停止自动刷新
    stopAutoRefresh() {
      if (this.refreshTimer) {
        clearInterval(this.refreshTimer)
        this.refreshTimer = null
      }
    },
    
    // 显示错误状态
    showError(error, context) {
      this.errorState.show = true
      this.errorState.message = ErrorHandler.handleCloudFunctionError(error)
      
      // 同时显示toast提示
      ErrorHandler.showCloudFunctionError(error, context)
    },
    
    // 重试加载
    async retryLoad() {
      this.errorState.show = false
      await this.loadStockList()
      if (this.stockList.length > 0) {
        await this.loadRealTimeQuotes()
      }
    },
    
    // 清除股票相关缓存
    clearStockCaches() {
      const userInfo = this.vk.getVuex('$user.userInfo')
      const userId = userInfo?.uid || 'anonymous'
      CacheManager.clearByType('stocks', userId)
    },
    
    // 清除分组相关缓存
    clearGroupCaches() {
      const userInfo = this.vk.getVuex('$user.userInfo')
      const userId = userInfo?.uid || 'anonymous'
      CacheManager.clearByType('groups', userId)
    },
    
    // 关闭所有股票卡片的菜单
    closeAllMenus() {
      // 通过ref访问所有股票卡片组件，关闭它们的菜单
      this.stockList.forEach((stock, index) => {
        const stockCard = this.$refs[`stockCard${index}`]
        if (stockCard && stockCard[0] && stockCard[0].showMenu) {
          stockCard[0].showMenu = false
        }
      })
    },
    
    // 清理存储空间
    async clearStorage() {
      try {
        const result = StorageManager.cleanupStorage();
        if (result.success) {
          this.vk.toast(`清理完成，释放了${result.cleanedCount}个缓存项`);
          console.log('存储清理结果:', result);
        } else {
          this.vk.toast('清理失败: ' + result.error);
        }
      } catch (error) {
        console.error('清理存储失败:', error);
        this.vk.toast('清理失败，请重试');
      }
    },
    
    // 检查存储状态（调试用）
    checkStorageStatus() {
      try {
        const info = StorageManager.getStorageInfo();
        const details = StorageManager.getStorageDetails();
        console.log('存储状态:', info);
        console.log('存储详情:', details);
        this.vk.toast(`存储使用率: ${info.usage}%`);
      } catch (error) {
        console.error('检查存储状态失败:', error);
      }
    }
  }
}
</script>

<style scoped>
.index-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding-bottom: 120rpx; /* 为Tab栏留出空间 */
}

.top-search {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #fff;
  padding: 16rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.08);
}

.tab-bar {
  display: flex;
  align-items: center;
  background: #fff;
  border-bottom: 1rpx solid #e5e5e5;
}

.tab-bar .tab-scroll {
  flex: 1;
  white-space: nowrap;
}

.tab-bar .tab-container {
  display: flex;
  padding: 0 16rpx;
}

.tab-bar .tab-item {
  flex-shrink: 0;
  padding: 24rpx 32rpx;
  font-size: 30rpx;
  color: #666;
  position: relative;
}

.tab-bar .tab-item.active {
  color: #1976d2;
  font-weight: 600;
}

.tab-bar .tab-item.active::after {
  content: '';
  position: absolute;
  bottom: 0;
  left: 50%;
  transform: translateX(-50%);
  width: 40rpx;
  height: 4rpx;
  background: #1976d2;
  border-radius: 2rpx;
}

.tab-bar .manage-btn {
  flex-shrink: 0;
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-left: 1rpx solid #e5e5e5;
}

.tab-bar .manage-btn:active {
  background: #f5f5f5;
}

/* 内容容器样式 - 支持页面级滚动 */
.content-container {
  flex: 1;
  /* 移除固定高度，让内容自然流动，启用页面级滚动 */
  min-height: calc(100vh - 200rpx); /* 最小高度确保填满视口 */
}

.stock-list {
  background: #fff;
  margin-top: 0;
}

.stock-header {
  display: flex;
  align-items: center;
  padding: 20rpx 32rpx;
  background: #f3f6fa;
  border-bottom: 1px solid #e0e0e0;
}

.stock-header .header-item {
  font-weight: bold;
  font-size: 28rpx;
  color: #666;
  text-align: center;
}

.stock-header .header-item.clickable {
  position: relative;
  cursor: pointer;
  user-select: none;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4rpx;
}

.stock-header .header-item.clickable:hover {
  background: rgba(25, 118, 210, 0.08);
  border-radius: 8rpx;
}

.stock-header .header-item.clickable:active {
  background: rgba(25, 118, 210, 0.15);
  transform: scale(0.98);
}

.stock-header .sort-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 20rpx;
  height: 20rpx;
}

.stock-header .header-item.name {
  flex: 2.5;
  text-align: left;
  padding-left: 80rpx; /* 考虑拖拽手柄的空间 */
}

.stock-header .header-item.price {
  flex: 1.2;
  text-align: center;
}

.stock-header .header-item.change {
  flex: 1.2;
  text-align: center;
}

.stock-header .header-item.turnover {
  flex: 1.2;
  text-align: center;
}

.stock-header .header-item.actions {
  flex: 1.5;
  text-align: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 32rpx;
  background: #fff;
  margin-top: 16rpx;
}

.empty-state .empty-text {
  font-size: 32rpx;
  color: #999;
  margin-bottom: 16rpx;
}

.empty-state .empty-hint {
  font-size: 28rpx;
  color: #ccc;
}
</style>