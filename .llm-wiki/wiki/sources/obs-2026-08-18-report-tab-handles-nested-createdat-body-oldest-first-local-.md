---
type: source
title: "Observation: Report tab handles nested {createdAt, body}; oldest-first + local-time timestamp"
tags:
  - frontend
  - svelte
  - report
  - cape-api
  - timezone
  - sorting
status: observation
created: 2026-08-18
updated: 2026-08-18
slug: obs-2026-08-18-report-tab-handles-nested-createdat-body-oldest-first-local-
relevance: medium
observed_at: 2026-08-18T15:01:24.277Z
source_context: "cape-frontend Report tab: new /report/get shape with createdAt"
---

# 🔍 Observation: Report tab handles nested {createdAt, body}; oldest-first + local-time timestamp

cape-frontend Report tab updated for the new /report/get shape. The endpoint changed from { reportId: html } to { reportId: { createdAt: ISO, body: html } }. In src/lib/components/Report/Report.svelte: added a Report type { createdAt, body }; reports state is now Record<string, Report>; normalizeReports parses the nested object (keeps entries with a string body, tolerates a legacy plain-string value as body with empty createdAt); reportsEqual compares body and createdAt; reportEntries is sorted oldest-first by createdAt via a createdAtTime helper (Date.parse, unparseable -> Infinity so it sorts last); formatCreatedAt renders createdAt in the browser's local timezone using Intl.DateTimeFormat(undefined, { year, month:'short', day, hour, minute:'2-digit', timeZoneName:'short' }). The accordion summary now shows the title left (flex-1) and the formatted timestamp on the right ({@const created} + {#if created} span). iframe srcdoc uses report.body. User clarified ordering should be OLDEST at top. Verified against live API (rabits 18:36:32Z older shown above bactopia 19:06:04Z newer; rendered "Aug 13, 2026, 2:36 PM EDT" in America/New_York). 48 tests pass (added oldest-first + local-time render test), lint/check clean, console clean.

*Relevance: medium*
*Context: cape-frontend Report tab: new /report/get shape with createdAt*
*Tags: frontend svelte report cape-api timezone sorting*

---
*Observed: 2026-08-18T15:01:24.277Z*
