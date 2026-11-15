import { describe, expect, it } from 'vitest';
import {
  createBuildCleanupEvent,
  validateNotificationEvent,
  type NotificationStatus,
} from '@commercekit-tools/notification-contract';
import { createPresentation } from '../src/presentation/create-presentation.js';
import { renderSlack } from '../src/providers/slack/render.js';
import { renderTeams, TEAMS_MAX_BYTES } from '../src/providers/teams-workflow/render.js';

const inputs = {
  'token-endpoint': '[REDACTED]',
  'client-id': '[REDACTED]',
  'client-secret': '[REDACTED]',
  resource: '[REDACTED]',
  'subscription-code': 'synthetic-subscription',
  'api-base-url': 'https://sandbox.example.test',
  'application-code': 'commerce',
  'retention-days': '30',
  'keep-latest': '10',
  'dry-run': 'false',
  'max-deletions': '20',
  'exclude-build-codes': 'build-one, build-two',
  'timeout-minutes': '15',
  'continue-on-delete-error': 'false',
} as const;
const data = {
  mode: 'apply' as const,
  subscriptionCode: 'synthetic-subscription',
  applicationCode: 'commerce',
  retentionDays: 30,
  keepLatest: 10,
  cleanupStatus: 'success',
  scannedCount: 20,
  eligibleCount: 4,
  plannedCount: 2,
  deletionRequestedCount: 2,
  skippedCount: 18,
  failedCount: 0,
  unknownCount: 0,
  deferredCount: 2,
  protectedCount: 8,
  blockedCount: 6,
  durationMs: 1000,
  inputs,
  inputsValidated: true,
  inputsTruncated: false,
};
function event(status: NotificationStatus = 'success', changes: Record<string, unknown> = {}) {
  const base = createBuildCleanupEvent({
    status: 'success',
    occurredAt: '2026-11-15T00:00:00Z',
    context: { repository: 'example/integration', runUrl: 'https://github.com/example/integration/actions/runs/42' },
    data: { ...data, ...changes },
  });
  const parsed = validateNotificationEvent({ ...base, status });
  if (parsed.eventType !== 'ccv2.build-cleanup.completed') throw new Error('Unexpected cleanup event type.');
  return parsed;
}
function payloads(value: ReturnType<typeof event>) {
  const presentation = createPresentation(value);
  return { presentation, slack: renderSlack(presentation), teams: renderTeams(presentation) };
}

