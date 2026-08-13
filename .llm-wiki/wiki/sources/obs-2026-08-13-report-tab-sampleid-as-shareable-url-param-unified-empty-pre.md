---
type: source
title: "Observation: Report tab sampleId as shareable URL param; unified empty/pre-search placeholder"
tags:
  - frontend
  - svelte
  - report
  - url-state
  - sveltekit
status: observation
created: 2026-08-13
updated: 2026-08-13
slug: obs-2026-08-13-report-tab-sampleid-as-shareable-url-param-unified-empty-pre
relevance: medium
observed_at: 2026-08-13T18:57:01.660Z
source_context: "cape-frontend Report tab: URL sampleId param + shared placeholder styling"
---

# 🔍 Observation: Report tab sampleId as shareable URL param; unified empty/pre-search placeholder

cape-frontend Report tab now supports a shareable/refreshable sampleId via the URL query param. src/routes/+page.svelte reads params.get('sampleId') when activeKey==='report' into selectedSampleId, passes it as Report's initialSampleId prop, and provides onSampleLoad=handleReportSampleLoad which goto()s /?tab=report&sampleId=<encoded> on a user-initiated load. Report.svelte refactored onLoad into onLoad (validates input) + loadSample(target, {syncUrl}); a $effect watches initialSampleId and auto-loads distinct values (guarded by lastAutoloaded to avoid retrigger on echoed URL or failed fetch), skipping the URL sync since the param is already present. Also unified the pre-search placeholder with the empty-state card via a {#snippet placeholder(message)}: pre-search text "Enter a sample ID and load reports to get started", empty text "No reports available at this time", both in the same dashed-border card. 45 tests pass (added 3 Report tests: pre-search placeholder, initialSampleId auto-load, onSampleLoad URL sync). Verified in Chrome: direct ?sampleId link auto-loads; manual load updates URL; console clean.

*Relevance: medium*
*Context: cape-frontend Report tab: URL sampleId param + shared placeholder styling*
*Tags: frontend svelte report url-state sveltekit*

---
*Observed: 2026-08-13T18:57:01.660Z*
