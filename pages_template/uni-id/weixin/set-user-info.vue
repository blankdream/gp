<template>
	<view class="app">
		<!-- 页面内容开始 -->
		
		<form @submit="submit">
			<view class="avatar-box">
				<button size="mini" class="avatar-button" plain open-type="chooseAvatar" @chooseavatar="onChooseAvatar">
					<view class="avatar-image-box">
						<image class="avatar-image" :src="userInfo.avatar"></image>
					</view>
				</button> 
			</view>
			
			<!-- 昵称输入 -->
			<view class="nickname-box">
			  <view class="nickname">
			    <input class="input" type="nickname" name="nickname" v-model="userInfo.nickname" placeholder="请输入昵称" placeholder-style="color: #8e8e8e;">
			  </view>
			</view>
			
			<button form-type="submit" type="primary" style="margin-top: 40rpx;">修改</button>
			
		</form>
		<!-- 页面内容结束 -->
	</view>
</template>

<script>
	const defaultAvatarUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAHgAAAB4CAMAAAAOusbgAAAASFBMVEX09Pby8vTe3uDPz9DJycm/v8C9vb3BwcLLy8vR0dLp6evn5+i1tbWysrLb29zu7vDNzc7r6+26urrg4OG3t7fj4+TFxcbV1dY8QE/jAAABo0lEQVRo3u2Yi3KCMBBFCY8EIWs0Iv7/n7Y4djqFZEXCTVtnzw+cYZfsqygEQRAEQRAEQRCEt0OVVd1o0x66rNq+tvRFc8ymdSf6gTnn8XaeZthLDm8/0JIM5s5SiCvaq3TQS96BxRVFaLHeM0XBPuhTXAz9ZGfjYkJm+ch4CVnBak5cA8UDJx5wXkUsCiY+82Jcr+h5cf9+4o4X42qX48XACsIVLrI4b6E5sQaKW06M7BIlJy6BYsUk2eIKV8EMIEQV0lu4aJsYwENXtCPD9wkT9hq0NzJX2wy72/FXAj0xLr1jDm9g1LToNeLBYS4+5PEu23Kuq8Bi5oMWy78gvs7F8OX4QTMXN3m8gY3xlEHrgvtTDX/JF09BPPb80o0UZQSO1cw94J5pTLzVzdIT7A3wokv/THtP9d6jZm/WaCfMnquba9dqJ9rdUv08ufNU7xPl5jXtRLNDvG+vaydSP1qN27yf9STpZanVP/MSk2LeGOf0aG/4r75J6dKrqlUML+L/INYp4pQrUJUiTrlNqEr7jegq15gvCIIgCIIgCIIg7M4HkS5rj/A3dbUAAAAASUVORK5CYII='

	let vk = uni.vk;
	export default {
		data() {
			// 页面数据变量
			return {
				userInfo:{
					avatar: "",
					nickname: ""
				}
			}
		},
		// 监听 - 页面每次【加载时】执行(如：前进)
		onLoad(options = {}) {
			vk = uni.vk;
			this.options = options;
			this.init(options);
		},
		// 监听 - 页面【首次渲染完成时】执行。注意如果渲染速度快，会在页面进入动画完成前触发
		onReady(){},
		// 监听 - 页面每次【显示时】执行(如：前进和返回) (页面每次出现在屏幕上都触发，包括从下级页面点返回露出当前页面)
		onShow() {},
		// 监听 - 页面每次【隐藏时】执行(如：返回)
		onHide() {},
		// 函数
		methods: {
			// 页面数据初始化函数
			init(options){
				this.userInfo.nickname = vk.getVuex("$user.userInfo.nickname");
				this.userInfo.avatar = vk.getVuex("$user.userInfo.avatar") || defaultAvatarUrl;
			},
			// 为了兼容微信小程序开发工具，需要这样写
			submit(e){
				this.userInfo.nickname = e.detail.value.nickname;
				this.updateUserInfo();
			},
			onChooseAvatar(e) {
				const avatarUrl = e.detail.avatarUrl 
				this.userInfo.avatar = avatarUrl;
			},
			async updateUserInfo(){
				if (!this.userInfo.avatar || !this.userInfo.nickname) {
					vk.toast("头像和昵称不能为空");
					return;
				}
				// 上传图片到云储存
				let dataJson = {};
				if (this.userInfo.avatar.indexOf("https://") !== 0) {
					let uploadFileRes = await vk.uploadFile({
						filePath: this.userInfo.avatar,
						fileType: "image"
					});
					dataJson.avatar = uploadFileRes.url;
				} else {
					dataJson.avatar = this.userInfo.avatar;
				}
				dataJson.nickname = this.userInfo.nickname;
				// 发起修改请求
				vk.userCenter.updateUser({
					data: dataJson,
					success: (data) => {
						vk.alert("设置成功");
					}
				});
			}
		},
		// 监听器
		watch:{
			
		},
		// 计算属性
		computed:{
			
		}
	}
</script>
<style lang="scss" scoped>
	.app{
		padding: 30rpx;
	}
	.avatar-box{
		/* #ifndef APP-NVUE */
		display: flex;
		justify-content: center;
		/* #endif */
		.avatar-button{
			border: 0;
		}
		.avatar-image-box{
			width: 120rpx;
			height: 120rpx;
			background-color: #f3f3f3;
			border-radius: 50%;
			overflow: hidden;
			display: flex;
			justify-content: center;
			align-items: center;
		}
		.avatar-image{
			width: 100rpx;
			height: 100rpx;
			border-radius: 50%;
			overflow: hidden;
		}
	}
	
	/* 昵称 */
	.nickname-box {
	  margin-top: 40rpx;
		.nickname {
			margin-top: 16rpx;
			width: 100%;
			padding: 26rpx 20rpx;
			border-radius: 10rpx;
			background-color: #F8F7F8;
		}
		.input {
			color: #080808;
		}
	}
	
</style>