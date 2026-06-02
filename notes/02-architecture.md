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

### Pipeline Submission Flow

```
User -> Select pipeline name
     -> Fetch available versions
     -> Select version
     -> Fetch PipelineProfile (includes parametersSchema)
     -> Generate form fields from schema
     -> User fills form
     -> Validate against schema
     -> Serialize to JSON
     -> POST to /dap/submit
     -> Display success/error notification
```

### Report Viewing Flow

```
User -> Enter sample ID
     -> Click Load Report
     -> GET /report/create?sampleId=X&reportId=Y&format=html
     -> Render HTML in sandboxed iframe
```

## State Management

- **Global State**: Authentication state via `auth` object in `user.svelte.ts`
- **Component State**: Local reactive state via `$state()` within components
- **Derived State**: Computed values via `$derived()` (e.g., form validation state)
- **No External Store**: No Redux, Zustand, or other state management library needed due to Svelte's built-in reactivity
