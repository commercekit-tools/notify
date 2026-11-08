# NotificationEvent v1

NotificationEvent is a provider-neutral JSON contract. Producers create a compact event; this Action validates it and turns it into a shared presentation before rendering a provider payload.

Required members are `schemaVersion: 1`, `eventId`, `eventType`, `status`, ISO date-time `occurredAt`, `source` (`product: commercekit`, one of `cli-check`, `ccv2-build`, `ccv2-deploy`, `workflow`), and event-specific `data`. Optional `context` fields include repository, ref, commit, actor, workflow, job, runId, runAttempt, runUrl, and environment. Up to three HTTPS links may be included.

Supported event types: `check.completed`, `ccv2.build.started`, `ccv2.build.completed`, `ccv2.deployment.started`, `ccv2.deployment.action-required`, `ccv2.deployment.completed`. Statuses: `started`, `success`, `warning`, `failure`, `cancelled`, `internal-error`, `action-required`. Compatibility rules are checked in code and represented in the schema.

Check data may contain mode, changedFrom, filesChecked, errors, warnings, durationMs, and a safe error summary. Build data may contain subscriptionCode, applicationCode, buildCode, buildName, branch, buildStatus, durationMs, retryCount, and error. Deployment data may contain subscriptionCode, applicationCode, deploymentCode, buildCode, environmentCode, deploymentMode, databaseUpdateMode, deploymentStatus, durationMs, decisionType, and error. The error object has optional code and required message. Source contents, diagnostics, credentials, raw API responses, and provider payloads are outside the contract.

All input is limited to 64 KiB. Strings and arrays have schema bounds. Additive unknown fields are ignored and never rendered; unknown event types and schema versions fail. Additive optional fields preserve v1; changed meaning or removed required fields require a new schema version. Event schema, Action, and producer versions evolve independently.

See [`../schema/notification-event-v1.schema.json`](../schema/notification-event-v1.schema.json) for machine-readable validation.

For `check.completed` with `success`, `warning`, or `failure`, `data.filesChecked`, `data.errors`, and `data.warnings` are required non-negative integers. They may be omitted for `cancelled` and `internal-error`. `context.runUrl`, like every event link, must be a bounded HTTPS URL without credentials or fragment. The Action may fill missing context fields from the documented GitHub Actions environment variables; it does not read the full GitHub event payload or copy arbitrary environment values.

The optional `links` array carries operational destinations supplied by the producer. Prefer the GitHub Actions run first and a specific Cloud Portal build or deployment progress page second when that URL is known. The notifier does not infer a Cloud Portal URL from a build or deployment code. If no links are supplied, a valid `context.runUrl` becomes a **View workflow** action. A build-started event may omit `buildCode` until CCv2 returns it; its workflow link still provides a useful next step.

## Shared notification language

The presentation calls the three operations **CommerceKit check**, **CCv2 build**, and **CCv2 deployment**. Across operations, common outcomes use the same title endings: **succeeded**, **failed**, **cancelled**, and **encountered an internal error**. The shared status theme supplies the same textual status and icon to Slack and Teams Workflows. **Completed with warnings** applies to checks; **action required** applies to deployments. A failed operation and an internal CommerceKit error remain distinct statuses. Operation-specific summaries and facts explain what happened without changing that outcome vocabulary.

The schema `$id` is a logical canonical identifier. The website endpoint is not currently a downloadable schema; retrieve the source from this public repository's [`schema/notification-event-v1.schema.json`](../schema/notification-event-v1.schema.json) until a separate website publication is completed. Runtime validation always uses the bundled local schema.
