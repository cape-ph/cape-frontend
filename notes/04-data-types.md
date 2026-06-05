# Data Types

## Authentication Types

### User

From `oidc-client-ts` library. Represents authenticated user.

```typescript
interface User {
    access_token: string;
    token_type: string;
    profile: {
        sub: string; // Subject (user ID)
        email?: string;
        email_verified?: boolean;
        // Additional OIDC claims
    };
    expires_at: number; // Unix timestamp
    // Additional OIDC fields
}
```

**Used In**: Global auth state, stored in `auth.user` reactive state

---

## Pipeline Types

### Pipeline

Represents an available pipeline name/version combination.

```typescript
interface Pipeline {
    pipeline_name: string; // Pipeline identifier (e.g., "bactopia")
    pipeline_type: string; // Execution engine (e.g., "nextflow")
    project: string; // Project/category grouping
    version: string; // Semantic version (e.g., "3.1.0")
}
```

**Used In**: Legacy DAP helpers and direct single-pipeline integrations. The current
Submit tab uses workflow DAGs.

---

### PipelineProfile

Complete pipeline configuration including JSON Schema for parameters.

```typescript
interface PipelineProfile {
    parametersSchema: AnySchema; // JSON Schema object
    pipelineName: string;
    pipelineDescription: string;
    project: string;
    submission: {
        encoding: string; // Legacy: "cli-string" or "json" - not used by current frontend
        optionsFieldName: string; // Legacy: field name - not used by current frontend
    };
    pipelineType: string;
    version: string;
    pipelineRunnable?: boolean; // Can this pipeline be executed?
    pipelineId?: string; // Unique identifier
}
```

**Used In**: Form generation, parameter validation

**Note**: The `submission` field is a legacy API contract. The current frontend workflow
submission generates `{pipelineId, nextflowOptions}` payloads directly without using
`submission.encoding` or `submission.optionsFieldName`.

---

### WorkflowDAG

Workflow DAG summary returned by the workflow API.

```typescript
interface WorkflowDAG {
    dag_id: string;
    dag_display_name: string;
    description: string;
    is_paused: boolean;
}
```

**Used In**: Submit workflow selection

---

### WorkflowTriggerRequest

Ordered workflow trigger payload. Each array item contains the pipeline ID and compiled
Nextflow options object for one pipeline profile returned by `/workflows/pipelineprofiles`.

```typescript
type WorkflowTriggerRequest = Array<{
    pipelineId: string;
    nextflowOptions: Record<string, unknown>;
}>;
```

The array order must match the pipeline profile response order. This avoids ambiguity
when a workflow uses the same pipeline more than once.

**Used In**: Submit preview serialization and future `/workflows/trigger` calls

---

### SchemaProperty

JSON Schema property definition for a single parameter.

```typescript
type SchemaProperty = {
    type?: 'string' | 'integer' | 'number' | 'boolean';
    title?: string; // Display label
    description?: string; // Help text
    default?: unknown; // Default value
    const?: unknown; // Fixed value (readonly)
    enum?: unknown[]; // Allowed values (dropdown)
    minimum?: number; // Min value (numeric types)
    maximum?: number; // Max value (numeric types)
    min?: number; // Alias for minimum
    max?: number; // Alias for maximum
    step?: number; // Increment step (numeric types)
};
```

**Used In**: Dynamic form field generation through `src/lib/schema.ts`

---

### ParameterField

Internal representation of a form field derived from schema.

```typescript
type ParameterField = {
    key: string; // Parameter name (e.g., "--genome_size")
    label: string; // Display label
    schema: SchemaProperty; // Schema definition
    required: boolean; // Is this field required?
    readonly: boolean; // Is this field readonly? (has const)
};
```

**Used In**: Submit form rendering logic

---

### UnsupportedSchemaError

Thrown when schema field extraction encounters a JSON Schema construct that needs
additional UI state before it can be rendered correctly.

```typescript
class UnsupportedSchemaError extends Error {
    constructor(keyword: 'anyOf' | 'oneOf');
}
```

`allOf` and local `$ref` composition are flattened for field extraction. `anyOf` and
`oneOf` fail visibly because rendering them requires an explicit user choice between
schema branches.

**Used In**: Submit schema error handling

---

## Sample/Upload Types

### SampleMeta

Metadata describing a biological sample.

