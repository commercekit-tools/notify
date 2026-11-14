# Shared contract migration

The original migration moved the pre-extraction baseline `015479e4340f61598d2125532acf6474381ca976` to `@commercekit-tools/notification-contract@0.0.2`. Notify now pins `0.0.3`; this additive package upgrade preserves the schema, rendering and delivery policies described below. Notify remains unreleased.

## Ownership inventory

| Previous implementation                                          | Classification         | Migration                                                                                    |
| ---------------------------------------------------------------- | ---------------------- | -------------------------------------------------------------------------------------------- |
| `schema/notification-event-v1.schema.json`                       | Package replacement    | Removed; public package `./schema` export                                                    |
| `src/event/types.ts` contract types                              | Package replacement    | Public package types; provider identifiers move to `src/delivery/types.ts`                   |
| `src/event/validate.ts` Ajv and semantic checks                  | Package replacement    | Package validation with a safe diagnostic adapter                                            |
| `src/event/parse.ts`                                             | Mixed — split          | Filesystem safeguards stay local; JSON parsing and validation use package                    |
| `src/event/enrich-context.ts`                                    | Mixed — split          | Package extraction/merge; adapter requires an explicit server and uses producer run metadata |
| `src/event/sanitize.ts`                                          | Notify-specific — keep | Moved to presentation; existing marker wording, signed URL and webhook filtering retained    |
| `scripts/schema-check.mjs`                                       | Package replacement    | Offline installed-version/schema/fixture compatibility check                                 |
| Templates, themes, renderers, transport and destination policies | Notify-specific — keep | Locally owned                                                                                |
| Action interface, preview tooling, smoke/release behavior        | Notify-specific — keep | Locally owned; install jobs get read-only package access                                     |

There were no schema updater/provenance scripts to remove. All imports use public package exports. Direct Ajv dependencies are removed; the package supplies its runtime dependencies transitively.

## Compatibility behavior

All 16 committed fixtures are covered by the existing 32 provider snapshots. They must remain unchanged. The original sanitizer is deliberately retained because package primitives use different redaction labels and do not replace Notify's signed-URL and webhook filtering. Provider text safety is not delegated to generic package sanitizers.

This migration adopts package 0.0.2's stricter validation: HTTPS links ending in an empty `#` are rejected, although the baseline accepted them. The package validator remains the single source of truth; the adapter does not bypass it. The shared package is not modified here.

Package errors do not expose Ajv diagnostic paths. The local adapter retains the invalid-JSON and byte-limit messages and uses bounded, input-free messages for schema/type/status/data and link errors. No invalid JSON is echoed. Validation failures remain fatal and occur before delivery.

The context adapter preserves producer values, fills safe missing metadata, requires an explicit runner server URL, and supports producer repository/run metadata when runner values are missing. The package also rejects C1 control characters in extracted metadata and requires an origin-only server URL; the baseline extractor accepted those metadata characters and HTTPS server path prefixes. This migration adopts those stricter context policies. Invalid runner metadata is omitted without overriding valid producer context.

## Action Kit 0.0.3 adoption

Version 0.0.3 adds opt-in text primitives used by Build and Deploy. Notify retains its provider-specific sanitizer, redaction labels and webhook retry policy; the new primitives do not replace those policies. Upgrade the exact package dependency, installed-version assertions and reviewed release-age exception together, then regenerate the registry lockfile and committed bundle after publication. Preserve the existing golden snapshots and original migration provenance. Run the complete quality gate before pushing.
