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
  'check-internal-error': 'CommerceKit check encountered an internal error',
  'build-started': 'CCv2 build started',
  'build-success': 'CCv2 build succeeded',
  'build-failure': 'CCv2 build failed',
  'build-cancelled': 'CCv2 build cancelled',
  'deployment-started': 'CCv2 deployment started',
  'deployment-action-required': 'CCv2 deployment requires a decision',
  'deployment-success': 'CCv2 deployment succeeded',
  'deployment-failure': 'CCv2 deployment failed',
  'deployment-cancelled': 'CCv2 deployment cancelled',
  'deployment-internal-error': 'CommerceKit could not complete the CCv2 deployment workflow',
};
describe('golden synthetic events', () => {
  it('validates and renders each supported event fixture deterministically', async () => {
    const names = (await readdir(new URL('./fixtures/events/', import.meta.url)))
      .filter((n) => n.endsWith('.json'))
      .sort();
    expect(names).toHaveLength(14);
    for (const name of names) {
      const event = JSON.parse(await readFile(new URL(`./fixtures/events/${name}`, import.meta.url), 'utf8'));
      validateEvent(event);
      const presentation = createPresentation(event);
      expect(presentation.title).toBe(titles[name.replace('.json', '')]);
      const slack = renderSlack(presentation);
      const teams = renderTeams(presentation);
      expect(slack).toEqual(renderSlack(createPresentation(event)));
      expect(teams).toEqual(renderTeams(createPresentation(event)));
      expect(slack.text).toContain(presentation.title);
      expect(slack.attachments).toHaveLength(1);
      expect(slack.attachments[0].color).toBe(theme[event.status as keyof typeof theme].accent);
      expect(slack.attachments[0].blocks[0]).toMatchObject({ type: 'header' });
      expect(teams.attachments[0].content).toMatchObject({ type: 'AdaptiveCard', version: '1.2' });
      expect(teams.attachments[0].content.body[0]).toMatchObject({ type: 'Container' });
      expect(JSON.stringify(teams)).toContain('Action.OpenUrl');
      expect(JSON.stringify(teams)).not.toContain('Action.Submit');
      expect(presentation.actions[0]?.label).toBe('View workflow');
    }
  });
});
