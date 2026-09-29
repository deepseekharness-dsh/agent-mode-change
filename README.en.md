# Agent Mode Change

**The Agent-mode floating window for DeepSeek Harness.** A freely draggable Web-UI panel that switches the current session's system prompt between the harness's own prompt and **13 archived coding-agent CLI prompts** — in one click.

**Language / 语言：** **English** ｜ 中文：[GitHub](https://github.com/deepseekharness-dsh/agent-mode-change/blob/main/README.md) · [Gitee](https://gitee.com/deepseekharness/agent-mode-change/blob/main/README.md)

**Status:** ✅ CI passing · Node ≥ 20 · MIT · npm `agent-mode-change`

**Keywords:** `DeepSeek Harness` · `dsh` · `dsh-plugin` · `Cordis` · `AI Agent` · `Coding Agent` · `System Prompt` · `Prompt Engineering`

**Repository:** [GitHub](https://github.com/deepseekharness-dsh/agent-mode-change) ｜ mirror [Gitee](https://gitee.com/deepseekharness/agent-mode-change) ｜ npm [`agent-mode-change`](https://www.npmjs.com/package/agent-mode-change)

---

## Why this exists

The same model is framed as a very different assistant by every coding agent. Seeing that clearly
first requires being able to switch back and forth easily.

- **Compare how agents frame the model** — Claude Code, Codex CLI, Antigravity, Grok, Kimi, MiniMax, opencode, Pi… switch one by one and watch the same question answered differently.
- **Prompt archaeology and reproduction** — an archived prompt is frozen text, so a behaviour can be reproduced years later instead of drifting with each upstream release.
- **Without breaking your flow** — the window sits at the edge of the frame; one click switches, no `/agent` arguments to remember. Collapsed, it is a small pill showing the mode in force.

## Highlights

| Capability | Detail |
|---|---|
| 🪟 **A floating window you place yourself** | Registered in `shell.overlay`; **press anywhere on it and drag**, including the collapsed pill |
| 💾 **Position and open state remembered** | Kept in browser `localStorage`; survives reloads, and is re-clamped when the viewport or the window's own size changes |
| 🎯 **One control back to the default spot** | The ⊙ control in the title bar; `Escape` collapses the window |
| 🔄 **Live state** | The current mode comes from a Host-side session projection and updates immediately — **no polling, no client-side event folding** |
| 🧾 **Session-log safe** | Switching runs the official `/agent <id>` command, so the transcript keeps the ordinary `/agent` card: traceable and reproducible |
| 🌏 **Bilingual** | Chinese and English copy follows the dsh language setting |
| ⚡ **Hot-reload friendly** | Edit `client.js` during development; dsh's client-modules hot-reloads it in the browser |
| 🔒 **No network, no file writes** | No requests, no tools registered, no prompt injection, no modification of existing log content (see [Permissions](#permissions-and-side-effects)) |

## The 13 Agent modes you can switch to

Besides the default mode, the window lists these archived prompts (versions follow
`@deepseek-ai/dsh-agent-emulation`):

| Mode | Catalog id | Archived version |
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

Plus the first row, **DeepSeek Harness** — this harness's own live-assembled system prompt (the
default mode, equivalent to `/agent off`).

> Note: `@deepseek-ai/dsh-agent-emulation` ships 14 archived prompts. The `dsh` one carries the same
> label as the default mode, so it is not listed; select that frozen text with `/agent dsh`.

## Install

```sh
# 1) from npm (the same command the marketplace will use once listed)
dsh plugin --profile <profile> add agent-mode-change

# 2) or from a local checkout
dsh plugin --profile <profile> add /absolute/path/agent-mode-change
```

Reload the Web page once; the window appears in the top-right corner.

## Usage

| Action | Effect |
|---|---|
| Click a row | Switches the mode of the **current session** |
| Press anywhere and drag | Moves the window (the list's own scrollbar excluded) |
| Click `–` in the title bar | Collapses to a pill showing the current mode |
| Click the pill | Expands |
| Click `⊙` in the title bar | Returns to the default position (top right) |
| Press `Escape` | Collapses |

A switch **applies from the next step**: a running turn finishes first, and the command result says
"applies from the next step" when that happens.

## How it works

```text
        ┌──────────────────────── DeepSeek Harness (Host) ────────────────────────┐
        │                                                                          │
session │  agent-emulation/select  ──▶  @deepseek-ai/dsh-agent-emulation           │
  log   │                              (ships the host-only agentEmulation unit)   │
 (the   │                                          │                               │
  only  │                 this plugin's Host half ──┘ folds the same event         │
 source │                 index.js → projection agentModeChange                    │
   of   │                 (client-visible: current choice + prompt catalog)        │
 truth) └───────────────────────────────────┬──────────────────────────────────────┘
                                            │ session projection (the framework drives it)
        ┌───────────────────────────────────▼──────────────────────────────────────┐
        │  this plugin's Client half  client.js                                     │
        │  shell.overlay window ── reads the projection ──▶ renders mode + rows     │
        │         │                                                                 │
        │         └── pick ──▶ ctx.remote.commands.execute('/agent <id>') ──────────┼──▶ official
        │                                                                           │   command
        └───────────────────────────────────────────────────────────────────────────┘
```

- **Host half** (`index.js`) registers exactly one **client-visible session projection**,
  `agentModeChange`: it folds `agent-emulation/select` and publishes the prompt catalog read from the
  installed `dsh-agent-emulation` package. The shipped `agentEmulation` projection is host-only (no
  client view), so the browser cannot read the current choice; a read-only projection is the weakest
  way to surface it, and it **writes no events**.
- **Client half** (`client.js`) registers the window in `shell.overlay`: `useSessions` finds the
  session the main view shows, the session binding's `projections.faceOf()` reads the projection, and
  `ctx.remote.commands.execute()` runs `/agent <id>`. `localStorage` holds only the window's own
  position and open state.
- The **session log therefore stays the only source of truth**: no new event types, no rewritten
  history, and the choice survives fork and resume on its own.

The full data flow, the invariants and the capability table are in
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Permissions and side effects

| Kind | Detail |
|---|---|
| Runs | One host command (`/agent off` or `/agent <id>`, the same thing a person types): an ordinary `command/run` + `command/done`, plus one `agent-emulation/select` when the choice changes |
| Reads | One session projection (key `agentModeChange`) |
| Writes | Two browser `localStorage` keys: `agent-mode-change/anchor`, `agent-mode-change/open` |
| Never | ❌ no network　❌ no file reads or writes　❌ no tools registered　❌ no prompt injection　❌ no modification of existing log content |

## Compatibility

| Item | Requirement |
|---|---|
| DeepSeek Harness | developed against `0.1.7-rc.2` |
| [`@deepseek-ai/dsh-agent-emulation`](https://www.npmjs.com/package/@deepseek-ai/dsh-agent-emulation) | **must be installed and enabled** — it owns the `/agent` command, the `emulate_agent` tool and the prompt catalog. Without it the window still renders but reports the missing command |
| Client | Web (`dsh.client.platform: web`) |
| Node | ≥ 20 |

## FAQ

**Why did the switch not take effect immediately?**
A choice applies from the **next step**. A running turn finishes first, and the command result says so
explicitly.

**Does it affect the current conversation or its history?**
No. Only the system prompt is replaced; tools, sandbox and session log stay this harness's own, and no
existing record is touched.

**Do I need to restart dsh?**
No — the plugin row is hot-loaded. Reload the browser page once and the window is there.

**Is any data uploaded anywhere?**
No. The plugin issues no requests; it renders a session projection the Host already computed and
translates your click into one local command.

**Why exactly 13 modes?**
The list follows the catalog `@deepseek-ai/dsh-agent-emulation` ships, and stays in sync with it.

**Can I add my own prompts?**
Not yet (see [Roadmap](#roadmap)); new catalog entries upstream appear here automatically.

**Does it conflict with the `/agent` command?**
No — it is a graphical shell over that command: typing `/agent` and clicking the window take exactly
the same path.

## Development

```sh
git clone https://github.com/deepseekharness-dsh/agent-mode-change.git
cd agent-mode-change
npm test          # node:test — projection fold, bundle manifest, static client-bundle checks
```

Layout:

```text
index.js               Host half: the agentModeChange session projection
client.js              Client half: the shell.overlay window (a plain browser module, no build step)
cordis.patch.yml       bundle layer: inserts this plugin's Host row
locale/{zh,en}.json    the plugin card's title and description
test/*.test.mjs        node:test suite
docs/ARCHITECTURE.md   data flow, invariants, capability table, test coverage
docs/RELEASING.md      release chain (npm / GitHub / Gitee / listing PR)
```

For local iteration, `dsh plugin add /path/to/repo` into any profile, or point `plugin_manager`'s
`install_bundle` at the directory; `client.js` edits are watched and hot-reloaded by client-modules.

## Roadmap

- [ ] Search / filter box for the mode list
- [ ] Keyboard shortcuts (switch without the mouse)
- [ ] Custom prompt directories beside the shipped catalog
- [ ] Per-session memory of the collapsed state
- [ ] More client surfaces (beyond Web)

**Language / 语言：** **English** ｜ 中文：[GitHub](https://github.com/deepseekharness-dsh/agent-mode-change/blob/main/README.md) · [Gitee](https://gitee.com/deepseekharness/agent-mode-change/blob/main/README.md)

## License and credits

MIT © deepseekharness. The archived prompt texts belong to their respective vendors; they are captured
from [phistory](https://github.com/WEIFENG2333/phistory) and shipped by
`@deepseek-ai/dsh-agent-emulation`. This plugin only displays catalog ids, labels and versions — it
**copies and forwards no prompt text**.

Links: [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness) ·
[dsh-agent-emulation](https://www.npmjs.com/package/@deepseek-ai/dsh-agent-emulation) ·
[awesome-dsh-plugin](https://github.com/awesome-dsh-plugin/awesome-dsh-plugin) ·
[dshmarket](https://dshmarket.com) · [phistory](https://github.com/WEIFENG2333/phistory)
