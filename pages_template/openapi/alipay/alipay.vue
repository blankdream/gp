<template>
	<view class="app">
		<button type="default" @tap="code2Session">code2Session</button>
		<button type="default" @tap="getMiniCode">生成带参数的小程序码</button>
		<view style="text-align: center;" v-if="imageUrl">
			<image :src="imageUrl" style="width: 400rpx;height: 400rpx;"></image>
		</view>
		<view>
			<text space="ensp">{{ JSON.stringify(data, null, 2) }}</text>
		</view>
	</view>
</template>

<script>
	let vk = uni.vk;
	export default {
		data() {
			return {
				imageUrl: "",
				data: {}
			};
		},
		onLoad(options) {
			vk = uni.vk;
			this.options = options;
			this.init(options);
		},
		methods: {
			// 初始化
			init(options) {},
			code2Session() {
				// #ifndef MP-ALIPAY
				vk.toast("请在支付宝小程序中打开");
				return;
				// #endif
				uni.login({
					success: res => {
						vk.callFunction({
							url: "template/openapi/alipay/pub/code2Session",
							title: "请求中...",
							data: {
								code: res.code
							},
							success: data => {
								this.data = data;
							}
						});
					}
				});
			},
			// 生成带参数的小程序码
			getMiniCode() {
				vk.callFunction({
					url: "template/openapi/alipay/pub/getMiniCode",
					title: "请求中...",
					data: {
						page: "pages/index/index",
						scene: "a=1&b=2"
					},
					success: data => {
						this.data = data;
						this.imageUrl = data.base64;
					}
				});
			}
		}
	};
</script>

<style lang="scss" scoped>
	.app {
		padding: 30rpx;
	}

	.app button {
		margin-bottom: 30rpx;
	}

	.tips {
		font-size: 28rpx;
		color: #999999;
		margin-bottom: 32rpx;
	}
</style>