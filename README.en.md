# agent-mode-change

An **Agent-mode floating window** for [DeepSeek Harness](https://github.com/deepseek-ai/deepseek-harness)
(dsh): a small, freely draggable panel in the Web UI that switches the current session's Agent mode
with one click.

English | [中文](README.md)

Repository <https://github.com/deepseekharness-dsh/agent-mode-change> ｜ mirror <https://gitee.com/deepseekharness/agent-mode-change>

## What it does

The window lists two kinds of mode:

| Row | Meaning | Underlying action |
|---|---|---|
| **DeepSeek Harness** (the default mode) | this harness's own, live-assembled system prompt | `/agent off` |
| Claude Code / Codex CLI / … 13 more | archived prompts shipped by `@deepseek-ai/dsh-agent-emulation` | `/agent <id>` |

Picking a row switches the mode of the **current session**. The switch runs the same
`/agent <id>` command a person types, so the transcript keeps the ordinary `/agent` card and the
choice keeps living only in the session log.

The window can:

- be **dragged by pressing anywhere on it** (title bar, empty list space, status line — and the
  collapsed pill too), with the position remembered;
- **collapse into a pill** that shows the mode in force;
- jump back to its default position (top right) with the **⊙** control;
- collapse on `Escape`. Position and open/closed state live in browser `localStorage`.

## Install

```sh
# from npm (also how the marketplace installs it, once listed)
dsh plugin --profile <profile> add agent-mode-change

# or from a local checkout
dsh plugin --profile <profile> add /absolute/path/agent-mode-change
```

Reload the Web page once after installing.

## Requirements

- DeepSeek Harness (developed against `0.1.7-rc.2`).
- **[`@deepseek-ai/dsh-agent-emulation`](https://www.npmjs.com/package/@deepseek-ai/dsh-agent-emulation)
  must be installed and enabled**: it owns the `/agent` command, the `emulate_agent` tool and the
  prompt catalog. Without it the window still renders but reports that the command is missing.

## How it works

- The **Host half** registers one **client-visible session projection**, `agentModeChange`
  (`index.js`): it folds `agent-emulation/select` and publishes the prompt catalog read from the
  installed `dsh-agent-emulation` package next to it. The shipped `agentEmulation` projection is
  host-only (no client view), so the browser cannot read the current choice; a read-only projection
  is the weakest way to surface it, and it **writes no events** — the session log stays the only
  source of truth.
- The **Client half** registers the window in `shell.overlay` (`client.js`): `useSessions` finds the
  session the main view shows, the session binding's `projections.faceOf()` reads the projection, and
  `ctx.remote.commands.execute()` runs `/agent <id>`. `localStorage` holds only the window's own
  position and open state.

## Permissions and side effects

- Runs one host command, `/agent <off|id>` — the same thing a person types. It is the only write
  path; it produces an ordinary `command/run` + `command/done` and, when the choice changes, one
  `agent-emulation/select` event.
- Reads one session projection (key `agentModeChange`).
- Writes two `localStorage` keys: `agent-mode-change/anchor`, `agent-mode-change/open`.
- **No network access**, no file reads or writes, no tools registered, no prompt injection, and no
  modification of existing session-log content.

## Development

```sh
npm test          # node:test — projection fold, bundle manifest, static client-bundle checks
```

For local iteration, install the checkout into a profile with
`dsh plugin add /path/to/repo`, or point `plugin_manager`'s `install_bundle` at the directory. Client
bundle edits are picked up by dsh's client-modules watcher and hot-reloaded in the browser.

The release chain is documented in [docs/RELEASING.md](docs/RELEASING.md).

## Known limitations

- The catalog's own `dsh` snapshot is **not listed** (it carries the same label as the default mode,
  so the two rows would be indistinguishable); select that frozen text with `/agent dsh` yourself.
- If a deployment sets `@deepseek-ai/dsh-agent-emulation`'s `config.default`, this window only knows
  that the session logged no choice, so the default row is annotated
  "default mode · follows the deployment default".
- The window renders in the Web client only, and the list follows the catalog the installed
  `dsh-agent-emulation` ships.

## License and credits

MIT. The archived prompt texts belong to their respective vendors; they are captured from
[phistory](https://github.com/WEIFENG2333/phistory) and shipped by
`@deepseek-ai/dsh-agent-emulation`. This plugin only displays catalog ids, labels and versions — it
copies and forwards no prompt text.
