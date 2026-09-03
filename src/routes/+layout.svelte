<script>
	import '../app.css';
	import '$lib/i18n';
	import { browser } from '$app/environment';
	import { locale } from 'svelte-i18n';

	// 同步 svelte-i18n 的 locale 到 <html lang>，便于无障碍与搜索引擎识别
	locale.subscribe(($locale) => {
		if (browser && $locale) document.documentElement.lang = $locale;
	});
</script>

<slot />
