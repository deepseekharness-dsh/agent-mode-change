# Changelog

All notable changes to this plugin are documented here. The format follows
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and the project uses
[semantic versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.1 — 2026-09-29

Documentation and release-tooling patch. Behaviour is unchanged from 1.0.0.

### Changed

- README (zh/en): re-enabled the CI / npm / license / node badges now that the
  package exists on npm, and state the published version.
- `docs/RELEASING.md`: documents the verified publishing recipe (why an
  `npm login` session token is rejected with 403, the granular-token fields
  that work, and the npm deprecation dates).

### Added

- `.github/workflows/publish.yml`: tag-triggered publishing through npm Trusted
  Publishing (OIDC) — tag/version guard, tests, no secrets.

## 1.0.0 — 2026-09-29

First public release.

### Added

- Floating **Agent 模式** window in `shell.overlay`: the session's current mode,
  the default `DeepSeek Harness` mode, and every archived prompt
  `@deepseek-ai/dsh-agent-emulation` ships.
- Host half: the client-visible session projection `agentModeChange`, which
  folds `agent-emulation/select` and publishes the prompt catalog next to it.
- Client half: a draggable, collapsible panel with pointer-drag anywhere on the
  window, a persisted anchor, viewport re-clamping, a reset-position control,
  `Escape` to collapse, and zh/en copy.
- Switching runs the shipped `/agent <id>` command, so every switch stays a
  durable `command/run` + `agent-emulation/select` in the session log.
- Test suite (`npm test`) covering the projection fold and the bundle manifest.

### Notes

- The catalog's own `dsh` snapshot is not listed: it carries the same label as
  the default mode. `/agent dsh` still selects it.
