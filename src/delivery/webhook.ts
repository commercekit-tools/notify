import type { Provider } from './types.js';
import { retryAfterMs } from './retry-after.js';
export interface DeliveryResult {
  attempts: number;
}
const retryable = new Set([429, 500, 502, 503, 504]);
export async function deliver(
  provider: Provider,
  url: URL,
  payload: unknown,
  fetcher: typeof fetch = fetch,
  sleep = (ms: number) => new Promise((r) => setTimeout(r, ms)),
): Promise<DeliveryResult> {
  let last = 'Notification delivery failed.';
  for (let attempt = 1; attempt <= 3; attempt++) {
    let response: Response | undefined;
    try {
      const controller = new AbortController(),
        timer = setTimeout(() => controller.abort(), 10000);
      try {
        response = await fetcher(url, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(payload),
          redirect: 'error',
          credentials: 'omit',
          signal: controller.signal,
        });
      } finally {
        clearTimeout(timer);
      }
    } catch (error) {
      const cause = error instanceof Error ? error.cause : undefined;
      if (cause instanceof Error && /unexpected redirect/i.test(cause.message))
        throw Object.assign(new Error('Notification webhook redirected; redirects are not allowed.'), {
          attempts: attempt,
        });
      const timeout = error instanceof Error && error.name === 'AbortError';
      last = timeout ? 'Notification request timed out.' : 'Notification request failed due to a network error.';
      if (attempt === 3) throw Object.assign(new Error(last), { attempts: attempt });
    }
    if (response) {
      if (response.status >= 200 && response.status < 300) return { attempts: attempt };
      last = `${provider === 'slack' ? 'Slack' : 'Teams Workflow'} webhook returned HTTP ${response.status}${attempt === 3 ? '; retry limit exhausted.' : '.'}`;
      if (!retryable.has(response.status) || attempt === 3) throw Object.assign(new Error(last), { attempts: attempt });
    }
    const delay = response ? retryAfterMs(response.headers.get('retry-after')) : undefined;
    await sleep(delay ?? Math.min(250 * 2 ** (attempt - 1), 1000));
  }
  throw Object.assign(new Error(last), { attempts: 3 });
}
