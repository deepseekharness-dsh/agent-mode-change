/**
 * Render smoke test for the browser half.
 *
 * The browser bundle cannot be imported: it registers itself through
 * `window.__ModuleLoader__` and takes React from the page. This test supplies a
 * minimal React stand-in (function components, class components, and error
 * boundaries), captures the component from the plugin's own
 * `ctx.slots.register(...)` call, and drives it through the states a person can
 * actually reach.
 *
 * Why it exists: a component that throws during render is isolated by the slot
 * machinery, so its registration stays listed in `shell.overlay` while the window
 * simply disappears with nothing in the UI to explain it. This test fails loudly
 * on that class of regression — and covers the in-bundle error boundary that now
 * degrades such a failure to a visible warning pill.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');

/** Minimal React stand-in: function/class components plus error boundaries. */
function createReactStub() {
  class Component {
    /** @param props - component props. */
    constructor(props) {
      this.props = props;
      this.state = {};
    }
  }
  return {
    Component,
    api: {
      Component,
      Fragment: Symbol('Fragment'),
      createElement: (type, props, ...children) => ({ type, props: { ...(props ?? {}), children } }),
      useState: (init) => [typeof init === 'function' ? init() : init, () => {}],
      useRef: (init) => ({ current: init }),
      useMemo: (fn) => fn(),
      useCallback: (fn) => fn,
      useEffect: (fn) => {
        fn();
      },
      useSyncExternalStore: (_subscribe, getSnapshot) => getSnapshot(),
    },
  };
}

/**
 * Render one element tree the way React would: call function components, mount
 * class components, and honour `getDerivedStateFromError` boundaries.
 * @param node - the element (or array/primitive) to render.
 * @param react - the React stand-in.
 * @returns the flattened rendered tree.
 */
function renderNode(node, react) {
  if (node === null || node === undefined || typeof node === 'boolean') return null;
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map((child) => renderNode(child, react)).filter((child) => child !== null);
  if (typeof node !== 'object') return null;

  const { type, props } = node;
  if (typeof type === 'function') {
    const isClass = type.prototype !== undefined && typeof type.prototype.render === 'function';
    if (isClass) {
      const instance = new type(props);
      const attempt = () => renderNode(instance.render(), react);
      try {
        return attempt();
      } catch (error) {
        if (typeof type.getDerivedStateFromError !== 'function') throw error;
        instance.state = { ...instance.state, ...type.getDerivedStateFromError(error) };
        if (typeof instance.componentDidCatch === 'function') instance.componentDidCatch(error);
        return attempt();
      }
    }
    return renderNode(type(props), react);
  }
  if (props?.children !== undefined) {
    // A host element keeps its own identity (React renders the tag), so the
    // className/title/style markers stay observable to textOf().
    return { type, props: { ...props, children: renderNode(props.children, react) } };
  }
  return { type, props };
}

/** Collect every string plus class/title markers from a rendered tree. */
function textOf(node, out = []) {
  if (node === null || node === undefined) return out;
  if (typeof node === 'string' || typeof node === 'number') {
    out.push(String(node));
    return out;
  }
  if (Array.isArray(node)) {
    for (const child of node) textOf(child, out);
    return out;
  }
  if (typeof node === 'object') {
    const style = node.props?.style;
    if (style !== undefined && style !== null && typeof style === 'object') out.push('[inline-style]');
    if (typeof node.props?.className === 'string') out.push(`[${node.props.className}]`);
    if (typeof node.props?.title === 'string') out.push(`[title:${node.props.title}]`);
    textOf(node.props?.children, out);
  }
  return out;
}

/**
 * Load the bundle with the stubs in place.
 * @param options - storage contents, the React stand-in, and the host context.
 * @returns the registered component and its registration options.
 */
function loadComponent({ storage = {}, react, ctx }) {
  const source = readFileSync(join(root, 'client.js'), 'utf8');
  const fakeWindow = {
    __ModuleLoader__: {
      load: (definition) => {
        fakeWindow.__definition = definition;
      },
    },
    localStorage: {
      getItem: (key) => (Object.hasOwn(storage, key) ? JSON.stringify(storage[key]) : null),
      setItem: () => {},
    },
    innerWidth: 1680,
    innerHeight: 900,
    addEventListener: () => {},
    removeEventListener: () => {},
    setTimeout: (fn) => (fn(), 1),
  };
  // eslint-disable-next-line no-new-func -- evaluating the browser bundle is the point
  new Function('window', source)(fakeWindow);
  assert.ok(fakeWindow.__definition, 'the bundle registers itself with window.__ModuleLoader__');

  const module = fakeWindow.__definition.factory((name) => {
    if (name === 'react') return react.api;
    throw new Error(`unexpected require("${name}")`);
  });

  let registered;
  module.apply({
    ...ctx,
    effect: (fn) => {
      const cleanup = fn();
      return typeof cleanup === 'function' ? cleanup : () => {};
    },
    slots: {
      inject: (_key, callback) => callback(),
      register: (opts, Component) => {
        assert.ok(Component, 'register receives a component');
        registered = { opts, Component };
        return () => {};
      },
    },
  });
  assert.ok(registered, 'apply registers exactly one overlay entry');
  return registered;
}

