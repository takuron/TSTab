<script>
	import { _ } from 'svelte-i18n';
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
	class="search-section relative z-50 w-full max-w-[600px] mb-14 animate-[slide-in_0.3s_ease-out]"
>
	<div
		class="flex items-center gap-2 glass rounded-full p-2 border border-white/20 transition-all duration-300 focus-within:border-white/40 focus-within:bg-black/40 focus-within:shadow-[0_4px_16px_rgba(0,0,0,0.2)]"
	>
		<input
			bind:value={query}
			type="text"
			placeholder={$_('search.placeholder')}
			autocomplete="off"
			aria-label={$_('search.inputAria')}
			class="flex-1 bg-transparent outline-none px-5 py-3 text-base text-white placeholder:text-white/60 select-text"
		/>

		<!-- 引擎切换 -->
		<div class="dropdown dropdown-end">
			<button
				type="button"
				tabindex="0"
				class="flex items-center gap-1 glass text-white text-sm px-3 py-2 rounded-full border border-transparent hover:border-white/30 hover:bg-white/10 cursor-pointer focus:outline-2 focus:outline-[#399fff]"
				aria-label={$_('search.engineAria')}
			>
				<span>{$_('engine.' + $settings.searchEngine)}</span>
				<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
					<polyline points="6 9 1 4 11 4"></polyline>
				</svg>
			</button>
			<ul
				tabindex="0"
				class="dropdown-content z-[999] mt-2 menu w-32 bg-black/75 backdrop-blur-lg rounded-lg border border-white/15 p-1 shadow-[0_4px_16px_rgba(0,0,0,0.3)]"
			>
				{#each Object.entries(SEARCH_ENGINES) as [value, def] (value)}
					<li>
						<button
							type="button"
							class="rounded-md px-3 py-2 text-sm text-white/80 hover:bg-white/10 hover:text-white
								{$settings.searchEngine === value ? 'bg-[#399fff]/20 text-white font-medium' : ''}"
							onclick={() => pickEngine(value)}
						>
							{$_('engine.' + value)}
						</button>
					</li>
				{/each}
			</ul>
		</div>
	</div>
</form>
