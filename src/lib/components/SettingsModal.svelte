<script>
	import { MAX_IMAGE_SIZE } from '$lib/config';
	import { StorageManager } from '$lib/storage';
	import { faviconUrl, quickAccess, quote, settings } from '$lib/stores';

	export let open = false;

	const QUOTE_TYPES = [
		{ value: 'a', label: '动画' },
		{ value: 'b', label: '漫画' },
		{ value: 'c', label: '游戏' },
		{ value: 'd', label: '文学' },
		{ value: 'i', label: '诗词' }
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

	function close() {
		open = false;
	}

	function alertMsg(msg) {
		window.alert(msg);
	}

	/* ---------- 背景 ---------- */
	function setBgType(type) {
		settings.save({ backgroundType: type });
	}

	async function handleUrlApply() {
		const url = bgUrlInput.trim();
		if (!url) return alertMsg('请输入图片 URL');
		try {
			new URL(url);
		} catch {
			return alertMsg('请输入有效的 URL 地址');
		}
		const img = new Image();
		img.onload = async () => {
			await settings.save({ backgroundType: 'url', backgroundImage: url });
			alertMsg('URL 图片已设置');
			bgUrlInput = '';
		};
		img.onerror = () =>
			alertMsg('无法加载该图片，请检查 URL 是否正确或图片是否允许跨域访问');
		img.src = url;
	}

	function handleFilePicked(event) {
		const file = event.target.files?.[0];
		if (!file) return;
		if (!file.type.startsWith('image/')) return alertMsg('请选择图片文件');
		if (file.size > MAX_IMAGE_SIZE) return alertMsg('图片文件过大，请选择小于 5MB 的图片');
		const reader = new FileReader();
		reader.onload = async (e) => {
			await settings.save({ backgroundType: 'local', backgroundImage: e.target.result });
			alertMsg('本地图片已设置');
			event.target.value = '';
		};
		reader.readAsDataURL(file);
	}

	async function handleResetBg() {
		if (!window.confirm('确定要恢复默认背景吗？')) return;
		await settings.save({ backgroundType: 'gradient', backgroundImage: '' });
		alertMsg('已恢复默认背景');
	}

	/* ---------- 一言 ---------- */
	async function handleClearQuoteCache() {
		await quote.clearCache();
		alertMsg('一言缓存已清除');
	}

	/* ---------- 快捷访问 ---------- */
	async function handleAddQa() {
		const title = qaTitle.trim();
		const url = qaUrl.trim();
		if (!title) return alertMsg('请输入网站名称');
		if (!url) return alertMsg('请输入网站地址');
		try {
			new URL(url);
		} catch {
			return alertMsg('请输入有效的网站地址（如：https://github.com）');
		}
		const ok = await quickAccess.add({ title, url, icon: faviconUrl(url), addedAt: Date.now() });
		if (ok) {
			qaTitle = '';
			qaUrl = '';
		} else {
			alertMsg('该网站已存在');
		}
	}

	async function handleRemoveQa(index) {
		if (!window.confirm('确定要删除这个快捷访问吗？')) return;
		await quickAccess.remove(index);
	}

	function startEdit(index) {
		editingIndex = index;
		editTitle = $quickAccess[index]?.title ?? '';
		editUrl = $quickAccess[index]?.url ?? '';
	}

	async function saveEdit(index) {
		if (!editTitle.trim()) return alertMsg('请输入网站名称');
		if (!editUrl.trim()) return alertMsg('请输入网站地址');
		try {
			new URL(editUrl);
		} catch {
			return alertMsg('请输入有效的网站地址（如：https://github.com）');
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
		alertMsg('配置已导出成功');
	}

	async function handleImport(event) {
		const file = event.target.files?.[0];
		if (!file) return;
		if (!file.name.endsWith('.json')) {
			event.target.value = '';
			return alertMsg('请选择 JSON 格式的配置文件');
		}
		try {
			const text = await file.text();
			const data = JSON.parse(text);
			if (!data.config || typeof data.config !== 'object') {
				return alertMsg('配置文件格式不正确');
			}
			const confirmMsg = data.exportDate
				? `确定要导入配置吗？\n\n导出时间：${data.exportDate}\n\n导入后将覆盖当前所有设置。`
				: '确定要导入配置吗？\n\n导入后将覆盖当前所有设置。';
			if (!window.confirm(confirmMsg)) {
				event.target.value = '';
				return;
			}
			await StorageManager.setMultiple(data.config);
			await settings.load();
			await quickAccess.load();
			alertMsg('配置已导入成功');
			close();
		} catch (err) {
			console.error('导入配置失败:', err);
			alertMsg('导入配置失败，请检查文件格式是否正确');
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
			aria-label="设置"
		>
			<!-- 头部 -->
			<div class="flex items-center justify-between px-8 py-6 border-b border-white/10 bg-white/5 shrink-0">
				<h2 class="text-xl font-semibold text-white m-0">设置</h2>
				<button
					class="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 hover:scale-110 flex items-center justify-center text-white transition cursor-pointer"
					aria-label="关闭设置"
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
				<!-- 背景设置 -->
				<section class="mb-8">
					<h3 class="text-lg font-semibold text-white mb-4 pb-3 border-b border-white/10">背景设置</h3>

					<div class="mb-6">
						<span class="block text-sm text-white/80 mb-2">背景类型</span>
						<div class="flex flex-wrap gap-4">
							<label class="flex items-center cursor-pointer gap-2 text-sm text-white/80 hover:text-white">
								<input type="radio" class="radio radio-primary" name="bgtype" value="gradient" checked={$settings.backgroundType === 'gradient'} onchange={() => setBgType('gradient')} />
								默认渐变
							</label>
							<label class="flex items-center cursor-pointer gap-2 text-sm text-white/80 hover:text-white">
								<input type="radio" class="radio radio-primary" name="bgtype" value="local" checked={$settings.backgroundType === 'local'} onchange={() => setBgType('local')} />
								本地图片
							</label>
							<label class="flex items-center cursor-pointer gap-2 text-sm text-white/80 hover:text-white">
								<input type="radio" class="radio radio-primary" name="bgtype" value="url" checked={$settings.backgroundType === 'url'} onchange={() => setBgType('url')} />
								URL 图片
							</label>
						</div>
					</div>

					{#if $settings.backgroundType === 'local'}
						<div class="mb-6">
							<span class="block text-sm text-white/80 mb-2">上传本地图片</span>
							<button type="button" class="btn btn-sm bg-white/10 hover:bg-white/20 border border-white/20 text-white" onclick={() => fileInput?.click()}>选择文件</button>
							<input type="file" accept="image/*" bind:this={fileInput} class="hidden" onchange={handleFilePicked} />
							<p class="mt-1 text-xs text-white/60">支持 JPG、PNG、GIF 等格式，建议 1920x1080 分辨率</p>
						</div>
					{/if}

					{#if $settings.backgroundType === 'url'}
						<div class="mb-6">
							<span class="block text-sm text-white/80 mb-2">图片 URL</span>
							<input type="text" bind:value={bgUrlInput} placeholder="https://example.com/image.jpg" class="input w-full mb-2 bg-white/10 border-transparent text-white placeholder:text-white/50" />
							<button type="button" class="btn btn-sm bg-[#399fff]/30 hover:bg-[#399fff]/50 text-white" onclick={handleUrlApply}>应用</button>
							<p class="mt-1 text-xs text-white/60">图片必须允许跨域访问（CORS）</p>
						</div>
					{/if}

					<div>
						<button type="button" class="btn btn-sm bg-white/10 hover:bg-white/20 text-white" onclick={handleResetBg}>恢复默认背景</button>
					</div>
				</section>

				<!-- 搜索设置 -->
				<section class="mb-8">
					<h3 class="text-lg font-semibold text-white mb-4 pb-3 border-b border-white/10">搜索设置</h3>
					<div class="flex items-center justify-between">
						<span class="text-sm text-white/80">默认搜索引擎</span>
						<select
							class="select select-sm select-bordered bg-white/10 text-white"
							value={$settings.searchEngine}
							onchange={(e) => settings.save({ searchEngine: e.currentTarget.value })}
						>
							<option value="baidu">百度</option>
							<option value="google">Google</option>
							<option value="bing">Bing</option>
						</select>
					</div>
				</section>

				<!-- 快捷访问 -->
				<section class="mb-8">
					<h3 class="text-lg font-semibold text-white mb-4 pb-3 border-b border-white/10">快捷访问</h3>

					<div class="mb-6">
						<span class="block text-sm text-white/80 mb-2">添加网站</span>
						<div class="flex gap-2 mb-3">
							<input type="text" bind:value={qaTitle} placeholder="网站名称（如：GitHub）" class="input input-sm flex-1 bg-white/10 text-white placeholder:text-white/50" />
							<input type="text" bind:value={qaUrl} placeholder="https://github.com" class="input input-sm flex-[2] bg-white/10 text-white placeholder:text-white/50" />
							<button type="button" class="btn btn-sm bg-[#399fff]/30 hover:bg-[#399fff]/50 text-white" onclick={handleAddQa}>添加</button>
						</div>
						<p class="text-xs text-white/60">提示：访问目标网站时，也可以点击扩展图标快速添加</p>
					</div>

					<div>
						<span class="block text-sm text-white/80 mb-2">已添加的网站（拖拽排序）</span>
						<div class="flex flex-col gap-3">
							{#if $quickAccess.length === 0}
								<p class="text-xs text-white/60">暂无快捷访问网站</p>
							{/if}
							{#each $quickAccess as item, index (item.url)}
								{#if editingIndex === index}
									<div class="rounded-lg border border-[#399fff]/40 bg-[#399fff]/10 p-3 flex flex-col gap-2">
										<input type="text" bind:value={editTitle} placeholder="网站名称" class="input input-sm bg-white/10 text-white placeholder:text-white/50" />
										<input type="text" bind:value={editUrl} placeholder="网站地址" class="input input-sm bg-white/10 text-white placeholder:text-white/50" />
										<div class="flex justify-end gap-2">
											<button type="button" class="btn btn-xs bg-[#399fff]/30 hover:bg-[#399fff]/50 text-white" onclick={() => saveEdit(index)}>保存</button>
											<button type="button" class="btn btn-xs bg-white/10 hover:bg-white/20 text-white" onclick={() => (editingIndex = null)}>取消</button>
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
												title="拖拽排序"
												aria-label="拖拽排序"
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
											<button type="button" class="btn btn-xs bg-white/10 hover:bg-white/20 text-white" onclick={() => startEdit(index)}>编辑</button>
											<button type="button" class="btn btn-xs bg-white/10 hover:bg-white/20 text-white" onclick={() => handleRemoveQa(index)}>删除</button>
										</div>
									</div>
								{/if}
							{/each}
						</div>
					</div>
				</section>

				<!-- 每日一言 -->
				<section class="mb-8">
					<h3 class="text-lg font-semibold text-white mb-4 pb-3 border-b border-white/10">每日一言</h3>

					<div class="mb-6 flex items-center justify-between">
						<span class="text-sm text-white/80">显示每日一言</span>
						<input
							type="checkbox"
							class="toggle toggle-primary"
							checked={$settings.quoteEnabled}
							onchange={(e) => settings.save({ quoteEnabled: e.currentTarget.checked })}
						/>
					</div>

					<div class="mb-6">
						<span class="block text-sm text-white/80 mb-2">一言类型</span>
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
									{qt.label}
								</label>
							{/each}
						</div>
					</div>

					<div>
						<button type="button" class="btn btn-sm bg-white/10 hover:bg-white/20 text-white" onclick={handleClearQuoteCache}>清除一言缓存</button>
					</div>
				</section>

				<!-- 安全 -->
				<section class="mb-8">
					<h3 class="text-lg font-semibold text-white mb-4 pb-3 border-b border-white/10">安全与隐私</h3>
					<div>
						<div class="flex items-center justify-between">
							<span class="text-sm text-white/80">禁用文字复制</span>
							<input
								type="checkbox"
								class="toggle toggle-primary"
								checked={$settings.copyProtection}
								onchange={(e) => settings.save({ copyProtection: e.currentTarget.checked })}
							/>
						</div>
						<p class="mt-1 text-xs text-white/60">开启后无法选择和复制页面文字（输入框除外）</p>
					</div>
				</section>

				<!-- 数据管理 -->
				<section class="mb-8">
					<h3 class="text-lg font-semibold text-white mb-4 pb-3 border-b border-white/10">数据管理</h3>
					<div>
						<span class="block text-sm text-white/80 mb-2">配置备份与恢复</span>
						<div class="flex gap-3">
							<button type="button" class="btn btn-sm bg-white/10 hover:bg-white/20 text-white" onclick={handleExport}>导出配置</button>
							<button type="button" class="btn btn-sm bg-white/10 hover:bg-white/20 text-white" onclick={() => importInput?.click()}>导入配置</button>
							<input type="file" accept=".json" bind:this={importInput} class="hidden" onchange={handleImport} />
						</div>
						<p class="mt-1 text-xs text-white/60">导出配置将保存所有设置到 JSON 文件，导入配置可恢复之前的设置</p>
					</div>
				</section>

				<!-- 关于 -->
				<section>
					<h3 class="text-lg font-semibold text-white mb-4 pb-3 border-b border-white/10">关于</h3>
					<div class="text-sm text-white/80 space-y-1">
						<p class="font-semibold text-white">TSTab</p>
						<p>基于 SvelteKit + Tailwind CSS v4 + DaisyUI 5 重写的简洁新标签页</p>
						<p>功能参考 <a href="https://github.com/ltba/Snow" target="_blank" rel="noopener noreferrer" class="text-[#399fff] no-underline">Snow</a></p>
					</div>
				</section>
			</div>

			<!-- 底部 -->
			<div class="flex gap-3 px-8 py-6 bg-white/5 border-t border-white/10 shrink-0">
				<button type="button" class="btn btn-md flex-1 bg-[#399fff]/30 hover:bg-[#399fff]/50 text-white" onclick={close}>完成</button>
			</div>
		</div>
	</div>
{/if}
