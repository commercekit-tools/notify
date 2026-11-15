import { describe, expect, it } from 'vitest';
import { mkdtemp, readFile, writeFile, copyFile, rm, readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { getNotificationStyle, validateNotificationEvent } from '@commercekit-tools/notification-contract';

async function bundleRun(
  event: string,
  provider: 'slack' | 'teams-workflow',
  options: {
    httpStatus?: number;
    failOn?: string;
    exitCode?: number;
    extraInputs?: Record<string, string>;
    useFile?: boolean;
    outputFailures?: number;
  } = {},
) {
  const dir = await mkdtemp(join(tmpdir(), 'notify-consistent-bundle-'));
  const webhook =
    provider === 'slack'
      ? 'https://hooks.slack.com/services/synthetic/fake/private'
      : 'https://public.example.test/private/synthetic-hook';
  try {
    await copyFile(new URL('../dist/index.js', import.meta.url), join(dir, 'index.mjs'));
    await writeFile(join(dir, 'output'), '');
    await writeFile(join(dir, 'summary'), '');
    if (options.useFile) await writeFile(join(dir, 'event.json'), event);
    await writeFile(
      join(dir, 'preload.mjs'),
      `import fs from 'node:fs';
      import {syncBuiltinESMExports} from 'node:module';
      const {writeFileSync} = fs;
      const originalAppend = fs.appendFileSync;
      let outputFailures = ${options.outputFailures ?? 0};
      fs.appendFileSync = (path, ...args) => {
        if(String(path) === ${JSON.stringify(join(dir, 'output'))} && outputFailures > 0) { outputFailures--; throw new Error('Synthetic private output failure.'); }
        return originalAppend(path, ...args);
      };
      syncBuiltinESMExports();
      globalThis.fetch = async (url, options) => {
        if(String(url) !== ${JSON.stringify(webhook)}) throw new Error('Unexpected synthetic provider target.');
        writeFileSync('payload.json', options.body);
        return new Response('', {status: ${options.httpStatus ?? 200}});
      };`,
    );
    const result = spawnSync(process.execPath, ['--import', join(dir, 'preload.mjs'), join(dir, 'index.mjs')], {
      cwd: dir,
      env: {
        INPUT_PROVIDER: provider,
        'INPUT_EVENT-JSON': options.useFile ? '' : event,
        ...(options.useFile ? { 'INPUT_EVENT-FILE': join(dir, 'event.json') } : {}),
        'INPUT_WEBHOOK-URL': webhook,
        'INPUT_FAIL-ON-NOTIFICATION-ERROR': options.failOn ?? 'false',
        GITHUB_OUTPUT: join(dir, 'output'),
        GITHUB_STEP_SUMMARY: join(dir, 'summary'),
        ...options.extraInputs,
      },
      encoding: 'utf8',
      timeout: 15000,
    });
    if (result.error) throw result.error;
    expect(result.status, result.stdout + result.stderr).toBe(options.exitCode ?? 0);
    const payload = await readFile(join(dir, 'payload.json'), 'utf8').catch(() => '');
    const output = await readFile(join(dir, 'output'), 'utf8');
    const summary = await readFile(join(dir, 'summary'), 'utf8');
    const publicLogs = (result.stdout + result.stderr)
      .split(/\r?\n/u)
      .filter((line) => !line.startsWith('::add-mask::'))
      .join('\n');
    for (const text of [payload, output, summary, publicLogs]) {
      expect(text).not.toContain(webhook);
      expect(text).not.toContain(encodeURIComponent(webhook));
    }
    for (const name of ['provider', 'event-json', 'event-file', 'webhook-url', 'fail-on-notification-error'])
      expect(summary).toContain(name);
    expect(summary).toContain('Result');
    expect(summary).toContain('Inputs');
    expect(summary).not.toContain(dir);
    return { payload, output, summary, publicLogs };
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

const fixtures = (await readdir(new URL('./fixtures/events/', import.meta.url)))
  .filter((name) => name.endsWith('.json'))
  .sort();
describe('actual standalone bundle without node_modules, registry credentials or live providers', () => {
  for (const provider of ['slack', 'teams-workflow'] as const)
    for (const fixture of fixtures)
      it(`${provider}: renders ${fixture} with source semantics and a successful delivery summary`, async () => {
        const source = await readFile(new URL(`./fixtures/events/${fixture}`, import.meta.url), 'utf8');
        const event = validateNotificationEvent(JSON.parse(source));
        const result = await bundleRun(source, provider);
        expect(result.output).toMatch(/delivered<<[^\n]+\ntrue\n/);
        expect(result.output).toMatch(/attempts<<[^\n]+\n1\n/);
        expect(result.output).toMatch(new RegExp(`status<<[^\\n]+\\n${event.status}\\n`));
        for (const title of ['Result', 'Inputs', 'Issues']) expect(result.payload).toContain(title);
        expect(result.payload).toContain(getNotificationStyle(event.status).icon);
        expect(result.summary).toContain('✅');
        expect(result.summary).toContain('The notification was delivered.');
        expect(result.summary).toContain(event.eventType);
        expect(result.summary).toContain(event.status);
        for (const name of Object.keys(event.data.inputs ?? {})) expect(result.payload).toContain(name);
      });
  for (const provider of ['slack', 'teams-workflow'] as const)
    for (const failOn of ['false', 'true'])
      it(`${provider}: preserves ${failOn === 'true' ? 'fatal failure' : 'nonfatal warning'} delivery policy in outputs and summary`, async () => {
        const source = await readFile(new URL('./fixtures/events/build-success.json', import.meta.url), 'utf8');
        const result = await bundleRun(source, provider, {
          httpStatus: 400,
          failOn,
          exitCode: failOn === 'true' ? 1 : 0,
        });
        expect(result.output).toMatch(/delivered<<[^\n]+\nfalse\n/);
        expect(result.output).toMatch(/attempts<<[^\n]+\n1\n/);
        expect(result.summary).toContain(failOn === 'true' ? '❌' : '⚠️');
        expect(result.summary).toContain('HTTP 400');
        expect(result.summary).toContain('The notification was not delivered.');
        expect(result.summary).toContain('Source outcome');
      });
  for (const provider of ['slack', 'teams-workflow'] as const)
    for (const status of ['failure', 'warning', 'cancelled', 'internal-error'] as const)
      it(`${provider}: renders setup ${status} without confusing source and delivery outcomes`, async () => {
        const event = JSON.parse(
          await readFile(new URL('./fixtures/events/setup-success.json', import.meta.url), 'utf8'),
        );
        event.status = status;
        if (status === 'failure' || status === 'internal-error')
          event.data.error = { code: 'setup-failed', message: 'CLI installation verification failed.' };
        if (status === 'warning')
          event.data.issues = [{ code: 'setup-attention', message: 'A setup condition requires attention.' }];
        const result = await bundleRun(JSON.stringify(event), provider);
        expect(result.payload).toContain(getNotificationStyle(status).icon);
        expect(result.output).toMatch(new RegExp(`status<<[^\\n]+\\n${status}\\n`));
        expect(result.summary).toContain('✅');
        expect(result.summary).toContain('The notification was delivered.');
      });
  it('reads an event file without exposing its path or payload in its own summary', async () => {
    const source = await readFile(new URL('./fixtures/events/setup-success.json', import.meta.url), 'utf8');
    const result = await bundleRun(source, 'teams-workflow', { useFile: true });
    expect(result.summary).toContain('VALUE OMITTED');
    expect(result.summary).not.toContain(source);
    expect(result.summary).not.toContain('event.json');
    expect(result.output).toMatch(/delivered<<[^\n]+\ntrue\n/);
  });
  for (const outputFailures of [1, 2])
    it(`keeps accepted delivery authoritative after ${outputFailures} output-file writes fail`, async () => {
      const source = await readFile(new URL('./fixtures/events/build-success.json', import.meta.url), 'utf8');
      const result = await bundleRun(source, 'teams-workflow', { outputFailures, exitCode: 1 });
      expect(result.payload).toContain('CCv2 build succeeded');
      expect(result.output).not.toMatch(/delivered<<[^\n]+\nfalse\n/);
      expect(result.output).toMatch(/attempts<<[^\n]+\n1\n/);
      expect(result.summary).toContain('The notification was delivered.');
      expect(result.summary).toContain('notification-output-failure');
      expect(result.summary).not.toContain('notification-not-delivered');
      expect(result.publicLogs).not.toContain('Synthetic private output failure');
    });
  it('reports invalid JSON as a failure with safely omitted input content', async () => {
    const source = JSON.stringify({ secret: ['eyJsynthetic', 'payload', 'signature'].join('.') });
    const result = await bundleRun(source, 'slack', { exitCode: 1 });
    expect(result.payload).toBe('');
    expect(result.summary).toContain('❌');
    expect(result.summary).toContain('Invalid NotificationEvent');
    expect(result.summary).toContain('VALUE OMITTED');
    expect(result.summary).not.toContain(source);
  });
  for (const provider of ['slack', 'teams-workflow'] as const)
    it(`${provider}: redacts reflected current webhook values in source errors, links and context`, async () => {
      const webhook =
        provider === 'slack'
          ? 'https://hooks.slack.com/services/synthetic/fake/private'
          : 'https://public.example.test/private/synthetic-hook';
      const source = JSON.parse(
        await readFile(new URL('./fixtures/events/build-failure.json', import.meta.url), 'utf8'),
      );
      const lowerEncoded = encodeURIComponent(webhook).replace(/%[0-9A-F]{2}/gu, (part) => part.toLowerCase());
      source.data.error = { message: `Rejected ${webhook} and ${encodeURIComponent(webhook)} and ${lowerEncoded}` };
      source.context = { repository: 'synthetic/project', runUrl: webhook };
      source.links = [{ label: 'Private destination', url: webhook }];
      const result = await bundleRun(JSON.stringify(source), provider);
      expect(result.payload).toContain('REDACTED');
      expect(result.payload).not.toContain(lowerEncoded);
      expect(result.summary).toContain('✅');
      expect(result.output).toMatch(/delivered<<[^\n]+\ntrue\n/);
    });
});
