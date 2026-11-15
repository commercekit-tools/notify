# Ecosystem reporting consistency validation

## Published dependency and provenance

The owner-authorized [package-only run 43678067818](https://github.com/commercekit-tools/action-kit/actions/runs/43678067818)
published exact `@commercekit-tools/notification-contract@0.0.6` from action-kit
main `3fecce40414d709884fa48e48eca278f470b20b0` after main CI/CodeQL passed.
Notify now uses that actual registry dependency, lockfile and standalone bundle.
No candidate switch, local file dependency or shared-source checkout is required.

- Inspected Notify main: `6331ff4a60956a3a2b546e84d737c9338ca46bda`.
- Feature source before registry adoption: `41e699d13bd183bd51551e45c386cf9e8f77d6dd`.
- Registry integrity:
  `sha512-n6F84900sDPBeYm5dnf8HLCM9B2DUVATEeF717dqKsSXTJtq1FIj/3hZ2UcNTtXe7v8R90HYF6HIom4auM8Kyw==`.
- Registry shasum: `8030f643d1dd6d741caa2c3c0ba321ad82b30cca`.
- Published artifact SHA256:
  `e4b79576328c2992a96fed087e9ba6e63970e8b54d6fca976a6652702a7a73a9`.
- Normal standalone bundle SHA256:
  `e9142b35852702017cd44d067c3681ad1bb6e5c2b13ec6f4d666919539d4ac92`,
  byte-identical to the reviewed private candidate.

Required public APIs and installed version were verified. The schema check now
requires the exact published version and manifest pin; candidate escape paths
were removed. No new package, replacement schema, OAuth/transport subsystem or
duplicated delivery implementation was introduced.

## Behavior verified

All five event families use the shared status map and Result/Inputs/Issues
sections. Every supplied input name survives provider bounds; legacy inputs are
explicitly unavailable. Source outcomes, integer counters, cancellation,
action-required and deletion-initiation semantics remain accurate. Confidential
names are forced redacted even for direct malformed presentation callers.
Known secrets, including encoded variants and the current webhook, redact across
inputs, context, error/issue text and links before escaping/truncation.

Notify captures its five inputs with webhook masking first. Event JSON and file
paths are represented only by presence. Its own GitHub summary separates delivery
from source outcome: successful delivery of a failure event remains delivery
success; default delivery failure is a warning; fatal delivery/configuration
failures remain failure. Independent output-write faults retain accepted delivery
and attempts as a separate Action contract issue. Summary failures preserve the
original outcome. No resend was introduced.

## Executed normal registry checks

Status vocabulary: PASS, FAIL, BLOCKED, NOT RUN.

| Check                                             | Status  | Evidence                                                                                                                                              |
| ------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- |
| Frozen registry install and public exports        | PASS    | Exact 0.0.6 and all reporting APIs verified                                                                                                           |
| Full normal quality                               | PASS    | 188 tests/13 files; no candidate environment flag                                                                                                     |
| Coverage                                          | PASS    | 98.12% statements, 93.22% branches, 97.29% functions, 98.95% lines; existing configuration unchanged, no exclusions or threshold changes              |
| Actual standalone bundle                          | PASS    | 58 process cases without node_modules/registry credentials; all provider fetches mocked                                                               |
| Public schema and provider snapshots              | PASS    | 20 fixtures and 40 intentionally updated common-layout snapshots with independent semantic assertions                                                 |
| Bounds and reporting faults                       | PASS    | 21 Unicode-valued inputs plus maximum errors/issues/links; Teams 27 KiB/Slack 50 blocks; first-one/first-two output faults preserve accepted delivery |
| Bundle consistency, scan, audit and workflow lint | PASS    | Byte-consistent bundle; scan passed; no known vulnerabilities; actionlint/diff checks passed                                                          |
| Final hosted checks                               | NOT RUN | Current-head normal CI and CodeQL must pass before merge                                                                                              |
| Live Slack/Teams smoke                            | NOT RUN | Explicit test-send workflow was not dispatched                                                                                                        |

Commands actually executed: normal `pnpm install --frozen-lockfile`, public-export
assertions, `pnpm bundle`, complete `pnpm quality`, actionlint and diff checks.
The quality gate covers formatting, lint, strict types, schema/fixture checks,
coverage, bundle consistency, public scan and production audit. Registry
publication/bundle compatibility is resolved; hosted final-head checks remain
required and are not bypassed.

The standalone matrix covers every fixture for both providers, setup outcomes,
fatal/nonfatal delivery errors, invalid payloads, file privacy, reflected/encoded
webhook masking and output-file fault preservation. No real provider request or
SAP call was made.

## Historical candidate phase

Exact-source private tarballs were tested before publication, including the
privacy-fixed source `475cc4db42f79310240496201f90d7047aa54330`. Their integrity
matches the published package. The old preparation procedure is archived at
immutable Notify commit
[`41e699d13bd183bd51551e45c386cf9e8f77d6dd`](https://github.com/commercekit-tools/notify/tree/41e699d13bd183bd51551e45c386cf9e8f77d6dd).
Normal development no longer needs candidate flags or private file dependencies.

## Remaining release gates

Final-head normal CI and CodeQL must pass before merge. Producers must emit safe
input context to supply every setting; legacy events cannot supply omitted data.
Action release/Marketplace review and live provider smoke remain separate owner
steps. Passing mocked tests is not evidence of live delivery or production SAP
guarantees. This update creates no Git tag, Action release, deployment, live
provider send, real SAP operation or deletion enablement.
