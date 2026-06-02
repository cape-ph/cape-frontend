<script lang="ts">
    import { toaster } from '$lib/toaster';
    import { getWorkflows, getWorkflowProfiles, compile } from '$lib/pipeline';
    import type { PipelineProfile, WorkflowDAG } from '$lib/pipeline';
    import type { ValidateFunction } from 'ajv';
    import { onMount } from 'svelte';
    import { SvelteMap } from 'svelte/reactivity';

    let { baseUrl } = $props<{ baseUrl: string }>();

    type SchemaProperty = {
        type?: 'string' | 'integer' | 'number' | 'boolean';
        title?: string;
        description?: string;
        default?: unknown;
        const?: unknown;
        enum?: unknown[];
        minimum?: number;
        maximum?: number;
        min?: number;
        max?: number;
        step?: number;
    };

    type ParameterField = {
        key: string;
        label: string;
        schema: SchemaProperty;
        required: boolean;
        readonly: boolean;
    };

    type ResolvedProfile = PipelineProfile & {
        resolvedFields?: ParameterField[];
        validator?: ValidateFunction;
    };

    type ValidationError = {
        field: string;
        message: string;
    };

    let workflows = $state<WorkflowDAG[]>();
    let workflowProfiles = $state<ResolvedProfile[]>();
    let selectedWorkflowDagId = $state('');
    let workflowOptions = $state<Record<string, Record<string, unknown>>>({});
    let validationErrors = $state<Record<string, ValidationError[]>>({});

    const workflowSubmitDisabled = $derived(!workflowProfiles || workflowProfiles.length === 0);
    const workflowJsonPreview = $derived(JSON.stringify(serializeWorkflow(), null, 2));

    async function updateWorkflows() {
        try {
            workflows = await getWorkflows(baseUrl);
        } catch (err) {
            workflows = undefined;
            const message = err instanceof Error ? err.message : String(err);
            toaster.error({
                title: `An error occurred while reading workflows: ${message}`
            });
        }
    }

    async function updateWorkflowProfiles(dagId: string) {
        if (!dagId) {
            workflowProfiles = undefined;
            setWorkflowOptions({});
            clearValidationErrors();
            return;
        }

        try {
            const profiles = await getWorkflowProfiles(baseUrl, dagId);

            // Resolve schema fields and compile validators for each profile
            const resolvedProfiles: ResolvedProfile[] = profiles.map((prof) => {
                const fields = getParameterFields(prof.parametersSchema);
                let validator: ValidateFunction | undefined;

                try {
                    validator = compile(prof.parametersSchema);
                } catch (err) {
                    console.error('[updateWorkflowProfiles] Failed to compile validator:', err);
                }

                return { ...prof, resolvedFields: fields, validator };
            });

            workflowProfiles = resolvedProfiles;
            initializeWorkflowOptions(resolvedProfiles);
            clearValidationErrors();
        } catch (err) {
            workflowProfiles = undefined;
            setWorkflowOptions({});
            clearValidationErrors();
            const message = err instanceof Error ? err.message : String(err);
            console.error('[updateWorkflowProfiles] Error:', message, err);
            toaster.error({
                title: `An error occurred while reading workflow profiles: ${message}`
            });
        }
    }

    onMount(() => {
        updateWorkflows();
    });

    $effect(() => {
        updateWorkflowProfiles(selectedWorkflowDagId);
    });

    function resolveSchema(schema: unknown): Record<string, SchemaProperty> {
        if (!schema || typeof schema !== 'object') {
            return {};
        }

        try {
            // Clone to avoid mutations
            const schemaCopy = JSON.parse(JSON.stringify(schema)) as {
                properties?: Record<string, SchemaProperty>;
                $defs?: Record<string, unknown>;
                allOf?: unknown[];
                anyOf?: unknown[];
                oneOf?: unknown[];
            };

            // Start with top-level properties
            const allProperties: Record<string, SchemaProperty> = {
                ...(schemaCopy.properties || {})
            };

            // Helper to resolve a $ref path
            function resolveRef(refString: string, rootSchema: typeof schemaCopy): unknown {
                if (!refString.startsWith('#/')) {
                    console.warn('[resolveSchema] External refs not supported:', refString);
                    return null;
                }

                const path = refString.replace(/^#\//, '').split('/');
                let current: unknown = rootSchema;

                for (const segment of path) {
                    if (current && typeof current === 'object' && segment in current) {
                        current = (current as Record<string, unknown>)[segment];
                    } else {
                        return null;
                    }
                }

                return current;
            }

            // Helper to merge properties from a schema
            function mergeProperties(
                targetProps: Record<string, SchemaProperty>,
                sourceSchema: unknown,
                depth = 0
            ): void {
                if (depth > 10) {
                    console.warn('[resolveSchema] Max recursion depth reached');
                    return;
                }

                if (!sourceSchema || typeof sourceSchema !== 'object') {
                    return;
                }

                const source = sourceSchema as {
                    $ref?: string;
                    allOf?: unknown[];
                    anyOf?: unknown[];
                    oneOf?: unknown[];
                    properties?: Record<string, SchemaProperty>;
                };

                // Handle $ref
                if (source.$ref) {
                    const resolved = resolveRef(source.$ref, schemaCopy);
                    if (resolved) {
                        mergeProperties(targetProps, resolved, depth + 1);
                    }
                    return;
                }

                // Handle allOf (merge all schemas)
                if (source.allOf && Array.isArray(source.allOf)) {
                    for (const item of source.allOf) {
                        mergeProperties(targetProps, item, depth + 1);
                    }
                }

                // Handle anyOf (merge all alternatives)
                if (source.anyOf && Array.isArray(source.anyOf)) {
                    for (const item of source.anyOf) {
                        mergeProperties(targetProps, item, depth + 1);
                    }
                }

                // Handle oneOf (merge all alternatives - UI will handle selection)
                if (source.oneOf && Array.isArray(source.oneOf)) {
                    for (const item of source.oneOf) {
                        mergeProperties(targetProps, item, depth + 1);
                    }
                }

                // Merge direct properties
                if (source.properties) {
                    Object.assign(targetProps, source.properties);
                }
            }

            // Process root-level allOf/anyOf/oneOf
            mergeProperties(allProperties, schemaCopy);

            return allProperties;
        } catch (err) {
            console.error('[resolveSchema] Failed to resolve schema:', err);
            // Fallback to simple top-level properties
            const s = schema as { properties?: Record<string, SchemaProperty> };
            return s.properties ?? {};
        }
    }

    function getParameterFields(schema: unknown): ParameterField[] {
        if (!schema || typeof schema !== 'object') {
            return [];
        }

        const s = schema as {
            required?: string[];
        };

        const allProperties = resolveSchema(schema);

        return Object.entries(allProperties).map(([key, propertySchema]) => ({
            key,
            label: getFieldLabel(key, propertySchema),
            schema: propertySchema,
            required: s.required?.includes(key) ?? false,
            readonly: 'const' in propertySchema
        }));
    }

    function getFieldLabel(key: string, propertySchema: SchemaProperty): string {
        return propertySchema.title ?? key.replace(/^-+/, '');
    }

    function initializeWorkflowOptions(profiles: ResolvedProfile[]) {
        const newOptions: Record<string, Record<string, unknown>> = {};
        for (const prof of profiles) {
            const stageId = prof.pipelineId ?? prof.pipelineName;
            // Use resolvedFields to get default values
            const defaults: Record<string, unknown> = {};
            for (const field of prof.resolvedFields ?? []) {
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
            newOptions[stageId] = defaults;
        }
        setWorkflowOptions(newOptions);
    }

    function setWorkflowOptions(next: Record<string, Record<string, unknown>>) {
        for (const key of Object.keys(workflowOptions)) {
            if (!(key in next)) {
                delete workflowOptions[key];
            }
        }

        for (const [stageId, stageOpts] of Object.entries(next)) {
            workflowOptions[stageId] = stageOpts;
        }
    }

    function setWorkflowOption(stageId: string, key: string, value: unknown) {
        if (!workflowOptions[stageId]) {
            workflowOptions[stageId] = {};
        }
        workflowOptions[stageId][key] = value;

        // Clear validation errors for this field when user changes it
        if (validationErrors[stageId]) {
            validationErrors[stageId] = validationErrors[stageId].filter((e) => e.field !== key);
            if (validationErrors[stageId].length === 0) {
                delete validationErrors[stageId];
            }
            // Trigger reactivity
            validationErrors = { ...validationErrors };
        }
    }

    function clearValidationErrors() {
        for (const key of Object.keys(validationErrors)) {
            delete validationErrors[key];
        }
    }

    function validateStage(profile: ResolvedProfile, stageId: string): boolean {
        if (!profile.validator) {
            console.warn('[validateStage] No validator for stage:', stageId);
            return true;
        }

        const stageData = workflowOptions[stageId] ?? {};

        // Convert types for validation (HTML inputs give strings)
        const typedData: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(stageData)) {
            // Find the field schema to know the expected type
            const field = (profile.resolvedFields ?? []).find((f) => f.key === key);

            if (!field) {
                // Field not in schema, include as-is
                typedData[key] = value;
                continue;
            }

            // Skip readonly/const fields - they're always valid
            if (field.readonly) {
                typedData[key] = value;
                continue;
            }

            // Handle empty values
            if (value === '' || value === null || value === undefined) {
                // Don't include empty values - let required validation catch missing fields
                continue;
            }

            // Type conversion based on schema
            if (field.schema.type === 'integer' || field.schema.type === 'number') {
                // Always try to convert - let NaN fail validation
                const numValue = typeof value === 'number' ? value : Number(value);
                typedData[key] = numValue;
            } else if (field.schema.type === 'boolean') {
                typedData[key] = Boolean(value);
            } else {
                // String or other types
                typedData[key] = value;
            }
        }

        const valid = profile.validator(typedData);

        if (!valid && profile.validator.errors) {
            // Group errors by field to avoid duplicates
            const errorsByField = new SvelteMap<string, ValidationError>();

            for (const err of profile.validator.errors) {
                // Get field name from instancePath or params
                let fieldName = '';
                if (err.instancePath) {
                    fieldName = err.instancePath.replace(/^\//, '');
                } else if (err.keyword === 'required' && err.params?.missingProperty) {
                    fieldName = err.params.missingProperty;
                }

                // Skip if we already have an error for this field
                // Prioritize: required > type > minimum/maximum > other
                const existingError = errorsByField.get(fieldName);
                if (existingError) {
                    // Keep the more important error
                    const existingPriority = getErrorPriority(existingError.message);
                    const newPriority = getErrorPriority(err.keyword);
                    if (newPriority <= existingPriority) {
                        continue; // Keep existing error, skip this one
                    }
                }

                let message = err.message ?? 'Invalid value';
                if (err.keyword === 'required') {
                    const propName = err.params?.missingProperty || 'This field';
                    message = `${propName} is required`;
                } else if (err.keyword === 'type') {
                    message = `Must be ${err.params?.type}`;
                } else if (err.keyword === 'minimum') {
                    message = `Must be at least ${err.params?.limit}`;
                } else if (err.keyword === 'maximum') {
                    message = `Must be at most ${err.params?.limit}`;
                } else if (err.keyword === 'enum') {
                    message = `Must be one of: ${err.params?.allowedValues?.join(', ')}`;
                }

                errorsByField.set(fieldName, {
                    field: fieldName,
                    message
                });
            }

            const errors = Array.from(errorsByField.values());
            validationErrors[stageId] = errors;
            validationErrors = { ...validationErrors };
            return false;
        }

        // Clear errors for this stage if validation passed
        if (validationErrors[stageId]) {
            delete validationErrors[stageId];
            validationErrors = { ...validationErrors };
        }

        return true;
    }

    function validateAllStages(): boolean {
        if (!workflowProfiles) {
            return false;
        }

        let allValid = true;
        clearValidationErrors();

        for (const profile of workflowProfiles) {
            const stageId = profile.pipelineId ?? profile.pipelineName;

            const isValid = validateStage(profile, stageId);
            if (!isValid) {
                allValid = false;
            }
        }

        return allValid;
    }

    function getStageErrorCount(stageId: string): number {
        return validationErrors[stageId]?.length ?? 0;
    }

    function getErrorPriority(errorKeywordOrMessage: string): number {
        // Lower number = higher priority (show this error first)
        if (errorKeywordOrMessage.includes('required')) return 1;
        if (errorKeywordOrMessage === 'type') return 2;
        if (errorKeywordOrMessage === 'minimum') return 3;
        if (errorKeywordOrMessage === 'maximum') return 3;
        if (errorKeywordOrMessage === 'enum') return 4;
        return 5;
    }

    function getFieldError(stageId: string, fieldKey: string): string | undefined {
        const stageErrors = validationErrors[stageId];
        if (!stageErrors) return undefined;

        // Match by field name (handle both "--param" and "param" formats)
        const normalizedKey = fieldKey.replace(/^-+/, '');
        const error = stageErrors.find((e) => {
            const normalizedField = e.field.replace(/^-+/, '');
            return normalizedField === normalizedKey || e.field === fieldKey;
        });

        return error?.message;
    }

    function asString(value: unknown): string {
        return typeof value === 'string' ? value : value == null ? '' : String(value);
    }

    function getCliOptionsString(options: Record<string, unknown>): string {
        return Object.entries(options)
            .filter(([, value]) => value !== undefined && value !== null && value !== '')
            .map(([key, value]) => `${key} ${String(value)}`)
            .join(' ');
    }

    function serializeWorkflow(): unknown[] {
        const payloadArray: Record<string, unknown>[] = [];

        for (const prof of workflowProfiles ?? []) {
            const stageOptions = workflowOptions[prof.pipelineId ?? prof.pipelineName] ?? {};

            const stageData: Record<string, unknown> = {};

            if (prof.submission.encoding === 'cli-string') {
                stageData[prof.submission.optionsFieldName] = getCliOptionsString(stageOptions);
            } else if (prof.submission.optionsFieldName) {
                stageData[prof.submission.optionsFieldName] = { ...stageOptions };
            }

            payloadArray.push(stageData);
        }

        return payloadArray;
    }

    async function onSubmitWorkflow() {
        if (workflowSubmitDisabled) {
            return;
        }

        // Validate all stages before submission
        const isValid = validateAllStages();

        if (!isValid) {
            const errorCount = Object.values(validationErrors).reduce(
                (sum, errors) => sum + errors.length,
                0
            );
            toaster.error({
                title: `Validation failed: ${errorCount} error${errorCount !== 1 ? 's' : ''} found`,
                description: 'Please fix the highlighted fields and try again'
            });
            return;
        }

        try {
            const payload = serializeWorkflow();
            const endpoint = `${baseUrl}/workflows/trigger?dagId=${encodeURIComponent(selectedWorkflowDagId)}`;

            const message = `Would POST to:\n${endpoint}\n\nPayload (array format):\n${JSON.stringify(payload, null, 2)}`;

            // Show in browser alert for now
            alert(message);

            toaster.info({
                title: 'Workflow submission preview (not actually submitted)'
            });

            // TODO: Uncomment when ready to actually submit workflows
            // await axios.post(endpoint, payload);
            // toaster.info({ title: 'Workflow submitted' });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            toaster.error({
                title: `An error occurred while previewing the workflow: ${message}`
            });
        }
    }
