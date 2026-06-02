# Workflows API - Submission & Monitoring Analysis

**Based on**: Real API responses from testing (see `scratch/workflows-api-testing.md`)

---

## Understanding Workflow Submission & Tracking

### Key Identifier: `dag_run_id`

**Format**: `manual__2026-05-15T19:04:03.713921+00:00`

**Structure**: `{trigger_type}__{ISO_timestamp_with_offset}`

**Importance**: This is the **primary key** for tracking a workflow execution. Without it, you cannot:

- Check run status
- Get task instance details
- Halt/cancel the workflow

**Challenge**: Frontend must persist `dag_run_id` after submission to enable monitoring.

---

## POST `/workflows/trigger` - Submit Workflow

### Request Structure

**URL**: `POST /workflows/trigger?dagId={dagId}`

**Query Parameters**:

- `dagId` (required): Workflow identifier (e.g., `bactopia_and_kraken2_v3_2_0`)

**Request Body**: JSON object with **one key per pipeline in the workflow**

```typescript
interface WorkflowTriggerRequest {
    [pipelineId: string]: {
        // Pipeline-specific parameters (from parametersSchema)
        [paramName: string]: string | number | boolean;

        // Special fields for pipeline configuration
        nextflowOptions?: string; // CLI-encoded parameters
        pipelineOutputBucket?: string; // S3 bucket for output
        pipelineOutputPrefix?: string; // S3 prefix for output
        pipelineOutputBucketName?: string; // Alternative bucket field name
    };
}
```

**Example Request** (Bactopia + Kraken2 workflow):

```json
{
    "bactopia": {
        "--sample": "airflow-sample",
        "nextflowOptions": "-profile aws --max_cpus 2 --max_memory 24.GB --ont s3://...",
        "pipelineOutputBucket": "s3://cape-demo-files",
        "pipelineOutputPrefix": "from-airflow"
    },
    "kraken2": {
        "pipelineOutputBucketName": "cape-demo-files",
        "pipelineOutputPrefix": "from-airflow",
        "nextflowOptions": "-profile aws --max_cpus 2 --max_memory 8.GB"
    }
}
```

**Key Observations**:

1. **Top-level keys match pipeline IDs**: `"bactopia"` and `"kraken2"` (NOT `pipelineId` values like `"bactopia-ont-v3.2.0"`)
2. **Mixed parameter encoding**:
    - Some parameters as direct JSON fields (`"--sample": "airflow-sample"`)
    - Some parameters in `nextflowOptions` string (`"-profile aws --max_cpus 2..."`)
3. **Output configuration per pipeline**: Each pipeline stage can have different output locations
4. **Parameter name inconsistency**:
    - Bactopia uses `pipelineOutputBucket`
    - Kraken2 uses `pipelineOutputBucketName`

### Response Structure

```typescript
interface WorkflowTriggerResponse {
    dag_run_id: string; // PRIMARY KEY for tracking
    dag_id: string; // Workflow identifier
    logical_date: string; // ISO timestamp
    queued_at: string; // When queued
    data_interval_start: string; // Execution interval start
    data_interval_end: string; // Execution interval end
    run_after: string; // Scheduled execution time
    run_type: string; // "manual" for API triggers
    state: string; // "queued" initially
    triggered_by: string; // "rest_api"
    conf: WorkflowTriggerRequest; // Echo of submitted configuration
    dag_versions: DagVersion[]; // DAG version metadata
}

interface DagVersion {
    id: string; // UUID
    version_number: number; // DAG version
    dag_id: string;
    bundle_name: string;
    created_at: string;
}
```

**Initial State**: `"state": "queued"`

**Critical Field**: `dag_run_id` - **Must be stored for later status checks**

---

## GET `/workflows/run` - Check Workflow Status

### Request Structure

**URL**: `GET /workflows/run?dagId={dagId}&dagRunId={dagRunId}`

**Query Parameters**:

- `dagId` (required): Workflow identifier
- `dagRunId` (required): Run identifier from trigger response

**Example**:

```
GET /workflows/run?dagId=bactopia_and_kraken2_v3_2_0&dagRunId=manual__2026-05-15T19%3A07%3A53.814872%2B00%3A00
```

**Note**: URL encoding required for `dag_run_id` (`:` → `%3A`, `+` → `%2B`)

### Response Structure

**Same structure as trigger response** with additional fields:

```typescript
interface WorkflowRunResponse {
    // Same as WorkflowTriggerResponse, plus:
    start_date?: string; // When execution started (null if still queued)
    end_date?: string; // When execution finished (null if running)
    last_scheduling_decision: string; // Last scheduler check
    state: WorkflowState; // Current state
}

type WorkflowState =
    | 'queued' // Waiting to start
    | 'running' // Currently executing
    | 'success' // Completed successfully
    | 'failed' // Completed with errors
    | 'cancelled'; // Manually cancelled
```

**State Transitions**:

```
queued → running → success
                → failed
                → (cancelled via halt)
```

**Polling Strategy**:

- Poll this endpoint periodically to check workflow status
- Check `state` field for completion
- `start_date` indicates when execution began
- `end_date` indicates when execution finished

---

## GET `/workflows/run/taskinstances` - Task-Level Status

### Request Structure

**URL**: `GET /workflows/run/taskinstances?dagId={dagId}&dagRunId={dagRunId}`

**Query Parameters**:

- `dagId` (required): Workflow identifier
- `dagRunId` (required): Run identifier

### Response Structure

```typescript
interface TaskInstancesResponse {
    task_instances: TaskInstance[];
    total_entries: number;
}

interface TaskInstance {
    id: string; // UUID
    task_id: string; // Task identifier (matches /workflows/tasks)
    dag_id: string;
    dag_run_id: string;
    map_index: number; // -1 for non-mapped tasks
    logical_date: string;
    run_after: string;
    start_date?: string; // When task started (null if not started)
    end_date?: string; // When task finished (null if running)
    state?: string; // Task state (see below)
    try_number: number; // Current attempt (0 = not started, 1+ = running/retrying)
    max_tries: number; // Max retry attempts
    task_display_name: string;
    hostname: string; // Worker hostname (empty if not running)
    unixname: string;
    pool: string;
    pool_slots: number;
    queue: string;
    priority_weight: number; // Task priority (higher runs first)
    operator: string; // Airflow operator type
    queued_when?: string;
    scheduled_when?: string;
    pid?: number; // Process ID on worker (if running)
    executor_config: string;
    rendered_fields: object;
    dag_version: DagVersion;
}
```

**Task States**:

- `undefined` / `null`: Task not yet scheduled (waiting for dependencies)
- `"scheduled"`: Task scheduled but not running yet
- `"queued"`: Task queued in executor
- `"running"`: Task currently executing
- `"success"`: Task completed successfully
- `"failed"`: Task failed
- `"skipped"`: Task skipped (upstream failure, branch not taken)
- `"upstream_failed"`: Task skipped due to upstream failure
- `"up_for_retry"`: Task failed but will retry

**Key Indicators**:

- `try_number: 0` → Task not started yet
- `try_number: 1+` → Task has run at least once
- `hostname: ""` → Task not assigned to worker yet
- `start_date: null` → Task not started
- `pid: null` → Task not running

**Example from Response**:

Task 1: `submit_bactopia_batch_job`

- **State**: `"running"`
- **Try Number**: 1 (first attempt)
- **Start Date**: 2026-05-15T19:07:54.354441Z
- **Hostname**: ip-10-0-6-237.us-east-2.compute.internal
- **PID**: 95739
- **Priority**: 4 (runs first)

Tasks 2-4: Waiting

- **State**: `undefined` (not in response object)
- **Try Number**: 0 (not started)
- **Hostname**: "" (not assigned)
- **Priority**: 3, 2, 1 (descending order)

**Use Case**: Display task-level progress to user

```
✓ submit_bactopia_batch_job - Running (Try 1/2)
○ create_k2_include - Waiting
○ wait_for_kraken_2_include_file - Waiting
○ submit_kraken2_batch_job - Waiting
```

---

## PATCH `/workflows/halt` - Cancel Workflow

