import { afterEach, describe, expect, it } from 'vitest';
import { spawnSync } from 'node:child_process';
import { copyFile, mkdir, mkdtemp, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { checkBundle } from '../scripts/check-bundle.mjs';

const roots = [];
const artifacts = {
  'index.js': 'export const synthetic = true;\n',
  'package.json': '{"type":"module"}\n',
  'licenses.txt': 'Synthetic license notice\n',
  [join('assets', 'runtime.bin')]: Buffer.from([0, 1, 128, 255]),
};

afterEach(async () => {
  await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true })));
});

async function writeArtifacts(directory, values = artifacts) {
  for (const [file, value] of Object.entries(values)) {
    await mkdir(dirname(join(directory, file)), { recursive: true });
    await writeFile(join(directory, file), value);
  }
}

async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'notify-bundle-verification-'));
  roots.push(root);
  await writeArtifacts(join(root, 'dist'));
  return root;
}

describe('complete committed bundle verification', () => {
  it('compares nested binary artifacts and leaves committed files untouched', async () => {
    const root = await fixture();
    let temporary;
    await checkBundle({
      root,
      build: async (output) => {
        temporary = output;
        expect(output).not.toBe(join(root, 'dist'));
        await writeArtifacts(output);
      },
    });
    await expect(stat(temporary)).rejects.toMatchObject({ code: 'ENOENT' });
    for (const [file, value] of Object.entries(artifacts))
      expect(await readFile(join(root, 'dist', file))).toEqual(Buffer.from(value));
  });

  it('rejects license-only drift without repairing the committed license', async () => {
    const root = await fixture();
    await writeFile(join(root, 'dist/licenses.txt'), 'Obsolete notice');
    let temporary;
    await expect(
      checkBundle({
        root,
        build: async (output) => {
          temporary = output;
          await writeArtifacts(output);
        },
      }),
    ).rejects.toThrow('Stale dist/licenses.txt');
    expect(await readFile(join(root, 'dist/licenses.txt'), 'utf8')).toBe('Obsolete notice');
    await expect(stat(temporary)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it.each(['index.js', 'package.json', 'licenses.txt'])('rejects missing committed %s', async (file) => {
    const root = await fixture();
    await rm(join(root, 'dist', file));
    await expect(checkBundle({ root, build: writeArtifacts })).rejects.toThrow(`Missing: ${file}`);
  });

  it.each(['index.js', 'package.json', 'licenses.txt'])(
    'rejects incomplete generated output without %s',
    async (file) => {
      const root = await fixture();
      await expect(
        checkBundle({
          root,
          build: (output) =>
            writeArtifacts(output, Object.fromEntries(Object.entries(artifacts).filter(([name]) => name !== file))),
        }),
      ).rejects.toThrow(`Generated bundle is missing ${file}`);
    },
  );

  it('rejects obsolete files left in committed output', async () => {
    const root = await fixture();
    await writeFile(join(root, 'dist/previous.js'), 'obsolete');
    await expect(checkBundle({ root, build: writeArtifacts })).rejects.toThrow('obsolete: previous.js');
  });

  it.each(['package.json', join('assets', 'runtime.bin')])('compares the bytes of %s', async (file) => {
    const root = await fixture();
    await writeFile(join(root, 'dist', file), 'different');
    await expect(checkBundle({ root, build: writeArtifacts })).rejects.toThrow(`Stale dist/${file}`);
  });

  it('propagates bundle failures and cleans partial output', async () => {
    const root = await fixture();
    const failure = new Error('Synthetic compiler failure');
    let temporary;
    await expect(
      checkBundle({
        root,
        build: async (output) => {
          temporary = output;
          await writeFile(join(output, 'partial.js'), 'partial');
          throw failure;
        },
      }),
    ).rejects.toBe(failure);
    await expect(stat(temporary)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  it('requires the packaged module mode for the actual JavaScript entry', async () => {
    const root = await fixture();
    const entry = join(root, 'dist/index.js');
    await copyFile(new URL('../dist/index.js', import.meta.url), entry);
    await copyFile(new URL('../dist/package.json', import.meta.url), join(root, 'dist/package.json'));
    const check = () =>
      spawnSync(process.execPath, ['--check', entry], { encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
    expect(check().status).toBe(0);
    await writeFile(join(root, 'dist/package.json'), '{"type":"commonjs"}\n');
    const invalid = check();
    expect(invalid.error).toBeUndefined();
    expect(invalid.status).not.toBe(0);
    expect(invalid.stderr).toContain('SyntaxError');
  });
});
