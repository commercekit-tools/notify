import { describe, it, expect } from 'vitest';
import { readdir, readFile } from 'node:fs/promises';
import { validateEvent } from '../src/event/validate.js';
import { createPresentation } from '../src/presentation/create-presentation.js';
import { renderSlack } from '../src/providers/slack/render.js';
import { renderTeams } from '../src/providers/teams-workflow/render.js';
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
      expect(renderSlack(presentation)).toEqual(renderSlack(createPresentation(event)));
      expect(renderTeams(presentation)).toEqual(renderTeams(createPresentation(event)));
    }
  });
});
