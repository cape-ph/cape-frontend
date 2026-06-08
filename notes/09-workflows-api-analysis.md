# Workflows API Analysis

**Date**: 2026-06-02  
**Purpose**: Understanding workflow endpoints for multi-stage pipeline orchestration

**Update (2026-06-04)**: The backend simplified `/workflows/trigger` to accept
`{pipelineId, nextflowOptions}` payloads directly. The frontend no longer uses
`submission.encoding` or `submission.optionsFieldName` fields from the API responses,
though they still exist in the backend API contract for backward compatibility.

---

## Key Discoveries

### Workflow Architecture

The `/workflows` API endpoints expose **Apache Airflow DAGs** (Directed Acyclic Graphs) for multi-stage pipeline orchestration. This is fundamentally different from the `/dap` single-pipeline approach.

**DAG = Workflow** = Multi-step orchestrated pipeline that can chain multiple bioinformatics tools together.

---

## Endpoint Analysis

### 1. GET `/workflows` - List Available Workflows

**Purpose**: Get all available workflow DAGs (equivalent to `/dap/pipelines` but for workflows)

**Parameters**: None

**Response Structure**:

```typescript
{
  dags: WorkflowDAG[];
  total_entries: number;
}

interface WorkflowDAG {
  dag_id: string;                    // Unique workflow identifier
  dag_display_name: string;          // Human-readable name
  is_paused: boolean;                // Can this workflow be triggered?
  is_stale: boolean;                 // Is definition outdated?
  last_parsed_time: string;          // ISO timestamp
  bundle_name: string;               // DAG bundle/package name
  relative_fileloc: string;          // Python file defining DAG
  fileloc: string;                   // Absolute path to DAG file
  description: string;               // Workflow purpose/description
  timetable_summary: string;         // Schedule type (e.g., "@once")
  timetable_description: string;     // Human-readable schedule
  tags: string[];                    // Workflow tags
  max_active_tasks: number;          // Concurrency limit
  max_active_runs: number;           // Parallel run limit
  max_consecutive_failed_dag_runs: number;
  has_task_concurrency_limits: boolean;
  has_import_errors: boolean;        // DAG definition errors?
  owners: string[];                  // Workflow owners
  file_token: string;                // Auth token for file access
}
```

**Example Response** (2 workflows available):

**Workflow 1**: `bactopia_and_kraken2_v3_2_0`

- **Display Name**: "Bactopia v3.2.0 and Kraken2 (through Bactopia) v3.2.0"
- **Description**: "Workflow that will run bactopia v3.2.0 followed by kraken2 (as a bactopia tool) using bactopia v3.2.0. Both are run in AWS Batch."
- **Type**: Multi-stage (Bactopia → Kraken2)
- **Status**: Active (not paused)

**Workflow 2**: `test_log_dag`

- **Display Name**: "TEST DAG cape-meta assets bucket prefix lister"
- **Description**: "Simple test DAG that lists prefixes in the cape-meta assets bucket..."
- **Type**: Test/utility workflow

---

### 2. GET `/workflows/pipelineprofiles` - Get Workflow Pipeline Profiles

**Purpose**: Get the pipeline profiles (parameter schemas) for all pipelines within a workflow (equivalent to `/dap/pipelineprofile` but returns multiple)

**Parameters**:

- `dagId` (required): Workflow DAG identifier

**Response Structure**:

```typescript
PipelineProfile[]  // Array of profiles, one per pipeline in the workflow
```

**Example Request**:

```
GET /workflows/pipelineprofiles?dagId=bactopia_and_kraken2_v3_2_0
```

**Example Response** (2 pipeline profiles):

**Pipeline 1**: Bactopia ONT Sample (First stage)

