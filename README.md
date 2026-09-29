# Agent Mode Change

**DeepSeek Harness 的 Agent 模式悬浮窗。** 一个可自由拖动的 Web UI 面板，把当前会话的系统提示词在「本机提示词」与 **13 个主流编码 Agent CLI 的归档提示词**之间一键切换。

**语言 / Language：** **中文** ｜ English：[GitHub](https://github.com/deepseekharness-dsh/agent-mode-change/blob/main/README.en.md) · [Gitee](https://gitee.com/deepseekharness/agent-mode-change/blob/main/README.en.md)

**状态：** ✅ CI 通过 · Node ≥ 20 · MIT · npm `agent-mode-change`

**关键词：** `DeepSeek Harness` · `dsh` · `dsh-plugin` · `Cordis` · `AI Agent` · `Coding Agent` · `System Prompt` · `Prompt Engineering`

**仓库：** [GitHub](https://github.com/deepseekharness-dsh/agent-mode-change) ｜ 镜像 [Gitee](https://gitee.com/deepseekharness/agent-mode-change) ｜ npm [`agent-mode-change`](https://www.npmjs.com/package/agent-mode-change)

---

## 为什么需要它

同一套模型，在不同的编码 Agent 里被框定成完全不同的助手。想看清这件事，你得先能**方便地来回切**。

- **对照不同 Agent 的框法** —— Claude Code、Codex CLI、Antigravity、Grok、Kimi、MiniMax、opencode、Pi…… 逐个切换，同一个问题看它们各自怎么答。
- **提示词考古与复现** —— 归档提示词是定稿文本，可以长期复现某次采集下的行为，而不是随着上游逐版漂移。
- **不打断心流** —— 悬浮窗随时在侧，点一下即切，不必记住 `/agent` 的参数；收起后只剩一枚显示当前模式的小胶囊。

## 功能亮点

| 能力 | 说明 |
|---|---|
| 🪟 **可自由摆放的悬浮窗** | `shell.overlay` 帧级浮动层；**按住窗口任意位置即可拖动**，收起后的胶囊也能拖 |
| 💾 **位置与开合状态自动记忆** | 存在浏览器 `localStorage`，刷新、重开会话都还在原处；视图尺寸变化时自动夹回可视区 |
| 🎯 **一键回到默认位置** | 标题栏 ⊙ 控件；`Escape` 直接收起 |
| 🔄 **实时状态** | 当前模式来自 Host 侧会话投影，切换后即时更新，**不轮询、不折叠会话事件** |
| 🧾 **会话日志安全** | 切换走的是官方 `/agent <id>` 命令本身，日志里留下的还是那张 `/agent` 卡片，可追溯、可复现 |
| 🌏 **中英双语** | 两种界面语言随 dsh 语言设置切换 |
| ⚡ **热更新友好** | 开发时改 `client.js`，dsh 的 client-modules 会在浏览器里热重载 |
| 🔒 **零网络、零文件写入** | 不联网、不注册工具、不注入提示词、不修改任何已有日志内容（详见[权限与副作用](#权限与副作用)） |

## 可切换的 13 个 Agent 模式

除默认模式外，窗口列出下列归档提示词（版本随 `@deepseek-ai/dsh-agent-emulation` 更新）：

| 模式 | 目录 id | 归档版本 |
|---|---|---|
| Claude Code | `claude-code` | 2.1.283 |
| Codex CLI | `codex` | 0.157.1 |
| Antigravity CLI | `antigravity` | 1.2.12 |
| Grok Build | `grok` | 1.0.41 |
| MiniMax Code | `minimax-code` | 3.0.74 |
| Kimi Code | `kimi-code` | 2.1.1 |
| MiMo Code | `mimo` | 0.1.13 |
| OpenClaw | `openclaw` | 2026.9.6 |
| Hermes Agent | `hermes` | v2026.9.24 |
| Kimi CLI | `kimi` | 1.51.0 |
| opencode | `opencode` | 1.18.32 |
| Pi | `pi` | 0.87.1 |
| Oh My Pi | `omp` | 18.3.5 |

以及第一行 **DeepSeek Harness** —— 本 harness 自己实时组装的系统提示词（默认模式，等价于 `/agent off`）。

> 说明：`@deepseek-ai/dsh-agent-emulation` 随包提供 14 份归档提示词，其中 `dsh` 那份与默认模式同名，因此不在列表中；需要那份定稿文本时用 `/agent dsh` 手动选择。

## 安装

```sh
# 1) 从 npm 安装（插件市场收录后也用这条命令）
dsh plugin --profile <profile> add agent-mode-change

# 2) 或从本地仓库安装
dsh plugin --profile <profile> add /absolute/path/agent-mode-change
```

装完刷新一次 Web 页面即可看到悬浮窗（默认出现在右上角）。

## 使用

| 操作 | 效果 |
|---|---|
| 点任意一行 | 切换**当前会话**的模式 |
| 按住窗口任意位置拖动 | 移动悬浮窗（列表滚动条除外） |
| 点标题栏 `–` | 收起为一枚显示当前模式的小胶囊 |
| 点胶囊 | 展开 |
| 点标题栏 `⊙` | 回到默认位置（右上角） |
| 按 `Escape` | 收起 |

切换**从下一步生效**：会话正在跑的回合结束后即用新模式；如果此刻有回合在跑，命令结果里会写明「applies from the next step」。

## 工作原理

```text
        ┌──────────────────────── DeepSeek Harness (Host) ────────────────────────┐
        │                                                                          │
 会话日志 │  agent-emulation/select  ──▶  @deepseek-ai/dsh-agent-emulation          │
 (唯一真源)│                              （自带 host-only 投影 agentEmulation）    │
        │                                          │                               │
        │                   本插件 Host 半边 ───────┘ 折叠同一事件                 │
        │                   index.js → 投影 agentModeChange                        │
        │                   （客户端可见：当前选择 + 提示词目录）                     │
        └───────────────────────────────────┬──────────────────────────────────────┘
                                            │ 会话投影（拉/推都由框架负责）
        ┌───────────────────────────────────▼──────────────────────────────────────┐
        │  本插件 Client 半边  client.js                                             │
        │  shell.overlay 悬浮窗 ── 读投影 ──▶ 渲染当前模式与 13+1 行列表               │
        │         │                                                                 │
        │         └── 点选 ──▶ ctx.remote.commands.execute('/agent <id>') ───────────┼──▶ 官方
        │                                                                           │   命令
        └───────────────────────────────────────────────────────────────────────────┘
```

- **Host 半边**（`index.js`）只注册一个**客户端可见的会话投影** `agentModeChange`：折叠 `agent-emulation/select`，并把已安装的 `dsh-agent-emulation` 包里的 `prompts/sources.json` 目录一并投给浏览器。官方投影 `agentEmulation` 是 host-only（没有 client view），浏览器读不到当前选择；一个只有读视图的投影是最弱的补法 —— 它**不写任何事件**。
- **Client 半边**（`client.js`）在 `shell.overlay` 注册窗口：用 `useSessions` 找主视图会话，用会话绑定的 `projections.faceOf()` 读投影，用 `ctx.remote.commands.execute()` 执行 `/agent <id>`。`localStorage` 只存窗口自己的位置与开合状态。
- 因此**会话日志始终是唯一真源**：插件不新增事件类型、不改写历史，fork / resume 之后选择自然还在。

更细的数据流、不变量与能力对照表见 [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md)。

## 权限与副作用

| 类别 | 具体内容 |
|---|---|
| 执行 | 一条 host 命令（`/agent off` 或 `/agent <id>`，等价于用户在输入框手打）：产生普通的 `command/run` + `command/done`，选择变化时再产生一条 `agent-emulation/select` |
| 读取 | 一个会话投影（键 `agentModeChange`） |
| 写入 | 两个浏览器 `localStorage` 键：`agent-mode-change/anchor`、`agent-mode-change/open` |
| 不做 | ❌ 不联网　❌ 不读写文件　❌ 不注册工具　❌ 不注入提示词　❌ 不修改已有日志内容 |

## 兼容性

| 项 | 要求 |
|---|---|
| DeepSeek Harness | 开发版本 `0.1.7-rc.2` |
| [`@deepseek-ai/dsh-agent-emulation`](https://www.npmjs.com/package/@deepseek-ai/dsh-agent-emulation) | **必须已安装并启用** —— `/agent` 命令、`emulate_agent` 工具与提示词目录都由它提供。没有它时窗口仍会出现，但会提示命令不存在 |
| 客户端 | Web（`dsh.client.platform: web`） |
| Node | ≥ 20 |

## 常见问题

**切换后为什么没立刻变？**
选择从**下一步**生效。正在跑的回合会先跑完；命令结果会明确写「applies from the next step」。

**会影响当前对话或历史记录吗？**
不会。只替换系统提示词；工具、沙箱、会话日志都是本 harness 自己的，历史一条不动。

**装完要重启 dsh 吗？**
不用，插件行是热加载的；刷新一次浏览器页面即可看到窗口。

**数据会上传到别处吗？**
不会。插件不发起任何网络请求；它只是把已有的会话投影显示出来，并把你的点选翻译成一条本地命令。

**为什么只有 13 个模式？**
以 `@deepseek-ai/dsh-agent-emulation` 随包目录为准，与它保持同步；该包更新后列表自动跟随。

**能加自己的提示词吗？**
目前不行（见[路线图](#路线图)）；上游包加上新目录条目后，这里会自动出现。

**它和 `/agent` 命令冲突吗？**
不冲突，它就是那条命令的图形化外壳：你手打 `/agent` 和点悬浮窗走的是同一条路径。

## 开发

```sh
git clone https://github.com/deepseekharness-dsh/agent-mode-change.git
cd agent-mode-change
npm test          # node:test：投影折叠 + bundle 清单 + client 包静态检查
```

目录结构：

```text
index.js               Host 半边：会话投影 agentModeChange
client.js              Client 半边：shell.overlay 悬浮窗（纯浏览器模块，无构建步骤）
cordis.patch.yml       bundle 层：插入本插件的 Host 行
locale/{zh,en}.json    插件卡片的中英文标题与描述
test/*.test.mjs        node:test 测试
docs/ARCHITECTURE.md   数据流、不变量、能力对照、测试覆盖
docs/RELEASING.md      发布流程（npm / GitHub / Gitee / 收录 PR）
```

本地联调：`dsh plugin add /path/to/repo` 装进任意 profile，或用 `plugin_manager` 的 `install_bundle` 指向该目录；`client.js` 的改动会被 client-modules 监听并热重载。

## 路线图

- [ ] 模式搜索 / 过滤框（列表变长后的检索）
- [ ] 键盘快捷键（不点鼠标即可切换）
- [ ] 自定义提示词目录（在随包目录之外挂自己的归档）
- [ ] 每个会话记忆展开/收起状态
- [ ] 更多客户端形态（非 Web）

**语言 / Language：** **中文** ｜ English：[GitHub](https://github.com/deepseekharness-dsh/agent-mode-change/blob/main/README.en.md) · [Gitee](https://gitee.com/deepseekharness/agent-mode-change/blob/main/README.en.md)

## 许可与致谢

MIT © deepseekharness。归档提示词文本的版权归各自厂商所有，采集自
[phistory](https://github.com/WEIFENG2333/phistory)，由 `@deepseek-ai/dsh-agent-emulation` 随包提供；
本插件只显示目录里的 id / 名称 / 版本，**不复制、不转发任何提示词正文**。

相关链接：[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) ·
[dsh-agent-emulation](https://www.npmjs.com/package/@deepseek-ai/dsh-agent-emulation) ·
[dsh 插件精选列表](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) ·
[dshmarket](https://dshmarket.com) · [phistory](https://github.com/WEIFENG2333/phistory)
