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
11. Configure the protected `marketplace-release` environment as described below. On `main`, run the **Prepare Marketplace release** workflow with its exact confirmations. It re-runs `pnpm quality` and checks the release commit before creating immutable `v1.0.0` and a **draft** GitHub Release from the reviewed [release notes](docs/releases/v1.0.0.md).
12. Have an organization owner review and publish that draft GitHub Release in the GitHub release UI with **Publish this Action to the GitHub Marketplace** selected. Complete name, metadata, category, agreement, and two-factor-authentication validation there.
13. Create or move the compatible major tag `v1` to the same exact commit after publication.
14. Independently verify `commercekit-tools/notify@v1.0.0` from another repository.
15. Independently verify `commercekit-tools/notify@v1` from another repository.
16. Update commercekit.tools Automation documentation.
17. Begin the modernized `ccv2-build` event producer.

For Marketplace categories, choose **Utilities** as primary and **Continuous integration** as secondary if offered; otherwise use the closest accurate categories. The exact Action name can only be confirmed in the Marketplace release validation UI.

## Guarded release preparation workflow

`.github/workflows/marketplace-release.yml` runs **only** through `workflow_dispatch` on `main`. Before using it, protect a `marketplace-release` environment with required reviewers and deployment branch restricted to `main` where repository settings permit. The workflow uses read-only permissions for preflight and grants `contents: write` only to its environment-gated draft-release job. It does not need provider secrets or send notifications.

After completing the live provider smoke tests and merging the reviewed README/release-note update, dispatch **Prepare Marketplace release** with version `v1.0.0` and these exact strings:

| Input                      | Exact value                    |
| -------------------------- | ------------------------------ |
| `smoke-confirmation`       | `SLACK-AND-TEAMS-SMOKE-PASSED` |
| `marketplace-confirmation` | `MARKETPLACE-NAME-VALIDATED`   |
| `confirmation`             | `PREPARE-COMMERCEKIT-V1.0.0`   |

The preflight requires an unchanged `main` commit, an unpublished version tag, release-ready README text, publication-ready release notes, and a passing `pnpm quality` run. The environment-gated job checks `main` again, pushes an annotated `v1.0.0` tag, and creates a **draft** release with `gh release create --draft --verify-tag`. The workflow does not publish the draft or the Marketplace listing. GitHub's Marketplace publication checkbox, agreement, categories, and owner authentication are completed in the release UI; there is no documented `gh release create` switch for that checkbox.

If the tag push succeeds but draft creation fails, do not rerun the workflow or delete/move the immutable tag automatically. Inspect the tag and commit, resolve the failure, and have an owner create the draft release against the existing tag with the reviewed notes. Likewise, do not publish a draft before its metadata and content are verified.

## Manual provider smoke

The workflow is `workflow_dispatch` only and becomes runnable after it reaches the default branch. It requires an explicit `SEND-COMMERCEKIT-TEST-NOTIFICATION` confirmation. Select one provider and one fixed synthetic fixture per run. It posts exactly one notification through the local Action, requires successful delivery, and writes only safe metadata to the job summary. Do not put real URLs in dispatch inputs, source, logs, or issues.

For Slack, create a temporary channel and Incoming Webhook. Store the URL in the protected environment secret, then run `check-success` and `build-failure`. Inspect the fallback notification text, semantic accent, title, summary, fact wrapping, action button, and footer on desktop and mobile Slack. Confirm the summary is not duplicated awkwardly. Rotate or delete the temporary webhook afterward as appropriate.

For Teams, create a temporary Workflows webhook with a co-owner and post to a temporary channel. Store its URL in the protected environment secret, then run `deployment-action-required`, `deployment-success`, and `deployment-failure`. Confirm the Workflows trigger accepts the card, the styled status container, title, summary, facts, `Action.OpenUrl` button, and subtle footer render on desktop and mobile Teams. Confirm the button opens the safe workflow URL and that no retired connector flow is used. Disable or delete the temporary workflow afterward as appropriate.

Use the older public notification screenshots as a structural reference for the event heading, outcome sentence, grouped facts, and actions. Accept the new design against current Slack Block Kit and Teams Workflows behavior, accessibility, and the live smoke checklist. Exact legacy content, payloads, and extra SAP fields are not required.

## Tag consistency

Verify that `git rev-parse v1.0.0^{commit}` and `git rev-parse v1^{commit}` equal the reviewed release commit. Verify the GitHub Release points to `v1.0.0`, Marketplace lists that same version, and the published README shows `@v1` usage. Do not publish from an unreviewed commit.

References: [GitHub Marketplace publication requirements](https://docs.github.com/en/actions/how-tos/create-and-publish-actions/publish-in-github-marketplace) and [CommerceKit Automation documentation](https://commercekit.tools/docs/automation).
