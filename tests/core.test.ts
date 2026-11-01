import { describe, it, expect } from 'vitest';
import { validateEvent } from '../src/event/validate.js';
import { createPresentation } from '../src/presentation/create-presentation.js';
import { renderSlack } from '../src/providers/slack/render.js';
import { renderTeams } from '../src/providers/teams-workflow/render.js';
import { validateWebhook } from '../src/delivery/url-validation.js';
import { retryAfterMs } from '../src/delivery/retry-after.js';
const event = {
  schemaVersion: 1,
  eventId: 'ckevt_example_success',
  eventType: 'ccv2.build.completed',
  status: 'success',
  occurredAt: '2026-11-01T20:20:00.000Z',
  source: { product: 'commercekit', component: 'ccv2-build' },
  context: { repository: 'example-org/project', runUrl: 'https://github.com/example-org/project/actions/runs/123' },
  data: { buildCode: 'build-example', branch: 'main' },
} as const;
describe('notification foundation', () => {
  it('validates supported contract and rejects mismatch', () => {
    expect(() => validateEvent(event)).not.toThrow();
    expect(() => validateEvent({ ...event, status: 'warning' })).toThrow(/combination/);
  });
  it('creates deterministic neutral presentation', () => {
    const p = createPresentation(event);
    expect(p.title).toBe('CCv2 build succeeded');
    expect(p.actions[0]?.label).toBe('View workflow');
  });
  it('renders Slack Block Kit with fallback and accent', () => {
    const p = renderSlack(createPresentation(event));
    expect(p.text).toContain('Succeeded');
    expect(p.attachments[0].color).toBe('#168A45');
  });
  it('renders Teams Workflow Adaptive Card envelope', () => {
    const p = renderTeams(createPresentation(event));
    expect(p.attachments[0].content.version).toBe('1.2');
    expect(JSON.stringify(p)).not.toContain('Action.Submit');
  });
  it('validates provider URLs', () => {
    expect(validateWebhook('https://hooks.slack.com/services/example/fake/token', 'slack').hostname).toBe(
      'hooks.slack.com',
    );
    expect(() => validateWebhook('https://hooks.slack.com.example.org/x', 'slack')).toThrow();
    expect(() => validateWebhook('https://127.0.0.1/x', 'teams-workflow')).toThrow();
  });
  it('parses bounded retry-after values', () => {
    expect(retryAfterMs('2')).toBe(2000);
    expect(retryAfterMs('100')).toBe(5000);
  });
});
