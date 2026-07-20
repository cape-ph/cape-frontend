# AWS Cognito

Identity provider for CAPE Frontend, integrated over OpenID Connect
(authorization-code flow) using `oidc-client-ts`. See
[[concepts/authentication-cognito]] for the implementation.

## Configuration

Driven by `PUBLIC_*` env vars read in `src/lib/env.ts`:

- `PUBLIC_COGNITO_AUTHORITY` - Cognito authority URL
- `PUBLIC_COGNITO_CLIENT_ID` - OAuth client ID
- `PUBLIC_COGNITO_REDIRECT_URI` - OAuth callback URL

Client settings (`src/lib/cognito.ts`): `response_type: 'code'`,
`response_mode: 'query'`, `scope: 'email openid'`, tokens stored in
`window.localStorage`. Redirect handled at `/auth/callback`.

## Related

- [[entities/cape-api]]
- [[syntheses/cape-frontend-architecture-overview]]
