<script lang="ts">
    import { toaster } from '$lib/toaster';
    import axios from 'axios';
    import { onMount } from 'svelte';

    let { baseUrl, bucketURI } = $props<{ baseUrl: string; bucketURI: string }>();

    /**
     * Types
     */

    interface PipelineProfile {
        display_name: string;
        key: string;
    }
    interface Pipeline {
        display_name: string;
        pipeline_name: string;
        pipeline_type: string;
        version: string;
        profiles: PipelineProfile[];
    }
    type Options = Record<string, unknown>;
    type FieldSpec =
        | {
              type: 'number';
              label?: string;
              min?: number;
              max?: number;
              step?: number;
              default?: number;
          }
        | { type: 'text'; label?: string; default?: string }
        | { type: 'boolean'; label?: string; default?: boolean };
    type Schema = Record<string, FieldSpec>;
    type OptionsSchema = { schema: Schema; optionsFieldName: string };

    /**
     * State
     *
     * State is reactive data which triggers Svelte to re-render the page.
     */

    let pipelineChoices = $state<Record<string, string[]>>();
    let pipelineName = $state('');
    const pipelineVersionChoices = $derived(
        pipelineName && pipelineChoices ? (pipelineChoices[pipelineName] ?? []) : []
    );

    let pipelineVersion = $state('');
    let outputPath = $state(bucketURI);
    const options = $state<Options>({});
    let optionsInitialized = $state(false);
    const schema = $derived(getOptionSchema(pipelineName, pipelineVersion));

    $effect(() => {
        if (optionsInitialized && !schema) {
            setOptions({});
            optionsInitialized = false;
        } else if (!optionsInitialized && schema) {
            setOptions(getDefaultOptionsFromSchema(schema.schema));
            optionsInitialized = true;
        }
    });

    // JSON editor state
    let jsonText = $state('');
    let jsonError = $state<string | null>(null);

    // Loop guards to avoid feedback bounce
    let updatingFromForm = false;
    let updatingFromJSON = false;

    // if pipelineName changes and current version is invalid, clear it
    $effect(() => {
        if (!pipelineVersionChoices.includes(pipelineVersion)) {
            pipelineVersion = '';
        }
    });

    /**
     * Options.
     *
     * Options are a JSON object that store command line options that are used
     * by the pipeline.  Since the options depend on the specific pipeline that
     * is being run, these are configurable.
     *
     * A future API update will return something like and OptionSchema as part
     * of the /dap/pipelines endpoint.  Until then, we will hard-code the schema
     * here.
     */

    // Hard-coded lookup table for now
    const SCHEMAS: Record<string, Record<string, OptionsSchema>> = {
        'bactopia/bactopia': {
            'v3.0.1': {
                schema: {
                    max_cpus: { type: 'number', label: 'max_cpus', min: 1, step: 1, default: 8 },
                    max_memory: { type: 'text', label: 'max_memory', default: '24.GB' },
                    ont: { type: 'text', label: 'ont' },
                    sample: { type: 'text', label: 'sample' }
                },
                optionsFieldName: 'nextflowOptions'
            },
            'v3.2.0': {
                schema: {
                    max_cpus: { type: 'number', label: 'max_cpus', min: 1, step: 1, default: 8 },
                    max_memory: { type: 'text', label: 'max_memory', default: '24.GB' },
                    ont: { type: 'text', label: 'ont' },
                    sample: { type: 'text', label: 'sample' }
                },
                optionsFieldName: 'nextflowOptions'
            }
        }
        // Add more pipelines/versions here as needed
    };

    /**
     * Get the options schema
     *
     * TODO: replace this hard-coded look-up table with an API call
     *
     * @param pipelineName - the pipeline name
     * @param pipelineVersion - the pipeline version
     */
    function getOptionSchema(
        pipelineName: string,
        pipelineVersion: string
    ): OptionsSchema | undefined {
        const p = SCHEMAS[pipelineName];
        if (p) {
            return p[pipelineVersion];
        } else {
            return undefined;
        }
    }

    /**
     * Construct an options object from the Schema's defaults
     * @param s - the schema
     */
    function getDefaultOptionsFromSchema(s: Schema): Record<string, unknown> {
        const out: Record<string, unknown> = {};
        for (const [key, spec] of Object.entries(s)) {
            // include only if a default is provided
            if ('default' in spec && spec.default !== undefined) {
                out[key] = spec.default as unknown;
            }
        }
        return out;
    }

    function setOption(key: string, value: unknown) {
        options[key] = value;
    }

    /**
     * Mutate the options state in place to contain new values
     * @param next - the replacement values to use
     */
    function setOptions(next: Record<string, unknown>) {
        for (const key of Object.keys(options)) {
            if (!(key in next)) delete options[key];
        }
        for (const [k, v] of Object.entries(next)) {
            options[k] = v;
        }
    }

    function asString(v: unknown) {
        return typeof v === 'string' ? v : v == null ? '' : String(v);
    }

    function getOptionString(options: Record<string, unknown>): string {
        return Object.entries(options)
            .filter(([_, v]) => v !== undefined && v !== null && v !== '')
            .map(([k, v]) => `--${k} ${v}`)
            .join(' ');
    }

    /**
     * Restructure the API output into an object with pipeline names as keys
     *  and versions as values
     */
    function getPipelineChoices(pipelines: Pipeline[]): Record<string, string[]> {
        const grouped = pipelines.reduce(
            (acc, p) => {
                if (!acc[p.pipeline_name]) {
                    acc[p.pipeline_name] = [];
                }
                acc[p.pipeline_name].push(p.version);
                return acc;
            },
            {} as Record<string, string[]>
        );

        return Object.fromEntries(Object.entries(grouped).sort(([a], [b]) => a.localeCompare(b)));
    }

    /**
     * Query the API for the registered pipelines
     */
    async function getPipelines() {
        try {
            const url = `${baseUrl}/dap/pipelines`;
            const response = await axios.get(url);
            const pipelines: Pipeline[] = response.data;
            pipelineChoices = getPipelineChoices(pipelines);
        } catch (err: any) {
            const message = err instanceof Error ? err.message : String(err);
            toaster.error({
                title: `An error occurred while reading the pipelines: ${message}`
            });
        }
    }

    /** As soon as the component mounts, fetch the registered pipelines */
    onMount(getPipelines);

    // Json

    /**
     * Convert form state into a JSON object
     */
    function serialize() {
        const fieldName = schema?.optionsFieldName;
        const optionsString = getOptionString(options);
        const obj: Record<string, unknown> = {
            pipelineName,
            pipelineVersion,
            outputPath
        };
        if (fieldName) {
            obj[fieldName] = optionsString;
        }
        return obj;
    }

    function safeCloneOptions(o: unknown): Record<string, unknown> {
        if (!o || typeof o !== 'object' || Array.isArray(o)) return {};
        // shallow clone to a plain record
        return { ...(o as Record<string, unknown>) };
    }

    function onJsonInput(txt: string) {
        jsonText = txt;
        if (updatingFromForm) return;

        try {
            updatingFromJSON = true;
            const obj = JSON.parse(txt);

            if (typeof obj.pipelineName === 'string') pipelineName = obj.pipelineName;
            if (typeof obj.pipelineVersion === 'string') pipelineVersion = obj.pipelineVersion;
            if (typeof obj.outputPath === 'string') outputPath = obj.outputPath;

            if ('options' in obj) {
                setOptions(safeCloneOptions(obj.options));
            }

            jsonError = null;
        } catch (e: any) {
            jsonError = e?.message ?? 'Invalid JSON';
        } finally {
            updatingFromJSON = false;
        }
    }

    $effect(() => {
        if (updatingFromJSON) return;
        updatingFromForm = true;
        jsonText = JSON.stringify(serialize(), null, 2);
        jsonError = null;
        updatingFromForm = false;
    });

    async function onSubmit() {
        if (jsonError) return;
        try {
            const url = `${baseUrl}/dap/submit`;
            const data = serialize();
            const result = await axios.post(url, data);
            toaster.info({
                title: `Job submitted`
            });
        } catch (err: any) {
            const message = err instanceof Error ? err.message : String(err);
            toaster.error({
                title: `An error occurred while reading the pipelines: ${message}`
            });
        }
    }
