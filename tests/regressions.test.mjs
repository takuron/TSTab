import assert from 'node:assert/strict';
import test from 'node:test';
import { performance } from 'node:perf_hooks';
import { readFileSync } from 'node:fs';
import { environment, item, cache, get } from './helpers.mjs';
import { _, addMessages, init, locale } from 'svelte-i18n';

for (const code of ['zh-CN', 'en-US']) addMessages(code, JSON.parse(readFileSync(`src/lib/i18n/locales/${code}.json`)));
await init({ initialLocale: 'zh-CN', fallbackLocale: 'zh-CN' });

test('长路径及查询参数不触发回溯，端口与大写协议正确识别', () => {
	const { normalizeUrlOrNull, buildSearchUrl } = environment().context().load('src/lib/search.ts');
	const input = 'https://example.com/' + 'a'.repeat(4000) + '?q=1';
	const start = performance.now();
	assert.equal(normalizeUrlOrNull(input), input);
	assert.ok(performance.now() - start < 100);
	assert.equal(normalizeUrlOrNull('HTTPS://example.com:8080/?q=test'), 'https://example.com:8080/?q=test');
	assert.equal(normalizeUrlOrNull('localhost:3000/a'), 'https://localhost:3000/a');
	assert.equal(normalizeUrlOrNull('example.com/a?x=1#tag'), 'https://example.com/a?x=1#tag');
	for (const value of ['hello world', 'javascript:alert(1)', 'data:text/html,test', 'https://user:pass@example.com']) assert.equal(normalizeUrlOrNull(value), null);
	assert.match(buildSearchUrl('中文 搜索', 'google'), /q=%E4%B8%AD/);
});

test('独立页面同时修改不同设置不会回滚彼此的字段', async () => {
	const env = environment(), a = env.context(), b = env.context();
	await Promise.all([a.stores.settings.load(), b.stores.settings.load()]);
	await Promise.all([a.stores.settings.save({ locale: 'en-US' }), b.stores.settings.save({ searchEngine: 'google' })]);
	assert.equal(env.db.locale, 'en-US'); assert.equal(env.db.searchEngine, 'google');
});

test('并发添加保留两项，按 ID 删除不会误删其他页面刚排序的条目', async () => {
	const env = environment(), a = env.context(), b = env.context();
	await Promise.all([a.stores.quickAccess.load(), b.stores.quickAccess.load()]);
	await Promise.all([a.stores.quickAccess.add(item('a')), b.stores.quickAccess.add(item('b'))]);
	assert.equal(env.db.quickAccess.length, 2);
	await a.stores.quickAccess.load();
	const [first, second] = get(a.stores.quickAccess);
	await b.stores.quickAccess.reorder(first.id, second.id);
	await a.stores.quickAccess.remove(first.id);
	assert.equal(env.db.quickAccess[0].id, second.id);
});

test('存储变更同步到其他页面，卸载后可清理监听', async () => {
	const env = environment(), a = env.context(), b = env.context();
	await Promise.all([a.stores.settings.load(), b.stores.settings.load()]);
	const stop = b.stores.startStorageSync();
	await a.stores.settings.save({ locale: 'en-US' });
	await a.stores.quickAccess.add(item('a')); await env.drain();
	assert.equal(get(b.stores.settings).locale, 'en-US'); assert.equal(get(b.stores.quickAccess).length, 1);
	stop();
});

test('存储配额错误：设置保存保持乐观界面，列表增删仍拒绝并保留原数据', async () => {
	const env = environment(), a = env.context();
	await a.stores.settings.load(); await a.stores.quickAccess.load();
	env.failWrite = true;
	await a.stores.settings.save({ locale: 'en-US' });
	await assert.rejects(a.stores.quickAccess.add(item('a')), /QUOTA/);
	assert.equal(get(a.stores.settings).locale, 'en-US'); assert.equal(env.db.locale, 'browser');
	assert.equal(get(a.stores.quickAccess).length, 0);
});

test('坏备份、未知字段与非法协议均在写入前拒绝', async () => {
	const env = environment(), a = env.context(); await a.stores.settings.load();
	const before = JSON.stringify(env.db);
	for (const backup of [
		{ config: { locale: 'en-US' } }, { version: '2.0', config: { locale: 'en-US' } },
		{ version: '1.0', config: [] }, { version: '1.0', config: { quickAccess: [null] } },
		{ version: '1.0', config: { quoteTypes: 'bad' } }, { version: '1.0', config: { unknown: true } },
		{ version: '1.0', config: { quickAccess: [{ ...item('a'), url: 'javascript:alert(1)' }] } },
		{ version: '1.0', config: { quoteCache: { ...cache(), active: 4 } } }
	]) await assert.rejects(a.stores.importBackup(backup));
	assert.equal(JSON.stringify(env.db), before);
});

