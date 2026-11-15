# Ecosystem reporting consistency validation

## Provenance and gates

- Inspected Notify main: `6331ff4a60956a3a2b546e84d737c9338ca46bda`.
- Feature branch: `feat/consistent-action-reporting`.
- Normal exact registry dependency, lockfile and standalone bundle remain on
  published notification-contract **0.0.5**. There is no developer-local link or
  claimed publication of new 0.0.6 APIs.
- Candidate APIs live in the existing notification-contract package; no new
  package, schema replacement, OAuth/transport or webhook delivery subsystem.
- Final reviewed contract source: `475cc4db42f79310240496201f90d7047aa54330`.
- Reviewed tarball: `commercekit-tools-notification-contract-0.0.6.tgz`, 19140 bytes;
  SHA256 `e4b79576328c2992a96fed087e9ba6e63970e8b54d6fca976a6652702a7a73a9`;
  integrity `sha512-n6F84900sDPBeYm5dnf8HLCM9B2DUVATEeF717dqKsSXTJtq1FIj/3hZ2UcNTtXe7v8R90HYF6HIom4auM8Kyw==`.
- The complete consumer suite was replayed against the reviewed privacy fix,
  including lower/mixed-case percent-encoded known webhook values.
- Normal registry readiness is BLOCKED until separate publication authorization, exact repinning, lockfile/bundle regeneration and normal checks.

## Behavior verified

All five event families use the shared status map and Result/Inputs/Issues
sections. Every supplied input name survives provider bounds; legacy inputs are
explicitly unavailable. Existing source outcomes, integer counters, cancellation,
action-required and deletion-initiation semantics are retained. Confidential input
names are forced redacted even for direct malformed presentation callers.
Known-secret values redact across other inputs, context, error/issue text, links,
and reflected current webhook values before provider escaping/truncation.

Notify captures all five inputs with webhook masking first. Inline event content
and event-file paths are represented only by presence. Its own GitHub summary
separates actual delivery from the source outcome: success for a delivered
failure event, warning for default nonfatal delivery failure, and failure for
fatal delivery/configuration errors. Output-write failures retain known accepted
delivery state and attempts as a distinct Action contract issue. Summary failures
preserve delivery outputs and Action outcome. No resend is introduced.

## Validation status

Status vocabulary: PASS, FAIL, BLOCKED, NOT RUN.

| Check                                                            | Status  | Evidence                                                                                                                                                                      |
| ---------------------------------------------------------------- | ------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Final reviewed candidate frozen install and full quality         | PASS    | 188 tests/13 files, including 58 actual standalone bundle cases, 20 schema fixtures and 40 intentionally updated provider snapshots                                           |
| Candidate coverage                                               | PASS    | 98.12% statements, 93.22% branches, 97.29% functions, 98.95% lines; existing coverage configuration unchanged, no source exclusions or threshold policy changes               |
| Provider limits and outcome faults                               | PASS    | 21 Unicode-valued inputs plus maximum issues/errors/links; Teams 27 KiB/Slack 50 blocks; both first-one/first-two output-write faults preserve accepted delivery and attempts |
| Public scan, production audit, bundle consistency, workflow lint | PASS    | Public scan passed; no known vulnerabilities; byte-identical regenerated candidate bundle and local actionlint                                                                |
| Normal registry/bundle readiness                                 | BLOCKED | Source requires unpublished 0.0.6 public APIs and setup event support                                                                                                         |
| Live Slack/Teams smoke                                           | NOT RUN | Test delivery remains explicitly gated and was not dispatched                                                                                                                 |
| Release, tags, deployment, SAP operations                        | NOT RUN | No such operation is authorized by this implementation                                                                                                                        |

Commands actually run in the private candidate: `pnpm install`,
`pnpm install --frozen-lockfile`, `pnpm bundle`,
`COMMERCEKIT_CANDIDATE_CONTRACT_VERSION=0.0.6 pnpm quality` and local actionlint.
The final quality replay includes all 188 cases and the coverage above. The normal bundle remains untouched;
candidate bundle SHA256 is
`e9142b35852702017cd44d067c3681ad1bb6e5c2b13ec6f4d666919539d4ac92`.

Candidate tests execute the standalone bundled Action without node_modules or
registry credentials in controlled temporary directories. All provider fetches
are mocked, with fixed synthetic URLs. They verify every fixture for both
providers, setup outcomes, fatal/nonfatal delivery failures, invalid payloads,
file input privacy, reflected webhook masking and output-file fault preservation.
Additional unit tests cover common styles, every input, Unicode limits (21 input
values plus maximum errors/issues/links), explicit truncation under Teams 27 KiB
and Slack 50 blocks, safe diagnostics and malicious metadata. Delivery policies
and existing coverage configuration are unchanged.

## Adoption

After separately authorized package publication, verify exact registry integrity
and exports, repin both consumers/installed-version assertions/release-age review,
regenerate lockfiles and committed bundles and run all normal quality/security
checks. Producers must also adopt the compatible shared package and emit safe
input context. Older events can still render but cannot supply omitted settings.
Passing mocked provider tests is not evidence of live provider delivery or any
production SAP guarantee. Green source tests never authorize an Action release.
