# Cleanup notification candidate validation

This is source-candidate integration evidence, not a registry-installed release.
Normal package.json, pnpm-lock.yaml and dist remain on published contract 0.0.4.
Normal dependency/release readiness remains BLOCKED until separate publication
and coordinated consumer pin/bundle upgrades are authorized.

Candidate provenance:

- action-kit source `3f9e418556b190bb8d55ac11a22f554e2c51a4a5`.
- Source package version 0.0.5; exact tarball SHA256
  `9c3b9910dc51be697c3aa4e44620c3cd87d3cdd132f9a5431e85f9cb5f712dec`.
- Tarball integrity:
  `sha512-SMcyyWaeHdtlztt99xtWlJycSAspSTGvCaWJH7M2+u+on77JHwo8boTBOc9UUC0BQHDPo/VHmOj4gpt/XIbqmw==`.

An isolated private copy installed this file tarball, rebuilt the actual bundle
and ran `COMMERCEKIT_CANDIDATE_CONTRACT_VERSION=0.0.5 pnpm quality`.
The candidate mode requires the exact installed 0.0.5 package and a file tarball
dependency; the normal registry schema check remains fixed to 0.0.4. Temporary
candidate dependency/lock/dist files were not copied back to this repository.

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
deployment was performed. OAuth and existing delivery implementations are unchanged.
