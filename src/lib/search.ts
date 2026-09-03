import { SEARCH_ENGINES } from './config';

const URL_PATTERN =
	/^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/i;

/**
 * 判断是否为 URL，若是则返回规范化的地址，否则返回 null。
 */
export function normalizeUrlOrNull(query: string): string | null {
	if (URL_PATTERN.test(query)) {
		return query.startsWith('http') ? query : `https://${query}`;
	}
	return null;
}

/**
 * 处理搜索：如果是网址直接跳转，否则使用指定搜索引擎搜索。
 * 返回要跳转的地址。
 */
export function buildSearchUrl(query: string, engine: string): string {
	const direct = normalizeUrlOrNull(query);
	if (direct) return direct;
	const base = SEARCH_ENGINES[engine]?.url ?? SEARCH_ENGINES.baidu.url;
	return base + encodeURIComponent(query);
}
