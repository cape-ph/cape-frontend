import { capi } from '$lib/apiClient';

/**
 * Workflow run status from Airflow
 * Possible values: queued, running, success, failed, skipped, upstream_failed, up_for_retry, up_for_reschedule, restarting, deferred, removed
 */
export type WorkflowRunState =
    | 'queued'
    | 'running'
    | 'success'
    | 'failed'
    | 'skipped'
    | 'upstream_failed'
    | 'up_for_retry'
    | 'up_for_reschedule'
    | 'restarting'
    | 'deferred'
    | 'removed';

/**
 * Task instance state from Airflow
 */
export type TaskInstanceState = WorkflowRunState;

/**
 * Response from GET /workflows/run
 */
export interface WorkflowRun {
    dag_run_id: string;
    dag_id: string;
    logical_date: string;
    queued_at: string;
    start_date: string | null;
    end_date: string | null;
    data_interval_start: string;
    data_interval_end: string;
    run_after: string;
    last_scheduling_decision: string | null;
    run_type: string;
    state: WorkflowRunState;
    conf: Record<string, unknown>;
    note?: string;
    dag_versions: Array<{
        id: string;
        version_number: number;
        dag_id: string;
        bundle_name: string;
        created_at: string;
    }>;
}

/**
 * Response from GET /workflows/run/taskinstances
 */
export interface TaskInstance {
    id: string;
    task_id: string;
    dag_id: string;
    dag_run_id: string;
    map_index: number;
    logical_date: string;
    run_after: string;
    start_date: string | null;
    end_date: string | null;
    state: TaskInstanceState | null;
    try_number: number;
    max_tries: number;
    task_display_name: string;
    hostname: string;
    unixname: string;
    pool: string;
    pool_slots: number;
    queue: string;
    priority_weight: number;
    operator: string;
    queued_when: string | null;
    scheduled_when: string | null;
    pid: number | null;
    executor_config: string;
    rendered_fields: Record<string, unknown>;
    dag_version: {
        id: string;
        version_number: number;
        dag_id: string;
        bundle_name: string;
        created_at: string;
    };
}

/**
 * Response from GET /workflows/run/taskinstances
 */
export interface TaskInstancesResponse {
    task_instances: TaskInstance[];
    total_entries: number;
}

/**
 * Get workflow run status
 *
 * @param baseUrl - API base URL
 * @param dagId - Workflow DAG ID
 * @param dagRunId - Workflow run ID
 * @returns Promise<WorkflowRun>
 */
export async function getWorkflowRun(
    baseUrl: string,
    dagId: string,
    dagRunId: string
): Promise<WorkflowRun> {
    const url = `${baseUrl}/workflows/run`;
    const params = { dagId, dagRunId };
    const response = await capi.get(url, { params });
    return response.data;
}

/**
 * Get task instances for a workflow run
 *
 * @param baseUrl - API base URL
 * @param dagId - Workflow DAG ID
 * @param dagRunId - Workflow run ID
 * @returns Promise<TaskInstancesResponse>
 */
export async function getTaskInstances(
    baseUrl: string,
    dagId: string,
    dagRunId: string
): Promise<TaskInstancesResponse> {
    const url = `${baseUrl}/workflows/run/taskinstances`;
    const params = { dagId, dagRunId };
    const response = await capi.get(url, { params });
    return response.data;
}

/**
 * Halt a running workflow
 *
 * @param baseUrl - API base URL
 * @param dagId - Workflow DAG ID
 * @param dagRunId - Workflow run ID
 * @param note - Optional note explaining why the workflow is being halted
 * @returns Promise<WorkflowRun>
 */
export async function haltWorkflow(
    baseUrl: string,
    dagId: string,
    dagRunId: string,
    note?: string
): Promise<WorkflowRun> {
    const url = `${baseUrl}/workflows/halt`;
    const params = { dagId, dagRunId };
    const body = note ? { note } : undefined;
    const response = await capi.patch(url, body, { params });
    return response.data;
}

/**
 * Response from GET /workflows/runs (the calling user's runs).
 */
export interface WorkflowRunsResponse {
    dag_runs: WorkflowRun[];
    total_entries: number;
}

/**
 * A single pipeline stage config as stored in a run's `conf.pipelineConfigs`.
 * This is what the frontend submits and what the DAG consumes; it is the source
 * of truth for reconstructing submission details on the status detail view.
 */
export interface WorkflowPipelineConfig {
    pipelineId: string;
    nextflowOptions?: Record<string, unknown>;
}

/**
 * Get the workflow runs triggered by the currently authenticated user.
 *
 * Ownership is resolved server-side from the caller's Cognito token (see the
 * CAPE API authorizer), so this replaces the old cookie-based run tracking.
 *
 * @param baseUrl - API base URL
 * @returns Promise<WorkflowRun[]> - the user's runs, most recent first
 */
export async function getMyWorkflowRuns(baseUrl: string): Promise<WorkflowRun[]> {
    const url = `${baseUrl}/workflows/runs`;
    const response = await capi.get<WorkflowRunsResponse>(url);
    return response.data.dag_runs ?? [];
}

/**
 * Extract the submitted pipeline stage configs from a run's `conf`.
 *
 * Returns an empty array when the run has no recognizable pipeline configs.
 *
 * @param run - the workflow run
 * @returns WorkflowPipelineConfig[]
 */
export function getPipelineConfigsFromRun(run: WorkflowRun): WorkflowPipelineConfig[] {
    const configs = run.conf?.pipelineConfigs;
    return Array.isArray(configs) ? (configs as WorkflowPipelineConfig[]) : [];
}
