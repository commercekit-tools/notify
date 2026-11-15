import { it, expect, vi, beforeEach } from 'vitest';
const { core, fetcher } = vi.hoisted(() => ({
  core: {
    getInput: vi.fn(),
    setSecret: vi.fn(),
    setOutput: vi.fn(),
    setFailed: vi.fn(),
    warning: vi.fn(),
    summary: { addRaw: vi.fn(), write: vi.fn() },
  },
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
  core.summary.addRaw.mockReset().mockReturnValue(core.summary);
  core.summary.write.mockReset().mockResolvedValue(core.summary);
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
  expect(summary()).toContain('✅');
  expect(summary()).toContain('Succeeded');
  for (const name of ['provider', 'event-json', 'event-file', 'webhook-url', 'fail-on-notification-error'])
    expect(summary()).toContain(name);
  expect(summary()).not.toContain('https://hooks.slack.com/services/fake/fake/fake');
  expect(summary()).not.toContain(event);
  expect(core.getInput).toHaveBeenCalledTimes(5);
  expect(core.getInput.mock.calls[0][0]).toBe('webhook-url');
  expect(core.setSecret.mock.invocationCallOrder[0]).toBeLessThan(core.getInput.mock.invocationCallOrder[1]);
});
it('warns and succeeds on delivery failure by default', async () => {
  fetcher.mockRejectedValue(new TypeError('hidden'));
  await runAction();
  expect(core.warning).toHaveBeenCalledWith(expect.stringContaining('network error'));
  expect(summary()).toContain('⚠️');
  expect(summary()).toContain('Completed with warnings');
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
it('converts an input-read exception into failure and safe outputs', async () => {
  core.getInput.mockImplementationOnce(() => {
    throw new Error('private input exception');
  });
  await runAction();
  expect(core.setFailed).toHaveBeenCalledWith(
    'Notification action failed. Review the configured inputs and workflow logs.',
  );
  expect(summary()).not.toContain('private input exception');
  expect(core.setOutput).toHaveBeenCalledWith('delivered', 'false');
});

function summary(): string {
  return String(core.summary.addRaw.mock.calls.at(-1)?.[0]);
}
it('delivering a failure source event remains successful notification delivery', async () => {
  const source = JSON.parse(event);
  source.status = 'failure';
  source.data.errors = 1;
  const previous = core.getInput.getMockImplementation()!;
  core.getInput.mockImplementation((name: string) => (name === 'event-json' ? JSON.stringify(source) : previous(name)));
  await runAction();
  expect(core.setOutput).toHaveBeenCalledWith('delivered', 'true');
  expect(core.setOutput).toHaveBeenCalledWith('status', 'failure');
  expect(core.setFailed).not.toHaveBeenCalled();
  expect(summary()).toContain('✅');
  expect(summary()).toContain('Source outcome');
  expect(summary()).toContain('failure');
});
it('preserves successful delivery and outputs if summary writing fails', async () => {
  core.summary.write.mockRejectedValueOnce(new Error('private summary detail'));
  await runAction();
  expect(core.setOutput).toHaveBeenCalledWith('delivered', 'true');
  expect(core.setFailed).not.toHaveBeenCalled();
  expect(core.warning).toHaveBeenCalledWith(
    'Notification job summary could not be written; delivery outputs and the Action outcome are preserved.',
  );
  expect(JSON.stringify(core.warning.mock.calls)).not.toContain('private summary detail');
});
it('does not print event-file paths or expose filesystem exceptions', async () => {
  const previous = core.getInput.getMockImplementation()!;
  core.getInput.mockImplementation((name: string) =>
    name === 'event-json' ? '' : name === 'event-file' ? '/private/synthetic-secret-report.json' : previous(name),
  );
  await runAction();
  expect(fetcher).not.toHaveBeenCalled();
  expect(core.setFailed).toHaveBeenCalledWith(
    'Event file could not be read. Check that event-file points to a readable regular file.',
  );
  expect(summary()).not.toContain('/private/synthetic-secret-report.json');
  expect(summary()).toContain('VALUE OMITTED');
  expect(summary()).toContain('❌');
});
it.each(['True', '0', 'yes'])('rejects malformed delivery-error policy %s', async (value) => {
  const previous = core.getInput.getMockImplementation()!;
  core.getInput.mockImplementation((name: string) => (name === 'fail-on-notification-error' ? value : previous(name)));
  await runAction();
  expect(fetcher).not.toHaveBeenCalled();
  expect(core.setFailed).toHaveBeenCalledWith('fail-on-notification-error must be true or false.');
  expect(summary()).toContain('❌');
});

it.each(['slack', 'teams-workflow'])(
  'never reflects its own %s webhook into the delivered event or summary',
  async (provider) => {
    const webhook =
      provider === 'slack'
        ? 'https://hooks.slack.com/services/synthetic/fake/private'
        : 'https://public.example.test/private/synthetic-hook';
    const source = JSON.parse(event);
    source.status = 'failure';
    source.data.errors = 1;
    const lowerEncoded = encodeURIComponent(webhook).replace(/%[0-9A-F]{2}/gu, (part) => part.toLowerCase());
    source.data.error = { message: `Rejected ${webhook} and ${encodeURIComponent(webhook)} and ${lowerEncoded}` };
    source.context = { repository: 'synthetic/project', runUrl: webhook };
    source.links = [{ label: 'Private target', url: webhook }];
    const values: Record<string, string> = {
      provider,
      'webhook-url': webhook,
      'event-json': JSON.stringify(source),
      'event-file': '',
      'fail-on-notification-error': 'false',
    };
    core.getInput.mockImplementation((name: string) => values[name] ?? '');
    await runAction();
    const payload = String(fetcher.mock.calls[0][1].body);
    expect(payload).not.toContain(webhook);
    expect(payload).not.toContain(encodeURIComponent(webhook));
    expect(payload).not.toContain(lowerEncoded);
    expect(summary()).not.toContain(webhook);
    expect(summary()).not.toContain(encodeURIComponent(webhook));
    expect(core.setOutput).toHaveBeenCalledWith('delivered', 'true');
    expect(core.setFailed).not.toHaveBeenCalled();
  },
);

it.each([1, 2])('preserves accepted delivery when the first %s output writes fail', async (count) => {
  for (let index = 0; index < count; index++)
    core.setOutput.mockImplementationOnce(() => {
      throw new Error('private output detail');
    });
  await runAction();
  expect(fetcher).toHaveBeenCalledOnce();
  expect(core.setOutput).toHaveBeenCalledWith('delivered', 'true');
  expect(core.setOutput).not.toHaveBeenCalledWith('delivered', 'false');
  expect(core.setOutput).toHaveBeenCalledWith('attempts', '1');
  expect(core.setFailed).toHaveBeenCalledWith(
    'Notification delivery state was preserved, but one or more Action outputs could not be written.',
  );
  expect(summary()).toContain('The notification was delivered.');
  expect(summary()).toContain('notification-output-failure');
  expect(summary()).not.toContain('notification-not-delivered');
  expect(summary()).not.toContain('private output detail');
});
