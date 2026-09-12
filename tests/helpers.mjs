import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { createContext, runInContext } from 'node:vm';
import { webcrypto } from 'node:crypto';
import ts from 'typescript';
import * as svelteStore from 'svelte/store';
import * as i18n from 'svelte-i18n';

// 同一测试的独立页面共享锁与存储；每个页面拥有独立模块缓存和 store。
class Locks {
	queues = new Map();
	request(name, options, callback) {
		if (typeof options === 'function') { callback = options; options = {}; }
		if (options.ifAvailable && this.queues.has(name)) return Promise.resolve(callback(null));
		const previous = this.queues.get(name) ?? Promise.resolve();
		const task = previous.catch(() => {}).then(() => callback({ name }));
		this.queues.set(name, task);
		return task.finally(() => { if (this.queues.get(name) === task) this.queues.delete(name); });
	}
}

export function environment(initial = {}, options = {}) {
	const db = structuredClone(initial), listeners = new Set(), locks = new Locks();
	const env = { db, locks, failWrite: false, fetch: options.fetch ?? (async () => { throw new Error('Offline'); }) };
	env.context = () => {
		const chrome = { runtime: {}, storage: {
			local: {
				get(keys, done) { queueMicrotask(() => done(structuredClone(keys === null ? db : Object.fromEntries(keys.map((key) => [key, db[key]]))))); },
				set(items, done) { queueMicrotask(() => {
					if (env.failWrite) chrome.runtime.lastError = { message: 'QUOTA_BYTES exceeded' };
					else Object.assign(db, structuredClone(items));
					done(); delete chrome.runtime.lastError;
					if (!env.failWrite) listeners.forEach((fn) => fn(Object.fromEntries(Object.keys(items).map((key) => [key, {}])), 'local'));
				}); },
				remove(keys, done) { keys.forEach((key) => delete db[key]); done(); }
			},
			onChanged: { addListener(fn) { listeners.add(fn); }, removeListener(fn) { listeners.delete(fn); } }
		}, bookmarks: { getTree(done) { done(structuredClone(options.bookmarks ?? [])); } } };
		const context = createContext({ chrome, navigator: { locks }, crypto: webcrypto, URL, URLSearchParams,
			AbortController, setTimeout: options.setTimeout ?? setTimeout, clearTimeout, queueMicrotask,
			fetch: (...args) => env.fetch(...args), console: { error() {} } });
		const modules = new Map();
		function load(file) {
			const full = resolve(file);
			if (modules.has(full)) return modules.get(full).exports;
			const module = { exports: {} }; modules.set(full, module);
			const source = ts.transpileModule(readFileSync(full, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, esModuleInterop: true, target: ts.ScriptTarget.ES2022 } }).outputText;
			const require = (name) => {
				if (name === 'svelte/store') return svelteStore;
				if (name === 'svelte-i18n') return { ...i18n, getLocaleFromNavigator: () => options.language ?? 'en-US' };
				if (name === '$app/environment') return { browser: true };
				if (name === '$lib/stores') return load('src/lib/stores.ts');
				if (name.endsWith('.json')) return JSON.parse(readFileSync(resolve(dirname(full), name)));
				return load(resolve(dirname(full), name + '.ts'));
			};
			runInContext('(function(require,module,exports){' + source + '\n})', context)(require, module, module.exports);
			return module.exports;
		}
		return { stores: load('src/lib/stores.ts'), storage: load('src/lib/storage.ts').StorageManager, load };
	};
	env.drain = async () => {
		for (let i = 0; i < 10; i++) {
			await new Promise((resolve) => setImmediate(resolve));
			await Promise.allSettled([...locks.queues.values()]);
		}
	};
	return env;
}

export const item = (name) => ({ title: name, url: `https://${name}.example/`, icon: '', addedAt: 1 });
export const cache = () => ({ initialized: true, active: 0, revision: 'original', slots: [
	{ data: { hitokoto: 'A' }, timestamp: 1, shownAt: Date.now() },
	{ data: { hitokoto: 'B' }, timestamp: 1 }
] });
export const get = svelteStore.get;
