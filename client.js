/**
 * Browser half of `agent-mode-change`.
 *
 * One frame-wide floating window, registered into `shell.overlay`, that lists
 * the Agent modes this deployment can run: `DeepSeek Harness` (the default, the
 * harness's own live prompt, i.e. the shipped `/agent off`) plus every archived
 * prompt `@deepseek-ai/dsh-agent-emulation` can emulate. Picking a row runs the
 * shipped `/agent <id>` command — the very command a person types, so the
 * transcript keeps the same durable card and the choice keeps living in the
 * session log.
 *
 * State is read, never folded here: the Host half of this package registers the
 * client-visible projection `agentModeChange` and the window subscribes to
 * that key through the session binding (the `useProjection` mechanism at root
 * scope). While collapsed the window is a small pill showing the mode in force.
 *
 * The window is freely movable: pressing anywhere on the card (or on the
 * collapsed pill) and dragging moves it; a press that does not move keeps the
 * ordinary click behavior (a row picks its mode, the pill expands). The anchor
 * is measured from the frame's right edge and top, persisted in localStorage,
 * re-clamped on viewport resize, and restorable with the ⌖ button.
 */
window.__ModuleLoader__.load({
  id: 'agent-mode-change',
  factory(require) {
    const React = require('react');
    const h = React.createElement;

    /** Host projection key owned by this package's Host half. */
    const PROJECTION_KEY = 'agentModeChange';
    /** Locale namespace this plugin registers (both shipped locales). */
    const LOCALE_NS = 'agentModeChange';
    const ANCHOR_KEY = 'agent-mode-change/anchor';
    const OPEN_KEY = 'agent-mode-change/open';
    /** Distance kept from the frame edges while dragging. */
    const MARGIN = 12;
    /** Pointer travel that turns a press into a drag instead of a click. */
    const DRAG_THRESHOLD = 4;
    /** Row id standing for "emulate nothing". */
    const OFF = 'off';
    /** Anchor the window opens with, and the one ⌖ restores. */
    const DEFAULT_ANCHOR = { right: 20, top: 84 };
    /**
     * The `/agent off` command's own summary sentence, as
     * `@deepseek-ai/dsh-agent-emulation` words it. This window shows its own
     * label for that outcome, so the shipped wording (which describes the
     * harness prompt) never surfaces here.
     */
    const HOST_OFF_SENTENCE = /^Agent emulation off \(native prompt\)\.$/;

    /**
     * Fallback catalog, mirroring the Host half's snapshot: the window still
     * lists the 14 shipped prompts when the projection has not arrived yet.
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

    /** Static Chinese copy for this window. */
    const ZH = {
      title: 'Agent 模式',
      pill: '模式 · {name}',
      // The default mode: this harness's own live prompt, i.e. `/agent off`.
      offLabel: 'DeepSeek Harness',
      defaultMode: '默认模式',
      followDefault: '跟随部署默认',
      hint: '点选一行即切换本会话的 Agent 模式；正在进行的回合要到下一步生效。',
      dragHint: '按住窗口任意位置拖动即可摆放；位置会自动记住。',
      resetPosition: '回到默认位置',
      noSession: '当前没有打开的会话，先开始或打开一个会话。',
      collapse: '收起为小标',
      switching: '切换中…',
      reading: '读取会话状态…',
      noBridge: '切换通道不可用：浏览器的 remote.commands 未挂载。',
      unknownCommand: 'Host 上没有 /agent 命令：请确认 @deepseek-ai/dsh-agent-emulation 已启用。',
      failed: '切换失败。',
      done: '已提交。',
      offDone: '已切换到 DeepSeek Harness 模式。',
    };

    /** Static English copy for this window. */
    const EN = {
      title: 'Agent mode',
      pill: 'Mode · {name}',
      // The default mode: this harness's own live prompt, i.e. `/agent off`.
      offLabel: 'DeepSeek Harness',
      defaultMode: 'default mode',
      followDefault: 'follows the deployment default',
      hint: 'Picking a row switches this session’s agent mode; a running turn applies it at its next step.',
      dragHint: 'Press anywhere on the window and drag to place it; the position is remembered.',
      resetPosition: 'Reset position',
      noSession: 'No open session — start or open one first.',
      collapse: 'Collapse',
      switching: 'Switching…',
      reading: 'Reading session state…',
      noBridge: 'Switch channel unavailable: the browser remote.commands namespace is not mounted.',
      unknownCommand: 'No /agent command on the Host: check that @deepseek-ai/dsh-agent-emulation is enabled.',
      failed: 'Switch failed.',
      done: 'Submitted.',
      offDone: 'Switched to DeepSeek Harness mode.',
    };

    /**
     * Styles for the window. Component-local (rendered as a React element, so
     * unmounting removes them), class-prefixed `aef-`, and every color is a
     * theme token from the Theme provider's list, so light and dark both work.
     */
    const CSS = `
.aef-card, .aef-pill, .aef-card *, .aef-pill * { box-sizing: border-box; }
.aef-card {
  position: fixed; z-index: 1100; width: 320px; max-width: calc(100vw - 24px);
  display: flex; flex-direction: column; overflow: hidden;
  border: 1px solid var(--dsw-alias-border-l1); border-radius: 10px;
  background: var(--dsw-alias-bg-overlay); color: var(--dsw-alias-label-primary);
  box-shadow: 0 10px 28px rgba(0, 0, 0, 0.28); pointer-events: auto;
  font-size: 13px; line-height: 18px; user-select: none;
}
.aef-head {
  display: flex; align-items: center; gap: 6px; padding: 8px 8px 8px 10px;
  border-bottom: 1px solid var(--dsw-alias-border-l1);
  cursor: grab; touch-action: none;
}
.aef-card:active .aef-head { cursor: grabbing; }
.aef-grip { flex: none; display: grid; place-items: center; color: var(--dsw-alias-label-secondary); }
.aef-title { flex: 1; min-width: 0; font-size: 13px; font-weight: 600; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.aef-icon {
  flex: none; width: 22px; height: 22px; padding: 0; display: grid; place-items: center;
  border: none; border-radius: 6px; background: transparent; cursor: pointer;
  color: var(--dsw-alias-label-secondary); font-size: 14px; line-height: 1;
}
.aef-icon:hover { background: var(--dsw-alias-bg-layer-2); color: var(--dsw-alias-label-primary); }
.aef-icon:focus-visible, .aef-pill:focus-visible, .aef-row:focus-visible { outline: 2px solid var(--dsw-alias-brand-primary); outline-offset: 1px; }
.aef-list { display: flex; flex-direction: column; gap: 1px; padding: 4px; overflow-y: auto; max-height: min(52vh, 420px); }
.aef-row {
  display: flex; align-items: center; gap: 8px; width: 100%; padding: 6px 8px;
  border: 1px solid transparent; border-radius: 8px; background: transparent;
  color: var(--dsw-alias-label-primary); font: inherit; text-align: left; cursor: pointer;
}
.aef-row:hover:not(:disabled) { background: var(--dsw-alias-bg-layer-2); }
.aef-row[aria-pressed='true'] { background: var(--dsw-alias-bg-layer-2); border-color: var(--dsw-alias-brand-primary); }
.aef-row:disabled { cursor: default; opacity: 0.6; }
.aef-check { flex: none; width: 14px; color: var(--dsw-alias-brand-primary); font-size: 12px; }
.aef-rowMain { flex: 1; min-width: 0; display: flex; flex-direction: column; }
.aef-rowLabel { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-weight: 500; }
.aef-rowMeta {
  overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 15px; font-variant-numeric: tabular-nums;
}
.aef-note {
  padding: 6px 10px 8px; border-top: 1px solid var(--dsw-alias-border-l1);
  color: var(--dsw-alias-label-secondary); font-size: 11px; line-height: 15px;
  max-height: 88px; overflow-y: auto; white-space: pre-wrap; word-break: break-word;
}
.aef-note[data-level='error'] { color: var(--dsw-alias-state-error-primary); }
.aef-note[data-level='success'] { color: var(--dsw-alias-state-success-primary); }
.aef-dot { flex: none; width: 8px; height: 8px; border-radius: 50%; background: var(--dsw-alias-state-idle-primary); }
.aef-dot[data-on='true'] { background: var(--dsw-alias-brand-primary); }
.aef-pill {
  position: fixed; z-index: 1100; display: inline-flex; align-items: center; gap: 6px;
  height: 28px; max-width: 240px; padding: 0 10px;
  border: 1px solid var(--dsw-alias-border-l1); border-radius: 999px;
  background: var(--dsw-alias-bg-overlay); color: var(--dsw-alias-label-secondary);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.22); pointer-events: auto;
  cursor: grab; user-select: none; touch-action: none; font-size: 12px; line-height: 16px;
}
.aef-pill:hover { color: var(--dsw-alias-label-primary); }
.aef-pillText { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
`;

    const noop = () => {};
    const subscribeAbsent = () => noop;
    const getAbsent = () => undefined;

    /**
     * Clamp one coordinate.
     * @param value - requested value.
     * @param low - lower bound.
     * @param high - upper bound.
     * @returns the clamped value.
     */
    function clamp(value, low, high) {
      return Math.min(Math.max(value, low), Math.max(low, high));
    }

    /**
     * Read one JSON value from localStorage.
     * @param key - storage key.
     * @returns the parsed value, or undefined.
     */
    function readJson(key) {
      try {
        const raw = window.localStorage.getItem(key);
        return raw === null ? undefined : JSON.parse(raw);
      } catch {
        return undefined;
      }
    }

    /**
     * Write one JSON value to localStorage, ignoring storage failures.
     * @param key - storage key.
     * @param value - value to persist.
     */
    function writeJson(key, value) {
      try {
        window.localStorage.setItem(key, JSON.stringify(value));
      } catch {
        // Private mode or a full quota: the window still works for this page life.
      }
    }

    /** @returns the persisted anchor, or the default top-right one. */
    function readAnchor() {
      const saved = readJson(ANCHOR_KEY);
      if (saved !== null && typeof saved === 'object' && typeof saved.right === 'number' && typeof saved.top === 'number') {
        return { right: Math.max(0, saved.right), top: Math.max(0, saved.top) };
      }
      return { right: DEFAULT_ANCHOR.right, top: DEFAULT_ANCHOR.top };
    }

    /** @returns whether the window should open expanded; the first visit does. */
    function readOpen() {
      const saved = readJson(OPEN_KEY);
      return typeof saved === 'boolean' ? saved : true;
    }

    /**
     * The session the main view currently shows. The Session Controller owns
     * no "current" field, so this mirrors the shipped derivation: a retained-by
     * -mainView row wins, and a future explicit `current` field would win first.
     * @param list - the session list snapshot.
     * @returns the session id, or undefined when no session is open.
     */
    function currentSessionId(list) {
      if (list === null || typeof list !== 'object') return undefined;
      if (typeof list.current === 'string') return list.current;
      const byId = list.byId !== null && typeof list.byId === 'object' ? list.byId : {};
      const ids = Array.isArray(list.ids) ? list.ids : Object.keys(byId);
      for (const id of ids) {
        const retainedBy = byId[id] === undefined ? undefined : byId[id].retainedBy;
        if (retainedBy !== null && typeof retainedBy === 'object' && typeof retainedBy.mainView === 'number' && retainedBy.mainView > 0) {
          return id;
        }
      }
      return undefined;
    }

    /**
     * Display label of one catalog row.
     * @param agent - a catalog entry from the projection or the fallback list.
     * @returns its label, falling back to the id.
     */
    function labelOf(agent) {
      return agent !== null && typeof agent === 'object' && typeof agent.label === 'string' && agent.label !== ''
        ? agent.label
        : String(agent === null || typeof agent !== 'object' ? agent : agent.id);
    }

    /** @returns the six-dot drag grip. */
    function Grip() {
      const dots = [];
      for (const cx of [0, 6]) {
        for (const cy of [0, 6, 12]) dots.push(h('circle', { key: `${cx}-${cy}`, cx: cx + 2, cy: cy + 1, r: 1.2 }));
      }
      return h(
        'span',
        { className: 'aef-grip', 'aria-hidden': 'true' },
        h('svg', { width: 10, height: 14, viewBox: '0 0 10 14', fill: 'currentColor' }, dots),
      );
    }

    /** @returns the crosshair glyph of the "reset position" control. */
    function Target() {
      return h(
        'svg',
        { width: 13, height: 13, viewBox: '0 0 14 14', fill: 'none', stroke: 'currentColor', strokeWidth: 1.3, 'aria-hidden': 'true' },
        h('circle', { cx: 7, cy: 7, r: 4.2 }),
        h('circle', { cx: 7, cy: 7, r: 1.1, fill: 'currentColor', stroke: 'none' }),
        h('path', { d: 'M7 1v2.6M7 10.4V13M1 7h2.6M10.4 7H13', strokeLinecap: 'round' }),
      );
    }

    /**
     * One selectable row of the window.
     * @param props - row data, its active flag, the busy flag, and the pick callback.
     * @returns the row button.
     */
    function Row(props) {
      const { row, active, busy, onPick } = props;
      return h(
        'button',
        {
          type: 'button',
          className: 'aef-row',
          'aria-pressed': active ? 'true' : 'false',
          disabled: busy,
          title: row.id,
          onClick: () => onPick(row.id),
        },
        h('span', { className: 'aef-check', 'aria-hidden': 'true' }, active ? '✓' : ''),
        h(
          'span',
          { className: 'aef-rowMain' },
          h('span', { className: 'aef-rowLabel' }, row.label),
          row.meta === '' ? null : h('span', { className: 'aef-rowMeta' }, row.meta),
        ),
      );
    }

    /**
     * The floating emulation switcher.
     * @param props - the injected face (`faceFor`/`refreshProjections`/`selectAgent`), the framework's `useSessions` hook, and the locale `t` seat.
     * @returns the expanded card, or the collapsed pill.
     */
    function AgentEmulationFloat(props) {
      const { useSessions, faceFor, refreshProjections, selectAgent, t } = props;
      const sessionId = useSessions(currentSessionId);
      // Re-resolve the face once after a baseline read settles: a session whose
      // binding (or value) did not exist on the first render has no
      // subscription yet, so the seeded store would otherwise go unnoticed.
      const [readTick, setReadTick] = React.useState(0);
      const face = React.useMemo(
        () => (sessionId === undefined ? undefined : faceFor(sessionId)),
        [sessionId, faceFor, readTick],
      );
      const subscribe = React.useMemo(
        () => (face === undefined ? subscribeAbsent : (notify) => face.subscribe(notify)),
        [face],
      );
      const getSnapshot = React.useMemo(
        () => (face === undefined ? getAbsent : () => face.getSnapshot()),
        [face],
      );
      const value = React.useSyncExternalStore(subscribe, getSnapshot);

      const [open, setOpen] = React.useState(readOpen);
      const [anchor, setAnchor] = React.useState(readAnchor);
      const [busy, setBusy] = React.useState(false);
      const [note, setNote] = React.useState(null);
      const cardRef = React.useRef(null);
      const pillRef = React.useRef(null);
      const askedRef = React.useRef(new Set());
      /** Active press-then-drag session, or null when no pointer is down on the window. */
      const dragRef = React.useRef(null);
      /** Set for the click that follows a real drag, so it does not pick a row or expand the pill. */
      const suppressClickRef = React.useRef(false);

      /**
       * Keep the anchor inside the current viewport, measured from the mounted
       * node so both the card and the pill size correctly.
       * @param current - the requested anchor.
       * @returns the same anchor when it already fits, otherwise a clamped copy.
       */
      const clampAnchor = React.useCallback((current) => {
        const node = cardRef.current !== null ? cardRef.current : pillRef.current;
        const rect = node === null || node === undefined ? undefined : node.getBoundingClientRect();
        const width = rect === undefined ? 320 : rect.width;
        const height = rect === undefined ? 96 : rect.height;
        const right = clamp(current.right, MARGIN, window.innerWidth - width - MARGIN);
        const top = clamp(current.top, MARGIN, window.innerHeight - height - MARGIN);
        return right === current.right && top === current.top ? current : { right, top };
      }, []);

      // Re-fit the window when the viewport or its own size (expand/collapse)
      // changes, so a remembered anchor can never leave it off screen.
      React.useEffect(() => {
        const onResize = () => setAnchor((current) => clampAnchor(current));
        setAnchor((current) => clampAnchor(current));
        window.addEventListener('resize', onResize);
        return () => window.removeEventListener('resize', onResize);
      }, [clampAnchor, open]);

      React.useEffect(() => {
        writeJson(OPEN_KEY, open);
      }, [open]);
      React.useEffect(() => {
        writeJson(ANCHOR_KEY, anchor);
      }, [anchor]);

      // A session opened before this plugin registered its projection carries no
      // value for the key; ask the Controller for a complete baseline once per
      // session. Absent capability (an older Host, no key) stays silent.
      React.useEffect(() => {
        if (sessionId === undefined || value !== undefined) return;
        if (askedRef.current.has(sessionId)) return;
        askedRef.current.add(sessionId);
        try {
          Promise.resolve(refreshProjections(sessionId)).then(() => setReadTick((tick) => tick + 1), noop);
        } catch {
          // The Controller can refuse a generation that ended underneath us.
        }
      }, [sessionId, value, refreshProjections]);

      /**
       * Arm one drag session from a pointerdown anywhere on the window. The
       * press only becomes a drag once it travels past {@link DRAG_THRESHOLD},
       * so plain clicks keep their ordinary meaning.
       * @param event - the React pointerdown event; its currentTarget is the moved node.
       */
      const startDragSession = React.useCallback((event) => {
        if (event.pointerType === 'mouse' && event.button !== 0) return;
        const target = event.target;
        if (target !== null && typeof target.closest === 'function') {
          // A press on a scrollable region's own scrollbar must scroll, not drag.
          const scrollable = target.closest('.aef-list, .aef-note');
          const native = event.nativeEvent;
          if (scrollable !== null && native !== undefined && native.offsetX > scrollable.clientWidth) return;
        }
        const node = event.currentTarget;
        if (node === null || node === undefined || typeof node.getBoundingClientRect !== 'function') return;
        const rect = node.getBoundingClientRect();
        dragRef.current = {
          pointerId: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          right: Math.max(0, window.innerWidth - rect.right),
          top: rect.top,
          width: rect.width,
          height: rect.height,
          moved: false,
        };
      }, []);

      // One window-level listener set per mounted window: window listeners keep
      // tracking the pointer even when it leaves the card, which element-level
      // handlers (and a failed pointer capture) do not.
      React.useEffect(() => {
        const release = (event) => {
          const session = dragRef.current;
          if (session === null || event.pointerId !== session.pointerId) return;
          dragRef.current = null;
          if (!session.moved) return;
          suppressClickRef.current = true;
          window.setTimeout(() => {
            suppressClickRef.current = false;
          }, 0);
        };
        const onMove = (event) => {
          const session = dragRef.current;
          if (session === null || event.pointerId !== session.pointerId) return;
          if (event.buttons === 0) {
            dragRef.current = null;
            return;
          }
          const dx = event.clientX - session.x;
          const dy = event.clientY - session.y;
          if (!session.moved) {
            if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
            session.moved = true;
          }
          if (event.cancelable) event.preventDefault();
          setAnchor({
            right: clamp(session.right - dx, MARGIN, window.innerWidth - session.width - MARGIN),
            top: clamp(session.top + dy, MARGIN, window.innerHeight - session.height - MARGIN),
          });
        };
        const onBlur = () => {
          dragRef.current = null;
        };
        window.addEventListener('pointermove', onMove, { passive: false });
        window.addEventListener('pointerup', release);
        window.addEventListener('pointercancel', release);
        window.addEventListener('blur', onBlur);
        return () => {
          window.removeEventListener('pointermove', onMove);
          window.removeEventListener('pointerup', release);
          window.removeEventListener('pointercancel', release);
          window.removeEventListener('blur', onBlur);
        };
      }, []);

      const agents = value !== null && typeof value === 'object' && Array.isArray(value.agents) && value.agents.length > 0
        ? value.agents
        : FALLBACK_AGENTS;
      const explicit = value !== null && typeof value === 'object' && value.explicit === true;
      const selection = value !== null && typeof value === 'object' && typeof value.selection === 'string' ? value.selection : null;
      const active = explicit ? selection ?? OFF : OFF;
      const activeAgent = agents.find((agent) => agent.id === active);
      const currentLabel = active === OFF ? t('offLabel') : (activeAgent === undefined ? active : labelOf(activeAgent));
      const isOn = active !== OFF;

      const choose = React.useCallback(
        async (id) => {
          if (sessionId === undefined || busy) return;
          setBusy(true);
          setNote({ text: t('switching'), level: 'info' });
          try {
            const result = await selectAgent(sessionId, id);
            if (result === undefined || result === null) {
              setNote({ text: t('noBridge'), level: 'error' });
              return;
            }
            if (result.ok !== true) {
              const code = result.error === undefined ? '' : result.error.code;
              const message = result.error === undefined ? '' : result.error.message;
              setNote({ text: [code, message].filter(Boolean).join(' ') || t('failed'), level: 'error' });
              return;
            }
            if (result.value === undefined) {
              setNote({ text: t('unknownCommand'), level: 'error' });
              return;
            }
            const outcome = result.value.result;
            const reported = outcome !== null && typeof outcome === 'object' && typeof outcome.text === 'string' && outcome.text !== ''
              ? outcome.text
              : t('done');
            const text = HOST_OFF_SENTENCE.test(reported.trim()) ? t('offDone') : reported;
            setNote({ text, level: outcome !== null && typeof outcome === 'object' && outcome.kind === 'error' ? 'error' : 'success' });
          } catch (error) {
            setNote({ text: error !== null && typeof error === 'object' && typeof error.message === 'string' ? error.message : String(error), level: 'error' });
          } finally {
            setBusy(false);
          }
        },
        [sessionId, busy, selectAgent, t],
      );

      /** Row pick that ignores the click a finished drag leaves behind. */
      const pickRow = React.useCallback(
        (id) => {
          if (suppressClickRef.current) return;
          choose(id);
        },
        [choose],
      );

      /** Expand from the pill, ignoring the click a finished drag leaves behind. */
      const expand = React.useCallback(() => {
        if (suppressClickRef.current) return;
        setOpen(true);
      }, []);

      /** Restore the default top-right position. */
      const resetPosition = React.useCallback(() => {
        setAnchor({ right: DEFAULT_ANCHOR.right, top: DEFAULT_ANCHOR.top });
      }, []);

      const style = { right: anchor.right, top: anchor.top };

      if (!open) {
        return h(
          React.Fragment,
          null,
          h('style', { key: 'css', dangerouslySetInnerHTML: { __html: CSS } }),
          h(
            'div',
            {
              key: 'pill',
              ref: pillRef,
              className: 'aef-pill',
              style,
              role: 'button',
              tabIndex: 0,
              'aria-label': `${t('title')} — ${currentLabel}`,
              title: t('dragHint'),
              onPointerDown: startDragSession,
              onClick: expand,
              onKeyDown: (event) => {
                if (event.key === 'Enter' || event.key === ' ') {
                  event.preventDefault();
                  setOpen(true);
                }
              },
            },
            h('span', { className: 'aef-dot', 'data-on': isOn ? 'true' : 'false' }),
            h('span', { className: 'aef-pillText' }, t('pill', { name: currentLabel })),
          ),
        );
      }

      // The default row is the harness's own prompt (`/agent off`). A catalog
      // entry carrying that same label (the `dsh` snapshot) is not listed: two
      // identically named rows would be indistinguishable, and the mode a
      // person means by that name is the default one. `/agent dsh` still works
      // for anyone who wants the archived text.
      const offLabel = t('offLabel');
      const listed = agents.filter((agent) => labelOf(agent) !== offLabel);
      const rows = [
        {
          id: OFF,
          label: offLabel,
          meta: explicit ? t('defaultMode') : `${t('defaultMode')} · ${t('followDefault')}`,
        },
        ...listed.map((agent) => ({
          id: agent.id,
          label: labelOf(agent),
          meta: [typeof agent.version === 'string' ? agent.version : '', agent.id].filter(Boolean).join(' · '),
        })),
      ];

      let noteText = t('hint');
      let noteLevel = 'info';
      if (note !== null) {
        noteText = note.text;
        noteLevel = note.level;
      } else if (sessionId === undefined) {
        noteText = t('noSession');
      } else if (value === undefined) {
        noteText = t('reading');
      }

      return h(
        React.Fragment,
        null,
        h('style', { key: 'css', dangerouslySetInnerHTML: { __html: CSS } }),
        h(
          'section',
          {
            key: 'card',
            ref: cardRef,
            className: 'aef-card',
            style,
            role: 'dialog',
            'aria-label': t('title'),
            // The whole window is the drag surface; a press that does not move
            // still reaches the row or button underneath it.
            onPointerDown: startDragSession,
            onKeyDown: (event) => {
              if (event.key === 'Escape') {
                event.stopPropagation();
                setOpen(false);
              }
            },
          },
          h(
            'header',
            { className: 'aef-head', title: t('dragHint') },
            h(Grip, { key: 'grip' }),
            h('span', { className: 'aef-dot', 'data-on': isOn ? 'true' : 'false' }),
            h('span', { className: 'aef-title' }, t('title')),
            h(
              'button',
              {
                type: 'button',
                className: 'aef-icon',
                'aria-label': t('resetPosition'),
                title: t('resetPosition'),
                onClick: resetPosition,
              },
              h(Target, { key: 'reset' }),
            ),
            h(
              'button',
              {
                type: 'button',
                className: 'aef-icon',
                'aria-label': t('collapse'),
                title: t('collapse'),
                onClick: () => setOpen(false),
              },
              '–',
            ),
          ),
          h(
            'div',
            { className: 'aef-list', role: 'group' },
            rows.map((row) =>
              h(Row, {
                key: row.id,
                row,
                active: row.id === active,
                busy: busy || sessionId === undefined,
                onPick: pickRow,
              }),
            ),
          ),
          h('div', { className: 'aef-note', 'data-level': noteLevel }, noteText),
        ),
      );
    }

    return {
      inject: ['slots', 'sessions', 'remote', 'remote.commands', 'locale'],
      apply(ctx) {
        ctx.effect(() => ctx.locale.register(LOCALE_NS, 'zh', ZH), 'agent-mode-change: locale zh');
        ctx.effect(() => ctx.locale.register(LOCALE_NS, 'en', EN), 'agent-mode-change: locale en');
        ctx.effect(
          () =>
            ctx.slots.inject('shell.overlay', () =>
              ctx.slots.register(
                {
                  name: 'shell.overlay',
                  id: 'agent-mode-change',
                  order: 46,
                  locale: LOCALE_NS,
                  inject: () => ({
                    /**
                     * The projection face of one session, or undefined while the
                     * capability is absent.
                     * @param sessionId - the session to read.
                     * @returns the key's observable snapshot face.
                     */
                    faceFor(sessionId) {
                      const sessions = ctx.sessions;
                      const binding = sessions === undefined ? undefined : sessions.binding(sessionId);
                      const session = binding === undefined ? undefined : binding.session;
                      if (session === undefined || session.projections === undefined) return undefined;
                      return session.projections.faceOf(PROJECTION_KEY);
                    },
                    /**
                     * Ask the Controller for a complete projection baseline.
                     * @param sessionId - the session to read.
                     * @returns completion of the read.
                     */
                    refreshProjections(sessionId) {
                      const sessions = ctx.sessions;
                      return sessions === undefined ? Promise.resolve() : sessions.refreshProjections(sessionId);
                    },
                    /**
                     * Run the shipped `/agent <id>` command for one session.
                     * @param sessionId - the session to switch.
                     * @param id - catalog id, or `off`.
                     * @returns the remote admission result, or undefined without the namespace.
                     */
                    selectAgent(sessionId, id) {
                      const remote = ctx.remote;
                      if (remote === undefined || remote.commands === undefined) return Promise.resolve(undefined);
                      const line = id === OFF ? '/agent off' : `/agent ${id}`;
                      return remote.commands.execute(sessionId, line, []);
                    },
                  }),
                },
                AgentEmulationFloat,
              ),
            ),
          'agent-mode-change: floating window',
        );
      },
    };
  },
});
