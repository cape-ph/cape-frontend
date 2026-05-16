<script lang="ts">
    import { toaster } from '$lib/toaster';
    import { getPipelines, getPipelineProfile } from '$lib/pipeline';
    import type { Pipeline, PipelineProfile } from '$lib/pipeline';
    import axios from 'axios';
    import { onMount } from 'svelte';

    let { baseUrl, bucketURI } = $props<{ baseUrl: string; bucketURI: string }>();

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

    let pipelines = $state<Pipeline[]>();
    let profile = $state<PipelineProfile>();
    let selectedProfileKey = $state('');

    let pipelineName = $state('');
    let pipelineVersion = $state('');
    let outputPath = $state('');
    let outputPathInitialized = $state(false);
    const options = $state<Record<string, unknown>>({});

    async function updatePipelines() {
        try {
            pipelines = await getPipelines(baseUrl);
        } catch (err) {
            pipelines = undefined;
            const message = err instanceof Error ? err.message : String(err);
            toaster.error({
                title: `An error occurred while reading the pipelines: ${message}`
            });
        }
    }

    onMount(updatePipelines);

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

    const pipelineChoices = $derived(pipelines ? groupPipelines(pipelines) : {});
    const pipelineVersionChoices = $derived(
        pipelineName && pipelineChoices ? Object.keys(pipelineChoices[pipelineName] ?? {}) : []
    );
    const pipeline = $derived(
        pipelineName && pipelineVersion ? pipelineChoices[pipelineName]?.[pipelineVersion] : undefined
    );
    const schema = $derived(profile?.parametersSchema);
    const parameterFields = $derived(getParameterFields(schema));
    const submitDisabled = $derived(!profile || profile.pipelineRunnable === false);
    const submitDisabledReason = $derived(
        profile?.pipelineRunnable === false
            ? 'This pipeline is disabled and cannot be submitted.'
            : 'Select a pipeline and version before submitting.'
    );

    $effect(() => {
        if (!outputPathInitialized) {
            outputPath = bucketURI;
            outputPathInitialized = true;
        }
    });

    $effect(() => {
        if (!pipelineVersionChoices.includes(pipelineVersion)) {
            pipelineVersion = '';
        }
    });

    $effect(() => {
        updateProfile(pipeline);
    });

    async function updateProfile(pipeline: Pipeline | undefined) {
        if (!pipeline) {
            profile = undefined;
            selectedProfileKey = '';
            setOptions({});
            return;
        }

        try {
            const newProfile = await getPipelineProfile(baseUrl, pipeline);
            profile = newProfile;
            initializeOptions(newProfile);
        } catch (err) {
            profile = undefined;
            selectedProfileKey = '';
            setOptions({});
            const message = err instanceof Error ? err.message : String(err);
            toaster.error({
                title: `An error occurred while reading the pipeline profile: ${message}`
            });
        }
    }

    function initializeOptions(profile: PipelineProfile) {
        const nextProfileKey = `${profile.pipelineName}:${profile.version}:${profile.pipelineId ?? ''}`;
        if (nextProfileKey === selectedProfileKey) {
            return;
        }

        selectedProfileKey = nextProfileKey;
        setOptions(getDefaultOptions(profile.parametersSchema));
    }

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

    function getFieldLabel(key: string, propertySchema: SchemaProperty): string {
        return propertySchema.title ?? key.replace(/^-+/, '');
    }

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

    function setOptions(next: Record<string, unknown>) {
        for (const key of Object.keys(options)) {
            if (!(key in next)) {
                delete options[key];
            }
        }

        for (const [key, value] of Object.entries(next)) {
            options[key] = value;
        }
    }

    function setOption(key: string, value: unknown) {
        options[key] = value;
    }

    function asString(value: unknown): string {
        return typeof value === 'string' ? value : value == null ? '' : String(value);
    }

    function asNumberInputValue(value: unknown): string | number {
        return typeof value === 'number' || typeof value === 'string' ? value : '';
    }

    function getMin(schema: SchemaProperty): number | undefined {
        return schema.minimum ?? schema.min;
    }

    function getMax(schema: SchemaProperty): number | undefined {
        return schema.maximum ?? schema.max;
    }

    function getCliOptionsString(options: Record<string, unknown>): string {
        return Object.entries(options)
            .filter(([, value]) => value !== undefined && value !== null && value !== '')
            .map(([key, value]) => `${key} ${String(value)}`)
            .join(' ');
    }

    function serialize(): Record<string, unknown> {
        const data: Record<string, unknown> = {
            pipelineName,
            pipelineVersion,
            outputPath
        };

        if (profile?.submission.encoding === 'cli-string') {
            data[profile.submission.optionsFieldName] = getCliOptionsString(options);
        } else if (profile?.submission.optionsFieldName) {
            data[profile.submission.optionsFieldName] = { ...options };
        }

        return data;
    }

    async function onSubmit() {
        if (submitDisabled) {
            return;
        }

        try {
            await axios.post(`${baseUrl}/dap/submit`, serialize());
            toaster.info({
                title: 'Job submitted'
            });
        } catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            toaster.error({
                title: `An error occurred while submitting the pipeline: ${message}`
            });
        }
    }
