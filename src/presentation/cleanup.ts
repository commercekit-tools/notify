import type { NotificationStatus } from '@commercekit-tools/notification-contract';
import type { Presentation } from './types.js';

type Data = Record<string, unknown>;
type Format = (_value: unknown) => string;
const object = (value: unknown): Data =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Data) : {};
const bound = (value: string, maximum: number): string => {
  const characters = [...value];
  const ending = '… [truncated]';
  return characters.length > maximum ? `${characters.slice(0, maximum - ending.length).join('')}${ending}` : value;
};

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
  const sections: NonNullable<Presentation['sections']> = [{ title: 'Result', facts: counts }];
  return { title, summary, sections };
}
