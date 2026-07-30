import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('$lib/apiClient', () => ({
    capi: { get: vi.fn(), post: vi.fn(), patch: vi.fn() }
}));

import { capi } from '$lib/apiClient';
import { getMyWorkflowRuns, getPipelineConfigsFromRun } from './workflowStatus';
import type { WorkflowRun } from './workflowStatus';

function buildRun(overrides: Partial<WorkflowRun> = {}): WorkflowRun {
    return {
        dag_run_id: 'run-1',
        dag_id: 'dag-1',
        logical_date: '2026-07-20T00:00:00Z',
        queued_at: '2026-07-20T00:00:00Z',
        start_date: null,
        end_date: null,
        data_interval_start: '',
        data_interval_end: '',
        run_after: '',
        last_scheduling_decision: null,
        run_type: 'manual',
        state: 'queued',
        conf: {},
        dag_versions: [],
        ...overrides
    };
}

describe('getMyWorkflowRuns', () => {
    beforeEach(() => {
        vi.mocked(capi.get).mockReset();
    });

    it('requests the runs endpoint and returns the dag_runs array', async () => {
        const runs = [buildRun(), buildRun({ dag_run_id: 'run-2' })];
        vi.mocked(capi.get).mockResolvedValue({ data: { dag_runs: runs, total_entries: 2 } });

        const result = await getMyWorkflowRuns('https://api.example.test');

        expect(capi.get).toHaveBeenCalledWith('https://api.example.test/workflows/runs');
        expect(result).toHaveLength(2);
        expect(result[1].dag_run_id).toBe('run-2');
    });

    it('returns an empty array when the response has no dag_runs', async () => {
        vi.mocked(capi.get).mockResolvedValue({ data: { total_entries: 0 } });
        const result = await getMyWorkflowRuns('https://api.example.test');
        expect(result).toEqual([]);
    });
});

describe('getPipelineConfigsFromRun', () => {
    it('extracts pipeline configs from conf.pipelineConfigs', () => {
        const run = buildRun({
            conf: {
                pipelineConfigs: [
                    { pipelineId: 'stage-1', nextflowOptions: { a: 1 } },
                    { pipelineId: 'stage-2' }
                ]
            }
        });
        const configs = getPipelineConfigsFromRun(run);
        expect(configs).toHaveLength(2);
        expect(configs[0].pipelineId).toBe('stage-1');
        expect(configs[0].nextflowOptions).toEqual({ a: 1 });
    });

    it('returns an empty array when conf has no pipelineConfigs', () => {
        expect(getPipelineConfigsFromRun(buildRun({ conf: {} }))).toEqual([]);
        expect(getPipelineConfigsFromRun(buildRun({ conf: { pipelineConfigs: 'nope' } }))).toEqual(
            []
        );
    });

    it('skips entries that are not objects or lack a string pipelineId', () => {
        const run = buildRun({
            conf: {
                pipelineConfigs: [
                    { pipelineId: 'stage-1' },
                    null,
                    'garbage',
                    { nextflowOptions: { a: 1 } },
                    { pipelineId: 42 }
                ]
            }
        });
        const configs = getPipelineConfigsFromRun(run);
        expect(configs).toHaveLength(1);
        expect(configs[0].pipelineId).toBe('stage-1');
    });

    it('normalizes a non-object nextflowOptions to undefined', () => {
        const run = buildRun({
            conf: { pipelineConfigs: [{ pipelineId: 'stage-1', nextflowOptions: 'nope' }] }
        });
        expect(getPipelineConfigsFromRun(run)[0].nextflowOptions).toBeUndefined();
    });

    it('keeps every stage when a workflow reuses the same pipeline', () => {
        const run = buildRun({
            conf: {
                pipelineConfigs: [
                    { pipelineId: 'shared', nextflowOptions: { stage: 1 } },
                    { pipelineId: 'shared', nextflowOptions: { stage: 2 } }
                ]
            }
        });
        const configs = getPipelineConfigsFromRun(run);
        expect(configs).toHaveLength(2);
        expect(configs.map((c) => c.nextflowOptions)).toEqual([{ stage: 1 }, { stage: 2 }]);
    });
});
