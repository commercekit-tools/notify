# Producer integration

Future `commercekit-tools/ccv2-build` and `commercekit-tools/ccv2-deploy` Actions should expose compact JSON as `notification-event` on success and failure before calling `core.setFailed(...)` where possible. The producer emits the neutral contract and knows nothing about Slack or Teams.

A workflow can create a check event after setup and `commercekit check`, then pass the JSON/file to this Action. The CLI itself does not send notifications; a future safe report sidecar may help workflows create events.

Future reusable workflows own started/completed-event orchestration. This Action sends exactly the one event it receives. The existing `sap-cx-actions/commerce-build` and `commerce-deploy` repositories remain unchanged; their embedded notifier remains in place, they do not emit NotificationEvent v1, and they are not direct producers for this Action.

The Action may enrich missing repository/ref/commit/actor/workflow/job/run metadata using only `GITHUB_REPOSITORY`, `GITHUB_REF`, `GITHUB_SHA`, `GITHUB_ACTOR`, `GITHUB_WORKFLOW`, `GITHUB_JOB`, `GITHUB_RUN_ID`, `GITHUB_RUN_ATTEMPT`, and `GITHUB_SERVER_URL`. Explicit event values win. It never reads `GITHUB_EVENT_PATH` or copies arbitrary environment variables. A `runUrl` must be a bounded HTTPS URL without credentials or fragments.
