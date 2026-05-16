import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { getPipelineProfile, getPipelines } from '$lib/pipeline';
import type { PipelineProfile } from '$lib/pipeline';
import Submit from './Submit.svelte';
import { bactopiaDevProfile } from './__fixtures__/pipeline-profile';
import { pipelines } from './__fixtures__/pipelines';

vi.mock('axios', () => ({
    default: {
        post: vi.fn()
    }
}));

vi.mock('$lib/pipeline', () => ({
    getPipelines: vi.fn(),
    getPipelineProfile: vi.fn()
}));

const runnableBactopiaDevProfile: PipelineProfile = {
    ...bactopiaDevProfile,
    pipelineRunnable: true
};

const editableProfile: PipelineProfile = {
    ...bactopiaDevProfile,
    pipelineRunnable: true,
    parametersSchema: {
        $schema: 'https://json-schema.org/draft/2020-12/schema',
        type: 'object',
        properties: {
            sample: {
                type: 'string',
                title: 'Sample',
                default: 'SRR123'
            },
            max_cpus: {
                type: 'integer',
                title: 'Max CPUs',
                minimum: 1,
                default: 8
            },
            use_cache: {
                type: 'boolean',
                title: 'Use cache',
                default: false
            },
            mode: {
                type: 'string',
                title: 'Mode',
                enum: ['fast', 'careful'],
                default: 'fast'
            },
            '-profile': {
                const: 'aws',
                default: 'aws'
            }
        },
        required: ['sample']
    }
};

async function selectBactopiaDev() {
    await waitFor(() => {
        expect(screen.getByRole('option', { name: 'Bactopia' })).toBeInTheDocument();
    });

    await fireEvent.change(screen.getByLabelText('Select pipeline'), {
        target: { value: 'Bactopia' }
    });
    await fireEvent.change(screen.getByLabelText('Select version'), {
        target: { value: 'dev' }
    });
}

describe('Submit.svelte', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getPipelines).mockResolvedValue(pipelines);
        vi.mocked(getPipelineProfile).mockResolvedValue(bactopiaDevProfile);
        vi.mocked(axios.post).mockResolvedValue({ data: {} });
    });

    it('loads a selected pipeline profile and renders schema-derived option fields', async () => {
        render(Submit, {
            props: {
                baseUrl: 'https://api.example.test',
                bucketURI: 's3://example-bucket/pipeline-output'
            }
        });

        const pipelineSelect = screen.getByLabelText('Select pipeline');

        await waitFor(() => {
            expect(screen.getByRole('option', { name: 'Bactopia' })).toBeInTheDocument();
        });

        await fireEvent.change(pipelineSelect, { target: { value: 'Bactopia' } });
        await fireEvent.change(screen.getByLabelText('Select version'), {
            target: { value: 'dev' }
        });

        await waitFor(() => {
            expect(getPipelineProfile).toHaveBeenCalledWith(
                'https://api.example.test',
                expect.objectContaining({
                    pipeline_name: 'Bactopia',
                    version: 'dev'
                })
            );
        });

        expect(await screen.findByText('aws_volumes')).toBeInTheDocument();
        expect(screen.queryByText('--aws_volumes')).not.toBeInTheDocument();
        expect(screen.getByDisplayValue('aws')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Submit' })).toBeDisabled();
        expect(screen.getByRole('tooltip')).toHaveTextContent(
            'This pipeline is disabled and cannot be submitted.'
        );
    });

    it('does not submit disabled pipelines', async () => {
        render(Submit, {
            props: {
                baseUrl: 'https://api.example.test',
                bucketURI: 's3://example-bucket/pipeline-output'
            }
        });

        await selectBactopiaDev();
        await screen.findByText('aws_volumes');
        await fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

        expect(axios.post).not.toHaveBeenCalled();
    });

    it('submits default schema values using the configured cli-string field name', async () => {
        vi.mocked(getPipelineProfile).mockResolvedValue(runnableBactopiaDevProfile);

        render(Submit, {
            props: {
                baseUrl: 'https://api.example.test',
                bucketURI: 's3://example-bucket/pipeline-output'
            }
        });

        await selectBactopiaDev();
        await screen.findByText('aws_volumes');
        await fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

        expect(axios.post).toHaveBeenCalledWith('https://api.example.test/dap/submit', {
            pipelineName: 'Bactopia',
            pipelineVersion: 'dev',
            outputPath: 's3://example-bucket/pipeline-output',
            nextflowOptions:
                '--aws_volumes /opt/conda:/mnt/conda,/mnt/nextflow_shared_data:/mnt/nextflow_shared_data:ro -profile aws'
        });
    });

    it('renders editable string, integer, boolean, enum, required, and const fields', async () => {
        vi.mocked(getPipelineProfile).mockResolvedValue(editableProfile);

        render(Submit, {
            props: {
                baseUrl: 'https://api.example.test',
                bucketURI: 's3://example-bucket/pipeline-output'
            }
        });

        await selectBactopiaDev();

        const sampleInput = await screen.findByLabelText('Sample *');
        const cpuInput = screen.getByLabelText('Max CPUs');
        const cacheCheckbox = screen.getByLabelText('Use cache');
        const modeSelect = screen.getByLabelText('Mode');
        const profileInput = screen.getByLabelText('profile');

        expect(sampleInput).toHaveValue('SRR123');
        expect(cpuInput).toHaveValue(8);
        expect(cacheCheckbox).not.toBeChecked();
        expect(modeSelect).toHaveValue('fast');
        expect(profileInput).toHaveValue('aws');
        expect(profileInput).toHaveAttribute('readonly');

        await fireEvent.input(sampleInput, { target: { value: 'SRR999' } });
        await fireEvent.input(cpuInput, { target: { value: '16' } });
        await fireEvent.click(cacheCheckbox);
        await fireEvent.change(modeSelect, { target: { value: 'careful' } });
        await fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

        expect(axios.post).toHaveBeenCalledWith('https://api.example.test/dap/submit', {
            pipelineName: 'Bactopia',
            pipelineVersion: 'dev',
            outputPath: 's3://example-bucket/pipeline-output',
            nextflowOptions: 'sample SRR999 max_cpus 16 use_cache true mode careful -profile aws'
        });
    });

    it('clears generated parameters when profile loading fails', async () => {
        vi.mocked(getPipelineProfile)
            .mockResolvedValueOnce(runnableBactopiaDevProfile)
            .mockRejectedValueOnce(new Error('profile unavailable'));

        render(Submit, {
            props: {
                baseUrl: 'https://api.example.test',
                bucketURI: 's3://example-bucket/pipeline-output'
            }
        });

        await selectBactopiaDev();
        expect(await screen.findByText('aws_volumes')).toBeInTheDocument();

        await fireEvent.change(screen.getByLabelText('Select version'), {
            target: { value: 'v3.2.0' }
        });

        await waitFor(() => {
            expect(screen.queryByText('aws_volumes')).not.toBeInTheDocument();
        });
    });

    it('renders an empty-parameters state for profiles without schema properties', async () => {
        vi.mocked(getPipelineProfile).mockResolvedValue({
            ...runnableBactopiaDevProfile,
            parametersSchema: {
                $schema: 'https://json-schema.org/draft/2020-12/schema',
                type: 'object',
                properties: {}
            }
        });

        render(Submit, {
            props: {
                baseUrl: 'https://api.example.test',
                bucketURI: 's3://example-bucket/pipeline-output'
            }
        });

        await selectBactopiaDev();

        expect(
            await screen.findByText('This pipeline profile does not define parameters.')
        ).toBeInTheDocument();
    });
});
