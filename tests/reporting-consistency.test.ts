import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';
import { getNotificationStyle, validateNotificationEvent } from '@commercekit-tools/notification-contract';
import { createPresentation } from '../src/presentation/create-presentation.js';
import { renderSlack } from '../src/providers/slack/render.js';
import { renderTeams, TEAMS_MAX_BYTES } from '../src/providers/teams-workflow/render.js';

async function fixture(name: string) {
  return validateNotificationEvent(
    JSON.parse(await readFile(new URL(`./fixtures/events/${name}.json`, import.meta.url), 'utf8')),
  );
}
const allFacts = (p: ReturnType<typeof createPresentation>) => p.sections?.flatMap((section) => section.facts) ?? [];
describe('ecosystem notification formatting', () => {
  it.each([
    'check-success',
    'check-warning',
    'check-failure',
    'build-started',
    'build-success',
    'build-failure',
    'deployment-action-required',
    'deployment-cancelled',
    'deployment-success',
    'cleanup-warning',
    'setup-success',
  ])('uses the shared visual style and complete detail sections for %s', async (name) => {
    const event = await fixture(name);
    const p = createPresentation(event);
    const style = getNotificationStyle(event.status);
    expect(p).toMatchObject({ statusLabel: style.label, icon: style.icon, tone: style.tone, accent: style.accent });
    expect(p.sections?.map((section) => section.title)).toEqual(['Result', 'Inputs', 'Issues']);
    expect(p.sections?.[0].facts).toEqual(p.facts);
    const payload = JSON.stringify([renderSlack(p), renderTeams(p)]);
    for (const title of ['Result', 'Inputs', 'Issues']) expect(payload).toContain(title);
    if (!event.data.inputs) expect(payload).toContain('Complete input context was not included');
  });
  it('includes all build/deploy inputs, safe cross-field redaction and bounded Unicode previews', async () => {
    for (const name of ['build-success', 'deployment-failure']) {
      const base = await fixture(name);
      const names = Array.from({ length: 21 }, (_, index) => `public-input-${index}`);
      const inputs = Object.fromEntries(names.map((key) => [key, '🐬'.repeat(256)]));
      const event = validateNotificationEvent({
        ...base,
        data: {
          ...base.data,
          inputs: { ...inputs, 'client-secret': '[REDACTED]' },
          inputsValidated: true,
          inputsTruncated: false,
          error: { code: 'bounded-error', message: '🐬'.repeat(1000) },
          issues: Array.from({ length: 3 }, (_, index) => ({ code: `issue-${index}`, message: '🐬'.repeat(1000) })),
        },
        links: Array.from({ length: 3 }, (_, index) => ({
          label: `Details ${index}`,
          url: `https://example.test/${'x'.repeat(1900)}${index}`,
        })),
      });
      const p = createPresentation(event);
      const teams = renderTeams(p);
      const slack = renderSlack(p);
      const text = JSON.stringify([teams, slack]);
      for (const key of [...names, 'client-secret']) expect(text).toContain(key);
      expect(Buffer.byteLength(JSON.stringify(teams))).toBeLessThanOrEqual(TEAMS_MAX_BYTES);
      expect(slack.attachments[0].blocks.length + slack.blocks.length).toBeLessThanOrEqual(50);
      expect(text).toContain('truncated');
      expect(allFacts(p).filter((fact) => names.includes(fact.label))).toHaveLength(21);
    }
  });
  it('defends raw direct presentation callers across inputs, context, errors and links', async () => {
    for (const name of ['check-failure', 'build-failure', 'deployment-failure', 'setup-success']) {
      const event = await fixture(name);
      const credential = 'synthetic-private-value';
      const jwt = ['eyJsynthetic', 'payload', 'signature'].join('.');
      Object.assign(event, {
        context: { repository: credential, runUrl: `https://example.test/${credential}` },
        links: [{ label: credential, url: `https://example.test/run?value=${credential}` }],
        data: {
          ...event.data,
          inputs: {
            'client-secret': credential,
            'public-setting': `${credential} ${jwt}`,
            'event-file': '/private/event-data.json',
          },
          inputsValidated: true,
          error: { code: credential, message: `Rejected ${credential} ${jwt}` },
        },
      });
      const p = createPresentation(event);
      const payloads = JSON.stringify([p, renderSlack(p), renderTeams(p)]);
      for (const hidden of [credential, jwt, '/private/event-data.json']) expect(payloads).not.toContain(hidden);
      expect(p.actions).toEqual([]);
      expect(payloads).toContain('REDACTED');
    }
  });
  it('retains more than nine result facts without silently dropping repository context', async () => {
    const event = await fixture('cleanup-warning');
    const p = createPresentation(event);
    expect(p.facts.length).toBeGreaterThan(9);
    expect(p.facts.find((fact) => fact.label === 'Repository')).toBeTruthy();
    const text = JSON.stringify([renderSlack(p), renderTeams(p)]);
    for (const fact of p.facts) expect(text).toContain(fact.label);
  });
});

it.each(['failure', 'warning', 'cancelled', 'internal-error'] as const)(
  'gives setup %s the shared semantic status and complete context',
  async (status) => {
    const base = await fixture('setup-success');
    const event = validateNotificationEvent({ ...base, status });
    const p = createPresentation(event);
    const style = getNotificationStyle(status);
    expect(p.statusLabel).toBe(style.label);
    expect(p.icon).toBe(style.icon);
    expect(p.tone).toBe(style.tone);
    expect(p.summary).toBeTruthy();
    if (status === 'warning') expect(p.summary).toContain('warnings');
    if (status === 'cancelled') expect(p.tone).toBe('neutral');
    const text = JSON.stringify([renderSlack(p), renderTeams(p)]);
    expect(text).toContain('version');
    expect(text).toContain('Result');
    expect(text).toContain('Issues');
  },
);
it('handles sparse direct renderer input and enforces hard provider caps without losing bounded fields', () => {
  const minimal = {
    category: 'CommerceKit · Direct renderer',
    title: 'Synthetic',
    status: 'success' as const,
    statusLabel: 'Succeeded',
    icon: '✅',
    tone: 'success' as const,
    accent: '#168A45',
    highlights: [],
    facts: [],
    actions: [],
  };
  expect(JSON.stringify(renderSlack(minimal))).toContain('Synthetic');
  expect(JSON.stringify(renderTeams(minimal))).toContain('Synthetic');
  const excessive = {
    ...minimal,
    facts: Array.from({ length: 500 }, (_, index) => ({ label: `Fact ${index}`, value: '🐬'.repeat(256) })),
  };
  expect(() => renderSlack(excessive)).toThrow('Block Kit block limit');
  expect(() => renderTeams(excessive)).toThrow('27 KiB');
});
it('defends malformed direct input names/values and explains excess context rather than silently broadening it', async () => {
  const base = await fixture('build-failure');
  const entries = Object.fromEntries(
    Array.from({ length: 51 }, (_, index) => [`public-${index}`, index === 0 ? null : 'value']),
  );
  Object.assign(base.data, {
    inputs: { ...entries, 'Invalid Secret Name': 'synthetic-private-value' },
    inputsValidated: false,
    issues: [null, { message: '' }],
  });
  const p = createPresentation(base);
  const rendered = JSON.stringify([p, renderSlack(p), renderTeams(p)]);
  expect(rendered).not.toContain('synthetic-private-value');
  expect(rendered).toContain('invalid or excess input names were omitted');
  expect(rendered).toContain('Review the workflow report.');
});
