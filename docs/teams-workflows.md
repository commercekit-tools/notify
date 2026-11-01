# Microsoft Teams Workflows

In Teams, create a Workflow using a webhook request trigger and configure it to post the received Adaptive Card to the intended channel or chat. Copy the generated URL into a GitHub Actions secret and set `provider: teams-workflow`. Assign at least one co-owner so the workflow remains operable if its creator leaves.

The renderer sends the message/attachments Adaptive Card envelope, Adaptive Cards version 1.2, FactSet and `Action.OpenUrl`. The action never submits deployment decisions. Payloads are capped at 27 KiB. Teams webhook hostnames vary; URLs must use HTTPS, contain no credentials or fragment, and may not target local/private IP literals or `.local`. Retired Office 365 Incoming Webhooks are not the supported new integration.
