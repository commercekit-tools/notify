# Contributing

Use Node.js `24.21.0` and pnpm `12.6.0`. Enable Corepack, then run `pnpm install --frozen-lockfile`.

Run `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm schema:check`, `pnpm test`, `pnpm test:coverage`, `pnpm audit`, and `pnpm bundle`. Review contract changes and provider payload fixtures carefully. Update `dist/index.js` with source changes. Use only synthetic fixtures; normal CI must never call real webhooks. PRs should explain contract/security effects and include focused tests.
