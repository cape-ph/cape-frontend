# NOTES.md

**Purpose**: Persistent context for AI assistant continuity across sessions. This file tracks work done, pending tasks, lessons learned, and current state to enable seamless handoff between sessions.

**Maintained by**: AI assistant (Claude Code)  
**Visibility**: PUBLIC - no secrets or private information

---

## Current Project State

### Last Updated

2026-06-05 (Workflow management consolidated into unified "Workflows" page - Submit tab removed from navigation)

### Active Branch

`19-use-jsonschema-from-pipelineprofile` - JSON Schema-based workflow form generation with validation and review remediation

### Recent Work Completed

**IMPORTANT**: When making code changes, always update relevant `notes/*.md` documentation
files in the same commit to prevent contextual drift. See AGENTS.md "Documentation
Maintenance" section for full guidelines.

#### Navigation Consolidation (2026-06-05) ✅

- **Goal**: Consolidate workflow management into a single "Workflows" page to simplify navigation and create a central hub for both submitting and monitoring workflows
- **UX rationale**: Having Submit as a separate top-level tab was redundant when the Status page could handle both functions - "Submit Workflow" button on the Workflows page is sufficient for starting workflows
- **Changes made**:
    - Renamed "Status" tab to "Workflows" in main navigation
    - Removed "Submit" tab from main navigation (3 tabs now: Upload, Workflows, Report)
    - Updated page routing: workflows view supports 3 states (list, submit, detail)
    - "Submit Workflow" button navigates to inline submission form within Workflows page
    - Updated page header from "Workflow Status" to "Workflows"
    - Updated subtitle to "Submit and monitor your workflows" (emphasizes dual purpose)
- **Benefits**:
    - Cleaner, simpler navigation (3 tabs instead of 4)
    - Workflows page is now the single source of truth for all workflow operations
    - More intuitive UX - users stay in Workflows context for both submission and monitoring
    - Submit form still fully accessible via prominent "Submit Workflow" button
- **Validation**:
    - `npm run format` ✅
    - `npm run lint` ✅
    - `npm run check` ✅ (zero errors)
    - Browser testing: navigation works correctly, Submit button opens inline form, clicking tabs resets workflow view state ✅
- **Status**: Navigation consolidation complete and production-ready ✅

#### Post-Submission Navigation to Detail View (2026-06-05) ✅

- **Goal**: After successful workflow submission, automatically navigate user to the detail view of the newly submitted run
- **UX rationale**: Users should immediately see their workflow running after submission rather than having to manually navigate to the list and click "View details"
- **Changes made**:
    - Added `onNavigateToDetail` callback prop to `Submit.svelte` (optional callback receives dagId and dagRunId)
    - Updated success toast message from "View status in the Status tab" to "Redirecting to workflow details..."
    - Invokes `onNavigateToDetail(dagId, dagRunId)` after successful submission
    - Wired callback in `+page.svelte` to call existing `handleSelectRun` function (sets view to detail and selected run IDs)
- **Smoke test results** (real API, submitted workflow with dummy "asdf" parameters):
    1. ✅ **Submission works**: Successfully POSTed to `/api/v1/dags/{dagId}/dagRuns` endpoint
    2. ✅ **Cookie storage works**: `workflow_runs` cookie correctly stores `[{dagId, dagRunId, submittedAt}]`
    3. ✅ **Auto-navigation works**: User redirected to detail view immediately after submission
    4. ✅ **Detail view displays correctly**: Shows workflow name, run ID, state ("Running"), task instances table
    5. ✅ **Detail view refreshes**: Auto-refresh every 10 seconds fetches updated state from API
    6. ✅ **List view shows submitted run**: "Back to workflow list" navigates to list view, submitted workflow visible with state "running"
- **Example workflow submitted**:
    - DAG: `bactopia_and_kraken2_v3_2_0_deploy_test`
    - Run ID: `manual__2026-06-05T19:15:24.632851+00:00`
    - State: Running (one task "Up_for_retry" as expected with invalid parameters)
- **Validation**:
    - `npm run format` ✅
    - `npm run lint` ✅
    - `npm run check` ✅
    - Real API smoke test ✅ (all 6 requirements verified)
- **Status**: Post-submission navigation complete and production-ready ✅

#### Task Progress Display Fix (2026-06-05) ✅

- **Problem**: Workflow cards in list view showed task count (e.g., "/ 4") but no progress bar or completed/failed counts, despite API returning task instances correctly
- **Root cause**: Svelte 5 reactivity issue - `$state(new Map())` doesn't automatically track mutations like `.set()` calls on the Map
- **Investigation**:
    - Task instances API (`/workflows/run/taskinstances`) returning data correctly (4 tasks)
    - `taskInstancesMap.set(key, taskInstances)` was being called and data stored
    - BUT: component wasn't re-rendering when map was mutated
    - Timing confirmed: tasks stored AFTER initial render, but no reactivity trigger
- **Solution**: Use `SvelteMap` from `svelte/reactivity` instead of plain `Map`
    - `SvelteMap` is Svelte's reactive Map implementation that auto-tracks mutations
    - Changed `const taskInstancesMap = $state(new Map())` to `let taskInstancesMap = new SvelteMap()`
    - `SvelteMap` is inherently reactive, no `$state()` wrapper needed
    - Removed all manual reassignments (`taskInstancesMap = new Map(taskInstancesMap)`) - no longer necessary
- **Changes made**:
    - `Status.svelte`: Import `SvelteMap` from `svelte/reactivity`
    - `Status.svelte`: Change `taskInstancesMap` from `$state(new Map())` to `new SvelteMap()`
    - All `.set()` calls now automatically trigger reactivity
- **Result**: Task progress now displays correctly in list view
    - Shows "Tasks: ✓ 0 / 4" with completed count
    - Shows "0%" completion percentage
    - Shows tri-color segmented progress bar (green/red/gray)
    - Updates automatically when tasks complete
- **Validation**:
    - `npm run format` ✅
    - `npm run lint` ✅ (no `svelte/prefer-svelte-reactivity` or `svelte/no-unnecessary-state-wrap` errors)
    - `npm run check` ✅
    - Browser testing: Task progress displays immediately after API call ✅
- **Status**: Task progress display fix complete and production-ready ✅

#### Production Readiness Improvements (2026-06-05) ✅

