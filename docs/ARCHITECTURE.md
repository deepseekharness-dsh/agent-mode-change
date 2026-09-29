# 架构与不变量 / Architecture and invariants

这份文档写给两读者：想确认这个插件"到底碰了什么"的维护者，以及要核对仓库描述的精选列表评审者。
每一节都对应仓库里的具体文件与可运行的测试。

## 组成

| 文件 | 角色 |
|---|---|
| `index.js` | **Host 半边**：注册一个客户端可见的会话投影 `agentModeChange`，折叠 `agent-emulation/select`，并把已安装的 `@deepseek-ai/dsh-agent-emulation` 包里的 `prompts/sources.json` 目录一并投出去。 |
| `client.js` | **Client 半边**：一个纯浏览器模块（`window.__ModuleLoader__.load`，无构建步骤），在 `shell.overlay` 注册悬浮窗。 |
| `cordis.patch.yml` | bundle 层：插入本插件的 Host 行。 |
| `locale/{zh,en}.json` | 插件管理器卡片上的标题与描述（元数据，随包读取，不激活插件）。 |

## 数据流

```text
会话事件 agent-emulation/select
        │
        ├─▶ @deepseek-ai/dsh-agent-emulation 的 host-only 投影 agentEmulation（官方）
        │
        └─▶ 本插件 Host 半边 index.js 的投影 agentModeChange（客户端可见）
                    │  折叠后的状态：{ selection?: string | null }
                    │  wire view：{ explicit, selection, agents[] }
                    ▼
        会话投影传输（框架负责推/拉；本插件不订阅会话事件）
                    ▼
        Client 半边 client.js
            useSessions()                     → 主视图会话 id
            binding.session.projections       → faceOf('agentModeChange')
            ctx.remote.commands.execute(...)  → 执行 '/agent <id>'
```

## 不变量（改代码时别破坏）

1. **会话日志是唯一真源。** 插件不新增事件类型、不追加自定义事件、不改写历史。选择只存在于官方
   `agent-emulation/select` 里，fork / resume / 重放都能自己还原。
2. **唯一的写入路径是官方 `/agent <id>` 命令。** Client 半边调用的就是人手工输入的那条命令；
   不做"直接写投影状态"之类的捷径。测试里对投影折叠的断言（`test/projection.test.mjs`）
   保证折叠语义与上游一致。
3. **投影状态是纯 JSON 且可缓存。** `apply` 对无关事件返回同一引用（零下游开销）；
   `stateVersion` 变更即让持久化缓存失效。
4. **Client 半边不折叠会话数据。** 它只读投影；会话选择、目录、生效状态都由 Host 计算。
5. **浏览器里不引入 dsh 客户端包。** 只用模块表里的 `react`，样式只用 Theme 提供的
   `--dsw-alias-*` 令牌，文案走 locale 服务（`locale/{zh,en}.json` + 注册的字典）。
6. **注册即副作用。** 投影注册与 slot 注册都挂在插件自己的 cordis fiber 上，卸载即撤销。

## 能力与副作用（与 README 的表格一致，测试可核）

| 类别 | 内容 | 代码位置 |
|---|---|---|
| 执行 | `/agent <off\|id>` | `client.js` 的 `selectAgent()` |
| 读取 | 会话投影 `agentModeChange` | `client.js` 的 `faceFor()`；`index.js` 的 `register()` |
| 写入 | `localStorage`：`agent-mode-change/anchor`、`agent-mode-change/open` | `client.js` 的 `readJson`/`writeJson` |
| 网络 | 无 | 全仓库无 `fetch`/`XMLHttpRequest`/WebSocket |
| 文件 | 无（Host 半边在激活时**只读**已安装包的 `prompts/sources.json`） | `index.js` 的 `readCatalog()` |

## 为什么需要第二个投影

官方 `agentEmulation` 投影是 host-only（没有 client view），浏览器读不到"当前选择"。
可选方案与取舍：

| 方案 | 结果 |
|---|---|
| 让浏览器自己扫会话记录 | 违背"客户端不折叠会话数据"，且要处理分页 |
| 让浏览器跑 `/agent list` 并解析文本 | 每次打开窗口都会往会话里写一条命令卡片，污染日志 ❌ |
| **注册一个只有读视图的投影（本插件采用）** | 零日志写入，状态由框架推给客户端；代价是 Host 多折叠一个纯函数 |

## 测试覆盖

```sh
npm test
```

- `test/projection.test.mjs`：投影键与 stateVersion、空状态、无关事件同引用、选择折叠（id / null /
  重复选择）、wire view 的 `explicit`/`selection`/`agents`、JSON 可序列化。
- `test/bundle.test.mjs`：manifest 可安装性（`dsh.bundle` + `dsh.client` + 导出与 `files`）、
  patch 行与包名一致、client 模块 id 与包名一致、slot 注册与 locale 注册存在、
  中英文字典键一致且覆盖全部 `t()` 查询、已淘汰文案不再出现。

CI（`.github/workflows/ci.yml`）在 Node 20 / 22 / 24 上跑同一套测试，并执行 `npm pack --dry-run`
检查发布文件清单。
