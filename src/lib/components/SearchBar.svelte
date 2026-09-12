<script>
	// 搜索输入与原生可键盘操作的引擎选择器。
	import { _ } from 'svelte-i18n';
	import { persistedControl } from '$lib/controls';
	import { SEARCH_ENGINES } from '$lib/config';
	import { buildSearchUrl } from '$lib/search';
	import { runAction, settings } from '$lib/stores';

	let query = '';

	function onSearch(event) {
		event.preventDefault();
		const q = query.trim();
		if (!q) return;
		window.location.href = buildSearchUrl(q, $settings.searchEngine);
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

		<select aria-label={$_('search.engineAria')} use:persistedControl={{ value: $settings.searchEngine }} value={$settings.searchEngine}
			class="select select-sm w-auto bg-black/60 text-white border-white/20 rounded-full"
			onchange={(e) => { const value = e.currentTarget.value; runAction(() => settings.save({ searchEngine: value })); }}>
			{#each Object.keys(SEARCH_ENGINES) as value}
				<option value={value}>{$_('engine.' + value)}</option>
			{/each}
		</select>
	</div>
</form>
