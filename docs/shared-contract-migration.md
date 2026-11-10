# Shared contract migration

This branch migrates the pre-extraction baseline `015479e4340f61598d2125532acf6474381ca976` to `@commercekit-tools/notification-contract@0.0.2`. Notify remains unreleased.

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

## Compatibility gate

All 16 committed fixtures are covered by the existing 32 provider snapshots. They must remain unchanged. The original sanitizer is deliberately retained because package primitives use different redaction labels and do not replace Notify's signed-URL and webhook filtering. Provider text safety is not delegated to generic package sanitizers.

A confirmed acceptance difference requires review before this source-only migration is considered compatible: Notify's baseline accepts an HTTPS link ending in an empty `#`; package 0.0.2 rejects it. The package validator remains the single source of truth; the adapter does not bypass it. Resolving this requires explicit approval of the stricter rule or a compatible package revision. The shared package is not modified here.

Package errors do not expose Ajv diagnostic paths. The local adapter retains the invalid-JSON and byte-limit messages and uses bounded, input-free messages for schema/type/status/data and link errors. No invalid JSON is echoed. Validation failures remain fatal and occur before delivery.

The context adapter preserves producer values, fills safe missing metadata, requires an explicit runner server URL, and supports producer repository/run metadata when runner values are missing. The package also rejects C1 control characters in extracted metadata and requires an origin-only server URL; the baseline extractor accepted those metadata characters and HTTPS server path prefixes. These stricter context policies also need review under the unchanged-behavior requirement.
