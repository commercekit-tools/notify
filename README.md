# CommerceKit Notifications

> **Registry-backed ecosystem reporting:** shared notifications and run summaries
> consume published notification-contract 0.0.6. Maintainers install the exact
> registry dependency; consumers execute the committed standalone bundle. See
> [reporting validation](docs/ecosystem-reporting-validation.md).

**Status: Initial implementation under development.** This Action is not yet released. The future `commercekit-tools/notify@v1` reference is unavailable until the separate CCv2 build and deploy Actions are built, their NotificationEvent v1 integration is validated, and an approved release is published.

Send a normalized CommerceKit workflow event to Slack Incoming Webhooks or Microsoft Teams Workflows. One root Action accepts `provider: slack` or `provider: teams-workflow`.

## How it works

`NotificationEvent v1` → event template → provider-neutral presentation → provider renderer → secure webhook transport.

The Action performs no CCv2 API calls, build/deployment work, CLI checks, project-file inspection, or source diagnostics. See [the event contract](docs/notification-event-v1.md).

## Shared event contract

NotificationEvent v1 is supplied by `@commercekit-tools/notification-contract`, pinned to **0.0.6** from GitHub Packages and bundled into `dist/index.js`. Workflow users do not install the package or authenticate to GitHub Packages. Maintainers need package read access to install development dependencies; see [Contributing](CONTRIBUTING.md).

Notify owns presentation templates, Slack/Teams rendering and escaping, webhook policies, delivery, retries, and Action inputs/outputs. Package SemVer, event `schemaVersion`, and Action releases evolve independently. Notify remains unreleased. See the [migration compatibility notes](docs/shared-contract-migration.md).

## Consistent notification and summary format

The Action shares status icons, labels and accents with every CommerceKit
Action through the existing notification-contract package. Slack and Teams use
the same header, **Result**, **Inputs** and **Issues** groups for CLI check, CLI
setup, CCv2 build, deployment and build cleanup events. All provided input names
are retained, authentication values are `[REDACTED]`, and input validation and
truncation are explicit. Older events identify unavailable input context rather
than inventing settings. Cleanup retains every aggregate and describes accepted
deletion requests; acceptance does not establish physical removal.

| Outcome             | Icon | Shared language         |
| ------------------- | ---- | ----------------------- |
| Success             | ✅   | Succeeded               |
| Failure             | ❌   | Failed                  |
| Warning             | ⚠️   | Completed with warnings |
| Started             | ℹ️   | Started                 |
| Cancellation        | ⏹️   | Cancelled               |
| Internal error      | ❌   | CommerceKit error       |
| Deployment decision | ⚠️   | Action required         |

The Action also writes a GitHub run summary for Notify itself after every
handled invocation. It contains delivery outcome, provider, source event type and
status, attempts, duration, safe errors and all five Notify input names.
`webhook-url` is always redacted; `event-json` and `event-file` display presence
only, without payloads or filesystem paths. The current workflow link uses the
shared allowlisted GitHub context.

A successfully delivered failure event produces a successful **delivery**
summary while its source outcome remains failure in the card and `status` output.
Failed delivery defaults to a warning; `fail-on-notification-error: true` makes it
fatal. Invalid configuration/events remain fatal. Summary-writing errors preserve
delivery outputs and Action outcome. Output-file failures are reported separately
as an Action contract failure, retaining the known delivery state and attempts;
they never change an accepted delivery into a failed delivery or trigger a resend.

Both providers retain every input name under their payload limits. Long values
use explicit bounded previews; Teams reduces preview length when necessary to
stay below 27 KiB. Slack enforces its 50-block bound. Known secrets, JWT-like
values, credentials/query-bearing URLs and reflected webhook values are redacted
before provider escaping and truncation. Delivery/retry policies remain owned by
Notify and unchanged by this presentation work.

## Supported providers

- Slack Incoming Webhooks (`slack`)
- Microsoft Teams Workflows (`teams-workflow`)

## Setup

For Slack, configure an app with Incoming Webhooks and create a channel webhook. Save its URL as a repository/environment secret. See [Slack setup](docs/slack.md).