```json
{
    "pipelineName": "Bactopia ONT Sample",
    "pipelineDescription": "Execute Bactopia's ONT sample sequencing workflow with v3.2.0",
    "version": "v3.2.0",
    "pipelineId": "bactopia-ont-v3.2.0",
    "pipelineType": "nextflow",
    "project": "bactopia/bactopia",
    "parametersSchema": {
        "type": "object",
        "properties": {
            "--sample": { "type": "string", "title": "Sample Name" },
            "--ont": { "type": "string", "title": "ONT" },
            "--outdir": { "type": "string", "title": "S3 Location of the output directory" },
            "--max_memory": { "type": "string", "title": "Max Memory", "default": "24.GB" },
            "--max_cpus": { "type": "integer", "title": "Max CPUs", "default": 8, "minimum": 1 }
        },
        "required": ["--sample", "--ont", "--outdir"]
    },
    "uiSchema": {
        "type": "VerticalLayout",
        "elements": [
            { "type": "Control", "scope": "#/properties/--max_cpus" },
            { "type": "Control", "scope": "#/properties/--max_memory" },
            { "type": "Control", "scope": "#/properties/--ont" },
            { "type": "Control", "scope": "#/properties/--sample" }
        ]
    },
    "submission": {
        "encoding": "cli-string",
        "optionsFieldName": "nextflowOptions"
    },
    "inherits": ["bactopia-base-3.2.0"]
}
```

**Pipeline 2**: Bactopia Kraken2 (Second stage)

```json
{
    "pipelineName": "Bactopia Kraken2",
    "pipelineDescription": "Execute Bactopia's Kraken2 workflow with the development release",
    "version": "v3.2.0",
    "pipelineId": "bactopia-kraken2-v3.2.0",
    "pipelineType": "nextflow",
    "project": "bactopia/bactopia",
    "parametersSchema": {
        "type": "object",
        "properties": {
            "--bactopia": { "type": "string", "title": "Bactopia Output Directory" },
            "--max_memory": { "type": "string", "title": "Max Memory", "default": "8.GB" },
            "--max_cpus": { "type": "integer", "title": "Max CPUs", "default": 2, "minimum": 1 },
            "--kraken2_db": {
                "type": "string",
                "title": "Kraken2 Database Path",
                "default": "/mnt/nextflow_shared_data/kraken2"
            },
            "--wf": { "const": "kraken2", "default": "kraken2" }
        },
        "required": ["--bactopia"]
    },
    "submission": {
        "encoding": "cli-string",
        "optionsFieldName": "nextflowOptions"
    },
    "inherits": ["bactopia-base-3.2.0"]
}
```

**Key Observations**:

- **Multiple profiles** returned (one per pipeline stage)
- Same structure as `/dap/pipelineprofile` response
- Each profile has `parametersSchema` for form generation
- **NEW: `uiSchema`** field for UI layout hints (JsonForms format)
- **NEW: `inherits`** field for base configuration inheritance
- Pipeline 2's `--bactopia` parameter references Pipeline 1's `--outdir` output

---

### 3. GET `/workflows/tasks` - Get Workflow Task Graph

**Purpose**: Get the execution graph of tasks within a workflow (shows orchestration structure)

**Parameters**:

- `dagId` (required): Workflow DAG identifier

**Response Structure**:

```typescript
{
  tasks: WorkflowTask[];
  total_entries: number;
}

interface WorkflowTask {
  task_id: string;                   // Unique task identifier
  task_display_name: string;         // Human-readable name
  owner: string;                     // Task owner
  start_date: string;                // ISO timestamp
  trigger_rule: string;              // When task runs (e.g., "all_success")
  depends_on_past: boolean;          // Depends on previous runs?
  wait_for_downstream: boolean;      // Wait for downstream tasks?
  retries: number;                   // Max retry attempts
  queue: string;                     // Celery queue name
  pool: string;                      // Resource pool
  pool_slots: number;                // Slots consumed
  retry_delay: TimeDelta;            // Delay between retries
  retry_exponential_backoff: boolean;
  priority_weight: number;           // Task priority
  weight_rule: string;               // Priority calculation
  ui_color: string;                  // UI visualization color
  ui_fgcolor: string;                // UI text color
  template_fields: string[];         // Templatable parameters
  downstream_task_ids: string[];     // Tasks that run after this one
  operator_name: string;             // Airflow operator type
  params: object;                    // Task parameters
  class_ref: {
    module_path: string;             // Python module
    class_name: string;              // Python class
  };
  is_mapped: boolean;                // Dynamic task mapping?
  extra_links: any[];                // Additional UI links
}
```

