# NotificationEvent v1

> The ecosystem reporting extension is supplied by exact published contract
> 0.0.6 and bundled for runtime consumers. See
> [registry-backed validation](ecosystem-reporting-validation.md).

NotificationEvent is a provider-neutral JSON contract. Producers create a compact event; this Action validates it and turns it into a shared presentation before rendering a provider payload.

Required members are `schemaVersion: 1`, `eventId`, `eventType`, `status`, ISO date-time `occurredAt`, `source` (`product: commercekit`, one of `setup-commercekit`, `cli-check`, `ccv2-build`, `ccv2-deploy`, `ccv2-build-cleanup`, `workflow`), and event-specific `data`. Optional `context` fields include repository, ref, commit, actor, workflow, job, runId, runAttempt, runUrl, and environment. Up to three HTTPS links may be included.

Supported event types: `commercekit.setup.completed`, `ccv2.build-cleanup.completed`, `check.completed`, `ccv2.build.started`, `ccv2.build.completed`, `ccv2.deployment.started`, `ccv2.deployment.action-required`, `ccv2.deployment.completed`. Statuses: `started`, `success`, `warning`, `failure`, `cancelled`, `internal-error`, `action-required`. Compatibility rules are checked in code and represented in the schema.

Check data may contain mode, changedFrom, filesChecked, errors, warnings, durationMs, and a safe error summary. Build data may contain subscriptionCode, applicationCode, buildCode, buildName, branch, buildStatus, durationMs, retryCount, and error. Deployment data may contain subscriptionCode, applicationCode, deploymentCode, buildCode, environmentCode, deploymentMode, databaseUpdateMode, deploymentStatus, durationMs, decisionType, and error. The error object has optional code and required message. Source contents, diagnostics, credentials, raw API responses, and provider payloads are outside the contract.

All input is limited to 64 KiB. Strings and arrays have schema bounds. Additive unknown fields are ignored and never rendered; unknown event types and schema versions fail. Additive optional fields preserve v1; changed meaning or removed required fields require a new schema version. Event schema, Action, and producer versions evolve independently.

The machine-readable schema is available through the public `@commercekit-tools/notification-contract/schema` export (JSON import attribute required). Notify pins package version `0.0.6`; package SemVer and event schemaVersion are independent.

For `check.completed` with `success`, `warning`, or `failure`, `data.filesChecked`, `data.errors`, and `data.warnings` are required non-negative integers. They may be omitted for `cancelled` and `internal-error`. `context.runUrl`, like every event link, must be a bounded HTTPS URL without credentials or fragment. The Action may fill missing context fields from the documented GitHub Actions environment variables; it does not read the full GitHub event payload or copy arbitrary environment values.

The optional `links` array carries operational destinations supplied by the producer. Prefer the GitHub Actions run first and a specific Cloud Portal build or deployment progress page second when that URL is known. The notifier does not infer a Cloud Portal URL from a build or deployment code. If no links are supplied, a valid `context.runUrl` becomes a **View workflow** action. A build-started event may omit `buildCode` until CCv2 returns it; its workflow link still provides a useful next step.

## Shared notification language

The baseline presentation calls the three operations **CommerceKit check**, **CCv2 build**, and **CCv2 deployment**. Across operations, common outcomes use the same title endings: **succeeded**, **failed**, **cancelled**, and **encountered an internal error**. The shared status theme supplies the same textual status and icon to Slack and Teams Workflows. **Completed with warnings** applies to checks and cleanup; **action required** applies to deployments. A failed operation and an internal CommerceKit error remain distinct statuses. Operation-specific summaries and facts explain what happened without changing that outcome vocabulary.

The schema `$id` is a logical canonical identifier, not a runtime download endpoint. Runtime validation uses the schema bundled from the installed contract package. This repository no longer vendors a separate schema.

## Cleanup notification context

The additive cleanup extension reuses `ccv2.build-cleanup.completed`, adds the
existing global warning status only to that event family, and keeps older
required data unchanged. New optional context contains all fourteen Action input
names, validation/truncation flags, protected/blocked totals and up to three safe
issues. All four authentication values are always `[REDACTED]`; the presenter
also redacts them defensively for direct malformed presentation callers.

Both providers show the same complete aggregate counts and input names in
bounded groups. Failure messages include safe error codes/explanations; warnings
include their issue codes/explanations. Accepted deletion requests never mean
confirmed physical removal. Missing fields in older events are identified as
unreported rather than invented. No credentials or raw API responses are added.
Notify consumes published notification-contract 0.0.6 through an exact registry
dependency and bundles its public runtime exports. The event remains schemaVersion 1.

## Ecosystem reporting extension

The existing package owns optional input context and safe issues for check,
build and deployment events, and a new `commercekit.setup.completed` event. The
setup event includes requested/verified version, target, build identity, cache
reuse, duration and safe errors when available. All existing event semantics and
schemaVersion 1 remain unchanged; Build/Deploy completed warnings are not
invented. Input snapshots allow at most 50 bounded values, force confidential
names to `[REDACTED]` and carry validation/truncation flags.

Both provider renderers use the shared visual status map and Result/Inputs/Issues
layout. Every supplied input name is shown, with bounded previews and explicit
metadata. Missing legacy input context is reported as unavailable. Operational
count meanings, cancellation neutrality, and deployment action-required warnings
are preserved. Dynamic text and validated links also redact the current webhook
and encoded known-secret forms; only safe operational URLs become buttons.
