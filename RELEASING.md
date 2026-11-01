# Releasing

Action versions (for example `v1.0.0`) are independent from NotificationEvent schema version (`1`) and producer versions. Provider payload implementation changes are part of the Action release.

After the reviewed PR is merged: confirm main CI is green and the committed bundle is reproducible; manually smoke test with temporary Slack and Teams destinations; create immutable `v1.0.0`; update the moving major `v1` tag; publish the GitHub Release; optionally publish the Marketplace listing; independently verify use from another repository. Do not create or move release tags before approval. The manual runbook is below.

## Manual provider smoke runbook

Before the first release, use temporary test channels/workflows and synthetic events. Check Slack success and failure, Teams success/failure/action-required, and throttling/retry behavior where safely simulatable. Do not commit webhook URLs, credentials, or results. CI uses mocks only.