- **Goal**: Prepare workflow monitoring for production by removing dev-only features and improving UX
- **Changes made**:
    1. **Removed mock data system** (dev-only feature no longer needed):
        - Removed mock data imports from `Status.svelte` and `StatusDetail.svelte`
        - Removed `useMockData` prop and bindable state from all components
        - Removed `loadMockData()`, `clearMockData()`, `toggleMockData()` functions
        - Removed mock toggle button from UI (was shown only in dev mode on localhost)
        - Removed `isDev` check and related logic
        - All components now use real API exclusively
    2. **Changed auto-refresh interval**:
        - Increased from 10 seconds to 30 seconds for list view (less aggressive polling)
        - Detail view remains at 5 seconds (more frequent updates for active workflow)
        - Updated subtitle text: "Running workflows refresh automatically every 30 seconds"
    3. **Added manual refresh button**:
        - Grey bubble button design (subtle, not distracting)
        - Positioned to left of "Submit Workflow" button
        - Icon: circular arrow refresh icon
        - Shows loading state during refresh:
            - Button disabled while refreshing
            - Text changes from "Refresh" to "Refreshing..."
            - Icon animates with spin animation
        - Provides visual feedback for both manual and automatic refreshes
        - Users can see when refresh is happening (reassuring indicator)
- **Benefits**:
    - Cleaner production code without dev-only mock data complexity
    - More reasonable API polling rate (30s vs 10s)
    - Better user control and feedback for refresh operations
    - Improved UX with visible refresh indicator
- **Validation**:
    - `npm run format` ✅
    - `npm run lint` ✅
    - `npm run check` ✅
    - Browser testing:
        - Mock toggle button removed ✅
        - Refresh button visible and functional ✅
        - Loading state displays correctly (disabled + "Refreshing..." + spin) ✅
        - Subtitle shows "30 seconds" ✅
        - Real API calls working ✅
- **Status**: Production readiness improvements complete ✅

#### Browser History Navigation (2026-06-05) ✅

- **Goal**: Enable browser back/forward buttons to work naturally when navigating between tabs and workflow views
- **Problem**: All navigation was client-side state changes without URL updates, so back button didn't work
- **Solution**: Integrate SvelteKit's `goto()` and URL query parameters
    - Import `goto` from `$app/navigation`, `page` from `$app/stores`, `resolve` from `$app/paths`
    - Subscribe to `page.url.searchParams` on mount to restore state from URL
    - Call `goto(resolve('/?tab=...'), { replaceState: false })` on every navigation action
    - Use `replaceState: false` to add entries to browser history (enables back button)
    - Type query strings as `as \`/?${string}\`` to satisfy SvelteKit's route typing
- **URL patterns**:
    - Upload tab: `/?tab=upload`
    - Workflows list: `/?tab=workflows`
    - Workflows submit: `/?tab=workflows&view=submit`
    - Workflows detail: `/?tab=workflows&view=detail&dagId=...&dagRunId=...`
    - Report tab: `/?tab=report`
- **Changes made**:
    - `+page.svelte`: Added `onMount` subscription to sync URL params to component state
    - `+page.svelte`: Updated all navigation functions to call `goto()` with query params
    - `onSelect()`: Tab switching updates URL
    - `handleSelectRun()`: Detail view updates URL with dagId and dagRunId
    - `handleBackToList()`: List view updates URL
    - `handleNavigateToSubmit()`: Submit view updates URL
- **Button sizing improvements**:
    - Changed "Submit Workflow" button text to "Submit" (clearer in context of Workflows page)
    - Matched button sizing: both Refresh and Submit buttons use `px-3 py-2 text-sm` (same height: 38.76px)
    - Both buttons now visually balanced and consistent
- **Back button behavior**:
    - ✅ Upload tab → Workflows tab → Back → Upload tab
    - ✅ Workflows list → Submit view → Back → Workflows list
    - ✅ Workflows list → Detail view → Back → Workflows list
    - ✅ Detail view → Submit view → Back → Detail view (any navigation sequence)
- **Validation**:
    - `npm run format` ✅
    - `npm run lint` ✅ (all `goto()` calls use `resolve()`)
    - `npm run check` ✅
    - Browser testing:
        - Back button navigation works correctly ✅
        - Forward button works ✅
        - Page refresh restores state from URL ✅
        - Direct URL access works ✅
        - Button sizes match (38.76px height) ✅
        - "Submit" button label is concise ✅
- **Status**: Browser history navigation complete and production-ready ✅

#### Workflow Status Monitoring Implementation (2026-06-05) ✅

- **Goal**: Build complete workflow status tracking system for users to monitor submitted workflows
- **Implementation scope**: Cookie storage, reactive state, API client, three UI views (list, detail, halt modal), UX enhancements, mock data support
- **Components created**:
    - `src/lib/workflowStatus.ts`: API client with 4 endpoints (getWorkflowRun, getTaskInstances, getWorkflowTasks, haltWorkflow)
    - `src/lib/workflowRunsStorage.ts`: Cookie-based persistence (90-day retention, 5 functions)
    - `src/lib/workflowRuns.svelte.ts`: Reactive state management using SvelteMap (7 functions)
    - `src/lib/components/Status/Status.svelte`: List view with auto-refresh every 10s, mock data toggle (dev only)
    - `src/lib/components/Status/StatusDetail.svelte`: Detail view with task instances table, auto-refresh every 5s, mock data support
    - `src/lib/components/Status/WorkflowRunCard.svelte`: Individual workflow card with enhanced UX
    - `src/lib/components/Status/HaltWorkflowModal.svelte`: Confirmation modal with optional note field
    - `src/lib/mockWorkflowData.ts`: Comprehensive mock data (4 workflows, 3 task sets, example responses)
- **Integration points**:
    - Updated `Submit.svelte` to store workflow runs on successful submission (imports `addWorkflowRun`, `addStoredRun`)
    - Added Status tab to main navigation in `+page.svelte` (4th tab after Upload/Submit/Report)
    - Integrated list/detail view routing and halt modal state management
    - Mock data mode shared between Status list and detail views via bindable prop
- **Design improvements** (from @designer consultation):
    - High-contrast professional state colors (indigo/emerald/rose) with icons for accessibility
    - Tri-color segmented progress bar (green for completed, red for failed, gray for pending)
    - Left border accent for workflows needing attention (red for failures)
    - Enhanced empty state with icon, heading, "Submit Your First Workflow" button
    - Staggered card animations (50ms delay per card)
    - Hover effects, transitions, focus rings for accessibility
    - Auto-refresh indicator shows "updating..." vs "10s"
    - Large percentage display next to task counts
    - Monospace font for timestamps, proper aria-labels throughout
- **UX enhancements** (final polish):
    - **Submit Workflow button**: Floating action button in header with plus icon, navigates to Submit tab
    - **Empty state**: Updated with direct call-to-action button linking to Submit page
    - **Unavailable workflows section**: Collapsible section with count badge, "Clear All" button
    - **Auto-pruning**: Unavailable workflows automatically removed after 30 days
    - **Mock data toggle**: Dev-only button (🎭 Mock ON/OFF) for visual testing without API calls
    - **Clean API behavior**: Mock mode prevents all API calls and polling intervals
