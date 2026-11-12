# Third-party notices

The Action's bundled runtime includes `@actions/core` and `@commercekit-tools/notification-contract@0.0.2`, including the contract package's Ajv and `ajv-formats` dependencies. The committed `dist/licenses.txt` contains the license text and notices emitted by `@vercel/ncc` for code incorporated into `dist/index.js`; distribute it with the bundle. `package.json` and `pnpm-lock.yaml` record exact direct and resolved dependencies. Development tools are used to build and validate the Action and are not required by Action consumers.

Before each release, regenerate the bundle and review `dist/licenses.txt` for changes alongside dependency updates.
