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
					content: "深夜福利，真人视频一对一私密聊天", // 需检测的文本内容，文本字数的上限为2500字
					version: 2, // 接口版本
					scene: 3, // 场景枚举值（1 资料；2 评论；3 论坛；4 社交日志）
					openid: "", // 用户的openid（用户需在近两小时访问过小程序）
					title: "", // 文本标题
					nickname: "", // 用户昵称
					signature: "", // 个性签名，该参数仅在资料类场景有效(scene=1)，
				}
			};
		},
		// 监听 - 页面每次【加载时】执行(如：前进)
		onLoad(options = {}) {
			vk = uni.vk;
			this.options = options;
			this.init(options);
			let openid = vk.getStorageSync("my-mp-weixin-openid");
			if (openid) {
				this.form1.openid = openid;
			} else {
				vk.userCenter.code2SessionWeixin({
					loading: false,
					success: (data) => {
						let { openid } = data;
						this.form1.openid = openid;
						vk.setStorageSync("my-mp-weixin-openid", openid);
					},
				});
			}
		},
		// 函数
		methods: {
			// 页面数据初始化函数
			init(options) {},
			msgSecCheck(obj) {
				let that = this;
				vk.callFunction({
					url: "template/openapi/weixin/pub/msgSecCheck",
					title: "检测中...",
					data: that.form1,
					success: (data) => {
						that.data = data;
					},
					fail: (data) => {
						vk.toast(data.msg, "none");
					}
				});
			}
		},
		// 计算属性
		computed: {}
	};
</script>
<style lang="scss" scoped></style>