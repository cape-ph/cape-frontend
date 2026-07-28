---
type: source
title: "Observation: cape-frontend dead-code removal + knip Svelte-import blind spot"
slug: obs-2026-07-28-cape-frontend-dead-code-removal-knip-svelte-import-blind-spo
status: observation
created: 2026-07-28
updated: 2026-07-28
relevance: high
observed_at: 2026-07-28T16:27:59.641Z
tags: ["cape-frontend", "dead-code", "knip", "refactor", "simplify", "prettier"]
source_context: "Simplify + dead-code pass on cape-frontend caching PR"
---
# ⭐ Observation: cape-frontend dead-code removal + knip Svelte-import blind spot
Dead-code/simplify pass on cape-frontend (branch persistent_workflows, commit d8a6baa). Knip has a systematic blind spot in this repo: it cannot resolve imports inside .svelte files, so it false-positives symbols consumed only by components (e.g. updateCachedRun is imported by StatusDetail.svelte; compile by Submit.svelte). Verify every knip 'unused export' with grep across BOTH .ts and .svelte before removing. Removed (zero callers, confirmed): workflowStatus.ts getWorkflowTasks + WorkflowTask + WorkflowTasksResponse; pipeline.ts getPipelines + getPipelineProfile (old /dap/* endpoints) + the now-unused Pipeline interface; Submit __fixtures__/pipelines.ts + pipeline-profile.ts; workflowCache.ts clearWorkflowSnapshots (there is no logout flow - clearUser is itself uncalled). De-nested the updateCachedRun ternary. Left over-exported-but-internally-used helpers alone (mpu create/send/abortMultipartUpload, SchemaProperty, WorkflowRun* aliases) since dropping export is cosmetic and touches unrelated files. Gates: svelte-check 0/0, 34 tests pass, TS Prettier-clean. Note npm run lint fails ONLY on pre-existing .llm-wiki/** and CLAUDE.md markdown formatting because .llm-wiki is not in .prettierignore - unrelated to source. Also still-stale: data-models.md documents a 'Persistence / submission types (src/lib/workflowRunsStorage.ts)' section for a file deleted in the earlier cookie->server migration; left for a separate cleanup.
*Relevance: high*

*Context: Simplify + dead-code pass on cape-frontend caching PR*

*Tags: cape-frontend dead-code knip refactor simplify prettier*
---
*Observed: 2026-07-28T16:27:59.641Z*