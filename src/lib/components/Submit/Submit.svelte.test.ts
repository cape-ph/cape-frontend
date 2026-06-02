import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import { getWorkflows, getWorkflowProfiles } from '$lib/pipeline';
import type { PipelineProfile, WorkflowDAG } from '$lib/pipeline';
import Submit from './Submit.svelte';

vi.mock('axios', () => ({
    default: {
        post: vi.fn()
    }
}));

vi.mock('$lib/pipeline', () => ({
    getWorkflows: vi.fn(),
    getWorkflowProfiles: vi.fn(),
    compile: vi.fn(() => () => true) // Mock validator that always passes
}));

const mockWorkflows: WorkflowDAG[] = [
    {
        dag_id: 'test-workflow',
        dag_display_name: 'Test Workflow',
        description: 'Test workflow description',
        is_paused: false
    }
];

const mockProfiles: PipelineProfile[] = [
    {
        pipelineName: 'Stage 1',
        pipelineId: 'stage-1',
        pipelineDescription: 'First stage',
        project: 'test',
        version: 'v1.0.0',
        pipelineType: 'workflow',
        parametersSchema: {
            type: 'object',
            properties: {
                param1: { type: 'string', default: 'value1' }
            }
        },
        submission: {
            encoding: 'cli-string',
            optionsFieldName: 'options'
        }
    }
];

describe('Submit.svelte', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getWorkflows).mockResolvedValue(mockWorkflows);
        vi.mocked(getWorkflowProfiles).mockResolvedValue(mockProfiles);
        vi.mocked(axios.post).mockResolvedValue({ data: {} });
    });

    it('loads workflows and shows workflow selection', async () => {
        render(Submit, {
            props: {
                baseUrl: 'https://api.example.test'
            }
        });

        await waitFor(() => {
            expect(screen.getByLabelText('Select workflow')).toBeInTheDocument();
        });

        expect(screen.getByText('Test Workflow')).toBeInTheDocument();
    });

    it('fetches workflow profiles when a workflow is selected', async () => {
        render(Submit, {
            props: {
                baseUrl: 'https://api.example.test'
            }
        });

        await waitFor(() => {
            expect(screen.getByText('Test Workflow')).toBeInTheDocument();
        });

        const select = screen.getByLabelText('Select workflow');
        await fireEvent.change(select, { target: { value: 'test-workflow' } });

        await waitFor(() => {
            expect(getWorkflowProfiles).toHaveBeenCalledWith(
                'https://api.example.test',
                'test-workflow'
            );
        });
    });

    it('shows workflow stages when profiles are loaded', async () => {
        render(Submit, {
            props: {
                baseUrl: 'https://api.example.test'
            }
        });

        await waitFor(() => {
            expect(screen.getByText('Test Workflow')).toBeInTheDocument();
        });

        const select = screen.getByLabelText('Select workflow');
        await fireEvent.change(select, { target: { value: 'test-workflow' } });

        await waitFor(() => {
            expect(screen.getByText(/Stage 1: Stage 1/)).toBeInTheDocument();
        });
    });

    it('submit button is disabled when no workflow is selected', async () => {
        render(Submit, {
            props: {
                baseUrl: 'https://api.example.test'
            }
        });

        const submitButton = await screen.findByRole('button', { name: 'Submit Workflow' });
        expect(submitButton).toBeDisabled();
    });

    it('shows submission preview without actually submitting', async () => {
        // Mock window.alert
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
        const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

        render(Submit, {
            props: {
                baseUrl: 'https://api.example.test'
            }
        });

        await waitFor(() => {
            expect(screen.getByText('Test Workflow')).toBeInTheDocument();
        });

        const select = screen.getByLabelText('Select workflow');
        await fireEvent.change(select, { target: { value: 'test-workflow' } });

        await waitFor(() => {
            expect(screen.getByText(/Stage 1: Stage 1/)).toBeInTheDocument();
        });

        const submitButton = screen.getByRole('button', { name: 'Submit Workflow' });
        await fireEvent.click(submitButton);

        await waitFor(() => {
            // Should show alert with API call details
            expect(alertSpy).toHaveBeenCalled();
            const alertMessage = alertSpy.mock.calls[0][0];
            expect(alertMessage).toContain('Would POST to:');
            expect(alertMessage).toContain('/workflows/trigger?dagId=test-workflow');
            expect(alertMessage).toContain('array format');
        });

        // Should NOT actually call axios.post
        expect(axios.post).not.toHaveBeenCalled();

        alertSpy.mockRestore();
        consoleSpy.mockRestore();
    });
});
