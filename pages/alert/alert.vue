<template>
  <view class="alert-page">
    <!-- 预警列表 -->
    <view class="alert-list" v-if="alertList.length > 0">
      <view 
        v-for="alert in alertList" 
        :key="alert._id" 
        class="alert-item"
      >
        <view class="alert-main">
          <view class="alert-info">
            <text class="stock-name">{{ alert.stock_name }}</text>
            <text class="alert-condition">{{ getAlertConditionText(alert) }}</text>
          </view>
          <view class="alert-actions">
            <u-button size="mini" type="default" @click="editAlert(alert)">编辑</u-button>
            <u-button size="mini" type="error" @click="deleteAlert(alert)">删除</u-button>
          </view>
        </view>
      </view>
    </view>
    
    <!-- 空状态 -->
    <view v-else class="empty-state">
      <text class="empty-text">暂无预警设置</text>
      <text class="empty-hint">点击下方按钮添加预警</text>
    </view>
    
    <!-- 添加预警按钮 -->
    <view class="add-alert-btn">
      <u-button type="primary" @click="showAddAlert = true">添加预警</u-button>
    </view>
    
    <!-- 预警设置弹窗 -->
    <u-modal 
      v-model="showAddAlert" 
      title="设置预警"
      show-cancel-button 
      @confirm="confirmAlert"
      @cancel="cancelAlert"
    >
      <view class="alert-form">
        <view class="form-item">
          <text class="label">股票名称</text>
          <input 
            v-model="alertForm.stock_name" 
            type="text" 
            placeholder="请输入股票名称"
            class="input"
          />
        </view>
        
        <view class="form-item">
          <text class="label">预警类型</text>
          <picker 
            :value="alertTypeIndex" 
            :range="alertTypeOptions" 
            range-key="text"
            @change="onAlertTypeChange"
          >
            <view class="picker">{{ alertTypeOptions[alertTypeIndex].text }}</view>
          </picker>
        </view>
        
        <view class="form-item" v-if="alertForm.alert_type === 'price'">
          <text class="label">价格条件</text>
          <view class="condition-row">
            <picker 
              :value="priceConditionIndex" 
              :range="priceConditionOptions" 
              range-key="text"
              @change="onPriceConditionChange"
            >
              <view class="picker">{{ priceConditionOptions[priceConditionIndex].text }}</view>
            </picker>
            <input 
              v-model="alertForm.target_value" 
              type="number" 
              placeholder="目标价格"
              class="input number-input"
            />
            <text class="unit">元</text>
          </view>
        </view>
        
        <view class="form-item" v-else>
          <text class="label">涨跌幅条件</text>
          <view class="condition-row">
            <picker 
              :value="percentConditionIndex" 
              :range="percentConditionOptions" 
              range-key="text"
              @change="onPercentConditionChange"
            >
              <view class="picker">{{ percentConditionOptions[percentConditionIndex].text }}</view>
            </picker>
            <input 
              v-model="alertForm.target_value" 
              type="number" 
              placeholder="涨跌幅"
              class="input number-input"
            />
            <text class="unit">%</text>
          </view>
        </view>
      </view>
    </u-modal>
  </view>
</template>

