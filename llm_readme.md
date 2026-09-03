# TSTab LLM Assistant Guide

!!! 重要：你在每一次响应中都必须遵守第 3 节的编码规范。 !!!

欢迎！你是一名负责 **TSTab** 项目维护与开发的 LLM 助手。本文档是你的任务、角色与编码规范的中枢。

## 1 你的角色与任务

- **角色：** 你作为高级前端工程师、架构师与助手，维护并开发 TSTab 项目（基于 SvelteKit 的浏览器新标签页扩展）。
- **任务：**
  - **理解架构：** 在提出任何修改之前，先阅读并遵守下方链接文档中描述的项目架构与模块边界。
  - **开发：** 根据用户需求与 `docs/TODO.md` 实现新功能、修复 bug、重构代码。
  - **合规：** 严格遵守编码规范，特别是内部注释、导出 API 文档、样式与组件约定、以及变更日志维护。
  - **验证：** 完成编码任务后必须运行 `pnpm run check`（svelte-check）并确保零错误；涉及构建产物时必须通过 `pnpm run build` 验证。
  - **沟通：** 简洁、直接、准确地回复，不写无意义的客套话。做出设计决策时给出技术理由。

## 2 项目文档

为保持本指南简洁，详细的架构与构建说明已模块化。请阅读以下文档获取全面信息：

- [构建与扩展环境说明](docs/build_setup.md)
- [TSTab 前端架构](docs/architecture.md)
- [TODO 列表与路线图](docs/TODO.md)
- [变更日志](docs/Changelog.md)

## 3 LLM 编码规范

为确保使用 LLM 开发时的一致性与可维护性，以下规则必须严格遵守。

### 3.1 文档同步性

*   **规则：** 任何修改项目结构、增删模块、或改动 `src/lib/` 导出 API 的变更，**必须**同步更新本文档（`llm_readme.md`）或对应的链接文档（如 `docs/architecture.md`）。
*   **目标：** 本文档必须始终作为项目架构可靠且最新的唯一事实来源。

### 3.2 变更日志维护

*   **规则：** 每完成一个编码任务（如新增功能、修复 bug），必须执行 `llm_log.py` 脚本记录一条简要的变更摘要。
*   **格式：** 命令为 `python llm_log.py "你的简要日志信息。"`。脚本会自动加时间戳并追加到 `llm_log.txt`。
*   **目标：** 维护一份持久的、仅追加的 LLM 修改日志，格式标准化。
*   **补充：** 对于用户可感知的版本级变更，还应同步更新 `docs/Changelog.md`（遵循其现有条目格式）。

### 3.3 内部代码注释

*   **规则：** 内部实现逻辑使用中文注释，聚焦操作的顺序与目的。
*   **风格：** 注释应简短，置于被描述代码块之前。`/* ---------- 分节 ---------- */` 风格可用于在长文件中划分逻辑区块（参见 `src/lib/stores.ts`）。
*   **示例：**
    ```ts
    // 1. 先尝试读取缓存，命中且未过期则直接展示，避免多余网络请求。
    const cached = (await StorageManager.get(STORAGE_KEYS.QUOTE_CACHE)) as QuoteCache | undefined;
    if (cached && cached.data && Date.now() - cached.timestamp < CACHE_EXPIRY) {
        display(cached.data);
        return;
    }

    // 2. 缓存未命中，请求一言 API 并写入缓存。
    const data = await fetchQuote();
    display(data);
    await StorageManager.set(STORAGE_KEYS.QUOTE_CACHE, { data, timestamp: Date.now() });
    ```

### 3.4 导出 API 文档

*   **规则：** `src/lib/` 中所有导出的函数、接口、常量与 store，必须使用中文 JSDoc（`/** ... */`）文档化；函数应包含 `@param` / `@returns` 段（适用时）。
*   **示例：**
    ```ts
    /**
     * 判断是否为 URL，若是则返回规范化的地址，否则返回 null。
     *
     * @param query 用户输入的查询字符串
     * @returns 规范化后的完整 URL；不是 URL 时返回 null
     */
    export function normalizeUrlOrNull(query: string): string | null { ... }
    ```
*   **Svelte 组件：** 每个组件文件的 `<script>` 顶部应有一行注释说明组件职责；组件 props 使用 `export let` 并附行内注释说明用途与默认值。

### 3.5 样式与组件约定

*   **规则：** 界面样式只使用 Tailwind CSS v4 工具类 + DaisyUI 5（仅 dark 主题）+ `src/app.css` 中定义的设计令牌与工具类（`.glass` / `.glass-strong`）。不得引入其他 UI 框架或独立的 CSS 文件。
*   **视觉基准：** 所有界面必须维持现有毛玻璃风格（半透明 + `backdrop-blur`）与配色（强调色 `#399fff`，见 `app.css` 的 `:root` 变量）。
*   **组件模式：** 遵循现有组件写法——状态用 `svelte/store` 的经典 writable store（`src/lib/stores.ts`）；props 用 `export let`；事件用 Svelte 5 的属性语法（`onclick={...}`）；组件内不直接读写 `chrome.storage`，一律通过 `StorageManager` 与 store 方法。
*   **响应式动画：** 进出场动画复用 `app.css` 中已定义的 `fade` / `fade-blur-in` / `slide-in` / `slide-up` / `slide-down` / `shake` 关键帧，通过 Tailwind 任意值语法引用（如 `animate-[fade_0.5s_ease-in-out]`）。

### 3.6 验证与构建纪律

*   **规则 1：** 每次编码任务完成后必须运行 `pnpm run check`，并修复所有由本次改动引入的错误。
*   **规则 2：** 扩展产物必须且只能通过 `pnpm run build` 生成（它会自动执行 `scripts/patch-manifest.mjs` 补写 MV3 CSP 哈希）。**禁止**手改 `build/` 目录下的任何文件，也禁止绕过构建脚本直接产出扩展。
*   **规则 3：** 所有用户数据必须仅存于本地（`chrome.storage`，开发环境降级 `localStorage`），不得引入任何远端上报或第三方分析。
