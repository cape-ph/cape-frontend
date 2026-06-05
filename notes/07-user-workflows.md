# User Workflows

## Workflow 1: First-Time User Authentication

**Goal**: User logs in to access the application

**Steps**:

1. User navigates to application URL (e.g., `http://localhost:3000`)
2. Application checks for existing authentication state in localStorage
3. No valid token found -> Displays "LoggingIn" component
4. User clicks "Log In" button
5. Browser redirects to AWS Cognito login page
6. User enters credentials (username + password)
7. User submits login form on Cognito page
8. Cognito validates credentials
9. Cognito redirects back to `/auth/callback?code=XXXXX`
10. Frontend exchanges authorization code for access token
11. Token stored in localStorage
12. User state updated in global `auth.user` reactive state
13. Application re-renders with authenticated UI (navbar + three tabs)
14. User lands on Upload tab by default

**Success State**: User sees application with navbar showing their email and three tabs

**Error States**:

- Invalid credentials -> Cognito shows error, user retries
- Network error -> User sees error toast, can retry
- Token exchange fails -> Error toast, redirected to login again

---

## Workflow 2: Uploading Sequencing Files

**Goal**: User uploads FASTQ files with sample metadata to S3

**Prerequisites**: User is authenticated

**Steps**:

1. User navigates to Upload tab (default on login)
2. User enters sample metadata in form:
    - **Sample ID**: Text input (e.g., "SAMPLE-001")
    - **Sample Type**: Text input (e.g., "isolate")
    - **Sample Matrix**: Text input (e.g., "blood")
    - **Sample Collection Location**: Text input (e.g., "Atlanta, GA")
    - **Sample Collection Date**: Date picker (defaults to today)
3. User adds FASTQ files via one of:
    - Drag and drop files onto upload zone
    - Click "Select files" button and choose from file picker
4. Files validate:
    - ✅ `.fastq` or `.fastq.gz` extension -> File added to list
    - ❌ Other extension -> Red error toast: "filename is not a _.fastq or _.fastq.gz file"
5. User sees list of accepted files with filenames
6. User clicks "Upload" button
7. Progress bar appears showing:
    - Percentage complete
    - "X MB / Y MB" bytes sent/total
8. Upload progresses:
    - TAR archive created in memory (streaming)
    - Archive chunked into 10MB pieces
    - Chunks uploaded to S3 via multipart upload
    - Progress bar updates per-chunk
9. Upload completes successfully
10. Green success toast: "Upload sample-{sampleId}.tar completed."
11. Upload state resets, user can start new upload

**Success State**: Files uploaded to S3 under `unprocessed/sample-{sampleId}.tar`, ready for processing

**Error States**:

- No files selected -> Red error toast: "No file selected"
- Network error during upload -> Red error toast with details, partial upload cleaned up
- User cancels upload -> Blue info toast: "Upload sample-{sampleId}.tar canceled.", partial upload cleaned up

**Variations**:

- Multiple files: All files bundled into single TAR archive
- Large files: Progress updates smoothly as chunks upload
- User can cancel: Click cancel button, triggers abort flow

---

## Workflow 3: Submitting and Monitoring a Workflow

**Goal**: User configures a workflow, submits it, and monitors its execution

**Prerequisites**: User is authenticated, has uploaded data needed by the selected workflow

**Steps**:

1. User navigates to Workflows tab (consolidated navigation)
2. User sees list of previously submitted workflows (if any)
3. User clicks "Submit" button to open inline submission form
4. User selects a workflow from the dropdown:
    - Dropdown is populated from `GET /workflows`
    - Displays human-readable workflow names
5. Frontend fetches workflow profiles:
    - `GET /workflows/pipelineprofiles?dagId={dagId}`
    - One profile per stage in the workflow
6. Stage forms appear as accordions (one per profile):
    - Required fields marked with an asterisk
    - Default values pre-filled
    - Fields generated from JSON Schema
7. User fills in parameters for each stage:
    - Text inputs for strings
    - Number inputs for integers/numbers
    - Checkboxes for booleans
    - Dropdowns for enum fields
8. User clicks "Submit Workflow" button
9. Frontend validates all stages against JSON Schema:
    - Valid → POST to `/workflows/trigger?dagId={dagId}`
    - Invalid → Error toast with validation message
10. Workflow submitted successfully:
    - Response includes `dag_run_id` and `dag_id`
    - Workflow run stored in browser cookie with submission config
    - User automatically navigated to detail view
11. User sees detail view with:
    - Workflow summary (Run ID, State, Times, Duration)
    - Task Instances table showing all tasks
    - Workflow Submission Details accordion showing submitted parameters
    - Auto-refresh indicator: "Auto-refreshes every 30s"
    - Manual refresh button
    - Halt button (for running workflows)
12. Detail view auto-refreshes every 30 seconds while workflow is running
13. User can manually refresh at any time via refresh button
14. User clicks "Back to workflow list" to see all workflows
15. List view shows the newly submitted workflow with:
    - Workflow name and submission timestamp
    - Current state badge (e.g., "Running")
    - Task progress (e.g., "✓ 2 / 5" with progress bar)
16. List view auto-refreshes every 30 seconds for running workflows
17. User can click "View details" to return to detail view
18. When workflow completes:
    - State updates to "Success" or "Failed"
    - Auto-refresh stops
    - Task instances show final states

**Success State**: Workflow submitted and monitored until completion, user can review submission details and task execution

**Error States**:

- No workflow selected → Submit button disabled
- Profile fetch fails → Error toast and no stage forms remain
- Validation fails → Error toast with field details
- Submission fails → Error toast with details, workflow not stored
- Status fetch fails → Error indicator in UI, auto-refresh continues

