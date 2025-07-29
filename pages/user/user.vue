<template>
  <view class="user-page">
    <!-- 用户信息卡片 -->
    <view class="user-info-card" v-if="userInfo">
      <view class="user-avatar">
        <u-avatar :src="userInfo.avatar || ''" size="80" :text="getUserDisplayName()"></u-avatar>
      </view>
      <view class="user-details">
        <view class="nickname">{{ userInfo.nickname || getUserDisplayName() }}</view>
        <view class="mobile">{{ userInfo.mobile ? maskMobile(userInfo.mobile) : '未绑定手机' }}</view>
        <view class="login-time">登录时间：{{ formatTime(userInfo.last_login_date) }}</view>
        <view class="uid-info">用户ID：{{ userInfo.uid || userInfo._id }}</view>
      </view>
    </view>

    <!-- 未登录状态 -->
    <view v-else class="login-prompt">
      <view class="login-icon">
        <u-icon name="account-circle" size="80" color="#ccc"></u-icon>
      </view>
      <text class="login-text">请先登录</text>
      <u-button type="primary" @click="goLogin" class="login-btn">立即登录</u-button>
    </view>

    <!-- 功能菜单 -->
    <view class="menu-list" v-if="userInfo">
      <view class="menu-item" @click="editProfile">
        <view class="menu-content">
          <u-icon name="edit-1" size="24" color="#666"></u-icon>
          <text class="menu-text">编辑资料</text>
        </view>
        <u-icon name="arrow-right" size="16" color="#ccc"></u-icon>
      </view>
      
      <view class="menu-item" @click="changePwd">
        <view class="menu-content">
          <u-icon name="lock" size="24" color="#666"></u-icon>
          <text class="menu-text">修改密码</text>
        </view>
        <u-icon name="arrow-right" size="16" color="#ccc"></u-icon>
      </view>
    </view>

    <!-- 退出登录 -->
    <view class="logout-section" v-if="userInfo">
      <u-button type="error" @click="logout" class="logout-btn">退出登录</u-button>
    </view>

    <!-- 编辑资料弹窗 -->
    <u-modal 
      v-model="showEditProfile" 
      title="编辑资料"
      show-cancel-button 
      @confirm="saveProfile"
      @cancel="cancelEdit"
    >
      <view class="edit-form">
        <view class="form-item">
          <text class="label">昵称</text>
          <input 
            v-model="profileForm.nickname" 
            type="text" 
            placeholder="请输入昵称"
            class="input"
          />
        </view>
        
        <view class="form-item">
          <text class="label">个人简介</text>
          <textarea 
            v-model="profileForm.bio" 
            placeholder="请输入个人简介"
            class="textarea"
            maxlength="200"
          />
        </view>
      </view>
    </u-modal>

  </view>
</template>

