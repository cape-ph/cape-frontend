# Authentication (AWS Cognito / OIDC)

All application functionality is gated behind AWS Cognito authentication using the
OpenID Connect authorization-code flow. The UI renders the app only when
`auth.user` is set (`{#if auth.user}` in `routes/+page.svelte`).

## Pieces

- `src/lib/cognito.ts` - builds a `UserManager` from `oidc-client-ts`. Config is
  browser-only (`undefined` during SSR). Uses `response_type: 'code'`,
  `response_mode: 'query'`, `scope: 'email openid'`, and stores tokens in
  `window.localStorage` via `WebStorageStateStore`. Exported as `userManager`.
- `src/lib/user.svelte.ts` - module-level reactive auth state:
  `export const auth = $state<{ user?: User }>({})` with `getUser` / `setUser` /
  `clearUser` helpers.
- `src/routes/auth/callback/+page.svelte` - OIDC redirect handler that exchanges
  the code for tokens and populates `auth.user`.
- `src/lib/components/LoggingIn/` - transitional login UI.

## Required environment variables

Read through `src/lib/env.ts`, which throws if any Cognito var is missing:

- `PUBLIC_COGNITO_AUTHORITY`
- `PUBLIC_COGNITO_CLIENT_ID`
- `PUBLIC_COGNITO_REDIRECT_URI`
- `PUBLIC_API_BASE` (optional, defaults to `https://api.cape-dev.org/capi-dev`)

## Related

- [[entities/aws-cognito]]
- [[syntheses/cape-frontend-architecture-overview]]
- [[concepts/external-dependencies-and-boundaries]]
