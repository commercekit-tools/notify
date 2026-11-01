import type { NotificationEvent } from '../event/types.js';
import { sanitize, sanitizeLabel, safePlainText } from '../event/sanitize.js';
import { theme } from './theme.js';
import type { Presentation } from './types.js';
const str = (v: unknown): string => (typeof v === 'string' ? sanitize(v) : '');
const duration = (v: unknown): string => (typeof v === 'number' ? `${Math.round(v / 1000)}s` : '');
export function createPresentation(event: NotificationEvent): Presentation {
  const t = theme[event.status],
    d = event.data as Record<string, unknown>,
    c = (event.context ?? {}) as Record<string, unknown>;
  let title = '',
    summary = '';
  const facts: Presentation['facts'] = [];
  const add = (label: string, value: unknown) => {
    const v = str(value);
    if (v) facts.push({ label, value: v });
  };
  if (event.eventType === 'check.completed') {
    title =
      event.status === 'success'
        ? 'CommerceKit check succeeded'
        : event.status === 'warning'
          ? 'CommerceKit check completed with warnings'
          : event.status === 'failure'
            ? 'CommerceKit check failed'
            : event.status === 'cancelled'
              ? 'CommerceKit check cancelled'
              : 'CommerceKit check encountered an internal error';
    const hasCounts = ['filesChecked', 'errors', 'warnings'].every((key) => typeof d[key] === 'number');
    const errors = d.errors as number | undefined;
    const warnings = d.warnings as number | undefined;
    const files = d.filesChecked as number | undefined;
    summary = hasCounts
      ? event.status === 'success'
        ? `${files} files checked with no errors.`
        : event.status === 'warning'
          ? `${warnings} warnings across ${files} files.`
          : event.status === 'failure'
            ? `${errors} errors and ${warnings} warnings across ${files} files.`
            : str((d.error as Record<string, unknown> | undefined)?.message) || t.label
      : str((d.error as Record<string, unknown> | undefined)?.message) || t.label;
    add('Mode', d.mode);
    add('Changed from', d.changedFrom);
    add('Files checked', d.filesChecked);
    add('Duration', duration(d.durationMs));
  } else if (event.eventType.startsWith('ccv2.build.')) {
    title =
      event.status === 'started'
        ? 'CCv2 build started'
        : event.status === 'success'
          ? 'CCv2 build succeeded'
          : event.status === 'failure'
            ? 'CCv2 build failed'
            : event.status === 'cancelled'
              ? 'CCv2 build cancelled'
              : 'CommerceKit could not complete the CCv2 build workflow';
    summary = str((d.error as Record<string, unknown> | undefined)?.message);
    add('Application', d.applicationCode);
    add('Branch', d.branch);
    add('Build code', d.buildCode);
    add('Build name', d.buildName);
    add('Status', d.buildStatus);
    add('Duration', duration(d.durationMs));
    add('Retries', d.retryCount);
  } else {
    title =
      event.status === 'started'
        ? 'CCv2 deployment started'
        : event.status === 'action-required'
          ? 'CCv2 deployment requires a decision'
          : event.status === 'success'
            ? 'CCv2 deployment succeeded'
            : event.status === 'failure'
              ? 'CCv2 deployment failed'
              : event.status === 'cancelled'
                ? 'CCv2 deployment cancelled'
                : 'CommerceKit could not complete the CCv2 deployment workflow';
    summary = str((d.error as Record<string, unknown> | undefined)?.message);
    add('Environment', d.environmentCode);
    add('Deployment code', d.deploymentCode);
    add('Build code', d.buildCode);
    add('Strategy', d.deploymentMode);
    add('Database update', d.databaseUpdateMode);
    add('Status', d.deploymentStatus);
    add('Duration', duration(d.durationMs));
    add('Decision', d.decisionType);
  }
  add('Repository', c.repository);
  const eventLinks = event.links ?? [];
  const links =
    eventLinks.length > 0
      ? eventLinks.map((link) => ({ label: safePlainText(sanitizeLabel(link.label)), url: link.url }))
      : typeof c.runUrl === 'string'
        ? [{ label: 'View workflow', url: c.runUrl }]
        : [];
  const footer = [
    str(c.workflow),
    str(c.runId) ? `Run ${str(c.runId)}` : '',
    typeof c.runAttempt === 'number' ? `Attempt ${c.runAttempt}` : '',
  ]
    .filter(Boolean)
    .join(' · ');
  return {
    title,
    status: event.status,
    statusLabel: t.label,
    icon: t.icon,
    tone: t.tone,
    accent: t.accent,
    summary: sanitize(summary).slice(0, 1000) || undefined,
    facts: facts.slice(0, 9),
    actions: links.slice(0, 3),
    footer: footer ? sanitize(footer) : undefined,
  };
}
