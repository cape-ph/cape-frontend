---
type: source
title: "Observation: Report iframe auto-resizes to content via ResizeObserver + measure-from-zero"
tags:
  - frontend
  - report
  - iframe
  - resizeobserver
  - svelte
  - jsdom
  - testing
status: observation
created: 2026-08-18
updated: 2026-08-18
slug: obs-2026-08-18-report-iframe-auto-resizes-to-content-via-resizeobserver-mea
relevance: high
observed_at: 2026-08-18T16:13:18.845Z
source_context: Making report iframe container resize with content
---

# ⭐ Observation: Report iframe auto-resizes to content via ResizeObserver + measure-from-zero

Report.svelte iframes now track content height live. Added a shared ResizeObserver (created in onMount, disconnected in onDestroy) that observes each report iframe's contentDocument.documentElement and body; the callback maps an observed element back to its iframe via entry.target.ownerDocument.defaultView.frameElement (works because sandbox includes allow-same-origin) and calls resizeIframe. Critical fix in resizeIframe: it now sets iframe.style.height='0px' before measuring, then to the measured max(documentElement.scrollHeight, body.scrollHeight). Without the reset, a tall iframe pins documentElement.scrollHeight to its own height (the html element fills the iframe viewport), so the container could grow but never shrink. Reset+set happen in one synchronous task so no intermediate height paints. jsdom lacks ResizeObserver, so a class stub was added to vitest-setup-client.ts via vi.stubGlobal (same pattern as the existing matchMedia mock). Verified in Chrome DevTools: collapse 3063px->1406px, expand ->25429px, no ResizeObserver loop errors.

*Relevance: high*
*Context: Making report iframe container resize with content*
*Tags: frontend report iframe resizeobserver svelte jsdom testing*

---
*Observed: 2026-08-18T16:13:18.845Z*
