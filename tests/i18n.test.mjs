import assert from 'node:assert/strict';
import test from 'node:test';
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parse } from 'svelte/compiler';
import { _, addMessages, init, locale } from 'svelte-i18n';
import { EXTENSION_LOCALES, validateExtensionLocales } from '../scripts/extension-locales.mjs';
import { environment, get } from './helpers.mjs';

const dictionaries = Object.fromEntries(Object.values(EXTENSION_LOCALES).map((code) => [
	code, JSON.parse(readFileSync(`src/lib/i18n/locales/${code}.json`, 'utf8'))
]));
for (const [code, messages] of Object.entries(dictionaries)) addMessages(code, messages);
await init({ initialLocale: 'zh-CN', fallbackLocale: 'zh-CN' });

function flatten(object, prefix = '') {
	return Object.fromEntries(Object.entries(object).flatMap(([key, value]) => {
		const path = prefix ? `${prefix}.${key}` : key;
		return typeof value === 'object' && value !== null ? Object.entries(flatten(value, path)) : [[path, value]];
	}));
}
const catalogs = Object.fromEntries(Object.entries(dictionaries).map(([code, value]) => [code, flatten(value)]));

function walk(node, visit, inAttribute = false) {
	if (!node || typeof node !== 'object') return;
	if (node.type) visit(node, inAttribute);
	for (const value of Object.values(node)) {
		const attribute = inAttribute || node.type === 'Attribute';
		if (Array.isArray(value)) value.forEach((child) => walk(child, visit, attribute));
		else walk(value, visit, attribute);
	}
}

test('中英文翻译键、插值参数一致，所有文案均可通过实际翻译器格式化', () => {
	assert.deepEqual(Object.keys(catalogs['zh-CN']).sort(), Object.keys(catalogs['en-US']).sort());
	for (const [code, catalog] of Object.entries(catalogs)) {
		locale.set(code);
		for (const [key, message] of Object.entries(catalog)) {
			assert.equal(typeof message, 'string', `${code}: ${key}`);
			assert.ok(message.trim(), `${code}: ${key} 不能为空`);
			const parameters = (text) => [...text.matchAll(/\{(\w+)\}/g)].map((match) => match[1]).sort();
			assert.deepEqual(parameters(message), parameters(catalogs['zh-CN'][key]), `${code}: ${key} 参数不一致`);
			const values = Object.fromEntries(parameters(message).map((name) => [name, `test_${name}`]));
			const translated = get(_)(key, { values });
			assert.notEqual(translated, key);
			for (const value of Object.values(values)) assert.ok(translated.includes(value), `${code}: ${key} 插值丢失`);
		}
	}
});

test('组件文案及可访问性属性无硬编码，直接与动态引用的翻译键均存在', () => {
	const catalog = catalogs['zh-CN'];
	const brands = new Set(['TSTab', 'Kévin JINER', 'Snow']);
	for (const file of readdirSync('src', { recursive: true }).filter((file) => file.endsWith('.svelte'))) {
		const ast = parse(readFileSync(join('src', file), 'utf8'), { modern: true });
		walk(ast, (node, inAttribute) => {
			if (node.type === 'Text' && !inAttribute && /\p{L}/u.test(node.data)) {
				assert.ok(brands.has(node.data.trim()), `${file}: 未翻译文本 ${node.data.trim()}`);
			}
			if (node.type === 'Attribute' && ['title', 'aria-label', 'placeholder', 'alt'].includes(node.name)) {
				for (const part of Array.isArray(node.value) ? node.value : [node.value]) {
					if (part?.type === 'Text') assert.equal(part.data.trim(), '', `${file}: 未翻译属性 ${node.name}`);
				}
			}
			if (node.type === 'CallExpression' && node.callee.name === '$_' && node.arguments[0]?.type === 'Literal') {
				assert.ok(Object.hasOwn(catalog, node.arguments[0].value), `${file}: 缺少 ${node.arguments[0].value}`);
			}
			// 同时检查脚本中保存的 popup 提示键、条件翻译键等延迟翻译引用。
			if (node.type === 'Literal' && typeof node.value === 'string' && /^(engine|search|langs|quote|qaDock|newtab|common|settings|msg|popup)\..+/.test(node.value) && !node.value.endsWith('.')) {
				assert.ok(Object.hasOwn(catalog, node.value), `${file}: 缺少 ${node.value}`);
			}
		});
	}
	const context = environment().context();
	const engines = context.load('src/lib/config.ts').SEARCH_ENGINES;
	const supported = context.load('src/lib/i18n/index.js').SUPPORTED_LOCALES;
	assert.deepEqual([...supported].sort(), Object.values(EXTENSION_LOCALES).sort());
	for (const key of Object.keys(engines)) assert.ok(catalog[`engine.${key}`]);
	for (const code of supported) assert.ok(catalog[`langs.${code}`]);
	for (const group of context.load('src/lib/licenses.ts').LICENSE_GROUPS) for (const entry of group) {
		if (entry.noticeKey) assert.ok(catalog[`settings.licenseNotice.${entry.noticeKey}`]);
		if (entry.licenseKey) assert.ok(catalog[`settings.licenseLabel.${entry.licenseKey}`]);
	}
});

