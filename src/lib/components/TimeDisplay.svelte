<script>
	// 展示本地时间与当前语言的日期，每秒刷新。
	import { onDestroy, onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { locale } from 'svelte-i18n';


	let time = '';
	let date = '';
	let timer;
	let unsub;

	function update() {
		const now = new Date();
		const hh = String(now.getHours()).padStart(2, '0');
		const mm = String(now.getMinutes()).padStart(2, '0');
		time = `${hh}:${mm}`;

		// 日期交给浏览器国际化格式器，避免硬编码中文日期和星期。
		date = now.toLocaleDateString(get(locale) === 'en-US' ? 'en-US' : 'zh-CN', {
			weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
		});
	}

	onMount(() => {
		update();
		timer = setInterval(update, 1000);
		// 语言切换时按新语言重算日期
		unsub = locale.subscribe(update);
	});
	onDestroy(() => {
		clearInterval(timer);
		unsub?.();
	});
</script>

<div class="text-center mb-14 animate-[fade_0.5s_ease-in-out]">
	<div class="font-medium text-[64px] lg:text-[96px] leading-none tracking-tight mb-2 text-white drop-shadow-lg">
		{time}
	</div>
	<div class="font-light text-lg lg:text-2xl text-white/90 drop-shadow">
		{date}
	</div>
</div>
