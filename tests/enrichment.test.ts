import { describe, expect, it } from 'vitest';
import { enrichContext } from '../src/event/enrich-context.js';
import { validateEvent } from '../src/event/validate.js';
const base = {
  schemaVersion: 1 as const,
  eventId: 'ckevt_context',
  eventType: 'check.completed' as const,
  status: 'success' as const,
  occurredAt: '2026-11-01T20:20:00Z',
  source: { product: 'commercekit' as const, component: 'cli-check' as const },
  data: { filesChecked: 1, errors: 0, warnings: 0 },
};
describe('safe GitHub context enrichment', () => {
  it('fills only missing known fields and builds a validated run URL', () => {
    const env = {
      GITHUB_REPOSITORY: 'example-org/project',
      GITHUB_REF: 'refs/heads/main',
      GITHUB_SHA: 'abc123',
      GITHUB_ACTOR: 'developer',
      GITHUB_WORKFLOW: 'CI',
      GITHUB_JOB: 'check',
      GITHUB_RUN_ID: '1234',
      GITHUB_RUN_ATTEMPT: '2',
      GITHUB_SERVER_URL: 'https://github.com',
      GITHUB_TOKEN: 'never-copy',
      GITHUB_EVENT_PATH: '/private/event',
    } as NodeJS.ProcessEnv;
    const event = enrichContext({ ...base, context: { repository: 'provided/project' } }, env);
    expect(event.context).toMatchObject({
      repository: 'provided/project',
      ref: 'refs/heads/main',
      commit: 'abc123',
      actor: 'developer',
      workflow: 'CI',
      job: 'check',
      runId: '1234',
      runAttempt: 2,
      runUrl: 'https://github.com/provided/project/actions/runs/1234',
    });
    expect(JSON.stringify(event)).not.toContain('never-copy');
    expect(JSON.stringify(event)).not.toContain('/private/event');
    validateEvent(event);
  });
  it('omits missing and unsafe runner values', () => {
    expect(enrichContext(base, {}).context).toEqual({});
    const event = enrichContext(base, {
      GITHUB_REPOSITORY: 'bad value',
      GITHUB_RUN_ID: 'not-id',
      GITHUB_SERVER_URL: 'http://localhost',
    } as NodeJS.ProcessEnv);
    expect(event.context).toEqual({});
  });
});
