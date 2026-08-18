---
type: source
title: "Observation: Workflow detail View report button gated on live report count"
tags:
  - frontend
  - workflow
  - reports
  - svelte
status: observation
created: 2026-08-18
updated: 2026-08-18
slug: obs-2026-08-18-workflow-detail-view-report-button-gated-on-live-report-coun
relevance: high
observed_at: 2026-08-18T15:20:26.195Z
source_context: Adding live report-count gating to workflow detail view
---

# ⭐ Observation: Workflow detail View report button gated on live report count

In cape-frontend, StatusDetail.svelte's "View report" button no longer requires workflowRun.state === 'success'. New src/lib/report.ts exports getReportCount(baseUrl, sampleId) which GETs /report/get?sampleId= via the authed capi client and counts entries with a usable body. fetchData() fetches the count each refresh (best-effort, non-fatal); since the 30s interval refreshes running/queued runs, reports landing mid-run surface immediately. Button shows when reportCount > 0. Badge "(N)" is shown only for N >= 2 to avoid noise on a single report. Button group order: Halt renders first, View report after, so View report is rightmost when both are visible.

*Relevance: high*
*Context: Adding live report-count gating to workflow detail view*
*Tags: frontend workflow reports svelte*

---
*Observed: 2026-08-18T15:20:26.195Z*
