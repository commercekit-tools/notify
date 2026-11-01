import { it, expect, vi, beforeEach } from 'vitest';
const { core, fetcher } = vi.hoisted(() => ({
  core: { getInput: vi.fn(), setSecret: vi.fn(), setOutput: vi.fn(), setFailed: vi.fn(), warning: vi.fn() },
  fetcher: vi.fn(),
}));
vi.mock('@actions/core', () => core);
import { runAction } from '../src/action.js';
const event = JSON.stringify({
  schemaVersion: 1,
  eventId: 'ckevt_test',
  eventType: 'check.completed',
  status: 'success',
  occurredAt: '2026-11-01T20:20:00Z',
  source: { product: 'commercekit', component: 'cli-check' },
  data: { filesChecked: 1, errors: 0, warnings: 0 },
});
beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal('fetch', fetcher);
  fetcher.mockResolvedValue(new Response('', { status: 200 }));
  core.getInput.mockImplementation(
    (name: string) =>
      (
        ({
          provider: 'slack',
          'webhook-url': 'https://hooks.slack.com/services/fake/fake/fake',
          'event-json': event,
          'event-file': '',
          'fail-on-notification-error': 'false',
        }) as Record<string, string>
      )[name] ?? '',
  );
});
it('runs the complete successful action and sets safe outputs', async () => {
  await runAction();
  expect(core.setSecret).toHaveBeenCalled();
  expect(fetcher).toHaveBeenCalledOnce();
  expect(core.setOutput).toHaveBeenCalledWith('delivered', 'true');
  expect(core.setOutput).toHaveBeenCalledWith('attempts', '1');
  expect(core.setFailed).not.toHaveBeenCalled();
});
it('warns and succeeds on delivery failure by default', async () => {
  fetcher.mockRejectedValue(new TypeError('hidden'));
  await runAction();
  expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('network error'));
  expect(core.setOutput).toHaveBeenCalledWith('delivered', 'false');
  expect(core.setFailed).not.toHaveBeenCalled();
});
it('fails on delivery error when configured', async () => {
  core.getInput.mockImplementation((name: string) =>
    name === 'fail-on-notification-error'
      ? 'true'
      : ({ provider: 'slack', 'webhook-url': 'https://hooks.slack.com/services/fake/fake/fake', 'event-json': event }[
          name
        ] ?? ''),
  );
  fetcher.mockResolvedValue(new Response('', { status: 400 }));
  await runAction();
  expect(core.setFailed).toHaveBeenCalled();
  expect(core.setOutput).toHaveBeenCalledWith('delivered', 'false');
});
it('always fails invalid events regardless of delivery flag', async () => {
  core.getInput.mockImplementation((name: string) =>
    name === 'fail-on-notification-error'
      ? 'false'
      : ({ provider: 'slack', 'webhook-url': 'https://hooks.slack.com/services/fake/fake/fake', 'event-json': '{}' }[
          name
        ] ?? ''),
  );
  await runAction();
  expect(core.setFailed).toHaveBeenCalled();
  expect(fetcher).not.toHaveBeenCalled();
});
it('reports configuration failures and safely sets outputs', async () => {
  core.getInput.mockImplementation((name: string) => (name === 'provider' ? 'unsupported' : ''));
  await runAction();
  expect(core.setOutput).toHaveBeenCalledWith('delivered', 'false');
  expect(core.setFailed).toHaveBeenCalled();
});
