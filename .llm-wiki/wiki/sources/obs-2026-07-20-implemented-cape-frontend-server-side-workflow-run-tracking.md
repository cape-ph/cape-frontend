---
type: source
title: "Observation: Implemented cape-frontend server-side workflow run tracking"
slug: obs-2026-07-20-implemented-cape-frontend-server-side-workflow-run-tracking
status: observation
created: 2026-07-20
updated: 2026-07-20
relevance: high
observed_at: 2026-07-20T20:28:18.072Z
tags: ["cape-frontend", "workflows", "auth", "svelte", "airflow", "implemented"]
source_context: "Implementing per-user workflow tracking (cape-frontend)"
---
# ⭐ Observation: Implemented cape-frontend server-side workflow run tracking
Implemented the cape-frontend side of per-user workflow tracking. New src/lib/apiClient.ts exports a shared axios instance `capi` with a request interceptor that attaches the Cognito access_token as `Authorization: Bearer <token>` from auth.user (user.svelte). pipeline.ts and workflowStatus.ts now use `capi` instead of bare axios. Added workflowStatus.getMyWorkflowRuns(baseUrl) -> GET /workflows/runs returning WorkflowRun[], plus types WorkflowRunsResponse and WorkflowPipelineConfig and helper getPipelineConfigsFromRun(run) reading run.conf.pipelineConfigs. Status.svelte rewritten to load runs from getMyWorkflowRuns (local $state + SvelteMap of task instances keyed by dag_run_id, 30s poll of running/queued), dropping the cookie flow and the whole 'unavailable run' concept. WorkflowRunCard.svelte props changed to {run, taskInstances, onViewDetails} (was storedRun/liveRun/isAvailable). StatusDetail.svelte reconstructs the submission accordion from conf.pipelineConfigs (getPipelineConfigsFromRun), removed onClear/isAvailable + Clear button. Submit.svelte posts via capi and no longer builds SubmissionConfig or tracks runs. +page.svelte lost the cookie imports, handleClearWorkflow, and the isAvailable plumbing. DELETED src/lib/workflowRunsStorage.ts(+test) and src/lib/workflowRuns.svelte.ts(+test). Tests: new apiClient.test.ts (interceptor) and workflowStatus.test.ts (getMyWorkflowRuns + getPipelineConfigsFromRun); Submit.svelte.test.ts now mocks $lib/apiClient. Validation: prettier clean on changed src, eslint clean, svelte-check 0 errors, vitest 32/32 pass. NOTE the Cognito access token carries sub + cognito:username but not necessarily email; if human-readable emails are needed server-side, add the email scope or send id_token instead.
*Relevance: high*

*Context: Implementing per-user workflow tracking (cape-frontend)*

*Tags: cape-frontend workflows auth svelte airflow implemented*
---
*Observed: 2026-07-20T20:28:18.072Z*