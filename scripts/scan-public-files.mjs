import { readdir, readFile } from 'node:fs/promises';
const files = [];
async function walk(dir) {
  for (const e of await readdir(dir, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'coverage'].includes(e.name)) continue;
    const p = `${dir}/${e.name}`;
    if (e.isDirectory()) await walk(p);
    else files.push(p);
  }
}
await walk('.');
const bad = [
  /\/Users\/anil\//,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /\bghp_[A-Za-z0-9]{20,}/,
  /-----BEGIN (?:RSA )?PRIVATE KEY-----/,
  /hooks\.slack\.com\/services\/[A-Z0-9]{8,}\/B[A-Z0-9]{8,}\/[A-Za-z0-9]{20,}/,
];
for (const f of files) {
  const s = await readFile(f, 'utf8').catch(() => '');
  if (bad.some((r) => r.test(s))) throw new Error(`Public-file safety scan failed: ${f}`);
}
console.log(`Scanned ${files.length} public files.`);
