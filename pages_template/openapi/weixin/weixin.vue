<template>
	<view class="content">
		<button type="default" @tap="code2Session">code2Session</button>
		<button type="default" @tap="getWeixinMPqrcode">生成带参数的小程序码</button>
		<view style="text-align: center;" v-if="imageUrl">
			<image :src="imageUrl" style="width: 400rpx;height: 400rpx;"></image>
		</view>
		<button type="default" @tap="getWeixinMPscheme">生成带参数的scheme码</button>
		<button type="default" @tap="getWeixinMPurl">生成带参数的URL链接</button>
		<view class="tips" v-if="openlink">
			<view>将下方链接复制后从手机浏览器打开即可打开小程序</view>
			<view>{{ openlink }}</view>
		</view>
		<button type="default" @tap="vk.navigateTo('msgSecCheck/msgSecCheck')">文本安全检测</button>
		<button type="default" @tap="vk.navigateTo('imgSecCheck/imgSecCheck')">图片安全检测</button>
		<button type="default" @tap="vk.navigateTo('sendMessage/sendMessage')">发送订阅消息</button>
	</view>
</template>

<script>
	let vk = uni.vk;
	export default {
		data() {
			return {
				imageUrl: "",
				openlink: ""
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
				// #ifndef MP-WEIXIN
				vk.toast("请在微信小程序中打开");
				return;
				// #endif
				vk.userCenter.code2SessionWeixin({
					success: (data) => {
						this.data = data;
					},
				});
			},
			// 生成带参数的小程序码
			getWeixinMPqrcode() {
				let that = this;
				vk.userCenter.getWeixinMPqrcode({
					data: {
						//page: "pages/index/mys",
						scene: "a=1&b=2",
						check_path: false,
						env_version: "develop", // 默认值"release"。要打开的小程序版本。正式版为 "release"，体验版为"trial"，开发版为"develop"，仅在微信外打开时生效。
					},
					success: (data) => {
						that.imageUrl = data.base64;
					}
				});
			},
			// 生成带参数的小程序scheme码
			getWeixinMPscheme() {
				let that = this;
				vk.userCenter.getWeixinMPscheme({
					data: {
						//path: "pages/index/index",
						query: "a=1&b=2",
						env_version: "develop", // 默认值"release"。要打开的小程序版本。正式版为 "release"，体验版为"trial"，开发版为"develop"，仅在微信外打开时生效。
					},
					success: (data) => {
						that.openlink = data.openlink;
					}
				});
			},
			// 生成带参数的小程序url
			getWeixinMPurl() {
				let that = this;
				vk.userCenter.getWeixinMPurl({
					data: {
						//path: "pages/index/index",
						query: "a=1&b=2",
						env_version: "develop", // 默认值"release"。要打开的小程序版本。正式版为 "release"，体验版为"trial"，开发版为"develop"，仅在微信外打开时生效。
					},
					success: (data) => {
						that.openlink = data.url_link;
					}
				});
			}
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