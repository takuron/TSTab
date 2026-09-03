<script>
	import { onDestroy, onMount } from 'svelte';

	const WEEKDAYS = ['星期日', '星期一', '星期二', '星期三', '星期四', '星期五', '星期六'];
	let time = '';
	let date = '';
	let timer;

	function update() {
		const now = new Date();
		const hh = String(now.getHours()).padStart(2, '0');
		const mm = String(now.getMinutes()).padStart(2, '0');
		time = `${hh}:${mm}`;
		date = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日 ${WEEKDAYS[now.getDay()]}`;
	}

	onMount(() => {
		update();
		timer = setInterval(update, 1000);
	});
	onDestroy(() => clearInterval(timer));
</script>

<div class="text-center mb-14 animate-[fade_0.5s_ease-in-out]">
	<div class="font-medium text-[64px] lg:text-[96px] leading-none tracking-tight mb-2 text-white drop-shadow-lg">
		{time}
	</div>
	<div class="font-light text-lg lg:text-2xl text-white/90 drop-shadow">
		{date}
	</div>
</div>
