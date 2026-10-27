import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

/** 扩展原生语言代码与界面语言代码的对应关系。 */
export const EXTENSION_LOCALES = { zh_CN: 'zh-CN', en: 'en-US' };

/**
 * 校验扩展原生语言声明和消息，防止生成商店无法识别中文的扩展包。
 * @param directory 包含 manifest.json 和 _locales 的静态目录或构建目录
 * @returns 校验通过的原生语言代码
 */
export function validateExtensionLocales(directory) {
	const manifest = JSON.parse(readFileSync(join(directory, 'manifest.json'), 'utf8'));
	const locales = readdirSync(join(directory, '_locales')).sort();
	if (manifest.default_locale !== 'zh_CN' || JSON.stringify(locales) !== JSON.stringify(Object.keys(EXTENSION_LOCALES).sort())) {
		throw new Error('扩展必须声明 zh_CN 默认语言，并包含 zh_CN 和 en 原生语言包。');
	}
	const references = [manifest.name, manifest.description, manifest.action?.default_title];
	for (const code of locales) {
		const messages = JSON.parse(readFileSync(join(directory, '_locales', code, 'messages.json'), 'utf8'));
		for (const reference of references) {
			const key = /^__MSG_(\w+)__$/.exec(reference ?? '')?.[1];
			if (!key || typeof messages[key]?.message !== 'string' || !messages[key].message.trim()) {
				throw new Error(`原生语言 ${code} 缺少清单消息：${reference}`);
			}
		}
		// 浏览器扩展 description 最多允许 132 个字符。
		const descriptionKey = /^__MSG_(\w+)__$/.exec(manifest.description)[1];
		if (messages[descriptionKey].message.length > 132) throw new Error(`原生语言 ${code} 的扩展描述超过 132 字符。`);
	}
	return locales;
}
