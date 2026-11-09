# Security model

Webhook URLs are secrets and are masked by the Action. TLS is required; Slack hosts are allowlisted, Teams URLs reject credentials, fragments and local hostnames and private, loopback, link-local, or unspecified IP literals, including IPv4-mapped IPv6 forms. This literal-address check does not resolve DNS or prevent DNS rebinding. Webhook requests never follow redirects, use a ten-second timeout, and include bounded payloads. Events are schema validated; additive unknown properties are ignored and not rendered. Error text receives conservative credential-pattern redaction. Provider response bodies, request headers, payloads, and event JSON are never outputs. There is no telemetry and no source-code inspection.

Producer-side sanitization remains necessary; redaction is defense in depth. Report vulnerabilities through GitHub private vulnerability reporting for this repository when enabled, or follow GitHub's security advisory reporting process. Do not open a public issue with exploit details.

A supplied `context.runUrl` and all event links are validated as bounded HTTPS URLs without embedded credentials or fragments before they can become buttons. Missing context may be enriched from an explicit allowlist of GitHub Actions metadata variables only. Dynamic labels and text are sanitized; provider formatting syntax is escaped or rendered as plain text, while action URLs remain separately validated.

Runner metadata enrichment omits control characters and values exceeding the v1 context field bounds. Supplied event context retains precedence.
