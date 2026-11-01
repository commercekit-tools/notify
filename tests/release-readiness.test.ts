import { readFile } from 'node:fs/promises';
import { describe, expect, it } from 'vitest';

const read = (path: string) => readFile(new URL(`../${path}`, import.meta.url), 'utf8');

describe('release readiness contracts', () => {
  it('keeps one root Node 24 Action with the bounded public contract', async () => {
    const action = await read('action.yml');
    expect(action).toMatch(/^name: CommerceKit Notifications$/m);
    expect(action).toContain('Send rich CommerceKit workflow notifications to Slack and Microsoft Teams Workflows.');
    expect(action).toMatch(/branding:\s+icon: bell\s+color: green/);
    expect(action).toMatch(/runs:\s+using: node24\s+main: dist\/index.js/);
    const inputs = [...action.matchAll(/^ {2}([a-z-]+):$/gm)].map((match) => match[1]);
    expect(inputs).toEqual([
      'provider',
      'event-json',
      'event-file',
      'webhook-url',
      'fail-on-notification-error',
      'delivered',
      'provider',
      'event-type',
      'status',
      'attempts',
    ]);
    expect(action).not.toMatch(/email|teams-connector|office365-connector/i);
  });

  it('limits manual smoke to fixed dispatch choices and local Action use', async () => {
    const workflow = await read('.github/workflows/provider-smoke.yml');
    const trigger = workflow.split('permissions:')[0];
    expect(trigger).toMatch(/on:\s+workflow_dispatch:/);
    expect(trigger).not.toMatch(/^\s+(pull_request|push|schedule|release):/m);
    expect(workflow).toMatch(/permissions:\s+contents: read/);
    expect(workflow).toMatch(/concurrency:\s+group: notify-provider-smoke\s+cancel-in-progress: false/);
    expect(workflow).toContain('environment: provider-smoke');
    expect(workflow).toContain('SEND-COMMERCEKIT-TEST-NOTIFICATION');
    expect(workflow).toContain('type: choice');
    for (const choice of [
      'slack',
      'teams-workflow',
      'check-success',
      'check-failure',
      'build-success',
      'build-failure',
      'deployment-action-required',
      'deployment-success',
      'deployment-failure',
    ])
      expect(workflow).toContain(`- ${choice}`);
    expect(workflow).toMatch(/confirmation:[\s\S]*required: true/);
    expect(workflow).toContain('uses: ./');
    expect(workflow).toContain("fail-on-notification-error: 'true'");
    expect(workflow).not.toMatch(/upload-artifact|pull_request_target|webhook-url:\s*\$\{\{\s*inputs\./);
  });
});
