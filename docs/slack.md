# Slack incoming webhooks

Create/configure a Slack app, enable Incoming Webhooks, and create a webhook for the target channel. Store its URL in a GitHub Actions secret. Use `provider: slack`; never commit or print the webhook URL.

Messages contain accessible top-level fallback text and one narrowly used colored attachment containing modern Block Kit blocks. Dynamic text is escaped, mentions are neutralized, links are validated HTTPS URLs, and unfurls are disabled. Slack host validation allows `hooks.slack.com` and `hooks.slack-gov.com` only. This Action does not use Slack SDKs.
