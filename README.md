# agent-mode-change

[DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)（dsh）的 **Agent 模式悬浮窗**：
在 Web UI 的浮动层里放一个可自由拖动的小窗口，点一下就能切换当前会话的 Agent 模式。

[English](README.en.md) | 中文

仓库 <https://github.com/deepseekharness-dsh/agent-mode-change> ｜ 镜像 <https://gitee.com/deepseekharness/agent-mode-change>

## 它做什么

窗口列出两种模式：

| 行 | 含义 | 底层动作 |
|---|---|---|
| **DeepSeek Harness**（默认模式） | 本 harness 自己**实时组装**的系统提示词 | `/agent off` |
| Claude Code / Codex CLI / … 共 13 项 | `@deepseek-ai/dsh-agent-emulation` 随包提供的**归档提示词** | `/agent <id>` |

点任意一行即切换**当前会话**的模式。切换走的就是人手工输入的 `/agent <id>` 命令，
所以会话记录里出现的还是那张 `/agent` 卡片，选择仍然只存在于会话日志里。

窗口可以：

- **按住任意位置拖动**（标题栏、列表空白、底部状态行都行；收起后的小胶囊也能拖），位置自动记住；
- **收起成小胶囊**，胶囊上直接显示当前模式；
- 标题栏 **⊙** 一键回到默认位置（右上角）；
- `Escape` 收起；位置与开合状态存在浏览器 `localStorage`。

## 安装

```sh
# 从 npm 安装（收录进精选列表后 marketplace 也会用它）
dsh plugin --profile <profile> add agent-mode-change

# 或从本地目录安装
dsh plugin --profile <profile> add /绝对路径/agent-mode-change
```

安装后刷新一次 Web 页面。

## 依赖

- DeepSeek Harness（开发版本 `0.1.7-rc.2`）。
- **[`@deepseek-ai/dsh-agent-emulation`](https://www.npmjs.com/package/@deepseek-ai/dsh-agent-emulation)
  必须已安装并启用**：`/agent` 命令、`emulate_agent` 工具与提示词目录都由它提供。
  没有它时窗口仍然出现，但会提示 `/agent` 命令不存在。

## 工作原理

- **Host 半边**只注册一个**客户端可见的会话投影** `agentModeChange`
  （`index.js`）：折叠 `agent-emulation/select` 事件，并把已安装的
  `dsh-agent-emulation` 包里的 `prompts/sources.json` 目录一并投给浏览器。
  官方投影 `agentEmulation` 是 host-only（没有 client view），所以浏览器读不到当前选择；
  一个只有读视图的投影是最弱的补法——它**不写任何事件**，会话日志仍是唯一真源。
- **Client 半边**在 `shell.overlay` 注册窗口（`client.js`）：用 `useSessions` 找当前主视图会话、
  用该会话绑定的 `projections.faceOf()` 读投影、用 `ctx.remote.commands.execute()` 执行
  `/agent <id>`；`localStorage` 只存窗口自己的位置与开合状态。

## 权限与副作用

- 执行一条 host 命令：`/agent <off|id>`（等价于用户在输入框里手打）。这是本插件唯一的写入路径，
  它会产生一条普通的 `command/run` + `command/done` 与（必要时）一条 `agent-emulation/select` 事件。
- 读取会话投影（投影键 `agentModeChange`）。
- 写入浏览器 `localStorage` 两个键：`agent-mode-change/anchor`、`agent-mode-change/open`。
- **不联网**、不读写文件、不注册工具、不注入提示词、不修改会话日志里已有的任何内容。

## 开发

```sh
npm test          # node:test：投影折叠 + bundle 清单 + client 包静态检查
```

本地联调：把仓库目录用 `dsh plugin add /path/to/repo` 装进一个 profile，
或用 `plugin_manager` 的 `install_bundle` 指向该目录。
client 半边的改动会被 dsh 的 client-modules 监听并在浏览器里热更新。

发布流程见 [docs/RELEASING.md](docs/RELEASING.md)。

## 已知限制

- 归档对话里同名的 `dsh` 快照**不列出**（它与默认模式同名，两行无法区分）；需要那份定稿文本时用
  `/agent dsh` 手动选择。
- 部署若通过 `@deepseek-ai/dsh-agent-emulation` 的 `config.default` 设了默认模式，本窗口只知道
  「会话没有记录过选择」，因此默认行会标注「默认模式 · 跟随部署默认」。
- 窗口只在 Web 客户端渲染；列表长度跟随 `dsh-agent-emulation` 随包的目录。

## 许可与致谢

MIT。归档提示词文本的版权归各自厂商所有，采集自
[phistory](https://github.com/WEIFENG2333/phistory)，由 `@deepseek-ai/dsh-agent-emulation` 随包提供；
本插件只显示目录里的 id / 名称 / 版本，不复制、不转发任何提示词正文。
