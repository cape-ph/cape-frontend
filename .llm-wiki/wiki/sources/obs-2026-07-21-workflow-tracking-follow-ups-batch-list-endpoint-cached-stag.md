---
type: source
title: "Observation: Workflow tracking follow-ups: batch list endpoint + cached stage names + auth options"
slug: obs-2026-07-21-workflow-tracking-follow-ups-batch-list-endpoint-cached-stag
status: observation
created: 2026-07-21
updated: 2026-07-21
relevance: high
observed_at: 2026-07-21T11:50:26.139Z
tags: ["cape-frontend", "cape-cod", "workflows", "airflow", "performance", "auth", "caching"]
source_context: "Per-user workflow tracking follow-ups (auth, list perf, detail names)"
---
# ⭐ Observation: Workflow tracking follow-ups: batch list endpoint + cached stage names + auth options
Follow-up improvements to per-user workflow tracking after user Q&A. (1) Token: Cognito username == email in this deployment, so the access token's `username` claim already yields a human-readable triggering_user_name; no id_token switch needed. (2) List performance: confirmed via Airflow 3.0.6 docs that no Airflow version can filter dagRuns on a `conf` value, so ownership filtering stays in the proxy. Replaced the per-DAG N+1 in cape-cod get_workflow_runs.py with the cross-DAG endpoint GET /dags/~/dagRuns/list (~ wildcard = all DAGs), paginated (limit/offset/order_by=-logical_date) up to MAX_RUNS_SCANNED=1000; helper _list_all_dag_runs replaces _list_all_dag_ids/_list_dag_runs. Added pagination tests; cape-cod suite 36 passed. NOTE the GET-vs-POST method and query-param names for /dags/~/dagRuns/list are grounded in the 3.0.6 access-control docs but were not smoke-tested against live MWAA. (3) Detail fidelity: added getWorkflowProfilesCached(baseUrl, dagId) in cape-frontend pipeline.ts (session Map cache of the profiles promise, does not cache failures); StatusDetail.svelte maps conf pipelineId -> pipelineName (vVERSION) with pipelineId fallback, fetched once per dagId, non-fatal on error. Added pipeline.test.ts. Frontend: eslint clean, svelte-check 0 errors, vitest 34 passed. STILL OPEN: authorizer JWT signature verification. Recommended options - native API Gateway Cognito User Pools authorizer (zero code/deps, AWS handles JWKS rotation, but changes handler contract to read requestContext.authorizer.claims.* and needs the user pool ARN in the OpenAPI template) vs PyJWT+cryptography verification inside the existing custom authorizer (keeps triggering_user_id/name contract, adds 2 layer deps + issuer/JWKS env vars; the authorizer currently has no lambda layer attached).
*Relevance: high*

*Context: Per-user workflow tracking follow-ups (auth, list perf, detail names)*

*Tags: cape-frontend cape-cod workflows airflow performance auth caching*
---
*Observed: 2026-07-21T11:50:26.139Z*