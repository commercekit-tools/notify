# Cleanup notification validation

> This report records the earlier published 0.0.5 baseline. Current ecosystem UI
> and summary candidate evidence is in
> [ecosystem-reporting-validation.md](ecosystem-reporting-validation.md). Historical
> claims about unchanged non-cleanup snapshots do not describe the intentional
> common-layout updates in the new candidate.

## Published registry integration

The notification-contract publication gate is resolved. Notify pins the exact
published `@commercekit-tools/notification-contract@0.0.5`, commits its registry
lockfile and builds the standalone bundle from that installation. There are no
file dependencies, local links or candidate validation overrides in this checkout.
The Action itself remains unreleased; package publication does not authorize
provider delivery, deployment or real SAP cleanup.

Publication evidence:

- [action-kit publish run 43667757934](https://github.com/commercekit-tools/action-kit/actions/runs/43667757934).
- Source commit [`7cc2e8e6af46e7438064cc6205b22f4f7154eb94`](https://github.com/commercekit-tools/action-kit/commit/7cc2e8e6af46e7438064cc6205b22f4f7154eb94).
- Registry metadata was independently verified with `npm view`; package version
  `0.0.5`, shasum `dba01de9635ba79f14ac2bb477c8c828dd4d223f`, integrity
  `sha512-SMcyyWaeHdtlztt99xtWlJycSAspSTGvCaWJH7M2+u+on77JHwo8boTBOc9UUC0BQHDPo/VHmOj4gpt/XIbqmw==`.
- This integrity exactly matches the reviewed candidate below. The installed
  public root, schema and package metadata exports were inspected; the shared
  `createBuildCleanupEvent`, parser, validator and redaction primitives remain
  available.

Normal validation (Node 24.21.0, pnpm 12.6.0):

| Command                                                                                                                            | Result                                                                                                                                 |
| ---------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `npm view @commercekit-tools/notification-contract@0.0.5 version dist.integrity dist.shasum --registry=https://npm.pkg.github.com` | PASS; published metadata matches the reviewed tarball                                                                                  |
| `pnpm install --no-frozen-lockfile`                                                                                                | PASS; exact registry lockfile regenerated                                                                                              |
| `pnpm install --frozen-lockfile`                                                                                                   | PASS; supply-chain policy and frozen resolution                                                                                        |
| `pnpm bundle`                                                                                                                      | PASS; normal registry runtime bundled                                                                                                  |
| `pnpm quality`                                                                                                                     | PASS; formatting, lint, strict types, all 19 schema fixtures, coverage tests, byte-consistent bundle, public scan and production audit |
| `git diff --check`                                                                                                                 | PASS                                                                                                                                   |

All **107 tests in 12 files passed with zero skips** against the published package,
including six standalone-bundle executions: success, failure and warning through
both providers using mocked fetch. Coverage is 97.94% statements (333/340),
90.18% branches (340/377), 98.07% functions (51/52) and 99.34% lines (304/306).
Existing coverage thresholds and source inclusion were not changed. The new
cleanup helper has 100% statement/function/line coverage and 92.4% branch coverage.
The public scan checked 90 files; the production audit found no known
vulnerabilities. Existing non-cleanup event snapshots are unchanged.

Registry bundle SHA256:
`6c49cb5e49fcdd62d4c6993f4d31d67fb729825e98ee760dac9f8d2e09ffca2f`.
It is byte-identical to the reviewed candidate bundle. Workflow consumers need
neither registry credentials nor `node_modules` to run it.

Remaining gates: required PR validation/CodeQL must pass before merge; the Notify
Action remains unreleased, and live Slack/Teams delivery has not been run for this
change. No webhook delivery, deployment, Action release/tag or real SAP operation
was performed by this validation. Production SAP eligibility guarantees and
cleanup execution approvals remain the cleanup producer's separate gates.

## Archived exact-source candidate evidence

Before publication, an isolated source-candidate integration established the
following evidence. At that time the normal manifest, lock and bundle remained
on 0.0.4 and normal dependency readiness was blocked. Publication and the normal
registry upgrade above supersede that temporary dependency gate.

Candidate provenance:

- action-kit source `3f9e418556b190bb8d55ac11a22f554e2c51a4a5`.
- Source package version 0.0.5; exact tarball SHA256
  `9c3b9910dc51be697c3aa4e44620c3cd87d3cdd132f9a5431e85f9cb5f712dec`.
- Tarball integrity:
  `sha512-SMcyyWaeHdtlztt99xtWlJycSAspSTGvCaWJH7M2+u+on77JHwo8boTBOc9UUC0BQHDPo/VHmOj4gpt/XIbqmw==`.

An isolated private copy installed this file tarball, rebuilt the actual bundle
and ran `COMMERCEKIT_CANDIDATE_CONTRACT_VERSION=0.0.5 pnpm quality`.
That temporary candidate mode required the exact installed 0.0.5 package and a
file tarball dependency; the normal registry schema check then remained fixed to
0.0.4. Temporary candidate dependency/lock/dist files were not copied back to this
repository. The candidate-mode code has been removed after registry publication.

PASS: formatting, lint, strict types, all 19 schema fixtures, 107 tests in 12 files
with zero skips, byte-consistent candidate bundle, public scan and production
dependency audit (no known vulnerabilities). Coverage: 97.94% statements,
90.18% branches, 98.07% functions and 99.34% lines. Existing coverage configuration
was not weakened. The new cleanup helper has 100% statement/function/line coverage
and 92.4% branch coverage.

The tests include success, no-op, dry-run, warning, failure, partial failure and
unknown outcomes; all 14 input names and 10 aggregate counts; unconditional masking
of four authentication fields; known-secret and provider escaping defenses;
rejected/truncated inputs; legacy 0.0.4 events; repository visibility; maximal Unicode
and long-link payload bounds; and six actual standalone-bundle executions
(success/failure/warning through both existing providers with mocked fetch).
No node_modules or registry credentials were present in those isolated runtime
tests. All other event-family golden snapshots remain unchanged; cleanup-specific
snapshots were updated and new cleanup failure/warning snapshots were added.

Candidate bundle SHA256:
`6c49cb5e49fcdd62d4c6993f4d31d67fb729825e98ee760dac9f8d2e09ffca2f`.

No webhook delivery, SAP call, package publication, Action release, merge, tag or
deployment was performed during candidate validation. The separate authorized
package publication is recorded above. OAuth and existing delivery implementations
are unchanged.
