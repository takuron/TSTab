# 一言（Hitokoto）API 与双缓存说明

本文档说明 TSTab 中「每日一言」依赖的一言 API 结构，以及本项目采用的**双缓存轮换机制**。任何改动一言相关逻辑（`src/lib/stores.ts` 的 `quote` store、`src/lib/types.ts` 的 `QuoteCache`、`src/lib/config.ts` 的 `HITOKOTO_API`）后必须同步更新本文档（见 `llm_readme.md` 3.1 节）。

## 1 API 概览

- 端点：`https://v1.hitokoto.cn/`
- 方法：`GET`
- 无鉴权，任何来源可访问。
- 已在 `static/manifest.json` 的 `host_permissions` 中声明 `https://v1.hitokoto.cn/*`（用于扩展页跨域请求授权，与脚本 CSP 分别生效）。

### 1.1 请求参数

| 参数 | 说明 |
| --- | --- |
| `c` | 句子分类，可重复（`?c=a&c=b`），与分类取并集；**不支持**逗号分隔（`c=a,b` 会返回 400）。分类含义见下表。 |
| `encode` | 编码格式，默认/常用 `json`（本项目默认，未传）。 |
| `charset` | 字符集，默认 `utf-8`。 |
| `min_length` / `max_length` | 句子长度区间（本项目未使用）。 |

分类（`c` 取值）：

| 值 | 含义 |
| --- | --- |
| `a` | 动画 |
| `b` | 漫画 |
| `c` | 游戏 |
| `d` | 文学 |
| `e` | 原创 |
| `f` | 来自网络 |
| `g` | 其他 |
| `h` | 影视 |
| `i` | 诗词 |
| `j` | 网易云 |
| `k` | 哲学 |
| `l` | 抖机灵 |

本项目默认 `quoteTypes = ['a','b','c','d','i']`（见 `config.ts`），由设置面板可改。

### 1.2 响应结构

成功（HTTP 200）返回 JSON，本项目仅使用以下字段（`Hitokoto` 接口，见 `types.ts`）：

```ts
interface Hitokoto {
	hitokoto: string;   // 句子正文
	from?: string;      // 出处（作品名）
	from_who?: string;  // 作者/角色
	uuid?: string;      // 唯一标识，用于去重
	// 其他字段：id, type, creator 等
}
```

失败示例（400）：请求参数不合法时返回 `{ "status": 400, "message": "很抱歉，没有分类有句子符合长度区间。", "data": [] }`。网络失败 / 非 2xx 时本项目抛错并走兜底。

## 2 请求构造

`quote` store 的 `fetchQuote()`（`stores.ts`）将设置项 `settings.quoteTypes` 映射为多个 `c` 参数后请求：

```ts
const params = new URLSearchParams(types.map((type) => ['c', type]));
const res = await fetch(`${HITOKOTO_API}?${params}`, { signal: controller.signal, credentials: 'omit' });
```

注意分类参数用**重复的 `c=`** 而非逗号。

## 3 双缓存位 + 使用位置标记机制

一言采用「两个缓存位 + 一个正在使用位下标」的结构（数据存于 `STORAGE_KEYS.QUOTE_CACHE`，即 `quoteCache`），把「界面切换显示」与「网络拉取」彻底解耦：

- **界面显示**：始终读取并展示当前 `active` 位的内容，切换显示先在本地事务中更新 `active`、`shownAt` 及空闲槽，完成持久化后显示；随后独立调度网络补充，不等待网络。
- **网络拉取**：只填充「空闲槽」（非 active 的那一位），填完后不直接更新界面，等待下次轮换或刷新时切换过去。界面不等待网络；离线且空闲槽为空时保留当前内容。首次初始化允许填充两个空槽，但不改变当前显示的缺省文案。

### 3.1 数据结构（`types.ts`）

```ts
interface QuoteSlot {
	data: Hitokoto | null;   // 该位保存的一言
	timestamp: number;       // 最近一次写入时间
	shownAt?: number;        // 该槽位最近一次「开始展示」的时间，按展示时长判断过期
}

interface QuoteCache {
	initialized: boolean;            // 是否已完成首次初始化
	slots: [QuoteSlot, QuoteSlot];  // 两个缓存位，下标 0 / 1
	active: 0 | 1;                  // 当前正在使用的位下标
	revision?: string;              // 切换/重置时更新，隔离迟到请求
}
```

