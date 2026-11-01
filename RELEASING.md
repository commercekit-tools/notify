# Releasing CommerceKit Notifications

The Action release version (`v1.0.0`) and NotificationEvent schema version (`1`) are independent. Provider payload changes belong to the Action version. The private root package version `0.1.0` is an internal implementation marker, following the `setup-commercekit` Action convention; it is not published to npm and does not need to match the Action tag.

## Release order

1. Merge PR #1 after review and approval.
2. Verify main CI and CodeQL are green.
3. Verify `.github/workflows/provider-smoke.yml` is present on the default branch.
4. Create a dedicated `provider-smoke` environment with protection/approval where available. Add only temporary `COMMERCEKIT_SLACK_TEST_WEBHOOK_URL` and `COMMERCEKIT_TEAMS_TEST_WORKFLOW_URL` secrets to that environment.
5. Run the Slack smoke fixtures described below.
6. Run the Teams smoke fixtures described below.
7. Fix any provider incompatibility through a new reviewed PR.
8. Confirm that **CommerceKit Notifications** passes the exact-name validation in the Marketplace release UI. If it conflicts, select a suitable available fallback name through a reviewed metadata change.
9. Have an organization owner accept the current GitHub Marketplace Developer Agreement if required. Confirm the release page validates metadata and that the publishing owner has two-factor authentication available.
10. Prepare a small reviewed release-status README and release-notes commit/PR after successful provider smoke. Replace pre-release wording with `Available as: commercekit-tools/notify@v1`, and ensure the release-note draft is accurate. Merge this preparation before tagging.
11. Run final quality, audit, public scan, and bundle reproducibility checks on the exact reviewed release commit.
12. Create immutable `v1.0.0` at that commit.
13. Publish GitHub Release `v1.0.0` and its Marketplace listing using the reviewed [release-note draft](docs/releases/v1.0.0.md).
14. Create or move the compatible major tag `v1` to the same exact commit.
15. Independently verify `commercekit-tools/notify@v1.0.0` from another repository.
16. Independently verify `commercekit-tools/notify@v1` from another repository.
17. Update commercekit.tools Automation documentation.
18. Begin the modernized `ccv2-build` event producer.

For Marketplace categories, choose **Utilities** as primary and **Continuous integration** as secondary if offered; otherwise use the closest accurate categories. The exact Action name can only be confirmed in the Marketplace release validation UI.

## Manual provider smoke

The workflow is `workflow_dispatch` only and becomes runnable after it reaches the default branch. It requires an explicit `SEND-COMMERCEKIT-TEST-NOTIFICATION` confirmation. Select one provider and one fixed synthetic fixture per run. It posts exactly one notification through the local Action, requires successful delivery, and writes only safe metadata to the job summary. Do not put real URLs in dispatch inputs, source, logs, or issues.

For Slack, create a temporary channel and Incoming Webhook. Store the URL in the protected environment secret, then run `check-success` and `build-failure`. Inspect the fallback notification text, semantic accent, title, summary, fact wrapping, action button, and footer on desktop and mobile Slack. Confirm the summary is not duplicated awkwardly. Rotate or delete the temporary webhook afterward as appropriate.

For Teams, create a temporary Workflows webhook with a co-owner and post to a temporary channel. Store its URL in the protected environment secret, then run `deployment-action-required`, `deployment-success`, and `deployment-failure`. Confirm the Workflows trigger accepts the card, the styled status container, title, summary, facts, `Action.OpenUrl` button, and subtle footer render on desktop and mobile Teams. Confirm the button opens the safe workflow URL and that no retired connector flow is used. Disable or delete the temporary workflow afterward as appropriate.

Do not require similarity to the old embedded notifier messages. The new provider-native designs are the visual acceptance basis.

## Tag consistency

Verify that `git rev-parse v1.0.0^{commit}` and `git rev-parse v1^{commit}` equal the reviewed release commit. Verify the GitHub Release points to `v1.0.0`, Marketplace lists that same version, and the published README shows `@v1` usage. Do not publish from an unreviewed commit.

References: [GitHub Marketplace publication requirements](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace) and [CommerceKit Automation documentation](https://commercekit.tools/docs/automation).
