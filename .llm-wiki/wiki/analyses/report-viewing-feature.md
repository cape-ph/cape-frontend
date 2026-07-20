# Report Viewing Feature

The Report tab renders generated analysis reports for a sample. Component:
`src/lib/components/Report/Report.svelte`.

## Flow

1. User enters a sample ID and clicks Load Report (or presses Enter).
2. Component requests the report HTML from the CAPE API
   (`GET /report/create?sampleId=...&reportId=...&format=html`). `reportId` is
   currently hardcoded to `bactopia-single-sample-analysis` (a `$props` default,
   also passed explicitly from `+page.svelte`; not user-configurable). Server-side
   report generation can take a while, so the request is cancelable.
3. HTML is rendered inside a sandboxed `iframe` (`sandbox=""`,
   `referrerpolicy="no-referrer"`), so report content cannot run scripts, submit
   forms, or reach the parent page - safe for untrusted HTML.

## Request-state handling

The component uses request-scoped state (a single `activeRequest` object plus
`submittedSampleId`) rather than shared loading flags, so overlapping requests do
not clobber each other:

- Only the current request may write report HTML, show non-cancel errors, or clear
  submitted state.
- A stale cancelled request cannot reset the UI for a newer active request.
- Button cycles: "Loading Report..." (disabled) -> editing to a new sample ID
  re-enables "Load Report" -> clicking cancels the old request and starts the new
  loading cycle.

## Related

- [[syntheses/cape-frontend-architecture-overview]]
- [[entities/cape-api]]
