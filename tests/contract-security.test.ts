import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, mkdir, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { parseEvent } from '../src/event/parse.js';
import { sanitize } from '../src/event/sanitize.js';
import { validateEvent } from '../src/event/validate.js';
import { validateWebhook } from '../src/delivery/url-validation.js';
import { deliver } from '../src/delivery/webhook.js';
import { retryAfterMs } from '../src/delivery/retry-after.js';
import { renderTeams } from '../src/providers/teams-workflow/render.js';
const valid = {
  schemaVersion: 1,
  eventId: 'ckevt_test',
  eventType: 'check.completed',
  status: 'success',
  occurredAt: '2026-11-01T20:20:00Z',
  source: { product: 'commercekit', component: 'cli-check' },
  data: { filesChecked: 1, errors: 0, warnings: 0 },
};
describe('input and delivery safety', () => {
  it('parses exactly one bounded event object', async () => {
    expect((await parseEvent({ json: JSON.stringify(valid) })).eventId).toBe('ckevt_test');
    await expect(parseEvent({ json: '[]' })).rejects.toThrow(/object/);
    await expect(parseEvent({ json: '{' })).rejects.toThrow(/valid JSON/);
    await expect(parseEvent({ json: 'x'.repeat(65537) })).rejects.toThrow(/64 KiB/);
    await expect(parseEvent({ json: JSON.stringify(valid), file: 'x' })).rejects.toThrow(/exactly one/);
  });
  it('loads regular relative files while rejecting missing paths, directories and symlinks', async () => {
    const dir = await mkdtemp(join(tmpdir(), 'ck-notify-'));
    try {
      const file = join(dir, 'event.json');
      await writeFile(file, JSON.stringify(valid));
      expect((await parseEvent({ file })).eventId).toBe('ckevt_test');
      await mkdir(join(dir, 'folder'));
      await expect(parseEvent({ file: join(dir, 'folder') })).rejects.toThrow(/regular/);
      await symlink(file, join(dir, 'link'));
      await expect(parseEvent({ file: join(dir, 'link') })).rejects.toThrow(/symbolic/);
      await expect(parseEvent({ file: join(dir, 'missing') })).rejects.toThrow();
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
  it('rejects unsupported schema, unsafe link and invalid data shape', () => {
    expect(() => validateEvent({ ...valid, schemaVersion: 2 })).toThrow(/version 2/);
    expect(() => validateEvent({ ...valid, links: [{ label: 'Go', url: 'javascript:alert(1)' }] })).toThrow();
    expect(() => validateEvent({ ...valid, data: { errors: -1 } })).toThrow();
    expect(() => validateEvent({ ...valid, eventType: 'unknown' })).toThrow();
  });
  it('redacts credential-like markers', () => {
    const s = sanitize(
      'Bearer fakeSecretValue client_secret=abc password=hunter token=abc Authorization: secret ghp_fakeExample https://hooks.slack.com/services/Tfake/Bfake/x https://example.test/hook?sig=secret',
    );
    for (const m of ['fakeSecretValue', 'ghp_fakeExample', 'Tfake', 'hunter', 'sig=secret']) expect(s).not.toContain(m);
  });
  it('rejects unsafe URL forms', () => {
    for (const u of [
      'http://hooks.slack.com/x',
      'https://user:pass@hooks.slack.com/x',
      'https://hooks.slack.com/x#fragment',
      'https://localhost/x',
      'https://192.168.1.5/x',
      'https://169.254.2.3/x',
      'https://[::1]/x',
    ])
      expect(() => validateWebhook(u, u.includes('slack') ? 'slack' : 'teams-workflow')).toThrow();
    expect(() => validateWebhook('https://example.local/hook', 'teams-workflow')).toThrow();
  });
  it('parses Retry-After seconds and dates with a cap', () => {
    const now = Date.parse('2026-11-01T00:00:00.000Z');
    expect(retryAfterMs('2', now)).toBe(2000);
    expect(retryAfterMs('Sun, 01 Nov 2026 00:00:03 GMT', now)).toBe(3000);
    expect(retryAfterMs('100', now)).toBe(5000);
    expect(retryAfterMs('-1', now)).toBeUndefined();
    expect(retryAfterMs('invalid', now)).toBeUndefined();
  });
  it('retries transient failures, and caps attempts at three', async () => {
    let calls = 0;
    const transient = (async () => {
      calls++;
      return new Response('', { status: 503 });
    }) as typeof fetch;
    await expect(
      deliver('teams-workflow', new URL('https://example.test/hook'), {}, transient, async () => {}),
    ).rejects.toThrow(/retry limit/);
    expect(calls).toBe(3);
  });
  it('retries transient responses and rejects permanent errors without retry', async () => {
    let count = 0;
    const mock = (async () => {
      count++;
      return new Response('', { status: count === 1 ? 429 : 200, headers: { 'retry-after': '0' } });
    }) as typeof fetch;
    expect(await deliver('slack', new URL('https://hooks.slack.com/x'), {}, mock, async () => {})).toEqual({
      attempts: 2,
    });
    count = 0;
    const bad = (async () => {
      count++;
      return new Response('', { status: 400 });
    }) as typeof fetch;
    await expect(deliver('slack', new URL('https://hooks.slack.com/x'), {}, bad, async () => {})).rejects.toThrow(
      /HTTP 400/,
    );
    expect(count).toBe(1);
  });
  it('does not retry a rejected redirect', async () => {
    let calls = 0;
    const redirected = (async () => {
      calls++;
      throw new TypeError('fetch failed', { cause: new Error('unexpected redirect') });
    }) as typeof fetch;
    await expect(
      deliver('slack', new URL('https://hooks.slack.com/x'), {}, redirected, async () => {}),
    ).rejects.toThrow(/redirects are not allowed/);
    expect(calls).toBe(1);
  });
  it('retries a timeout once and counts both attempts', async () => {
    let calls = 0;
    const timedOut = (async () => {
      calls++;
      if (calls === 1) throw new DOMException('aborted', 'AbortError');
      return new Response('', { status: 200 });
    }) as typeof fetch;
    expect(await deliver('teams-workflow', new URL('https://example.test/hook'), {}, timedOut, async () => {})).toEqual(
      { attempts: 2 },
    );
  });
  it('rejects a Teams card above the 27 KiB safety cap', () => {
    expect(() =>
      renderTeams({
        category: 'CommerceKit · Test',
        title: 'Synthetic',
        status: 'success',
        statusLabel: 'Succeeded',
        icon: '✅',
        tone: 'success',
        accent: '#168A45',
        highlights: [],
        facts: Array.from({ length: 10 }, (_, index) => ({ label: `Fact ${index}`, value: '界'.repeat(1000) })),
        actions: [],
      }),
    ).toThrow(/27 KiB/);
  });
});
