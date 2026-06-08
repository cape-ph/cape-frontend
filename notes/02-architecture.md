# Architecture

## High-Level Structure

```
src/
├── lib/                      # Shared libraries and utilities
│   ├── components/          # Reusable Svelte components
│   ├── server/              # Server-side code (database, etc.)
│   ├── cognito.ts           # Authentication configuration
│   ├── pipeline.ts          # Pipeline API client + validation
│   ├── mpu.ts               # Multipart upload logic
│   ├── stream.ts            # TAR streaming utilities
│   ├── user.svelte.ts       # Global auth state (Svelte 5 runes)
│   ├── toaster.ts           # Toast notification system
│   └── env.ts               # Environment variable exports
├── routes/                   # SvelteKit routes (file-based routing)
│   ├── +layout.svelte       # Root layout
│   ├── +page.svelte         # Main application (three tabs)
│   └── auth/callback/       # OAuth callback handler
└── themes/                   # Theme configuration

```

## Key Architectural Patterns

### 1. Schema-Driven Form Generation

The Submit component dynamically generates form fields from JSON Schema definitions retrieved from the CAPE API. This is the core architectural pattern enabling extensibility:

**Flow**:

1. User selects pipeline name and version
2. Frontend fetches `PipelineProfile` from API (includes `parametersSchema`)
3. Component introspects schema properties and generates appropriate form inputs
4. User fills form, values validated against schema via AJV
5. Validated data serialized and submitted to API

**Why**: New pipelines can be added on the backend without requiring frontend code changes. The schema serves as a contract between frontend and backend.

### 2. Chunked Streaming Architecture

Large file uploads use a streaming architecture to avoid memory constraints:

**Flow**:

1. Sample metadata + FASTA files -> TAR archive stream (`tarPack()`)
2. TAR stream chunked into 10MB pieces (`chunkStream()`)
3. Chunks uploaded via S3 multipart upload (`multiPartUpload()`)
4. Progress tracked per-part and surfaced to UI

**Why**: Genomic sequencing files can be multi-GB. Streaming avoids loading entire file into browser memory. Multipart uploads enable retry logic per-chunk rather than full-file retry.

### 3. Svelte 5 Reactive State

The project uses Svelte 5's runes-based reactivity model:

- `$state()`: Mutable reactive state
- `$derived()`: Computed values (auto-recompute when dependencies change)
- `$effect()`: Side effects that run when dependencies change
- `$props()`: Component props with TypeScript type safety

Global authentication state managed via reactive module-level state (`user.svelte.ts`):

```typescript
export const auth = $state<{ user?: User }>({});
```

**Why**: Svelte 5 runes provide fine-grained reactivity without manual subscription management. Module-level state enables simple global auth state sharing without context API.

### 4. Component Co-location

Each component directory contains:

- Implementation (`.svelte`)
- Tests (`.svelte.test.ts`)
- Types (`.d.ts` if needed)
- Fixtures (`__fixtures__/` if needed)

**Why**: Related code stays together, making it easier to reason about and test components in isolation.

## Data Flow

### Authentication Flow

```
User -> Login Button -> Cognito Authorization Endpoint
     -> User Authenticates
     -> Redirect to /auth/callback with code
     -> Exchange code for tokens
     -> Store user in auth.user reactive state
     -> Render main application
```

### Upload Flow

```
User -> Select FASTA files + Enter metadata
     -> Click Upload
     -> Create TAR archive stream (meta.json + files)
     -> Chunk stream into 10MB pieces
     -> Initiate S3 multipart upload (get uploadId)
     -> Upload chunks in parallel with retry logic
     -> Complete multipart upload
     -> Display success notification
```

### Workflow Submission Flow

```
User -> Navigate to Workflows tab
     -> Open submit view
     -> Select workflow DAG
     -> Fetch ordered PipelineProfile[] for workflow stages
     -> Generate one form section per stage from JSON Schema
     -> User fills stage parameters
     -> Validate all stages against schemas
     -> POST { pipelineConfigs } to /workflows/trigger
     -> Store returned dag_run_id
     -> Navigate to workflow detail view
```

### Report Viewing Flow

```
User -> Enter sample ID
     -> Click Load Report
     -> GET /report/create?sampleId=X&reportId=Y&format=html
     -> Render HTML in sandboxed iframe
```

### Workflow Status Monitoring Flow

```
User -> Navigates to Workflows tab
     -> Clicks "Submit" button
     -> Selects workflow from dropdown
     -> Fetch workflow profiles (GET /workflows/pipelineprofiles?dagId={dagId})
     -> Generate multi-stage form from JSON Schemas
     -> User fills parameters for each stage
     -> Validate all stages against schemas
     -> POST to /workflows/trigger?dagId={dagId}
     -> Response includes {dag_run_id, dag_id}
     -> Store {dagId, dagRunId, submittedAt, submissionConfig} in cookies
     -> Add to reactive workflowRuns state (SvelteMap)
     -> Navigate to detail view (/?tab=workflows&view=detail&dagId=...&dagRunId=...)
     -> Fetch workflow run + task instances (parallel)
     -> Display summary card + task instances table + submission details accordion
     -> Auto-refresh every 30s for running/queued workflows
     -> Manual refresh button available
     -> Click "Back to workflow list" -> Show all workflows with progress cards
     -> List auto-refreshes every 30s for running workflows
     -> Optional: Click "Halt" -> Confirm -> PATCH to halt endpoint
```

**Key Architecture Points**:

- **Cookie Storage**: `workflow_runs` cookie stores submission metadata + config (90-day retention)
- **Reactive State**: `SvelteMap` for taskInstancesMap enables automatic UI updates on mutation
- **URL-Based Navigation**: Query parameters sync with view state for browser back/forward support
- **Consolidated Navigation**: Workflows tab contains list, submit, and detail views (no separate Submit tab)
- **Submission Config Storage**: Captures workflow name, stages, and parameter values for display in detail view
- **Auto-Refresh**: Only active for running/queued workflows, manual refresh always available

## State Management

- **Global State**:
    - Authentication state via `auth` object in `user.svelte.ts`
    - Workflow runs via `workflowRuns` object in `workflowRuns.svelte.ts` (stored runs + live status map using SvelteMap)
- **Component State**: Local reactive state via `$state()` within components
- **Derived State**: Computed values via `$derived()` (e.g., form validation state, task progress percentages)
- **Persistent State**:
    - Workflow runs stored in browser cookies with `SubmissionConfig` (90-day retention)
    - Includes submission parameters for replay/review in detail view
- **Reactive Collections**: `SvelteMap` from `svelte/reactivity` for task instances (auto-tracks mutations)
- **URL State**: Navigation state synchronized with URL query parameters for browser back/forward support
- **No External Store**: No Redux, Zustand, or other state management library needed due to Svelte's built-in reactivity
