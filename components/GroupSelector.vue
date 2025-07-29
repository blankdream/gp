<template>
  <view class="group-selector">
    <picker 
      :range="groupList" 
      :value="selectedGroup" 
      @change="onGroupChange"
      class="group-picker"
    >
      <view class="picker">
        <text class="picker-text">{{ groupList[selectedGroup] || '全部分组' }}</text>
        <u-icon name="arrow-down" size="12" color="#666"></u-icon>
      </view>
    </picker>
    <u-button 
      size="mini" 
      type="default" 
      @click="$emit('manage')"
      class="manage-btn"
    >
      分组管理
    </u-button>
  </view>
</template>

<script>
export default {
  name: "GroupSelector",
  props: {
    groupList: { 
      type: Array, 
      default: () => ['全部分组'] 
    },
    selectedGroup: { 
      type: Number, 
      default: 0 
    }
  },
  methods: {
    onGroupChange(e) {
      this.$emit('update:selectedGroup', e.detail.value)
    }
  }
}
</script>

<style lang="scss" scoped>
.group-selector {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 24rpx 32rpx;
  background: #fff;
  border-bottom: 1px solid #f0f0f0;
  margin-bottom: 16rpx;

  .group-picker {
    flex: 1;

    .picker {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 16rpx 24rpx;
      border: 1px solid #e0e0e0;
      border-radius: 8rpx;
      background: #f7f8fa;

      .picker-text {
        font-size: 30rpx;
        color: #333;
      }
    }
  }

  .manage-btn {
    margin-left: 24rpx;
  }
}
</style>