```typescript
interface SampleMeta {
    sampleId: string; // Unique sample identifier
    sampleType: string; // Sample type (e.g., "swab", "isolate")
    sampleMatrix: string; // Sample matrix (e.g., "nasal", "stool")
    sampleCollectionDate: string; // ISO 8601 datetime string
}
```

**Used In**: TAR archive metadata, file upload

**Example**:

```json
{
    "sampleId": "SAMPLE-001",
    "sampleType": "isolate",
    "sampleMatrix": "blood",
    "sampleCollectionDate": "2025-08-15T14:36:28.024+00:00"
}
```

---

### Upload

Upload progress state.

```typescript
interface Upload {
    state: 'pending' | 'uploading' | 'complete';
    bytesSent: number; // Bytes uploaded so far
    totalBytes: number; // Total bytes to upload
    controller?: AbortController; // For canceling upload
}
```

**Used In**: FileUpload component state, progress tracking

---

## Multipart Upload Types

### MultipartUploadParams

Configuration for multipart upload operation.

```typescript
interface MultipartUploadParams {
    baseUrl: string; // API base URL
    bucket: string; // S3 bucket name/UUID
    key: string; // Object key (path/filename)
    partSize?: number; // Chunk size in bytes (default: 10MB)
    numRetries?: number; // Retry attempts per chunk (default: 3)
    signal?: AbortSignal; // For cancellation
    onProgress?: OnProgress; // Progress callback
    httpsAgent?: Agent; // Custom HTTPS agent
}
```

**Used In**: `multiPartUpload()` function

---

### MultipartUploadResult

Result of completed multipart upload.

```typescript
interface MultipartUploadResult {
    location: string; // Full S3 URL
    bucket: string; // Bucket name
    key: string; // Object key
    etag: string; // Final ETag
    checksum: string; // CRC64NVME checksum
    checksumType: string; // Checksum algorithm
}
```

**Used In**: Upload completion handling

---

### OnProgress

Callback signature for upload progress updates.

```typescript
type OnProgress = (
    bytesSent: number, // Total bytes sent so far
    totalBytes: number, // Total bytes to send
    ctx: {
        partNumber: number; // Current part being uploaded
        numParts: number; // Total number of parts
        partSize: number; // Size of each part in bytes
        attempt: number; // Retry attempt for this part
    }
) => void;
```

**Used In**: Upload progress tracking, UI updates

---

### ChunkStream

Async generator for streaming chunks.

```typescript
type ChunkStream = AsyncGenerator<Uint8Array, void, unknown>;
```

**Used In**: TAR streaming, chunked upload

---

### PartUrl

Presigned URL for uploading a single part.

```typescript
interface PartUrl {
    partNumber: number; // 1-based part index
    url: string; // Presigned S3 URL
}
```

**Used In**: Internal multipart upload logic

---

### UploadedPart

Metadata for a successfully uploaded part.

```typescript
interface UploadedPart {
    partNumber: number; // Part index
    eTag: string; // Part ETag from S3
}
```

**Used In**: Completion manifest generation

---

## Component-Specific Types

### RejectFile

File rejection information from FileUpload component.

```typescript
interface RejectFile {
    file: File; // The rejected file
    errors: string[]; // Validation error codes
}
```

**Used In**: File validation error handling

**Error Codes**:

- `NOT_A_FASTQ_GZ_FILE`: File does not have .fastq or .fastq.gz extension

---

## Utility Types

### ValidateFunction

AJV compiled validation function.

```typescript
type ValidateFunction = (data: unknown) => boolean;
```

**Used In**: Parameter validation before submission

**Properties**:

- `errors`: Array of validation errors if validation fails

---

## Constants

### TAR_BLOCK_SIZE

TAR archive block size: `512 bytes`

### DEFAULT_PART_SIZE

Default multipart upload chunk size: `10 * 1024 * 1024` (10 MB)

### DEFAULT_NUM_RETRIES

Default retry attempts per chunk: `3`

### Retry HTTP Status Codes

HTTP status codes that trigger retry:

- `>= 500`: Server errors
- `429`: Too Many Requests
- `408`: Request Timeout

---

## Workflow Status Types

### WorkflowRunState

Possible workflow run states from Airflow.

```typescript
type WorkflowRunState =
    | 'queued'
    | 'running'
    | 'success'
    | 'failed'
    | 'skipped'
    | 'upstream_failed'
    | 'up_for_retry'
    | 'up_for_reschedule'
    | 'restarting'
    | 'deferred'
    | 'removed';
```

