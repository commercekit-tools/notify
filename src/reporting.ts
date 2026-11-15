import * as core from '@actions/core';
import {
  createActionInputContext,
  extractSafeGitHubContext,
  renderActionSummary,
  sanitizeActionText,
} from '@commercekit-tools/notification-contract';
import type { NotificationStatus } from '@commercekit-tools/notification-contract';

export const notifyInputDefinitions = [
  { name: 'provider' },
  { name: 'event-json', display: 'presence' },
  { name: 'event-file', display: 'presence' },
  { name: 'webhook-url', confidential: true },
  { name: 'fail-on-notification-error' },
] as const;

/** Only reviewed diagnostic forms can become public errors; arbitrary exceptions stay private. */
export function safeNotifyMessage(error: unknown, secrets: readonly string[]): string {
  if (
    error &&
    typeof error === 'object' &&
    'code' in error &&
    ['ENOENT', 'EACCES', 'EPERM', 'EISDIR'].includes(String(error.code))
  )
    return 'Event file could not be read. Check that event-file points to a readable regular file.';
  const message = error instanceof Error ? error.message : '';
  if (
    /^(?:provider must be slack or teams-workflow\.|webhook-url is required\.|fail-on-notification-error must be true or false\.|Supply exactly one of event-json or event-file\.|Webhook URL (?:contains control characters|is malformed|must use HTTPS without credentials or fragments)\.|Slack webhook URL must use an official Slack webhook host\.|Teams webhook URL cannot use a (?:local host|private, loopback, link-local, or unspecified address)\.|event-file must be a regular non-symbolic-link file\.|event-file exceeds the 64 KiB limit\.|Event (?:JSON exceeds the 64 KiB limit|input is not valid JSON)\.|Invalid NotificationEvent v1 JSON object: check schema version, data and eventType\/status combination\.|NotificationEvent links and context\.runUrl must be bounded HTTPS URLs without credentials or fragments\.|Notification webhook redirected; redirects are not allowed\.|Notification request (?:timed out|failed due to a network error)\.|(?:Slack|Teams Workflow) webhook returned HTTP \d{3}(?:; retry limit exhausted)?\.|Teams Workflow card exceeds the 27 KiB safety limit\.|Slack message exceeds the Block Kit block limit\.)$/u.test(
      message,
    )
  )
    return sanitizeActionText(message, 1000, secrets);
  return 'Notification action failed. Review the configured inputs and workflow logs.';
}

export async function reportDelivery(outcome: {
  rawInputs: Record<string, string>;
  inputsValidated: boolean;
  severity: NotificationStatus;
  delivered: boolean;
  provider: string;
  eventType: string;
  sourceStatus: string;
  attempts: number;
  durationMs: number;
  outputFailure?: boolean;
  error?: string;
}): Promise<void> {
  try {
    const secrets = [outcome.rawInputs['webhook-url'] ?? ''];
    const context = extractSafeGitHubContext(process.env);
    const inputContext = createActionInputContext(notifyInputDefinitions, outcome.rawInputs, {
      validated: outcome.inputsValidated,
      effective: { 'fail-on-notification-error': outcome.rawInputs['fail-on-notification-error'] || 'false' },
      secrets,
    });
    const summary = renderActionSummary({
      title: 'CommerceKit Notifications',
      status: outcome.severity,
      description: outcome.delivered ? 'The notification was delivered.' : 'The notification was not delivered.',
      inputContext,
      facts: [
        { label: 'Delivered', value: outcome.delivered },
        { label: 'Provider', value: outcome.provider || 'Not validated' },
        { label: 'Event type', value: outcome.eventType || 'Not parsed' },
        { label: 'Source outcome', value: outcome.sourceStatus || 'Not parsed' },
        { label: 'Delivery attempts', value: outcome.attempts },
        { label: 'Duration (ms)', value: outcome.durationMs },
      ],
      ...(outcome.error
        ? {
            error: {
              code: !outcome.inputsValidated
                ? 'notification-configuration-failed'
                : outcome.attempts
                  ? 'notification-not-delivered'
                  : 'notification-payload-failed',
              message: outcome.error,
            },
          }
        : {}),
      ...(outcome.outputFailure
        ? {
            issues: [
              {
                code: 'notification-output-failure',
                message:
                  'One or more Action outputs could not be written. The known delivery result and attempt count are preserved above.',
              },
            ],
          }
        : {}),
      ...(context.runUrl ? { links: [{ label: 'View workflow', url: context.runUrl }] } : {}),
      secrets,
    });
    await core.summary.addRaw(summary).write();
  } catch {
    core.warning(
      'Notification job summary could not be written; delivery outputs and the Action outcome are preserved.',
    );
  }
}
