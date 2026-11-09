import { BlockList, isIP } from 'node:net';

const localAddresses = new BlockList();
for (const [address, prefix] of [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.168.0.0', 16],
] as const)
  localAddresses.addSubnet(address, prefix, 'ipv4');
localAddresses.addAddress('::', 'ipv6');
localAddresses.addAddress('::1', 'ipv6');
localAddresses.addSubnet('fc00::', 7, 'ipv6');
localAddresses.addSubnet('fe80::', 10, 'ipv6');

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
    const hostname = host.replace(/\.$/, '');
    if (hostname === 'localhost' || hostname.endsWith('.localhost') || hostname.endsWith('.local'))
      throw new Error('Teams webhook URL cannot use a local host.');
    const family = isIP(host);
    // BlockList also applies IPv4 ranges to IPv4-mapped IPv6 addresses.
    if (family && localAddresses.check(host, family === 6 ? 'ipv6' : 'ipv4'))
      throw new Error('Teams webhook URL cannot use a private, loopback, link-local, or unspecified address.');
  }
  return url;
}