<script>
export default {
  name: 'UserPage',
  data() {
    return {
      userInfo: null,
      showEditProfile: false,
      profileForm: {
        nickname: '',
        bio: ''
      }
    }
  },
  onLoad() {
    this.loadUserInfo()
  },
  onShow() {
    this.loadUserInfo()
  },
  methods: {
    // 加载用户信息
    async loadUserInfo() {
      try {
        const userInfo = this.vk.getVuex('$user.userInfo')
        const token = this.vk.getVuex('$user.token')
        
        console.log('loadUserInfo - userInfo:', userInfo)
        console.log('loadUserInfo - token:', token)
        console.log('loadUserInfo - userInfo.uid:', userInfo?.uid)
        
        // 检查用户信息是否存在 - 用_id而不是uid
        if (userInfo && (userInfo.uid || userInfo._id)) {
          this.userInfo = userInfo
          console.log('用户已登录，设置userInfo:', this.userInfo)
        } else {
          this.userInfo = null
          console.log('用户未登录，清空userInfo')
        }
      } catch (err) {
        console.error('加载用户信息失败:', err)
        this.userInfo = null
      }
    },

    // 跳转登录
    goLogin() {
      this.vk.navigateTo({
        url: '/pages_template/uni-id/login/index/index'
      })
    },

    // 编辑资料
    editProfile() {
      this.profileForm.nickname = this.userInfo.nickname || ''
      this.profileForm.bio = this.userInfo.bio || ''
      this.showEditProfile = true
    },

    // 保存资料
    async saveProfile() {
      if (!this.profileForm.nickname.trim()) {
        this.vk.toast('请输入昵称')
        return
      }

      try {
        const res = await this.vk.callFunction({
          url: 'user/kh/updateUser',
          title: '保存中...',
          data: {
            nickname: this.profileForm.nickname.trim(),
            bio: this.profileForm.bio.trim()
          }
        })

        if (res.code === 0) {
          this.vk.toast('保存成功')
          this.showEditProfile = false
          // 更新本地用户信息
          const updatedUserInfo = {
            ...this.userInfo,
            nickname: this.profileForm.nickname.trim(),
            bio: this.profileForm.bio.trim()
          }
          this.vk.setVuex('$user.userInfo', updatedUserInfo)
          this.userInfo = updatedUserInfo
        } else {
          this.vk.toast(res.msg || '保存失败')
        }
      } catch (err) {
        console.error('保存资料失败:', err)
        this.vk.toast('保存失败')
      }
    },

    // 取消编辑
    cancelEdit() {
      this.showEditProfile = false
      this.profileForm = {
        nickname: '',
        bio: ''
      }
    },

    // 修改密码
    changePwd() {
      this.vk.navigateTo({
        url: '/pages_template/uni-id/password/password'
      })
    },

    // 退出登录
    async logout() {
      try {
        await this.vk.modal('确认退出登录吗？')
        
        const res = await this.vk.callFunction({
          url: 'user/pub/logout',
          title: '退出中...'
        })

        // 清除本地用户信息
        this.vk.setVuex('$user.userInfo', null)
        this.vk.setVuex('$user.token', '')
        
        this.vk.toast('已退出登录')
        this.userInfo = null
        
        // 跳转到登录页
        this.goLogin()
      } catch (err) {
        if (err.confirm === false) return // 用户取消
        console.error('退出登录失败:', err)
        this.vk.toast('退出失败')
      }
    },

    // 手机号掩码处理
    maskMobile(mobile) {
      if (!mobile) return ''
      return mobile.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2')
    },

    // 格式化时间
    formatTime(time) {
      if (!time) return '未知'
      const date = new Date(time)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      
      if (diff < 60000) { // 1分钟内
        return '刚刚'
      } else if (diff < 3600000) { // 1小时内
        return Math.floor(diff / 60000) + '分钟前'
      } else if (diff < 86400000) { // 1天内
        return Math.floor(diff / 3600000) + '小时前'
      } else {
        return date.toLocaleDateString()
      }
    },

    // 获取用户显示名称
    getUserDisplayName() {
      if (!this.userInfo) return 'U'
      
      // 优先显示昵称
      if (this.userInfo.nickname) {
        return this.userInfo.nickname.charAt(0).toUpperCase()
      }
      
      // 其次显示用户名
      if (this.userInfo.username) {
        return this.userInfo.username.charAt(0).toUpperCase()
      }
      
      // 最后显示手机号后4位
      if (this.userInfo.mobile) {
        return this.userInfo.mobile.slice(-4)
      }
      
      // 默认显示U
      return 'U'
    }
  }
}
</script>

<style lang="scss" scoped>
.user-page {
  min-height: 100vh;
  background: #f7f8fa;
  padding: 32rpx;
  padding-bottom: 120rpx;
}

.user-info-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 40rpx 32rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  display: flex;
  align-items: center;
  
  .user-avatar {
    margin-right: 32rpx;
  }
  
  .user-details {
    flex: 1;
    
    .nickname {
      font-size: 36rpx;
      font-weight: bold;
      color: #333;
      margin-bottom: 8rpx;
    }
    
    .mobile {
      font-size: 28rpx;
      color: #666;
      margin-bottom: 8rpx;
    }
    
    .login-time {
      font-size: 24rpx;
      color: #999;
    }
    
    .uid-info {
      font-size: 24rpx;
      color: #ccc;
      margin-top: 4rpx;
    }
  }
}

.login-prompt {
  background: #fff;
  border-radius: 16rpx;
  padding: 80rpx 32rpx;
  margin-bottom: 32rpx;
  text-align: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  
  .login-icon {
    margin-bottom: 24rpx;
  }
  
  .login-text {
    display: block;
    font-size: 32rpx;
    color: #666;
    margin-bottom: 32rpx;
  }
  
  .login-btn {
    width: 240rpx;
  }
}

.menu-list {
  background: #fff;
  border-radius: 16rpx;
  margin-bottom: 32rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
  
  .menu-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 32rpx;
    border-bottom: 1rpx solid #f5f5f5;
    
    &:last-child {
      border-bottom: none;
    }
    
    &:active {
      background: #f8f9fa;
    }
    
    .menu-content {
      display: flex;
      align-items: center;
      
      .menu-text {
        font-size: 32rpx;
        color: #333;
        margin-left: 24rpx;
      }
    }
  }
}

.logout-section {
  .logout-btn {
    width: 100%;
  }
}

.edit-form {
  .form-item {
    margin-bottom: 32rpx;
    
    .label {
      display: block;
      font-size: 28rpx;
      color: #333;
      margin-bottom: 16rpx;
    }
    
    .input, .textarea {
      width: 100%;
      padding: 16rpx 24rpx;
      border: 1rpx solid #ddd;
      border-radius: 8rpx;
      font-size: 28rpx;
      
      &:focus {
        border-color: #1976d2;
      }
    }
    
    .textarea {
      height: 120rpx;
      resize: none;
    }
  }
}

</style>