<script lang="ts">
    import { toaster } from '$lib/toaster';
    import { getWorkflows, getWorkflowProfiles } from '$lib/pipeline';
    import {
        coerceOptionsForValidation,
        compile,
        getDefaultOptions,
        getParameterFields
    } from '$lib/schema';
    import type { PipelineProfile, WorkflowDAG } from '$lib/pipeline';
    import type { ParameterField } from '$lib/schema';
    import type { ValidateFunction } from 'ajv';
    import { onMount, untrack } from 'svelte';
    import { SvelteMap } from 'svelte/reactivity';
    import axios from 'axios';
    import { addWorkflowRun } from '$lib/workflowRunsStorage';
    import { addStoredRun } from '$lib/workflowRuns.svelte';

    let { baseUrl, onNavigateToDetail } = $props<{
        baseUrl: string;
        onNavigateToDetail?: (dagId: string, dagRunId: string) => void;
    }>();

    type ResolvedProfile = PipelineProfile & {
        resolvedFields?: ParameterField[];
        validator?: ValidateFunction;
        schemaError?: string;
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
    let workflowProfileRequestId = 0;

    const workflowSubmitDisabled = $derived(!workflowProfiles || workflowProfiles.length === 0);
    const workflowJsonPreview = $derived(JSON.stringify(serializeWorkflow(), null, 2));
    const selectedWorkflow = $derived(
        workflows?.find((workflow) => workflow.dag_id === selectedWorkflowDagId)
    );

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
        const requestId = ++workflowProfileRequestId;

        if (!dagId) {
            workflowProfiles = undefined;
            setWorkflowOptions({});
            clearValidationErrors();
            return;
        }

        workflowProfiles = undefined;
        setWorkflowOptions({});
        clearValidationErrors();

        try {
            const profiles = await getWorkflowProfiles(baseUrl, dagId);

            const resolvedProfiles: ResolvedProfile[] = await Promise.all(
                profiles.map(async (prof) => {
                    let fields: ParameterField[] = [];
                    let validator: ValidateFunction | undefined;
                    let schemaError: string | undefined;

                    try {
                        fields = await getParameterFields(prof.parametersSchema);
                    } catch (err) {
                        schemaError = err instanceof Error ? err.message : String(err);
                        console.error('[updateWorkflowProfiles] Failed to extract fields:', err);
                    }

                    try {
                        validator = compile(prof.parametersSchema);
                    } catch (err) {
                        schemaError = err instanceof Error ? err.message : String(err);
                        console.error('[updateWorkflowProfiles] Failed to compile validator:', err);
                    }

                    return { ...prof, resolvedFields: fields, validator, schemaError };
                })
            );

            if (requestId !== workflowProfileRequestId) {
                return;
            }

            workflowProfiles = resolvedProfiles;
            initializeWorkflowOptions(resolvedProfiles);
            clearValidationErrors();
        } catch (err) {
            if (requestId !== workflowProfileRequestId) {
                return;
            }

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
        const dagId = selectedWorkflowDagId;
        untrack(() => updateWorkflowProfiles(dagId));
    });

    function initializeWorkflowOptions(profiles: ResolvedProfile[]) {
        const newOptions: Record<string, Record<string, unknown>> = {};
        for (const prof of profiles) {
            const stageId = prof.pipelineId ?? prof.pipelineName;
            newOptions[stageId] = getDefaultOptions(prof.resolvedFields ?? []);
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
        validationErrors = {};
    }

    function validateStage(profile: ResolvedProfile, stageId: string): boolean {
        if (profile.schemaError || !profile.validator) {
            validationErrors[stageId] = [
                {
                    field: '__stage',
                    message: profile.schemaError ?? 'Schema validator is unavailable'
                }
            ];
            validationErrors = { ...validationErrors };
            return false;
        }

        const stageData = workflowOptions[stageId] ?? {};
        const typedData = coerceOptionsForValidation(profile.resolvedFields ?? [], stageData);

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
                    // Keep the more important error (lower number = higher priority)
                    const existingPriority = getErrorPriority(existingError.message);
                    const newPriority = getErrorPriority(err.keyword);
                    if (newPriority >= existingPriority) {
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

        if (!valid) {
            validationErrors[stageId] = [
                {
                    field: '__stage',
                    message: 'Schema validation failed'
                }
            ];
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

    function getStageSchemaError(stageId: string): string | undefined {
        return validationErrors[stageId]?.find((error) => error.field === '__stage')?.message;
    }

    function getFieldId(stageId: string, fieldKey: string): string {
        return `field-${getDomToken(stageId)}-${getDomToken(fieldKey)}`;
    }

    function getErrorId(stageId: string, fieldKey: string): string {
        return `error-${getDomToken(stageId)}-${getDomToken(fieldKey)}`;
    }

    function getHelpId(stageId: string, fieldKey: string): string {
        return `help-${getDomToken(stageId)}-${getDomToken(fieldKey)}`;
    }

    function getDescribedBy(stageId: string, field: ParameterField, fieldError?: string): string {
        const ids: string[] = [];

        if (fieldError) {
            ids.push(getErrorId(stageId, field.key));
        }

        if (field.schema.description) {
            ids.push(getHelpId(stageId, field.key));
        }

        return ids.join(' ');
    }

    function getDomToken(value: string): string {
        return value.replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '') || 'field';
    }

    function asString(value: unknown): string {
        return typeof value === 'string' ? value : value == null ? '' : String(value);
    }

    function serializeWorkflow(): { pipelineConfigs: unknown[] } {
        const payloadArray: Record<string, unknown>[] = [];

        for (const prof of workflowProfiles ?? []) {
            const stageId = prof.pipelineId ?? prof.pipelineName;
            const stageOptions = workflowOptions[stageId] ?? {};

            const stageData: Record<string, unknown> = {
                pipelineId: prof.pipelineId,
                nextflowOptions: { ...stageOptions }
            };

            payloadArray.push(stageData);
        }

        return { pipelineConfigs: payloadArray };
    }

    async function onSubmitWorkflow() {
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

            const response = await axios.post(endpoint, payload);
            const { dag_run_id: dagRunId, dag_id: dagId } = response.data;

            // Store workflow run for status tracking
            const storedRun = {
                dagId,
                dagRunId,
                submittedAt: new Date().toISOString()
            };
            addWorkflowRun(storedRun);
            addStoredRun(storedRun);

            toaster.success({
                title: 'Workflow submitted successfully',
                description: 'Redirecting to workflow details...'
            });

            // Navigate to detail view after successful submission
            if (onNavigateToDetail) {
                onNavigateToDetail(dagId, dagRunId);
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            toaster.error({
                title: `An error occurred while submitting the workflow: ${message}`
            });
        }
    }
</script>

<div class="mb-5 space-y-2">
    <h2 class="text-primary-700 dark:text-primary-300 text-2xl font-semibold">Submit Workflow</h2>
    <p class="text-sm text-gray-700 dark:text-gray-300">
        Configure each stage in order, then submit your workflow.
    </p>
</div>

<div class="space-y-6 text-gray-950 dark:text-gray-100">
    <section class="space-y-3">
        <h2 class="text-lg font-semibold">Workflow Selection</h2>
        <div class="grid grid-cols-1 gap-3">
            <label class="flex flex-col gap-1">
                <span class="text-xs font-medium text-gray-700 dark:text-gray-300">Workflow</span>
                <select
                    id="workflow-selection"
                    name="workflow-selection"
                    class="select select-bordered bg-white text-gray-950 dark:bg-surface-950 dark:text-gray-100"
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
            {#if selectedWorkflow?.description}
                <p class="text-sm leading-6 text-gray-700 dark:text-gray-300">
                    {selectedWorkflow.description}
                </p>
            {/if}
        </div>
    </section>

    {#if workflowProfiles && workflowProfiles.length > 0}
        <section class="space-y-3">
            <h2 class="text-lg font-semibold">Workflow Overview</h2>
            <div
                class="rounded-lg border border-gray-300 bg-white p-4 shadow-sm dark:border-gray-600 dark:bg-surface-950"
            >
                <p class="mb-4 text-sm text-gray-700 dark:text-gray-300">
                    This workflow runs {workflowProfiles.length} analysis stage{workflowProfiles.length !==
                    1
                        ? 's'
                        : ''} in sequence:
                </p>
                <div class="flex flex-col gap-3">
                    {#each workflowProfiles as stage, idx (stage.pipelineId ?? stage.pipelineName)}
                        <div class="flex items-center gap-3">
                            <div
                                class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-semibold text-white"
                            >
                                {idx + 1}
                            </div>
                            <div class="flex-1">
                                <div class="font-semibold">{stage.pipelineName}</div>
                                {#if stage.pipelineDescription}
                                    <div class="text-sm leading-6 text-gray-700 dark:text-gray-300">
                                        {stage.pipelineDescription}
                                    </div>
                                {/if}
                            </div>
                        </div>
                        {#if idx < workflowProfiles.length - 1}
                            <div class="ml-4 flex h-6 items-center border-l-2 border-blue-400 pl-3">
                                <svg
                                    class="h-5 w-5 text-blue-500"
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
            <div class="space-y-3">
                {#each workflowProfiles as stageProfile, index (stageProfile.pipelineId ?? stageProfile.pipelineName)}
                    {@const stageId = stageProfile.pipelineId ?? stageProfile.pipelineName}
                    {@const stageFields = stageProfile.resolvedFields ?? []}
                    {@const stageOpts = workflowOptions[stageId] ?? {}}
                    {@const stageErrorCount = getStageErrorCount(stageId)}
                    {@const stageSchemaError = getStageSchemaError(stageId)}
                    <div
                        class="rounded-lg border bg-white shadow-sm dark:bg-surface-950 {stageErrorCount >
                        0
                            ? 'border-2 border-red-500'
                            : 'border-gray-300 dark:border-gray-600'}"
                    >
                        <details class="p-4" open>
                            <summary
                                class="flex cursor-pointer items-start gap-3 text-lg font-semibold"
                            >
                                <svg
                                    class="mt-1 h-5 w-5 flex-shrink-0 transition-transform details-chevron"
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
                                <span class="flex min-w-0 flex-1 flex-col gap-1">
                                    <span>
                                        Stage {index + 1}: {stageProfile.pipelineName}
                                        {#if stageProfile.version}
                                            <span class="text-sm text-gray-700 dark:text-gray-300">
                                                ({stageProfile.version})
                                            </span>
                                        {/if}
                                    </span>
                                    <span
                                        class="text-xs font-medium text-gray-600 dark:text-gray-400"
                                    >
                                        {stageFields.length} parameters{stageSchemaError
                                            ? ' - schema needs review'
                                            : ''}
                                    </span>
                                </span>
                                {#if stageErrorCount > 0}
                                    <span
                                        class="ml-auto flex flex-shrink-0 items-center gap-1 rounded-full bg-red-100 px-3 py-1 text-sm font-semibold text-red-700 dark:bg-red-950 dark:text-red-100"
                                    >
                                        <svg
                                            class="h-4 w-4"
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
                                    <p class="text-sm leading-6 text-gray-700 dark:text-gray-300">
                                        {stageProfile.pipelineDescription}
                                    </p>
                                {/if}

                                {#if stageSchemaError}
                                    <div
                                        class="rounded border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-100"
                                    >
                                        {stageSchemaError}
                                    </div>
                                {/if}

                                {#if stageFields.length > 0}
                                    <div class="grid grid-cols-1 gap-3">
                                        {#each stageFields as field (field.key)}
                                            {@const fieldError = getFieldError(stageId, field.key)}
                                            {@const describedBy = getDescribedBy(
                                                stageId,
                                                field,
                                                fieldError
                                            )}
                                            <label class="flex flex-col gap-1">
                                                <span
                                                    class="text-xs font-medium text-gray-700 dark:text-gray-300"
                                                >
                                                    {field.label}{field.required ? ' *' : ''}
                                                </span>

                                                {#if field.readonly}
                                                    <textarea
                                                        id={getFieldId(stageId, field.key)}
                                                        name={field.key}
                                                        class="input input-bordered no-scrollbar h-[2.21rem] min-h-[2.21rem] w-full resize-none overflow-x-auto overflow-y-hidden whitespace-nowrap bg-gray-50 text-base leading-normal text-gray-600 dark:bg-surface-900 dark:text-gray-400"
                                                        value={asString(stageOpts[field.key])}
                                                        readonly
                                                        rows="1"
                                                        wrap="off"
                                                        aria-label={field.label}
                                                        aria-describedby={describedBy || undefined}
                                                        title="This value is managed by the system and cannot be changed"
                                                    ></textarea>
                                                {:else if field.schema.enum}
                                                    <select
                                                        id={getFieldId(stageId, field.key)}
                                                        name={field.key}
                                                        class="select select-bordered bg-white text-gray-950 dark:bg-surface-950 dark:text-gray-100 {fieldError
                                                            ? 'border-2 border-red-500'
                                                            : ''}"
                                                        value={asString(stageOpts[field.key])}
                                                        required={field.required}
                                                        aria-label={field.label}
                                                        aria-invalid={fieldError ? 'true' : 'false'}
                                                        aria-describedby={describedBy || undefined}
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
                                                        id={getFieldId(stageId, field.key)}
                                                        name={field.key}
                                                        class="checkbox {fieldError
                                                            ? 'border-2 border-red-500'
                                                            : ''}"
                                                        type="checkbox"
                                                        checked={Boolean(stageOpts[field.key])}
                                                        aria-label={field.label}
                                                        aria-invalid={fieldError ? 'true' : 'false'}
                                                        aria-describedby={describedBy || undefined}
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
                                                        id={getFieldId(stageId, field.key)}
                                                        name={field.key}
                                                        class="input input-bordered bg-white text-gray-950 dark:bg-surface-950 dark:text-gray-100 {fieldError
                                                            ? 'border-2 border-red-500'
                                                            : ''}"
                                                        type="text"
                                                        inputmode="numeric"
                                                        value={asString(stageOpts[field.key])}
                                                        required={field.required}
                                                        aria-label={field.label}
                                                        aria-invalid={fieldError ? 'true' : 'false'}
                                                        aria-describedby={describedBy || undefined}
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
                                                        id={getFieldId(stageId, field.key)}
                                                        name={field.key}
                                                        class="input input-bordered bg-white text-gray-950 dark:bg-surface-950 dark:text-gray-100 {fieldError
                                                            ? 'border-2 border-red-500'
                                                            : ''}"
                                                        type="text"
                                                        value={asString(stageOpts[field.key])}
                                                        required={field.required}
                                                        aria-label={field.label}
                                                        aria-invalid={fieldError ? 'true' : 'false'}
                                                        aria-describedby={describedBy || undefined}
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
                                                        id={getErrorId(stageId, field.key)}
                                                        class="flex items-center gap-2 rounded border border-red-300 bg-red-50 px-3 py-2 text-sm font-semibold text-red-700 dark:border-red-700 dark:bg-red-950 dark:text-red-100"
                                                    >
                                                        <svg
                                                            class="h-5 w-5 flex-shrink-0"
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
                                                    <span
                                                        id={getHelpId(stageId, field.key)}
                                                        class="text-xs leading-5 text-gray-600 dark:text-gray-400"
                                                        >{field.schema.description}</span
                                                    >
                                                {/if}
                                            </label>
                                        {/each}
                                    </div>
                                {:else}
                                    <p class="text-sm text-gray-700 dark:text-gray-300">
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

    <section>
        <details
            class="rounded-lg border border-gray-300 bg-white p-4 dark:border-gray-600 dark:bg-surface-950"
        >
            <summary class="flex cursor-pointer items-center gap-2 text-lg font-semibold">
                <svg
                    class="details-chevron h-5 w-5 flex-shrink-0 transition-transform duration-200"
                    fill="currentColor"
                    viewBox="0 0 20 20"
                >
                    <path
                        fill-rule="evenodd"
                        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
                        clip-rule="evenodd"
                    />
                </svg>
                <span>Advanced Preview</span>
            </summary>
            <p class="mt-2 text-sm text-gray-700 dark:text-gray-300">
                JSON representation of the workflow submission payload.
            </p>
            <textarea
                id="submission-json-preview"
                name="submission-json-preview"
                class="textarea textarea-bordered mt-3 min-h-[220px] w-full bg-gray-50 font-mono text-sm leading-5 text-gray-600 dark:bg-surface-900 dark:text-gray-400"
                aria-label="Submission JSON preview"
                readonly
                spellcheck="false"
                value={workflowJsonPreview}
            ></textarea>
        </details>
    </section>

    <div class="group relative mt-2 pb-8 sm:pb-10">
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
