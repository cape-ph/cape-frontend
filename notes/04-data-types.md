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

**Used In**: Pipeline list dropdown, version selection

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
        encoding: string; // "cli-string" or "json"
        optionsFieldName: string; // Field name for params in submission
    };
    pipelineType: string;
    version: string;
    pipelineRunnable?: boolean; // Can this pipeline be executed?
    pipelineId?: string; // Unique identifier
}
```

**Used In**: Form generation, parameter validation

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

**Used In**: Dynamic form field generation in Submit component

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

**Used In**: Form rendering logic

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
