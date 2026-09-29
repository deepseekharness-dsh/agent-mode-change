import assert from 'node:assert/strict';
import test from 'node:test';

import { apply, inject, name } from '../index.js';

/**
 * Run the Host half against a capturing fake and return the single projection
 * registration it makes.
 * @returns the projection definition handed to the registry.
 */
function captureDefinition() {
  let definition;
  apply({
    sessionProjections: {
      register(candidate) {
        definition = candidate;
        return () => {};
      },
    },
  });
  assert.ok(definition, 'the Host half registers exactly one projection');
  return definition;
}

test('module identity', () => {
  assert.equal(name, 'agent-mode-change');
  assert.deepEqual(inject, ['sessionProjections']);
});

test('projects the session emulation choice', () => {
  const definition = captureDefinition();
  assert.equal(definition.key, 'agentModeChange');
  assert.equal(definition.stateVersion, 1);

  const empty = definition.init({}, 0);
  assert.deepEqual(empty, {});

  // Unrelated events must return the same reference: the registry skips
  // unchanged states, which is what keeps this unit free of downstream work.
  assert.equal(definition.apply(empty, { type: 'turn/start', seq: 1, data: {} }), empty);

  const selected = definition.apply(empty, {
    type: 'agent-emulation/select',
    seq: 2,
    data: { emulation: 'codex' },
  });
  assert.equal(selected.selection, 'codex');
  assert.notEqual(selected, empty);

  // Repeating the same choice is a no-op.
  assert.equal(
    definition.apply(selected, { type: 'agent-emulation/select', seq: 3, data: { emulation: 'codex' } }),
    selected,
  );

  const off = definition.apply(selected, {
    type: 'agent-emulation/select',
    seq: 4,
    data: { emulation: null },
  });
  assert.equal(off.selection, null);
});

test('wire view carries the selection and the installed catalog', () => {
  const definition = captureDefinition();
  const state = { selection: 'codex' };
  const view = definition.wire.view(state);

  assert.equal(view.explicit, true);
  assert.equal(view.selection, 'codex');
  assert.ok(Array.isArray(view.agents));
  assert.ok(view.agents.length >= 13, `expected the shipped catalog, got ${view.agents.length} entries`);
  for (const agent of view.agents) {
    assert.equal(typeof agent.id, 'string');
    assert.equal(typeof agent.label, 'string');
    assert.equal(typeof agent.version, 'string');
    assert.ok(agent.id.length > 0);
  }
  assert.ok(
    view.agents.some((agent) => agent.id === 'claude-code'),
    'the catalog includes the archived prompts',
  );

  // "no choice logged" must stay distinguishable from an explicit "off".
  const unlogged = definition.wire.view({});
  assert.equal(unlogged.explicit, false);
  assert.equal(unlogged.selection, null);

  // The payload crosses the wire as JSON.
  assert.deepEqual(JSON.parse(JSON.stringify(view)), view);
  assert.equal(definition.wire.viewSchema.parse(view), view);
  assert.equal(definition.stateSchema.parse(state), state);
});
