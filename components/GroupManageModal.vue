<template>
  <view v-if="visible" class="modal-mask">
    <view class="modal">
      <view class="modal-title">分组管理</view>
      <view class="group-list">
        <view 
          v-for="(group, idx) in groupList" 
          :key="group" 
          class="group-item"
          :class="{ dragging: draggingIdx === idx, 'drag-over': dragOverIdx === idx }"
          @touchstart="onDragStart($event, idx)"
          @touchmove.prevent="onDragMove($event, idx)"
          @touchend="onDragEnd($event, idx)"
        >
          <view class="drag-handle">
            <u-icon name="more" size="18" color="#999" style="transform: rotate(90deg);"></u-icon>
          </view>
          <text class="group-name">{{ group }}</text>
          <button class="delete-btn" @click.stop="onDelete(idx)">删除</button>
        </view>
        <view v-if="groupList.length === 0" class="empty-hint">
          暂无分组
        </view>
      </view>
      <view class="add-group-row">
        <input v-model="newGroup" placeholder="新分组名称" />
        <button class="add-btn" @click="onAdd">添加</button>
      </view>
      <view class="modal-actions">
        <button class="close-btn" @click="$emit('close')">关闭</button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: "GroupManageModal",
  props: {
    visible: Boolean,
    groupList: Array
  },
  data() {
    return {
      newGroup: '',
      draggingIdx: null,
      dragOverIdx: null,
      startY: 0,
      startIdx: null
    }
  },
  methods: {
    onAdd() {
      if (this.newGroup.trim()) {
        this.$emit('add', this.newGroup.trim())
        this.newGroup = ''
      }
    },
    
    async onDelete(idx) {
      try {
        await uni.showModal({
          title: '确认删除',
          content: `确定要删除分组"${this.groupList[idx]}"吗？删除后该分组下的股票将移至未分组状态。`,
          showCancel: true
        })
        this.$emit('delete', idx)
      } catch (err) {
        // 用户取消删除
      }
    },
    
    // 拖拽开始
    onDragStart(e, idx) {
      this.draggingIdx = idx
      this.startIdx = idx
      this.startY = e.touches[0].clientY
    },
    
    // 拖拽移动
    onDragMove(e, idx) {
      if (this.draggingIdx === null) return
      
      const currentY = e.touches[0].clientY
      const deltaY = currentY - this.startY
      
      // 计算目标位置
      const itemHeight = 56 // 估算每个item的高度
      const moveSteps = Math.round(deltaY / itemHeight)
      const targetIdx = Math.max(0, Math.min(this.groupList.length - 1, this.startIdx + moveSteps))
      
      this.dragOverIdx = targetIdx
    },
    
    // 拖拽结束
    onDragEnd(e, idx) {
      if (this.draggingIdx !== null && 
          this.dragOverIdx !== null && 
          this.draggingIdx !== this.dragOverIdx) {
        
        // 发送重排序事件
        this.$emit('reorder', {
          fromIndex: this.draggingIdx,
          toIndex: this.dragOverIdx
        })
      }
      
      // 重置拖拽状态
      this.draggingIdx = null
      this.dragOverIdx = null
      this.startY = 0
      this.startIdx = null
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
.group-list {
  margin-bottom: 14px;
}
.group-item {
  display: flex;
  align-items: center;
  padding: 12px 8px;
  margin-bottom: 8px;
  border-radius: 6px;
  background: #fafafa;
  transition: all 0.2s ease;
  user-select: none;
}

.group-item.dragging {
  opacity: 0.8;
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1010;
  position: relative;
}

.group-item.drag-over {
  background: #e3f2fd;
  border: 2px dashed #1976d2;
}

.drag-handle {
  padding: 4px;
  margin-right: 12px;
  cursor: grab;
}

.drag-handle:active {
  cursor: grabbing;
}

.group-name {
  flex: 1;
  font-size: 16px;
}

.delete-btn {
  background: #eee;
  border: none;
  border-radius: 6px;
  padding: 6px 12px;
  color: #d32f2f;
  font-size: 0.95em;
  margin-left: 8px;
}

.delete-btn:active {
  background: #e0e0e0;
}
.add-group-row {
  display: flex;
  gap: 8px;
  margin-bottom: 16px;
}
.add-btn {
  background: #1976d2;
  color: #fff;
  border: none;
  border-radius: 6px;
  padding: 4px 14px;
  font-size: 0.95em;
}
.modal-actions {
  text-align: right;
}
.close-btn {
  background: #eee;
  border: none;
  border-radius: 6px;
  padding: 5px 16px;
  font-size: 0.95em;
}
.empty-hint {
  text-align: center;
  color: #999;
  padding: 20px 0;
  font-size: 0.9em;
}
</style>