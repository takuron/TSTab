<script>
	import { quickAccess, settings } from '$lib/stores';
</script>

{#if $quickAccess.length > 0}
	<nav
		aria-label="快捷访问"
		class="fixed left-1/2 -translate-x-1/2 z-40 flex items-end gap-3 px-5 py-3 glass rounded-[25px] border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.3)]
		{$settings.quickAccessPosition === 'top'
			? 'top-5 animate-[slide-down_0.4s_ease-out]'
			: 'bottom-5 animate-[slide-up_0.4s_ease-out]'}"
	>
		{#each $quickAccess as item (item.url)}
			<a
				href={item.url}
				rel="noopener noreferrer"
				class="group relative flex flex-col items-center no-underline"
			>
				<!-- 悬停提示 -->
				<span
					class="pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-black/80 text-white text-xs whitespace-nowrap opacity-0 transition-all duration-150 group-hover:opacity-100 group-hover:-translate-y-1"
				>
					{item.title}
				</span>

				<div
					class="relative w-12 h-12 rounded-lg bg-white/90 flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.2)] overflow-hidden
					transition-transform duration-300 ease-[cubic-bezier(0.34,1.56,0.64,1)] group-hover:-translate-y-2 group-hover:scale-110 group-hover:shadow-[0_8px_24px_rgba(0,0,0,0.3)] group-active:-translate-y-1.5"
				>
					<span class="flex items-center justify-center text-[#666]" aria-hidden="true">
						<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
							<circle cx="12" cy="12" r="10"></circle>
							<line x1="2" y1="12" x2="22" y2="12"></line>
							<path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
						</svg>
					</span>
					{#if item.icon}
						<img
							src={item.icon}
							alt={item.title}
							class="absolute inset-0 m-auto w-8 h-8 object-contain"
							onerror={(e) => e.currentTarget.remove()}
						/>
					{/if}
				</div>
			</a>
		{/each}
	</nav>
{/if}
