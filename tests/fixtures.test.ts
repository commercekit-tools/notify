import { describe, it, expect } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { validateEvent } from '../src/event/validate.js';
import { createPresentation } from '../src/presentation/create-presentation.js';
import { renderSlack } from '../src/providers/slack/render.js';
import { renderTeams } from '../src/providers/teams-workflow/render.js';
import { theme } from '../src/presentation/theme.js';

const titles: Record<string, string> = {
  'check-success': 'CommerceKit check succeeded',
  'check-warning': 'CommerceKit check completed with warnings',
  'check-failure': 'CommerceKit check failed',
  'check-cancelled': 'CommerceKit check cancelled',
  'check-internal-error': 'CommerceKit check encountered an internal error',
  'build-started': 'CCv2 build started',
  'build-success': 'CCv2 build succeeded',
  'build-failure': 'CCv2 build failed',
  'build-cancelled': 'CCv2 build cancelled',
  'build-internal-error': 'CCv2 build encountered an internal error',
  'deployment-started': 'CCv2 deployment started',
  'deployment-action-required': 'CCv2 deployment requires a decision',
  'deployment-success': 'CCv2 deployment succeeded',
  'deployment-failure': 'CCv2 deployment failed',
  'deployment-cancelled': 'CCv2 deployment cancelled',
  'deployment-internal-error': 'CCv2 deployment encountered an internal error',
};
describe('golden synthetic events', () => {
  it('validates and renders each supported event fixture deterministically', async () => {
    const names = (await readdir(new URL('./fixtures/events/', import.meta.url)))
      .filter((n) => n.endsWith('.json'))
      .sort();
    expect(names).toHaveLength(16);
    for (const name of names) {
      const event = JSON.parse(await readFile(new URL(`./fixtures/events/${name}`, import.meta.url), 'utf8'));
      validateEvent(event);
      const presentation = createPresentation(event);
      expect(presentation.title).toBe(titles[name.replace('.json', '')]);
      expect(presentation.category).toContain('CommerceKit');
      expect(presentation.statusLabel).toBe(theme[event.status as keyof typeof theme].label);
      expect(presentation.icon).toBe(theme[event.status as keyof typeof theme].icon);
      expect(presentation.summary).toBeTruthy();
      expect(presentation.highlights.at(-1)).toEqual({ label: 'Occurred', value: '2026-11-01 20:20:00 UTC' });
      const slack = renderSlack(presentation);
      const teams = renderTeams(presentation);
      expect(slack).toEqual(renderSlack(createPresentation(event)));
      expect(teams).toEqual(renderTeams(createPresentation(event)));
      expect(slack.text).toContain(presentation.title);
      expect(slack.text).toContain(presentation.summary);
      expect(slack.attachments).toHaveLength(1);
      expect(slack.attachments[0].color).toBe(theme[event.status as keyof typeof theme].accent);
      expect(slack.blocks).toMatchObject([{ type: 'context' }]);
      expect(slack.attachments[0].blocks[0]).toMatchObject({ type: 'header' });
      expect(teams.attachments[0].content).toMatchObject({ type: 'AdaptiveCard', version: '1.2' });
      expect(teams.attachments[0].content.body[0]).toMatchObject({
        type: 'Container',
        style: theme[event.status as keyof typeof theme].teams,
      });
      expect(JSON.stringify(teams)).toContain('Action.OpenUrl');
      expect(JSON.stringify(teams)).not.toContain('Action.Submit');
      expect(presentation.actions[0]?.label).toBe('View workflow');
      expect(slack).toMatchSnapshot(`${name}: Slack`);
      expect(teams).toMatchSnapshot(`${name}: Teams Workflows`);
    }
  });

  it('uses the same outcome language for check, build, and deployment', async () => {
    for (const [status, ending] of [
      ['success', 'succeeded'],
      ['failure', 'failed'],
      ['cancelled', 'cancelled'],
      ['internal-error', 'encountered an internal error'],
    ]) {
      for (const operation of ['check', 'build', 'deployment']) {
        const event = JSON.parse(
          await readFile(new URL(`./fixtures/events/${operation}-${status}.json`, import.meta.url), 'utf8'),
        );
        const presentation = createPresentation(event);
        expect(presentation.title).toMatch(new RegExp(`${ending}$`));
        expect(presentation.statusLabel).toBe(theme[status as keyof typeof theme].label);
      }
    }
  });

  it('gives key identifiers, time, outcome, and details distinct places', async () => {
    const event = JSON.parse(await readFile(new URL('./fixtures/events/build-success.json', import.meta.url), 'utf8'));
    validateEvent(event);
    const presentation = createPresentation(event);
    expect(presentation.summary).toBe('Build build-example is ready for deployment.');
    expect(presentation.highlights).toEqual([
      { label: 'Build code', value: 'build-example' },
      { label: 'Occurred', value: '2026-11-01 20:20:00 UTC' },
    ]);
    expect(presentation.facts.map((fact) => fact.label)).toEqual(['Application', 'Status', 'Repository']);
    expect(renderSlack(presentation).attachments[0].blocks.map((block) => block.type)).toEqual([
      'header',
      'section',
      'divider',
      'section',
      'section',
      'actions',
      'context',
    ]);
    const card = renderTeams(presentation).attachments[0].content;
    expect(card.body.map((element) => element.type)).toEqual(['Container', 'FactSet', 'Container', 'TextBlock']);
    expect(card.body[0]).toMatchObject({ style: 'good' });
    expect(card.body[2]).toMatchObject({ style: 'emphasis' });
    expect(card.actions).toMatchObject([
      { type: 'Action.OpenUrl', title: 'View workflow' },
      { type: 'Action.OpenUrl', title: 'View build progress' },
    ]);
  });

  it('keeps check metrics numeric and gives action-required a clear next step', async () => {
    const check = JSON.parse(await readFile(new URL('./fixtures/events/check-success.json', import.meta.url), 'utf8'));
    const deployment = JSON.parse(
      await readFile(new URL('./fixtures/events/deployment-action-required.json', import.meta.url), 'utf8'),
    );
    const checkPresentation = createPresentation(check);
    const deploymentPresentation = createPresentation(deployment);
    expect(checkPresentation.facts).toContainEqual({ label: 'Files checked', value: '18' });
    expect(checkPresentation.facts).toContainEqual({ label: 'Errors', value: '0' });
    expect(checkPresentation.facts).toContainEqual({ label: 'Warnings', value: '0' });
    expect(deploymentPresentation.summary).toBe(
      'Deployment deploy-example is waiting for a decision. Review the workflow run to continue.',
    );
    expect(deploymentPresentation.highlights[0]).toEqual({ label: 'Deployment code', value: 'deploy-example' });
  });

  it('uses workflow and known progress links without inventing a started build code', async () => {
    const load = async (name: string) =>
      JSON.parse(await readFile(new URL(`./fixtures/events/${name}.json`, import.meta.url), 'utf8'));
    const started = createPresentation(await load('build-started'));
    expect(started.highlights[0]).toEqual({ label: 'Build name', value: 'Main build' });
    expect(started.actions).toEqual([
      { label: 'View workflow', url: 'https://github.com/example-org/project/actions/runs/123456' },
    ]);
    expect(JSON.stringify(renderSlack(started))).not.toContain('build-example');

    for (const [fixture, label, url] of [
      ['build-success', 'View build progress', 'https://portal.example.org/builds/build-example'],
      [
        'deployment-action-required',
        'View deployment progress',
        'https://portal.example.org/deployments/deploy-example',
      ],
    ]) {
      const presentation = createPresentation(await load(fixture));
      expect(presentation.actions.map((action) => action.label)).toEqual(['View workflow', label]);
      expect(presentation.actions[1]?.url).toBe(url);
      const slack = renderSlack(presentation);
      const teams = renderTeams(presentation);
      const slackActions = slack.attachments[0].blocks.find((block) => block.type === 'actions') as {
        elements: { url: string }[];
      };
      expect(slackActions.elements.map((action) => action.url)).toEqual(
        presentation.actions.map((action) => action.url),
      );
      expect(teams.attachments[0].content.actions?.map((action) => action.url)).toEqual(
        presentation.actions.map((action) => action.url),
      );
      expect(JSON.stringify(slack)).not.toContain('commercekit.tools/docs');
      expect(JSON.stringify(teams)).not.toContain('commercekit.tools/docs');
    }
  });
});
