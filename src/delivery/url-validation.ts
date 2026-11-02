import { isIP } from 'node:net';
export function validateWebhook(raw: string, provider: 'slack' | 'teams-workflow'): URL {
  if (/[\u0000-\u001f\u007f]/.test(raw)) throw new Error('Webhook URL contains control characters.');
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new Error('Webhook URL is malformed.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || !url.hostname)
    throw new Error('Webhook URL must use HTTPS without credentials or fragments.');
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (provider === 'slack' && !['hooks.slack.com', 'hooks.slack-gov.com'].includes(host))
    throw new Error('Slack webhook URL must use an official Slack webhook host.');
  if (provider === 'teams-workflow') {
    if (host === 'localhost' || host.endsWith('.local')) throw new Error('Teams webhook URL cannot use a local host.');
    if (isIP(host)) {
      const parts = host.split('.').map(Number);
      if (
        host === '::1' ||
        host.startsWith('fe80:') ||
        host.startsWith('fc') ||
        host.startsWith('fd') ||
        (parts.length === 4 &&
          (parts[0] === 10 ||
            parts[0] === 127 ||
            (parts[0] === 169 && parts[1] === 254) ||
            (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) ||
            (parts[0] === 192 && parts[1] === 168)))
      )
        throw new Error('Teams webhook URL cannot use a private, loopback, or link-local address.');
    }
  }
  return url;
}