- **Testing**:
    - Unit tests for storage utilities (`workflowRunsStorage.test.ts`): 12 tests covering parse/write/add/remove/clear with edge cases
    - Unit tests for reactive state (`workflowRuns.svelte.test.ts`): 7 tests covering stored array updates, live status map, duplicate prevention
    - All 40 tests pass ✅
    - **Comprehensive browser testing with mock data**:
        - List view displays 4 workflows (running, queued, success, failed) with correct colors and progress bars ✅
        - Detail view shows task instances table with 5 tasks in various states ✅
        - Halt Workflow modal displays with warning text and optional note field ✅
        - Submit Workflow button navigation works correctly ✅
        - Unavailable workflows section collapses/expands correctly ✅
        - Mock data toggle enables/disables without API calls ✅
        - **Zero console errors** when using mock data (only expected CORS errors from initial cookie workflow before mock mode enabled) ✅
- **Documentation updates**:
    - `notes/04-data-types.md`: Added 8 new types (WorkflowRunState, WorkflowRun, TaskInstance, StoredWorkflowRun, WorkflowRunStatus, TaskInstancesResponse, WorkflowTask)
    - `notes/03-api-endpoints.md`: Added 4 workflow status endpoints (GET /workflows/run, GET /workflows/run/taskinstances, GET /workflows/tasks, PATCH /workflows/halt) with full request/response examples
    - `notes/02-architecture.md`: Added "Workflow Status Monitoring Flow" section, updated state management to include workflowRuns and cookie persistence
- **Validation**:
    - `npm run format` ✅
    - `npm run lint` ✅
    - `npm run check` ✅ (zero errors, zero warnings)
    - All tests pass ✅
- **Browser verification** (comprehensive final test):
    - Status tab renders correctly in navigation ✅
    - Empty state shows "Submit Your First Workflow" button ✅
    - Mock data toggle works (dev mode only) ✅
    - List view displays all workflow states with correct styling ✅
    - Detail view shows complete task instances table ✅
    - Halt modal displays with confirmation and note field ✅
    - Submit Workflow button navigates to Submit tab ✅
    - Unavailable workflows section collapses/expands ✅
    - **Console is clean** - zero errors/warnings with mock data ✅
- **Status**: Workflow status monitoring feature **fully polished, comprehensively tested, and production-ready** ✅✅✅

#### Documentation, Workflow Improvements, and Tests (2026-06-05) ✅

- **Enhanced AGENTS.md for AI agents**:
    - Added "Dev Server Management for AI Agents" section with best practices
    - Documented proper background process handling (`nohup`, `pkill -f`)
    - Added server status check commands
    - Removed browser automation section (kept only in global AGENTS.md)
- **Updated API endpoint documentation**:
    - Clarified `/dap/submit` is legacy, `/workflows/trigger` is current
    - Added CORS blocker note to `/workflows/trigger` documentation
    - Removed "preview-only" language from endpoint descriptions
- **Improved session continuity guidance**:
    - Emphasized reading both NOTES.md AND notes/ directory on resume
    - Clarified NOTES.md = working memory, notes/ = knowledge base

#### Enabled Real Workflow Submission (2026-06-05) ✅

- **Problem**: Workflow submissions were in preview-only mode (alert dialog) instead of actually posting to API
- **Solution**: Replaced alert preview with actual `axios.post()` call to workflow trigger endpoint
- **Changes**:
    - Added `axios` import to Submit.svelte
    - Removed `alert()` and preview logic from `onSubmitWorkflow()`
    - Implemented actual POST request: `await axios.post(endpoint, payload)`
    - Changed success message to "Workflow submitted successfully"
    - Updated error handling message from "previewing" to "submitting"
    - Updated UI header text: removed "preview-only" language
    - Enhanced "Advanced Preview" section with collapsible chevron icon
    - Removed validation duplication (consolidated to existing `validateAllStages()`)
- **Test updates**:
    - Added `axios` mock to test imports
    - Replaced `window.alert` spy with `axios.post` spy
    - Changed test to verify actual HTTP POST call with correct endpoint and payload
    - Updated test name to "submits a wrapped payload" (not "previews")
    - Added type assertion for axios mock call parameters
- **Verification**:
    - All lint, format, and type-check validations pass ✅
    - All 21 tests pass ✅
    - Dev server starts successfully ✅
    - Application loads and redirects to Cognito authentication correctly ✅
- **Manual browser testing** (2026-06-05):
    - ✅ Workflow dropdown loads from API successfully
    - ✅ Selected "Bactopia v3.2.0 and Kraken2 (through Bactopia) v3.2.0" workflow
    - ✅ Form dynamically generated 2 stages with 14 total parameters (4 required)
    - ✅ Validation works correctly:
        - Clicking Submit without filling required fields shows inline errors
        - Stage 1 showed "3 errors" badge: --outdir, --ont, --sample
        - Stage 2 showed "1 error" badge: --bactopia
        - Fields marked with `aria-invalid="true"` and error messages displayed
    - ✅ Filled all required fields with test data
    - ✅ Advanced Preview JSON shows correct `pipelineConfigs` wrapper structure
    - ✅ Submit button triggers actual POST to `/workflows/trigger?dagId=...`
    - Network trace shows:
        - GET /workflows [200] - workflows fetched ✅
        - GET /workflows/pipelineprofiles [200] - pipeline profiles fetched ✅
        - OPTIONS /workflows/trigger [403] - CORS preflight **BLOCKED** ❌
        - POST /workflows/trigger [net::ERR_FAILED] - blocked by failed preflight ❌
    - **Payload structure verified**: Correct `pipelineConfigs` array with `pipelineId` and `nextflowOptions` per stage
    - **Root cause identified**: Backend API server missing CORS policy for `/workflows/trigger` endpoint
        - GET requests work fine (no preflight needed for simple requests)
        - POST with JSON body triggers OPTIONS preflight, which returns 403
        - Old `/dap/submit` endpoint worked (per git commit a0ee5fc), so CORS was configured there
        - Frontend code is correct and production-ready
- **Blocked by**: Backend needs to add CORS headers for OPTIONS requests to `/workflows/trigger`
    - Should return `Access-Control-Allow-Origin`, `Access-Control-Allow-Methods`, `Access-Control-Allow-Headers`
    - OPTIONS requests should not require authentication (preflight happens before auth headers sent)
- **Status**: Frontend implementation complete ✅ | Backend CORS configuration required ⏳

#### Workflow Run Storage and State Tests (2026-06-05) ✅

