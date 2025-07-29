<template>
	<view class="content">
		<button type="default" @click="getWeixinCode()">扫码授权获取code</button>
		<view class="tips">会跳转页面，扫码后再调回来。</view>
		<button type="default" @click="code2SessionWeixin">获取微信openid</button>
		<view class="tips">用户授权获取code，且页面会刷新。</view>
		<button type="default" @click="loginByWeixin('register')">微信注册</button>
		<button type="default" @click="loginByWeixin('login')">微信登录</button>
		<button type="default" @click="loginByWeixin()">微信登录(不存在自动注册)</button>
		<button type="default" @click="bindWeixin()">绑定微信</button>
		<button type="default" @click="unbindWeixin()">解绑微信</button>
	</view>
</template>

<script>
	let vk = uni.vk;
	export default {
		data() {
			return {
				options: {}
			};
		},
		onLoad(options) {
			vk = uni.vk;
			this.options = options || {};
			this.init(options);
		},
		methods: {
			// 初始化
			init(options) {
				if (this.options.code) {
					vk.toast("已获取到code，请点击相应操作。");
					return false;
				}
			},
			getWeixinCode(scope) {
				let appid = ""; // 填写公众号的appid
				let redirect_uri = window.location.href.split("?")[0];
				let url = `https://open.weixin.qq.com/connect/qrconnect?appid=${appid}&redirect_uri=${redirect_uri}&response_type=code&scope=snsapi_login&state=STATE#wechat_redirect`;
				window.location.href = url;
			},
			code2SessionWeixin() {
				if (!this.options.code) {
					vk.toast("请先获取code");
					return false;
				}
				vk.userCenter.code2SessionWeixin({
					data: {
						code: this.options.code,
						state: this.options.state,
					},
					success: (data) => {
						vk.alert(JSON.stringify(data));
					},
				});
			},
			// 微信登录
			loginByWeixin(type) {
				if (!this.options.code) {
					vk.toast("请先获取code");
					return false;
				}
				vk.userCenter.loginByWeixin({
					data: {
						code: this.options.code,
						state: this.options.state,
						type
					},
					success: (data) => {
						vk.alert(data.msg);
						this.data = data;
					}
				});
			},
			// 绑定微信
			bindWeixin() {
				if (!this.options.code) {
					vk.toast("请先获取code");
					return false;
				}
				vk.userCenter.bindWeixin({
					data: {
						code: this.options.code
					},
					success: (data) => {
						vk.alert("绑定成功");
						this.data = data;
					}
				});
			},
			// 解绑微信
			unbindWeixin() {
				vk.userCenter.unbindWeixin({
					success: (data) => {
						vk.alert("解绑成功");
						this.data = data;
					}
				});
			},
		}
	};
</script>

<style lang="scss" scoped>
	.content {
		padding: 30rpx;
	}

	.content button {
		margin-bottom: 30rpx;
	}

	.tips {
		font-size: 28rpx;
		color: #999999;
		margin-bottom: 32rpx;
	}
</style>