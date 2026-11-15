import { it, expect } from 'vitest';
import { mkdtemp, readFile, writeFile, copyFile, rm } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

it('runs the standalone bundle without node_modules or registry authentication using a mocked provider', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'notify-bundle-'));
  try {
    await copyFile(new URL('../dist/index.js', import.meta.url), join(dir, 'index.mjs'));
    await writeFile(join(dir, 'output'), '');
    await writeFile(
      join(dir, 'preload.mjs'),
      `import { writeFileSync } from 'node:fs';
       globalThis.fetch = async (_url, options) => {
         writeFileSync('payload.json', options.body);
         return new Response('', { status: 200 });
       };`,
    );
    const event = await readFile(new URL('./fixtures/events/build-success.json', import.meta.url), 'utf8');
    execFileSync(process.execPath, ['--import', join(dir, 'preload.mjs'), join(dir, 'index.mjs')], {
      cwd: dir,
      env: {
        INPUT_PROVIDER: 'slack',
        'INPUT_EVENT-JSON': event,
        'INPUT_WEBHOOK-URL': 'https://hooks.slack.com/services/fake/fake/fake',
        GITHUB_OUTPUT: join(dir, 'output'),
      },
      stdio: 'pipe',
      timeout: 15000,
    });
    const payload = JSON.parse(await readFile(join(dir, 'payload.json'), 'utf8'));
    expect(payload.text).toContain('CCv2 build succeeded');
    const output = await readFile(join(dir, 'output'), 'utf8');
    expect(output).toMatch(/delivered<<[^\n]+\ntrue\n/);
    expect(output).toMatch(/attempts<<[^\n]+\n1\n/);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
});

for (const provider of ['slack', 'teams-workflow'])
  for (const status of ['success', 'failure', 'warning'])
    it(`runs the published ${provider} cleanup ${status} bundle with complete redacted context`, async () => {
      const dir = await mkdtemp(join(tmpdir(), 'notify-cleanup-bundle-'));
      try {
        await copyFile(new URL('../dist/index.js', import.meta.url), join(dir, 'index.mjs'));
        await writeFile(join(dir, 'output'), '');
        await writeFile(
          join(dir, 'preload.mjs'),
          `import { writeFileSync } from 'node:fs';
          globalThis.fetch = async (_url, options) => {
            writeFileSync('payload.json', options.body);
            return new Response('', { status: 200 });
          };`,
        );
        const event = JSON.parse(
          await readFile(new URL('./fixtures/events/cleanup-warning.json', import.meta.url), 'utf8'),
        );
        event.status = status;
        if (status === 'success') {
          event.data.mode = 'apply';
          event.data.cleanupStatus = 'success';
          event.data.deletionRequestedCount = 2;
          event.data.inputs['dry-run'] = 'false';
          delete event.data.issues;
        } else if (status === 'failure') {
          event.data.cleanupStatus = 'failed';
          event.data.error = { code: 'authorization-failure', message: 'CCv2 authorization failed (HTTP 403).' };
          delete event.data.issues;
        }
        execFileSync(process.execPath, ['--import', join(dir, 'preload.mjs'), join(dir, 'index.mjs')], {
          cwd: dir,
          env: {
            INPUT_PROVIDER: provider,
            'INPUT_EVENT-JSON': JSON.stringify(event),
            'INPUT_WEBHOOK-URL':
              provider === 'slack'
                ? 'https://hooks.slack.com/services/fake/fake/fake'
                : 'https://public.example.test/workflow',
            GITHUB_OUTPUT: join(dir, 'output'),
          },
          stdio: 'pipe',
          timeout: 15000,
        });
        const payload = await readFile(join(dir, 'payload.json'), 'utf8');
        for (const name of Object.keys(event.data.inputs)) expect(payload).toContain(name);
        expect(payload).toContain('https://sandbox.example.test');
        expect(payload).toContain('REDACTED');
        expect(payload).toContain(
          status === 'warning'
            ? 'SAP deletion eligibility could not be verified'
            : status === 'failure'
              ? 'HTTP 403'
              : '2 build deletion requests accepted',
        );
        const output = await readFile(join(dir, 'output'), 'utf8');
        expect(output).toMatch(/delivered<<[^\n]+\ntrue\n/);
        expect(output).toMatch(new RegExp(`status<<[^\\n]+\\n${status}\\n`));
      } finally {
        await rm(dir, { recursive: true, force: true });
      }
    });
