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

  it('prepares only a gated, immutable draft release from main', async () => {
    const workflow = await read('.github/workflows/marketplace-release.yml');
    const trigger = workflow.split('permissions:')[0];
    expect(trigger).toMatch(/on:\s+workflow_dispatch:/);
    expect(trigger).not.toMatch(/^\s+(pull_request|pull_request_target|push|schedule|release):/m);
    expect(workflow).toMatch(/permissions:\s+contents: read/);
    expect(workflow).toMatch(
      /prepare-draft:[\s\S]*environment: marketplace-release[\s\S]*permissions:\s+contents: write/,
    );
    expect(workflow).toMatch(/if: github\.ref == 'refs\/heads\/main'/);
    expect(workflow).toContain('SLACK-AND-TEAMS-SMOKE-PASSED');
    expect(workflow).toMatch(/producer-confirmation:\s+description:[^\n]+\s+required: true\s+type: string/);
    expect(workflow).toContain("PRODUCER_CONFIRMATION: ${{ inputs['producer-confirmation'] }}");
    expect(workflow).toContain('test "$PRODUCER_CONFIRMATION" = \'CCV2-BUILD-AND-DEPLOY-READY\'');
    expect(workflow).toContain('MARKETPLACE-NAME-VALIDATED');
    expect(workflow).toContain('PREPARE-COMMERCEKIT-V1.0.0');
    expect(workflow).toMatch(/version:[\s\S]*type: choice\s+options:\s+- v1\.0\.0/);
    expect(workflow).toContain('pnpm quality');
    expect(workflow).toContain('git tag -a "$VERSION" "$GITHUB_SHA"');
    expect(workflow).toContain('gh release create "$VERSION" --draft --verify-tag');
    expect(workflow).toMatch(/git ls-remote origin refs\/heads\/main/);
    expect(workflow).toMatch(/git ls-remote --exit-code --tags origin/);
    expect(workflow).toMatch(/concurrency:\s+group: notify-marketplace-release\s+cancel-in-progress: false/);
    expect(workflow).not.toMatch(
      /upload-artifact|secrets\.(?!GITHUB_TOKEN)|uses: \.\/|--force|gh release create[^\n]*--latest/,
    );
    const actionPins = [...workflow.matchAll(/uses: [^\s@]+@([a-f0-9]{40})/g)];
    expect(actionPins).toHaveLength(3);
    expect(workflow.match(/^\s+- uses: [^\n]+@/gm)).toHaveLength(actionPins.length);
  });
});

it.each(['ci.yml', 'marketplace-release.yml'])('limits package authentication to installation in %s', async (name) => {
  const workflow = await read(`.github/workflows/${name}`);
  expect(workflow).toContain('packages: read');
  expect(workflow).toContain('registry-url: https://npm.pkg.github.com');
  expect(workflow).toContain("scope: '@commercekit-tools'");
  expect(workflow.match(/NODE_AUTH_TOKEN:/g)).toHaveLength(1);
  expect(workflow).toMatch(
    /- run: pnpm install --frozen-lockfile\n {8}env:\n {10}NODE_AUTH_TOKEN: \$\{\{ secrets.GITHUB_TOKEN \}\}/,
  );
  expect(workflow).not.toMatch(/packages: write|actions: write|pull-requests: write|id-token: write/);
});