/** The subset of the Chinese dictionary this test asserts on. */
const ZH = {
  title: 'Agent 模式',
  pill: '模式 · {name}',
  offLabel: 'DeepSeek Harness',
  defaultMode: '默认模式',
  followDefault: '跟随部署默认',
  hint: '点选一行即切换本会话的 Agent 模式',
  reading: '读取会话状态…',
  noSession: '当前没有打开的会话',
  collapse: '收起为小标',
  resetPosition: '回到默认位置',
  dragHint: '按住窗口任意位置拖动',
  offDone: '已切换到 DeepSeek Harness 模式',
  done: '已提交',
};

/**
 * Build the ctx and props for one render.
 * @param value - the projection value the session binding exposes.
 * @param storage - localStorage contents.
 * @param overrides - props to override or remove (pass undefined to drop one).
 * @returns the registered component plus its props.
 */
function scenario(value, storage = {}, overrides = {}) {
  const react = createReactStub();
  const face = { getSnapshot: () => value, subscribe: () => () => {} };
  const ctx = {
    locale: { register: () => () => {} },
    sessions: {
      binding: () => ({ session: { projections: { faceOf: () => face } } }),
      refreshProjections: () => Promise.resolve(),
    },
    remote: { commands: { execute: () => Promise.resolve({ ok: true, value: { result: { kind: 'success', text: 'ok' } } }) } },
  };
  const registered = loadComponent({ storage, react, ctx });
  const props = {
    ...registered.opts.inject(),
    useSessions: (selector) => selector({ ids: ['s1'], byId: { s1: { retainedBy: { mainView: 1 } } } }),
    t: (key, params) => {
      const raw = ZH[key] ?? key;
      return params === undefined
        ? raw
        : raw.replace(/\{(\w+)\}/g, (match, name) => (name in params ? String(params[name]) : match));
    },
    ...overrides,
  };
  return { registered, props, react };
}

/** Render the registered occupant once and return the collected text. */
function renderOnce(scene) {
  return textOf(renderNode({ type: scene.registered.Component, props: scene.props }, scene.react)).join('|');
}

const AGENTS = [
  { id: 'claude-code', label: 'Claude Code', version: '2.1.283' },
  { id: 'codex', label: 'Codex CLI', version: '0.157.1' },
  { id: 'dsh', label: 'DeepSeek Harness', version: '0.1.7-rc.2' },
  { id: 'weird', label: '', version: '1' },
];

test('renders the card with every catalog mode when a session has a projection', () => {
  const text = renderOnce(scenario({ explicit: true, selection: 'codex', agents: AGENTS }));
  assert.match(text, /\[aef-card\]/, 'the expanded card is rendered');
  assert.match(text, /Claude Code/);
  assert.match(text, /Codex CLI/);
  assert.match(text, /weird/, 'an entry with an empty label falls back to its id');
  const offRows = text.split('|').filter((part) => part === ZH.offLabel).length;
  assert.equal(offRows, 1, 'the same-named archived entry is not listed beside the default row');
});

test('renders the card without a projection value and without a session', () => {
  const text = renderOnce(scenario(undefined));
  assert.match(text, /\[aef-card\]/, 'the card still renders');
  assert.match(text, new RegExp(ZH.reading), 'it explains that the state is still being read');
});

test('renders the collapsed pill from the stored state', () => {
  const text = renderOnce(scenario({ explicit: true, selection: null, agents: AGENTS }, { 'agent-mode-change/open': false }));
  assert.match(text, /\[aef-pill\]/, 'the pill is rendered when collapsed');
  assert.doesNotMatch(text, /\[aef-card\]/);
  assert.match(text, new RegExp(`模式 · ${ZH.offLabel}`), 'the pill names the mode in force');
});

test('survives malformed projection values and catalog rows', () => {
  for (const value of [
    null,
    {},
    { explicit: 'yes', selection: 42, agents: 'not-an-array' },
    { explicit: true, selection: 'codex', agents: [] },
    { explicit: true, selection: 'codex', agents: [null, 7, { id: 'x' }] },
    { explicit: true, selection: 'nope', agents: AGENTS },
  ]) {
    assert.doesNotThrow(() => renderOnce(scenario(value)), `renders for value ${JSON.stringify(value)}`);
  }
});

test('degrades to a visible warning pill instead of vanishing when the window throws', () => {
  // Drop the locale seat: the window's first `t(...)` call now throws, exactly
  // like any other unexpected render error would.
  const text = renderOnce(scenario({ explicit: true, selection: 'codex', agents: AGENTS }, {}, { t: undefined }));
  assert.match(text, /\[aef-crash\]/, 'the boundary rendered its fallback');
  assert.match(text, /渲染失败/, 'the fallback is user-visible');
  assert.match(text, /\[title:/, 'the failure reason rides the tooltip');
});

test('injected face tolerates missing host services', () => {
  const react = createReactStub();
  const emptyCtx = {
    locale: { register: () => () => {} },
    effect: (fn) => fn(),
    slots: { inject: (_k, cb) => cb(), register: (opts) => (emptyCtx.__opts = opts, () => {}) },
  };
  const registered = loadComponent({ storage: {}, react, ctx: emptyCtx });
  const face = registered.opts.inject();
  assert.equal(face.faceFor('s1'), undefined, 'no sessions service yields no face');
  assert.doesNotThrow(() => face.selectAgent('s1', 'codex'), 'no remote namespace stays silent');
});
