<template>
	<view class="content">
		<view class="tips">
			注意：仅支持在微信小程序、微信公众号、App、浏览器（若是PC浏览器需先登录PC版微信）中使用，其他平台暂不支持。
		</view>
		<button type="default" @click="navigateToLuckyDraw(`pages/activity/detail/detail?_id=${activity_id}`)">前往抽奖</button>
		<button type="default" @click="navigateToLuckyDraw(`pages/activity/user-list/user-list?_id=${activity_id}`)">查看指定活动的参与人员列表</button>
		<button type="default" @click="navigateToLuckyDraw(`pages/activity/win-user-list/win-user-list?_id=${activity_id}`)">查看指定活动的中奖人员列表</button>
		<button type="default" @click="navigateToLuckyDraw(`pages/activity/share/share?_id=${activity_id}`)">生成指定活动分享海报</button>
		<button type="default" @click="navigateToLuckyDraw('pages/index/add')">创建抽奖</button>
		<button type="default" @click="navigateToLuckyDraw('pages/user/my-add/list')">查看我发起的抽奖</button>
		<button type="default" @click="navigateToLuckyDraw('pages/user/my-in/list')">查看我参与的抽奖</button>
		<button type="default" @click="navigateToLuckyDraw('pages/user/my-win/list')">查看我的中奖记录</button>
		<button type="default" @click="navigateToLuckyDraw('pages/index/mys')">前往会员中心</button>
		<button type="default" @click="navigateToLuckyDraw('pages/index/index')">前往首页</button>
		<button type="default" @click="navigateToLuckyDraw('pages/pub/help/index')">前往帮助中心</button>
		<button type="default" @click="navigateToLuckyDraw('pages/user/api-key/list')">生成API key</button>
	</view>
</template>

<script>
	let vk = uni.vk;
	export default {
		data() {
			return {
				activity_id: "685b95a6e9f982fde4835c85", // 活动ID，具体活动ID请在vk-admin后台-系统设置-抽奖活动中查看，如有疑问，可联系QQ：370725567
			};
		},
		onLoad(options) {
			vk = uni.vk;
		},
		methods: {
			navigateToLuckyDraw(path) {
				// #ifndef MP-WEIXIN || APP || WEB
				vk.alert("当前环境不支持抽奖功能，请在微信小程序、微信公众号、App或PC浏览器中使用");
				return;
				// #endif
				vk.navigateToLuckyDraw({
					path
				});
			}
		}
	};
</script>

<style lang="scss" scoped>
	.content {
		padding: 15px;
	}

	.content input {
		height: 46px;
		border: solid 1px #dddddd;
		border-radius: 5px;
		margin-bottom: 15px;
		padding: 0px 15px;
	}

	.content button {
		margin-bottom: 15px;
	}

	.content navigator {
		display: inline-block;
		color: #007aff;
		border-bottom: solid 1px #007aff;
		font-size: 16px;
		line-height: 24px;
		margin-bottom: 15px;
	}

	.tips {
		line-height: 20px;
		font-size: 14px;
		color: red;
		margin-bottom: 20px;
	}
</style>