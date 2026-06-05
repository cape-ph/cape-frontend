# NOTES.md

**Purpose**: Persistent context for AI assistant continuity across sessions. This file tracks work done, pending tasks, lessons learned, and current state to enable seamless handoff between sessions.

**Maintained by**: AI assistant (Claude Code)  
**Visibility**: PUBLIC - no secrets or private information

---

## Current Project State

### Last Updated

2026-06-05 (Workflow submission fully operational - backend CORS resolved)

### Active Branch

`19-use-jsonschema-from-pipelineprofile` - JSON Schema-based workflow form generation with validation and review remediation

### Recent Work Completed

**IMPORTANT**: When making code changes, always update relevant `notes/*.md` documentation
files in the same commit to prevent contextual drift. See AGENTS.md "Documentation
Maintenance" section for full guidelines.

#### Documentation and Workflow Improvements (2026-06-05) ✅

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
