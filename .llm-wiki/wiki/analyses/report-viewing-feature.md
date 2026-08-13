# Report Viewing Feature

The Report tab lists every generated analysis report for a sample and renders each
one inline. Component: `src/lib/components/Report/Report.svelte`.

## Flow

1. User enters a sample ID and clicks Load Reports (or presses Enter). The
   sample ID can also be supplied via the `sampleId` URL query parameter, so a
   refreshed page or a shared link (`?tab=report&sampleId=...`) reproduces the
   same reports. `+page.svelte` reads the param and passes it as
   `initialSampleId`; a user-initiated load reflects the sample back into the URL
   via the `onSampleLoad` callback.
2. Component requests all available reports from the CAPE API
   (`GET /report/get?sampleId=...`). The response is a `{ reportId: html }` map;
   an empty object means no reports exist yet. The initial load is cancelable.
3. Each report renders in its own accordion card (`details`/`summary`), all
   expanded by default and individually collapsible. The card heading is taken
   from the report document's `<title>` (falling back to a readable form of the
   report id). Report HTML is embedded in a per-report `iframe` with
   `sandbox="allow-same-origin"` (no `allow-scripts`), so the report cannot run
   scripts, submit forms, or navigate the parent, while still being same-origin
   enough for the parent to measure it.
4. Iframes are auto-sized to their content height on load (and on window resize)
   with `scrolling="no"` and no border, so a report reads as part of the card
   rather than a scrollable inner frame - the outer page scrolls, not the iframe.

## Refresh and auto-refresh

Reports are generated asynchronously server-side, so the tab mirrors the workflow
pages' polling UX:

- After a load, a manual Refresh button (workflow-styled) re-fetches the loaded
  sample. It targets `loadedSampleId`, independent of what the user is typing.
- While a sample is loaded, the tab auto-refreshes every 30s (with an
  "Auto-refreshes every 30s" indicator) regardless of whether reports already
  exist, since more reports can be generated over time.
- Refreshes only reassign the reports map when the payload actually changed
  (`reportsEqual`), so unchanged iframes are not reloaded and do not flicker.
- Per-report expand/collapse state (`expandedState`, keyed by report id) is
  preserved across refreshes: a background refresh never re-expands a report the
  user collapsed, and newly arrived reports default to expanded.

## Request-state handling

The initial load uses request-scoped state (a single `activeRequest` object plus
`submittedSampleId`) rather than shared loading flags, so overlapping loads do not
clobber each other:

- Only the current request may write report data, show non-cancel errors, or clear
  submitted state.
- A stale cancelled request cannot reset the UI for a newer active request.
- Button cycles: "Loading Reports..." (disabled) -> editing to a new sample ID
  re-enables "Load Reports" -> clicking cancels the old request and starts the new
  loading cycle.

Manual and auto refreshes run on a separate, non-cancelable path guarded by an
`isRefreshing` flag and fail quietly (console only) to avoid disrupting the view.

## Empty and pre-search states

Both the pre-search state (nothing loaded yet) and the loaded-but-empty state
(sample has no reports) render the same dashed-border placeholder card for visual
continuity, with distinct wording so it is clear which is which:

- Before any load: "Enter a sample ID and load reports to get started".
- After a load with no reports: "No reports available at this time".

## Related

- [[syntheses/cape-frontend-architecture-overview]]
- [[entities/cape-api]]
