import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getWorkflows, getWorkflowProfiles } from '$lib/pipeline';
import type { PipelineProfile, WorkflowDAG } from '$lib/pipeline';
import Submit from './Submit.svelte';

vi.mock('$lib/pipeline', () => ({
    getWorkflows: vi.fn(),
    getWorkflowProfiles: vi.fn()
}));

vi.mock('$lib/schema', () => ({
    getParameterFields: vi.fn(async (schema: Record<string, unknown>) => {
        const required = Array.isArray(schema.required) ? schema.required : [];
        const properties = (schema.properties ?? {}) as Record<string, Record<string, unknown>>;

        return Object.entries(properties).map(([key, property]) => ({
            key,
            label: typeof property.title === 'string' ? property.title : key,
            schema: property,
            required: required.includes(key),
            readonly: 'const' in property
        }));
    }),
    getDefaultOptions: vi.fn((fields) =>
        Object.fromEntries(
            fields.map((field: { key: string; schema: Record<string, unknown> }) => {
                if ('default' in field.schema) {
                    return [field.key, field.schema.default];
                }

                if ('const' in field.schema) {
                    return [field.key, field.schema.const];
                }

                if (field.schema.type === 'boolean') {
                    return [field.key, false];
                }

                return [field.key, ''];
            })
        )
    ),
    coerceOptionsForValidation: vi.fn(
        (
            fields: Array<{ key: string; readonly: boolean; schema: Record<string, unknown> }>,
            options: Record<string, unknown>
        ) => {
            const fieldsByKey = new Map(fields.map((field) => [field.key, field]));

            return Object.fromEntries(
                Object.entries(options).flatMap(([key, value]) => {
                    const field = fieldsByKey.get(key);
                    if (value === '' || value === null || value === undefined) {
                        return [];
                    }

                    if (!field || field.readonly) {
                        return [[key, value]];
                    }

                    if (field.schema.type === 'integer') {
                        return [[key, Number(value)]];
                    }

                    return [[key, value]];
                })
            );
        }
    ),
    compile: vi.fn(
        (schema: { required?: string[]; properties?: Record<string, { type?: string }> }) => {
            const validator = ((data: Record<string, unknown>) => {
                const errors: Array<{
                    instancePath: string;
                    keyword: string;
                    message?: string;
                    params?: Record<string, unknown>;
                }> = [];

                for (const key of schema.required ?? []) {
                    if (!(key in data)) {
                        errors.push({
                            instancePath: '',
                            keyword: 'required',
                            params: { missingProperty: key }
                        });
                    }
                }

                for (const [key, property] of Object.entries(schema.properties ?? {})) {
                    if (
                        property.type === 'integer' &&
                        key in data &&
                        !Number.isInteger(data[key])
                    ) {
                        errors.push({
                            instancePath: `/${key}`,
                            keyword: 'type',
                            params: { type: 'integer' }
                        });
                    }
                }

                validator.errors = errors;
                return errors.length === 0;
            }) as ((data: Record<string, unknown>) => boolean) & { errors?: unknown[] };

            validator.errors = [];
            return validator;
        }
    )
}));

const mockWorkflows: WorkflowDAG[] = [
    {
        dag_id: 'test-workflow',
        dag_display_name: 'Test Workflow',
        description: 'Test workflow description',
        is_paused: false
    }
];

function createProfile(overrides: Partial<PipelineProfile> = {}): PipelineProfile {
    return {
        pipelineName: 'Stage 1',
        pipelineId: 'stage-1',
        pipelineDescription: 'First stage',
        project: 'test',
        version: 'v1.0.0',
        pipelineType: 'workflow',
        parametersSchema: {
            type: 'object',
            required: ['param1'],
            properties: {
                param1: { type: 'string', title: 'Parameter 1' }
            }
        },
        submission: {
            encoding: 'cli-string',
            optionsFieldName: 'options'
        },
        ...overrides
    };
}

async function renderSelectedSubmit(profiles: PipelineProfile[] = [createProfile()]) {
    vi.mocked(getWorkflowProfiles).mockResolvedValue(profiles);

    render(Submit, {
        props: {
            baseUrl: 'https://api.example.test'
        }
    });

    const select = await screen.findByLabelText('Select workflow');
    await waitFor(() => expect(select).not.toBeDisabled());
    await fireEvent.change(select, { target: { value: 'test-workflow' } });

    await waitFor(() => {
        expect(getWorkflowProfiles).toHaveBeenCalledWith(
            'https://api.example.test',
            'test-workflow'
        );
    });

    return { select };
}