- **Goal**: Add unit tests for workflow run cookie storage utilities and reactive state helpers
- **Storage tests** (`src/lib/workflowRunsStorage.test.ts`):
    - Covered `getStoredWorkflowRuns()` for missing cookie, invalid JSON, non-array, and structurally invalid entries
    - Verified `setStoredWorkflowRuns()` writes encoded JSON with 90-day `max-age`, `path=/`, and `SameSite=Strict`
    - Tested `addWorkflowRun()` prepends new runs and avoids duplicates based on `dagId` + `dagRunId`
    - Tested `removeWorkflowRun()` removes a specific run and is a no-op when the target does not exist
    - Tested `clearAllWorkflowRuns()` sets cookie with `max-age=0` for clearing
    - Implemented minimal `document.cookie` stub that overwrites `workflow_runs` cookie while appending others, to keep parsing predictable
- **Reactive state tests** (`src/lib/workflowRuns.svelte.test.ts`):
    - Covered `getRunKey()` composite key behavior
    - Verified `setStoredRuns()` replaces the stored array and handles empty arrays
    - Verified `addStoredRun()` prepends new runs and prevents duplicates
    - Verified `removeStoredRun()` removes matching runs and is a no-op for non-existent keys
    - Verified `setLiveStatus()` inserts and replaces entries in `SvelteMap` and that `getLiveStatus()` returns the correct status or `undefined`
    - Verified `clearLiveStatus()` resets the map to empty
- **Notes**:
    - Because `workflowRuns` is module-level `$state`, tests must reset both `stored` and `liveStatus` in `beforeEach` to avoid bleed-through
    - Storage tests run in the server workspace (node environment) and provide their own `document` stub; Svelte state tests run in the client workspace

#### Workflow Payload Wrapper for Airflow API (2026-06-05) ✅

- **Problem**: Airflow API requires a configuration object, not a direct array
- **Solution**: Wrapped array payload in an object with `pipelineConfigs` key
- **Changes**:
    - Updated `serializeWorkflow()` return type to `{ pipelineConfigs: unknown[] }`
    - Changed return statement from `return payloadArray` to `return { pipelineConfigs: payloadArray }`
    - Updated alert message to remove "(array format)" label
    - Updated test to parse object and check `pipelineConfigs` property
    - Updated test name to reflect wrapped structure
- **Documentation updates**:
    - `notes/03-api-endpoints.md`: Updated type definition and example with wrapper object
    - `notes/10-workflows-submission-monitoring.md`: Updated payload structure, added wrapper object note
    - `notes/05-functionality.md`: Added full payload example showing wrapper structure
- **Payload transformation**:
    - **Before**: `[{pipelineId: "...", nextflowOptions: {...}}, ...]`
    - **After**: `{pipelineConfigs: [{pipelineId: "...", nextflowOptions: {...}}, ...]}`
- **Verification**:
    - All lint, format, and type-check validations pass ✅
    - All tests pass (21/21) ✅
    - Array order and stage structure preserved within wrapper

#### Strengthened Documentation Requirements (2026-06-04) ✅

- **Problem**: Documentation maintenance section existed in AGENTS.md but was buried at the end and easy to skip
- **Solution**:
    - Moved "Documentation Maintenance" section earlier (right after "Development Workflow")
    - Added ⚠️ CRITICAL REQUIREMENT header to make it unmissable
    - Expanded "Pre-Completion Checklist" to explicitly call out documentation requirements
    - Added "How to Update Documentation" with DO/DON'T guidelines
    - Added mandatory checklist with grep command examples
    - Removed duplicate section at end of file
- **Impact**: Future AI agents (and developers) will see documentation requirements upfront and be reminded in the pre-completion checklist
- **Files Changed**:
    - `AGENTS.md`: Restructured documentation section, expanded requirements, made language mandatory
    - `NOTES.md`: Added this entry and reminder at top of Recent Work

#### Simplified Workflow Submission Payload (2026-06-04) ✅

- **Backend API simplification**:
    - Backend team simplified `/workflows/:dagId/trigger` endpoint to accept ordered array of `{pipelineId, nextflowOptions}` objects
    - Removed need for client-side `submission.encoding` handling and `submission.optionsFieldName` resolution
    - Client now sends straightforward structure: `[{pipelineId: "...", nextflowOptions: {...}}, ...]`
- **Frontend cleanup**:
    - **Completely removed** `getCliOptionsString()` and its helper `quoteCliValue()` from `src/lib/schema.ts`
    - Removed obsolete test for `getCliOptionsString` from `src/lib/schema.test.ts`
    - Removed mock of `getCliOptionsString` from `Submit.svelte.test.ts`
    - Simplified `serializeWorkflow()` in `Submit.svelte` to generate payload directly without encoding logic
- **Documentation updates**:
    - Updated `notes/03-api-endpoints.md` with new `/workflows/trigger` payload structure
    - Updated `notes/04-data-types.md` with clarification that `submission` field is legacy
    - Updated `notes/05-functionality.md` to remove CLI string serialization examples
    - Updated `notes/08-submit-page-walkthrough.md` with archive notice about removed function
    - Updated `notes/09-workflows-api-analysis.md` with backend simplification note
    - Updated `notes/10-workflows-submission-monitoring.md` with new payload examples
    - Updated `notes/11-workflow-submit-ui-design.md` with correct serialization code
    - Updated `notes/12-coding-style-guide.md` to remove `getCliOptionsString` examples
- **Verification**:
    - All lint, format, and type-check validations pass
    - All tests pass (21/21)
    - Browser tested workflow selection and form generation with dev server
    - Advanced Preview shows correct simplified payload structure
    - Submit button enables correctly after workflow selection

#### Submit Page Review Remediation (2026-06-03) ✅

- **Schema utilities extracted**:
    - Added `src/lib/schema.ts` for AJV compile/validate helpers, JSON Schema field extraction, default option generation, validation coercion, and CLI option serialization
    - Added `@apidevtools/json-schema-ref-parser` for maintained local `$ref` dereferencing
    - Kept explicit field extraction logic for Submit rendering and fail-visible handling for unsupported `anyOf`/`oneOf`
- **Submit workflow UX and correctness**:
    - Preserved preview-only alert path
    - Confirmed workflow payload remains an ordered array matching `/workflows/pipelineprofiles`
    - Added request sequencing so stale profile responses cannot overwrite newer workflow selections
    - Cleared old profiles immediately when workflow selection changes
    - Improved form `id`, `name`, labels, error descriptions, readonly field display, and advanced preview treatment
    - Increased light/dark mode contrast for Submit, Navbar, and Menu elements
- **Tests and project health**:
    - Added logic-focused schema tests for field extraction, unsupported schemas, validation coercion, defaults, and CLI quoting
    - Updated Submit tests around behavior: ordered payload shape, stale responses, disabled states, validation clearing, and form accessibility attributes
    - Fixed Vitest config deprecation, Cognito redirect env typo, Navbar Svelte warning, and mobile menu accessible name
    - Removed unused DB scaffold files that imported missing DB dependencies
