import { expect, it, vi } from 'vitest';
import { mkdtemp, readFile, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
vi.mock('@commercekit-tools/notification-contract', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@commercekit-tools/notification-contract')>();
  return { ...actual, parseNotificationEventJson: vi.fn(actual.parseNotificationEventJson) };
});
import * as contract from '@commercekit-tools/notification-contract';
import metadata from '@commercekit-tools/notification-contract/package.json' with { type: 'json' };
import schema from '@commercekit-tools/notification-contract/schema' with { type: 'json' };
import { parseEvent } from '../src/event/parse.js';
import { enrichContext } from '../src/event/enrich-context.js';
import { validateEvent } from '../src/event/validate.js';
import { createPresentation } from '../src/presentation/create-presentation.js';
import { renderSlack } from '../src/providers/slack/render.js';
import { renderTeams } from '../src/providers/teams-workflow/render.js';

const text = await readFile(new URL('./fixtures/events/build-success.json', import.meta.url), 'utf8');

it('uses the pinned package and its public schema export', () => {
  expect(metadata.version).toBe('0.0.2');
  expect(schema.properties.schemaVersion.const).toBe(1);
});

it('passes JSON and regular-file text to the package parser with the same byte limit', async () => {
  const spy = vi.mocked(contract.parseNotificationEventJson);
  spy.mockClear();
  const dir = await mkdtemp(join(tmpdir(), 'notify-package-'));
  try {
    const file = join(dir, 'event.json');
    await writeFile(file, text);
    const fromJson = await parseEvent({ json: text });
    expect(await parseEvent({ file })).toEqual(fromJson);
    expect(spy).toHaveBeenCalledTimes(2);
    expect(spy).toHaveBeenNthCalledWith(1, text, { maxBytes: 65536 });
    expect(spy).toHaveBeenNthCalledWith(2, text, { maxBytes: 65536 });
  } finally {
    spy.mockClear();
    await rm(dir, { recursive: true, force: true });
  }
});

it('preserves producer metadata and fills missing values without inventing a server', async () => {
  const event = await parseEvent({ json: text });
  event.context = { repository: 'producer/project', actor: 'producer' };
  const env = { GITHUB_REPOSITORY: 'runner/project', GITHUB_RUN_ID: '123', GITHUB_ACTOR: 'runner' };
  const noServer = enrichContext(event, env);
  expect(noServer.context).toEqual({ repository: 'producer/project', actor: 'producer', runId: '123' });
  const withServer = enrichContext(event, { GITHUB_RUN_ID: '123', GITHUB_SERVER_URL: 'https://github.example.org' });
  expect(withServer.context?.runUrl).toBe('https://github.example.org/producer/project/actions/runs/123');
  validateEvent(withServer);
});

it.each(['links', 'runUrl'])('fails unsafe %s before rendering', async (field) => {
  const event = JSON.parse(text);
  if (field === 'links') event.links = [{ label: 'Unsafe', url: 'https://user:pass@example.test/path' }];
  else event.context.runUrl = 'javascript:alert(1)';
  await expect(parseEvent({ json: JSON.stringify(event) })).rejects.toThrow();
});

it('accepts additive v1 fields without rendering them and preserves Notify secret redaction', async () => {
  const input = JSON.parse(text);
  input.unknown = 'PRIVATE_UNKNOWN_FIELD';
  input.data.unknown = 'PRIVATE_UNKNOWN_FIELD';
  input.data.buildName = 'token=synthetic-secret';
  input.data.buildCode = 'https://example.test/hook?sig=synthetic-secret';
  const event = await parseEvent({ json: JSON.stringify(input) });
  const presentation = createPresentation(event);
  const payloads = JSON.stringify([renderSlack(presentation), renderTeams(presentation)]);
  expect(payloads).not.toContain('synthetic-secret');
  expect(payloads).not.toContain('PRIVATE_UNKNOWN_FIELD');
  expect(payloads).toContain('[REDACTED URL]');
});

it('never echoes invalid event content in parser or validator errors', async () => {
  const event = { ...JSON.parse(text), schemaVersion: 'SECRET_INVALID_VALUE' };
  await expect(parseEvent({ json: JSON.stringify(event) })).rejects.toThrow('Invalid NotificationEvent');
  try {
    validateEvent(event);
    throw new Error('Expected validation failure');
  } catch (error) {
    expect(String(error)).not.toContain('SECRET_INVALID_VALUE');
    expect(String(error)).toContain('Invalid NotificationEvent');
  }
});