</script>

<div class="mb-4 space-y-2">
    <h2 class="text-2xl font-semibold text-primary-500">Submit Pipeline</h2>
</div>


<div class="space-y-6">
    <!-- A. Pipeline -->
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
                    <option value="" disabled selected={pipelineName === ''}
                        >Select a pipeline…</option
                    >
                    {#if pipelineChoices}
                        {#each Object.keys(pipelineChoices) as name (name)}
                            <option value={name}>{name}</option>
                        {/each}
                    {/if}
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
                        {pipelineName ? 'Select a version…' : 'Select a pipeline first'}
                    </option>

                    {#if pipelineVersionChoices.length > 0}
                        {#each pipelineVersionChoices as v (v)}
                            <option value={v}>{v}</option>
                        {/each}
                    {/if}
                </select>
            </label>

            <label class="flex flex-col gap-1">
                <span class="text-xs opacity-70">outputPath</span>
                <input class="input input-bordered" type="text" bind:value={outputPath} />
            </label>
        </div>
    </section>

    {#if schema}
        <!-- B. Options -->
        <section class="space-y-3">
            <div class="flex items-center gap-2">
                <h2 class="text-lg font-semibold">Flags</h2>
                {#if !schema}
                    <span class="text-xs opacity-60">Fill pipeline name & version to configure</span
                    >
                {/if}
            </div>

            <!-- Schema-driven fields -->

            <div class="grid grid-cols-1 gap-3">
                {#each Object.entries(schema.schema) as [k, spec] (k)}
                    <label class="flex flex-col gap-1">
                        <span class="text-xs opacity-70">{spec.label ?? k}</span>

                        {#if spec.type === 'number'}
                            <input
                                class="input input-bordered"
                                type="number"
                                min={spec.min}
                                max={spec.max}
                                step={spec.step ?? 1}
                                value={typeof options[k] === 'number' ||
                                typeof options[k] === 'string'
                                    ? (options[k] as any)
                                    : ''}
                                oninput={(e) => {
                                    const v = (e.target as HTMLInputElement).value;
                                    setOption(k, v === '' ? '' : Number(v));
                                }}
                            />
                        {:else if spec.type === 'boolean'}
                            <input
                                class="checkbox"
                                type="checkbox"
                                checked={Boolean(options[k])}
                                onchange={(e) =>
                                    setOption(k, (e.target as HTMLInputElement).checked)}
                            />
                        {:else}
                            <!-- text -->
                            <input
                                class="input input-bordered"
                                type="text"
                                value={asString(options[k])}
                                oninput={(e) => setOption(k, (e.target as HTMLInputElement).value)}
                            />
                        {/if}
                    </label>
                {/each}
            </div>
        </section>
    {/if}

    <!-- JSON editor -->
    <section class="space-y-2">
        <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">JSON</h2>
        </div>
        <textarea
            class="textarea textarea-bordered min-h-[220px] w-full font-mono text-sm leading-5"
            spellcheck="false"
            oninput={(e) => onJsonInput((e.target as HTMLTextAreaElement).value)}
            >{jsonText}</textarea
        >
        {#if jsonError}
            <div>
                <span class="text-error-600 text-xs">Parse error: {jsonError}</span>
            </div>
        {/if}
    </section>

    <div class="mt-2">
        <button
            type="submit"
            class="btn preset-filled-primary-500 w-full rounded-lg shadow-lg"
            onclick={onSubmit}
        >
            Submit
        </button>
    </div>
</div>