- **Browser verification**:
    - Verified Submit page in Chrome DevTools with local dev server
    - Used local fake OIDC storage state for UI review because the attached Chrome session was not logged in
    - Verified light mode, dark mode, mobile navigation, workflow selection, required-field validation, error clearing, and preview-only alert payload
    - Fixed browser-only `Buffer is not defined` failure from `@apidevtools/json-schema-ref-parser`
    - Residual console note: Chrome still reports missing `id`/`name` fields on Upload inputs, which is outside this Submit remediation scope

#### Cross-Tab Visual Alignment Follow-up (2026-06-03) ✅

- **Submit polish**:
    - Made readonly const parameter textareas match editable input height, width, text size, and non-resizable behavior
    - Hid readonly textarea scrollbars so immutable fields do not look like a separate control family
    - Added bottom breathing room under the workflow submit action
- **Upload and Report alignment**:
    - Updated page titles, supporting copy, labels, inputs, buttons, and empty/loading text to match the Submit contrast and hierarchy pattern
    - Added stable `id` and `name` attributes to Upload metadata controls and the Report sample ID control
    - Confirmed Chrome no longer reports missing form `id`/`name` issues for the touched forms
- **Validation**:
    - `npm run lint`, `npm run check`, and `npm run test` passed
    - Browser-checked light mode, dark mode, and mobile dark mode across the updated tabs

#### AGENTS.md Development Workflow Guidance (2026-06-02) ✅

- **Added comprehensive section**: "Development Workflow for AI Agents"
- **Continuous validation guidance**:
    - When to run `npm run format`, `npm run lint`, `npm run check`
    - Example workflow: format → lint → check → fix → repeat
- **Testing guidance**:
    - When to run `npm run test:unit` (watch mode) vs `npm run test` (CI mode)
    - Test-driven development flow
- **Local dev server guidance**:
    - When to use `npm run dev` for manual UI testing
    - What to verify: visual appearance, responsive design, accessibility, error states
- **Pre-completion checklist**: All commands to run before marking work complete
- **Troubleshooting guides**: Common lint/type/test errors and how to fix them

#### Lint and Format Errors Fixed (2026-06-02) ✅

- **Root cause**: Incompatible versions of `prettier-plugin-svelte` and `prettier-plugin-tailwindcss`
    - `prettier-plugin-svelte@3.3.3` incompatible with Svelte 5.55.4
    - `prettier-plugin-tailwindcss@0.6.11` had conflicts with svelte plugin v4+
- **Solution**: Upgraded both plugins
    - `prettier-plugin-svelte` → `^4.1.0` (supports Svelte 5.55+)
    - `prettier-plugin-tailwindcss` → `^0.8.0` (compatible with svelte plugin v4)
- **ESLint errors fixed**:
    - Removed unused imports: `axios`, `CircleX`
    - Removed unused variables: `ctx` parameter, `apiCallInfo` object
    - Replaced `any` types with proper `unknown` and type guards
    - Added `resolve()` calls for navigation links (svelte/no-navigation-without-resolve)
    - Changed `Map` to `SvelteMap` for reactive state
    - Added missing `key` to `{#each}` block
- **Result**: Both `npm run lint` and `npm run format` now pass cleanly

#### Workflow Submission with JSON Schema Validation (2026-06-02) ✅ COMPLETE

- **Replaced single pipeline submission with workflow orchestration**:
    - Workflows fetched from `/workflows` endpoint
    - Workflow stages fetched from `/workflows/pipelineprofiles?dagId={dagId}`
    - Preview submission serializes the would-be `/workflows/trigger?dagId={dagId}` array payload
    - Removed old `/dap/pipelineprofile` single-pipeline logic

- **JSON Schema field extraction**:
    - Handles `allOf` composition
    - Resolves local `$ref` values through `@apidevtools/json-schema-ref-parser`
    - Exposes schema properties for dynamic form rendering
    - Fails visibly for `anyOf` and `oneOf` because those need explicit branch-selection UI

- **Client-side validation with AJV 8.18.0**:
    - Draft 2020-12 JSON Schema support
    - Validators compiled per pipeline stage
    - Type coercion (HTML string inputs -> proper types)
    - Validation before submission blocks invalid workflows
    - Priority-based error deduplication (required > type > min/max > enum)

- **Visual error feedback**:
    - Red borders on invalid fields (`border-2 border-red-500`)
    - Error messages in red boxes with X icons
    - Stage header badges showing error count
    - Accessible: `aria-invalid`, `aria-describedby` attributes
    - Errors clear when user corrects field

- **Workflow visualization for non-technical users**:
    - Simple numbered DAG showing pipeline stages in sequence
    - Down arrows between stages
    - Stage names displayed clearly
    - Helps biologists/epidemiologists understand execution flow

- **UX improvements**:
    - All stages expanded by default (`<details open>`)
    - Animated chevron icon for collapsible sections
    - Workflow dropdown disabled until data loaded
    - Gray borders on stage cards for visual structure
    - Form validation runs before submission

- **Code cleanup** ✅:
    - Removed unused functions: `asNumberInputValue()`, `getMin()`, `getMax()`
    - Removed verbose console.log debugging statements
    - Kept error/warning logs for production troubleshooting
    - Updated tests to match new implementation
    - Added `compile` mock to test suite
    - All tests passing (16/16)

- **Files Modified**:
    - `src/lib/schema.ts`: Schema extraction, AJV helpers, option defaults/coercion, CLI serialization
    - `src/lib/pipeline.ts`: API client plus schema helper re-exports
    - `src/lib/components/Submit/Submit.svelte`: Complete workflow orchestration rewrite
    - `src/lib/components/Submit/Submit.svelte.test.ts`: Updated tests for workflows
    - `src/routes/+page.svelte`: Removed unused `bucketURI` prop

#### Documentation Infrastructure (2026-06-02)

- Created comprehensive technical documentation in `notes/` directory:
    - `01-overview.md` - Project overview, tech stack, goals
    - `02-architecture.md` - System architecture, patterns, data flow
    - `03-api-endpoints.md` - Complete API reference with schemas
    - `04-data-types.md` - All TypeScript interfaces and types
    - `05-functionality.md` - Feature implementations and patterns
    - `06-external-interactions.md` - External systems integration
    - `07-user-workflows.md` - User interaction flows
    - `08-submit-page-walkthrough.md` - Detailed Submit page lifecycle trace
    - `README.md` - Documentation index and navigation

- Updated `CLAUDE.md` with:
    - Documentation maintenance requirements
    - When/how to update docs alongside code changes
    - Documentation review checklist
    - Made header generic for multi-agent compatibility

