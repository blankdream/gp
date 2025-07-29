<template>
	<view class="content">
		<input type="text" v-model="form1.username" placeholder="用户名/邮箱/手机号" />
		<input type="text" v-model="form1.password" password="true" placeholder="密码" />
		<button type="default" @click="register">注册</button>
		<button type="default" @click="login">登录</button>
		<button type="default" @click="updatePwd">修改密码</button>
		<button type="default" @click="resetPwd">重设密码</button>
	</view>
</template>

<script>
	let vk = uni.vk;
	export default {
		data() {
			return {
				form1:{
					username: 'admin',
					password: '123456'
				}

			}
		},
		onLoad(options) {
			vk = uni.vk;
		},
		methods: {
			// 用户注册
			register(){
				let that = this;
				let form1 = that.form1;
				vk.userCenter.register({
					data:form1,
					success: (data) => {
						vk.alert("注册成功!");
					}
				});
			},
			// 用户登录
			login(){
				let that = this;
				let form1 = that.form1;
				vk.userCenter.login({
					data:form1,
					success: (data) => {
						vk.alert("登录成功");
					}
				});
			},
			// 修改密码
			updatePwd(){
				let that = this;
				let form1 = that.form1;
				vk.userCenter.updatePwd({
					data:{
						oldPassword: "123456",
						newPassword: "123456",
						password_confirmation: "123456"
					},
					success: (data) => {
						vk.alert("修改成功");
					}
				});
			},
			// 重置密码
			resetPwd(){
				let that = this;
				let form1 = that.form1;
				vk.userCenter.resetPwd({
					success: (data) => {
						vk.alert("密码已重置为123456");
					}
				});
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
		display: block;
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
</style>
