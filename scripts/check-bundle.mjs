import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

async function files(directory, prefix = '') {
  const result = [];
  for (const entry of await readdir(join(directory, prefix), { withFileTypes: true })) {
    const path = join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...(await files(directory, path)));
    else if (entry.isFile()) result.push(path);
    else throw new Error(`Unsupported bundle artifact: ${path}`);
  }
  return result.sort();
}

function buildBundle(root, output) {
  const result = spawnSync(
    process.execPath,
    [
      join(root, 'node_modules/@vercel/ncc/dist/ncc/cli.js'),
      'build',
      'src/main.ts',
      '--minify',
      '--license',
      'licenses.txt',
      '-o',
      output,
    ],
    { cwd: root, stdio: 'inherit' },
  );
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`Bundle generation failed (${result.status ?? result.signal}).`);
}

/** Check every generated artifact without repairing the committed bundle. */
export async function checkBundle({
  root = resolve(import.meta.dirname, '..'),
  build = (output) => buildBundle(root, output),
} = {}) {
  const output = await mkdtemp(join(tmpdir(), 'commercekit-notify-bundle-'));
  try {
    await build(output);
    const generated = await files(output);
    for (const required of ['index.js', 'package.json', 'licenses.txt']) {
      if (!generated.includes(required)) throw new Error(`Generated bundle is missing ${required}.`);
    }
    const committed = await files(join(root, 'dist'));
    const missing = generated.filter((file) => !committed.includes(file));
    const obsolete = committed.filter((file) => !generated.includes(file));
    if (missing.length || obsolete.length) {
      throw new Error(
        `Bundle file inventory differs. Missing: ${missing.join(', ') || 'none'}; obsolete: ${obsolete.join(', ') || 'none'}. Run pnpm bundle and commit dist.`,
      );
    }
    for (const file of generated) {
      if (!(await readFile(join(output, file))).equals(await readFile(join(root, 'dist', file))))
        throw new Error(`Stale dist/${file}; run pnpm bundle and commit dist.`);
    }
  } finally {
    await rm(output, { recursive: true, force: true });
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) await checkBundle();
