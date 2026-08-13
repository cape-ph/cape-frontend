---
type: source
title: "Observation: Report tab migrated to /report/get with accordion, refresh, auto-sized iframes"
tags:
  - frontend
  - svelte
  - report
  - iframe
  - api
status: observation
created: 2026-08-13
updated: 2026-08-13
slug: obs-2026-08-13-report-tab-migrated-to-report-get-with-accordion-refresh-aut
relevance: high
observed_at: 2026-08-13T18:39:19.724Z
source_context: cape-frontend Report tab redesign
---

# ⭐ Observation: Report tab migrated to /report/get with accordion, refresh, auto-sized iframes

Rewrote src/lib/components/Report/Report.svelte to use GET /report/get?sampleId= (returns { reportId: html } map) instead of /report/create. Reports render in details/summary accordion cards styled like the workflow pages, all expanded by default. Heading comes from the report document's <title> via DOMParser (no subtitle). Added a workflow-styled manual Refresh button plus 30s auto-refresh while a loaded sample has no reports (with "Auto-refreshes every 30s" indicator); refresh only reassigns the reports map when content changed (reportsEqual) to avoid iframe reload flicker, and per-report expand state (expandedState keyed by report id) is preserved across refreshes with new reports defaulting to expanded. Iframes use sandbox="allow-same-origin" (no allow-scripts) and are auto-sized to contentDocument scrollHeight on load/resize with scrolling="no" and no border so reports read as part of the card and the outer page scrolls. Dropped the reportId prop from +page.svelte. 42 tests pass; lint/check clean.

*Relevance: high*
*Context: cape-frontend Report tab redesign*
*Tags: frontend svelte report iframe api*

---
*Observed: 2026-08-13T18:39:19.724Z*
