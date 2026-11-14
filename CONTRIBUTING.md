# Contributing

Use Node.js `24.21.0` and pnpm `12.6.0`. Configure GitHub Packages authentication as described below, enable Corepack, then run `pnpm install --frozen-lockfile`.

Run `pnpm format`, `pnpm lint`, `pnpm typecheck`, `pnpm schema:check`, `pnpm test`, `pnpm test:coverage`, `pnpm audit`, and `pnpm bundle`. Review contract changes and provider payload fixtures carefully. Update `dist/index.js` with source changes. Use only synthetic fixtures; normal CI must never call real webhooks. PRs should explain contract/security effects and include focused tests.

## GitHub Packages access

`@commercekit-tools/notification-contract` is pinned to `0.0.3`. The committed `.npmrc` contains only the scoped registry. Configure a classic GitHub PAT with `read:packages` in your user-level npm configuration, or supply `NODE_AUTH_TOKEN` through an external npm auth configuration. Never commit credentials or add a long-lived PAT repository secret.

```sh
npm login --scope=@commercekit-tools --registry=https://npm.pkg.github.com --auth-type=legacy
pnpm view @commercekit-tools/notification-contract@0.0.3 version --registry=https://npm.pkg.github.com
pnpm install --frozen-lockfile
```

If an IDE overrides your npm configuration, inspect `npm config get userconfig` and point `NPM_CONFIG_USERCONFIG` to your authenticated user-level file. Do not print its credentials.

CI and release preflight use the existing pinned setup-node action, job-level `contents: read` and `packages: read`, and `NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}` only on the install step. The Notify repository must have Actions read access to the package. CodeQL uses build-mode none and needs no package installation. Smoke workflows execute the bundled Action without package credentials.

`pnpm schema:check` verifies the exact installed package version, public schema export, all committed fixtures, supported event types and absence of a vendored schema. It uses installed files and makes no registry request. Keep golden snapshots unchanged during source deduplication. The local presentation sanitizer retains Notify's redaction wording and URL filtering because the generic package sanitizers are not equivalent.