- Created `AGENTS.md` symlink to `CLAUDE.md` for compatibility with other AI coding tools (Cursor, Windsurf, Cline, etc.)

#### API Analysis (2026-06-02)

- Analyzed OpenAPI 3 spec (`ccd-pvsl-capi-api-restapi-fe69d34-capi-dev-oas30.json`)
- Identified 47 total API endpoints
- Documented 7 endpoints currently used by frontend (15% of API):
    - 3 DAP endpoints (pipelines, pipelineprofile, submit)
    - 4 Object Storage endpoints (multipart upload flow)
    - 1 Report endpoint (report generation)
- Identified 40 unused endpoints (85% of API):
    - Workflow orchestration (8 endpoints - not exposed in UI)
    - Storage browsing/crawler/ETL
    - User attribute management
    - DAP logs/status monitoring

#### Schema Understanding

- Traced complete reactive chain from pipeline selection -> schema fetch -> form generation
- Tested live API endpoint: `GET /dap/pipelineprofile?pipeline=Bactopia&version=dev`
- Retrieved actual parametersSchema showing readonly AWS configuration fields
- Confirmed understanding of Svelte 5 `$effect()` triggering profile fetch when pipeline changes

---

## Technical Discoveries

### JSON Schema Resolution Strategy

- **Problem**: JSON Schema uses `allOf`, `$ref`, `$defs`, and sometimes branch
  combinators to compose pipeline parameters
- **Current Solution**: `src/lib/schema.ts`
    - Uses `@apidevtools/json-schema-ref-parser` for maintained local dereferencing
    - Flattens `allOf` properties and required fields for field extraction
    - Keeps AJV as the source of truth for validation
    - Throws `UnsupportedSchemaError` for `anyOf`/`oneOf` because rendering those safely
      requires branch-selection UI

### AJV Configuration for Draft 2020-12

- **Key Settings**:
    ```typescript
    const ajv = new Ajv({
        allErrors: true, // Collect all errors, not just first
        strict: false, // Allow non-strict schema features
        validateSchema: false // Skip meta-schema validation (avoid missing schema errors)
    });
    ```
- Draft 2020-12 meta-schema not bundled with AJV - disabling validation works around this

### Type Coercion for HTML Form Validation

- **Problem**: `<input type="number">` prevents typing non-numeric characters, bypassing validation
- **Solution**: Changed to `<input type="text" inputmode="numeric">` for number fields
    - User can type anything (including "abc")
    - Validation catches type errors
    - Better UX: user sees validation message explaining the error

### Svelte 5 Reactivity with Validation Errors

- **Critical Pattern**: Must create new object reference to trigger reactivity

    ```typescript
    // Wrong - mutates existing object, doesn't trigger updates
    validationErrors[stageId] = errors;

    // Right - creates new object reference
    validationErrors = { ...validationErrors };
    ```

- Applies to all `$state` objects being mutated

### Error Deduplication Strategy

- **Problem**: One invalid value can trigger multiple errors (e.g., "abc" in integer field = type error + minimum value error)
- **Solution**: Use Map keyed by field name, keep highest priority error only
- **Priority**: required > type > min/max > enum > other
- Prevents confusing "2 errors" message when user sees only one field highlighted

### Schema-Driven Form Architecture

The Submit component is **completely dynamic**:

1. User selects a workflow DAG
2. `$effect()` triggers profile loading for the selected `dagId`
3. Fetches ordered `PipelineProfile[]` from `/workflows/pipelineprofiles`
4. `getParameterFields()` extracts fields from each stage schema
5. Template renders form fields based on schema types
6. Serialized payload remains an ordered array, one item per profile
7. No hardcoded pipeline knowledge in frontend

**Key Reactive Chain**:

```
selectedWorkflowDagId (state)
  -> $effect triggers updateWorkflowProfiles()
  -> workflowProfiles (ordered state from API)
  -> profile.fields (from getParameterFields)
  -> Template renders one dynamic form per stage
  -> serializeWorkflow() returns ordered array payload
```

### Validation Gap Identified

**[RESOLVED]** - Client-side validation now implemented using AJV

- Form data validated against JSON Schema before submission
- Validation errors shown inline with visual feedback
- Invalid submissions blocked with error count toast

### API Configuration

- Base URL: `https://api.cape-dev.org/capi-dev`
- Uses self-signed certificate (requires `rejectUnauthorized: false` for testing)
- All endpoints return 502 for invalid pipeline versions (v3.2.0 failed, dev worked)

---

## Architecture Insights

### Svelte 5 Reactivity Patterns

- Uses runes exclusively: `$state()`, `$derived()`, `$effect()`, `$props()`
- Global auth state via reactive module: `src/lib/user.svelte.ts`
- No legacy Svelte 4 patterns (no stores, no `$:` reactive statements)

### Multipart Upload Flow

- 10MB chunk size (configurable)
- Retry logic: 3 attempts per chunk with exponential backoff
- Uses presigned S3 URLs (frontend uploads directly to S3, bypassing API)
- AbortController for cancellation
- Progress tracking per-chunk

### Component Organization

- Co-location: each component has `.svelte`, `.svelte.test.ts`, types, fixtures
- Two Vitest workspaces: client (jsdom) and server (node)
- No shared state between components except global `auth`

---

## Known Issues & Gaps

### Frontend Implementation Gaps

1. **[RESOLVED] No client-side validation** - Implemented with AJV + visual error feedback ✅
2. **[RESOLVED] Workflow submission blocked by CORS** - Backend resolved 2026-06-05 ✅
3. **No form state persistence** - values lost on refresh
4. **No job tracking** - submit and forget, no status monitoring
5. **Report ID hardcoded** - `"bactopia-single-sample-analysis"` not user-configurable
6. **No error recovery for partial uploads** - abort on any error

### Missing Features (API exists but UI doesn't expose)

1. **Workflow status monitoring** - After submission, no tracking of execution
2. **Pipeline logs** - `/dap/logs` endpoint unused
3. **Pipeline status** - `/dap/status` endpoint unused
4. **Storage browsing** - `/objstorage/contents` unused
5. **User management** - `/user/attribute[s]` unused

### Documentation Debt

- API endpoint descriptions all show "N/A" in OpenAPI spec (no summaries)
- No request/response examples in OpenAPI spec
- Error response schemas not documented

---

## Development Environment

### Current Configuration

- Dev server: `http://localhost:3000`
- API: `https://api.cape-dev.org/capi-dev`
- Node.js + npm (no pnpm/yarn/bun)

### Required Environment Variables

```bash
PUBLIC_COGNITO_AUTHORITY=<AWS Cognito authority URL>
PUBLIC_COGNITO_CLIENT_ID=<OAuth client ID>
PUBLIC_COGNITO_REDIRECT_URI=<OAuth callback URL>
# Optional:
PUBLIC_API_BASE=https://api.cape-dev.org/capi-dev  # has default
```