</script>

<div class="mb-4 space-y-2">
    <h2 class="text-primary-500 text-2xl font-semibold">Submit Pipeline</h2>
</div>

<div class="space-y-6">
    <section class="space-y-3">
        <h2 class="text-lg font-semibold">Pipeline</h2>
        <div class="grid grid-cols-1 gap-3">
            <label class="flex flex-col gap-1">
                <span class="text-xs opacity-70">pipelineName</span>
                <select
                    class="select select-bordered"
                    bind:value={pipelineName}
                    aria-label="Select pipeline"
                >
                    <option value="" disabled selected={pipelineName === ''}>
                        Select a pipeline...
                    </option>
                    {#each Object.keys(pipelineChoices) as name (name)}
                        <option value={name}>{name}</option>
                    {/each}
                </select>
            </label>

            <label class="flex flex-col gap-1">
                <span class="text-xs opacity-70">pipelineVersion</span>
                <select
                    class="select select-bordered"
                    bind:value={pipelineVersion}
                    disabled={pipelineName === '' || pipelineVersionChoices.length === 0}
                    aria-label="Select version"
                >
                    <option value="" disabled selected={pipelineVersion === ''}>
                        {pipelineName ? 'Select a version...' : 'Select a pipeline first'}
                    </option>

                    {#each pipelineVersionChoices as version (version)}
                        <option value={version}>{version}</option>
                    {/each}
                </select>
            </label>

            <label class="flex flex-col gap-1">
                <span class="text-xs opacity-70">outputPath</span>
                <input class="input input-bordered" type="text" bind:value={outputPath} />
            </label>
        </div>
    </section>

    {#if profile}
        <section class="space-y-3">
            <div>
                <h2 class="text-lg font-semibold">Parameters</h2>
                {#if profile.pipelineDescription}
                    <p class="text-sm opacity-70">{profile.pipelineDescription}</p>
                {/if}
            </div>

            {#if parameterFields.length > 0}
                <div class="grid grid-cols-1 gap-3">
                    {#each parameterFields as field (field.key)}
                        <label class="flex flex-col gap-1">
                            <span class="text-xs opacity-70">
                                {field.label}{field.required ? ' *' : ''}
                            </span>

                            {#if field.schema.enum}
                                <select
                                    class="select select-bordered"
                                    value={asString(options[field.key])}
                                    disabled={field.readonly}
                                    required={field.required}
                                    aria-label={field.label}
                                    onchange={(event) =>
                                        setOption(field.key, (event.target as HTMLSelectElement).value)}
                                >
                                    {#each field.schema.enum as option}
                                        <option value={asString(option)}>{asString(option)}</option>
                                    {/each}
                                </select>
                            {:else if field.schema.type === 'boolean' && !field.readonly}
                                <input
                                    class="checkbox"
                                    type="checkbox"
                                    checked={Boolean(options[field.key])}
                                    disabled={field.readonly}
                                    aria-label={field.label}
                                    onchange={(event) =>
                                        setOption(field.key, (event.target as HTMLInputElement).checked)}
                                />
                            {:else if field.schema.type === 'integer' || field.schema.type === 'number'}
                                <input
                                    class="input input-bordered"
                                    type="number"
                                    min={getMin(field.schema)}
                                    max={getMax(field.schema)}
                                    step={field.schema.type === 'integer' ? 1 : (field.schema.step ?? 'any')}
                                    value={asNumberInputValue(options[field.key])}
                                    readonly={field.readonly}
                                    required={field.required}
                                    aria-label={field.label}
                                    oninput={(event) => {
                                        const value = (event.target as HTMLInputElement).value;
                                        setOption(field.key, value === '' ? '' : Number(value));
                                    }}
                                />
                            {:else}
                                <input
                                    class="input input-bordered"
                                    type="text"
                                    value={asString(options[field.key])}
                                    readonly={field.readonly}
                                    required={field.required}
                                    aria-label={field.label}
                                    oninput={(event) =>
                                        setOption(field.key, (event.target as HTMLInputElement).value)}
                                />
                            {/if}

                            {#if field.schema.description}
                                <span class="text-xs opacity-60">{field.schema.description}</span>
                            {/if}
                        </label>
                    {/each}
                </div>
            {:else}
                <p class="text-sm opacity-70">This pipeline profile does not define parameters.</p>
            {/if}
        </section>
    {/if}

    <div class="group relative mt-2">
        <button
            type="submit"
            class="btn preset-filled-primary-500 w-full rounded-lg shadow-lg"
            disabled={submitDisabled}
            aria-describedby={submitDisabled ? 'submit-disabled-tooltip' : undefined}
            onclick={onSubmit}
        >
            Submit
        </button>
        {#if submitDisabled}
            <div
                id="submit-disabled-tooltip"
                role="tooltip"
                class="pointer-events-none absolute bottom-full left-1/2 z-10 mb-2 hidden w-max max-w-xs -translate-x-1/2 rounded bg-black px-3 py-2 text-center text-xs text-white group-hover:block"
            >
                {submitDisabledReason}
            </div>
        {/if}
    </div>
</div>
