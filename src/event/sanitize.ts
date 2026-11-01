const patterns: RegExp[] = [
  /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi,
  /https:\/\/hooks\.slack(?:-gov)?\.com\/services\/[A-Za-z0-9/_-]+/gi,
  /\b(?:ghp_|github_pat_)[A-Za-z0-9_]+/gi,
  /((?:client_secret|password|token)\s*[=:]\s*)[^\s&,;]+/gi,
  /(authorization\s*:\s*)[^\r\n]+/gi,
  /(https:\/\/[^\s?]+\?[^\s#]*(?:sig|token|secret|code)=[^&\s]+[^\s]*)/gi,
];
export function sanitize(value: string): string {
  return patterns
    .reduce((out, pattern) => out.replace(pattern, (_match, prefix?: string) => `${prefix ?? ''}[REDACTED]`), value)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ')
    .slice(0, 1000);
}