For Teams, create a Workflows webhook request workflow that posts an Adaptive Card, save the URL as a secret, and assign a co-owner. See [Teams Workflows setup](docs/teams-workflows.md). Retired Office 365 Incoming Webhooks are not supported as a new integration.

Webhook URLs are secrets. Never place them in source files or logs.

## Inputs

| Input                        |                 Required | Default | Rules                                           |
| ---------------------------- | -----------------------: | ------- | ----------------------------------------------- |
| `provider`                   |                      yes | —       | `slack` or `teams-workflow`                     |
| `event-json`                 | exactly one event source | —       | NotificationEvent v1 JSON, max 64 KiB           |
| `event-file`                 | exactly one event source | —       | UTF-8 JSON file, max 64 KiB; symlinks rejected  |
| `webhook-url`                |                      yes | —       | Secret HTTPS provider webhook URL               |
| `fail-on-notification-error` |                       no | `false` | `true` or `false`; affects delivery errors only |

## Outputs

| Output       | Meaning                            | Example           |
| ------------ | ---------------------------------- | ----------------- |
| `delivered`  | Whether webhook delivery succeeded | `true`            |
| `provider`   | Selected provider                  | `slack`           |
| `event-type` | Event type                         | `check.completed` |
| `status`     | Semantic event status              | `success`         |
| `attempts`   | Network attempts                   | `1`               |

## Examples

After v1 is published, use a compact event file:

```yaml
- uses: commercekit-tools/notify@v1 # available after release
  with:
    provider: slack
    event-file: ${{ runner.temp }}/notification-event.json
    webhook-url: ${{ secrets.COMMERCEKIT_SLACK_WEBHOOK_URL }}
```

Or pass JSON directly:

```yaml
- uses: commercekit-tools/notify@v1 # available after release
  with:
    provider: teams-workflow
    event-json: ${{ steps.event.outputs.json }}
    webhook-url: ${{ secrets.COMMERCEKIT_TEAMS_WORKFLOW_URL }}
```

The same event can go to independent destinations using separate steps and secrets. Add separate conditions as appropriate. Each step has independent delivery behavior.

Notification buttons should lead to the operation: the GitHub Actions run and, when the producer knows it, the specific Cloud Portal build or deployment progress page. Supply those destinations as up to three validated HTTPS `links` in the event, with the workflow run first. If `links` is absent or empty, `context.runUrl` supplies **View workflow**. The notifier does not create Cloud Portal URLs from identifiers or add a CommerceKit documentation button. For a build-started event before CCv2 provides a build code, omit the code and any code-dependent portal link; a later event can include both. See [producer integration](docs/producer-integration.md).

A synthetic check event can be stored in a file:

```json
{
  "schemaVersion": 1,
  "eventId": "ckevt_example_check",
  "eventType": "check.completed",
  "status": "success",
  "occurredAt": "2026-11-01T20:15:00.000Z",
  "source": { "product": "commercekit", "component": "cli-check" },
  "data": { "mode": "full", "filesChecked": 18, "errors": 0, "warnings": 0 }
}
```

## Failure behavior

Invalid input, malformed or unsupported events, unsafe URLs, and oversized payloads always fail. Delivery errors set `delivered=false` and emit a safe warning by default, allowing the primary operation result to remain visible. Set `fail-on-notification-error: true` to fail the step for delivery errors too.

Provider limits: Slack rendering is bounded to provider Block Kit limits; Teams payloads are limited to 27 KiB. Requests time out after ten seconds and make at most three attempts, retrying transient network errors, HTTP 429, and selected 5xx responses.

## Future CommerceKit Action integration

Future CCv2 Actions are not yet available. The intended pattern is:

```yaml
- id: build
  uses: commercekit-tools/ccv2-build@v1 # future Action; not yet available
- uses: commercekit-tools/notify@v1 # after notification Action release
  if: ${{ always() && steps.build.outputs.notification-event != '' }}
  with:
    provider: slack
    event-json: ${{ steps.build.outputs.notification-event }}
    webhook-url: ${{ secrets.SLACK_WEBHOOK_URL }}
```

See [producer integration](docs/producer-integration.md). Current `sap-cx-actions` build/deploy Actions are unchanged, continue using embedded notifier behavior, do not emit NotificationEvent v1, and are not directly integrated here.

