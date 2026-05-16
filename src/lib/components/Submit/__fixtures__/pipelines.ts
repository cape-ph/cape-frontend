import type { Pipeline } from '$lib/pipeline';

export const pipelines: Pipeline[] = [
    {
        pipeline_name: 'Bactopia ONT Sample',
        pipeline_type: 'nextflow',
        project: 'bactopia/bactopia',
        version: 'dev'
    },
    {
        pipeline_name: 'Bactopia',
        pipeline_type: 'nextflow',
        project: 'bactopia/bactopia',
        version: 'dev'
    },
    {
        pipeline_name: 'Bactopia ONT Sample',
        pipeline_type: 'nextflow',
        project: 'bactopia/bactopia',
        version: 'v3.2.0'
    },
    {
        pipeline_name: 'Bactopia Kraken2',
        pipeline_type: 'nextflow',
        project: 'bactopia/bactopia',
        version: 'v3.2.0'
    },
    {
        pipeline_name: 'Bactopia',
        pipeline_type: 'nextflow',
        project: 'bactopia/bactopia',
        version: 'v3.2.0'
    },
    {
        pipeline_name: 'Bactopia Kraken2',
        pipeline_type: 'nextflow',
        project: 'bactopia/bactopia',
        version: 'dev'
    }
];
