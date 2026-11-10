# Security Policy

Webhook URLs are credentials. Store them as GitHub Actions secrets and do not place them in event data, source, or logs. This Action masks the URL, requires TLS, bounds payloads, validates events, blocks redirects, and does not expose provider response bodies or request headers. Unknown additive event fields are ignored and are never rendered. There is no telemetry and the Action does not inspect source code.

Redaction is defense in depth and does not replace safe producer behavior. See [security details](docs/security.md).

Report vulnerabilities through GitHub private vulnerability reporting for this repository when available. Otherwise use GitHub's private security advisory reporting flow. Do not disclose exploit details in public issues.

NotificationEvent v1 parsing and validation are supplied by the bundled `@commercekit-tools/notification-contract@0.0.2`. Notify retains filesystem safety, provider escaping and redaction, webhook URL masking, destination restrictions, timeouts, redirects and delivery policy. Runtime workflow consumers need no registry credentials. Package credentials belong only in maintainer user configuration or the CI install step; never in repository files or the bundle.
