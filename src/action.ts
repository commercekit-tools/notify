import * as core from '@actions/core';
import { captureActionInputs } from '@commercekit-tools/notification-contract';
import { parseEvent } from './event/parse.js';
import { createPresentation } from './presentation/create-presentation.js';
import { renderSlack } from './providers/slack/render.js';
import { renderTeams } from './providers/teams-workflow/render.js';
import { validateWebhook } from './delivery/url-validation.js';
import { deliver } from './delivery/webhook.js';
import { enrichContext } from './event/enrich-context.js';
import { notifyInputDefinitions, reportDelivery, safeNotifyMessage } from './reporting.js';
export async function runAction(): Promise<void> {
  const started = Date.now();
  let rawInputs: Record<string, string> = {};
  let provider = '',
    eventType = '',
    status = '';
  let attempts = 0;
  let inputsValidated = false;
  let delivered = false;
  let severity: 'success' | 'warning' | 'failure' = 'failure';
  let problem: string | undefined;
  let fatalMessage: string | undefined;
  try {
    rawInputs = captureActionInputs(notifyInputDefinitions, (name) => core.getInput(name), core.setSecret);
    const failOn = rawInputs['fail-on-notification-error'] || 'false';
    const selected = rawInputs['provider'];
    if (selected !== 'slack' && selected !== 'teams-workflow')
      throw new Error('provider must be slack or teams-workflow.');
    provider = selected;
    const webhook = rawInputs['webhook-url'];
    if (!webhook) throw new Error('webhook-url is required.');
    if (!['true', 'false'].includes(failOn)) throw new Error('fail-on-notification-error must be true or false.');
    const parsedEvent = await parseEvent({
      json: rawInputs['event-json'] || undefined,
      file: rawInputs['event-file'] || undefined,
    });
    const event = enrichContext(parsedEvent);
    eventType = String(event.eventType);
    status = String(event.status);
    const url = validateWebhook(webhook, selected);
    inputsValidated = true;
    const presentation = createPresentation(event, [webhook]);
    const payload = selected === 'slack' ? renderSlack(presentation) : renderTeams(presentation);
    try {
      const result = await deliver(selected, url, payload);
      attempts = result.attempts;
      delivered = true;
      severity = 'success';
    } catch (error) {
      const count = error && typeof error === 'object' && 'attempts' in error ? error.attempts : undefined;
      attempts = typeof count === 'number' && Number.isSafeInteger(count) && count >= 0 && count <= 3 ? count : 0;
      problem = safeNotifyMessage(error, [webhook]);
      if (failOn === 'true') throw error;
      severity = 'warning';
      core.warning(problem);
    }
  } catch (error) {
    severity = 'failure';
    problem = safeNotifyMessage(error, [rawInputs['webhook-url'] ?? '']);
    fatalMessage = problem;
  } finally {
    let outputFailure = false;
    for (const [name, value] of [
      ['delivered', delivered ? 'true' : 'false'],
      ['provider', provider],
      ['event-type', eventType],
      ['status', status],
      ['attempts', String(attempts)],
    ]) {
      try {
        core.setOutput(name!, value);
      } catch {
        outputFailure = true;
      }
    }
    if (outputFailure) {
      severity = 'failure';
      fatalMessage ??=
        'Notification delivery state was preserved, but one or more Action outputs could not be written.';
    }
    await reportDelivery({
      rawInputs,
      inputsValidated,
      severity,
      delivered,
      provider,
      eventType,
      sourceStatus: status,
      attempts,
      outputFailure,
      durationMs: Math.max(0, Date.now() - started),
      ...(problem ? { error: problem } : {}),
    });
    if (fatalMessage) core.setFailed(fatalMessage);
  }
}