## Security and troubleshooting

See [SECURITY.md](SECURITY.md). Common issues: ensure exactly one event input is set; use an official Slack host; confirm Teams Workflows accepts the Adaptive Card; inspect safe HTTP status warnings; validate event status/type compatibility.

## Versioning and release status

Event schema version 1 and Action release versions are independent. No Action tag, GitHub Release, or Marketplace listing exists yet. Publication is on hold until both CCv2 build and deploy producer Actions are built and their event outputs work with this Action. After that gate and reviewed provider smoke, the guarded [release preparation workflow](.github/workflows/marketplace-release.yml) can create the immutable version tag and a draft GitHub Release. An organization owner must publish the draft and Marketplace listing through GitHub's release UI. See [RELEASING.md](RELEASING.md).

Context may be enriched from the standard safe GitHub Actions variables when event values are missing. Provided values are preserved. A supplied or generated `context.runUrl` must be a bounded HTTPS URL with no credentials or fragment. For successful, warning, and failed checks, `filesChecked`, `errors`, and `warnings` are required so summaries never invent zero counts. Dynamic provider text is sanitized and rendered as inert text; only validated links become actions.

## Offline payload preview

Review the synthetic provider-native designs without a webhook or network call:

```sh
pnpm payload:preview --provider slack --event check-success
pnpm payload:preview --provider teams-workflow --event deployment-action-required
```

The command accepts only committed fixture names, validates the event through production code, and prints formatted payload JSON. It does not send the payload. The public [older notification screenshots](https://sap-cx-actions.github.io/docs/commerce-cloud/notifications/) informed the heading, outcome, details, and action hierarchy. This Action uses provider-native Block Kit and Adaptive Cards with the smaller NotificationEvent v1 contract; it does not reproduce the old payloads or extra SAP fields.

For a visual preview, paste the complete Slack payload into [Block Kit Builder](https://app.slack.com/block-kit-builder/) in message preview mode. The top-level context block and colored attachment should appear together. If its attachment editor requests only an attachment object, extract it with `pnpm --silent payload:preview --provider slack --event build-success | jq '.attachments[0]'`; that narrower view omits the top-level context. Paste only the Adaptive Card into the [Microsoft Adaptive Card Designer](https://adaptivecards.microsoft.com/designer): `pnpm --silent payload:preview --provider teams-workflow --event build-success | jq '.attachments[0].content'`. The designers show the layout, while live provider acceptance after merge uses the manual smoke workflow in [RELEASING.md](RELEASING.md).

### Cleanup compatibility

This unreleased Action accepts `ccv2.build-cleanup.completed` through the published
`@commercekit-tools/notification-contract@0.0.6` package. The exact registry
dependency and integrity are recorded in `package.json` and `pnpm-lock.yaml`;
all runtime dependencies are bundled into `dist/index.js`.

Slack and Teams reuse the existing rendering and delivery implementation. Accepted
deletion requests indicate initiation, not physical removal. Earlier Notify
builds using notification-contract 0.0.3 reject cleanup events; consumers must
pin an immutable Notify commit containing this compatible bundle. Package
publication does not create an Action release or tag and does not authorize
real cleanup or provider delivery.

### Cleanup notification context

Cleanup notifications include all fourteen input names with all four authentication
values always `[REDACTED]`, all aggregate counts, safe errors and warning issues
in both providers. Accepted build-deletion requests are reported as initiation;
dry-runs report zero actual cleanup requests. Long input/issue previews are bounded
and visibly marked when truncated. Legacy cleanup events still show their available
policy/counts and identify unreported context.

The published notification-contract **0.0.5** package supports the additive cleanup
context and cleanup-specific warning status. The exact registry dependency,
lockfile, installed-version assertions and committed bundle are upgraded together;
there is no local tarball dependency or candidate override. Existing shared
schema/context/text APIs and webhook delivery remain in use. See the
[validation evidence](docs/cleanup-notification-validation.md) for registry provenance,
provider coverage and remaining release gates. Earlier Notify bundles may accept
basic cleanup events while rejecting cleanup warnings or omitting this context;
pin an immutable Notify commit containing this compatible bundle.