describe('complete cleanup notification context', () => {
  for (const [status, cleanupStatus, changes] of [
    ['success', 'success', {}],
    ['success', 'no-op', { deletionRequestedCount: 0, plannedCount: 0 }],
    ['success', 'dry-run', { mode: 'dry-run', deletionRequestedCount: 0 }],
    [
      'warning',
      'blocked',
      {
        mode: 'dry-run',
        deletionRequestedCount: 0,
        issues: [{ code: 'eligibility-unverified', message: 'Deletion eligibility could not be verified.' }],
      },
    ],
    [
      'failure',
      'failed',
      {
        failedCount: 1,
        error: {
          code: 'authorization-failure',
          message: 'CCv2 authorization failed (HTTP 403). Check technical-user permissions.',
        },
      },
    ],
    [
      'failure',
      'partial-failure',
      {
        failedCount: 1,
        deletionRequestedCount: 1,
        error: { code: 'delete-rejected', message: 'CCv2 rejected a build deletion request (HTTP 409).' },
      },
    ],
    [
      'failure',
      'outcome-unknown',
      {
        unknownCount: 1,
        error: {
          code: 'mutation-outcome-unknown',
          message: 'The deletion request outcome is unknown. Further requests stopped.',
        },
      },
    ],
  ] as const) {
    it(`shows all supplied inputs and all counts for ${cleanupStatus}`, () => {
      const value = event(status, { cleanupStatus, ...changes });
      const { presentation, slack, teams } = payloads(value);
      const text = JSON.stringify([slack, teams]);
      for (const name of Object.keys(inputs)) expect(text).toContain(name);
      for (const label of [
        'Scanned',
        'Eligible',
        'Planned',
        'Requests accepted',
        'Protected',
        'Blocked',
        'Skipped',
        'Deferred',
        'Failed',
        'Unknown',
      ])
        expect(text).toContain(label);
      expect(presentation.facts).toContainEqual({ label: 'Repository', value: 'example/integration' });
      expect(
        presentation.sections
          ?.flatMap((section) => section.facts)
          .filter((fact) => Object.keys(inputs).includes(fact.label)),
      ).toHaveLength(14);
      expect(text).toContain('REDACTED');
      expect(text).toContain(inputs['api-base-url']);
      expect(presentation.summary).toContain('deletion requests accepted');
      expect(presentation.summary).not.toMatch(/\b\d+ builds (?:deleted|cleaned up)\b/);
      expect(Buffer.byteLength(JSON.stringify(teams))).toBeLessThanOrEqual(TEAMS_MAX_BYTES);
    });
  }

  it('reports warning issue and safe failure details without generic-only attention messages', () => {
    const warning = payloads(
      event('warning', {
        cleanupStatus: 'blocked',
        issues: [{ code: 'eligibility-unverified', message: 'Deletion eligibility could not be verified.' }],
      }),
    );
    expect(warning.presentation.title).toBe('CCv2 build cleanup completed with warnings');
    expect(warning.presentation.tone).toBe('warning');
    expect(warning.presentation.summary).toContain('Deletion eligibility could not be verified.');
    const failure = payloads(
      event('failure', {
        error: { code: 'authorization-failure', message: 'CCv2 authorization failed (HTTP 403).' },
      }),
    );
    expect(failure.presentation.title).toBe('CCv2 build cleanup failed');
    expect(JSON.stringify(failure)).toContain('authorization-failure');
    expect(failure.presentation.summary).toContain('HTTP 403');
  });

  it('keeps legacy cleanup events useful and gives all-applications scope explicitly', () => {
    const legacyData = { ...data, inputs: undefined, applicationCode: undefined };
    const legacy = createBuildCleanupEvent({
      status: 'success',
      data: legacyData,
      context: { repository: 'example/integration' },
    });
    const p = createPresentation(legacy);
    expect(p.facts).toContainEqual({ label: 'Application', value: 'All applications' });
    expect(p.facts).toContainEqual({ label: 'Repository', value: 'example/integration' });
    expect(p.sections?.find((section) => section.title === 'Inputs')?.facts).toContainEqual({
      label: 'Input context',
      value: 'Complete input context was not included in this event.',
    });
    const missing = createPresentation(event('success', { protectedCount: undefined, blockedCount: undefined }));
    expect(missing.sections?.[0].facts).toContainEqual({ label: 'Protected', value: 'Not reported' });
  });

  it('always hides four confidential inputs, including direct unvalidated presentation callers', () => {
    const secrets = [
      'synthetic-endpoint-secret',
      'synthetic-client-identifier',
      'synthetic-client-secret-value',
      'synthetic-resource-secret',
    ];
    const malicious = event();
    Object.assign(malicious, {
      context: { repository: secrets[1], runUrl: `https://github.com/example/integration/actions/runs/${secrets[0]}` },
      links: [{ label: secrets[2], url: `https://example.test/${secrets[3]}` }],
      data: {
        ...malicious.data,
        inputs: {
          ...inputs,
          'token-endpoint': secrets[0],
          'client-id': secrets[1],
          'client-secret': secrets[2],
          resource: secrets[3],
          'exclude-build-codes': `${secrets[2]}, safe-build`,
        },
        error: { code: secrets[1], message: `Authorization: Bearer ${secrets[2]}` },
        issues: [{ code: secrets[0], message: `Credentials ${secrets[3]} were rejected.` }],
      },
    });
    const p = createPresentation(malicious);
    const rendered = JSON.stringify([p, renderSlack(p), renderTeams(p)]);
    for (const secret of secrets) expect(rendered).not.toContain(secret);
    expect(p.actions).toEqual([]);
    expect(
      p.sections
        ?.find((section) => section.title === 'Inputs')
        ?.facts.filter((fact) => ['token-endpoint', 'client-id', 'client-secret', 'resource'].includes(fact.label))
        .map((fact) => fact.value),
    ).toEqual(Array(4).fill('[REDACTED]'));
  });

  it('makes rejected inputs and bounded values explicit without dropping any input names', () => {
    const rejected = event('failure', {
      inputs: { ...inputs, 'exclude-build-codes': '<!channel> *_`', 'retention-days': 'malformed' },
      inputsValidated: false,
      inputsTruncated: true,
      error: { code: 'invalid-input', message: 'Invalid retention-days: expected a positive bounded integer.' },
    });
    // The shared validator rejects oversized data. Exercise defensive presentation
    // separately by altering an already validated event, without bypassing parsing.
    Object.assign(rejected.data, {
      inputs: { ...inputs, 'exclude-build-codes': '<!channel> *_`'.repeat(400), 'retention-days': 'malformed' },
    });
    const p = createPresentation(rejected);
    const both = JSON.stringify([renderSlack(p), renderTeams(p)]);
    expect(both).toContain('Input validation');
    expect(both).toContain('Incomplete');
    expect(both).toContain('truncated');
    expect(both).not.toContain('<!channel>');
    for (const name of Object.keys(inputs)) expect(both).toContain(name);
  });

  it('keeps maximal bounded Unicode inputs, errors, issues and links below Teams size limits', () => {
    const expanded = Object.fromEntries(
      Object.entries(inputs).map(([key, value]) => [
        key,
        ['token-endpoint', 'client-id', 'client-secret', 'resource'].includes(key) ? value : '🐬'.repeat(256),
      ]),
    );
    const value = event('warning', {
      inputs: expanded,
      error: { code: 'error-code', message: '🐬'.repeat(1000) },
      issues: Array.from({ length: 3 }, (_, index) => ({ code: `issue-${index}`, message: '🐬'.repeat(1000) })),
    });
    const withLinks = validateNotificationEvent({
      ...value,
      links: Array.from({ length: 3 }, (_, index) => ({
        label: `Details ${index}`,
        url: `https://example.test/${'x'.repeat(1900)}${index}`,
      })),
    });
    const p = createPresentation(withLinks);
    const teams = renderTeams(p);
    expect(Buffer.byteLength(JSON.stringify(teams))).toBeLessThanOrEqual(TEAMS_MAX_BYTES);
    expect(renderSlack(p).attachments[0].blocks.length).toBeLessThan(50);
    expect(JSON.stringify(teams)).toContain('truncated');
  });

  it('provides specific fallback explanations and missing-value behavior for incomplete direct callers', () => {
    for (const cleanupStatus of ['outcome-unknown', 'blocked', 'failed']) {
      const incomplete = event('failure', { cleanupStatus });
      Object.assign(incomplete.data, {
        issues: [{ code: '', message: '' }],
        error: { code: 'safe-code', message: '' },
      });
      const p = createPresentation(incomplete);
      expect(p.summary).toBeTruthy();
      expect(
        p.sections?.find((section) => section.title === 'Issues')?.facts.find((fact) => fact.label === 'Issue 1')
          ?.value,
      ).toBe('Review the workflow report.');
    }
    const incomplete = event('success');
    Object.assign(incomplete.data, { inputs: { ...inputs, 'application-code': '' }, cleanupStatus: '' });
    const p = createPresentation(incomplete);
    expect(p.sections?.find((section) => section.title === 'Inputs')?.facts).toContainEqual({
      label: 'application-code',
      value: '(not set)',
    });
  });
});
