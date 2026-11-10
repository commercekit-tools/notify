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
