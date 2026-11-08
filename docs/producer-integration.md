# Producer integration

Future `commercekit-tools/ccv2-build` and `commercekit-tools/ccv2-deploy` Actions should expose compact JSON as `notification-event` on success and failure before calling `core.setFailed(...)` where possible. The producer emits the neutral contract and knows nothing about Slack or Teams.

A workflow can create a check event after setup and `commercekit check`, then pass the JSON/file to this Action. The CLI itself does not send notifications; a future safe report sidecar may help workflows create events.

Future reusable workflows own started/completed-event orchestration. This Action sends exactly the one event it receives. The existing `sap-cx-actions/commerce-build` and `commerce-deploy` repositories remain unchanged; their embedded notifier remains in place, they do not emit NotificationEvent v1, and they are not direct producers for this Action.

The Action may enrich missing repository/ref/commit/actor/workflow/job/run metadata using only `GITHUB_REPOSITORY`, `GITHUB_REF`, `GITHUB_SHA`, `GITHUB_ACTOR`, `GITHUB_WORKFLOW`, `GITHUB_JOB`, `GITHUB_RUN_ID`, `GITHUB_RUN_ATTEMPT`, and `GITHUB_SERVER_URL`. Explicit event values win. It never reads `GITHUB_EVENT_PATH` or copies arbitrary environment variables. A `runUrl` must be a bounded HTTPS URL without credentials or fragments.

## Operational links

Set `context.runUrl` to the GitHub Actions run. If `links` is omitted or empty, the notifier uses it for a **View workflow** action. When the producer knows a specific Cloud Portal build or deployment progress URL, include it as an additional event link. Put the workflow run first, then the relevant Cloud Portal page; the first link is also used in Slack's fallback notification text. For an action-required deployment, the workflow link should lead to the place where the decision can be reviewed. The notification itself never performs that decision.

Only include a progress link after the producer has a real, validated HTTPS URL. A build-started event emitted before CCv2 returns a build code can still show the build name, application, branch, and workflow run; do not invent a build code or portal path. Completed build and deployment events can add their known identifiers and progress links. The notifier never constructs CCv2 portal URLs from codes, and it does not insert product documentation links into notifications. The synthetic [`build-success`](../tests/fixtures/events/build-success.json) and [`deployment-action-required`](../tests/fixtures/events/deployment-action-required.json) fixtures demonstrate two actions with placeholder domains.

## Producer checklist

- Emit compact NotificationEvent v1 JSON as the `notification-event` output on both success and failure.
- Set the output before `core.setFailed(...)` where possible.
- Include only bounded safe fields; omit credentials, source contents, stacks, and raw API responses.
- Keep the event provider-neutral. Do not select Slack or Teams or construct their payloads.
- Pass the same event to independent notification steps when sending to multiple providers.
- Link to the workflow run and, when known, the specific Cloud Portal build or deployment page. Use operational links rather than general documentation links.
