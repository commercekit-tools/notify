import { redactKnownSecrets } from '@commercekit-tools/notification-contract';
import { cleanupDetails } from './cleanup.js';
import { confidentialValues, detailSections, safeActionLink } from './details.js';
import type { NotificationEvent } from '@commercekit-tools/notification-contract';
import { sanitize, sanitizeLabel, safePlainText } from './sanitize.js';
import { theme } from './theme.js';
import type { Presentation } from './types.js';
const stringValue = (v: unknown): string =>
  typeof v === 'string' ? sanitize(v) : typeof v === 'number' && Number.isFinite(v) ? String(v) : '';
const duration = (v: unknown): string => (typeof v === 'number' ? `${Math.round(v / 1000)}s` : '');
const occurred = (value: string): string => `${new Date(value).toISOString().slice(0, 19).replace('T', ' ')} UTC`;
export function createPresentation(event: NotificationEvent, secrets: readonly string[] = []): Presentation {
  const t = theme[event.status],
    d = event.data as Record<string, unknown>,
    c = (event.context ?? {}) as Record<string, unknown>;
  const confidential = [...secrets, ...confidentialValues(d)];
  const str = (value: unknown): string =>
    stringValue(typeof value === 'string' ? redactKnownSecrets(value, confidential) : value);
  const sections: NonNullable<Presentation['sections']> = [];
  let category = '',
    title = '',
    summary = '';
  const highlights: Presentation['highlights'] = [];
  const facts: Presentation['facts'] = [];
  const highlight = (label: string, value: unknown) => {
    const v = str(value);
    if (v) highlights.push({ label, value: v });
  };
  const add = (label: string, value: unknown) => {
    const v = str(value);
    if (v) facts.push({ label, value: v });
  };
  if (event.eventType === 'commercekit.setup.completed') {
    category = 'CommerceKit · CLI setup';
    title =
      event.status === 'success'
        ? 'CommerceKit CLI setup succeeded'
        : event.status === 'warning'
          ? 'CommerceKit CLI setup completed with warnings'
          : event.status === 'cancelled'
            ? 'CommerceKit CLI setup cancelled'
            : event.status === 'internal-error'
              ? 'CommerceKit CLI setup encountered an internal error'
              : 'CommerceKit CLI setup failed';
    summary =
      event.status === 'success'
        ? `CommerceKit CLI ${str(d.version) || 'installation'} was installed and verified.`
        : str((d.error as Record<string, unknown> | undefined)?.message) ||
          (event.status === 'warning'
            ? 'CommerceKit CLI setup completed with warnings; review the reported issues.'
            : event.status === 'cancelled'
              ? 'CommerceKit CLI setup was cancelled before completion.'
              : 'CommerceKit CLI setup did not complete.');
    highlight('CLI version', d.version || d.requestedVersion);
    add('Requested version', d.requestedVersion);
    add('Target', d.target);
    add('Build identity', d.buildId);
    add('Cache reused', typeof d.cacheHit === 'boolean' ? String(d.cacheHit) : undefined);
    add('Duration', duration(d.durationMs));
  } else if (event.eventType === 'check.completed') {
    category = 'CommerceKit · Check';
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
            : str((d.error as Record<string, unknown> | undefined)?.message) ||
              (event.status === 'cancelled'
                ? 'The check was cancelled before completion.'
                : 'CommerceKit could not complete the check.')
      : str((d.error as Record<string, unknown> | undefined)?.message) ||
        (event.status === 'cancelled'
          ? 'The check was cancelled before completion.'
          : 'CommerceKit could not complete the check.');
    highlight('Repository', c.repository);
    add('Mode', d.mode);
    add('Changed from', d.changedFrom);
    add('Files checked', d.filesChecked);
    add('Errors', d.errors);
    add('Warnings', d.warnings);
    add('Duration', duration(d.durationMs));
  } else if (event.eventType === 'ccv2.build-cleanup.completed') {
    category = 'CommerceKit · CCv2 build cleanup';
    const cleanup = cleanupDetails(event.status, d, str);
    title = cleanup.title;
    summary = cleanup.summary;
    for (const fact of cleanup.sections[0]!.facts) facts.push(fact);
    add('Retention days', d.retentionDays);
    add('Keep latest', d.keepLatest);
    highlight('Mode', d.mode === 'dry-run' ? 'DRY RUN' : 'APPLY');
    add('Subscription', d.subscriptionCode);
    add('Application', d.applicationCode || 'All applications');
    add('Duration', duration(d.durationMs));
  } else if (event.eventType.startsWith('ccv2.build.')) {
    category = 'CommerceKit · CCv2 build';
    title =
      event.status === 'started'
        ? 'CCv2 build started'
        : event.status === 'success'
          ? 'CCv2 build succeeded'
          : event.status === 'failure'
            ? 'CCv2 build failed'
            : event.status === 'cancelled'
              ? 'CCv2 build cancelled'
              : 'CCv2 build encountered an internal error';
    const code = str(d.buildCode),
      name = str(d.buildName),
      application = str(d.applicationCode),
      subject = code ? `Build ${code}` : 'The build',
      error = str((d.error as Record<string, unknown> | undefined)?.message);
    summary =
      event.status === 'started'
        ? `${subject} has started${str(d.branch) ? ` from ${str(d.branch)}` : ''}.`
        : event.status === 'success'
          ? `${subject} is ready for deployment.`
          : event.status === 'failure'
            ? error || `${subject} failed. Review the workflow run for details.`
            : event.status === 'cancelled'
              ? `${subject} was cancelled.`
              : error || 'CommerceKit could not complete the build workflow.';
    highlight(code ? 'Build code' : name ? 'Build name' : 'Application', code || name || application);
    add('Subscription', d.subscriptionCode);
    if (highlights[0]?.label !== 'Application') add('Application', d.applicationCode);
    add('Branch', d.branch);
    if (highlights[0]?.label !== 'Build name') add('Build name', d.buildName);
    add('Status', d.buildStatus);
    add('Duration', duration(d.durationMs));
    add('Retries', d.retryCount);
    add('Environment', c.environment);
  } else {
    category = 'CommerceKit · CCv2 deployment';
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
                : 'CCv2 deployment encountered an internal error';
    const code = str(d.deploymentCode),
      environment = str(d.environmentCode) || str(c.environment),
      subject = code ? `Deployment ${code}` : 'The deployment',
      location = environment ? ` in ${environment}` : '',
      error = str((d.error as Record<string, unknown> | undefined)?.message);
    summary =
      event.status === 'started'
        ? `${subject} has started${location}.`
        : event.status === 'action-required'
          ? `${subject} is waiting for a decision${location}. Review the workflow run to continue.`
          : event.status === 'success'
            ? `${subject} completed${location}.`
            : event.status === 'failure'
              ? error || `${subject} failed${location}. Review the workflow run for details.`
              : event.status === 'cancelled'
                ? `${subject} was cancelled${location}.`
                : error || 'CommerceKit could not complete the deployment workflow.';
    highlight(code ? 'Deployment code' : 'Environment', code || environment);
    if (highlights[0]?.label !== 'Environment') add('Environment', environment);
    add('Subscription', d.subscriptionCode);
    add('Application', d.applicationCode);
    add('Build code', d.buildCode);
    add('Strategy', d.deploymentMode);
    add('Database update', d.databaseUpdateMode);
    add('Status', d.deploymentStatus);
    add('Duration', duration(d.durationMs));
    add('Decision', d.decisionType);
  }
  if (event.eventType !== 'check.completed') add('Repository', c.repository);
  highlight('Occurred', occurred(event.occurredAt));
  sections.push({ title: 'Result', facts }, ...detailSections(event.status, d, str));
  const eventLinks = (event.links ?? []).filter((link) => safeActionLink(link.url, confidential));
  const links =
    eventLinks.length > 0
      ? eventLinks.map((link) => ({ label: safePlainText(sanitizeLabel(str(link.label))), url: link.url }))
      : typeof c.runUrl === 'string' && safeActionLink(c.runUrl, confidential)
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
    category,
    title,
    status: event.status,
    statusLabel: t.label,
    icon: t.icon,
    tone: t.tone,
    accent: t.accent,
    summary: sanitize(summary).slice(0, 1000) || undefined,
    highlights: highlights.slice(0, 2),
    facts,
    ...(sections.length ? { sections } : {}),
    actions: links.slice(0, 3),
    footer: footer ? sanitize(footer) : undefined,
  };
}
