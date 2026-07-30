---
type: source
title: "Observation: Issue #30 opened for DB-backed workflow-run listing scalability"
slug: obs-2026-07-21-issue-30-opened-for-db-backed-workflow-run-listing-scalabili
status: observation
created: 2026-07-21
updated: 2026-07-21
relevance: medium
observed_at: 2026-07-21T11:59:04.994Z
tags: ["cape-frontend", "cape-cod", "workflows", "performance", "database", "github-issue"]
source_context: "Tracking workflow-run DB scalability follow-up"
---
# 🔍 Observation: Issue #30 opened for DB-backed workflow-run listing scalability
Opened GitHub issue cape-ph/cape-frontend#30 (https://github.com/cape-ph/cape-frontend/issues/30, label: enhancement) to track the workflow-run listing scalability problem. Fully specifies: the problem (Airflow has no server-side filter on conf, so GET /workflows/runs scans recent runs across all DAGs via /dags/~/dagRuns/list and filters conf.cape.triggering_user_id in the Lambda, with a MAX_RUNS_SCANNED=1000 cap that can silently drop a user's older runs), current implementation across cape-cod (authorizer identity -> post_workflow_run conf.cape -> get_workflow_runs filter) and cape-frontend (getMyWorkflowRuns, no client-side tracking), and the desired fix (DB-backed run-ownership index in the CAPE environment DB written at trigger time, real pagination on the endpoint, Airflow still source of truth for run state, conf.cape kept as durable attribution/backfill source). Referenced from both vaults' known-gaps/analysis pages.
*Relevance: medium*

*Context: Tracking workflow-run DB scalability follow-up*

*Tags: cape-frontend cape-cod workflows performance database github-issue*
---
*Observed: 2026-07-21T11:59:04.994Z*