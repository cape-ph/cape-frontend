# API Endpoints

Base URL (development): `https://api.cape-dev.org/capi-dev`

## Pipeline Management

**Current Submit tab note**: the Submit UI now uses workflow endpoints for its primary
path. The DAP endpoints below remain documented because they are still implemented API
helpers and may be useful for direct single-pipeline integrations.

### GET /dap/pipelines

Retrieve list of all available pipelines.

**Parameters**: None

**Response**: Array of `Pipeline` objects

```typescript
interface Pipeline {
    pipeline_name: string; // e.g., "bactopia"
    pipeline_type: string; // e.g., "nextflow"
    project: string; // e.g., "sequencing-analysis"
    version: string; // e.g., "3.1.0"
}
```

**Example Response**:

```json
[
    {
        "pipeline_name": "bactopia",
        "pipeline_type": "nextflow",
        "project": "bacterial-genomics",
        "version": "3.1.0"
    },
    {
        "pipeline_name": "bactopia",
        "pipeline_type": "nextflow",
        "project": "bacterial-genomics",
        "version": "3.0.1"
    }
]
```

**Used By**: `getPipelines()` helper. The current Submit UI uses `GET /workflows`
instead.

---

### GET /dap/pipelineprofile

Retrieve detailed profile for a specific pipeline version, including JSON Schema for parameters.

**Query Parameters**:

- `pipeline` (string, required): Pipeline name
- `version` (string, required): Pipeline version

**Response**: `PipelineProfile` object

```typescript
interface PipelineProfile {
    parametersSchema: AnySchema; // JSON Schema for pipeline parameters
    pipelineName: string; // Pipeline name
    pipelineDescription: string; // Human-readable description
    project: string; // Project/category
    submission: {
        encoding: string; // "cli-string" or "json"
        optionsFieldName: string; // Field name for parameters in submission
    };
    pipelineType: string; // e.g., "nextflow"
    version: string; // Pipeline version
    pipelineRunnable?: boolean; // Whether pipeline can be submitted
    pipelineId?: string; // Unique pipeline identifier
}
```

**Example Response**:

```json
{
    "parametersSchema": {
        "type": "object",
        "properties": {
            "--genome_size": {
                "type": "string",
                "title": "Genome Size",
                "description": "Expected genome size in Mb",
                "default": "5.0"
            },
            "--min_contig_length": {
                "type": "integer",
                "title": "Minimum Contig Length",
                "minimum": 200,
                "default": 500
            }
        },
        "required": ["--genome_size"]
    },
    "pipelineName": "bactopia",
    "pipelineDescription": "Bacterial genome assembly and analysis pipeline",
    "project": "bacterial-genomics",
    "submission": {
        "encoding": "cli-string",
        "optionsFieldName": "options"
    },
    "pipelineType": "nextflow",
    "version": "3.1.0",
    "pipelineRunnable": true,
    "pipelineId": "bactopia-3.1.0-abc123"
}
```

**Used By**: `getPipelineProfile()` helper. The current Submit UI uses
`GET /workflows/pipelineprofiles` instead.

---

### POST /dap/submit

Submit a pipeline job for execution.

**Request Body**: JSON object with pipeline submission data

```typescript
interface SubmissionData {
    pipelineName: string;
    pipelineVersion: string;
    outputPath: string; // S3 URI for output (e.g., s3://bucket/path)
    [optionsFieldName]: string | object; // Parameters (format depends on encoding)
}
```

**Encoding Types**:

- `cli-string`: Parameters serialized as CLI string (e.g., `"--genome_size 5.0 --min_contig_length 500"`)
- `json`: Parameters as nested JSON object

**Example Request** (cli-string encoding):

```json
{
    "pipelineName": "bactopia",
    "pipelineVersion": "3.1.0",
    "outputPath": "s3://ccd-dlh-t-seqauto-result-raw-vbkt-s3-1e80821/pipeline-output",
    "options": "--genome_size 5.0 --min_contig_length 500"
}
```

**Example Request** (json encoding):

```json
{
    "pipelineName": "bactopia",
    "pipelineVersion": "3.1.0",
    "outputPath": "s3://ccd-dlh-t-seqauto-result-raw-vbkt-s3-1e80821/pipeline-output",
    "parameters": {
        "--genome_size": "5.0",
        "--min_contig_length": 500
    }
}
```

