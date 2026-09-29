import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (relative) => readFileSync(join(root, relative), 'utf8');

const pkg = JSON.parse(read('package.json'));
const client = read('client.js');
const patch = read('cordis.patch.yml');

/**
 * Keys of one locale dictionary in the Client bundle.
 * @param dict - `ZH` or `EN`.
 * @returns the dictionary's key names.
 */
function dictKeys(dict) {
  const block = new RegExp(`const ${dict} = \\{([\\s\\S]*?)\\n {4}\\};`).exec(client);
  assert.ok(block, `${dict} dictionary exists`);
  return [...block[1].matchAll(/^ {6}([A-Za-z][A-Za-z0-9]*):/gm)].map((match) => match[1]);
}

/**
 * Body of one locale dictionary in the Client bundle.
 * @param dict - `ZH` or `EN`.
 * @returns the raw dictionary source.
 */
function dictBody(dict) {
  return new RegExp(`const ${dict} = \\{([\\s\\S]*?)\\n {4}\\};`).exec(client)[1];
}

test('manifest is installable as a bundle', () => {
  assert.equal(pkg.name, 'agent-mode-change');
  assert.equal(pkg.private, undefined, 'a published package is not private');
  assert.equal(pkg.license, 'MIT');
  assert.equal(pkg.type, 'module');

  // `dsh.bundle` is what makes `dsh plugin add <name>` work; `dsh.client` alone
  // is not installable.
  assert.equal(pkg.dsh.bundle.patch, './cordis.patch.yml');
  assert.equal(pkg.dsh.client.platform, 'web');
  assert.equal(pkg.dsh.client.immediately, true);
  assert.equal(pkg.exports['./client'], './client.js');
  assert.equal(pkg.exports['.'], './index.js');
  assert.ok(pkg.exports['./locale/*.json']);

  for (const file of ['index.js', 'client.js', 'cordis.patch.yml', 'icon.svg', 'README.md', 'README.en.md', 'CHANGELOG.md', 'LICENSE']) {
    assert.ok(pkg.files.includes(file), `files lists ${file}`);
  }
  assert.ok(pkg.files.includes('locale'));
});

test('bundle patch mounts this package', () => {
  assert.match(patch, /- insert:/);
  assert.match(patch, /id: agent-mode-change/);
  assert.match(patch, /name: 'agent-mode-change'/);
});

test('client bundle is well-formed and registered', () => {
  // Syntax only: the bundle is a browser module, so it cannot be imported here.
  execFileSync(process.execPath, ['--check', join(root, 'client.js')]);

  const id = /window\.__ModuleLoader__\.load\(\{\s*\n\s*id: '([^']+)'/.exec(client);
  assert.ok(id, 'the loader call carries an id');
  assert.equal(id[1], pkg.name, 'the module id equals the package name');

  assert.match(client, /ctx\.slots\.inject\('shell\.overlay'/, 'the window is registered into the overlay layer');
  assert.match(client, /id: 'agent-mode-change'/, 'the overlay entry keeps its stable id');
  assert.match(client, /locale: LOCALE_NS/, 'the window declares its locale namespace');
  assert.match(client, /ctx\.locale\.register\(LOCALE_NS, 'zh'/, 'Chinese copy is registered');
  assert.match(client, /ctx\.locale\.register\(LOCALE_NS, 'en'/, 'English copy is registered');
});

test('locale dictionaries agree and cover every lookup', () => {
  const zh = dictKeys('ZH');
  const en = dictKeys('EN');
  assert.deepEqual([...zh].sort(), [...en].sort(), 'both dictionaries define the same keys');

  const used = new Set([...client.matchAll(/\bt\('([A-Za-z][A-Za-z0-9]*)'/g)].map((match) => match[1]));
  assert.ok(used.size > 5, `expected several lookups, found ${used.size}`);
  for (const key of used) {
    assert.ok(zh.includes(key), `ZH defines "${key}"`);
    assert.ok(en.includes(key), `EN defines "${key}"`);
  }

  // The window is an "Agent 模式" switcher: the retired emulation wording must
  // not creep back into user-visible copy.
  for (const dict of ['ZH', 'EN']) {
    const body = dictBody(dict);
    assert.ok(!body.includes('关闭仿真'), `${dict} has no retired 关闭仿真 label`);
    assert.ok(!body.includes('仿真'), `${dict} has no retired 仿真 wording`);
    assert.ok(!body.includes('native prompt'), `${dict} has no retired native-prompt wording`);
  }
});
