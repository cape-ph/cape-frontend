---
type: source
title: "Observation: Mobile nav dropdown reworked: solid elevated panel + backdrop/Escape close"
tags:
  - frontend
  - svelte
  - navbar
  - responsive
  - accessibility
status: observation
created: 2026-08-13
updated: 2026-08-13
slug: obs-2026-08-13-mobile-nav-dropdown-reworked-solid-elevated-panel-backdrop-e
relevance: medium
observed_at: 2026-08-13T19:12:48.648Z
source_context: cape-frontend mobile navigation menu fix
---

# 🔍 Observation: Mobile nav dropdown reworked: solid elevated panel + backdrop/Escape close

Reworked the cape-frontend mobile nav dropdown in src/lib/components/Menu/Menu.svelte. The old mobile menu was an in-flow block with no background, so it blended into and overlapped page content, could be unclickable when overlapping, and could only be dismissed by choosing an option. New behavior: when open, render a click-away backdrop (fixed inset-0 z-40 bg-black/40, aria-label "Close navigation menu") plus a solid elevated panel (#mobile-nav, fixed inset-x-0 top-14 z-50, bg-white dark:bg-surface-900, border + shadow-lg). Added a <svelte:window onkeydown> handler that closes on Escape. Dismissal paths now: the hamburger toggle, backdrop click, Escape, and selecting an option. All md:hidden so desktop is unaffected. Added Menu.svelte.test.ts tests for backdrop-close and Escape-close (47 tests pass). Verified in Chrome at 583px width: panel is solid/full-width under the navbar, backdrop dims content, backdrop click and toggle both close, console clean. Note: Svelte 5 event delegation means programmatic element.click() in devtools does NOT fire the delegated onclick reliably - use the trusted CDP click tool to test.

*Relevance: medium*
*Context: cape-frontend mobile navigation menu fix*
*Tags: frontend svelte navbar responsive accessibility*

---
*Observed: 2026-08-13T19:12:48.648Z*
