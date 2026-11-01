# Security model

Webhook URLs are secrets and are masked by the Action. TLS is required; Slack hosts are allowlisted, Teams URLs reject credentials, fragments and obvious local/private literals. Webhook requests never follow redirects, use a ten-second timeout, and include bounded payloads. Events are schema validated; additive unknown properties are ignored and not rendered. Error text receives conservative credential-pattern redaction. Provider response bodies, request headers, payloads, and event JSON are never outputs. There is no telemetry and no source-code inspection.

Producer-side sanitization remains necessary; redaction is defense in depth. Report vulnerabilities through GitHub private vulnerability reporting for this repository when enabled, or follow GitHub's security advisory reporting process. Do not open a public issue with exploit details.