**Key User Benefits**:

- Dynamic form generation from backend schemas (no hardcoded parameters)
- Automatic navigation to detail view after submission
- Real-time monitoring with auto-refresh
- Manual refresh always available
- Submission details preserved for review
- Browser back button works (URL-based navigation)
- Multiple workflows can be monitored simultaneously
- Task progress visible at a glance in list view

**Navigation Flow**:

- Workflows tab → Submit (inline form) → Detail view → Back to list
- Detail view URL: `/?tab=workflows&view=detail&dagId=...&dagRunId=...`
- Browser back/forward buttons work correctly
- Direct URL access works (state restored from URL params)

---

## Workflow 4: Viewing Analysis Reports

**Goal**: User views an HTML report for a processed sample

**Prerequisites**: User is authenticated, sample has been processed and report generated

**Steps**:

1. User navigates to Report tab
2. User sees report viewer interface with:
    - Sample ID input field
    - "Load Report" button
    - Empty iframe placeholder
3. User enters sample ID in text input (e.g., "SAMPLE-001")
4. User clicks "Load Report" button
5. "Loading..." message appears
6. Frontend requests report from API:
    - `GET /report/create?sampleId=SAMPLE-001&reportId=bactopia-single-sample-analysis&format=html`
7. Report HTML returned from API
8. HTML rendered in sandboxed iframe
9. User scrolls through report content
10. User can view charts, tables, text in report

**Success State**: Report displayed in iframe, user can review analysis results

**Error States**:

- No sample ID entered -> Red error toast: "Missing a sample id."
- Sample ID not found -> Red error toast: "Failed to load report: [error details]"
- Network error -> Red error toast with details
- Report not yet generated -> API error explaining report not ready

**Security Notes**:

- Iframe has `sandbox=""` attribute (no scripts, no forms, no plugins)
- Report content cannot access parent page or make requests
- Safe to display potentially malicious HTML from untrusted sources

**Limitations**:

- Report ID hardcoded to "bactopia-single-sample-analysis" (not user-configurable)
- No report list/search functionality (user must know sample ID)

---

## Workflow 5: Returning User (Already Authenticated)

**Goal**: Authenticated user returns to application

**Steps**:

1. User navigates to application URL
2. Application checks localStorage for OIDC tokens
3. Valid token found -> User state restored from localStorage
4. Application renders immediately with authenticated UI
5. User sees their email in navbar
6. User can navigate between tabs and use all features

**Success State**: Seamless return, no re-authentication required

**Error States**:

- Token expired -> Application detects expiration, user redirected to login
- Token invalid -> Login flow triggered again

**Token Lifetime**:

- Access tokens typically expire after 1 hour (configurable in Cognito)
- Refresh tokens can extend session (if configured)
- User may need to re-authenticate after extended inactivity

---

## Workflow 6: Logout

**Goal**: User logs out of application

**Steps**:

1. User clicks logout button in navbar (implementation not shown in code, but typical)
2. Frontend clears tokens from localStorage
3. `auth.user` set to `undefined`
4. Application re-renders with LoggingIn component
5. User sees login screen again

**Success State**: User logged out, tokens cleared, must re-authenticate to access app

---

## Common User Errors and Recovery

### Error: File Upload Fails Mid-Transfer

**Symptoms**: Upload progress stops, error toast appears

**Recovery**:

1. Check error message in toast
2. If network issue: Check internet connection, retry upload
3. If server error: Wait a moment, retry upload
4. Partial upload automatically cleaned up (no manual action needed)

### Error: Workflow Preview Validation Fails

**Symptoms**: Red error toast with validation message

**Recovery**:

1. Read error message (includes field path and constraint)
2. Find problematic field in form
3. Correct value to meet constraint
4. Click Submit again

### Error: Report Not Loading

**Symptoms**: Error toast after clicking "Load Report"

**Recovery**:

1. Verify sample ID is correct (check spelling, case sensitivity)
2. Ensure sample has been processed (may need to check separately)
3. Wait if processing is in progress
4. Contact administrator if sample should have report but doesn't

### Error: Session Expired

**Symptoms**: Redirect to login page unexpectedly

**Recovery**:

1. Log in again with credentials
2. Resume work (uploads/submissions not persisted, must restart)

---

## User Experience Considerations

### Responsiveness

- All API calls show loading indicators or progress
- No silent failures (all errors surfaced to user)
- Toast notifications auto-dismiss after few seconds

### Feedback Loops

- Inline validation feedback on Submit form fields
- Advanced JSON preview in Submit tab
- Per-chunk progress in file uploads
- Clear success/error messages

### Error Handling

- Error messages are user-friendly (not raw error codes)
- Suggest actions when possible ("Select a pipeline first")
- Console logs preserve technical details for debugging

### Navigation

- Three main tabs always visible in navbar: Upload, Workflows, Report
- Workflows tab has consolidated navigation (no separate Submit tab)
- Active tab highlighted
- Browser back/forward buttons work (URL-based navigation)
- URL parameters sync navigation state:
    - Upload: `/?tab=upload`
    - Workflows list: `/?tab=workflows`
    - Workflows submit: `/?tab=workflows&view=submit`
    - Workflows detail: `/?tab=workflows&view=detail&dagId=...&dagRunId=...`
    - Report: `/?tab=report`
- Page refresh restores state from URL
- SPA navigation (no page reloads)

### Workflow Monitoring

- Submitted workflows persist in browser cookie (90-day retention)
- List view shows all submitted workflows with current state
- Auto-refresh every 30 seconds for running workflows
- Manual refresh button available in both list and detail views
- Task progress visible in list view cards
- Detail view shows complete task execution history
- Submission details preserved and reviewable
