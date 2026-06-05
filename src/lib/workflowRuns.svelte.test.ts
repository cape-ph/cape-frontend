import { describe, it, expect, beforeEach } from 'vitest';
import {
    type WorkflowRunStatus,
    workflowRuns,
    getRunKey,
    setStoredRuns,
    addStoredRun,
    removeStoredRun,
    setLiveStatus,
    getLiveStatus,
    clearLiveStatus
} from './workflowRuns.svelte';
import type { StoredWorkflowRun } from './workflowRunsStorage';
import { SvelteMap } from 'svelte/reactivity';

const buildStoredRun = (overrides: Partial<StoredWorkflowRun> = {}): StoredWorkflowRun => ({
    dagId: 'dag-1',
    dagRunId: 'run-1',
    submittedAt: '2024-01-01T00:00:00.000Z',
    ...overrides
});

const buildStatus = (overrides: Partial<WorkflowRunStatus> = {}): WorkflowRunStatus => ({
    run: null,
    isAvailable: true,
    lastFetched: 1700000000000,
    ...overrides
});

describe('workflowRuns reactive state', () => {
    beforeEach(() => {
        // Reset global state between tests to avoid bleed-through
        workflowRuns.stored = [];
        workflowRuns.liveStatus = new SvelteMap();
    });

    describe('getRunKey', () => {
        it('builds composite key from dagId and dagRunId', () => {
            expect(getRunKey('dag', 'run')).toBe('dag::run');
            expect(getRunKey('pipeline-123', 'abc-456')).toBe('pipeline-123::abc-456');
        });
    });

    describe('setStoredRuns', () => {
        it('replaces stored runs with provided array', () => {
            const initial = [buildStoredRun({ dagRunId: 'initial' })];
            const next = [
                buildStoredRun({ dagRunId: 'next-1' }),
                buildStoredRun({ dagRunId: 'next-2' })
            ];

            workflowRuns.stored = initial;

            setStoredRuns(next);

            expect(workflowRuns.stored).toEqual(next);
        });

        it('handles empty array', () => {
            workflowRuns.stored = [buildStoredRun()];

            setStoredRuns([]);

            expect(workflowRuns.stored).toEqual([]);
        });
    });

    describe('addStoredRun', () => {
        it('prepends a new run when not present', () => {
            const existing = buildStoredRun({ dagRunId: 'existing' });
            const incoming = buildStoredRun({ dagRunId: 'incoming' });

            workflowRuns.stored = [existing];

            addStoredRun(incoming);

            expect(workflowRuns.stored).toEqual([incoming, existing]);
        });

        it('does not add duplicate based on dagId and dagRunId', () => {
            const run = buildStoredRun();
            workflowRuns.stored = [run];

            addStoredRun({ ...run });

            expect(workflowRuns.stored).toHaveLength(1);
            expect(workflowRuns.stored[0]).toEqual(run);
        });
    });

    describe('removeStoredRun', () => {
        it('removes run matching dagId and dagRunId', () => {
            const run1 = buildStoredRun({ dagRunId: 'run-1' });
            const run2 = buildStoredRun({ dagRunId: 'run-2' });
            workflowRuns.stored = [run1, run2];

            removeStoredRun(run1.dagId, run1.dagRunId);

            expect(workflowRuns.stored).toEqual([run2]);
        });

        it('is a no-op when no matching run exists', () => {
            const run = buildStoredRun();
            workflowRuns.stored = [run];

            removeStoredRun('other-dag', 'other-run');

            expect(workflowRuns.stored).toEqual([run]);
        });
    });

    describe('liveStatus map', () => {
        it('setLiveStatus inserts or replaces status for composite key', () => {
            const status1 = buildStatus({ isAvailable: true });
            const status2 = buildStatus({ isAvailable: false });

            setLiveStatus('dag-1', 'run-1', status1);

            const key = getRunKey('dag-1', 'run-1');
            expect(workflowRuns.liveStatus.get(key)).toEqual(status1);

            // Replace existing value for same key
            setLiveStatus('dag-1', 'run-1', status2);

            expect(workflowRuns.liveStatus.get(key)).toEqual(status2);
        });

        it('getLiveStatus returns undefined when no status exists', () => {
            expect(getLiveStatus('missing-dag', 'missing-run')).toBeUndefined();
        });

        it('getLiveStatus returns stored status for given run', () => {
            const status = buildStatus({ isAvailable: false, error: '404' });
            setLiveStatus('dag-1', 'run-1', status);

            const result = getLiveStatus('dag-1', 'run-1');
            expect(result).toEqual(status);
        });

        it('clearLiveStatus resets liveStatus map', () => {
            const status = buildStatus();
            setLiveStatus('dag-1', 'run-1', status);

            clearLiveStatus();

            expect(workflowRuns.liveStatus.size).toBe(0);
        });
    });
});
