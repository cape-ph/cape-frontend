# Submit Page - Complete Walkthrough

**Archived note (2026-06-03)**: This walkthrough describes the earlier
single-pipeline Submit page that fetched `/dap/pipelines`, selected a pipeline/version,
and posted to `/dap/submit`. The current Submit page is workflow-based: it fetches
`/workflows`, loads an ordered profile array from `/workflows/pipelineprofiles`, renders
one stage form per profile, validates with `src/lib/schema.ts`, and keeps
`/workflows/trigger` preview-only. Treat the detailed trace below as historical context
until this document is fully rewritten.

A detailed trace of the Submit page lifecycle from initial load through form submission.

---

## Phase 1: Page Navigation & Initial Load

### 1.1 User Navigates to Submit Tab

**Trigger**: User clicks "Submit" in the navbar

**What Happens**:

```svelte
// In routes/+page.svelte
function onSelect(key: string) {
    activeKey = key;  // Set to 'submit'
}
```

**Result**:

- `activeKey` state updates from 'upload' to 'submit'
- Svelte reactivity triggers re-render
- Submit component mounts and renders

### 1.2 Component Initialization

**Mount Sequence**:

```svelte
// Submit.svelte instantiates with props
<Submit
    baseUrl="https://api.cape-dev.org/capi-dev"
    bucketURI="s3://ccd-dlh-t-seqauto-result-raw-vbkt-s3-1e80821/pipeline-output"
/>
```

**Initial State Creation** (via `$state()`):

```typescript
let pipelines = $state<Pipeline[]>(); // undefined (will fetch)
let profile = $state<PipelineProfile>(); // undefined (will fetch later)
let selectedProfileKey = $state(''); // empty string
let pipelineName = $state(''); // empty string
let pipelineVersion = $state(''); // empty string
let outputPath = $state(''); // empty string
let outputPathInitialized = $state(false); // false
const options = $state<Record<string, unknown>>({}); // empty object
```

### 1.3 Fetch Available Pipelines (onMount)

**Trigger**: Component mounted

```typescript
onMount(updatePipelines);
```

**API Call**:

```typescript
async function updatePipelines() {
    try {
        pipelines = await getPipelines(baseUrl);
        // GET https://api.cape-dev.org/capi-dev/dap/pipelines
    } catch (err) {
        pipelines = undefined;
        toaster.error({ title: `An error occurred while reading the pipelines: ${message}` });
    }
}
```

**Response Example**:

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
    },
    {
        "pipeline_name": "viral-assembly",
        "pipeline_type": "nextflow",
        "project": "viral-genomics",
        "version": "2.1.0"
    }
]
```

**State Update**:

```typescript
pipelines = [
    /* array from API */
];
```

### 1.4 Process Pipeline Data (Derived State)

**Grouping by Name** (via `$derived()`):

```typescript
const pipelineChoices = $derived(pipelines ? groupPipelines(pipelines) : {});

