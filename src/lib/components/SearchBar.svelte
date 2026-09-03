<script>
	import { SEARCH_ENGINES } from '$lib/config';
	import { buildSearchUrl } from '$lib/search';
	import { settings } from '$lib/stores';

	let query = '';

	function onSearch(event) {
		event.preventDefault();
		const q = query.trim();
		if (!q) return;
		window.location.href = buildSearchUrl(q, $settings.searchEngine);
	}

	function pickEngine(value) {
		if (value !== $settings.searchEngine) {
			settings.save({ searchEngine: value });
		}
		document.activeElement?.blur?.();
	}
</script>

<form
	onsubmit={onSearch}
	class="search-section w-full max-w-[600px] mb-14 animate-[slide-in_0.3s_ease-out]"
>
	<div
		class="flex items-center gap-2 glass rounded-full p-2 border border-white/20 transition-all duration-300 focus-within:border-white/40 focus-within:bg-black/40 focus-within:shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
	>
		<input
			bind:value={query}
			type="text"
			placeholder="搜索或输入网址..."
			autocomplete="off"
			aria-label="搜索输入框"
			class="flex-1 bg-transparent outline-none px-5 py-3 text-base text-white placeholder:text-white/60 select-text"
		/>

		<!-- 引擎切换 -->
		<div class="dropdown dropdown-end">
			<button
				type="button"
				tabindex="0"
				class="flex items-center gap-1 glass text-white text-sm px-3 py-2 rounded-full border border-transparent hover:border-white/30 hover:bg-white/10 cursor-pointer focus:outline-2 focus:outline-[#399fff]"
				aria-label="选择搜索引擎"
			>
				<span>{SEARCH_ENGINES[$settings.searchEngine]?.name ?? '搜索'}</span>
				<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<polyline points="6 9 1 4 11 4"></polyline>
				</svg>
			</button>
			<ul
				tabindex="0"
				class="dropdown-content z-30 mt-2 menu w-32 glass-strong rounded-lg border border-white/10 p-1 shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
			>
				{#each Object.entries(SEARCH_ENGINES) as [value, def] (value)}
					<li>
						<button
							type="button"
							class="rounded-md px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white
								{$settings.searchEngine === value ? 'bg-[#399fff]/20 text-white font-medium' : ''}"
							onclick={() => pickEngine(value)}
						>
							{def.name}
						</button>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</form>
