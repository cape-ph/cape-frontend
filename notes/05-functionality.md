# Application Functionality

## Core Features

### 1. Authentication

**What**: AWS Cognito-based authentication via OIDC protocol

**How It Works**:

1. User clicks login button (triggers OIDC flow)
2. Redirected to Cognito authorization endpoint
3. User authenticates with credentials
4. Cognito redirects back to `/auth/callback` with authorization code
5. Frontend exchanges code for access token
6. User stored in global `auth.user` reactive state
7. Application renders authenticated UI

**Implementation**:

- `cognito.ts`: UserManager configuration
- `user.svelte.ts`: Global auth state
- `routes/auth/callback/+page.svelte`: OAuth callback handler
- `routes/+page.svelte`: Conditional rendering based on `auth.user`

**Security**:

- Tokens stored in browser localStorage
- All API requests must include authentication (assumed, not explicitly shown in code)
- No sensitive data persisted client-side beyond tokens

---

### 2. File Upload

**What**: Upload FASTQ sequencing files with sample metadata to S3 storage

**User Workflow**:

1. Navigate to Upload tab
2. Drag/drop or select .fastq or .fastq.gz files
3. Enter sample metadata:
    - Sample ID (required)
    - Sample Type
    - Sample Matrix
    - Sample Collection Location
    - Sample Collection Date
4. Click Upload button
5. Monitor progress bar
6. Receive success/error notification

**Technical Implementation**:

**File Validation**:

- Only .fastq and .fastq.gz files accepted
- Validation happens client-side before upload
- Rejected files trigger error toast

**TAR Archive Creation**:

1. Sample metadata serialized to `meta.json`
2. TAR archive created with structure:
    ```
    sample-{sampleId}.tar
    ├── meta.json
    └── sequencing/
        ├── file1.fastq.gz
        └── file2.fastq.gz
    ```
3. TAR size pre-calculated for progress tracking
4. Archive created as stream (no full in-memory buffer)

**Chunked Upload**:

1. TAR stream chunked into 10MB pieces
2. S3 multipart upload initiated (get `uploadId`)
3. Request presigned URLs for all chunks
4. Upload chunks in parallel via presigned URLs
5. Each chunk uploaded with retry logic (up to 3 attempts)
6. Exponential backoff on retries
7. Complete multipart upload when all chunks finish
8. Progress updated per-chunk and surfaced to UI

**Upload Cancellation**:

- User can cancel via AbortController
- Triggers abort multipart upload API call
- Partial uploads cleaned up on S3

**Error Handling**:

- Network errors: Automatic retry with backoff
- HTTP 5xx, 429, 408: Automatic retry
- Other errors: Display error toast, log to console
- Cleanup always attempted (abort MPU) on failure

**Implementation Files**:

- `FileUpload.svelte`: UI and orchestration
- `FileUploadProgress.svelte`: Progress bar component
- `stream.ts`: TAR archive utilities
- `mpu.ts`: Multipart upload logic

---

### 3. Pipeline Submission

**What**: Submit bioinformatics analysis pipelines with dynamically generated parameter forms

**User Workflow**:

1. Navigate to Submit tab
2. Select pipeline name from dropdown
3. Select pipeline version from dropdown
4. Form fields appear based on pipeline's parameter schema
5. Fill in required/optional parameters
6. View JSON preview of submission
7. Click Submit button
8. Receive success/error notification

**Schema-Driven Form Generation**:

The form is **not hardcoded**. Instead:

1. When user selects pipeline version, frontend fetches `PipelineProfile`
2. `PipelineProfile.parametersSchema` is a JSON Schema object
3. Component introspects schema properties to determine field types
4. Form fields generated dynamically:

**Field Type Mapping**:

```typescript
// String with enum -> Select dropdown
{ type: "string", enum: ["option1", "option2"] }

// Boolean -> Checkbox
{ type: "boolean" }

// Integer/Number -> Number input with min/max/step
{ type: "integer", minimum: 0, maximum: 100 }

// String (default) -> Text input
{ type: "string" }

// Readonly (has const) -> Readonly text input
{ const: "fixed-value" }
```

**Default Values**:

- `default` property in schema -> pre-filled in form
- `const` property in schema -> readonly, user cannot change
- Boolean fields without default -> default to `false`
- Other fields without default -> empty string