### Request Structure

**URL**: `PATCH /workflows/halt?dagId={dagId}&dagRunId={dagRunId}`

**Query Parameters**:

- `dagId` (required): Workflow identifier
- `dagRunId` (required): Run identifier

**Request Body**:

```typescript
interface HaltRequest {
    note?: string; // Optional cancellation reason
}
```

**Example**:

```json
{
    "note": "stopped via cape api"
}
```

### Response Structure

**Same structure as `/workflows/run` response** with:

- `state: "failed"` (cancelled workflows show as failed)
- `end_date`: Timestamp when halt occurred
- `note`: Cancellation note included in response

**Important**: Halting sets state to `"failed"`, not `"cancelled"`

---

## Comparison: Single Pipeline vs Workflow Submission

### Current Submit Page (`/dap/submit`)

**Request**:

```json
{
    "pipelineName": "Bactopia",
    "pipelineVersion": "v3.2.0",
    "outputPath": "s3://bucket/path",
    "options": "--sample test --ont s3://..."
}
```

**Single form** → **Single submission** → **No tracking**

---

### New Workflow Submission (`/workflows/trigger`)

**Request**:

```json
{
    "bactopia": {
        "--sample": "test",
        "nextflowOptions": "--ont s3://...",
        "pipelineOutputBucket": "s3://bucket",
        "pipelineOutputPrefix": "path"
    },
    "kraken2": {
        "nextflowOptions": "--max_cpus 2",
        "pipelineOutputBucketName": "s3://bucket",
        "pipelineOutputPrefix": "path"
    }
}
```

**Multiple forms** (one per stage) → **Single workflow submission** → **Tracking via `dag_run_id`**

---

## State Tracking Challenge

### The Problem

Frontend is **stateless** (SvelteKit SSR/SPA with no server-side session):

- User submits workflow → receives `dag_run_id`
- User navigates away or refreshes → **`dag_run_id` lost**
- Cannot check status of previously submitted workflows

### Solution Options

#### Option 1: Browser LocalStorage (Simplest)

```typescript
// After submission
localStorage.setItem(
    'workflow_runs',
    JSON.stringify([
        {
            dagRunId: 'manual__2026-05-15T19:04:03.713921+00:00',
            dagId: 'bactopia_and_kraken2_v3_2_0',
            submittedAt: '2026-05-15T19:04:03Z',
            label: 'Sample: airflow-sample'
        }
        // ... more runs
    ])
);

// Later, load and poll status
const runs = JSON.parse(localStorage.getItem('workflow_runs') || '[]');
```

**Pros**:

- Simple, no backend needed
- Works immediately
- Per-browser tracking

**Cons**:

- Lost on browser clear/incognito
- Not shared across devices/browsers
- No team visibility

#### Option 2: Cookies

```typescript
// Set cookie after submission
document.cookie = `workflow_runs=${JSON.stringify(runs)}; max-age=${30 * 24 * 60 * 60}; path=/`;
```

**Pros**:

- Persists longer than localStorage
- Can be made httpOnly/secure

**Cons**:

- Same limitations as localStorage
- Size limits (4KB)

#### Option 3: Backend Database (Future Enhancement)

Store `dag_run_id` + user metadata in database for:

- Cross-device tracking
- Team visibility
- Run history
- Search/filter capabilities

**Not needed for initial feature parity**

---

## Minimal Feature Parity Requirements

To match current Submit page functionality:

### Must Have

✅ Select workflow (instead of pipeline)
✅ Fetch pipeline profiles for all stages
✅ Render forms for each pipeline stage
✅ Submit workflow with parameters
✅ Show success toast with confirmation

### Nice to Have (Not Feature Parity)

❌ Track `dag_run_id` in localStorage
❌ Show "View Status" link after submission
❌ Poll for workflow status
❌ Display task-level progress
❌ Cancel running workflows

---

## Implementation Plan for Feature Parity

### Phase 1: Workflow Selection & Form Generation