describe('Submit.svelte', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.mocked(getWorkflows).mockResolvedValue(mockWorkflows);
    });

    it('loads workflows and fetches profiles for the selected workflow', async () => {
        const { select } = await renderSelectedSubmit();

        expect(select).toHaveValue('test-workflow');
        expect(await screen.findByLabelText('Parameter 1')).toBeInTheDocument();
    });

    it('keeps submit disabled until profiles are loaded', async () => {
        render(Submit, {
            props: {
                baseUrl: 'https://api.example.test'
            }
        });

        const submitButton = await screen.findByRole('button', { name: 'Submit Workflow' });
        expect(submitButton).toBeDisabled();
    });

    it('blocks preview when required data is missing and clears field errors on edit', async () => {
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
        await renderSelectedSubmit();

        const submitButton = screen.getByRole('button', { name: 'Submit Workflow' });
        await fireEvent.click(submitButton);

        const field = screen.getByLabelText('Parameter 1');
        await waitFor(() => expect(field).toHaveAttribute('aria-invalid', 'true'));
        expect(alertSpy).not.toHaveBeenCalled();

        await fireEvent.input(field, { target: { value: 'value1' } });
        expect(field).toHaveAttribute('aria-invalid', 'false');

        alertSpy.mockRestore();
    });

    it('previews an ordered array payload without making a network submission', async () => {
        const alertSpy = vi.spyOn(window, 'alert').mockImplementation(() => {});
        await renderSelectedSubmit([
            createProfile({
                pipelineId: 'stage-1',
                parametersSchema: {
                    type: 'object',
                    properties: {
                        param1: { type: 'string', default: 'first' }
                    }
                }
            }),
            createProfile({
                pipelineName: 'Stage 2',
                pipelineId: 'stage-2',
                parametersSchema: {
                    type: 'object',
                    properties: {
                        param2: { type: 'string', default: 'second' }
                    }
                }
            })
        ]);

        await fireEvent.click(screen.getByRole('button', { name: 'Submit Workflow' }));

        expect(alertSpy).toHaveBeenCalledOnce();
        const alertMessage = String(alertSpy.mock.calls[0][0]);
        const payload = JSON.parse(alertMessage.slice(alertMessage.indexOf('[\n')));

        expect(Array.isArray(payload)).toBe(true);
        expect(payload).toHaveLength(2);
        expect(
            payload.map(
                (stage: { nextflowOptions: Record<string, unknown> }) =>
                    stage.nextflowOptions.param1 ?? stage.nextflowOptions.param2
            )
        ).toEqual(['first', 'second']);

        alertSpy.mockRestore();
    });

    it('ignores stale profile responses after workflow selection changes', async () => {
        const workflows: WorkflowDAG[] = [
            ...mockWorkflows,
            {
                dag_id: 'second-workflow',
                dag_display_name: 'Second Workflow',
                description: 'Second workflow description',
                is_paused: false
            }
        ];
        vi.mocked(getWorkflows).mockResolvedValue(workflows);

        let resolveFirst: (profiles: PipelineProfile[]) => void = () => {};
        const firstProfiles = new Promise<PipelineProfile[]>((resolve) => {
            resolveFirst = resolve;
        });

        vi.mocked(getWorkflowProfiles)
            .mockReturnValueOnce(firstProfiles)
            .mockResolvedValueOnce([
                createProfile({
                    pipelineName: 'Second Stage',
                    pipelineId: 'second-stage',
                    parametersSchema: {
                        type: 'object',
                        properties: {
                            secondParam: { type: 'string', title: 'Second Parameter' }
                        }
                    }
                })
            ]);

        render(Submit, {
            props: {
                baseUrl: 'https://api.example.test'
            }
        });

        const select = await screen.findByLabelText('Select workflow');
        await waitFor(() => expect(select).not.toBeDisabled());
        await fireEvent.change(select, { target: { value: 'test-workflow' } });
        await fireEvent.change(select, { target: { value: 'second-workflow' } });

        resolveFirst([createProfile()]);

        expect(await screen.findByLabelText('Second Parameter')).toBeInTheDocument();
        expect(screen.queryByLabelText('Parameter 1')).not.toBeInTheDocument();
    });

    it('adds stable form identifiers to generated controls', async () => {
        await renderSelectedSubmit();

        const field = await screen.findByLabelText('Parameter 1');

        expect(field).toHaveAttribute('id');
        expect(field).toHaveAttribute('name', 'param1');
    });
});
