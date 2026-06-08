import type { PipelineProfile } from '$lib/pipeline';

export const bactopiaDevProfile: PipelineProfile = {
    parametersSchema: {
        $defs: {},
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
            '--aws_volumes': {
                const: '/opt/conda:/mnt/conda,/mnt/nextflow_shared_data:/mnt/nextflow_shared_data:ro',
                default:
                    '/opt/conda:/mnt/conda,/mnt/nextflow_shared_data:/mnt/nextflow_shared_data:ro'
            },
            '-profile': {
                const: 'aws',
                default: 'aws'
            }
        }
    },
    pipelineName: 'Bactopia',
    pipelineDescription: 'Execute Bactopia development release',
    project: 'bactopia/bactopia',
    submission: {
        encoding: 'cli-string',
        optionsFieldName: 'nextflowOptions'
    },
    pipelineType: 'nextflow',
    version: 'dev',
    pipelineRunnable: false,
    pipelineId: 'bactopia-bactopia-base-dev'
};
