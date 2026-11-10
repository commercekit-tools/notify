// Notify preserves its established redaction labels, webhook/query URL filtering,
// and provider text behavior; the package sanitizers are not equivalent.
interface Rule {
  pattern: RegExp;
  replace: (..._args: string[]) => string;
}

const rules: Rule[] = [
  { pattern: /\bBearer\s+[A-Za-z0-9._~+/-]+=*/gi, replace: () => 'Bearer [REDACTED]' },
  {
    pattern: /https:\/\/hooks\.slack(?:-gov)?\.com\/services\/[A-Za-z0-9/_-]+/gi,
    replace: () => '[REDACTED SLACK WEBHOOK]',
  },
  { pattern: /\b(?:ghp_|github_pat_)[A-Za-z0-9_]+/gi, replace: () => '[REDACTED GITHUB TOKEN]' },
  {
    pattern: /\b(client_secret|password|token)(\s*[=:]\s*)([^\s&,;]+)/gi,
    replace: (match) => {
      const separator = match.search(/[=:]/);
      return `${match.slice(0, separator + 1)}${match.slice(separator + 1, match.length - match.match(/[^\s&,;]+$/)![0].length)}[REDACTED]`;
    },
  },
  {
    pattern: /\b(authorization\s*:\s*)([^\r\n]+)/gi,
    replace: (match) => `${match.slice(0, match.indexOf(':') + 1)} [REDACTED]`,
  },
  {
    pattern: /https:\/\/[^\s?#]+\?[^\s#]*/gi,
    replace: (match) => {
      try {
        const url = new URL(match);
        const secretKeys = /^(?:sig|signature|token|secret|code|key|auth|authorization|client_secret)$/i;
        if ([...url.searchParams.keys()].some((key) => secretKeys.test(key))) return '[REDACTED URL]';
      } catch {
        // Leave malformed text for the remaining conservative sanitization rules.
      }
      return match;
    },
  },
];

export function sanitize(value: string): string {
  let sanitized = value;
  for (const rule of rules) sanitized = sanitized.replace(rule.pattern, rule.replace);
  return sanitized.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, ' ').slice(0, 1000);
}

export function sanitizeLabel(value: string): string {
  return sanitize(value.replace(/[\r\n\u2028\u2029]/g, ' ').replace(/[\u0000-\u001F\u007F]/g, ' '))
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 75);
}

export function safePlainText(value: string): string {
  return sanitize(value)
    .replace(/@/g, '＠')
    .replace(/[\r\n\u2028\u2029]/g, ' ');
}
