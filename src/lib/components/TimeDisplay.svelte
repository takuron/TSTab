<script>
	import { onDestroy, onMount } from 'svelte';
	import { get } from 'svelte/store';
	import { locale } from 'svelte-i18n';

	// 中文星期名（仅当语言为 zh-CN 时使用）
	const ZH_WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];

	let time = '';
	let date = '';
	let timer;
	let unsub;

	function update() {
		const now = new Date();
		const hh = String(now.getHours()).padStart(2, '0');
		const mm = String(now.getMinutes()).padStart(2, '0');
		time = `${hh}:${mm}`;

		// 按当前语言格式化日期：英文用 Intl，中文保持“年月日 星期X”格式
		if (get(locale) === 'en-US') {
			date = now.toLocaleDateString('en-US', {
				weekday: 'long',
				year: 'numeric',
				month: 'long',
				day: 'numeric'
			});
		} else {
			date = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${
				ZH_WEEKDAYS[now.getDay()]
			}`;
		}
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