**Used In**: Workflow run status display, task instance states

---

### WorkflowRun

Complete workflow run information from `GET /workflows/run`.

```typescript
interface WorkflowRun {
    dag_run_id: string;
    dag_id: string;
    logical_date: string;
    queued_at: string;
    start_date: string | null;
    end_date: string | null;
    data_interval_start: string;
    data_interval_end: string;
    run_after: string;
    last_scheduling_decision: string | null;
    run_type: string;
    state: WorkflowRunState;
    triggered_by: string;
    conf: Record<string, unknown>;
    note?: string;
    dag_versions: Array<{
        id: string;
        version_number: number;
        dag_id: string;
        bundle_name: string;
        created_at: string;
    }>;
}
```

**Used In**: Status list view, status detail view

**Key Fields**:

- `dag_run_id`: Unique run identifier (format: `manual+YYYY-MM-DDTHH:MM:SS+00:00`)
- `state`: Current workflow state (queued, running, success, failed, etc.)
- `start_date`, `end_date`: Run timing (null if not started/finished)
- `note`: Optional user note (e.g., halt reason)

---

### TaskInstance

Individual task execution within a workflow run from `GET /workflows/run/taskinstances`.

```typescript
interface TaskInstance {
    id: string;
    task_id: string;
    dag_id: string;
    dag_run_id: string;
    map_index: number;
    logical_date: string;
    run_after: string;
    start_date: string | null;
    end_date: string | null;
    state: TaskInstanceState | null;
    try_number: number;
    max_tries: number;
    task_display_name: string;
    hostname: string;
    unixname: string;
    pool: string;
    pool_slots: number;
    queue: string;
    priority_weight: number;
    operator: string;
    queued_when: string | null;
    scheduled_when: string | null;
    pid: number | null;
    executor_config: string;
    rendered_fields: Record<string, unknown>;
    dag_version: {
        id: string;
        version_number: number;
        dag_id: string;
        bundle_name: string;
        created_at: string;
    };
}
```

**Used In**: Status detail view task table

**Key Fields**:

- `task_display_name`: Human-readable task name
- `state`: Current task state (uses same values as WorkflowRunState)
- `try_number`, `max_tries`: Retry tracking
- `start_date`, `end_date`: Task timing

---

### StoredWorkflowRun

Minimal workflow run data stored in browser cookies.

```typescript
interface StoredWorkflowRun {
    dagId: string;
    dagRunId: string;
    submittedAt: string; // ISO 8601 timestamp
}
```

**Used In**: Cookie storage, status list view

**Storage Details**:

- Cookie name: `workflow_runs`
- Max age: 90 days
- Path: `/`
- SameSite: `Strict`

---

### WorkflowRunStatus

Live status data for a workflow run with availability tracking.

```typescript
interface WorkflowRunStatus {
    run: WorkflowRun | null;
    isAvailable: boolean; // false if API returned 404 or error
    lastFetched: number; // timestamp
    error?: string;
}
```

**Used In**: Reactive state management in `workflowRuns.svelte.ts`

**Purpose**: Tracks whether a workflow run can be fetched from the API (may be unavailable if removed or retention period expired)

---

### TaskInstancesResponse

Response envelope for task instances list.

```typescript
interface TaskInstancesResponse {
    task_instances: TaskInstance[];
    total_entries: number;
}
```

**Used In**: Status detail view data fetching

---

### WorkflowTask

Task definition metadata from `GET /workflows/tasks`.

```typescript
interface WorkflowTask {
    task_id: string;
    task_display_name: string;
    owner: string;
    start_date: string;
    trigger_rule: string;
    depends_on_past: boolean;
    wait_for_downstream: boolean;
    retries: number;
    queue: string;
    pool: string;
    pool_slots: number;
    retry_delay: {
        __type: string;
        days: number;
        seconds: number;
        microseconds: number;
    };
    retry_exponential_backoff: boolean;
    priority_weight: number;
    weight_rule: string;
    ui_color: string;
    ui_fgcolor: string;
    template_fields: string[];
    downstream_task_ids: string[];
    operator_name: string;
    params: Record<string, unknown>;
    class_ref: {
        module_path: string;
        class_name: string;
    };
    is_mapped: boolean;
    extra_links: unknown[];
}
```

**Used In**: Task metadata lookups (available but not currently displayed in UI)

**Note**: Currently not used in the Status page but available for future enhancements

---