### Test Execution

```bash
npm run test:unit  # Watch mode
npm run test       # CI mode (run once)
```

Two workspaces:

- Client: `*.svelte.test.ts` files, jsdom environment
- Server: `*.test.ts` files (excluding svelte), node environment

---

## Pending Work

### Workflow Submission Fully Operational (2026-06-05) ✅

- [x] **Backend CORS for `/workflows/trigger` endpoint resolved** (2026-06-05)
    - Backend team added proper CORS headers to OPTIONS response
    - OPTIONS preflight now returns 200 with appropriate headers
    - POST requests to `/workflows/trigger` now succeed
    - **Status**: Workflow submission fully operational end-to-end ✅
    - **Tested locally**: Successfully submitted workflow with proper payload structure
    - Complete feature: workflow selection → form generation → validation → submission → success response

### Immediate TODOs

- [x] **Implement client-side validation using existing AJV functions** ✅
- [x] **JSON Schema resolution for allOf/anyOf/oneOf/$ref** ✅
- [x] **Visual error feedback for invalid fields** ✅
- [x] **Workflow visualization for non-technical users** ✅
- [x] **Code review and cleanup** ✅
- [x] **Enable actual workflow submission** ✅ COMPLETE - backend CORS resolved 2026-06-05
- [ ] Add form state persistence (localStorage?)
- [ ] Expose pipeline job status tracking in UI
- [ ] Make report ID user-configurable instead of hardcoded
- [ ] Add error recovery/resume for failed uploads

### Future Enhancements

- [ ] Workflow status monitoring after submission
- [ ] Real-time workflow execution tracking
- [ ] Pipeline logs viewer (leverage `/dap/logs`)
- [ ] Storage browser (leverage `/objstorage/contents`, `/objstorage/crawler`)
- [ ] User profile management (leverage `/user/attribute[s]`)
- [ ] Real-time upload progress (currently per-chunk only)
- [ ] Multi-file upload queue management

### Documentation Tasks

- [ ] Add API endpoint summaries to OpenAPI spec
- [ ] Document error response schemas
- [ ] Add request/response examples to OpenAPI spec
- [ ] Create developer onboarding guide

---

## Lessons Learned

### Working with This Codebase

1. **Documentation is Implementation** - Always update `notes/` docs in same commit as code changes. Documentation drift is technical debt.

2. **Schema First** - Pipeline parameters come from backend JSON Schema. Frontend only knows how to interpret and render schemas, not specific pipeline parameters.

3. **Svelte 5 Reactivity** - `$effect()` is powerful but requires understanding dependency tracking. Effects run when any referenced reactive value changes.

4. **Multipart Upload Complexity** - Streaming + chunking + presigned URLs + retry logic is non-trivial. Don't modify without understanding full flow.

5. **Testing Strategy** - Two workspaces (client/server) require different mocking strategies. Always check which workspace a test runs in.

6. **API Stability** - Dev API uses self-signed certs and some endpoints 502. Always test against live API before assuming code is broken.

### AI Assistant Workflow

1. **Read before Edit** - Always read files referenced in implementation before making changes
2. **Check Tests** - Run tests after changes, update tests when changing behavior
3. **Update Docs** - Documentation maintenance is non-negotiable per CLAUDE.md
4. **Incremental Changes** - Prefer Edit over Write for existing files
5. **Verify Assumptions** - Test API endpoints live when unclear about behavior

---

## Context for Next Session

### Quick Start Commands

```bash
# Start dev server
npm run dev

# Run tests
npm run test:unit

# Test live API endpoint
node -e "const axios=require('axios');const https=require('https');(async()=>{const res=await axios.get('https://api.cape-dev.org/capi-dev/dap/pipelines',{httpsAgent:new https.Agent({rejectUnauthorized:false})});console.log(JSON.stringify(res.data,null,2))})();"
```

### Key Files to Read First

- `src/lib/components/Submit/Submit.svelte` - Schema-driven form generation
- `src/lib/pipeline.ts` - API client and validation (unused validation!)
- `src/lib/mpu.ts` - Multipart upload implementation
- `notes/README.md` - Documentation index

### Current Focus Areas

- Understanding complete application flow (done)
- Identifying used vs unused API endpoints (done)
- Next: Likely implementing validation or exposing more API features

### Questions to Ask User

- Priority for pending work? (validation, workflow UI, logs, storage browser?)
- Should we expose unused API endpoints in UI?
- Timeline for implementing missing features?
- Are there specific user pain points to address?

---

## Session History

### Session 2026-06-02

- **Goal**: Understand codebase, document infrastructure, identify API usage, understand workflows API
- **Completed**:
    - Full documentation suite in `notes/` directory (01-08)
    - API analysis (7 used endpoints vs 40 unused)
    - Schema flow understanding (Submit page reactive chain)
    - Workflows API exploration - tested 3 read-only endpoints
    - Workflows submission/monitoring analysis from real API responses (no execution)
- **Discoveries**:
    - Workflows API exposes Apache Airflow DAGs for multi-stage orchestration
    - `/workflows/pipelineprofiles` returns array of profiles (one per stage)
    - `/workflows/tasks` returns task dependency graph
    - Workflow example: Bactopia → Kraken2 (2-stage bacterial genome analysis)
    - New fields: `uiSchema` (JsonForms layouts), `inherits` (base config)
    - Request body uses pipeline names as keys (not pipelineIds) - unclear mapping
    - `dag_run_id` required for status tracking - must be persisted
    - Mixed parameter encoding (direct fields + nextflowOptions string)
- **Created**:
    - `notes/09-workflows-api-analysis.md` - comprehensive workflow API documentation
    - `notes/10-workflows-submission-monitoring.md` - submission/monitoring flow analysis
    - `scratch/workflows-api-testing.md` - real API response collection
- **Open Questions**:
    - Should UISchema be implemented or ignored for MVP?
    - Resolved later: workflow trigger payload is an ordered array, not a keyed object,
      so no `pipelineId` to request-key mapping is needed.
- **Next**: Design multi-stage form UI and implement workflow selection

### Session 2026-06-02 (UI Design Phase)