function groupPipelines(pipelines: Pipeline[]): Record<string, Record<string, Pipeline>> {
    return pipelines.reduce(
        (acc, p) => {
            const name = p.pipeline_name;
            const version = p.version;
            if (!acc[name]) {
                acc[name] = {};
            }
            acc[name][version] = p;
            return acc;
        },
        {} as Record<string, Record<string, Pipeline>>
    );
}
```

**Result Structure**:

```typescript
{
    "bactopia": {
        "3.1.0": { pipeline_name: "bactopia", version: "3.1.0", ... },
        "3.0.1": { pipeline_name: "bactopia", version: "3.0.1", ... }
    },
    "viral-assembly": {
        "2.1.0": { pipeline_name: "viral-assembly", version: "2.1.0", ... }
    }
}
```

### 1.5 Initialize Output Path ($effect)

**Effect Runs**:

```typescript
$effect(() => {
    if (!outputPathInitialized) {
        outputPath = bucketURI; // "s3://ccd-dlh-t-seqauto-result-raw-vbkt-s3-1e80821/pipeline-output"
        outputPathInitialized = true;
    }
});
```

**Result**: `outputPath` pre-filled with default S3 bucket URI

### 1.6 Initial Render Complete

**User Sees**:

```
┌─────────────────────────────────────┐
│ Submit Pipeline                     │
├─────────────────────────────────────┤
│ Pipeline                            │
│ ┌─────────────────────────────────┐ │
│ │ pipelineName                    │ │
│ │ Select a pipeline...        ▼   │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ pipelineVersion                 │ │
│ │ Select a pipeline first     ▼   │ │  (disabled)
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ outputPath                      │ │
│ │ s3://ccd-dlh-t-seqauto-res...   │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ JSON                                │
│ ┌─────────────────────────────────┐ │
│ │ {                               │ │
│ │   "pipelineName": "",           │ │
│ │   "pipelineVersion": "",        │ │
│ │   "outputPath": "s3://..."      │ │
│ │ }                               │ │
│ └─────────────────────────────────┘ │
├─────────────────────────────────────┤
│ [ Submit ]  (disabled)              │
└─────────────────────────────────────┘
```

---

## Phase 2: User Selects Pipeline Name

### 2.1 User Opens Dropdown

**User Action**: Clicks on "pipelineName" dropdown

**Dropdown Populated From**:

```svelte
{#each Object.keys(pipelineChoices) as name (name)}
    <option value={name}>{name}</option>
{/each}
```

**User Sees**:

```
Select a pipeline...
--------------------
bactopia
viral-assembly
```

### 2.2 User Selects Pipeline

**User Action**: Clicks "bactopia"

**State Update**:

```typescript
pipelineName = 'bactopia';
```

### 2.3 Version Dropdown Activates (Derived State)

**Reactive Computation**:

```typescript
const pipelineVersionChoices = $derived(
    pipelineName && pipelineChoices ? Object.keys(pipelineChoices[pipelineName] ?? {}) : []
);
// Result: ["3.1.0", "3.0.1"]
```

**Version Dropdown Updates**:

- `disabled` attribute removed
- Populated with versions for "bactopia"

**User Now Sees**:

```
┌─────────────────────────────────────┐
│ pipelineName                        │
│ bactopia                        ▼   │
└─────────────────────────────────────┘
┌─────────────────────────────────────┐
│ pipelineVersion                     │
│ Select a version...             ▼   │  (NOW ENABLED)
└─────────────────────────────────────┘
```

### 2.4 Version Cleanup Effect

**Effect Runs**:

```typescript
$effect(() => {
    if (!pipelineVersionChoices.includes(pipelineVersion)) {
        pipelineVersion = ''; // Reset if current version invalid
    }
});
```

**Why**: If user had selected version "3.1.0" for one pipeline, then switched to a different pipeline that doesn't have "3.1.0", this resets the version selection.

---

## Phase 3: User Selects Pipeline Version

### 3.1 User Opens Version Dropdown

**User Action**: Clicks "pipelineVersion" dropdown

**User Sees**:

```
Select a version...
-------------------
3.1.0
3.0.1
```

### 3.2 User Selects Version

**User Action**: Clicks "3.1.0"

**State Update**:

```typescript
pipelineVersion = '3.1.0';
```

### 3.3 Pipeline Object Derived

**Reactive Computation**:

```typescript
const pipeline = $derived(
    pipelineName && pipelineVersion ? pipelineChoices[pipelineName]?.[pipelineVersion] : undefined
);
```

**Result**:

```typescript
pipeline = {
    pipeline_name: 'bactopia',
    pipeline_type: 'nextflow',
    project: 'bacterial-genomics',
    version: '3.1.0'
};
```

### 3.4 Profile Fetch Effect Triggers

**Effect Runs**:

```typescript
$effect(() => {
    updateProfile(pipeline); // Called because pipeline derived value changed
});
```

**API Call**:

```typescript
async function updateProfile(pipeline: Pipeline | undefined) {
    if (!pipeline) {
        profile = undefined;
        selectedProfileKey = '';
        setOptions({});
        return;
    }

    try {
        const newProfile = await getPipelineProfile(baseUrl, pipeline);
        // GET https://api.cape-dev.org/capi-dev/dap/pipelineprofile
        //     ?pipeline=bactopia&version=3.1.0

        profile = newProfile;
        initializeOptions(newProfile);
    } catch (err) {
        profile = undefined;
        selectedProfileKey = '';
        setOptions({});
        toaster.error({
            title: `An error occurred while reading the pipeline profile: ${message}`
        });
    }
}
```

**Response Example**:

```json
{
    "parametersSchema": {
        "type": "object",
        "properties": {
            "--genome_size": {
                "type": "string",
                "title": "Genome Size (Mb)",
                "description": "Expected genome size in megabases",
                "default": "5.0"
            },
            "--min_contig_length": {
                "type": "integer",
                "title": "Minimum Contig Length",
                "description": "Contigs shorter than this will be filtered",
                "minimum": 200,
                "maximum": 10000,
                "default": 500
            },
            "--coverage_depth": {
                "type": "number",
                "title": "Target Coverage Depth",
                "minimum": 1.0,
                "step": 0.1
            },
            "--skip_assembly": {
                "type": "boolean",
                "title": "Skip Assembly Step",
                "default": false
            },
            "--assembly_mode": {
                "type": "string",
                "title": "Assembly Mode",
                "enum": ["careful", "fast", "meta"],
                "default": "careful"
            }
        },
        "required": ["--genome_size", "--min_contig_length"]
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

**State Update**:

```typescript
profile = newProfile;
```

---

## Phase 4: Dynamic Form Generation

### 4.1 Initialize Form Options

**Function Call**:

```typescript
function initializeOptions(profile: PipelineProfile) {
    const nextProfileKey = `${profile.pipelineName}:${profile.version}:${profile.pipelineId ?? ''}`;
    // "bactopia:3.1.0:bactopia-3.1.0-abc123"

    if (nextProfileKey === selectedProfileKey) {
        return; // Already initialized, skip
    }

    selectedProfileKey = nextProfileKey;
    setOptions(getDefaultOptions(profile.parametersSchema));
}
```

**Extract Defaults from Schema**:

```typescript
function getDefaultOptions(schema: unknown): Record<string, unknown> {
    const defaults: Record<string, unknown> = {};

    for (const field of getParameterFields(schema)) {
        if ('default' in field.schema) {
            defaults[field.key] = field.schema.default;
        } else if ('const' in field.schema) {
            defaults[field.key] = field.schema.const;
        } else if (field.schema.type === 'boolean') {
            defaults[field.key] = false;
        } else {
            defaults[field.key] = '';
        }
    }

    return defaults;
}
```

**Result**:

```typescript
options = {
    '--genome_size': '5.0', // from default
    '--min_contig_length': 500, // from default
    '--coverage_depth': '', // no default, empty string
    '--skip_assembly': false, // from default
    '--assembly_mode': 'careful' // from default
};
```

### 4.2 Generate Parameter Fields (Derived State)

**Schema Introspection**:

```typescript
const schema = $derived(profile?.parametersSchema);
const parameterFields = $derived(getParameterFields(schema));

function getParameterFields(schema: unknown): ParameterField[] {
    if (!schema || typeof schema !== 'object') {
        return [];
    }

    const s = schema as {
        properties?: Record<string, SchemaProperty>;
        required?: string[];
    };

    return Object.entries(s.properties ?? {}).map(([key, propertySchema]) => ({
        key,
        label: getFieldLabel(key, propertySchema),
        schema: propertySchema,
        required: s.required?.includes(key) ?? false,
        readonly: 'const' in propertySchema
    }));
}
```

**Result**:

```typescript
parameterFields = [
    {
        key: '--genome_size',
        label: 'Genome Size (Mb)',
        schema: { type: 'string', title: 'Genome Size (Mb)', description: '...', default: '5.0' },
        required: true,
        readonly: false
    },
    {
        key: '--min_contig_length',
        label: 'Minimum Contig Length',
        schema: { type: 'integer', title: '...', minimum: 200, maximum: 10000, default: 500 },
        required: true,
        readonly: false
    },
    {
        key: '--coverage_depth',
        label: 'Target Coverage Depth',
        schema: { type: 'number', title: '...', minimum: 1.0, step: 0.1 },
        required: false,
        readonly: false
    },
    {
        key: '--skip_assembly',
        label: 'Skip Assembly Step',
        schema: { type: 'boolean', title: '...', default: false },
        required: false,
        readonly: false
    },
    {
        key: '--assembly_mode',
        label: 'Assembly Mode',
        schema: {
            type: 'string',
            title: '...',
            enum: ['careful', 'fast', 'meta'],
            default: 'careful'
        },
        required: false,
        readonly: false
    }
];
```

### 4.3 Render Dynamic Form Fields

**For Each Field**:

```svelte
{#each parameterFields as field (field.key)}
    <label class="flex flex-col gap-1">
        <span class="text-xs opacity-70">
            {field.label}{field.required ? ' *' : ''}
        </span>

        {#if field.schema.enum}
            <!-- DROPDOWN for enum fields -->
            <select class="select select-bordered" ...>
                {#each field.schema.enum as option}
                    <option value={asString(option)}>{asString(option)}</option>
                {/each}
            </select>
        {:else if field.schema.type === 'boolean' && !field.readonly}
            <!-- CHECKBOX for boolean fields -->
            <input class="checkbox" type="checkbox" ... />
        {:else if field.schema.type === 'integer' || field.schema.type === 'number'}
            <!-- NUMBER INPUT for numeric fields -->
            <input
                class="input input-bordered"
                type="number"
                min={getMin(field.schema)}
                max={getMax(field.schema)}
                step={field.schema.type === 'integer' ? 1 : (field.schema.step ?? 'any')}
                ...
            />
        {:else}
            <!-- TEXT INPUT for string fields (default) -->
            <input class="input input-bordered" type="text" ... />
        {/if}

        {#if field.schema.description}
            <span class="text-xs opacity-60">{field.schema.description}</span>
        {/if}
    </label>
{/each}
```

**User Now Sees Parameters Section**:

```
┌─────────────────────────────────────────────────┐
│ Parameters                                      │
│ Bacterial genome assembly and analysis pipeline │
├─────────────────────────────────────────────────┤
│ Genome Size (Mb) *                              │
│ ┌─────────────────────────────────────────────┐ │
│ │ 5.0                                         │ │
│ └─────────────────────────────────────────────┘ │
│ Expected genome size in megabases               │
│                                                 │
│ Minimum Contig Length *                         │
│ ┌─────────────────────────────────────────────┐ │
│ │ 500                                         │ │
│ └─────────────────────────────────────────────┘ │
│ Contigs shorter than this will be filtered      │
│                                                 │
│ Target Coverage Depth                           │
│ ┌─────────────────────────────────────────────┐ │
│ │                                             │ │
│ └─────────────────────────────────────────────┘ │
│                                                 │
│ Skip Assembly Step                              │
│ ☐                                               │
│                                                 │
│ Assembly Mode                                   │
│ ┌─────────────────────────────────────────────┐ │
│ │ careful                                 ▼   │ │
│ └─────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────┘
```

### 4.4 Enable Submit Button (Derived State)

**Reactive Computation**:

```typescript
const submitDisabled = $derived(!profile || profile.pipelineRunnable === false);
```

**Result**: `submitDisabled = false` (profile exists and is runnable)

**Submit Button Updates**:

- `disabled` attribute removed
- Button becomes clickable

---

## Phase 5: User Fills Out Form

### 5.1 User Modifies Text Input

**User Action**: User changes "Genome Size (Mb)" from "5.0" to "6.5"

**Event Handler**:

```svelte
<input
    oninput={(event) =>
        setOption(field.key, (event.target as HTMLInputElement).value)}
/>
```

**State Update**:

```typescript
function setOption(key: string, value: unknown) {
    options[key] = value;
}
// options["--genome_size"] = "6.5"
```

### 5.2 User Modifies Number Input

**User Action**: User changes "Minimum Contig Length" from 500 to 750

**Event Handler**:

```svelte
<input
    type="number"
    oninput={(event) => {
        const value = (event.target as HTMLInputElement).value;
        setOption(field.key, value === '' ? '' : Number(value));
    }}
/>
```

**State Update**:

```typescript
options['--min_contig_length'] = 750; // Converted to number
```

### 5.3 User Fills Optional Field

**User Action**: User enters "50.5" in "Target Coverage Depth"

**State Update**:

```typescript
options['--coverage_depth'] = 50.5;
```

### 5.4 User Checks Checkbox

**User Action**: User checks "Skip Assembly Step"

**Event Handler**:

```svelte
<input
    type="checkbox"
    onchange={(event) =>
        setOption(field.key, (event.target as HTMLInputElement).checked)}
/>
```

**State Update**:

```typescript
options['--skip_assembly'] = true;
```

### 5.5 User Changes Dropdown

**User Action**: User changes "Assembly Mode" from "careful" to "fast"

**Event Handler**:

```svelte
<select
    onchange={(event) =>
        setOption(field.key, (event.target as HTMLSelectElement).value)}
>
```

**State Update**:

```typescript
options['--assembly_mode'] = 'fast';
```

### 5.6 JSON Preview Updates (Derived State)

**Real-Time Computation**:

```typescript
const jsonPreview = $derived(JSON.stringify(serialize(), null, 2));

function serialize(): Record<string, unknown> {
    const data: Record<string, unknown> = {
        pipelineName, // "bactopia"
        pipelineVersion, // "3.1.0"
        outputPath // "s3://..."
    };

    if (profile?.submission.encoding === 'cli-string') {
        data[profile.submission.optionsFieldName] = getCliOptionsString(options);
    } else if (profile?.submission.optionsFieldName) {
        data[profile.submission.optionsFieldName] = { ...options };
    }

    return data;
}

function getCliOptionsString(options: Record<string, unknown>): string {
    return Object.entries(options)
        .filter(([, value]) => value !== undefined && value !== null && value !== '')
        .map(([key, value]) => `${key} ${String(value)}`)
        .join(' ');
}
```

**JSON Preview Shows** (cli-string encoding):

```json
{
    "pipelineName": "bactopia",
    "pipelineVersion": "3.1.0",
    "outputPath": "s3://ccd-dlh-t-seqauto-result-raw-vbkt-s3-1e80821/pipeline-output",
    "options": "--genome_size 6.5 --min_contig_length 750 --coverage_depth 50.5 --skip_assembly true --assembly_mode fast"
}
```

**User Sees Live Updates**:

- Every keystroke updates `options` state
- `serialize()` recomputes due to `$derived()`
- JSON preview textarea updates automatically
- User can verify submission looks correct before clicking Submit

---

## Phase 6: User Clicks Submit

### 6.1 Submit Button Click

**User Action**: Clicks "Submit" button

**Event Handler**:

```svelte
<button onclick={onSubmit} disabled={submitDisabled}> Submit </button>
```

### 6.2 Validation Check

**Function Entry**:

```typescript
async function onSubmit() {
    if (submitDisabled) {
        return; // Should not reach here if button is properly disabled
    }

    // Continue to submission...
}
```

**Note**: The current implementation does NOT explicitly validate against the schema before submission. The validation logic exists in `pipeline.ts` but is not called in the Submit component. This appears to be a gap - the code has `compile()` and `validate()` functions but they're unused.

### 6.3 API Submission

**HTTP Request**:

```typescript
try {
    await axios.post(`${baseUrl}/dap/submit`, serialize());
    // POST https://api.cape-dev.org/capi-dev/dap/submit
    // Content-Type: application/json
    // Body: { pipelineName: "bactopia", pipelineVersion: "3.1.0", ... }

    toaster.info({ title: 'Job submitted' });
} catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    toaster.error({
        title: `An error occurred while submitting the pipeline: ${message}`
    });
}
```

**Request Body** (from serialize()):

```json
{
    "pipelineName": "bactopia",
    "pipelineVersion": "3.1.0",
    "outputPath": "s3://ccd-dlh-t-seqauto-result-raw-vbkt-s3-1e80821/pipeline-output",
    "options": "--genome_size 6.5 --min_contig_length 750 --coverage_depth 50.5 --skip_assembly true --assembly_mode fast"
}
```

### 6.4 Success Response

**API Response**: HTTP 200 OK (exact response body not shown in code)

**User Feedback**:

- Blue info toast appears: "Job submitted"
- Toast auto-dismisses after a few seconds
- Form state remains unchanged (user can submit another job)

### 6.5 Error Response

**API Response**: HTTP 400/500 with error

**Error Handling**:

```typescript
catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    toaster.error({
        title: `An error occurred while submitting the pipeline: ${message}`
    });
}
```

**User Feedback**:

- Red error toast appears with error details
- Form state unchanged, user can correct and retry
- Error logged to console for debugging

---

## Complete State Flow Summary

```
┌─────────────────────────────────────────────────────────────┐
│ PHASE 1: Initial Load                                       │
├─────────────────────────────────────────────────────────────┤
│ 1. Component mounts                                         │
│ 2. onMount fetches pipelines                                │
│ 3. Pipelines grouped by name                                │
│ 4. Output path initialized                                  │
│ 5. Form rendered (empty, submit disabled)                   │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 2: Select Pipeline Name                               │
├─────────────────────────────────────────────────────────────┤
│ 1. User selects pipeline from dropdown                      │
│ 2. pipelineName state updates                               │
│ 3. Version dropdown enables                                 │
│ 4. Version choices computed from grouped data               │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 3: Select Pipeline Version                            │
├─────────────────────────────────────────────────────────────┤
│ 1. User selects version from dropdown                       │
│ 2. pipelineVersion state updates                            │
│ 3. Pipeline object derived                                  │
│ 4. $effect triggers profile fetch                           │
│ 5. API call to get PipelineProfile                          │
│ 6. Profile state updates                                    │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 4: Form Generation                                    │
├─────────────────────────────────────────────────────────────┤
│ 1. Profile.parametersSchema introspected                    │
│ 2. Parameter fields derived from schema                     │
│ 3. Default options extracted from schema                    │
│ 4. Options state initialized                                │
│ 5. Form fields rendered dynamically                         │
│ 6. Submit button enables                                    │
│ 7. JSON preview shows initial state                         │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 5: User Input                                         │
├─────────────────────────────────────────────────────────────┤
│ 1. User modifies form fields                                │
│ 2. Each input updates options state                         │
│ 3. JSON preview recomputes via $derived                     │
│ 4. User reviews JSON preview                                │
│ 5. (Repeat until satisfied)                                 │
└─────────────────────────────────────────────────────────────┘
                        ↓
┌─────────────────────────────────────────────────────────────┐
│ PHASE 6: Submission                                         │
├─────────────────────────────────────────────────────────────┤
│ 1. User clicks Submit button                                │
│ 2. serialize() creates request body                         │
│ 3. POST request to /dap/submit                              │
│ 4. Success: Blue toast "Job submitted"                      │
│    Error: Red toast with error message                      │
│ 5. Form remains for next submission                         │
└─────────────────────────────────────────────────────────────┘
```

---

## Key Reactive Dependencies

### Svelte 5 Reactivity Chain

```
pipelines (state)
    ↓
pipelineChoices (derived) ───→ Pipeline name dropdown options
    ↓
pipelineVersionChoices (derived) ───→ Version dropdown options
    ↓
pipeline (derived) ───→ Triggers $effect
    ↓
profile (state) ───→ API fetch in $effect
    ↓
parameterFields (derived) ───→ Dynamic form fields
    ↓
options (state) ←──── User input events
    ↓
jsonPreview (derived) ───→ Real-time JSON preview
```

### Effect Dependencies

1. **outputPath initialization**: Runs once on mount
2. **version reset**: Runs when `pipelineVersionChoices` changes
3. **profile fetch**: Runs when `pipeline` derived value changes

---

## Important Implementation Notes

### Schema-Driven Form Generation

The form is **completely dynamic**. There is no hardcoded knowledge of pipeline parameters. The frontend only knows how to:

- Interpret JSON Schema property types
- Map types to appropriate HTML input elements
- Extract defaults and constraints
- Serialize values back to JSON

This means:

- New pipelines work without frontend changes
- Parameter changes only require backend schema updates
- Different pipelines can have completely different parameters

### Encoding Modes

Two submission formats supported:

1. **CLI String** (`encoding: "cli-string"`):
    - Parameters serialized as command-line argument string
    - Format: `"--param1 value1 --param2 value2"`
    - Used for pipelines that expect CLI-style parameters

2. **JSON Object** (other encoding values):
    - Parameters as nested JSON object
    - Format: `{"--param1": "value1", "--param2": "value2"}`
    - Used for pipelines that expect structured data

### Validation Gap

**Current Implementation**: No client-side validation before submission

**Available But Unused**:

```typescript
// In pipeline.ts - exists but not called
export function compile(schema: AnySchema): ValidateFunction;
export function validate<T>(isValid: ValidateFunction, obj: unknown): T;
```

**Implication**: Invalid submissions are caught by the backend, not prevented by frontend.

### State Persistence

**Not Persisted**:

- Form values are lost on page refresh
- No local storage or session storage
- Each submission is independent

**Why**: Pipeline jobs are submitted to backend for execution. Frontend doesn't track job state.
