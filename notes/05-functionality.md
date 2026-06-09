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

### 3. Workflow Submission and Monitoring

**What**: Submit workflows and monitor their execution status in real-time

**User Workflow**:

1. Navigate to Workflows tab
2. Click "Submit" button to open submission form
3. Select workflow from dropdown (e.g., "Bactopia v3.2.0 and Kraken2")
4. Workflow profiles load automatically
5. Fill in required parameters for each stage (accordion UI)
6. Click "Submit Workflow" button
7. Button changes to "Submitting..." with a spinner and is disabled while the request is in flight
8. Automatically navigated to detail view of running workflow
9. Monitor progress via task instances table
10. Use "Back to workflow list" to see all submitted workflows

**Workflow List View**:

- Shows all submitted workflows (stored in browser cookie, 90-day retention)
- Each card displays:
    - Workflow name
    - Submission timestamp
    - Current state badge (running/success/failed)
    - Task progress (e.g., "✓ 2 / 5" with tri-color progress bar)
- Auto-refreshes every 30 seconds while workflows are running
- Manual refresh button available
- "View details" button navigates to detail view
- "Submit" button opens inline submission form

**Detail View**:

- Summary card with workflow metadata:
    - Run ID, State, Start/End times, Duration, Triggered by
- Task Instances table:
    - All tasks with state, start/end times, duration, try count
    - Updates via auto-refresh every 30 seconds
- Workflow Submission Details accordion:
    - Shows exact parameters submitted
    - One accordion per stage
    - Parameters displayed as key-value pairs
    - Only present for workflows submitted after this feature was added
- Manual refresh button (matching list view style)
- Halt button for running workflows
- Clear button for unavailable workflows
- Browser back button works (URL-based navigation)

**Parameter Form Generation**:

- Form fields dynamically generated from JSON Schema in PipelineProfile
- Supports: string, integer, number, boolean types
- Respects: `title`, `description`, `default`, `minimum`, `maximum`, `enum`
- Real-time validation before submission

**Submission Storage**:

- Workflow runs stored in browser cookie (`workflow_runs`)
- Includes: `dagId`, `dagRunId`, `submittedAt`, `submissionConfig`
- Submission config captures workflow name, stages, and parameter values
- Used for displaying submission details in detail view

**Navigation**:

- 3 main tabs: Upload, Workflows, Report
- Workflows view has 3 sub-states: list, submit, detail
- URL parameters sync navigation state (enables browser back/forward)
- Consolidated navigation (removed separate "Submit" top-level tab)

**Technical Details**:

**Workflow Selection**:

- Fetches available workflows from `/api/v1/dags` (filtered by `dag_id_prefix=workflows`)
- User selects workflow by display name

**Profile Loading**:

- Fetches profiles from `/api/v1/dags/{dagId}/dags`
- Each profile includes `parametersSchema` (JSON Schema) for form generation
- Multiple profiles = multi-stage workflow (one accordion per stage)

**Validation**:

- AJV compiles JSON Schema to validation function
- Form values validated before submission
- Coercion applied for numeric fields
- Shows validation errors in toast notifications

**Submission**:

- POST to `/workflows/trigger?dagId={dagId}`
- Payload: `{ "pipelineConfigs": [{ "pipelineId": "...", "nextflowOptions": { ... } }] }`
- Response: `{ dag_run_id, dag_id }`
- Submit button is disabled and shows a spinner while the POST request is pending
- Duplicate clicks during a pending submission are ignored
- Workflow run stored in cookie with submission config
- Auto-navigates to detail view

**Status Monitoring**:

- List view polls `/api/v1/dags/{dagId}/dagRuns/{dagRunId}` every 30s
- Detail view polls same endpoint + `/workflows/run/taskinstances` every 30s
- Only running/queued workflows auto-refresh
- Manual refresh available via button
- Live status stored in SvelteMap for reactivity

**State Management**:

- Cookie storage: `workflow_runs` (persistent, 90-day retention)
- Reactive state: `workflowRuns.svelte.ts` using SvelteMap
- Live status cache: `liveStatus` map (transient, per-session)
- Task instances: `SvelteMap<string, TaskInstance[]>` keyed by `{dagId}::{dagRunId}`

**Auto-Refresh Intervals**:

- List view: 30 seconds
- Detail view: 30 seconds
- Only active for running/queued workflows
- Manual refresh always available

**Implementation Files**:

- `Submit.svelte`: Workflow selection, multi-stage form, submission, storage
- `Status.svelte`: List view with cards, auto-refresh, cookie integration
- `StatusDetail.svelte`: Detail view with task table, submission details, auto-refresh
- `WorkflowRunCard.svelte`: Individual workflow card with progress display
- `HaltWorkflowModal.svelte`: Confirmation modal for halting workflows
- `pipeline.ts`: API client for workflows and profiles
- `workflowStatus.ts`: API client for workflow runs and task instances
- `workflowRunsStorage.ts`: Cookie persistence layer with SubmissionConfig type
- `workflowRuns.svelte.ts`: Reactive state management
- `schema.ts`: JSON Schema validation helpers

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
- Pressing Enter in the sample ID field submits the same request when the Load Report
  button is available
- Response format: `text/html`
- Response rendered directly in iframe

**Security**:

- Iframe uses `sandbox=""` attribute (most restrictive)
- Disables scripts, forms, plugins, popups in report HTML
- `referrerpolicy="no-referrer"` prevents leaking referrer
- Prevents malicious report content from affecting parent page

**Loading States**:

- Button text changes to "Loading Report..." while fetching report (replaces need for separate loading text)
- Button disabled during API call to prevent duplicate submissions
- Button re-enabled if user modifies sample ID input (allows cancellation and re-submission)
- Previous request automatically cancelled when new request submitted
- "No report loaded yet." displayed when idle (no previous report)
- Report iframe rendered when HTML received
- Error toast if fetch fails (cancelled requests do not show error)

**Request Cancellation**:

- Uses axios CancelToken to abort in-flight requests
- When user modifies input during loading, button becomes enabled
- Clicking button cancels previous request and starts new one
- Prevents wasting bandwidth on stale requests

**Responsive Width**:

- Report iframe fills full width of available space
- No artificial width constraints (previous `max-w-lg` removed)
- Horizontal scroll only appears if report HTML exceeds viewport width
- Width dynamically adjusts when browser window resized

**Implementation Files**:

- `Report.svelte`: Report loading and rendering

---

## UI Components

### Navbar

- Displays CAPE logo
- Shows authenticated user email
- Tab navigation (Upload, Workflows, Report)
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
- Error messages are mapped to the relevant stage field where possible
- Errors clear when the user edits the field

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

- All form inputs have accessible labels plus `id` and `name` attributes
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

### Schema Fetching

- Workflow profiles are fetched when workflow selection changes
- Stale profile responses are ignored if the user changes workflow before a request
  finishes
- Profile state is cleared immediately on workflow change so old forms cannot be
  submitted accidentally

### Lazy Loading

- Reports only loaded on user request
- HTML not rendered until fetch completes
- Iframe lazy loading attribute
