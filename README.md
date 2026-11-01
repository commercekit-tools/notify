# CommerceKit Notifications

**Status: Initial implementation under development.** This Action is not yet released. The future `commercekit-tools/notify@v1` reference is unavailable until an approved release.

Send a normalized CommerceKit workflow event to Slack Incoming Webhooks or Microsoft Teams Workflows. One root Action accepts `provider: slack` or `provider: teams-workflow`.

## How it works

`NotificationEvent v1` → event template → provider-neutral presentation → provider renderer → secure webhook transport.

The Action performs no CCv2 API calls, build/deployment work, CLI checks, project-file inspection, or source diagnostics. See [the event contract](docs/notification-event-v1.md).

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

Event schema version 1 and Action release versions are independent. No Action tag, GitHub Release, or Marketplace listing exists yet. See [RELEASING.md](RELEASING.md).

Context may be enriched from the standard safe GitHub Actions variables when event values are missing. Provided values are preserved. A supplied or generated `context.runUrl` must be a bounded HTTPS URL with no credentials or fragment. For successful, warning, and failed checks, `filesChecked`, `errors`, and `warnings` are required so summaries never invent zero counts. Dynamic provider text is sanitized and rendered as inert text; only validated links become actions.

## Offline payload preview

Review the synthetic provider-native designs without a webhook or network call:

```sh
pnpm payload:preview --provider slack --event check-success
pnpm payload:preview --provider teams-workflow --event deployment-action-required
```

The command accepts only committed fixture names, validates the event through production code, and prints formatted payload JSON. It does not send the payload. The current Slack Block Kit and Teams Workflows Adaptive Card designs are the acceptance baseline; legacy embedded notifier layouts are not a visual requirement. Live provider acceptance happens after merge using the manual smoke workflow described in [RELEASING.md](RELEASING.md).
