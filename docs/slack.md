# Slack incoming webhooks

Create/configure a Slack app, enable Incoming Webhooks, and create a webhook for the target channel. Store its URL in a GitHub Actions secret. Use `provider: slack`; never commit or print the webhook URL.

Messages contain accessible top-level fallback text, one small top-level context block, and one narrowly used colored attachment containing modern Block Kit blocks. A top-level block makes the fallback text notification and screen-reader content rather than a second visible copy of the message. The attachment places the outcome header above the main identifier and UTC event time, separates the outcome sentence from ordered details, then shows actions and workflow context. Empty sections are omitted. Dynamic text is escaped, mentions are neutralized, links are validated HTTPS URLs, and unfurls are disabled. Slack host validation allows `hooks.slack.com` and `hooks.slack-gov.com` only. This Action does not use Slack SDKs.

See the [current Slack Incoming Webhooks guide](https://docs.slack.dev/messaging/sending-messages-using-incoming-webhooks/) for setup and payload behavior.
