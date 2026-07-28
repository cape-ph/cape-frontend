---
type: source
title: "Observation: Frontend SWR cache for workflow runs list + detail (workflowCache.ts)"
slug: obs-2026-07-28-frontend-swr-cache-for-workflow-runs-list-detail-workflowcac
status: observation
created: 2026-07-28
updated: 2026-07-28
relevance: high
observed_at: 2026-07-28T15:57:20.409Z
tags: ["cape-frontend", "caching", "svelte", "workflow-status", "sessionstorage", "swr"]
source_context: "Adding client-side caching to Workflows list + detail views"
---
# ⭐ Observation: Frontend SWR cache for workflow runs list + detail (workflowCache.ts)
Added stale-while-revalidate caching to the cape-frontend Workflows views. New module src/lib/workflowCache.ts stores a { runs, taskInstances } snapshot in-memory + sessionStorage, keyed by the user's Cognito sub (auth.user.profile.sub) to prevent cross-user leakage; exports readWorkflowSnapshot, writeWorkflowSnapshot, updateCachedRun (merge one run into the snapshot), clearWorkflowSnapshots. Status.svelte (list): onMount hydrates from the snapshot and sets isLoading=false when present, then refreshAllRuns revalidates and persists; a failed background refresh no longer clobbers the list (template shows the error placeholder only when runs.length===0, else an inline banner over the cached list). StatusDetail.svelte (detail): onMount seeds workflowRun + taskInstances from the snapshot by dag_run_id so details paint instantly, and fetchData writes back via updateCachedRun. Verified live via chrome-devtools: sessionStorage key cape:workflow-runs:<sub> populated; list and detail render without the Loading placeholder. Gates green: eslint 0, svelte-check 0/0, 34 tests. Note: the pre-existing getWorkflowProfilesCached (pipeline.ts) already caches stage profiles per session; that was untouched.
*Relevance: high*

*Context: Adding client-side caching to Workflows list + detail views*

*Tags: cape-frontend caching svelte workflow-status sessionstorage swr*
---
*Observed: 2026-07-28T15:57:20.409Z*