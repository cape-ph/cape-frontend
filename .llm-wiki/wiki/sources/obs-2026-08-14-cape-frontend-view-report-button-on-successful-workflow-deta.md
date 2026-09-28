---
type: source
title: "Observation: CAPE frontend: View report button on successful workflow detail -> report tab by --sample"
tags:
  - cape
  - frontend
  - workflow
  - report
  - status-detail
  - svelte
  - navigation
status: observation
created: 2026-08-14
updated: 2026-08-14
slug: obs-2026-08-14-cape-frontend-view-report-button-on-successful-workflow-deta
relevance: medium
observed_at: 2026-08-14T18:51:32.040Z
source_context: Adding a View report button to the workflow detail page for successful runs
---

# 🔍 Observation: CAPE frontend: View report button on successful workflow detail -> report tab by --sample

Added a "View report" button to the CAPE frontend workflow detail page (src/lib/components/Status/StatusDetail.svelte). It renders in the same header action slot as the Halt button, but only when workflowRun.state === 'success' and a sample id is derivable. Styled emerald (bg-emerald-600) to match the success state color.

Sample id is derived from the run's conf.pipelineConfigs via a new deriveSampleId() helper that scans each stage's nextflowOptions for a non-empty string '--sample' value (the bactopia ONT stage carries it). Exposed as reactive const reportSampleId = $derived(deriveSampleId(pipelineConfigs)). Button hidden when no sample id (graceful fallback, not a guess from S3 paths).

New optional prop onViewReport?: (sampleId: string) => void on StatusDetail. Wired in src/routes/+page.svelte: handleViewReport(sampleId) sets activeKey='report', selectedSampleId=sampleId, and goto(/?tab=report&sampleId=...). Report.svelte already auto-loads via its initialSampleId $effect (tracks lastAutoloaded to avoid retrigger), so navigation lands on the loaded report.

Works for both demo auto-run and manual submissions that set --sample. Validated: format/lint/check clean, 47/47 tests pass. Not tested against live data.

*Relevance: medium*
*Context: Adding a View report button to the workflow detail page for successful runs*
*Tags: cape frontend workflow report status-detail svelte navigation*

---
*Observed: 2026-08-14T18:51:32.040Z*
