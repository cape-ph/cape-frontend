---
type: source
title: "Observation: Report iframe sandbox blocked report scripts; added allow-scripts"
tags:
  - frontend
  - report
  - iframe
  - sandbox
  - svelte
  - security
status: observation
created: 2026-08-18
updated: 2026-08-18
slug: obs-2026-08-18-report-iframe-sandbox-blocked-report-scripts-added-allow-scr
relevance: high
observed_at: 2026-08-18T16:05:52.320Z
source_context: Debugging non-interactive buttons in report HTML
---

# ⭐ Observation: Report iframe sandbox blocked report scripts; added allow-scripts

Report.svelte renders each report body via `<iframe srcdoc={report.body}>`. Originally sandbox="allow-same-origin" (no allow-scripts), which silently blocked all report-embedded JavaScript (inline onclick handlers and <script> tags) - so interactive report buttons (e.g. kraken2 report's Relevant/Expanded/Collapsed taxonomy controls) did nothing and no console error was emitted. Fix: changed sandbox to "allow-same-origin allow-scripts" so trusted report HTML runs its own scripts while same-origin height measurement (resizeIframe) still works. Security trade-off: report HTML now has same-origin access to the parent app; acceptable only because report bodies come from the trusted CAPE API. Verified in Chrome DevTools: buttons fire (Collapsed collapsed all 137 details rows).

*Relevance: high*
*Context: Debugging non-interactive buttons in report HTML*
*Tags: frontend report iframe sandbox svelte security*

---
*Observed: 2026-08-18T16:05:52.320Z*