- **Goal**: Design user-friendly UI for multi-stage workflow submission
- **Completed**: Created comprehensive UI design document with 3 layout options
- **Recommendation**: Accordion-based layout (Option B)
- **Key Design Principles**:
    - Progressive disclosure (show only what's needed)
    - User-friendly validation (no jargon)
    - Visual workflow overview (hide technical details)
    - Cross-stage parameter hints
    - Accessibility (keyboard + screen reader)
- **Created**: `notes/11-workflow-submit-ui-design.md` - complete UI design with ASCII mockups
- **Next**: Review design with user, begin implementation

### Session 2026-06-02 (Style Guide & Preparation)

- **Goal**: Analyze codebase style, establish coding guidelines before implementation
- **Completed**:
    - Analyzed existing component structure and patterns
    - Extracted style from Prettier/ESLint config
    - Documented Svelte 5 patterns in use
    - Created comprehensive coding style guide
    - Updated CLAUDE.md with code modification principles
- **Created**: `notes/12-coding-style-guide.md` - complete style reference
- **Key Principles Established**:
    1. **Minimal edits**: Change only what's necessary
    2. **Delete stale code**: Remove unused code immediately
    3. **Constrained scope**: Stay within task boundaries
    4. **Preserve working code**: Don't refactor what works
- **Migration Strategy Defined**:
    - Phase 1: Add workflows alongside existing (no breaking changes)
    - Phase 2: Remove old code only when fully migrated
    - Reuse existing form generation logic
    - Add new workflow-specific logic separately
- **Next**: Begin implementation of workflow submission UI

### Session 2026-06-02 (Validation - Visual Improvements)

- **Problem**: Validation errors were not visually prominent enough - white text blended in
- **Solution**: Enhanced visual feedback for validation errors
- **Implemented**:
    - **Red borders on invalid fields**: 2px red border + light red background
    - **Prominent error messages**: Red box with X icon, bold text, padding
    - **Stage header error badges**: Shows "⊗ N error(s)" in red badge on summary line
    - **Stage card highlighting**: Red border around entire stage when errors present
    - **Error deduplication**: When NaN causes multiple errors (type + minimum), only show type error
    - **Error prioritization**: required > type > min/max > enum > other
- **Error Priority Logic**:
    - Groups errors by field to avoid duplicates
    - Example: "abc" in integer field → shows "Must be integer" (not both "Must be integer" and "Must be >= 1")
    - Priority ranking ensures most relevant error is shown
- **Visual Design**:
    - Invalid input: `border-2 border-red-500 bg-red-50`
    - Error message: Red box with SVG X icon, semibold text
    - Stage badge: Red background, rounded pill, positioned on right
    - Visible even when stage is collapsed
- **All tests passing** ✓ (16/16)
- **Result**: Validation errors are now impossible to miss!
- **Goal**: Add client-side validation using JSON Schema before workflow submission
- **Problem 1**: No validation happening - users could submit invalid data
- **Problem 2**: AJV failing to compile validators due to JSON Schema draft version mismatch
- **Root Cause**: Backend schemas use `$schema: "https://json-schema.org/draft/2020-12/schema"` but AJV was trying to validate meta-schema and failing
- **Solution**: Configured AJV to skip meta-schema validation
    - Set `validateSchema: false` in AJV constructor
    - Removed `ajv.validateSchema()` call from `compile()` function
    - Now supports schemas from any draft version (2020-12, draft-07, etc.)
- **Implemented**:
    - **Fixed `validate()` function bug** in `pipeline.ts` - was checking `if (valid)` instead of `if (!valid)`
    - **Validator compilation**: Each pipeline profile gets AJV validator compiled from `parametersSchema`
    - **Type coercion before validation**: HTML inputs return strings, so convert to proper types:
        - Numbers: Convert string to number, validate as NaN if invalid
        - Booleans: Convert to boolean
        - Strings: Pass through
        - Empty values: Omit from validation (let required check catch it)
    - **Validation state tracking**: `validationErrors` state object stores errors per stage per field
    - **Svelte 5 reactivity fix**: Changed from `const` to `let` for state objects, create new object references on update
    - **Pre-submission validation**: `validateAllStages()` runs before submission, blocks if invalid
    - **Real-time error clearing**: Errors cleared when user edits a field
    - **User-friendly error messages**:
        - Required fields: "{field} is required"
        - Min/max: "Must be at least {min}" / "Must be at most {max}"
        - Type errors: "Must be {type}"
        - Enum: "Must be one of: {options}"
    - **UI error display**:
        - Red border on invalid fields (`input-error`, `select-error` classes)
        - Error message displayed below field in red
        - Accessible: `aria-invalid` and `aria-describedby` attributes
        - Error count in toast when validation fails
    - **HTML5 validation attributes**:
        - `required` attribute on required fields
        - `min`/`max` attributes on number inputs
        - `step` attribute (1 for integers, 'any' for floats)
        - `type="number"` for integer/number fields
    - **Debug logging**: Comprehensive console logging for troubleshooting
- **Validation Flow**:
    1. User selects workflow → Profiles fetched → Validators compiled
    2. User fills form
    3. On input change: clear any existing error for that field
    4. On submit: validate all stages against their schemas (with type coercion)
    5. If invalid: show toast + highlight fields + display errors + block submission
    6. If valid: proceed with submission
- **All tests passing** ✓ (16/16)
- **Benefits**: Users get immediate feedback, prevents invalid API calls, matches backend validation
- **Next**: Browser test to verify validation catches empty required fields and type mismatches
- **Goal**: Implement workflow-only submission UI, remove single pipeline support
- **Problems Fixed**:
    1. API parameter was `dagId` not `dag_id`, causing 400 errors
    2. Accordion not rendering (CSS class issue)
    3. Schema resolution missing `allOf` and `$defs` properties
    4. Unnecessary `outputPath` field (captured in stage parameters)
- **Solution**: Complete rewrite of Submit component for workflows only
- **Completed**:
    - **Fixed API call**: Changed `dag_id` parameter to `dagId` in `getWorkflowProfiles()`
    - **Fixed accordion rendering**: Changed from Skeleton UI classes to standard HTML `<details>` with card styling
    - **Implemented JSON Schema resolution**: Added `resolveSchemaRefs()` function
        - Resolves `allOf` references to `$defs`
        - Merges inherited properties with top-level properties
        - Properly handles schema composition
    - **Improved readonly field handling**:
        - Fields with `const` are rendered as readonly text inputs with gray styling
        - Added title tooltip: "This value is managed by the system and cannot be changed"
        - Readonly fields show default values but cannot be edited
    - **Removed unnecessary outputPath**: Each stage has its own `--outdir` parameter
    - **All tests passing** (5/5 workflow tests)
- **Key Features**:
    - Accordion UI with collapsible stages
    - First stage expanded by default
    - Shows parameter count per stage (e.g., "• 7 parameters")
    - Shows total stages in header (e.g., "Workflow Stages (2 stages)")
    - Properly resolves all schema properties including inherited ones
- **Example**: Bactopia workflow now shows:
    - Stage 1: 7 parameters (5 top-level + 2 from $defs)
    - Stage 2: 7 parameters (5 top-level + 2 from $defs)
    - Readonly fields: `--aws_volumes`, `-profile` (shown but not editable)
- **Next**: Test actual workflow submission to API
