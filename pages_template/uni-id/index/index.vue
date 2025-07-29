<template>
	<view class="content">
		<view style="margin-bottom: 20rpx;font-size: 32rpx;">
			<view>
				<text>当前运行的</text><text style="font-weight: bold;margin: 0 10rpx;">vue</text>版本：
				<text style="font-weight: bold;">
					<!-- #ifdef VUE2 -->
					Vue2
					<!-- #endif -->
					<!-- #ifdef VUE3 -->
					Vue3
					<!-- #endif -->
				</text>
			</view>
		</view>

		<button type="default" @click="pageTo('../password/password')">用户名和密码</button>
		<button type="default" @click="pageTo('../mobile/mobile')">手机号和验证码</button>
		<button type="default" @click="pageTo('../email/email')">邮箱与验证码</button>
		<!-- #ifdef MP-WEIXIN || APP-PLUS -->
		<button type="default" @click="pageTo('../weixin/weixin')">微信登录</button>
		<!-- #endif -->
		<!-- #ifdef MP-ALIPAY || APP-PLUS -->
		<button type="default" @click="pageTo('../alipay/alipay')">支付宝登录</button>
		<!-- #endif -->
		<!-- #ifdef MP-QQ || APP-PLUS -->
		<button type="default" @click="pageTo('../qq/qq')">QQ登录</button>
		<!-- #endif -->
		<view style="margin-bottom: 20rpx;">小白也能轻松上手的数据库API</view>
		<button type="default" @click="pageTo('../../db-test/db-test')">数据库API</button>
		<button type="default" @click="pageTo('../util/util')">通用方法</button>
		
		<view style="margin-bottom: 20rpx;">插件版本1.8.7 新增 APP手机一键登录</view>
		<button type="default" @click="pageTo('../univerify/univerify')">手机一键登录</button>
		<view style="margin-bottom: 20rpx;">插件版本1.4.4 新增 Vuex状态管理</view>
		<button type="default" @click="pageTo('../../vk-vuex/vk-vuex')">Vuex状态管理演示示例</button>
		<button type="default" @click="pageTo('../login/index/index')">登录注册找回密码页面模板</button>
		<view style="margin-bottom: 20rpx;">三方工具对接</view>
		<button type="default" @click="vk.navigateTo('../../plugs/lucky-draw/lucky-draw')">抽奖活动小助手（新）</button>
		<view style="margin-bottom: 20rpx;">各大小程序API扩展</view>
		<button type="default" @click="vk.navigateTo('../../openapi/weixin/weixin')">微信小程序API</button>
		<!-- #ifdef H5 -->
		<button type="default" @click="pageTo('../weixin/h5-weixin')">微信公众号API</button>
		<!-- #endif -->
		<button type="default" @click="vk.navigateTo('../../openapi/qq/qq')">QQ小程序API</button>
		<button type="default" @click="vk.navigateTo('../../openapi/douyin/douyin')">抖音小程序API</button>
		<button type="default" @click="vk.navigateTo('../../openapi/alipay/alipay')">支付宝小程序API</button>
		<button type="default" @click="vk.navigateTo('../../openapi/baidu/baidu')">百度开放平台API</button>
		

	</view>
</template>

<script>
	let vk = uni.vk;
	export default {
		data() {
			return {

			}
		},
		onLoad(options) {
			vk = uni.vk;
		},
		methods: {
			pageTo(url){
				vk.navigateTo(url);
			}
		}
	}
</script>

<style lang="scss" scoped>
	.content {
		padding: 15px;
	}
	.content input {
		height: 46px;
		border: solid 1px #DDDDDD;
		border-radius: 5px;
		margin-bottom: 15px;
		padding: 0px 15px;
	}
	.content button {
		margin-bottom: 15px;
	}
	.content navigator {
		display: inline-block;
		color: #007AFF;
		border-bottom: solid 1px #007AFF;
		font-size: 16px;
		line-height: 24px;
		margin-bottom: 15px;
	}
	.tips {
		text-align: center;
		line-height: 20px;
		font-size: 14px;
		color: #999999;
		margin-bottom: 20px;
	}
	.red-tips{
		margin-bottom: 20rpx;
		color: red;
		font-size: 26rpx;
	}
</style>
