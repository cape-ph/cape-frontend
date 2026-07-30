---
type: source
title: "Observation: Silent JWT renewal for Cognito sessions (frontend)"
slug: obs-2026-07-30-silent-jwt-renewal-for-cognito-sessions-frontend
status: observation
created: 2026-07-30
updated: 2026-07-30
relevance: high
observed_at: 2026-07-30T18:26:51.558Z
tags: ["auth", "cognito", "oidc", "frontend", "jwt"]
source_context: "Finalizing persistent_workflows branch: adding silent token renewal to avoid stale JWTs"
---
# ⭐ Observation: Silent JWT renewal for Cognito sessions (frontend)
cape-frontend had no token refresh: once the Cognito access token expired, the app kept sending a stale JWT (the axios interceptor read auth.user?.access_token from a reactive store only set on load/callback), and recovery required a full reload -> signinRedirect.

Fix (branch persistent_workflows, commit 8d882da): enabled oidc-client-ts automaticSilentRenew in src/lib/cognito.ts with accessTokenExpiringNotificationTimeInSeconds: 60, renewing via the Cognito refresh token issued for the auth-code + PKCE flow (scope stays 'email openid'; no silent_redirect_uri route needed because refresh-token grant is used, not iframe prompt=none). Wired UserManager events there: addUserLoaded -> setUser, addUserUnloaded -> clearUser, addSilentRenewError -> console.error, so the reactive store (src/lib/user.svelte.ts) stays in sync after a background renew. src/routes/+layout.svelte now attempts userManager.signinSilent() before falling back to signinRedirect() on an expired/missing session. src/lib/apiClient.ts interceptor became async: when auth.user?.expired it performs a de-duplicated on-demand signinSilent (shared renewInFlight promise) and updates the store before attaching the bearer, covering a tab that wakes past expiry before the renew timer fires.

Key gotcha: importing userManager statically into apiClient.ts pulled $lib/cognito -> $lib/env ($env/dynamic/public) into every module graph that imports capi, which broke src/routes/page.svelte.test.ts with "Cannot read properties of undefined (reading 'env')". Fixed by importing cognito lazily inside renewToken via dynamic import('$lib/cognito'). Prerequisite: the Cognito app client must issue refresh tokens (default for auth-code grant); refresh-token expiration bounds the max silent-session length. A 401 response interceptor for the terminal refresh-expired case was intentionally left as a possible follow-up.
*Relevance: high*

*Context: Finalizing persistent_workflows branch: adding silent token renewal to avoid stale JWTs*

*Tags: auth cognito oidc frontend jwt*
---
*Observed: 2026-07-30T18:26:51.558Z*