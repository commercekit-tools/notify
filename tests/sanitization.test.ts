import { describe, expect, it } from 'vitest';
import { sanitize, sanitizeLabel } from '../src/presentation/sanitize.js';

describe('sanitization rules', () => {
  it.each([
    ['Bearer token', 'Bearer abc.def-ghi', 'Bearer [REDACTED]'],
    [
      'Slack webhook URL',
      'Use https://hooks.slack.com/services/TFAKE/BFAKE/fakeToken123 now',
      'Use [REDACTED SLACK WEBHOOK] now',
    ],
    ['GitHub PAT', 'ghp_fakeExampleToken123', '[REDACTED GITHUB TOKEN]'],
    ['client_secret', 'client_secret=sample-secret', 'client_secret=[REDACTED]'],
    ['password', 'password:sample-secret', 'password:[REDACTED]'],
    ['token assignment', 'token = sample-secret', 'token = [REDACTED]'],
    ['Authorization header', 'Authorization: Bearer sample-secret', 'Authorization: [REDACTED]'],
    ['secret query URL', 'https://example.test/hook?sig=sample-secret&mode=go', '[REDACTED URL]'],
  ])('sanitizes %s exactly', (_name, input, expected) => expect(sanitize(input)).toBe(expected));

  it('normalizes and bounds action labels', () => {
    expect(sanitizeLabel(' Review\nworkflow\u0000 ')).toBe('Review workflow');
    expect(sanitizeLabel('x'.repeat(100))).toBe('x'.repeat(75));
  });
});
