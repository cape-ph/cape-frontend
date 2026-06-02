# NOTES.md

**Purpose**: Persistent context for AI assistant continuity across sessions. This file tracks work done, pending tasks, lessons learned, and current state to enable seamless handoff between sessions.

**Maintained by**: AI assistant (Claude Code)  
**Visibility**: PUBLIC - no secrets or private information

---

## Current Project State

### Last Updated

2026-06-02 (AGENTS.md updated with development workflow guidance)

### Active Branch

`19-use-jsonschema-from-pipelineprofile` - JSON Schema-based workflow form generation with validation (COMPLETE)

### Recent Work Completed

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
    - Workflows fetched from `/workflows/workflows` endpoint
    - Workflow stages fetched from `/workflows/pipelineprofiles?dagId={dagId}`
    - Submission endpoint changed to `/workflows/trigger?dagId={dagId}` with array payload
    - Removed old `/dap/pipelineprofile` single-pipeline logic

- **Custom JSON Schema resolver** (no external dependencies):
    - Handles `allOf`, `anyOf`, `oneOf` combinators
    - Resolves `$ref` to `$defs` (local references only)
    - Recursive merging with depth limit protection
    - Exposes ALL schema properties including nested definitions

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
    - `src/lib/pipeline.ts`: Fixed AJV config for draft 2020-12, fixed validation bug
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

- **Problem**: JSON Schema uses `allOf`, `anyOf`, `oneOf`, `$ref`, and `$defs` to compose schemas
- **Initial Approach**: Tried external libraries (`@json-schema-tools/dereferencer`, `json-schema-resolver`) - both had issues
- **Final Solution**: Custom synchronous resolver in Submit.svelte
    - Recursively walks schema tree
    - Merges properties from combinators
    - Resolves local `$ref` to `$defs`
    - No external dependencies, ~80 lines of code
    - Handles all schemas in CAPE API

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

1. User selects pipeline name + version
2. `$effect()` watches derived `pipeline` object and triggers `updateProfile()`
3. Fetches `PipelineProfile` containing `parametersSchema` (JSON Schema)
4. `getParameterFields()` introspects schema and creates `ParameterField[]`
5. Template renders form fields based on schema types
6. No hardcoded pipeline knowledge in frontend

**Key Reactive Chain**:

```
pipelineName + pipelineVersion (state)
  -> pipeline (derived)
  -> $effect triggers updateProfile()
  -> profile (state from API)
  -> parameterFields (derived via getParameterFields)
  -> Template renders dynamic form
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

1. **[RESOLVED] No client-side validation** - Now implemented with AJV + visual error feedback
2. **No form state persistence** - values lost on refresh
3. **No job tracking** - submit and forget, no status monitoring
4. **Report ID hardcoded** - `"bactopia-single-sample-analysis"` not user-configurable
5. **No error recovery for partial uploads** - abort on any error
6. **Workflow submission not active** - Preview mode only (axios.post commented out)

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
API_BASE=https://api.cape-dev.org/capi-dev  # has default
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

### Immediate TODOs

- [x] **Implement client-side validation using existing AJV functions** ✅
- [x] **JSON Schema resolution for allOf/anyOf/oneOf/$ref** ✅
- [x] **Visual error feedback for invalid fields** ✅
- [x] **Workflow visualization for non-technical users** ✅
- [x] **Code review and cleanup** ✅
- [ ] **Enable actual workflow submission** (uncomment axios.post in onSubmitWorkflow)
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
    - How to map `pipelineId` → request key name? Backend should provide `requestKey` field?
    - Should UISchema be implemented or ignored for MVP?
- **Next**: Design multi-stage form UI, implement workflow selection, clarify requestKey mapping

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
