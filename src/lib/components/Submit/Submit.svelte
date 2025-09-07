<script lang="ts">
    type Options = Record<string, unknown>;
    type FieldSpec =
        | { type: 'number'; label?: string; min?: number; max?: number; step?: number }
        | { type: 'text'; label?: string; placeholder?: string }
        | { type: 'boolean'; label?: string };
    type Schema = Record<string, FieldSpec>;
    type OptionsSchema = { schema: Schema; optionsFieldName: string };

    // Form state
    let pipelineName = $state('');
    let pipelineVersion = $state('');
    let outputPath = $state('');
    const options = $state<Options>({});
    const schema = $derived(getOptionSchema(pipelineName, pipelineVersion));

    // JSON editor state
    let jsonText = $state('');
    let jsonError = $state<string | null>(null);

    // Loop guards to avoid feedback bounce
    let updatingFromForm = false;
    let updatingFromJSON = false;

    // Hard-coded lookup table for now
    const SCHEMAS: Record<string, OptionsSchema> = {
        'bactopia/bactopia@v3.2.0': {
            schema: {
                max_cpus: { type: 'number', label: 'max_cpus', min: 1, step: 1 },
                max_memory: { type: 'text', label: 'max_memory', placeholder: '24.GB' },
                ont: { type: 'text', label: 'ont', placeholder: 's3://.../reads.gz' },
                sample: { type: 'text', label: 'sample', placeholder: 'abcdefghij' }
            },
            optionsFieldName: 'nextflowOptions'
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
        const key = `${pipelineName.trim()}@${pipelineVersion.trim()}`;
        return SCHEMAS[key];
    }

    function setOption(key: string, value: unknown) {
        options[key] = value;
    }

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

    // Json

    /**
     * Convert form state into a JSON formatted string
     */
    function serialize(): string {
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
        return JSON.stringify(obj, null, 2);
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
        jsonText = serialize();
        jsonError = null;
        updatingFromForm = false;
    });
</script>

<div class="space-y-6">
    <!-- A. Pipeline -->
    <section class="space-y-3">
        <h2 class="text-lg font-semibold">Pipeline</h2>
        <div class="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label class="flex flex-col gap-1">
                <span class="text-xs opacity-70">pipelineName</span>
                <input
                    class="input input-bordered"
                    type="text"
                    bind:value={pipelineName}
                    placeholder="bactopia/bactopia"
                />
            </label>

            <label class="flex flex-col gap-1">
                <span class="text-xs opacity-70">pipelineVersion</span>
                <input
                    class="input input-bordered"
                    type="text"
                    bind:value={pipelineVersion}
                    placeholder="v3.2.0"
                />
            </label>

            <label class="flex flex-col gap-1">
                <span class="text-xs opacity-70">outputPath</span>
                <input
                    class="input input-bordered"
                    type="text"
                    bind:value={outputPath}
                    placeholder="s3://bucket/pipeline-output"
                />
            </label>
        </div>
    </section>

    <!-- B. Options -->
    <section class="space-y-3">
        <div class="flex items-center gap-2">
            <h2 class="text-lg font-semibold">Options</h2>
            {#if !schema}
                <span class="text-xs opacity-60">Fill pipeline name & version to configure</span>
            {/if}
        </div>

        <!-- Schema-driven fields -->
        {#if schema}
            <div class="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
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
                                placeholder="e.g. 8"
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
                                placeholder={spec.placeholder ?? ''}
                            />
                        {/if}
                    </label>
                {/each}
            </div>
        {/if}
    </section>

    <!-- JSON editor -->
    <section class="space-y-2">
        <div class="flex items-center justify-between">
            <h2 class="text-lg font-semibold">JSON</h2>
            {#if jsonError}<span class="text-error-600 text-xs">Parse error: {jsonError}</span>{/if}
        </div>
        <textarea
            class="textarea textarea-bordered min-h-[220px] w-full font-mono text-sm leading-5"
            spellcheck="false"
            oninput={(e) => onJsonInput((e.target as HTMLTextAreaElement).value)}
            >{jsonText}</textarea
        >
    </section>
</div>
