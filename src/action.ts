import * as core from '@actions/core';
import { parseEvent } from './event/parse.js';
import { createPresentation } from './presentation/create-presentation.js';
import { renderSlack } from './providers/slack/render.js';
import { renderTeams } from './providers/teams-workflow/render.js';
import { validateWebhook } from './delivery/url-validation.js';
import { deliver } from './delivery/webhook.js';
import { enrichContext } from './event/enrich-context.js';
export async function runAction(): Promise<void> {
  let provider = '',
    eventType = '',
    status = '',
    attempts = '0';
  let failOn = 'false';
  try {
    failOn = core.getInput('fail-on-notification-error') || 'false';
    provider = core.getInput('provider', { required: true });
    if (provider !== 'slack' && provider !== 'teams-workflow')
      throw new Error('provider must be slack or teams-workflow.');
    const webhook = core.getInput('webhook-url', { required: true });
    core.setSecret(webhook);
    if (!['true', 'false'].includes(failOn)) throw new Error('fail-on-notification-error must be true or false.');
    const parsedEvent = await parseEvent({
      json: core.getInput('event-json') || undefined,
      file: core.getInput('event-file') || undefined,
    });
    const event = enrichContext(parsedEvent);
    eventType = String(event.eventType);
    status = String(event.status);
    const url = validateWebhook(webhook, provider);
    const presentation = createPresentation(event);
    const payload = provider === 'slack' ? renderSlack(presentation) : renderTeams(presentation);
    try {
      const result = await deliver(provider, url, payload);
      attempts = String(result.attempts);
      core.setOutput('delivered', 'true');
    } catch (error) {
      attempts = String((error as { attempts?: number }).attempts ?? 0);
      core.setOutput('delivered', 'false');
      const message = error instanceof Error ? error.message : 'Notification delivery failed.';
      if (failOn === 'true') throw error;
      core.warning(message);
    }
    core.setOutput('provider', provider);
    core.setOutput('event-type', eventType);
    core.setOutput('status', status);
    core.setOutput('attempts', attempts);
  } catch (error) {
    core.setOutput('delivered', 'false');
    core.setOutput('provider', provider);
    core.setOutput('event-type', eventType);
    core.setOutput('status', status);
    core.setOutput('attempts', attempts);
    const safeMessage = error instanceof Error ? error.message : 'Notification action failed.';
    core.setFailed(safeMessage);
  }
}
