import type { NotificationEvent } from './types.js';
import { validateSafeUrl } from './validate.js';

const fields = {
  repository: 'GITHUB_REPOSITORY',
  ref: 'GITHUB_REF',
  commit: 'GITHUB_SHA',
  actor: 'GITHUB_ACTOR',
  workflow: 'GITHUB_WORKFLOW',
  job: 'GITHUB_JOB',
  runId: 'GITHUB_RUN_ID',
  runAttempt: 'GITHUB_RUN_ATTEMPT',
} as const;

export function enrichContext(event: NotificationEvent, env: NodeJS.ProcessEnv = process.env): NotificationEvent {
  const context: Record<string, unknown> = { ...(event.context ?? {}) };
  for (const [key, variable] of Object.entries(fields)) {
    if (context[key] !== undefined && context[key] !== '') continue;
    const value = env[variable]?.trim();
    if (!value) continue;
    if (key === 'runAttempt') {
      const attempt = Number(value);
      if (Number.isInteger(attempt) && attempt >= 1) context.runAttempt = attempt;
    } else {
      if (key === 'repository' && !/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(value)) continue;
      if (key === 'runId' && !/^\d+$/.test(value)) continue;
      context[key] = value.slice(0, 300);
    }
  }

  if (context.runUrl === undefined || context.runUrl === '') {
    const server = env.GITHUB_SERVER_URL?.trim();
    const repository = typeof context.repository === 'string' ? context.repository : undefined;
    const runId = typeof context.runId === 'string' ? context.runId : undefined;
    if (server && repository && runId && /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repository) && /^\d+$/.test(runId)) {
      try {
        const base = validateSafeUrl(server, 'GITHUB_SERVER_URL').toString().replace(/\/$/, '');
        const generated = `${base}/${repository}/actions/runs/${runId}`;
        validateSafeUrl(generated, 'generated context.runUrl');
        context.runUrl = generated;
      } catch {
        // Unsafe runner values are omitted rather than becoming message content or links.
      }
    }
  }
  return { ...event, context };
}
