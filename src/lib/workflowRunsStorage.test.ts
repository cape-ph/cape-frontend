import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
    type StoredWorkflowRun,
    getStoredWorkflowRuns,
    setStoredWorkflowRuns,
    addWorkflowRun,
    removeWorkflowRun,
    clearAllWorkflowRuns
} from './workflowRunsStorage';

// Helper to build a run object
const buildRun = (overrides: Partial<StoredWorkflowRun> = {}): StoredWorkflowRun => ({
    dagId: 'dag-1',
    dagRunId: 'run-1',
    submittedAt: '2024-01-01T00:00:00.000Z',
    ...overrides
});

describe('workflowRunsStorage', () => {
    const originalDocument = (globalThis as { document?: Document }).document;

    beforeEach(() => {
        // Simple in-memory cookie stub
        let cookieStore = '';

        (globalThis as { document?: unknown }).document = {
            get cookie() {
                return cookieStore;
            },
            set cookie(value: string) {
                // Minimal emulation: overwrite workflow_runs cookie, append others
                if (value.startsWith('workflow_runs=')) {
                    cookieStore = value;
                    return;
                }

                if (cookieStore) {
                    cookieStore = `${cookieStore}; ${value}`;
                } else {
                    cookieStore = value;
                }
            }
        };
    });

    afterEach(() => {
        (globalThis as { document?: Document }).document = originalDocument;
        vi.restoreAllMocks();
    });

    describe('getStoredWorkflowRuns', () => {
        it('returns an empty array when there is no cookie', () => {
            // document.cookie starts as empty string from beforeEach
            const runs = getStoredWorkflowRuns();

            expect(runs).toEqual([]);
        });

        it('parses a valid cookie value', () => {
            const runs: StoredWorkflowRun[] = [buildRun(), buildRun({ dagRunId: 'run-2' })];
            const encoded = encodeURIComponent(JSON.stringify(runs));

            document.cookie = `workflow_runs=${encoded}`;

            const result = getStoredWorkflowRuns();

            expect(result).toEqual(runs);
        });

        it('returns empty array when cookie JSON is invalid', () => {
            document.cookie = 'workflow_runs=%5Bnot-valid-json';

            const result = getStoredWorkflowRuns();

            expect(result).toEqual([]);
        });

        it('returns empty array when cookie value is not an array', () => {
            const encoded = encodeURIComponent('{"dagId":"x"}');
            document.cookie = `workflow_runs=${encoded}`;

            const result = getStoredWorkflowRuns();

            expect(result).toEqual([]);
        });

        it('filters out entries with invalid structure', () => {
            const valid = buildRun({ dagRunId: 'valid' });
            const invalidMissingFields = { dagId: 'x' };
            const invalidTypes = { dagId: 1, dagRunId: 2, submittedAt: 3 };

            const encoded = encodeURIComponent(
                JSON.stringify([valid, invalidMissingFields, invalidTypes])
            );
            document.cookie = `workflow_runs=${encoded}`;

            const result = getStoredWorkflowRuns();

            expect(result).toEqual([valid]);
        });
    });

    describe('setStoredWorkflowRuns', () => {
        it('sets cookie with encoded JSON and 90-day max-age', () => {
            const runs: StoredWorkflowRun[] = [buildRun()];

            setStoredWorkflowRuns(runs);

            const cookie = document.cookie;

            // Should include name, encoded value, 90-day max-age and path
            const maxAgeSeconds = 90 * 24 * 60 * 60;
            expect(cookie).toContain('workflow_runs=');
            expect(cookie).toContain(`max-age=${maxAgeSeconds}`);
            expect(cookie).toContain('path=/');
            expect(cookie).toContain('SameSite=Strict');

            const [, valuePart] = cookie.split('workflow_runs=');
            const encodedValue = valuePart.split(';')[0];
            const decoded = decodeURIComponent(encodedValue);

            expect(JSON.parse(decoded)).toEqual(runs);
        });
    });

    describe('addWorkflowRun', () => {
        it('adds a new run to the cookie (prepends)', () => {
            const existing = [buildRun({ dagRunId: 'existing' })];
            const encodedExisting = encodeURIComponent(JSON.stringify(existing));
            document.cookie = `workflow_runs=${encodedExisting}`;

            const newRun = buildRun({ dagRunId: 'new' });

            addWorkflowRun(newRun);

            const stored = getStoredWorkflowRuns();
            expect(stored[0]).toEqual(newRun);
            expect(stored[1]).toEqual(existing[0]);
        });

        it('does not add duplicate runs with same dagId and dagRunId', () => {
            const existing = [buildRun()];
            const encodedExisting = encodeURIComponent(JSON.stringify(existing));
            document.cookie = `workflow_runs=${encodedExisting}`;

            addWorkflowRun(buildRun());

            const stored = getStoredWorkflowRuns();
            expect(stored).toHaveLength(1);
            expect(stored[0]).toEqual(existing[0]);
        });
    });

    describe('removeWorkflowRun', () => {
        it('removes a specific run by dagId and dagRunId', () => {
            const run1 = buildRun({ dagRunId: 'run-1' });
            const run2 = buildRun({ dagRunId: 'run-2' });
            const encoded = encodeURIComponent(JSON.stringify([run1, run2]));
            document.cookie = `workflow_runs=${encoded}`;

            removeWorkflowRun(run1.dagId, run1.dagRunId);

            const stored = getStoredWorkflowRuns();
            expect(stored).toEqual([run2]);
        });

        it('is a no-op when run does not exist', () => {
            const run = buildRun();
            const encoded = encodeURIComponent(JSON.stringify([run]));
            document.cookie = `workflow_runs=${encoded}`;

            removeWorkflowRun('other-dag', 'other-run');

            const stored = getStoredWorkflowRuns();
            expect(stored).toEqual([run]);
        });
    });

    describe('clearAllWorkflowRuns', () => {
        it('clears the cookie by setting max-age=0', () => {
            const run = buildRun();
            const encoded = encodeURIComponent(JSON.stringify([run]));
            document.cookie = `workflow_runs=${encoded}`;

            clearAllWorkflowRuns();

            const cookie = document.cookie;
            expect(cookie).toContain('workflow_runs=');
            expect(cookie).toContain('max-age=0');
            expect(cookie).toContain('path=/');
        });
    });
});
