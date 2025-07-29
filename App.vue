<script>
	import config from '@/app.config.js'
	import { version } from './package.json'
	export default {
		methods: {

		},
		// 监听 - 页面404
		onPageNotFound: function(e) {
			uni.redirectTo({
				url: config.error.url
			})
		},
		onLaunch: function(options) {
			// 最早期的性能API兜底处理
			try {
				// 检查全局对象
				const globalObj = typeof global !== 'undefined' ? global : 
				                 typeof window !== 'undefined' ? window : 
				                 typeof uni !== 'undefined' ? uni : {};
				
				// 如果performance不存在，创建一个
				if (typeof performance === 'undefined') {
					const performancePolyfill = {
						now: function() { return Date.now(); },
						navigationStart: Date.now(),
						timing: {
							navigationStart: Date.now(),
							loadEventEnd: Date.now(),
							domContentLoadedEventEnd: Date.now()
						},
						getEntriesByType: function() { return []; },
						mark: function() {},
						measure: function() {}
					};
					
					// 尝试设置到全局
					if (typeof global !== 'undefined') {
						global.performance = performancePolyfill;
					}
					if (typeof window !== 'undefined') {
						window.performance = performancePolyfill;
					}
					
					// 创建performance全局变量
					try {
						performance = performancePolyfill;
					} catch(e) {
						console.warn('无法创建performance全局变量:', e);
					}
				} else if (performance && typeof performance.navigationStart === 'undefined') {
					// 如果performance存在但缺少navigationStart
					try {
						performance.navigationStart = Date.now();
						if (performance.timing && typeof performance.timing.navigationStart === 'undefined') {
							performance.timing.navigationStart = Date.now();
						}
					} catch(e) {
						console.warn('无法设置navigationStart:', e);
					}
				}
			} catch (e) {
				console.warn('性能API初始化失败:', e);
			}
			
			// 注意：config.debug 在正式环境时，值为false，故此{}内的代码只有开发环境才会执行
			if (config.debug) {
				// #ifndef APP-PLUS
				console.log(
					`%c vk-client %c v${version} `,
					'background:#35495e ; padding: 1px; border-radius: 3px 0 0 3px;  color: #fff',
					'background:#007aff ;padding: 1px; border-radius: 0 3px 3px 0;  color: #fff; font-weight: bold;'
				);
				// #endif
				console.log('App Launch');
			}
			// 注意：以下代码正式和开发环境都会执行
			// #ifdef MP
			uni.vk.updateManager.updateReady(); // 此代码可以让小程序自动检测最新版本
			// #endif
			
			// 当token有效期大于1天时，做用户每日登录统计时就会有问题，因为用户可能好几天只需要登录一次，但此用户可能每天都在线，导致每日登录用户数量不准确，因此可以在此执行 vk.userCenter.loginByToken()
			// 作用：调用此接口后，会使用当前token进行登录（token需在有效期内），并获得新的token，同时增加登录日志，方便做每日登录统计。（此接口一天内重复调用多次时，只有每日的第一次调用生效）
			// 如果需要，可以打开下面一行的注释代码即可
			// vk.userCenter.loginByToken();
		},
		onShow: function() {
			if (config.debug) console.log("App Show");
			// #ifdef MP-WEIXIN
			// 检测如果当前是体验版，但没有点HBX的【发行】菜单发布，则提示开发者请点【发行】按钮
			try {
				const nodeEnv = process.env.NODE_ENV;
				console.log('当前运行模式: ', nodeEnv);
				const info = uni.getAccountInfoSync();
				if (info.miniProgram.envVersion === "trial" && nodeEnv !== 'production') {
					// 如果不想要alert弹窗提示，可以将vk.alert改成console.log
					uni.vk.alert('检测到您当前发布的【体验版】是通过【运行】按钮打包发布的，请重新点击HBX上方菜单的【发行】按钮进行打包发布小程序（如果确定是【发行】按钮打包的，请删除手机上的体验版小程序并重新扫码进入）', '重要提示', '好的');
				}
			} catch (err) {}
			// #endif
		},
		onHide: function() {
			if (config.debug) console.log('App Hide');
		}
	}
</script>

<style lang="scss">
	/*每个页面公共css */
	@import "./uni_modules/vk-uview-ui/index.scss";
	//@import "./common/css/app.scss";
</style>