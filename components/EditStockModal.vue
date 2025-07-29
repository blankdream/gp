<template>
  <view v-if="visible" class="modal-overlay" @tap="onClose">
    <view class="modal-container" @tap.stop="">
      <view class="edit-modal">
        <!-- 标题 -->
        <view class="modal-header">
          <text class="modal-title">编辑股票信息</text>
        </view>
        
        <!-- 内容 -->
        <view class="modal-content">
          <!-- 股票信息 -->
          <view class="stock-info">
            <text class="stock-name">{{ stock.stock_name || stock.name || '--' }}</text>
            <text class="stock-code">{{ getDisplayCode() }}</text>
          </view>
          
          <!-- 分组选择 -->
          <view class="form-item">
            <text class="form-label">分组</text>
            <view class="select-container">
              <picker 
                :value="selectedGroupIndex" 
                :range="groupList" 
                @change="onGroupChange"
                class="group-picker"
              >
                <view class="picker-display">
                  <text class="selected-text">{{ selectedGroup || '请选择分组' }}</text>
                  <text class="arrow-icon">▼</text>
                </view>
              </picker>
            </view>
          </view>
          
          <!-- 备注输入 -->
          <view class="form-item">
            <text class="form-label">备注</text>
            <textarea 
              v-model="remark" 
              placeholder="请输入备注信息（可选）"
              class="remark-textarea"
              maxlength="200"
              :auto-height="true"
              :show-confirm-bar="false"
            />
            <text class="char-count">{{ remark.length }}/200</text>
          </view>
        </view>
        
        <!-- 按钮 -->
        <view class="modal-footer">
          <button class="btn btn-cancel" @tap="onClose">取消</button>
          <button class="btn btn-confirm" @tap="onConfirm" :disabled="loading">
            {{ loading ? '保存中...' : '保存' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: "EditStockModal",
  props: {
    visible: { type: Boolean, default: false },
    stock: { type: Object, default: () => ({}) },
    groupList: { type: Array, default: () => [] }
  },
  data() {
    return {
      selectedGroup: '',
      selectedGroupIndex: 0,
      remark: '',
      loading: false
    }
  },
  watch: {
    visible: {
      handler(newVal) {
        if (newVal) {
          this.initForm()
        }
      },
      immediate: true
    }
  },
  methods: {
    // 初始化表单
    initForm() {
      const defaultGroup = this.stock.group_name || (this.groupList.length > 0 ? this.groupList[0] : '')
      this.selectedGroup = defaultGroup
      
      // 找到对应的索引
      this.selectedGroupIndex = this.groupList.findIndex(group => group === defaultGroup)
      if (this.selectedGroupIndex === -1) {
        this.selectedGroupIndex = 0
        this.selectedGroup = this.groupList[0] || ''
      }
      
      this.remark = this.stock.remark || ''
    },
    
    // 获取显示的股票代码
    getDisplayCode() {
      if (!this.stock) return '--'
      if (this.stock.code) {
        return this.stock.code.split('.')[0]
      }
      if (this.stock.stock_code) {
        return this.stock.stock_code.replace(/^(sh|sz|hk|us)/, '').split('.')[0]
      }
      return '--'
    },
    
    // 分组选择变化
    onGroupChange(e) {
      this.selectedGroupIndex = e.detail.value
      this.selectedGroup = this.groupList[this.selectedGroupIndex]
    },
    
    // 确认保存
    async onConfirm() {
      if (!this.selectedGroup) {
        uni.showToast({
          title: '请选择分组',
          icon: 'none'
        })
        return
      }
      
      this.loading = true
      
      try {
        this.$emit('save', {
          stock: this.stock,
          group_name: this.selectedGroup,
          remark: this.remark.trim()
        })
      } catch (error) {
        console.error('保存失败:', error)
      } finally {
        this.loading = false
      }
    },
    
    // 关闭弹窗
    onClose() {
      this.$emit('close')
    }
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-container {
  width: 680rpx;
  max-width: 90vw;
}

.edit-modal {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
}

.modal-header {
  padding: 40rpx 32rpx 24rpx;
  text-align: center;
  border-bottom: 1rpx solid #f0f0f0;
}

.modal-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #333;
}

.modal-content {
  padding: 32rpx;
}

.stock-info {
  background: #f8f9fa;
  border-radius: 12rpx;
  padding: 24rpx;
  text-align: center;
  margin-bottom: 32rpx;
}

.stock-name {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 8rpx;
}

.stock-code {
  font-size: 28rpx;
  color: #666;
}

.form-item {
  margin-bottom: 32rpx;
}

.form-label {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
}

.group-options {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.group-option {
  flex: 1;
  min-width: 0;
  padding: 20rpx 24rpx;
  background: #f5f5f5;
  border-radius: 12rpx;
  text-align: center;
  font-size: 28rpx;
  color: #666;
  transition: all 0.3s ease;
  border: 2rpx solid transparent;
}

.group-option.active {
  background: rgba(25, 118, 210, 0.1);
  color: #1976d2;
  border-color: #1976d2;
  font-weight: 600;
}

.select-container {
  position: relative;
}

.group-picker {
  width: 100%;
}

.picker-display {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 20rpx;
  background: #f8f9fa;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  font-size: 28rpx;
  min-height: 88rpx;
  box-sizing: border-box;
}

.selected-text {
  color: #333;
  flex: 1;
}

.arrow-icon {
  color: #999;
  font-size: 24rpx;
  transform: scale(0.8);
}

.picker-display:active {
  background: #f0f0f0;
}

.remark-input {
  width: 100%;
  min-height: 120rpx;
  padding: 20rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 8rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.remark-textarea {
  width: 100%;
  min-height: 160rpx;
  padding: 20rpx;
  border: 2rpx solid #e0e0e0;
  border-radius: 12rpx;
  font-size: 28rpx;
  box-sizing: border-box;
  background: #fff;
  color: #333;
  line-height: 1.5;
  resize: none;
}

.char-count {
  text-align: right;
  font-size: 24rpx;
  color: #999;
  margin-top: 12rpx;
}

.modal-footer {
  display: flex;
  gap: 20rpx;
  padding: 32rpx;
  border-top: 1rpx solid #f0f0f0;
  background: #fafafa;
}

.btn {
  flex: 1;
  height: 80rpx;
  border-radius: 8rpx;
  font-size: 32rpx;
  border: none;
  cursor: pointer;
}

.btn-cancel {
  background: #f5f5f5;
  color: #666;
}

.btn-confirm {
  background: #1976d2;
  color: #fff;
}

.btn-confirm:disabled {
  opacity: 0.6;
}
</style>