/**
 * svelte-i18n 初始化模块。
 * 1. 静态预载两套语言包，避免初始渲染闪现原始 key。
 * 2. 注册语言包并初始化（fallback zh-CN）。
 * 3. 与 `settings` store 的 `locale` 偏好同步（跟随浏览器 / 固定语言），语言切换即时生效。
 */
import { browser } from '$app/environment';
import { get } from 'svelte/store';
import { addMessages, getLocaleFromNavigator, init, locale } from 'svelte-i18n';
import { settings } from '$lib/stores';
import enUS from './locales/en-US.json';
import zhCN from './locales/zh-CN.json';

/** 本扩展支持的固定语言代码。 */
export const SUPPORTED_LOCALES = ['zh-CN', 'en-US'];

/* ---------- 初始化：模块加载即执行一次 ---------- */
init({
	fallbackLocale: 'zh-CN',
	initialLocale: 'zh-CN'
});
addMessages('zh-CN', zhCN);
addMessages('en-US', enUS);

/**
 * 依据设置中的语言偏好解析实际语言代码。
 * - 固定语言（zh-CN / en-US）直接返回。
 * - 'browser' 或空值时跟随浏览器；非浏览器环境回退 zh-CN。
 *
 * @param pref 设置中的语言偏好
 * @returns 解析后的语言代码
 */
export function resolveLocale(pref) {
	if (SUPPORTED_LOCALES.includes(pref)) return pref;
	return browser ? getLocaleFromNavigator() ?? 'zh-CN' : 'zh-CN';
}

/* ---------- 与设置同步（仅浏览器环境） ---------- */
if (browser) {
	// 先用当前设置确定初始语言，设置一旦加载/变更即切换到正确语言
	locale.set(resolveLocale(get(settings).locale));
	settings.subscribe(($settings) => {
		locale.set(resolveLocale($settings.locale));
	});
}
