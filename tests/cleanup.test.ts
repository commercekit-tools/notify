import { describe, expect, it } from 'vitest';
import { createBuildCleanupEvent, validateNotificationEvent } from '@commercekit-tools/notification-contract';
import { createPresentation } from '../src/presentation/create-presentation.js';
import { renderSlack } from '../src/providers/slack/render.js';
import { renderTeams } from '../src/providers/teams-workflow/render.js';
describe('packed cleanup contract and existing notify providers', () => {
  for (const mode of ['dry-run', 'apply'] as const)
    for (const status of ['success', 'failure', 'cancelled', 'internal-error'] as const)
      it(`${mode} ${status}`, () => {
        const e = createBuildCleanupEvent({
          status,
          occurredAt: '2026-11-13T00:00:00Z',
          data: {
            mode,
            subscriptionCode: 'sandbox-sub',
            applicationCode: 'app',
            retentionDays: 30,
            keepLatest: 10,
            cleanupStatus: status,
            scannedCount: 20,
            eligibleCount: 4,
            plannedCount: 2,
            deletionRequestedCount: mode === 'apply' ? 1 : 0,
            skippedCount: 16,
            failedCount: status === 'failure' ? 1 : 0,
            unknownCount: 0,
            deferredCount: 2,
            durationMs: 1000,
          },
        });
        expect(validateNotificationEvent(e)).toBe(e);
        const p = createPresentation(e);
        expect(p.category).toBe('CommerceKit · CCv2 build cleanup');
        expect(p.summary).toContain(mode === 'dry-run' ? 'DRY RUN' : 'APPLY');
        expect(p.summary).toContain('deletion requests accepted');
        expect(JSON.stringify(renderSlack(p))).toContain('CCv2 build cleanup');
        expect(JSON.stringify(renderTeams(p))).toContain('CCv2 build cleanup');
      });
});