1. Replace `GET /dap/pipelines` with `GET /workflows`
2. Update pipeline selection to workflow selection
3. Fetch `GET /workflows/pipelineprofiles?dagId=X` (returns array)
4. Generate **multiple forms** from array of pipeline profiles
5. Manage state for multiple parameter sets

### Phase 2: Submission

1. Build request body with pipeline IDs as keys
2. Handle mixed parameter encoding (direct fields + `nextflowOptions`)
3. POST to `/workflows/trigger?dagId=X`
4. Display success toast
5. _(Optional)_ Store `dag_run_id` in localStorage for future status checks

### Phase 3: (Future) Monitoring

1. Add "My Workflows" page
2. Load runs from localStorage
3. Poll `/workflows/run` for each run
4. Display status and task progress
5. Enable cancellation via `/workflows/halt`

---

## Request Body Construction Strategy

### From Pipeline Profiles to Request Body

**Given**: Array of `PipelineProfile` from `/workflows/pipelineprofiles`

**Example Profiles**:

```json
[
  { "pipelineId": "bactopia-ont-v3.2.0", ... },
  { "pipelineId": "bactopia-kraken2-v3.2.0", ... }
]
```

**Problem**: Request body uses **pipeline names** (`"bactopia"`, `"kraken2"`), not pipeline IDs

**Solution**: Need mapping from `pipelineId` → request key name

**Observations from Testing**:

- `pipelineId: "bactopia-ont-v3.2.0"` → Request key: `"bactopia"`
- `pipelineId: "bactopia-kraken2-v3.2.0"` → Request key: `"kraken2"`

**Pattern**: Extract base name before version?

```typescript
function getPipelineKeyName(pipelineId: string): string {
    // "bactopia-ont-v3.2.0" → "bactopia"
    // "bactopia-kraken2-v3.2.0" → "kraken2"
    // Pattern unclear - may need backend to provide explicit field
}
```

**Recommended**: Backend should add `requestKey` field to `PipelineProfile`:

```typescript
interface PipelineProfile {
    pipelineId: string;
    requestKey: string; // NEW: Key to use in trigger request body
    // ... rest of fields
}
```

---

## Open Questions

1. **Request key mapping**: How to derive `"bactopia"` from `"bactopia-ont-v3.2.0"`? Is there a pattern or should backend provide explicit field?

2. **Parameter encoding**: Should all parameters go in `nextflowOptions` string, or is mixed encoding (some direct fields + some in string) intentional?

3. **Output configuration**: Why different field names (`pipelineOutputBucket` vs `pipelineOutputBucketName`)? Should frontend normalize or preserve differences?

4. **UISchema usage**: Should frontend implement JsonForms layout hints from `uiSchema` field, or ignore for MVP?

5. **Parameter dependencies**: How to show Stage 2's `--bactopia` parameter should reference Stage 1's `--outdir` value? Auto-populate or require user to copy-paste?

6. **Status polling**: What's reasonable polling interval? 5 seconds? 10 seconds? 30 seconds?

7. **Run history limit**: If using localStorage, how many runs to keep? Last 10? Last 50? All time with manual cleanup?

---

## Summary for Implementation

### Clear Picture? ✅ YES

The API responses provide everything needed to:

- Submit workflows with multiple pipeline stages
- Construct proper request body format
- Understand state transitions
- Implement status tracking (if desired)

### Blockers for Feature Parity? ❌ NO

Can achieve feature parity (submit + success notification) without:

- Status tracking
- Persistent storage
- Monitoring UI

### For MVP (Feature Parity Only):

**Implement**:

1. Workflow selection dropdown (from `/workflows`)
2. Multi-stage form generation (from `/workflows/pipelineprofiles`)
3. Request body construction per pipeline
4. Submit to `/workflows/trigger`
5. Show success toast

**Skip for Now**:

1. Storing `dag_run_id`
2. Status polling
3. Task progress display
4. Workflow cancellation

---

## Next Steps

1. **Clarify request key mapping** with backend or by examining more examples
2. **Design multi-stage form UI** - accordion? tabs? vertical stack?
3. **Plan parameter state management** - separate state per pipeline or unified?
4. **Implement workflow selection** as first step
5. **Test with minimal workflow** to validate understanding
