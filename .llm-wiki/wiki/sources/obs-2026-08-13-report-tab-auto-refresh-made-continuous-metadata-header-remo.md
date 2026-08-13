---
type: source
title: "Observation: Report tab auto-refresh made continuous; Metadata header removed"
tags:
  - frontend
  - svelte
  - report
  - auto-refresh
status: observation
created: 2026-08-13
updated: 2026-08-13
slug: obs-2026-08-13-report-tab-auto-refresh-made-continuous-metadata-header-remo
relevance: medium
observed_at: 2026-08-13T18:47:27.595Z
source_context: cape-frontend Report tab refinement
---

# 🔍 Observation: Report tab auto-refresh made continuous; Metadata header removed

Refined the cape-frontend Report tab (src/lib/components/Report/Report.svelte): auto-refresh now polls every 30s for as long as a sample is loaded (autoRefreshing = hasLoaded && loadedSampleId !== null), not only when there are zero reports, so additional reports generated over time load in. The "Auto-refreshes every 30s" indicator now always shows once loaded. Flicker-free (reportsEqual guard skips reassigning the reports map when unchanged) and expand/collapse preservation (expandedState keyed by report id) already covered this: refreshes merge new reports as expanded while keeping existing reports' user-set collapse state. Also removed the "Metadata" h3 header above the sampleId input as clutter. 42 tests pass, lint/check clean.

*Relevance: medium*
*Context: cape-frontend Report tab refinement*
*Tags: frontend svelte report auto-refresh*

---
*Observed: 2026-08-13T18:47:27.595Z*
