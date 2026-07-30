---
type: source
title: "Observation: Wiki audited against source; 4 inaccuracies fixed"
slug: obs-2026-07-20-wiki-audited-against-source-4-inaccuracies-fixed
status: observation
created: 2026-07-20
updated: 2026-07-20
relevance: high
observed_at: 2026-07-20T19:40:35.423Z
tags: ["cape-frontend", "wiki", "audit", "accuracy"]
source_context: "Auditing cape-frontend llm-wiki accuracy against source"
---
# ⭐ Observation: Wiki audited against source; 4 inaccuracies fixed
Audited all 14 authored cape-frontend wiki pages against real source. Corrected four inaccuracies: (1) data-models claimed a WorkflowTriggerRequest type in pipeline.ts - no such type exists; the /workflows/trigger body is built inline by Submit.svelte serializeWorkflow() as {pipelineConfigs:[{pipelineId,nextflowOptions}]}. (2) cape-api listed POST /dap/submit and the /dap/* single-pipeline path under 'endpoints used by the frontend' - grep confirms getPipelines/getPipelineProfile have zero call sites and no /dap/submit function exists; relabeled as dead/legacy. (3) external-dependencies listed streamsaver as used - it and the cookie package are declared in package.json but never imported in src/. (4) report-viewing had an unverifiable '~12-15s' generation claim - softened. Verified accurate: AJV config (allErrors/strict/validateSchema:false), error-priority chain required>type>min/max>enum>other (matches getErrorPriority 1/2/3/3/4/5), numeric input type=text inputmode=numeric, S3 buckets + unprocessed/${filename} key, mpu DEFAULT_PART_SIZE 10MB + numRetries 3 + fast-xml-parser, tar 512-block sizing, adapter-node, tabs upload/workflows/report, cookie 90-day SameSite=Strict, SvelteMap key `${dagId}::${dagRunId}`. Added a 'Dead code and unused dependencies' section to known-gaps. Lint clean: 20 pages, 0 missing, 0 contradictions.
*Relevance: high*

*Context: Auditing cape-frontend llm-wiki accuracy against source*

*Tags: cape-frontend wiki audit accuracy*
---
*Observed: 2026-07-20T19:40:35.423Z*