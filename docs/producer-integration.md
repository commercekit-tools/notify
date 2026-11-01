# Producer integration

Future `commercekit-tools/ccv2-build` and `commercekit-tools/ccv2-deploy` Actions should expose compact JSON as `notification-event` on success and failure before calling `core.setFailed(...)` where possible. The producer emits the neutral contract and knows nothing about Slack or Teams.

A workflow can create a check event after setup and `commercekit check`, then pass the JSON/file to this Action. The CLI itself does not send notifications; a future safe report sidecar may help workflows create events.

Future reusable workflows own started/completed-event orchestration. This Action sends exactly the one event it receives. The existing `sap-cx-actions/commerce-build` and `commerce-deploy` repositories remain unchanged; their embedded notifier remains in place, they do not emit NotificationEvent v1, and they are not direct producers for this Action.
