<script>
	import { quote } from '$lib/stores';
</script>

<div class="text-center max-w-[800px] mb-10 px-6 animate-[fade_0.5s_ease-in-out]">
	{#if $quote.loading}
		<p class="text-lg lg:text-xl font-light italic text-white/70">加载中...</p>
	{:else}
		<p class="text-xl lg:text-2xl font-light italic leading-relaxed text-white drop-shadow mb-3">
			“{$quote.text}”
		</p>
		{#if $quote.source}
			<p class="text-base font-light text-white/80 drop-shadow">{$quote.source}</p>
		{/if}
	{/if}
</div>