**Validation**:

- Schema compiled to AJV validation function
- Validation happens before submission
- If validation fails, error displayed via toast
- No submission occurs until validation passes

**Serialization**:

Two encoding modes (determined by `submission.encoding` in profile):

1. **CLI String** (`cli-string`):

    ```json
    {
        "pipelineName": "bactopia",
        "pipelineVersion": "3.1.0",
        "outputPath": "s3://bucket/path",
        "options": "--genome_size 5.0 --min_contig_length 500"
    }
    ```

2. **JSON** (other values):
    ```json
    {
        "pipelineName": "bactopia",
        "pipelineVersion": "3.1.0",
        "outputPath": "s3://bucket/path",
        "parameters": {
            "--genome_size": "5.0",
            "--min_contig_length": 500
        }
    }
    ```

**JSON Preview**:

- Real-time preview of submission JSON
- Updates as user fills form
- Helps users understand what will be submitted

**Pipeline Runnable Flag**:

- `pipelineRunnable: false` in profile -> Submit button disabled
- Tooltip explains why submission disabled

**Implementation Files**:

- `Submit.svelte`: Form generation and submission logic
- `pipeline.ts`: API client and AJV validation

---

### 4. Report Viewing

**What**: View HTML reports for processed samples

**User Workflow**:

1. Navigate to Report tab
2. Enter sample ID
3. Click Load Report button
4. HTML report loads in sandboxed iframe
5. Scroll/interact with report content

**Technical Details**:

**Report Request**:

- Sample ID + Report ID (hardcoded: "bactopia-single-sample-analysis") sent to API
- Response format: `text/html`
- Response rendered directly in iframe

**Security**:

- Iframe uses `sandbox=""` attribute (most restrictive)
- Disables scripts, forms, plugins, popups in report HTML
- `referrerpolicy="no-referrer"` prevents leaking referrer
- Prevents malicious report content from affecting parent page

**Loading States**:

- "Loading..." message while fetching
- "No report loaded yet." when idle
- Report rendered when available
- Error toast if fetch fails

**Implementation Files**:

- `Report.svelte`: Report loading and rendering

---

## UI Components

### Navbar

- Displays CAPE logo
- Shows authenticated user email
- Tab navigation (Upload, Submit, Report)
- Logout functionality

### FileUploadProgress

- Progress bar with percentage
- Bytes sent / total bytes display
- Visual feedback during upload

### LoggingIn

- Displayed when user not authenticated
- Triggers OIDC login flow

### Toast Notifications

- Success: Green, checkmark icon
- Error: Red, X icon
- Info: Blue, info icon
- Auto-dismiss after timeout
- Used for all user feedback (upload status, submission results, errors)

---

## Validation & Error Handling

### File Validation

- Extension check (.fastq or .fastq.gz only)
- Client-side validation before upload
- Clear error messages for rejected files

### Parameter Validation

- Schema-based validation via AJV
- Validates required fields, types, ranges, enums
- Error messages formatted with field path + constraint
- Example: `(root)/--genome_size is required`

### Network Error Handling

- Axios HTTP errors caught and displayed
- Network failures trigger retry with backoff
- User notified of all errors via toast
- Errors logged to console for debugging

### Upload Error Recovery

- Multipart upload automatically retries failed chunks
- Exponential backoff prevents overwhelming server
- Abort API always called on failure (cleanup partial uploads)
- User can manually cancel uploads

---

## Accessibility

- All form inputs have `aria-label` attributes
- Buttons have `aria-describedby` for disabled state tooltips
- Semantic HTML (nav, main, section, label)
- Keyboard navigation support
- Focus management in modals/dropdowns (via Skeleton UI)

---

## Performance Considerations

### Streaming Architecture

- TAR archives created as streams, not in-memory buffers
- Chunks yielded incrementally to upload function
- Prevents memory exhaustion for large file sets

### Progress Tracking

- Per-chunk progress updates
- UI only re-renders when progress state changes (Svelte reactivity)
- No performance degradation for large uploads

### Schema Caching

- Pipeline profiles cached between form updates
- Only re-fetches on pipeline/version change
- Prevents unnecessary API calls

### Lazy Loading

- Reports only loaded on user request
- HTML not rendered until fetch completes
- Iframe lazy loading attribute
