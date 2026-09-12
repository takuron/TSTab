import { SEARCH_ENGINES } from './config';

/**
 * 校验显式网页地址，只允许 HTTP(S)，拒绝控制字符和内嵌凭据。
 * @param value 待校验的地址
 * @returns 规范化地址；无效时返回 null
 */
export function webUrlOrNull(value: unknown): string | null {
	if (typeof value !== 'string' || value.length > 8192 || /[\s\u0000-\u001f\u007f]/u.test(value)) return null;
	try {
		const url = new URL(value);
		return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password
			? url.href : null;
	} catch {
		return null;
	}
}

/**
 * 判断搜索输入是否为网址；支持端口、参数、国际化域名和本地地址。
 * @param query 用户输入
 * @returns 规范化后的 HTTP(S) 地址；普通搜索词返回 null
 */
export function normalizeUrlOrNull(query: string): string | null {
	const input = query.trim();
	if (/^https?:\/\//i.test(input)) return webUrlOrNull(input);
	const normalized = webUrlOrNull(`https://${input}`);
	if (!normalized) return null;
	const { hostname } = new URL(normalized);
	// 无协议的单词继续搜索，避免把普通关键词当作内网站点。
	return hostname === 'localhost' || hostname.includes('.') || hostname.startsWith('[')
		? normalized : null;
}

/**
 * 识别网址直达，否则构造选定引擎的搜索地址。
 * @param query 用户输入
 * @param engine 搜索引擎标识
 * @returns 跳转地址
 */
export function buildSearchUrl(query: string, engine: string): string {
	const engines = SEARCH_ENGINES as Record<string, { name: string; url: string }>;
	return normalizeUrlOrNull(query) ??
		(engines[engine]?.url ?? SEARCH_ENGINES.baidu.url) + encodeURIComponent(query);
}
