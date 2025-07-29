<template>
  <view v-if="visible" class="modal-mask">
    <view class="modal">
      <view class="modal-title">添加股票</view>
      <view class="modal-row">
        <view class="modal-label">股票</view>
        <text class="stock-name">{{ stock.name }} <span class="stock-code">{{ stock.code }}</span></text>
      </view>
      <view class="modal-row">
        <view class="modal-label">分组</view>
        <picker :range="groupOptions" :value="selectedGroup" @change="onGroupChange">
          <view class="picker-value">{{ groupOptions[selectedGroup] || '请选择分组' }}</view>
        </picker>
      </view>
      <view class="modal-row">
        <view class="modal-label">备注</view>
        <textarea class="modal-textarea" v-model="remark" placeholder="可填写备注" rows="3" />
      </view>
      <view class="modal-actions">
        <button class="add-btn" @click="onAdd">添加</button>
        <button class="close-btn" @click="$emit('close')">取消</button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: "AddStockModal",
  props: {
    visible: Boolean,
    stock: { type: Object, default: () => ({}) },
    groupList: { type: Array, default: () => [] }
  },
  data() {
    return {
      selectedGroup: 0,
      remark: ''
    }
  },
  computed: {
    groupOptions() {
      return this.groupList.length > 0 ? this.groupList : ['无分组']
    }
  },
  methods: {
    onGroupChange(e) {
      this.selectedGroup = e.detail.value
    },
    onAdd() {
      if (this.stock) {
        const selectedGroupName = this.groupOptions[this.selectedGroup] || ''
        this.$emit('add', {
          stock: this.stock,
          group: selectedGroupName === '无分组' ? '' : selectedGroupName,
          remark: this.remark
        })
        this.resetForm()
      }
    },
    resetForm() {
      this.selectedGroup = 0
      this.remark = ''
    }
  }
}
</script>

<style scoped>
.modal-mask {
  position: fixed;
  left: 0; top: 0; right: 0; bottom: 0;
  background: rgba(0,0,0,0.3);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}
.modal {
  background: #fff;
  border-radius: 10px;
  padding: 28px 22px 18px 22px;
  min-width: 260px;
  max-width: 92vw;
  box-shadow: 0 2px 16px #0002;
}
.modal-title {
  font-weight: bold;
  font-size: 1.1em;
  margin-bottom: 18px;
  text-align: center;
}
.modal-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}
.modal-label {
  min-width: 48px;
  color: #555;
}
.stock-name {
  font-weight: bold;
}
.stock-code {
  color: #888;
  font-size: 0.95em;
  margin-left: 6px;
}
.picker-value {
  padding: 6px 10px;
  border: 1px solid #ddd;
  border-radius: 5px;
  min-width: 80px;
  background: #fafbfc;
}
.modal-textarea {
  flex: 1;
  border: 1px solid #ddd;
  border-radius: 6px;
  padding: 6px 10px;
  font-size: 1em;
  min-height: 60px;
}
.modal-actions {
  text-align: right;
  margin-top: 10px;
}
.add-btn {
  background: #1976d2;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 5px 16px;
  font-size: 0.95em;
  margin-right: 8px;
}
.close-btn {
  background: #eee;
  border: none;
  border-radius: 6px;
  padding: 5px 16px;
  font-size: 0.95em;
}
</style>