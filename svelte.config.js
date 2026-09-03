import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	preprocess: vitePreprocess(),

	kit: {
		// Chrome 扩展禁止 '_' 开头的文件/目录名（系统保留），故产物目录不能用默认的 "_app"
		appDir: 'app',
		adapter: adapter({
			pages: 'build',
			assets: 'build',
			fallback: null,
			precompress: false,
			strict: true
		}),
		prerender: {
			entries: ['/newtab', '/popup']
		},
		paths: {
			relative: false
		}
	}
};

export default config;
