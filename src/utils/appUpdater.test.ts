import test from 'node:test';
import assert from 'node:assert/strict';
import { compareSemver, normalizeSemver, parseVersionManifest } from './appUpdater';

test('normalizeSemver and compareSemver accurately compare release versions', () => {
  assert.deepEqual(normalizeSemver('v1.2.0'), [1, 2, 0]);
  assert.deepEqual(normalizeSemver('1.10.3-beta'), [1, 10, 3]);
  assert.equal(normalizeSemver('invalid'), null);

  assert.equal(compareSemver('1.2.1', '1.2.0'), 1);
  assert.equal(compareSemver('1.2.0', '1.2.0'), 0);
  assert.equal(compareSemver('1.2.0', '2.0.0'), -1);
  assert.equal(compareSemver('v1.10.0', 'v1.2.9'), 1);
});

test('parseVersionManifest validates manifest payloads and strips leading v', () => {
  const valid = parseVersionManifest({
    version: 'v1.3.0',
    releasedAt: '2026-12-01',
    notes: 'Новые твики',
  });
  assert.deepEqual(valid, {
    version: '1.3.0',
    releasedAt: '2026-12-01',
    notes: 'Новые твики',
    downloadUrl: undefined,
  });

  assert.equal(parseVersionManifest(null), null);
  assert.equal(parseVersionManifest({ version: 'bad' }), null);
});