**Example Request**:

```
GET /workflows/tasks?dagId=bactopia_and_kraken2_v3_2_0
```

**Example Response** (4 tasks in workflow):

**Task Execution Graph**:

```
submit_bactopia_batch_job (BatchOperator)
    ↓
create_k2_include (S3CreateObjectOperator)
    ↓
wait_for_kraken_2_include_file (S3KeySensor)
    ↓
submit_kraken2_batch_job (BatchOperator)
```

**Task 1**: `submit_bactopia_batch_job`

- **Type**: BatchOperator (AWS Batch job submission)
- **Purpose**: Run Bactopia pipeline
- **Downstream**: `create_k2_include`
- **Retries**: 2 with 5-minute delay

**Task 2**: `create_k2_include`

- **Type**: S3CreateObjectOperator (Create S3 object)
- **Purpose**: Create Kraken2 include file from Bactopia output
- **Downstream**: `wait_for_kraken_2_include_file`
- **Retries**: 2 with 5-minute delay

**Task 3**: `wait_for_kraken_2_include_file`

- **Type**: S3KeySensor (Wait for S3 object)
- **Purpose**: Wait for Kraken2 include file to be created
- **Downstream**: `submit_kraken2_batch_job`
- **Retries**: 2 with 5-minute delay

**Task 4**: `submit_kraken2_batch_job`

- **Type**: BatchOperator (AWS Batch job submission)
- **Purpose**: Run Kraken2 pipeline on Bactopia output
- **Downstream**: (none - final task)
- **Retries**: 2 with 5-minute delay

---

## Comparison: `/dap` vs `/workflows`

### `/dap` Endpoints (Single Pipeline)

| Endpoint                   | Purpose             | Returns                       |
| -------------------------- | ------------------- | ----------------------------- |
| `GET /dap/pipelines`       | List pipelines      | Array of individual pipelines |
| `GET /dap/pipelineprofile` | Get pipeline config | Single PipelineProfile        |
| `POST /dap/submit`         | Submit job          | Job submission confirmation   |

**Characteristics**:

- **One pipeline** per submission
- **No orchestration** - single execution
- **Fire and forget** - no task graph
- **Used by**: Simple single-tool analysis

---

### `/workflows` Endpoints (Multi-Stage Orchestration)

| Endpoint                          | Purpose                              | Returns                               |
| --------------------------------- | ------------------------------------ | ------------------------------------- |
| `GET /workflows`                  | List workflows                       | Array of DAGs (multi-stage workflows) |
| `GET /workflows/pipelineprofiles` | Get all pipeline configs in workflow | Array of PipelineProfiles             |
| `GET /workflows/tasks`            | Get task execution graph             | Task dependency graph                 |

**Characteristics**:

- **Multiple pipelines** chained together
- **Orchestration** via Airflow DAGs
- **Task graph** with dependencies
- **Monitoring** via task status
- **Data flow** between stages (output of stage 1 → input of stage 2)
- **Used by**: Complex multi-stage analysis workflows

---

## New Concepts in Workflows API

### 1. UISchema (JsonForms)

The `uiSchema` field provides UI layout hints in JsonForms format:

```json
{
    "type": "VerticalLayout",
    "elements": [
        { "type": "Control", "scope": "#/properties/--max_cpus" },
        { "type": "Control", "scope": "#/properties/--max_memory" }
    ]
}
```

**Purpose**: Control field ordering and layout in the UI

**Benefit**: Backend can specify how form should be laid out (order, grouping, layout)

### 2. Inheritance (`inherits` field)

```json
{
    "inherits": ["bactopia-base-3.2.0"]
}
```

**Purpose**: Pipelines can inherit base configuration from shared schemas

**Benefit**: Common parameters (like AWS config) defined once and reused

**Implementation**: Uses JSON Schema `$ref` and `allOf`:

```json
{
    "allOf": [{ "$ref": "#/$defs/bactopia-base-3.2.0" }]
}
```

### 3. Task Dependencies (`downstream_task_ids`)

Each task specifies which tasks run after it completes:

```json
{
    "task_id": "submit_bactopia_batch_job",
    "downstream_task_ids": ["create_k2_include"]
}
```

**Purpose**: Define execution order and dependencies

**Benefit**: Frontend can visualize workflow as a graph

---

## Data Flow Between Stages

**Example**: Bactopia → Kraken2 workflow

**Stage 1 (Bactopia)**:

- Input: `--sample`, `--ont`, `--outdir`
- Output: Results written to `--outdir` (S3 path)

**Intermediate Step**:

- Extract sample list from Bactopia output
- Create Kraken2 "include file" referencing Bactopia results

**Stage 2 (Kraken2)**:

- Input: `--bactopia` (points to Stage 1's `--outdir`)
- Output: Taxonomic classification results

**Key Insight**: Stage 2's `--bactopia` parameter value comes from Stage 1's `--outdir` value. The workflow orchestrator handles this data flow automatically.

---

## Migration Path: `/dap` → `/workflows`

### Current Submit Page (Using `/dap`)

1. User selects pipeline name + version
2. Fetch single PipelineProfile
3. Render single form
4. Submit to `/dap/submit`
5. Done (no monitoring)

### Future Submit Page (Using `/workflows`)

1. User selects **workflow** (DAG) instead of single pipeline
2. Fetch **array of PipelineProfiles** for all stages
3. Render **multiple forms** (one per stage) OR **sequential wizard**
4. Submit to `/workflows/trigger` (endpoint not tested yet)
5. Monitor execution via `/workflows/run` endpoints
6. Display task graph and status updates

---

## Next Steps for Implementation

### Required API Exploration

- [ ] Test `POST /workflows/trigger` - How to submit workflow with parameters?
- [ ] Test `GET /workflows/run` - How to get run status?
- [ ] Test `GET /workflows/run/taskinstances` - How to get task-level status?
- [ ] Test `PATCH /workflows/halt` - How to cancel running workflow?

### UI Design Questions

1. **Single form vs wizard?** - Show all pipeline forms at once or step-through?
2. **Data flow visibility?** - Show how Stage 1 output becomes Stage 2 input?
3. **Task graph visualization?** - Render workflow as graph?
4. **Real-time monitoring?** - Poll for task status updates? WebSocket?
5. **UISchema support?** - Implement JsonForms layouts or ignore?

### Implementation Challenges

1. **Multiple parameter sets** - Need to manage state for multiple forms
2. **Parameter dependencies** - Stage 2 params reference Stage 1 params
3. **Validation across stages** - Validate all stages before submission?
4. **Progress tracking** - Show which tasks are running/complete/failed
5. **Error handling** - What if Stage 1 succeeds but Stage 2 fails?

---

## Technical Observations

### Airflow Integration

- Workflows are **Apache Airflow DAGs** under the hood
- Tasks use Airflow operators (BatchOperator, S3CreateObjectOperator, S3KeySensor)
- Execution happens in Airflow scheduler/workers
- CAPE API is a facade over Airflow REST API

### AWS Batch Execution

- Both `submit_bactopia_batch_job` and `submit_kraken2_batch_job` use BatchOperator
- Actual pipeline execution happens in AWS Batch (not Airflow workers)
- Airflow orchestrates, AWS Batch executes

### Parameter Encoding

- Still uses `cli-string` encoding like `/dap` endpoints
- Parameters serialized as command-line arguments
- `optionsFieldName` is `nextflowOptions` (not `options`)

---

## Vocabulary Mapping

| Term             | Meaning                                     | Equivalent in `/dap`      |
| ---------------- | ------------------------------------------- | ------------------------- |
| DAG              | Workflow (multi-stage pipeline)             | N/A                       |
| Task             | Single step in workflow                     | Single pipeline execution |
| Operator         | Task implementation type                    | N/A                       |
| Pipeline Profile | Configuration for one pipeline in workflow  | PipelineProfile           |
| Downstream       | Tasks that run after current task           | N/A                       |
| Trigger Rule     | Condition for running task                  | N/A                       |
| DAG Run          | Single execution of a workflow              | N/A                       |
| Task Instance    | Single execution of a task within a DAG run | N/A                       |