**Response**: Success/error status (exact schema not shown in code, assumed standard REST)

**Used By**: Legacy single-pipeline submission. The current Submit UI uses `/workflows/trigger` for workflow submissions instead of this endpoint.

---

## Workflow Management

### GET /workflows

Retrieve available workflow DAGs for the Submit tab.

**Parameters**: None

**Response**: Object containing a `dags` array.

```typescript
interface WorkflowDAG {
    dag_id: string;
    dag_display_name: string;
    description: string;
    is_paused: boolean;
}
```

**Used By**: Submit component on mount to populate the workflow dropdown

---

### GET /workflows/pipelineprofiles

Retrieve the ordered pipeline profile list for a workflow.

**Query Parameters**:

- `dagId` (string, required): Workflow DAG identifier

**Response**: `PipelineProfile[]`

The array order is meaningful. The Submit component renders one stage per response
entry and serializes one options object per entry in the same order.

**Used By**: Submit component after workflow selection to generate stage forms

---

### POST /workflows/trigger

Trigger a workflow run.

**Query Parameters**:

- `dagId` (string, required): Workflow DAG identifier

**Request Body**: object containing a `pipelineConfigs` array with ordered stage objects. Each stage contains `pipelineId` and `nextflowOptions`.

```typescript
type WorkflowTriggerRequest = {
    pipelineConfigs: Array<{
        pipelineId: string;
        nextflowOptions: Record<string, unknown>;
    }>;
};
```

**Example Request**:

```json
{
    "pipelineConfigs": [
        {
            "pipelineId": "bactopia-gather",
            "nextflowOptions": {
                "--max_cpus": 2,
                "-profile": "aws",
                "--sample": "sample-a"
            }
        },
        {
            "pipelineId": "bactopia-main",
            "nextflowOptions": {
                "--max_cpus": 2,
                "-profile": "aws",
                "--bactopia": "s3://bucket/path"
            }
        }
    ]
}
```

The `pipelineConfigs` array maintains positional order to preserve stage identity. A workflow may include the same pipeline more than once, so the array order (not pipeline name/ID) determines stage execution sequence.

**Used By**: Workflow submission in the Submit UI. The frontend POSTs to this endpoint when the user submits a configured workflow. Currently blocked by CORS preflight (OPTIONS returns 403) - backend needs to add CORS headers.

---

## Report Management

### GET /report/create

Generate and retrieve an HTML report for a sample.

**Query Parameters**:

- `sampleId` (string, required): Sample identifier
- `reportId` (string, required): Report type identifier (e.g., "bactopia-single-sample-analysis")
- `format` (string, required): Output format ("html")

**Response**: Raw HTML document (Content-Type: text/html)

**Example Request**:

```
GET /report/create?sampleId=SAMPLE-001&reportId=bactopia-single-sample-analysis&format=html
```

**Response**: HTML document rendered in sandboxed iframe

**Used By**: Report component when user enters sample ID and clicks Load Report

---

## Object Storage (Multipart Upload)

These endpoints handle large file uploads via S3-compatible multipart upload protocol.

### POST /objstorage/creatempu

Initiate a multipart upload session.

**Query Parameters**:

- `bucket` (string, required): Target bucket name/UUID
- `key` (string, required): Object key (path/filename)

**Response**: XML document with `UploadId`

```xml
<?xml version="1.0" encoding="UTF-8"?>
<InitiateMultipartUploadResult>
    <UploadId>abc123-upload-id</UploadId>
    <Bucket>ccd-dlh-t-seqauto-input-raw-vbkt-s3-b8fded5</Bucket>
    <Key>unprocessed/sample-001.tar</Key>
</InitiateMultipartUploadResult>
```

**Used By**: `createMultipartUpload()` in mpu.ts during file upload initialization

---

### GET /objstorage/parturls

Retrieve presigned URLs for uploading individual parts.

**Query Parameters**:

- `bucket` (string, required): Target bucket
- `key` (string, required): Object key
- `uploadId` (string, required): Upload ID from creatempu
- `numParts` (integer, required): Number of parts to upload

**Response**: JSON array of part URLs

```typescript
interface PartUrl {
    partNumber: number; // 1-based part number
    url: string; // Presigned S3 URL for uploading this part
}
```

**Example Response**:

