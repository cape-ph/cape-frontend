# Dev Environment and Tooling

How to build, run, test, and get diagnostics on CAPE Frontend so future sessions
match the repo. Package manager: npm (only `package-lock.json` is present).
Node v22 in the current environment; `type: module`.

## Commands (from package.json)

- `npm run dev` - Vite dev server on `http://localhost:3000` (`--host --port 3000`)
- `npm run build` - production build (adapter-node)
- `npm run preview` - preview the production build
- `npm run check` - `svelte-kit sync && svelte-check` (TypeScript + Svelte type check)
- `npm run check:watch` - type check in watch mode
- `npm run lint` - `prettier --check . && eslint .`
- `npm run format` - `prettier --write .` (run before committing)
- `npm run test:unit` - Vitest in watch mode
- `npm run test` - Vitest once (CI mode)

Pre-completion gate for UI work: `npm run format`, `npm run lint`, `npm run check`,
`npm run test` should all pass.

## Testing setup

- Vitest with two workspace projects (see `vite.config.ts`):
  - `client` - jsdom env, matches `src/**/*.svelte.{test,spec}.{js,ts}`, uses
    `vitest-setup-client.ts` (which mocks `window.matchMedia` for Svelte 5 + jsdom).
  - `server` - node env, matches `src/**/*.{test,spec}.{js,ts}` excluding
    `*.svelte.{test,spec}`.
- Tests use `@testing-library/svelte` and `@testing-library/jest-dom/vitest`.
- Test files co-located with source (`*.svelte.test.ts` for components; `.test.ts`
  for lib modules such as `schema.test.ts`, `workflowRunsStorage.test.ts`).

## Formatter / linter config files

- `.prettierrc` - 4-space indent, single quotes, no trailing commas, print width
  100; plugins `prettier-plugin-svelte`, `prettier-plugin-tailwindcss`.
- `.prettierignore` - ignores lockfiles.
- `eslint.config.js` - flat config: `@eslint/js` recommended, `typescript-eslint`
  recommended, `eslint-plugin-svelte` recommended + prettier compat; honors
  `.gitignore`; `no-undef` disabled (TS handles it).
- `tsconfig.json` - strict, `checkJs`, `moduleResolution: bundler`; extends
  `.svelte-kit/tsconfig.json` (run `svelte-kit sync` first).

## LSP / pi-lens diagnostics

- Primary language server: TypeScript (`node_modules/.bin/tsserver`), which
  pi-lens uses for `.ts` files. Verified: `lsp_diagnostics` returns clean results
  on `.ts` and `.svelte` files in this repo.
- The dedicated Svelte language server (`svelte-language-server` /
  `svelteserver`) is NOT installed as a direct dependency; only `svelte-check`
  ships. pi-lens still returned diagnostics on `.svelte` files here, but for
  richest Svelte-aware diagnostics, `npm run check` (svelte-check) is the source of
  truth. If deep Svelte LSP features are needed, install `svelte-language-server`.
- Env vars are required at runtime ([[concepts/authentication-cognito]]);
  `src/lib/env.ts` throws on missing Cognito vars, so `npm run dev` needs a
  populated `.env`.

## Dev server management (for agents)

Background it and always stop it after testing:

```bash
nohup npm run dev > /tmp/vite-dev.log 2>&1 &
# ... test ...
pkill -f "vite dev"
```

For live browser QA, prefer the chrome-devtools MCP against
`http://127.0.0.1:9222`.

## Related

- [[concepts/coding-style-and-conventions]]
- [[entities/sveltekit]]
- [[syntheses/cape-frontend-architecture-overview]]
