# Security Policy

Webhook URLs are credentials. Store them as GitHub Actions secrets and do not place them in event data, source, or logs. This Action masks the URL, requires TLS, bounds payloads, validates events, blocks redirects, and does not expose provider response bodies or request headers. Unknown additive event fields are ignored and are never rendered. There is no telemetry and the Action does not inspect source code.

Redaction is defense in depth and does not replace safe producer behavior. See [security details](docs/security.md).

Report vulnerabilities through GitHub private vulnerability reporting for this repository when available. Otherwise use GitHub's private security advisory reporting flow. Do not disclose exploit details in public issues.
