<template>
	<view class="app">
		<!-- 页面内容开始 -->
		<textarea v-model="form1.content" style="width: 100%;"></textarea>
		<button @click="msgSecCheck">检测文字是否违规</button>

		<view>
			<text space="ensp">{{ JSON.stringify(data, null, 2) }}</text>
		</view>
		<!-- 页面内容结束 -->
	</view>
</template>

<script>
	let vk = uni.vk;
	export default {
		data() {
			// 页面数据变量
			return {
				// init请求返回的数据
				data: {},
				// 表单请求数据
				form1: {
					content: "草泥马" // 需检测的文本内容，文本字数的上限为2500字
				}
			};
		},
		// 监听 - 页面每次【加载时】执行(如：前进)
		onLoad(options = {}) {
			vk = uni.vk;
			this.options = options;
			this.init(options);
		},
		// 函数
		methods: {
			// 页面数据初始化函数
			init(options) {},
			msgSecCheck(obj) {
				let that = this;
				vk.callFunction({
					url: "template/openapi/qq/pub/msgSecCheck",
					title: "检测中...",
					data: that.form1,
					success: data => {
						that.data = data;
					},
					fail: data => {
						that.data = data;
						vk.toast(data.msg, "none");
					}
				});
			}
		},
		// 计算属性
		computed: {}
	};
</script>
<style lang="scss" scoped>
	.app {
		padding: 30rpx;
	}

	.app button {
		margin-bottom: 30rpx;
	}
</style>