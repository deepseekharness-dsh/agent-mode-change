/**
 * Host half of `agent-mode-change`.
 *
 * It registers ONE client-visible session projection, `agentModeChange`,
 * that folds the same log-only event `@deepseek-ai/dsh-agent-emulation` writes
 * (`agent-emulation/select`) and publishes it together with the prompt catalog
 * the installed `@deepseek-ai/dsh-agent-emulation` package ships.
 *
 * Why a second fold of the same event: the shipped `agentEmulation` projection
 * is host-only (it declares no client view), so the browser cannot read the
 * session's current choice. A client-visible unit is the weakest mechanism that
 * surfaces it, and the session log stays the only source of truth — this half
 * stores nothing of its own and writes no events. The switch itself is NOT
 * performed here: the floating window runs the shipped `/agent <id>` command,
 * so every switch stays a durable `command/run` + `agent-emulation/select` in
 * the transcript exactly as a person typing it would produce.
 *
 * @module agent-mode-change
 */
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { dirname, join } from 'node:path';

/** Plugin name (Loader row identity). */
export const name = 'agent-mode-change';

/** The one Host Service this half reads: the projection registry it contributes to. */
export const inject = ['sessionProjections'];

/** Projection key owned by this package; no shipped unit uses it. */
const PROJECTION_KEY = 'agentModeChange';

/** The log-only event `@deepseek-ai/dsh-agent-emulation` appends on every switch. */
const SELECTION_EVENT = 'agent-emulation/select';

/** Bump when the folded state or its wire shape changes (persisted-cache invalidation). */
const STATE_VERSION = 1;

/**
 * The registry validates state and wire payloads by calling `.parse`, and the
 * folded state is plain JSON by contract, so this unit needs no schema library.
 * Declaring one avoids importing `zod` into the Host module graph.
 */
const passthrough = {
  parse: (value) => value,
  safeParse: (value) => ({ success: true, data: value }),
};

/**
 * Catalog snapshot taken from `@deepseek-ai/dsh-agent-emulation@0.1.7-rc.2`
 * (`prompts/sources.json`). Used only when the installed package cannot be
 * located at runtime, so the window still lists everything a person can pick.
 */
const FALLBACK_AGENTS = [
  { id: 'claude-code', label: 'Claude Code', version: '2.1.283' },
  { id: 'codex', label: 'Codex CLI', version: '0.157.1' },
  { id: 'dsh', label: 'DeepSeek Harness', version: '0.1.7-rc.2' },
  { id: 'antigravity', label: 'Antigravity CLI', version: '1.2.12' },
  { id: 'grok', label: 'Grok Build', version: '1.0.41' },
  { id: 'minimax-code', label: 'MiniMax Code', version: '3.0.74' },
  { id: 'kimi-code', label: 'Kimi Code', version: '2.1.1' },
  { id: 'mimo', label: 'MiMo Code', version: '0.1.13' },
  { id: 'openclaw', label: 'OpenClaw', version: '2026.9.6' },
  { id: 'hermes', label: 'Hermes Agent', version: 'v2026.9.24' },
  { id: 'kimi', label: 'Kimi CLI', version: '1.51.0' },
  { id: 'opencode', label: 'opencode', version: '1.18.32' },
  { id: 'pi', label: 'Pi', version: '0.87.1' },
  { id: 'omp', label: 'Oh My Pi', version: '18.3.5' },
];

/**
 * Map one `prompts/sources.json` entry to the window's row shape.
 * @param entry - one manifest entry.
 * @returns the row, or undefined when the entry carries no usable id.
 */
function toAgent(entry) {
  if (entry === null || typeof entry !== 'object') return undefined;
  if (typeof entry.id !== 'string' || entry.id === '') return undefined;
  return {
    id: entry.id,
    label: typeof entry.label === 'string' && entry.label !== '' ? entry.label : entry.id,
    version: typeof entry.version === 'string' ? entry.version : '',
  };
}

/**
 * Read the prompt catalog from the installed `@deepseek-ai/dsh-agent-emulation`
 * package, trying a few resolution bases because a profile-installed bundle may
 * live behind a pnpm store symlink. Never throws: an unreadable catalog falls
 * back to the embedded snapshot.
 * @returns the catalog rows in manifest order, or the embedded fallback.
 */
function readCatalog() {
  const candidates = [];
  const profileDir = process.env.DSH_PROFILE_DIR;
  const bases = [import.meta.url];
  if (typeof profileDir === 'string' && profileDir !== '') bases.push(join(profileDir, 'index.js'));
  bases.push(join(process.cwd(), 'index.js'));
  for (const base of bases) {
    try {
      const require_ = createRequire(base);
      const manifest = require_.resolve('@deepseek-ai/dsh-agent-emulation/package.json');
      candidates.push(join(dirname(manifest), 'prompts', 'sources.json'));
    } catch {
      // Resolution base without the package installed; try the next one.
    }
  }
  if (typeof profileDir === 'string' && profileDir !== '') {
    candidates.push(join(profileDir, 'node_modules', '@deepseek-ai', 'dsh-agent-emulation', 'prompts', 'sources.json'));
  }
  candidates.push(join(process.cwd(), 'node_modules', '@deepseek-ai', 'dsh-agent-emulation', 'prompts', 'sources.json'));
  for (const file of candidates) {
    try {
      const parsed = JSON.parse(readFileSync(file, 'utf8'));
      const entries = Array.isArray(parsed) ? parsed : parsed?.entries;
      if (!Array.isArray(entries)) continue;
      const agents = entries.map(toAgent).filter((entry) => entry !== undefined);
      if (agents.length > 0) return agents;
    } catch {
      // Missing or malformed manifest; try the next candidate.
    }
  }
  return FALLBACK_AGENTS;
}

/**
 * Register the `agentModeChange` projection.
 * @param ctx - Host context carrying the projection registry.
 */
export function apply(ctx) {
  const agents = Object.freeze(readCatalog().map((agent) => Object.freeze(agent)));
  ctx.sessionProjections.register({
    key: PROJECTION_KEY,
    stateSchema: passthrough,
    init: () => ({}),
    apply(state, event) {
      if (event.type !== SELECTION_EVENT) return state;
      const selection = event.data.emulation;
      if (state.selection === selection) return state;
      return { selection };
    },
    wire: {
      viewSchema: passthrough,
      view(state) {
        return {
          /** Whether the session logged a choice of its own; false means it follows the deployment default. */
          explicit: state.selection !== undefined,
          /** The logged catalog id, or null for "emulate nothing" / "no choice logged". */
          selection: state.selection === undefined ? null : state.selection,
          /** The installed package's prompt catalog, in manifest order. */
          agents,
        };
      },
    },
    stateVersion: STATE_VERSION,
  });
}