```json
[
    {
        "partNumber": 1,
        "url": "https://s3.amazonaws.com/bucket/key?partNumber=1&uploadId=abc123&signature=..."
    },
    {
        "partNumber": 2,
        "url": "https://s3.amazonaws.com/bucket/key?partNumber=2&uploadId=abc123&signature=..."
    }
]
```

**Used By**: `openMultipartUpload()` in mpu.ts after upload initialization

---

### PUT (presigned S3 URL)

Upload individual part data directly to S3 via presigned URL.

**Method**: PUT to presigned URL from parturls response

**Body**: Binary chunk data (10MB by default)

**Response Headers**:

- `ETag` (required): Part ETag for completion manifest

**Used By**: `doMultipartUpload()` in mpu.ts for each chunk

---

### POST /objstorage/completempu

Finalize multipart upload after all parts uploaded.

**Query Parameters**:

- `bucket` (string, required): Target bucket
- `key` (string, required): Object key
- `uploadId` (string, required): Upload ID

**Request Body**: XML manifest of uploaded parts

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CompleteMultipartUpload xmlns="http://s3.amazonaws.com/doc/2006-03-01/">
    <Part>
        <PartNumber>1</PartNumber>
        <ETag>"etag-value-1"</ETag>
    </Part>
    <Part>
        <PartNumber>2</PartNumber>
        <ETag>"etag-value-2"</ETag>
    </Part>
</CompleteMultipartUpload>
```

**Response**: XML document with upload result

```xml
<?xml version="1.0" encoding="UTF-8"?>
<CompleteMultipartUploadResult>
    <Location>https://s3.amazonaws.com/bucket/key</Location>
    <Bucket>ccd-dlh-t-seqauto-input-raw-vbkt-s3-b8fded5</Bucket>
    <Key>unprocessed/sample-001.tar</Key>
    <ETag>"final-etag"</ETag>
    <ChecksumCRC64NVME>checksum-value</ChecksumCRC64NVME>
    <ChecksumType>CRC64NVME</ChecksumType>