<script>
export default {
  name: 'AlertPage',
  data() {
    return {
      alertList: [],
      showAddAlert: false,
      isEdit: false,
      currentAlert: null,
      alertForm: {
        stock_name: '',
        stock_code: '',
        alert_type: 'price',
        condition: '>',
        target_value: ''
      },
      alertTypeOptions: [
        { text: '价格预警', value: 'price' },
        { text: '涨跌幅预警', value: 'percent' }
      ],
      alertTypeIndex: 0,
      priceConditionOptions: [
        { text: '高于', value: '>' },
        { text: '低于', value: '<' }
      ],
      priceConditionIndex: 0,
      percentConditionOptions: [
        { text: '涨幅大于', value: '>' },
        { text: '跌幅大于', value: '<' }
      ],
      percentConditionIndex: 0
    }
  },
  onLoad() {
    this.loadAlertList()
  },
  onShow() {
    this.loadAlertList()
  },
  methods: {
    // 加载预警列表
    async loadAlertList() {
      try {
        const res = await this.vk.callFunction({
          url: 'stock/kh/alert',
          data: { action: 'list' }
        })
        if (res.code === 0) {
          this.alertList = res.data || []
        }
      } catch (err) {
        console.error('加载预警列表失败:', err)
        this.vk.toast('加载失败')
      }
    },
    
    // 获取预警条件文本
    getAlertConditionText(alert) {
      if (alert.alert_type === 'price') {
        const conditionText = alert.condition === '>' ? '高于' : '低于'
        return `价格${conditionText} ${alert.target_value} 元时提醒`
      } else {
        const conditionText = alert.condition === '>' ? '涨幅大于' : '跌幅大于'
        return `${conditionText} ${alert.target_value}% 时提醒`
      }
    },
    
    // 编辑预警
    editAlert(alert) {
      this.isEdit = true
      this.currentAlert = alert
      this.alertForm = {
        stock_name: alert.stock_name,
        stock_code: alert.stock_code,
        alert_type: alert.alert_type,
        condition: alert.condition,
        target_value: alert.target_value.toString()
      }
      
      // 设置picker的索引
      this.alertTypeIndex = this.alertTypeOptions.findIndex(item => item.value === alert.alert_type)
      if (alert.alert_type === 'price') {
        this.priceConditionIndex = this.priceConditionOptions.findIndex(item => item.value === alert.condition)
      } else {
        this.percentConditionIndex = this.percentConditionOptions.findIndex(item => item.value === alert.condition)
      }
      
      this.showAddAlert = true
    },
    
    // 删除预警
    async deleteAlert(alert) {
      try {
        await this.vk.modal('确认删除该预警吗？')
        
        const res = await this.vk.callFunction({
          url: 'stock/kh/alert',
          title: '删除中...',
          data: {
            action: 'delete',
            _id: alert._id
          }
        })
        
        if (res.code === 0) {
          this.vk.toast('删除成功')
          this.loadAlertList()
        } else {
          this.vk.toast(res.msg || '删除失败')
        }
      } catch (err) {
        if (err.confirm === false) return // 用户取消
        console.error('删除预警失败:', err)
        this.vk.toast('删除失败')
      }
    },
    
    // 预警类型改变
    onAlertTypeChange(e) {
      this.alertTypeIndex = e.detail.value
      this.alertForm.alert_type = this.alertTypeOptions[this.alertTypeIndex].value
    },
    
    // 价格条件改变
    onPriceConditionChange(e) {
      this.priceConditionIndex = e.detail.value
      this.alertForm.condition = this.priceConditionOptions[this.priceConditionIndex].value
    },
    
    // 涨跌幅条件改变
    onPercentConditionChange(e) {
      this.percentConditionIndex = e.detail.value
      this.alertForm.condition = this.percentConditionOptions[this.percentConditionIndex].value
    },
    
    // 确认添加/编辑预警
    async confirmAlert() {
      if (!this.alertForm.stock_name.trim()) {
        this.vk.toast('请输入股票名称')
        return
      }
      
      if (!this.alertForm.target_value) {
        this.vk.toast('请输入目标值')
        return
      }
      
      try {
        const action = this.isEdit ? 'update' : 'add'
        const data = {
          action: action,
          stock_name: this.alertForm.stock_name.trim(),
          stock_code: this.alertForm.stock_code || '',
          alert_type: this.alertForm.alert_type,
          condition: this.alertForm.condition,
          target_value: parseFloat(this.alertForm.target_value)
        }
        
        if (this.isEdit) {
          data._id = this.currentAlert._id
        }
        
        const res = await this.vk.callFunction({
          url: 'stock/kh/alert',
          title: this.isEdit ? '更新中...' : '添加中...',
          data
        })
        
        if (res.code === 0) {
          this.vk.toast(this.isEdit ? '更新成功' : '添加成功')
          this.showAddAlert = false
          this.loadAlertList()
        } else {
          this.vk.toast(res.msg || (this.isEdit ? '更新失败' : '添加失败'))
        }
      } catch (err) {
        console.error('设置预警失败:', err)
        this.vk.toast('设置失败')
      }
    },
    
    // 取消设置预警
    cancelAlert() {
      this.showAddAlert = false
      this.isEdit = false
      this.currentAlert = null
      this.alertForm = {
        stock_name: '',
        stock_code: '',
        alert_type: 'price',
        condition: '>',
        target_value: ''
      }
      this.alertTypeIndex = 0
      this.priceConditionIndex = 0
      this.percentConditionIndex = 0
    }
  }
}
</script>

<style lang="scss" scoped>
.alert-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding: 32rpx;
  padding-bottom: 200rpx;
}

.alert-list {
  .alert-item {
    background: #fff;
    border-radius: 12rpx;
    margin-bottom: 24rpx;
    box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
    
    .alert-main {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 28rpx 32rpx;
      
      .alert-info {
        flex: 1;
        
        .stock-name {
          display: block;
          font-weight: bold;
          font-size: 32rpx;
          color: #333;
          margin-bottom: 8rpx;
        }
        
        .alert-condition {
          font-size: 28rpx;
          color: #666;
        }
      }
      
      .alert-actions {
        display: flex;
        gap: 16rpx;
      }
    }
  }
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 120rpx 32rpx;
  background: #fff;
  border-radius: 12rpx;
  
  .empty-text {
    font-size: 32rpx;
    color: #999;
    margin-bottom: 16rpx;
  }
  
  .empty-hint {
    font-size: 28rpx;
    color: #ccc;
  }
}

.add-alert-btn {
  position: fixed;
  bottom: 120rpx;
  left: 32rpx;
  right: 32rpx;
}

.alert-form {
  .form-item {
    margin-bottom: 32rpx;
    
    .label {
      display: block;
      font-size: 28rpx;
      color: #333;
      margin-bottom: 16rpx;
    }
    
    .input {
      width: 100%;
      height: 80rpx;
      padding: 0 24rpx;
      border: 1rpx solid #ddd;
      border-radius: 8rpx;
      font-size: 28rpx;
      
      &:focus {
        border-color: #1976d2;
      }
    }
    
    .picker {
      height: 80rpx;
      padding: 0 24rpx;
      border: 1rpx solid #ddd;
      border-radius: 8rpx;
      display: flex;
      align-items: center;
      font-size: 28rpx;
      color: #333;
      background: #fff;
    }
    
    .condition-row {
      display: flex;
      align-items: center;
      gap: 16rpx;
      
      .picker {
        flex: 1;
        min-width: 160rpx;
      }
      
      .number-input {
        flex: 1;
      }
      
      .unit {
        font-size: 28rpx;
        color: #666;
        margin-left: 8rpx;
      }
    }
  }
}
</style>