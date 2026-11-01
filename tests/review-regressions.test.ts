import { describe, expect, it } from 'vitest';
import { validateEvent } from '../src/event/validate.js';
import { createPresentation } from '../src/presentation/create-presentation.js';
import { renderSlack } from '../src/providers/slack/render.js';
import { renderTeams } from '../src/providers/teams-workflow/render.js';
const event = (status: string, data: Record<string, unknown> = {}) => ({
  schemaVersion: 1,
  eventId: 'ckevt_check',
  eventType: 'check.completed',
  status,
  occurredAt: '2026-11-01T20:20:00Z',
  source: { product: 'commercekit', component: 'cli-check' },
  data,
});
describe('review regressions', () => {
  it.each(['success', 'warning', 'failure'])('requires check counts for %s', (status) => {
    expect(() => validateEvent(event(status, { filesChecked: 1, errors: 0, warnings: 0 }))).not.toThrow();
    for (const missing of ['filesChecked', 'errors', 'warnings']) {
      const data = { filesChecked: 1, errors: 0, warnings: 0 };
      delete (data as Record<string, unknown>)[missing];
      expect(() => validateEvent(event(status, data))).toThrow();
    }
  });
  it.each(['cancelled', 'internal-error'])('allows omitted counts for %s', (status) => {
    expect(() => validateEvent(event(status, {}))).not.toThrow();
    const p = createPresentation(event(status, {}) as never);
    expect(p.summary).not.toMatch(/0 files|0 errors|0 warnings/);
  });
  it.each([
    'javascript:alert(1)',
    'http://github.com/org/repo',
    'file:///tmp/run',
    'https://user:pass@github.com/run',
    'https://github.com/run#frag',
  ])('rejects unsafe runUrl %s', (url) =>
    expect(() =>
      validateEvent({ ...event('success', { filesChecked: 1, errors: 0, warnings: 0 }), context: { runUrl: url } }),
    ).toThrow(),
  );
  it('accepts valid runUrl and uses fallback for missing or empty links', () => {
    for (const links of [undefined, []]) {
      const p = createPresentation({
        ...event('success', { filesChecked: 1, errors: 0, warnings: 0 }),
        context: { runUrl: 'https://github.com/example-org/project/actions/runs/1' },
        ...(links === undefined ? {} : { links }),
      } as never);
      expect(p.actions).toEqual([
        { label: 'View workflow', url: 'https://github.com/example-org/project/actions/runs/1' },
      ]);
    }
    const p = createPresentation({
      ...event('success', { filesChecked: 1, errors: 0, warnings: 0 }),
      context: { runUrl: 'https://github.com/example-org/project/actions/runs/1' },
      links: [{ label: 'Review\nworkflow', url: 'https://github.com/example-org/project/actions/runs/2' }],
    } as never);
    expect(p.actions[0].label).toBe('Review workflow');
  });
  it('keeps dynamic formatting inert in both providers', () => {
    const hostile = '*bold* _italic_ `code` [link](https://example.test) <@U123>\nnext\u0001';
    const p = createPresentation({
      ...event('failure', { filesChecked: 1, errors: 1, warnings: 0, error: { message: hostile } }),
      links: [{ label: hostile, url: 'https://github.com/example-org/project/actions/runs/1' }],
    } as never);
    const slack = JSON.stringify(renderSlack(p));
    const teams = JSON.stringify(renderTeams(p));
    expect(slack).toContain('type":"plain_text","text":"1 errors and 0 warnings across 1 files."');
    expect(slack).toContain(
      'text":{"type":"plain_text","text":"*bold* _italic_ `code` [link](https://example.test) <＠U123> next',
    );
    expect(teams).not.toContain('<@U123>');
    expect(teams).toContain('\\\\*bold\\\\*');
    expect(teams).not.toContain('Action.Submit');
    expect(p.actions[0].label).not.toContain('\n');
  });
  it('does not render unknown optional fields or redacted secrets', () => {
    const e = {
      ...event('success', { filesChecked: 1, errors: 0, warnings: 0, unknownVisible: 'must-not-render' }),
      unknownTop: 'must-not-render',
    };
    const p = createPresentation(e as never);
    expect(JSON.stringify([renderSlack(p), renderTeams(p)])).not.toContain('must-not-render');
  });
});
