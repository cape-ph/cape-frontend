import { auth } from '$lib/user.svelte';
import type { TaskInstance, WorkflowRun } from '$lib/workflowStatus';

/**
 * Stale-while-revalidate cache for the Workflows view.
 *
 * The runs list and their task instances are cached so returning to the
 * Workflows tab (or reloading the page) paints the last-known state instantly
 * while a background refresh runs, instead of a blank "Loading..." placeholder.
 *
 * Two layers:
 * - an in-memory map, which survives SPA navigation (tab switches) without
 *   touching storage; and
 * - sessionStorage, which also survives a full page reload for the life of the
 *   browser tab.
 *
 * Both are keyed by the user's Cognito `sub`, so one user never sees another
 * user's cached runs (e.g. after logging out and back in as someone else).
 */
export interface WorkflowSnapshot {
    runs: WorkflowRun[];
    taskInstances: Record<string, TaskInstance[]>;
}

const KEY_PREFIX = 'cape:workflow-runs:';

const memoryCache = new Map<string, WorkflowSnapshot>();

function currentUserId(): string | null {
    const sub = auth.user?.profile?.sub;
    return typeof sub === 'string' && sub.length > 0 ? sub : null;
}

function storageKey(userId: string): string {
    return `${KEY_PREFIX}${userId}`;
}

/**
 * Read the cached snapshot for the current user, or null when nothing is
 * cached (or no user is signed in).
 */
export function readWorkflowSnapshot(): WorkflowSnapshot | null {
    const userId = currentUserId();
    if (!userId) return null;

    const inMemory = memoryCache.get(userId);
    if (inMemory) return inMemory;

    if (typeof sessionStorage === 'undefined') return null;

    const raw = sessionStorage.getItem(storageKey(userId));
    if (!raw) return null;

    try {
        const parsed = JSON.parse(raw) as WorkflowSnapshot;
        memoryCache.set(userId, parsed);
        return parsed;
    } catch {
        // Corrupt entry: drop it so a fresh refresh can repopulate.
        sessionStorage.removeItem(storageKey(userId));
        return null;
    }
}

/**
 * Persist the latest runs snapshot for the current user.
 */
export function writeWorkflowSnapshot(snapshot: WorkflowSnapshot): void {
    const userId = currentUserId();
    if (!userId) return;

    memoryCache.set(userId, snapshot);

    if (typeof sessionStorage === 'undefined') return;

    try {
        sessionStorage.setItem(storageKey(userId), JSON.stringify(snapshot));
    } catch {
        // Storage full or unavailable: the in-memory cache still serves this
        // session, so this is non-fatal.
    }
}

/**
 * Merge one run's latest data (and its task instances) into the current user's
 * cached snapshot. Used by the detail view so its revalidated data also
 * freshens the shared list cache. No-op when nothing is cached yet.
 */
export function updateCachedRun(run: WorkflowRun, taskInstances: TaskInstance[]): void {
    const existing = readWorkflowSnapshot();
    if (!existing) return;

    const runs = existing.runs.some((r) => r.dag_run_id === run.dag_run_id)
        ? existing.runs.map((r) => (r.dag_run_id === run.dag_run_id ? run : r))
        : [run, ...existing.runs];

    writeWorkflowSnapshot({
        runs,
        taskInstances: { ...existing.taskInstances, [run.dag_run_id]: taskInstances }
    });
}

/**
 * Drop all cached workflow snapshots (e.g. on logout). Clears every user's
 * entry rather than only the current one, since the signed-in user may already
 * be gone by the time this runs.
 */
export function clearWorkflowSnapshots(): void {
    memoryCache.clear();

    if (typeof sessionStorage === 'undefined') return;

    for (let i = sessionStorage.length - 1; i >= 0; i--) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(KEY_PREFIX)) {
            sessionStorage.removeItem(key);
        }
    }
}
