---
type: source
title: "Observation: Retired notes/ + NOTES.md; migrated to llm-wiki"
slug: obs-2026-07-20-retired-notes-notes-md-migrated-to-llm-wiki
status: observation
created: 2026-07-20
updated: 2026-07-20
relevance: high
observed_at: 2026-07-20T19:31:05.969Z
tags: ["cape-frontend", "wiki", "migration", "cleanup"]
source_context: "Migrating cape-frontend from notes/ docs to llm-wiki"
---
# ⭐ Observation: Retired notes/ + NOTES.md; migrated to llm-wiki
Retired the legacy notes/ context-tracking method in cape-frontend in favor of the llm-wiki. Verified all durable notes/ + NOTES.md content was captured (enriched 9 wiki pages with AJV Draft 2020-12 workaround, numeric-input coercion, error-dedup priority, Svelte5 new-reference reactivity gotcha, exact /workflows/trigger payload {pipelineConfigs:[{pipelineId,nextflowOptions}]} + positional order, cross-stage data flow, S3 bucket names/key pattern, report reportId hardcode + iframe sandbox, halt semantics, Airflow+AWS Batch model, uiSchema/inherits) and created analyses/known-gaps-and-unused-api. Discarded stale content (notes/05 referenced /api/v1/dags* endpoints that contradict the actual /workflows* code). Deleted notes/ (14 files) + NOTES.md. Rewrote AGENTS.md (symlink -> CLAUDE.md) to drop the session-resume/NOTES.md/Documentation-Maintenance notes-tree apparatus and point at the wiki. Remaining minor relic: vite.config.ts watch.ignored still lists 'notes/**','NOTES.md' (harmless no-op, left untouched as project code out of scope).
*Relevance: high*

*Context: Migrating cape-frontend from notes/ docs to llm-wiki*

*Tags: cape-frontend wiki migration cleanup*
---
*Observed: 2026-07-20T19:31:05.969Z*