import { execFileSync } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const temporary = mkdtempSync(join(tmpdir(), 'commercekit-notify-preview-'));
try {
  execFileSync('pnpm', ['exec', 'ncc', 'build', 'scripts/payload-preview.ts', '-o', temporary], { stdio: 'pipe' });
  execFileSync(process.execPath, [join(temporary, 'index.js'), ...process.argv.slice(2)], { stdio: 'inherit' });
} finally {
  rmSync(temporary, { recursive: true, force: true });
}