</script>

<div class="mb-4 space-y-2">
    <h2 class="text-primary-500 text-2xl font-semibold">Submit Workflow</h2>
</div>

<div class="space-y-6">
    <section class="space-y-3">
        <h2 class="text-lg font-semibold">Workflow Selection</h2>
        <div class="grid grid-cols-1 gap-3">
            <label class="flex flex-col gap-1">
                <span class="text-xs opacity-70">Workflow</span>
                <select
                    class="select select-bordered"
                    bind:value={selectedWorkflowDagId}
                    aria-label="Select workflow"
                    disabled={!workflows}
                >
                    <option value="" selected={selectedWorkflowDagId === ''}>
                        {workflows ? 'Select a workflow...' : 'Loading workflows...'}
                    </option>
                    {#each workflows ?? [] as wf (wf.dag_id)}
                        <option value={wf.dag_id} disabled={wf.is_paused}>
                            {wf.dag_display_name}
                            {wf.is_paused ? ' (paused)' : ''}
                        </option>
                    {/each}
                </select>
            </label>
        </div>
    </section>

    {#if workflowProfiles && workflowProfiles.length > 0}
        <section class="space-y-3">
            <h2 class="text-lg font-semibold">Workflow Overview</h2>
            <div class="card bg-surface-100-800-token border border-gray-300 p-4">
                <p class="text-sm opacity-70 mb-4">
                    This workflow runs {workflowProfiles.length} analysis stage{workflowProfiles.length !==
                    1
                        ? 's'
                        : ''} in sequence:
                </p>
                <div class="flex flex-col gap-3">
                    {#each workflowProfiles as stage, idx (stage.pipelineId ?? stage.pipelineName)}
                        <div class="flex items-center gap-3">
                            <div
                                class="flex-shrink-0 w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center font-semibold text-sm"
                            >
                                {idx + 1}
                            </div>
                            <div class="flex-1">
                                <div class="font-semibold">{stage.pipelineName}</div>
                                {#if stage.pipelineDescription}
                                    <div class="text-sm opacity-70">
                                        {stage.pipelineDescription}
                                    </div>
                                {/if}
                            </div>
                        </div>
                        {#if idx < workflowProfiles.length - 1}
                            <div class="ml-4 pl-3 border-l-2 border-blue-300 h-6 flex items-center">
                                <svg
                                    class="w-5 h-5 text-blue-500"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M19 14l-7 7m0 0l-7-7m7 7V3"
                                    />
                                </svg>
                            </div>
                        {/if}
                    {/each}
                </div>
            </div>
        </section>

        <section class="space-y-3">
            <h2 class="text-lg font-semibold">
                Workflow Stages ({workflowProfiles.length} stages)
            </h2>
            <div class="space-y-2">
                {#each workflowProfiles as stageProfile, index (stageProfile.pipelineId ?? stageProfile.pipelineName)}
                    {@const stageId = stageProfile.pipelineId ?? stageProfile.pipelineName}
                    {@const stageFields = stageProfile.resolvedFields ?? []}
                    {@const stageOpts = workflowOptions[stageId] ?? {}}
                    {@const stageErrorCount = getStageErrorCount(stageId)}
                    <div
                        class="card bg-surface-100-800-token border {stageErrorCount > 0
                            ? 'border-2 border-red-500'
                            : 'border-gray-300'}"
                    >
                        <details class="p-4" open>
                            <summary
                                class="cursor-pointer font-semibold text-lg flex items-center gap-2"
                            >
                                <svg
                                    class="w-5 h-5 transition-transform details-chevron"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        stroke-linecap="round"
                                        stroke-linejoin="round"
                                        stroke-width="2"
                                        d="M19 9l-7 7-7-7"
                                    />
                                </svg>
                                <span>
                                    Stage {index + 1}: {stageProfile.pipelineName}
                                    {#if stageProfile.version}
                                        <span class="text-sm opacity-70"
                                            >({stageProfile.version})</span
                                        >
                                    {/if}
                                    <span class="text-xs opacity-50 ml-2"
                                        >• {stageFields.length} parameters</span
                                    >
                                </span>
                                {#if stageErrorCount > 0}
                                    <span
                                        class="ml-auto flex items-center gap-1 text-red-600 bg-red-100 px-3 py-1 rounded-full text-sm font-semibold"
                                    >
                                        <svg
                                            class="w-4 h-4"
                                            fill="currentColor"
                                            viewBox="0 0 20 20"
                                        >
                                            <path
                                                fill-rule="evenodd"
                                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                clip-rule="evenodd"
                                            />
                                        </svg>
                                        {stageErrorCount} error{stageErrorCount !== 1 ? 's' : ''}
                                    </span>
                                {/if}
                            </summary>
                            <div class="mt-3 space-y-3">
                                {#if stageProfile.pipelineDescription}
                                    <p class="text-sm opacity-70">
                                        {stageProfile.pipelineDescription}
                                    </p>
                                {/if}

                                {#if stageFields.length > 0}
                                    <div class="grid grid-cols-1 gap-3">
                                        {#each stageFields as field (field.key)}
                                            {@const fieldError = getFieldError(stageId, field.key)}
                                            <label class="flex flex-col gap-1">
                                                <span class="text-xs opacity-70">
                                                    {field.label}{field.required ? ' *' : ''}
                                                </span>

                                                {#if field.readonly}
                                                    <input
                                                        class="input input-bordered opacity-50"
                                                        type="text"
                                                        value={asString(stageOpts[field.key])}
                                                        readonly
                                                        aria-label={field.label}
                                                        title="This value is managed by the system and cannot be changed"
                                                    />
                                                {:else if field.schema.enum}
                                                    <select
                                                        class="select select-bordered {fieldError
                                                            ? 'border-2 border-red-500'
                                                            : ''}"
                                                        value={asString(stageOpts[field.key])}
                                                        required={field.required}
                                                        aria-label={field.label}
                                                        aria-invalid={fieldError ? 'true' : 'false'}
                                                        aria-describedby={fieldError
                                                            ? `error-${stageId}-${field.key}`
                                                            : undefined}
                                                        onchange={(event) =>
                                                            setWorkflowOption(
                                                                stageId,
                                                                field.key,
                                                                (event.target as HTMLSelectElement)
                                                                    .value
                                                            )}
                                                    >
                                                        {#each field.schema.enum as option (asString(option))}
                                                            <option value={asString(option)}
                                                                >{asString(option)}</option
                                                            >
                                                        {/each}
                                                    </select>
                                                {:else if field.schema.type === 'boolean'}
                                                    <input
                                                        class="checkbox {fieldError
                                                            ? 'border-2 border-red-500'
                                                            : ''}"
                                                        type="checkbox"
                                                        checked={Boolean(stageOpts[field.key])}
                                                        aria-label={field.label}
                                                        aria-invalid={fieldError ? 'true' : 'false'}
                                                        aria-describedby={fieldError
                                                            ? `error-${stageId}-${field.key}`
                                                            : undefined}
                                                        onchange={(event) =>
                                                            setWorkflowOption(
                                                                stageId,
                                                                field.key,
                                                                (event.target as HTMLInputElement)
                                                                    .checked
                                                            )}
                                                    />
                                                {:else if field.schema.type === 'integer' || field.schema.type === 'number'}
                                                    <input
                                                        class="input input-bordered {fieldError
                                                            ? 'border-2 border-red-500'
                                                            : ''}"
                                                        type="text"
                                                        inputmode="numeric"
                                                        value={asString(stageOpts[field.key])}
                                                        readonly={field.readonly}
                                                        required={field.required}
                                                        aria-label={field.label}
                                                        aria-invalid={fieldError ? 'true' : 'false'}
                                                        aria-describedby={fieldError
                                                            ? `error-${stageId}-${field.key}`
                                                            : undefined}
                                                        placeholder={field.schema.type === 'integer'
                                                            ? 'Enter an integer'
                                                            : 'Enter a number'}
                                                        oninput={(event) => {
                                                            const value = (
                                                                event.target as HTMLInputElement
                                                            ).value;
                                                            setWorkflowOption(
                                                                stageId,
                                                                field.key,
                                                                value
                                                            );
                                                        }}
                                                    />
                                                {:else}
                                                    <input
                                                        class="input input-bordered {fieldError
                                                            ? 'border-2 border-red-500'
                                                            : ''}"
                                                        type="text"
                                                        value={asString(stageOpts[field.key])}
                                                        readonly={field.readonly}
                                                        required={field.required}
                                                        aria-label={field.label}
                                                        aria-invalid={fieldError ? 'true' : 'false'}
                                                        aria-describedby={fieldError
                                                            ? `error-${stageId}-${field.key}`
                                                            : undefined}
                                                        oninput={(event) =>
                                                            setWorkflowOption(
                                                                stageId,
                                                                field.key,
                                                                (event.target as HTMLInputElement)
                                                                    .value
                                                            )}
                                                    />
                                                {/if}

                                                {#if fieldError}
                                                    <div
                                                        id="error-{stageId}-{field.key}"
                                                        class="flex items-center gap-2 text-sm text-red-600 font-semibold bg-red-50 px-3 py-2 rounded border border-red-200"
                                                    >
                                                        <svg
                                                            class="w-5 h-5 flex-shrink-0"
                                                            fill="currentColor"
                                                            viewBox="0 0 20 20"
                                                        >
                                                            <path
                                                                fill-rule="evenodd"
                                                                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                                clip-rule="evenodd"
                                                            />
                                                        </svg>
                                                        <span>{fieldError}</span>
                                                    </div>
                                                {/if}

                                                {#if field.schema.description}
                                                    <span class="text-xs opacity-60"
                                                        >{field.schema.description}</span
                                                    >
                                                {/if}
                                            </label>
                                        {/each}
                                    </div>
                                {:else}
                                    <p class="text-sm opacity-70">
                                        This stage does not define parameters.
                                    </p>
                                {/if}
                            </div>
                        </details>
                    </div>
                {/each}
            </div>
        </section>
    {/if}

    <section class="space-y-2">
        <h2 class="text-lg font-semibold">JSON</h2>
        <textarea
            class="textarea textarea-bordered min-h-[220px] w-full font-mono text-sm leading-5"
            aria-label="Submission JSON preview"
            readonly
            spellcheck="false"
            value={workflowJsonPreview}
        ></textarea>
    </section>

    <div class="group relative mt-2">
        <button
            type="submit"
            class="btn preset-filled-primary-500 w-full rounded-lg shadow-lg"
            disabled={workflowSubmitDisabled}
            aria-describedby={workflowSubmitDisabled ? 'submit-disabled-tooltip' : undefined}
            onclick={onSubmitWorkflow}
        >
            Submit Workflow
        </button>
        {#if workflowSubmitDisabled}
            <div
                id="submit-disabled-tooltip"
                role="tooltip"
                class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max max-w-xs -translate-x-1/2 rounded bg-black px-3 py-2 text-center text-xs text-white group-hover:block"
            >
                Select a workflow to enable submission.
            </div>
        {/if}
    </div>
</div>

<style>
    /* Rotate chevron when details is open */
    details[open] .details-chevron {
        transform: rotate(180deg);
    }

    /* Hide default marker */
    details > summary {
        list-style: none;
    }

    details > summary::-webkit-details-marker {
        display: none;
    }
</style>
