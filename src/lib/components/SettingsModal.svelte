<script>
	import { _ } from 'svelte-i18n';
	import { MAX_IMAGE_SIZE } from '$lib/config';
	import { SUPPORTED_LOCALES } from '$lib/i18n';
	import { LICENSE_GROUPS, PROJECT_URL } from '$lib/licenses';
	import { isExtension, StorageManager } from '$lib/storage';
	import { bookmarkDock, faviconUrl, quickAccess, quote, settings } from '$lib/stores';

	export let open = false;

	// 一言类型：value 为 hitokoto 的类型参数，key 指向对应翻译键
	const QUOTE_TYPES = [
		{ value: 'a', key: 'anim' },
		{ value: 'b', key: 'comic' },
		{ value: 'c', key: 'game' },
		{ value: 'd', key: 'literature' },
		{ value: 'i', key: 'poetry' }
	];

	let bgUrlInput = '';
	let fileInput;
	let importInput;
	let qaTitle = '';
	let qaUrl = '';
	let draggingIndex = null;
	let dragOverIndex = null;
	let editingIndex = null;
	let editTitle = '';
	let editUrl = '';
	let bookmarkFolders = [];

	// 打开设置面板且为书签模式时，加载书签文件夹列表供选择。
	$: if (open && $settings.quickAccessMode === 'bookmark') {
		loadBookmarkFolders();
	}

	async function loadBookmarkFolders() {
		bookmarkFolders = await bookmarkDock.listFolders();
	}

	async function handleBookmarkFolderChange(value) {
		await settings.save({ bookmarkFolderId: value || null });
	}

	async function setQaMode(mode) {
		// 切换到书签模式时若尚未选择文件夹，先加载列表供用户挑选。
		if (mode === 'bookmark' && !$settings.bookmarkFolderId) {
			await loadBookmarkFolders();
		}
		await settings.save({ quickAccessMode: mode });
	}

	function close() {
		open = false;
	}

	function alertMsg(msg) {
		window.alert(msg);
	}

	function setLocale(value) {
		settings.save({ locale: value });
	}

	/* ---------- 背景 ---------- */
	function setBgType(type) {
	// 默认图片模式需带上内置图片路径
	if (type === 'preset') {
		settings.save({ backgroundType: 'preset', backgroundImage: 'images/kevin-jiner-g-6gKgRC30k-unsplash.jpg' });
	} else {
			settings.save({ backgroundType: type });
		}
	}

	async function handleUrlApply() {
		const url = bgUrlInput.trim();
		if (!url) return alertMsg($_('msg.bgUrlEmpty'));
		try {
			new URL(url);
		} catch {
			return alertMsg($_('msg.bgUrlInvalid'));
		}
		const img = new Image();
		img.onload = async () => {
			await settings.save({ backgroundType: 'url', backgroundImage: url });
			alertMsg($_('msg.bgUrlDone'));
			bgUrlInput = '';
		};
		img.onerror = () => alertMsg($_('msg.bgUrlFailed'));
		img.src = url;
	}

	function handleFilePicked(event) {
		const file = event.target.files?.[0];
		if (!file) return;
		if (!file.type.startsWith('image/')) return alertMsg($_('msg.bgFileType'));
		if (file.size > MAX_IMAGE_SIZE) return alertMsg($_('msg.bgFileSize'));
		const reader = new FileReader();
		reader.onload = async (e) => {
			await settings.save({ backgroundType: 'local', backgroundImage: e.target.result });
			alertMsg($_('msg.bgLocalDone'));
			event.target.value = '';
		};
		reader.readAsDataURL(file);
	}

	/* ---------- 一言 ---------- */
	async function handleClearQuoteCache() {
		await quote.clearCache();
		alertMsg($_('msg.quoteCacheCleared'));
	}

	/* ---------- 快捷访问 ---------- */
	async function handleAddQa() {
		const title = qaTitle.trim();
		const url = qaUrl.trim();
		if (!title) return alertMsg($_('msg.qaNameEmpty'));
		if (!url) return alertMsg($_('msg.qaUrlEmpty'));
		try {
			new URL(url);
		} catch {
			return alertMsg($_('msg.qaUrlInvalid'));
		}
		const ok = await quickAccess.add({ title, url, icon: faviconUrl(url), addedAt: Date.now() });
		if (ok) {
			qaTitle = '';
			qaUrl = '';
		} else {
			alertMsg($_('msg.qaExists'));
		}
	}

	async function handleRemoveQa(index) {
		if (!window.confirm($_('msg.qaRemoveConfirm'))) return;
		await quickAccess.remove(index);
	}

	function startEdit(index) {
		editingIndex = index;
		editTitle = $quickAccess[index]?.title ?? '';
		editUrl = $quickAccess[index]?.url ?? '';
	}

	async function saveEdit(index) {
		if (!editTitle.trim()) return alertMsg($_('msg.qaNameEmpty'));
		if (!editUrl.trim()) return alertMsg($_('msg.qaUrlEmpty'));
		try {
			new URL(editUrl);
		} catch {
			return alertMsg($_('msg.qaUrlInvalid'));
		}
		await quickAccess.updateItem(index, { title: editTitle.trim(), url: editUrl.trim() });
		editingIndex = null;
	}

	async function handleDrop(toIndex) {
		if (draggingIndex !== null && draggingIndex !== toIndex) {
			await quickAccess.reorder(draggingIndex, toIndex);
		}
		draggingIndex = null;
		dragOverIndex = null;
	}

	/* ---------- 配置导出 / 导入 ---------- */
	async function handleExport() {
		const allConfig = await StorageManager.getAll();
		const exportData = {
			version: '1.0',
			exportTime: new Date().toISOString(),
			exportDate: new Date().toLocaleString('zh-CN'),
			config: allConfig
		};
		const blob = new Blob([JSON.stringify(exportData, null, 2)], {
			type: 'application/json'
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `newtab-config-${Date.now()}.json`;
		document.body.appendChild(a);
		a.click();
		document.body.removeChild(a);
		URL.revokeObjectURL(url);
		alertMsg($_('msg.exportDone'));
	}

	async function handleImport(event) {
		const file = event.target.files?.[0];
		if (!file) return;
		if (!file.name.endsWith('.json')) {
			event.target.value = '';
			return alertMsg($_('msg.importFileType'));
		}
		try {
			const text = await file.text();
			const data = JSON.parse(text);
			if (!data.config || typeof data.config !== 'object') {
				return alertMsg($_('msg.importInvalid'));
			}
			const confirmMsg = data.exportDate
				? $_('msg.importConfirmWithDate', { time: data.exportDate })
				: $_('msg.importConfirm');
			if (!window.confirm(confirmMsg)) {
				event.target.value = '';
				return;
			}
			await StorageManager.setMultiple(data.config);
			await settings.load();
			await quickAccess.load();
			alertMsg($_('msg.importDone'));
			close();
		} catch (err) {
			console.error('导入配置失败:', err);
			alertMsg($_('msg.importFailed'));
		}
		event.target.value = '';
	}
</script>

{#if open}
	<div
		class="fixed inset-0 z-[1000] flex items-center justify-center bg-black/50 backdrop-blur-xl p-4"
		onclick={(e) => (e.target === e.currentTarget ? close() : null)}
	>
		<div
			class="flex flex-col w-full max-w-[600px] max-h-[86vh] glass-strong rounded-xl border border-white/15 overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.4)] animate-[slide-in_0.3s_ease-out]"
			role="dialog"
			aria-modal="true"
			aria-label={$_('settings.dialogAria')}
		>
			<!-- 头部 -->
			<div class="flex items-center justify-between px-8 py-6 border-b border-white/10 bg-white/5 shrink-0">
				<h2 class="text-xl font-semibold text-white m-0">{$_('settings.title')}</h2>
				<button
					class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 hover:scale-110 flex items-center justify-center text-white transition cursor-pointer"
					aria-label={$_('settings.closeAria')}
					onclick={close}
				>
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
						<line x1="18" y1="6" x2="6" y2="18"></line>
						<line x1="6" y1="6" x2="18" y2="18"></line>
					</svg>
				</button>
			</div>

			<!-- 内容 -->
			<div class="flex-1 overflow-y-auto px-8 py-8">
				<!-- 搜索与语言（首个设置项） -->
				<section class="mb-8">
					<h3 class="text-lg font-semibold text-white mb-4 pb-3 border-b border-white/10">{$_('settings.searchLanguageTitle')}</h3>
					<div class="space-y-4">
						<div class="flex items-center justify-between">
							<span class="text-sm text-white/80">{$_('settings.searchEngineLabel')}</span>
							<select
								class="select select-sm select-bordered bg-black text-white"
								value={$settings.searchEngine}
								onchange={(e) => settings.save({ searchEngine: e.currentTarget.value })}
							>
								<option value="baidu">{$_('engine.baidu')}</option>
								<option value="google">{$_('engine.google')}</option>
								<option value="bing">{$_('engine.bing')}</option>
							</select>
						</div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-white/80">{$_('settings.language')}</span>
							<select
								class="select select-sm select-bordered bg-black text-white"
								value={$settings.locale ?? 'browser'}
								onchange={(e) => setLocale(e.currentTarget.value)}
							>
								<option value="browser">{$_('settings.languageBrowser')}</option>
								{#each SUPPORTED_LOCALES as code}
									<option value={code}>{$_('langs.' + code)}</option>
								{/each}
							</select>
						</div>
					</div>
				</section>

				<!-- 背景设置 -->
				<section class="mb-8">
					<h3 class="text-lg font-semibold text-white mb-4 pb-3 border-b border-white/10">{$_('settings.bgTitle')}</h3>

					<div class="mb-6">
						<span class="block text-sm text-white/80 mb-2">{$_('settings.bgType')}</span>
						<div class="flex flex-wrap gap-4">
							<label class="flex items-center cursor-pointer gap-2 text-sm text-white/80 hover:text-white">
								<input type="radio" class="radio radio-primary" name="bgtype" value="gradient" checked={$settings.backgroundType === 'gradient'} onchange={() => setBgType('gradient')} />
								{$_('settings.bgGradient')}
							</label>
							<label class="flex items-center cursor-pointer gap-2 text-sm text-white/80 hover:text-white">
								<input type="radio" class="radio radio-primary" name="bgtype" value="preset" checked={$settings.backgroundType === 'preset'} onchange={() => setBgType('preset')} />
								{$_('settings.bgPreset')}
							</label>
							<label class="flex items-center cursor-pointer gap-2 text-sm text-white/80 hover:text-white">
								<input type="radio" class="radio radio-primary" name="bgtype" value="local" checked={$settings.backgroundType === 'local'} onchange={() => setBgType('local')} />
								{$_('settings.bgLocal')}
							</label>
							<label class="flex items-center cursor-pointer gap-2 text-sm text-white/80 hover:text-white">
								<input type="radio" class="radio radio-primary" name="bgtype" value="url" checked={$settings.backgroundType === 'url'} onchange={() => setBgType('url')} />
								{$_('settings.bgUrl')}
							</label>
						</div>
					</div>

					{#if $settings.backgroundType === 'local'}
						<div class="mb-6">
							<span class="block text-sm text-white/80 mb-2">{$_('settings.bgUploadLocal')}</span>
							<button type="button" class="btn btn-sm bg-white/10 hover:bg-white/20 border border-white/20 text-white" onclick={() => fileInput?.click()}>{$_('settings.bgChooseFile')}</button>
							<input type="file" accept="image/*" bind:this={fileInput} class="hidden" onchange={handleFilePicked} />
							<p class="mt-1 text-xs text-white/60">{$_('settings.bgLocalHint')}</p>
						</div>
					{/if}

					{#if $settings.backgroundType === 'url'}
						<div class="mb-6">
							<span class="block text-sm text-white/80 mb-2">{$_('settings.bgUrlLabel')}</span>
							<input type="text" bind:value={bgUrlInput} placeholder="https://example.com/image.jpg" class="input w-full mb-2 bg-white/10 border-transparent text-white placeholder:text-white/50" />
							<button type="button" class="btn btn-sm bg-[#399fff]/30 hover:bg-[#399fff]/50 text-white" onclick={handleUrlApply}>{$_('common.apply')}</button>
							<p class="mt-1 text-xs text-white/60">{$_('settings.bgUrlHint')}</p>
						</div>
					{/if}
				</section>

				<!-- 快捷访问 -->
				<section class="mb-8">
					<h3 class="text-lg font-semibold text-white mb-4 pb-3 border-b border-white/10">{$_('settings.qaTitle')}</h3>

					<!-- 快捷访问数据来源：手动或书签文件夹 -->
					<div class="mb-6">
						<span class="block text-sm text-white/80 mb-2">{$_('settings.qaMode')}</span>
						<div class="flex flex-wrap gap-4">
							<label class="flex items-center cursor-pointer gap-2 text-sm text-white/80 hover:text-white">
								<input type="radio" class="radio radio-primary" name="qamode" value="manual" checked={$settings.quickAccessMode === 'manual'} onchange={() => setQaMode('manual')} />
								{$_('settings.qaModeManual')}
							</label>
							<label class="flex items-center cursor-pointer gap-2 text-sm text-white/80 hover:text-white">
								<input type="radio" class="radio radio-primary" name="qamode" value="bookmark" checked={$settings.quickAccessMode === 'bookmark'} onchange={() => setQaMode('bookmark')} />
								{$_('settings.qaModeBookmark')}
							</label>
						</div>
					</div>

					<!-- 预置图标替换开关 -->
					<div class="mb-6 flex items-center justify-between">
						<div>
							<div class="text-sm text-white/80">{$_('settings.qaUsePresetIcons')}</div>
							<p class="mt-1 text-xs text-white/60">{$_('settings.qaUsePresetIconsHint')}</p>
						</div>
						<input
							type="checkbox"
							class="toggle toggle-primary"
							checked={$settings.usePresetIcons}
							onchange={(e) => settings.save({ usePresetIcons: e.currentTarget.checked })}
						/>
					</div>

					{#if $settings.quickAccessMode === 'bookmark'}
						<!-- 书签模式：选择来源文件夹（仅其直接子书签，不递归子文件夹） -->
						<div class="mb-6">
							<span class="block text-sm text-white/80 mb-2">{$_('settings.qaBookmarkFolder')}</span>
							<select
								class="select select-sm select-bordered bg-black text-white"
								value={$settings.bookmarkFolderId ?? ''}
								onchange={(e) => handleBookmarkFolderChange(e.currentTarget.value)}
							>
								<option value="">{$_('settings.qaBookmarkFolderPlaceholder')}</option>
								{#each bookmarkFolders as bf (bf.id)}
									<option value={bf.id}>{bf.path}</option>
								{/each}
							</select>
							{#if isExtension()}
								<p class="mt-1 text-xs text-white/60">{$_('settings.qaBookmarkHint')}</p>
							{:else}
								<p class="mt-1 text-xs text-white/60">{$_('settings.qaBookmarkNonExt')}</p>
							{/if}
						</div>
					{:else}
					<div class="mb-6">
						<span class="block text-sm text-white/80 mb-2">{$_('settings.qaAdd')}</span>
						<div class="flex gap-2 mb-3">
							<input type="text" bind:value={qaTitle} placeholder={$_('settings.qaNamePlaceholder')} class="input input-sm flex-1 bg-white/10 text-white placeholder:text-white/50" />
							<input type="text" bind:value={qaUrl} placeholder="https://github.com" class="input input-sm flex-[2] bg-white/10 text-white placeholder:text-white/50" />
							<button type="button" class="btn btn-sm bg-[#399fff]/30 hover:bg-[#399fff]/50 text-white" onclick={handleAddQa}>{$_('common.add')}</button>
						</div>
						<p class="text-xs text-white/60">{$_('settings.qaAddHint')}</p>
					</div>

					<div>
						<span class="block text-sm text-white/80 mb-2">{$_('settings.qaAdded')}</span>
						<div class="flex flex-col gap-3">
							{#if $quickAccess.length === 0}
								<p class="text-xs text-white/60">{$_('settings.qaEmpty')}</p>
							{/if}
							{#each $quickAccess as item, index (item.url)}
								{#if editingIndex === index}
									<div class="rounded-lg border border-[#399fff]/40 bg-[#399fff]/10 p-3 flex flex-col gap-2">
										<input type="text" bind:value={editTitle} placeholder={$_('settings.qaEditNamePlaceholder')} class="input input-sm bg-white/10 text-white placeholder:text-white/50" />
										<input type="text" bind:value={editUrl} placeholder={$_('settings.qaEditUrlPlaceholder')} class="input input-sm bg-white/10 text-white placeholder:text-white/50" />
										<div class="flex justify-end gap-2">
											<button type="button" class="btn btn-xs bg-[#399fff]/30 hover:bg-[#399fff]/50 text-white" onclick={() => saveEdit(index)}>{$_('common.save')}</button>
											<button type="button" class="btn btn-xs bg-white/10 hover:bg-white/20 text-white" onclick={() => (editingIndex = null)}>{$_('common.cancel')}</button>
										</div>
									</div>
								{:else}
									<div
										class="flex items-center justify-between gap-2 p-3 rounded-lg bg-white/5 border border-white/10 hover:bg-white/10 hover:border-white/20 transition
										{dragOverIndex === index ? 'border-t-2 border-t-[#399fff]' : ''}"
										ondragover={(e) => {
											e.preventDefault();
											dragOverIndex = index;
										}}
										ondrop={(e) => {
											e.preventDefault();
											handleDrop(index);
										}}
									>
										<div class="flex items-center gap-3 flex-1 min-w-0">
											<button
												type="button"
												class="cursor-grab text-white/50 hover:text-white/90 select-none"
												draggable="true"
												title={$_('settings.qaDragAria')}
												aria-label={$_('settings.qaDragAria')}
												ondragstart={() => (draggingIndex = index)}
												ondragend={() => (draggingIndex = null)}
											>
												<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
													<line x1="4" y1="8" x2="20" y2="8"></line>
													<line x1="4" y1="12" x2="20" y2="12"></line>
													<line x1="4" y1="16" x2="20" y2="16"></line>
												</svg>
											</button>
											{#if item.icon}
												<img src={item.icon} alt="" class="w-6 h-6 rounded" onerror={(e) => e.currentTarget.remove()} />
											{/if}
											<div class="flex-1 min-w-0 overflow-hidden">
												<div class="text-sm text-white font-medium truncate">{item.title}</div>
												<div class="text-xs text-white/60 truncate">{item.url}</div>
											</div>
										</div>
										<div class="flex gap-2 shrink-0">
											<button type="button" class="btn btn-xs bg-white/10 hover:bg-white/20 text-white" onclick={() => startEdit(index)}>{$_('common.edit')}</button>
											<button type="button" class="btn btn-xs bg-white/10 hover:bg-white/20 text-white" onclick={() => handleRemoveQa(index)}>{$_('common.remove')}</button>
										</div>
									</div>
								{/if}
							{/each}
						</div>
					</div>
					{/if}
				</section>

				<!-- 每日一言 -->
				<section class="mb-8">
					<h3 class="text-lg font-semibold text-white mb-4 pb-3 border-b border-white/10">{$_('settings.quoteTitle')}</h3>

					<div class="mb-6 flex items-center justify-between">
						<span class="text-sm text-white/80">{$_('settings.quoteShow')}</span>
						<input
							type="checkbox"
							class="toggle toggle-primary"
							checked={$settings.quoteEnabled}
							onchange={(e) => settings.save({ quoteEnabled: e.currentTarget.checked })}
						/>
					</div>

					<div class="mb-6">
						<span class="block text-sm text-white/80 mb-2">{$_('settings.quoteTypesLabel')}</span>
						<div class="flex flex-wrap gap-4">
							{#each QUOTE_TYPES as qt (qt.value)}
								<label class="flex items-center cursor-pointer gap-2 text-sm text-white/80 hover:text-white">
									<input
										type="checkbox"
										class="checkbox checkbox-primary checkbox-sm"
										value={qt.value}
										checked={$settings.quoteTypes.includes(qt.value)}
										onchange={(e) => {
											const value = e.currentTarget.value;
											const next = e.currentTarget.checked
												? [...$settings.quoteTypes, value]
												: $settings.quoteTypes.filter((v) => v !== value);
											settings.save({ quoteTypes: next });
										}}
									/>
									{$_('quote.' + qt.key)}
								</label>
							{/each}
						</div>
					</div>

					<div>
						<button type="button" class="btn btn-sm bg-white/10 hover:bg-white/20 text-white" onclick={handleClearQuoteCache}>{$_('settings.quoteClearCache')}</button>
					</div>
				</section>

				<!-- 安全 -->
				<section class="mb-8">
					<h3 class="text-lg font-semibold text-white mb-4 pb-3 border-b border-white/10">{$_('settings.securityTitle')}</h3>
					<div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-white/80">{$_('settings.copyProtection')}</span>
							<input
								type="checkbox"
								class="toggle toggle-primary"
								checked={$settings.copyProtection}
								onchange={(e) => settings.save({ copyProtection: e.currentTarget.checked })}
							/>
						</div>
						<p class="mt-1 text-xs text-white/60">{$_('settings.copyProtectionHint')}</p>
					</div>
				</section>

				<!-- 数据管理 -->
				<section class="mb-8">
					<h3 class="text-lg font-semibold text-white mb-4 pb-3 border-b border-white/10">{$_('settings.dataTitle')}</h3>
					<div>
						<span class="block text-sm text-white/80 mb-2">{$_('settings.dataBackup')}</span>
						<div class="flex gap-3">
							<button type="button" class="btn btn-sm bg-white/10 hover:bg-white/20 text-white" onclick={handleExport}>{$_('settings.export')}</button>
							<button type="button" class="btn btn-sm bg-white/10 hover:bg-white/20 text-white" onclick={() => importInput?.click()}>{$_('settings.import')}</button>
							<input type="file" accept=".json" bind:this={importInput} class="hidden" onchange={handleImport} />
						</div>
						<p class="mt-1 text-xs text-white/60">{$_('settings.dataHint')}</p>
					</div>
				</section>

				<!-- 关于 -->
				<section>
					<h3 class="text-lg font-semibold text-white mb-4 pb-3 border-b border-white/10">{$_('settings.aboutTitle')}</h3>
					<div class="text-sm text-white/80 space-y-1">
					<p class="font-semibold text-white">TSTab</p>
					<p>{$_('settings.aboutDesc')}</p>
					<p>
						{$_('settings.aboutImage')}
						<a href="https://unsplash.com/photos/a-snow-covered-mountain-with-a-clear-blue-sky-g-6gKgRC30k" target="_blank" rel="noopener noreferrer" class="text-[#399fff] no-underline">Kévin JINER</a>
					</p>
					<p>{$_('settings.aboutRef')} <a href="https://github.com/ltba/Snow" target="_blank" rel="noopener noreferrer" class="text-[#399fff] no-underline">Snow</a></p>
					</div>

					<!-- 开源许可：列出运行时依赖、构建工具与引用素材的许可与来源地址 -->
					<div class="pt-4 mt-4 border-t border-white/10">
						<h4 class="text-sm font-semibold text-white mb-2">{$_('settings.licenseTitle')}</h4>
						<p class="text-xs text-white/60 leading-relaxed mb-3">{$_('settings.licenseIntro')}</p>

						<div class="space-y-1.5">
							{#each LICENSE_GROUPS as group}
								<p class="text-xs text-white/60 leading-relaxed m-0">
									{#each group as item, i (item.name)}
										{#if i > 0}<span class="text-white/30"> · </span>{/if}
										<a href={item.url} target="_blank" rel="noopener noreferrer" class="text-[#399fff] no-underline">{item.name}</a>
										<span class="text-white/40">({item.license}{#if item.notice} · {item.notice}{/if}{#if item.noticeKey} · {$_('settings.licenseNotice.' + item.noticeKey)}{/if})</span>
									{/each}
								</p>
							{/each}
						</div>

						<p class="text-xs text-white/60 leading-relaxed mt-3">
							{$_('settings.licenseSelf')}
							<a href={PROJECT_URL} target="_blank" rel="noopener noreferrer" class="text-[#399fff] no-underline">{$_('settings.licenseRepo')}</a>
						</p>
					</div>
				</section>
			</div>

			<!-- 底部 -->
			<div class="flex gap-3 px-8 py-6 bg-white/5 border-t border-white/10 shrink-0">
				<button type="button" class="btn btn-md flex-1 bg-[#399fff]/30 hover:bg-[#399fff]/50 text-white" onclick={close}>{$_('common.done')}</button>
			</div>
		</div>
	</div>
{/if}