test('旧备份可迁移稳定 ID，并可导出后恢复；失败导入不改变原数据', async () => {
	const env = environment(), a = env.context();
	await a.stores.importBackup({ version: '1.0', config: { quickAccess: [item('a')], locale: 'en-US' } });
	const id = env.db.quickAccess[0].id;
	const backup = await a.stores.exportBackup();
	await a.stores.importBackup(backup); assert.equal(env.db.quickAccess[0].id, id);
	const before = JSON.stringify(env.db); env.failWrite = true;
	await assert.rejects(a.stores.importBackup({ version: '1.0', config: { locale: 'zh-CN' } }));
	assert.equal(JSON.stringify(env.db), before);
});

test('编辑不能制造重复网址；重复 URL 书签仍保留不同 ID', async () => {
	const env = environment({}, { bookmarks: [{ id: '1', title: 'Folder', children: [
		{ id: '2', title: 'A', url: 'https://a.example/' }, { id: '3', title: 'B', url: 'https://a.example/' },
		{ id: '4', title: 'Script', url: 'javascript:alert(1)' }
	] }] });
	const a = env.context(); await a.stores.quickAccess.add(item('a')); await a.stores.quickAccess.add(item('b'));
	assert.equal(await a.stores.quickAccess.updateItem(env.db.quickAccess[1].id, { title: 'B', url: 'https://a.example/' }), false);
	await a.stores.bookmarkDock.load('1');
	const bookmarks = get(a.stores.bookmarkDock).items;
	assert.equal(bookmarks.length, 2); assert.notEqual(bookmarks[0].id, bookmarks[1].id);
});

test('离线刷新先保存使用位，再次打开仍展示已切换内容', async () => {
	const env = environment({ quoteCache: cache() }), a = env.context();
	await a.stores.quote.refresh(); await env.drain();
	assert.equal(get(a.stores.quote).text, 'B'); assert.equal(env.db.quoteCache.active, 1);
	await env.context().stores.quote.load(); await env.drain(); assert.equal(env.db.quoteCache.active, 1);
});

test('重复刷新合并网络请求，清空后旧响应不能重新写回缓存', async () => {
	let release; const response = new Promise((resolve) => { release = resolve; }); let requests = 0;
	const env = environment({ quoteCache: cache() }, { fetch: async () => { requests++; return response; } });
	const a = env.context(), b = env.context();
	await a.stores.quote.refresh(); await b.stores.quote.refresh();
	assert.equal(requests, 1);
	await a.stores.quote.clearCache(); const revision = env.db.quoteCache.revision;
	release({ ok: true, json: async () => ({ hitokoto: 'Late' }) }); await env.drain();
	assert.equal(env.db.quoteCache.revision, revision); assert.equal(env.db.quoteCache.initialized, false);
});

test('网络响应等待期间导入配置，旧请求不能覆盖导入缓存', async () => {
	let release; const response = new Promise((resolve) => { release = resolve; });
	const env = environment({ quoteCache: cache() }, { fetch: async () => response }), a = env.context();
	await a.stores.quote.refresh();
	const imported = cache(); imported.slots[0].data.hitokoto = 'Imported';
	await a.stores.importBackup({ version: '1.0', config: { quoteCache: imported } });
	release({ ok: true, json: async () => ({ hitokoto: 'Late' }) }); await env.drain();
	assert.equal(env.db.quoteCache.slots[0].data.hitokoto, 'Imported'); assert.equal(env.db.quoteCache.active, 0);
});

test('请求超时释放网络锁，离线状态仍保留', async () => {
	let aborted = false;
	const env = environment({ quoteCache: cache() }, {
		setTimeout: (fn) => setTimeout(fn, 10),
		fetch: (_, { signal }) => new Promise((_, reject) => signal.addEventListener('abort', () => { aborted = true; reject(new Error('aborted')); }))
	});
	await env.context().stores.quote.refresh(); await env.drain();
	assert.equal(aborted, true); assert.equal(env.db.quoteCache.active, 1);
});

test('一言缺省文案随语言更新，日期插值正确，两套语言键完全一致', () => {
	const a = environment().context(); const unsubscribe = a.stores.quote.subscribe(() => {});
	locale.set('en-US'); assert.match(get(a.stores.quote).text, /heroism/);
	assert.match(get(_)('msg.importConfirmWithDate', { values: { time: '2026-09-12' } }), /2026-09-12/);
	locale.set('zh-CN'); assert.match(get(a.stores.quote).text, /英雄/); unsubscribe();
	const keys = (object, prefix = '') => Object.entries(object).flatMap(([key, value]) => typeof value === 'object' ? keys(value, prefix + key + '.') : [prefix + key]).sort();
	assert.deepEqual(keys(JSON.parse(readFileSync('src/lib/i18n/locales/en-US.json'))), keys(JSON.parse(readFileSync('src/lib/i18n/locales/zh-CN.json'))));
});


test('浏览器英文地区变体归一化，固定语言不受浏览器设置影响', () => {
	for (const [language, expected] of [['en', 'en-US'], ['en-GB', 'en-US'], ['en-AU', 'en-US'], ['zh-TW', 'zh-CN'], ['fr-FR', 'zh-CN']]) {
		const resolve = environment({}, { language }).context().load('src/lib/i18n/index.js').resolveLocale;
		assert.equal(resolve('browser'), expected);
		assert.equal(resolve('zh-CN'), 'zh-CN');
		assert.equal(resolve('en-US'), 'en-US');
	}
});
