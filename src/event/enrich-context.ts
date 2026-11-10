import {
  extractSafeGitHubContext,
  mergeNotifierContext,
  type NotificationEvent,
} from '@commercekit-tools/notification-contract';

export function enrichContext(event: NotificationEvent, env: NodeJS.ProcessEnv = process.env): NotificationEvent {
  const provided = event.context ?? {};
  const extracted = extractSafeGitHubContext({
    ...env,
    // Notify needs an explicit server and builds links for the producer's run.
    GITHUB_SERVER_URL: env.GITHUB_SERVER_URL?.trim() || '',
    GITHUB_REPOSITORY: provided.repository || env.GITHUB_REPOSITORY,
    GITHUB_RUN_ID: provided.runId || env.GITHUB_RUN_ID,
  });
  return { ...event, context: mergeNotifierContext(provided, extracted) };
}
