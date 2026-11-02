import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { validateEvent } from '../src/event/validate.js';
import { createPresentation } from '../src/presentation/create-presentation.js';
import { renderSlack } from '../src/providers/slack/render.js';
import { renderTeams } from '../src/providers/teams-workflow/render.js';

const args = process.argv.slice(2);
if (args.length !== 4 || args[0] !== '--provider' || args[2] !== '--event') {
  throw new Error('Usage: pnpm payload:preview --provider slack|teams-workflow --event fixture-name');
}
const provider = args[1];
const fixture = args[3];
if (provider !== 'slack' && provider !== 'teams-workflow') throw new Error('Unsupported preview provider.');
if (!/^[a-z]+(?:-[a-z]+)*$/.test(fixture)) throw new Error('Invalid fixture name.');
const fixturePath = resolve(process.cwd(), 'tests', 'fixtures', 'events', `${fixture}.json`);
let input: string;
try {
  input = await readFile(fixturePath, 'utf8');
} catch {
  throw new Error('Unknown synthetic event fixture.');
}
const event: unknown = JSON.parse(input);
validateEvent(event);
const presentation = createPresentation(event);
const payload = provider === 'slack' ? renderSlack(presentation) : renderTeams(presentation);
process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
