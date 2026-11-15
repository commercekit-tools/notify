import assert from 'node:assert/strict';
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import metadata from '@commercekit-tools/notification-contract/package.json' with { type: 'json' };
import schema from '@commercekit-tools/notification-contract/schema' with { type: 'json' };
import { parseNotificationEventJson } from '@commercekit-tools/notification-contract';

const root = new URL('../', import.meta.url);
const manifest = JSON.parse(await readFile(new URL('package.json', root), 'utf8'));
const candidateVersion = process.env.COMMERCEKIT_CANDIDATE_CONTRACT_VERSION;
if (candidateVersion !== undefined) {
  assert.equal(candidateVersion, '0.0.5', 'Only the reviewed cleanup notification candidate is supported.');
  assert.equal(manifest.private, true, 'Candidate validation requires a private isolated consumer.');
  assert.match(
    manifest.dependencies['@commercekit-tools/notification-contract'],
    /^file:.+\.tgz$/u,
    'Candidate validation requires an exact source-packed tarball, never a fake registry version.',
  );
  assert.equal(metadata.version, candidateVersion);
} else {
  assert.equal(metadata.version, '0.0.4');
  assert.equal(manifest.dependencies['@commercekit-tools/notification-contract'], '0.0.4');
}
assert.equal(schema.$schema, 'https://json-schema.org/draft/2020-12/schema');
assert.equal(schema.properties.schemaVersion.const, 1);
assert(!existsSync(new URL('schema/notification-event-v1.schema.json', root)), 'Local schema must not be vendored.');
const types = new Set();
const fixtures = new URL('tests/fixtures/events/', root);
for (const name of (await readdir(fixtures)).filter((name) => name.endsWith('.json'))) {
  const event = parseNotificationEventJson(await readFile(new URL(name, fixtures), 'utf8'), { maxBytes: 65536 });
  types.add(event.eventType);
}
assert.deepEqual(
  [...types].sort(),
  [
    'ccv2.build-cleanup.completed',
    'check.completed',
    'ccv2.build.started',
    'ccv2.build.completed',
    'ccv2.deployment.started',
    'ccv2.deployment.action-required',
    'ccv2.deployment.completed',
  ].sort(),
);
assert.deepEqual([...schema.properties.eventType.enum].sort(), [...types].sort());
console.log(
  candidateVersion
    ? 'UNPUBLISHED candidate contract: exact tarball, public schema export, all fixtures and supported event types verified; registry readiness remains blocked.'
    : 'Published notification contract: public schema export, all fixtures and supported event types verified.',
);
