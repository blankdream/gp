<template>
	<view class="content">
		<button type="default" @click="vk.navigateTo('../../openapi/weixin/weixin')">小程序API</button>
		<!-- #ifdef MP-WEIXIN -->
		<button type="default" @click="loginByWeixin('register')">微信注册</button>
		<button type="default" @click="loginByWeixin('login')">微信登录</button>
		<button type="default" @click="loginByWeixin()">微信登录(不存在自动注册)</button>
		<view class="tips">静默授权，无弹窗。</view>
		<button type="default" @click="code2SessionWeixin">获取微信openid</button>
		<view class="tips">静默授权，无弹窗。</view>
		<button type="default" @click="setUserInfo">获取并设置微信用户昵称头像</button>
		<view class="tips">需要授权，有弹窗。</view>
		<button type="default" @click="bindWeixin">绑定微信</button>
		<button type="default" @click="unbindWeixin">解绑微信</button>
		<button type="default" open-type="getPhoneNumber"  @getphonenumber="getPhoneNumber1">获取微信绑定的手机号（新方式）</button>
		<button type="default" open-type="getPhoneNumber"  @getphonenumber="getPhoneNumber2">获取微信绑定的手机号（旧方式）</button>
		<view class="tips">注意：新旧方式个人小程序均不支持，需要企业认证的小程序</view>
		<view class="tips">仅获取手机号</view>
		<button type="default" open-type="getPhoneNumber"  @getphonenumber="loginByWeixinPhoneNumber1">用微信绑定手机号登录/注册（新方式）</button>
		<button type="default" open-type="getPhoneNumber"  @getphonenumber="loginByWeixinPhoneNumber2">用微信绑定手机号登录/注册（旧方式）</button>
		<view class="tips">此操作能同时绑定微信和手机号</view>
		<!-- #endif -->
		<!-- #ifdef APP-PLUS -->
		<template v-if="hasWeixinAuth">
			<button type="default" @click="loginByWeixin('register')">微信注册</button>
			<button type="default" @click="loginByWeixin('login')">微信登录</button>
			<button type="default" @click="loginByWeixin()">微信登录(不存在自动注册)</button>
			<button type="default" @click="bindWeixin">绑定微信</button>
			<button type="default" @click="unbindWeixin">解绑微信</button>
			<button type="default" @click="setUserInfo">获取微信用户昵称头像</button>
			
			<text space="ensp">{{ JSON.stringify(data, null, 2) }}</text>
		</template>
		<template v-else>
			<view class="tips">未包含微信登录模块</view>
		</template>
		<!-- #endif -->
	</view>
</template>

<script>
	let vk = uni.vk;
	export default {
		data() {
			return {
				hasWeixinAuth: true,
				encryptedKey:"",
				image:"",
				data:{}
			}
		},
		onLoad(options) {
			vk = uni.vk;
			this.init();
		},
		methods: {
			init(){
				let that = this;
				// #ifdef MP-WEIXIN
				vk.userCenter.code2SessionWeixin({
					data:{
						needCache:true
					},
					success: (data) => {
						that.encryptedKey = data.encryptedKey;
					},
				});
				// #endif
			},
			// 微信登录
			loginByWeixin(type){
				let that = this;
				vk.userCenter.loginByWeixin({
					data:{
						type
					},
					success: (data) => {
						vk.alert(data.msg);
						that.data = data;
					}
				});
			},
			code2SessionWeixin() {
				vk.userCenter.code2SessionWeixin({
					success: (data) => {
						vk.alert(JSON.stringify(data));
					},
				});
			},
			// 设置用户昵称头像
			setUserInfo(){
				let that = this;
				// #ifdef MP-WEIXIN
				try {
					vk.navigateTo('./set-user-info');
					// uni.getUserProfile({
					// 	desc:"用于快速设置昵称头像",
					// 	success:(res) => {
					// 		let { userInfo } = res;
					// 		vk.userCenter.updateUser({
					// 			data:{
					// 				nickname : userInfo.nickName,
					// 				avatar : userInfo.avatarUrl,
					// 				gender : userInfo.gender
					// 			},
					// 			success: (data) => {
					// 				vk.alert("设置成功");
					// 			}
					// 		});
					// 	}
					// });
				}catch(err){
					vk.alert("您的微信版本过低，请先更新微信!");
				}
				// #endif

				// #ifndef MP-WEIXIN
				uni.login({
				  provider: 'weixin',
				  success: (loginRes) => {
				    // 获取用户信息
				    uni.getUserInfo({
				      provider: 'weixin',
				      success: (data) => {
								that.data = data;
								let { userInfo } = data;
								vk.userCenter.updateUser({
									data:{
										nickname : userInfo.nickName,
										avatar : userInfo.avatarUrl,
										gender : userInfo.gender
									},
									success: (data) => {
										vk.alert("设置成功");
									}
								});
				      }
				    });
				  }
				});
				// #endif
			},
			// 绑定微信
			bindWeixin(){
				let that = this;
				vk.userCenter.bindWeixin({
					success: (data) => {
						vk.alert("绑定成功");
						that.data = data;
					}
				});
			},
			// 解绑微信
			unbindWeixin(){
				let that = this;
				vk.userCenter.unbindWeixin({
					success: (data) => {
						vk.alert("解绑成功");
						that.data = data;
					}
				});
			},
			// 获取微信绑定的手机号码（新方式）
			getPhoneNumber1(e){
				let that = this;
				// 微信新增了code参数，可以直接传code，不再需要传 encryptedData 和 iv
				let { code } = e.detail;
				if (!code) {
					return false;
				}
				vk.userCenter.getPhoneNumber({
					data:{
						code,
						encryptedKey: that.encryptedKey
					},
					success: (data) => {
						vk.alert("手机号:" + data.phone);
					}
				});
			},
			// 获取微信绑定的手机号码（旧方式）
			getPhoneNumber2(e){
				let that = this;
				let { encryptedData, iv } = e.detail;
				if (!encryptedData || !iv) {
					return false;
				}
				vk.userCenter.getPhoneNumber({
					data:{
						encryptedData,
						iv,
						encryptedKey: that.encryptedKey
					},
					success: (data) => {
						vk.alert("手机号:" + data.phone);
					}
				});
			},
			// 使用微信绑定的手机号登录/注册（新方式）
			loginByWeixinPhoneNumber1(e){
				let that = this;
				let { code } = e.detail;
				if (!code) {
					return false;
				}
				vk.userCenter.loginByWeixinPhoneNumber({
					data: {
						code,
						encryptedKey : that.encryptedKey
					},
					success(data) {
						vk.alert(data.msg);
					}
				});
			},
			// 使用微信绑定的手机号登录/注册（旧方式）
			loginByWeixinPhoneNumber2(e){
				let that = this;
				let { encryptedData, iv } = e.detail;
				if (!encryptedData || !iv) {
					return false;
				}
				vk.userCenter.loginByWeixinPhoneNumber({
					data: {
						encryptedData,
						iv,
						encryptedKey : that.encryptedKey
					},
					success(data) {
						vk.alert(data.msg);
					}
				});
			},
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
		font-size: 14px;
		color: #999999;
		margin-bottom: 16px;
	}
</style>