> 过期判断基准：以**该槽位开始展示以来的时长**（`shownAt`，即首次展示或切换到 active 的时刻）而非请求/写入时刻（`timestamp`）为准。这样保证每个槽位都展示满 `CACHE_EXPIRY` 时长后才轮换，而不是「请求后到了一定时间就过期」——因为槽位可能提前拉取、到轮换时才真正展示。

### 3.2 首次打开

1. 无有效缓存（`initialized` 为假）。
2. **立即展示本地缺省一言**（`quote.fallbackText`），不等网络。
3. 在独立网络锁内并行拉取**两条不同**一言（`fetchTwoDistinct`，按正文去重、最多重试 3 次；始终重复时保留响应，避免无限请求）。
4. 存储：第一条 → `slots[0]`，第二条 → `slots[1]`，`active = 0`。

### 3.3 每次打开（`load`）——自动轮换

1. 读取状态。
2. **检查当前槽位展示时长是否过期**（`shownAt` 起算超过 `CACHE_EXPIRY` 1 小时）：
   - 过期且另一槽位**非空**：切换到另一槽位为主要槽位并展示其内容，**将被轮换掉的槽位内容清空**，随后走网络更新流程。
   - 过期且另一槽位**为空**：**不变更槽位**，仅展示当前内容（空则缺省），随后走网络更新流程。
   - 未过期：**不轮换**，展示当前槽位，仍然走网络更新流程。
3. `fillIdle`：**无论是否轮换都尝试走网络更新流程**，但会**先判断被轮换（空闲）槽位是否为空**——仅当其为空时才发起网络请求并填入，非空则保留其内容不覆盖。网络取得后填入空闲槽，绝不直接更新界面。

### 3.4 手动刷新 / 重新开启（`quote.refresh()`）

1. 读取状态；未初始化按新打开处理。
2. **检查另一槽位是否为空**：
   - 非空：切换到另一槽位为主要槽位并展示其内容，**将被轮换掉的槽位内容清空**，随后尝试网络请求。
   - 为空：**不变更槽位**，仅尝试网络请求；若当前槽位也为空，则先填充本地缺省并尝试更新两个槽位。
3. `fillIdle`：网络只填充非活跃槽位（仅其为空时触发）。整个刷新过程界面切换不等待网络。

## 4 生命周期与状态流转

| 阶段 | active 位 | 空闲位 | 展示内容 |
| --- | --- | --- | --- |
| 首次打开 | 槽0 | 槽1 | 本地缺省一言 |
| 打开（未过期） | 槽0 | 槽1 | 槽0一言（不轮换） |
| 打开（槽0过期且槽1非空） | 槽1 | 槽0(清空) | 槽1一言 |
| 打开（槽0过期且槽1空） | 槽0 | 槽1(空) | 槽0一言（不变更、轮换暂停） |

> 说明：轮换只在当前 active 位超过 `CACHE_EXPIRY` 时发生；每次轮换仅改 `active` 下标，从另一个缓存槽读取，不再直接请求 API。网络只负责把空闲槽填满，绝不直接更新界面。

## 5 并发、离线与错误处理

- 本地切换使用 `tstab:storage` 锁，先保存 active、shownAt 和空闲槽；fetch 失败也不会退回旧使用位。首次真正展示时才写 shownAt，不用提前下载时间计算展示时长。
- `tstab:quote-network` 独立同源锁采用 `ifAvailable`，一个页面已在补充时其他页面不重复请求；不会占用存储锁等待网络。
- 每次 fetch 超时为 8 秒，使用 AbortController，失败保留本地内容并释放网络锁。响应正文、出处、作者和 uuid 在入库前校验。
- 切换、清空、导入均改变 revision；网络返回后在存储锁内重读最新数据，只有 revision 与分类仍一致且一言仍开启时才写入。清空写入带新 revision 的空缓存，使在途响应失效。
- 空闲槽补充成功不直接更新页面；下一次刷新或打开时展示。清空缓存立即回到当前语言的本地缺省文案。

## 6 修改一致性检查

- 修改数据结构时需同步：`types.ts` 的 `QuoteCache`、`stores.ts` 的创建/更新逻辑、`docs/architecture.md` 第 5.2/5.3 节、`docs/quote_api.md`。
- 新增「缓存预留」相关设置项时遵循 `llm_readme.md` 3.1 文档同步规则与 `docs/architecture.md` 5.1 节。
- 网络与依赖说明：一句 API 是 §7 中唯一外部 API；`quote` 无本地网络之外的第三方运行时依赖。