test('商店识别到简体中文与英文，工具栏标题与界面文案一致', () => {
	assert.deepEqual(validateExtensionLocales('static'), ['en', 'zh_CN']);
	for (const [nativeCode, uiCode] of Object.entries(EXTENSION_LOCALES)) {
		const messages = JSON.parse(readFileSync(`static/_locales/${nativeCode}/messages.json`, 'utf8'));
		assert.deepEqual(Object.keys(messages).sort(), ['actionTitle', 'extensionDescription', 'extensionName']);
		assert.equal(messages.actionTitle.message, dictionaries[uiCode].popup.title);
	}
});

test('构建语言检查拒绝缺少中文声明、消息引用及超长描述的包', () => {
	const mutations = [
		(directory) => { const file = join(directory, 'manifest.json'); const data = JSON.parse(readFileSync(file)); delete data.default_locale; writeFileSync(file, JSON.stringify(data)); },
		(directory) => { const file = join(directory, 'manifest.json'); const data = JSON.parse(readFileSync(file)); data.name = 'TSTab'; writeFileSync(file, JSON.stringify(data)); },
		(directory) => rmSync(join(directory, '_locales/zh_CN'), { recursive: true }),
		(directory) => { const file = join(directory, '_locales/en/messages.json'); const data = JSON.parse(readFileSync(file)); delete data.extensionDescription; writeFileSync(file, JSON.stringify(data)); },
		(directory) => { const file = join(directory, '_locales/en/messages.json'); const data = JSON.parse(readFileSync(file)); data.extensionDescription.message = 'x'.repeat(133); writeFileSync(file, JSON.stringify(data)); }
	];
	for (const mutate of mutations) {
		const directory = mkdtempSync(join(tmpdir(), 'tstab-i18n-'));
		try {
			cpSync('static/manifest.json', join(directory, 'manifest.json'));
			cpSync('static/_locales', join(directory, '_locales'), { recursive: true });
			mutate(directory);
			assert.throws(() => validateExtensionLocales(directory));
		} finally { rmSync(directory, { recursive: true, force: true }); }
	}
});

test('导出日期使用当前界面语言，标准时间仍可跨语言恢复', async () => {
	const context = environment().context();
	for (const code of ['en-US', 'zh-CN']) {
		locale.set(code);
		const backup = await context.stores.exportBackup();
		assert.equal(backup.exportDate, new Date(backup.exportTime).toLocaleString(code));
		await context.stores.importBackup(backup);
	}
});

test('切换界面语言保留一言正文、作者与出处原文', async () => {
	const text = '今天也是美好的一天。', author = '原作者', source = '原作品';
	const slot = { data: { hitokoto: text, from: source, from_who: author }, timestamp: Date.now(), shownAt: Date.now() };
	const context = environment({ quoteCache: { initialized: true, active: 0, revision: 'test', slots: [slot, { data: null, timestamp: 0 }] } }).context();
	await context.stores.quote.load();
	for (const code of ['en-US', 'zh-CN']) {
		locale.set(code);
		assert.equal(get(context.stores.quote).text, text);
		assert.equal(get(context.stores.quote).source, `—— ${author}《${source}》`);
	}
});