</CompleteMultipartUploadResult>
```

**Used By**: `completeMultipartUpload()` in mpu.ts after all chunks uploaded

---

### DELETE /objstorage/abortmpu

Abort an in-progress multipart upload (cleanup).

**Query Parameters**:

- `Bucket` (string, required): Target bucket
- `Key` (string, required): Object key
- `UploadId` (string, required): Upload ID to abort

**Response**: Empty success response

**Used By**: `abortMultipartUpload()` in mpu.ts on upload error or cancellation

---

## Workflow Status Endpoints

### GET /workflows/run

Get workflow run status by DAG ID and run ID.

**Query Parameters**:

- `dagId` (string, required): Workflow DAG ID
- `dagRunId` (string, required): Workflow run ID (format: `manual+YYYY-MM-DDTHH:MM:SS+00:00`)

**Response**: `WorkflowRun` object

```json
{
    "dag_run_id": "manual+2024-01-15T10:30:00+00:00",
    "dag_id": "bactopia_workflow",
    "logical_date": "2024-01-15T10:30:00+00:00",
    "queued_at": "2024-01-15T10:30:00.123456+00:00",
    "start_date": "2024-01-15T10:30:05.789012+00:00",
    "end_date": null,
    "data_interval_start": "2024-01-15T10:30:00+00:00",
    "data_interval_end": "2024-01-15T10:30:00+00:00",
    "run_after": "2024-01-15T10:30:00+00:00",
    "last_scheduling_decision": "2024-01-15T10:30:05+00:00",
    "run_type": "manual",
    "state": "running",
    "triggered_by": "cape.default@example.com",
    "conf": {},
    "dag_versions": [
        {
            "id": "abc123",
            "version_number": 1,
            "dag_id": "bactopia_workflow",
            "bundle_name": "bactopia-bundle-v1",
            "created_at": "2024-01-10T08:00:00+00:00"
        }
    ]
}
```

**Used By**: `getWorkflowRun()` in workflowStatus.ts, Status detail view

**Error Cases**:

- `404`: Workflow run not found (may be removed or retention period expired)
- `400`: Invalid dagId or dagRunId format

---

### GET /workflows/run/taskinstances

Get all task instances for a workflow run.

**Query Parameters**:

- `dagId` (string, required): Workflow DAG ID
- `dagRunId` (string, required): Workflow run ID

**Response**: `TaskInstancesResponse` object

```json
{
    "task_instances": [
        {
            "id": "task-uuid-1",
            "task_id": "gather_samples",
            "dag_id": "bactopia_workflow",
            "dag_run_id": "manual+2024-01-15T10:30:00+00:00",
            "map_index": -1,
            "logical_date": "2024-01-15T10:30:00+00:00",
            "run_after": "2024-01-15T10:30:00+00:00",
            "start_date": "2024-01-15T10:30:10+00:00",
            "end_date": "2024-01-15T10:32:45+00:00",
            "state": "success",
            "try_number": 1,
            "max_tries": 3,
            "task_display_name": "Gather Samples",
            "hostname": "worker-node-1",
            "unixname": "airflow",
            "pool": "default_pool",
            "pool_slots": 1,
            "queue": "default",
            "priority_weight": 1,
            "operator": "PythonOperator",
            "queued_when": "2024-01-15T10:30:05+00:00",
            "scheduled_when": "2024-01-15T10:30:08+00:00",
            "pid": 12345,
            "executor_config": "{}",
            "rendered_fields": {},
            "dag_version": {
                "id": "abc123",
                "version_number": 1,
                "dag_id": "bactopia_workflow",
                "bundle_name": "bactopia-bundle-v1",
                "created_at": "2024-01-10T08:00:00+00:00"
            }
        }
    ],
    "total_entries": 8
}
```

**Used By**: `getTaskInstances()` in workflowStatus.ts, Status list and detail views

**Error Cases**:

- `404`: Workflow run not found
- `400`: Invalid dagId or dagRunId format

---

### GET /workflows/tasks

Get task definitions for a workflow (metadata about tasks in the DAG).

**Query Parameters**:

- `dagId` (string, required): Workflow DAG ID

**Response**: `WorkflowTasksResponse` object

```json
{
    "tasks": [
        {
            "task_id": "gather_samples",
            "task_display_name": "Gather Samples",
            "owner": "airflow",
            "start_date": "2024-01-01T00:00:00+00:00",
            "trigger_rule": "all_success",
            "depends_on_past": false,
            "wait_for_downstream": false,
            "retries": 3,
            "queue": "default",
            "pool": "default_pool",
            "pool_slots": 1,
            "retry_delay": {
                "__type": "TimeDelta",
                "days": 0,
                "seconds": 300,
                "microseconds": 0
            },
            "retry_exponential_backoff": false,
            "priority_weight": 1,
            "weight_rule": "downstream",
            "ui_color": "#ffefeb",
            "ui_fgcolor": "#000000",
            "template_fields": ["op_args", "op_kwargs"],
            "downstream_task_ids": ["run_bactopia"],
            "operator_name": "PythonOperator",
            "params": {},
            "class_ref": {
                "module_path": "airflow.operators.python",
                "class_name": "PythonOperator"
            },
            "is_mapped": false,
            "extra_links": []
        }
    ],
    "total_entries": 8
}
```

**Used By**: `getWorkflowTasks()` in workflowStatus.ts (available but not currently displayed)

**Error Cases**:

- `404`: Workflow DAG not found
- `400`: Invalid dagId format

---

### PATCH /workflows/halt

Halt a running workflow (mark for termination).

**Query Parameters**:

- `dagId` (string, required): Workflow DAG ID
- `dagRunId` (string, required): Workflow run ID

**Request Body** (optional):

```json
{
    "note": "Halted due to incorrect parameters"
}
```

**Response**: Updated `WorkflowRun` object with `state: 'failed'` and optional `note`

```json
{
    "dag_run_id": "manual+2024-01-15T10:30:00+00:00",
    "dag_id": "bactopia_workflow",
    "state": "failed",
    "note": "Halted due to incorrect parameters",
    ...
}
```

**Used By**: `haltWorkflow()` in workflowStatus.ts, HaltWorkflowModal component

**Behavior**:

- Terminates all running tasks immediately
- Sets workflow state to `failed`
- Stores optional note with halt reason
- Irreversible action

**Error Cases**:

- `404`: Workflow run not found
- `400`: Workflow not in running or queued state
- `400`: Invalid dagId or dagRunId format

---

## Error Handling

All API endpoints can return error responses. The frontend handles errors via:

1. Axios catches HTTP errors (4xx, 5xx status codes)
2. Error messages extracted from error objects
3. User notified via toast notification system
4. Errors logged to console for debugging

No standardized error schema is enforced across endpoints in the current implementation.
