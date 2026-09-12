/**
 * 让原生表单控件始终反映 store 当前值：保存采用乐观更新，快照合并校准或跨页面同步后
 * 商店值可能与控件默认绑定不同步，Svelte 又会因值相同跳过 DOM 更新，此 action 主动写入 DOM。
 * @param node 选择器或输入控件
 * @param state 当前商店的 value 或 checked
 * @returns Svelte action 的状态更新接口
 */
export function persistedControl(node: HTMLInputElement | HTMLSelectElement, state: { value: string } | { checked: boolean }) {
	function update(next: typeof state) {
		if ('checked' in next && node instanceof HTMLInputElement) node.checked = next.checked;
		else if ('value' in next) node.value = next.value;
	}
	update(state);
	return { update };
}
