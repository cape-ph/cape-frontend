import axios from 'axios';

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
    triggered_by: string;
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
 * Task definition from GET /workflows/tasks
 */
export interface WorkflowTask {
    task_id: string;
    task_display_name: string;
    owner: string;
    start_date: string;
    trigger_rule: string;
    depends_on_past: boolean;
    wait_for_downstream: boolean;
    retries: number;
    queue: string;
    pool: string;
    pool_slots: number;
    retry_delay: {
        __type: string;
        days: number;
        seconds: number;
        microseconds: number;
    };
    retry_exponential_backoff: boolean;
    priority_weight: number;
    weight_rule: string;
    ui_color: string;
    ui_fgcolor: string;
    template_fields: string[];
    downstream_task_ids: string[];
    operator_name: string;
    params: Record<string, unknown>;
    class_ref: {
        module_path: string;
        class_name: string;
    };
    is_mapped: boolean;
    extra_links: unknown[];
}

/**
 * Response from GET /workflows/tasks
 */
export interface WorkflowTasksResponse {
    tasks: WorkflowTask[];
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
    const response = await axios.get(url, { params });
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
    const response = await axios.get(url, { params });
    return response.data;
}

/**
 * Get task definitions for a workflow
 *
 * @param baseUrl - API base URL
 * @param dagId - Workflow DAG ID
 * @returns Promise<WorkflowTasksResponse>
 */
export async function getWorkflowTasks(
    baseUrl: string,
    dagId: string
): Promise<WorkflowTasksResponse> {
    const url = `${baseUrl}/workflows/tasks`;
    const params = { dagId };
    const response = await axios.get(url, { params });
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
    const response = await axios.patch(url, body, { params });
    return response.data;
}
