import type { NotificationStatus } from '@commercekit-tools/notification-contract';
import type { Presentation } from './types.js';

const inputNames = [
  'token-endpoint',
  'client-id',
  'client-secret',
  'resource',
  'subscription-code',
  'api-base-url',
  'application-code',
  'retention-days',
  'keep-latest',
  'dry-run',
  'max-deletions',
  'exclude-build-codes',
  'timeout-minutes',
  'continue-on-delete-error',
] as const;
const confidential = new Set<string>(['token-endpoint', 'client-id', 'client-secret', 'resource']);
type Data = Record<string, unknown>;
type Format = (_value: unknown) => string;
const object = (value: unknown): Data =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Data) : {};
const bound = (value: string, maximum: number): string => {
  const characters = [...value];
  const ending = '… [truncated]';
  return characters.length > maximum ? `${characters.slice(0, maximum - ending.length).join('')}${ending}` : value;
};

/** Defense for direct presentation callers; validated new events already redact these. */
export function cleanupConfidentialValues(data: Data): string[] {
  const inputs = object(data.inputs);
  return [...confidential]
    .map((name) => inputs[name])
    .filter((value): value is string => typeof value === 'string' && value.length > 0 && value !== '[REDACTED]');
}

export function cleanupDetails(status: NotificationStatus, data: Data, format: Format) {
  const mode = data.mode === 'dry-run' ? 'DRY RUN' : 'APPLY';
  const accepted = format(data.deletionRequestedCount) || '0';
  const outcome = format(data.cleanupStatus) || 'unreported';
  const error = object(data.error);
  const issues = Array.isArray(data.issues) ? data.issues.slice(0, 3).map(object) : [];
  const description = bound(format(error.message) || format(issues[0]?.message), 160);
  const title =
    status === 'success'
      ? 'CCv2 build cleanup completed'
      : status === 'warning'
        ? 'CCv2 build cleanup completed with warnings'
        : status === 'cancelled'
          ? 'CCv2 build cleanup cancelled'
          : 'CCv2 build cleanup failed';
  const fallback =
    status === 'warning'
      ? 'Cleanup requires attention; review the reported issues.'
      : status === 'cancelled'
        ? 'Cleanup was cancelled before completion.'
        : outcome === 'outcome-unknown'
          ? 'A deletion request outcome could not be established; further deletion was stopped.'
          : outcome === 'blocked'
            ? 'Safety evidence did not permit cleanup.'
            : 'Cleanup could not complete; review the workflow report.';
  const summary =
    status === 'success'
      ? data.mode === 'dry-run'
        ? `${mode}: ${format(data.plannedCount)} planned targets; ${accepted} deletion requests accepted. Cleanup was not applied.`
        : `${mode}: ${accepted} build deletion requests accepted. Physical removal is not confirmed. Outcome: ${outcome}.`
      : `${mode}: ${description || fallback} ${accepted} deletion requests accepted. Outcome: ${outcome}.`;
  const counts = [
    ['Scanned', 'scannedCount'],
    ['Eligible', 'eligibleCount'],
    ['Planned', 'plannedCount'],
    ['Requests accepted', 'deletionRequestedCount'],
    ['Protected', 'protectedCount'],
    ['Blocked', 'blockedCount'],
    ['Skipped', 'skippedCount'],
    ['Deferred', 'deferredCount'],
    ['Failed', 'failedCount'],
    ['Unknown', 'unknownCount'],
  ].map(([label, key]) => ({ label: label!, value: format(data[key!]) || 'Not reported' }));
  const sections: NonNullable<Presentation['sections']> = [{ title: 'Cleanup counts', facts: counts }];
  const hasInputs = data.inputs && typeof data.inputs === 'object' && !Array.isArray(data.inputs);
  if (hasInputs) {
    const inputs = object(data.inputs);
    sections.push({
      title: data.inputsValidated === false ? 'Inputs — validation failed' : 'Cleanup inputs',
      facts: inputNames.map((name) => ({
        label: name,
        value: confidential.has(name) ? '[REDACTED]' : bound(format(inputs[name]) || 'Not included', 256),
      })),
    });
  } else {
    sections.push({
      title: 'Cleanup policy',
      facts: [
        { label: 'retention-days', value: format(data.retentionDays) || 'Not reported' },
        { label: 'keep-latest', value: format(data.keepLatest) || 'Not reported' },
        { label: 'Input context', value: 'Complete input context was not included in this event.' },
      ],
    });
  }
  if (data.inputsTruncated === true || data.inputsValidated === false) {
    sections.push({
      title: 'Input notes',
      facts: [
        ...(data.inputsValidated === false
          ? [{ label: 'Validation', value: 'The supplied inputs were rejected before cleanup started.' }]
          : []),
        ...(data.inputsTruncated === true
          ? [{ label: 'Truncation', value: 'Some input values are truncated; review the workflow configuration.' }]
          : []),
      ],
    });
  }
  if (format(error.code) || format(error.message)) {
    sections.push({
      title: 'What went wrong',
      facts: [
        ...(format(error.code) ? [{ label: 'Error code', value: bound(format(error.code), 100) }] : []),
        ...(format(error.message) ? [{ label: 'Error', value: bound(format(error.message), 160) }] : []),
      ],
    });
  }
  if (issues.length) {
    sections.push({
      title: 'Cleanup issues',
      facts: issues.map((issue, index) => ({
        label: bound(format(issue.code), 100) || `Issue ${index + 1}`,
        value: bound(format(issue.message), 160) || 'Review the workflow report.',
      })),
    });
  }
  return { title, summary, sections };
}
