import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
const before = readFileSync('dist/index.js', 'utf8');
execFileSync('pnpm', ['bundle'], { stdio: 'inherit' });
const after = readFileSync('dist/index.js', 'utf8');
if (before !== after) throw new Error('dist/index.js is stale; run pnpm bundle and commit the result.');
