---
type: source
title: "Observation: Local frontend testing auth model + post-authorizer-swap caveat (#352)"
slug: obs-2026-07-28-local-frontend-testing-auth-model-post-authorizer-swap-cavea
status: observation
created: 2026-07-28
updated: 2026-07-28
relevance: high
observed_at: 2026-07-28T14:11:16.693Z
tags: ["cape-frontend", "cape-cod", "cognito", "auth", "local-testing", "authorizer", "env"]
source_context: "Planning local frontend test against deployed dev backend"
---
# ⭐ Observation: Local frontend testing auth model + post-authorizer-swap caveat (#352)
Local cape-frontend testing works against the deployed dev CAPE API because the current custom API Gateway authorizer decodes the bearer JWT without verifying issuer/signature, so it accepts tokens from any Cognito pool/client. The frontend .env uses a localhost-callback Cognito app client (client 4m1jsp3891ek2fg9sjkjg6a3i9 on pool us-east-2_b9tFRG8sr, redirect http://localhost:3000/auth/callback), separate from the deployed cape-frontend client whose callback is only https://<domain>/auth/callback. Per-user attribution is self-consistent because trigger and list use the same token, so the stamped conf.cape.triggering_user_id (Cognito sub) matches the filter; matching the user's email is only cosmetic (drives the Airflow run note / triggering_user_name, which comes from username/cognito:username on the access token, not email). Cognito sub is per-pool, so runs triggered under a different pool won't appear cross-pool. Caveat recorded in cape-ph/cape-cod#352: after switching to a native Cognito User Pools authorizer, the localhost client must be in a pool listed in the authorizer providerARNs or local calls 401; preferred fix is to keep the localhost client in the same pool the authorizer validates (also keeps sub aligned with deployed).
*Relevance: high*

*Context: Planning local frontend test against deployed dev backend*

*Tags: cape-frontend cape-cod cognito auth local-testing authorizer env*
---
*Observed: 2026-07-28T14:11:16.693Z*