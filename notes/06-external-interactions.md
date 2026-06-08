# External Interactions

## Authentication Provider

### AWS Cognito

**Service**: AWS Cognito User Pools (OIDC/OAuth 2.0 provider)

**Configuration** (via environment variables):

- `PUBLIC_COGNITO_AUTHORITY`: Cognito authority URL (e.g., `https://cognito-idp.us-east-1.amazonaws.com/us-east-1_XXXXX`)
- `PUBLIC_COGNITO_CLIENT_ID`: OAuth client ID
- `PUBLIC_COGNITO_REDIRECT_URI`: Callback URL (e.g., `http://localhost:3000/auth/callback`)

**Flow**:

1. User redirects to Cognito login page
2. User authenticates with username/password
3. Cognito redirects to callback URL with authorization code
4. Frontend exchanges code for tokens (access_token, id_token)
5. Tokens stored in browser localStorage
6. Tokens used for subsequent API requests (assumed, not explicitly shown)

**Token Storage**:

- Uses `WebStorageStateStore` from `oidc-client-ts`
- Stores in `window.localStorage`
- Persists across browser sessions
- Tokens include expiration timestamps

**Security**:

- HTTPS required in production
- PKCE flow (recommended for SPAs, oidc-client-ts default)
- No client secret exposed (public client)

---

## CAPE API

### Base URL

- **Development**: `https://api.cape-dev.org/capi-dev`
- Configurable via environment variable `API_BASE`

### Endpoints Used

1. **Pipeline Management** (`/dap/*`):
    - List available pipelines
    - Fetch pipeline profiles with parameter schemas
    - Submit pipeline jobs

2. **Report Generation** (`/report/*`):
    - Generate HTML reports for samples

3. **Object Storage** (`/objstorage/*`):
    - S3-compatible multipart upload proxy
    - Provides presigned URLs for direct S3 upload

### Authentication

- Assumed to use bearer token from Cognito (not explicitly shown in code)
- All requests made via axios (can inject auth headers globally)

### Request Characteristics

- **Content-Type**: `application/json` (most endpoints)
- **Response Format**: JSON (except reports: HTML, MPU responses: XML)
- **Error Handling**: Standard HTTP status codes (4xx, 5xx)

---

## AWS S3

### Interaction Model

- **Indirect**: Frontend does not call S3 directly
- **Proxy Pattern**: CAPE API provides presigned URLs for S3 operations
- Frontend uploads to presigned URLs (direct to S3, bypassing API)

### Upload Flow

```
Frontend -> CAPE API /objstorage/creatempu
         <- uploadId

Frontend -> CAPE API /objstorage/parturls
         <- presigned URLs (one per chunk)

Frontend -> S3 presigned URL (PUT)
         <- ETag per chunk

Frontend -> CAPE API /objstorage/completempu
         <- final upload result
```

**Why Presigned URLs**:

- Reduces load on API server (large file data bypasses it)
- S3 handles retries, bandwidth throttling
- API maintains control (generates URLs with time limits, permissions)

**Bucket Configuration**:

- Development bucket: `ccd-dlh-t-seqauto-input-raw-vbkt-s3-b8fded5` (input files)
- Output bucket: `ccd-dlh-t-seqauto-result-raw-vbkt-s3-1e80821` (pipeline outputs)
- Hardcoded in component props (not environment variables)

**Object Key Pattern**:

- Uploads: `unprocessed/{filename}` (e.g., `unprocessed/sample-001.tar`)
- Outputs: Specified in pipeline submission `outputPath` parameter

---

## Browser APIs

### LocalStorage

- **Purpose**: OIDC token persistence
- **Keys**: Managed by `oidc-client-ts` library
- **Contents**: Access token, ID token, user profile, expiration timestamps
- **Lifetime**: Persists until token expiration or logout

### File API

- **Purpose**: Reading local files for upload
- **Usage**:
    - `File` objects from file input or drag/drop
    - `file.stream()` creates ReadableStream for streaming
    - `file.size` used for TAR size calculation

### Streams API

- **Purpose**: Efficiently processing large files without loading into memory
- **Usage**:
    - ReadableStream from File API
    - Converted to Node.js Readable stream via readable-stream polyfill
    - Chunked via custom async generator

### AbortController

- **Purpose**: Canceling in-flight HTTP requests
- **Usage**:
    - Created per-upload
    - Passed to axios as `signal`
    - Triggers abort on user cancel or component unmount
    - Cleanup (abort MPU) always attempted

---

## External Libraries

### oidc-client-ts

- **Purpose**: OIDC/OAuth 2.0 client library
- **Features Used**:
    - UserManager: Handles OIDC flow
    - WebStorageStateStore: Token persistence
    - Automatic token refresh (if configured)

### axios

- **Purpose**: HTTP client
- **Features Used**:
    - GET/POST/PUT/DELETE requests
    - Request/response interceptors (not shown, but available)
    - Upload progress tracking (`onUploadProgress`)
    - Request cancellation via AbortSignal
    - Retry logic implemented manually (not built-in)

### tar-stream

- **Purpose**: TAR archive creation
- **Features Used**:
    - `tar.pack()`: Create TAR stream
    - `pack.entry()`: Add files to archive
    - Streaming API (no in-memory buffer)

### fast-xml-parser

- **Purpose**: Parse XML responses from S3 multipart upload APIs
- **Features Used**:
    - Parse InitiateMultipartUploadResult
    - Parse CompleteMultipartUploadResult
    - Extract fields (UploadId, ETag, Location, etc.)

### ajv

- **Purpose**: JSON Schema validation
- **Features Used**:
    - Schema compilation (`ajv.compile()`)
    - Validation (`validate()` function)
    - Error formatting (`ajv.errors`)
    - Strict mode disabled for flexibility

### Skeleton UI

- **Purpose**: UI component library
- **Features Used**:
    - FileUpload component (file picker with drag/drop)
    - Button styles
    - Form controls
    - Toast notifications

---

## Network Characteristics

### Upload Bandwidth

- **Chunked**: 10MB chunks uploaded in sequence
- **Retry**: Up to 3 retries per chunk on transient failures
- **Backoff**: Exponential (300ms \* 2^(attempt-1) + jitter)
- **Parallelism**: Single chunk at a time (no parallel chunk uploads)

### Request Timeouts

- **Default**: No explicit timeout (browser/axios defaults)
- **Abort MPU**: 15 second timeout
- **Long Operations**: User can cancel via UI

### CORS

- **Requirement**: CAPE API and S3 must allow cross-origin requests from frontend domain
- **Headers**: Assumed properly configured (not shown in code)

---

## Environment Dependencies

### Required at Build Time

- Node.js environment variables prefixed with `PUBLIC_`
- SvelteKit exposes these to browser via `$env/dynamic/public`

### Required at Runtime

- AWS Cognito accessible from user's browser
- CAPE API accessible from user's browser
- S3 presigned URLs accessible from user's browser
- Modern browser with ES2020+ support (async iterators, streams)

### Browser Requirements

- **LocalStorage**: Must be enabled for authentication
- **Cookies**: May be required for OIDC flow (not explicit in code)
- **JavaScript**: Required (no SSR fallback)
- **CORS**: Browser must allow cross-origin requests to API/S3
