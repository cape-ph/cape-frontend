import type { WorkflowRun, TaskInstancesResponse } from './workflowStatus';
import type { StoredWorkflowRun } from './workflowRunsStorage';

/**
 * Mock workflow runs for visual testing
 * Based on example API responses from requirements
 */

// Running workflow with mixed task states
export const mockRunningWorkflow: WorkflowRun = {
    dag_run_id: 'manual+2024-06-05T14:30:00+00:00',
    dag_id: 'bactopia_workflow',
    logical_date: '2024-06-05T14:30:00+00:00',
    queued_at: '2024-06-05T14:30:00.123456+00:00',
    start_date: '2024-06-05T14:30:05.789012+00:00',
    end_date: null,
    data_interval_start: '2024-06-05T14:30:00+00:00',
    data_interval_end: '2024-06-05T14:30:00+00:00',
    run_after: '2024-06-05T14:30:00+00:00',
    last_scheduling_decision: '2024-06-05T14:30:05+00:00',
    run_type: 'manual',
    state: 'running',
    triggered_by: 'user@example.com',
    conf: {},
    dag_versions: [
        {
            id: 'bactopia-v1-abc123',
            version_number: 1,
            dag_id: 'bactopia_workflow',
            bundle_name: 'bactopia-bundle-v1',
            created_at: '2024-06-01T08:00:00+00:00'
        }
    ]
};

// Completed successful workflow
export const mockSuccessWorkflow: WorkflowRun = {
    dag_run_id: 'manual+2024-06-04T10:15:00+00:00',
    dag_id: 'assembly_qc_workflow',
    logical_date: '2024-06-04T10:15:00+00:00',
    queued_at: '2024-06-04T10:15:00.000000+00:00',
    start_date: '2024-06-04T10:15:03.456789+00:00',
    end_date: '2024-06-04T11:45:22.123456+00:00',
    data_interval_start: '2024-06-04T10:15:00+00:00',
    data_interval_end: '2024-06-04T10:15:00+00:00',
    run_after: '2024-06-04T10:15:00+00:00',
    last_scheduling_decision: '2024-06-04T10:15:03+00:00',
    run_type: 'manual',
    state: 'success',
    triggered_by: 'user@example.com',
    conf: {},
    dag_versions: [
        {
            id: 'assembly-qc-v2-def456',
            version_number: 2,
            dag_id: 'assembly_qc_workflow',
            bundle_name: 'assembly-qc-bundle-v2',
            created_at: '2024-05-28T12:00:00+00:00'
        }
    ]
};

// Failed workflow
export const mockFailedWorkflow: WorkflowRun = {
    dag_run_id: 'manual+2024-06-03T16:45:00+00:00',
    dag_id: 'variant_calling_workflow',
    logical_date: '2024-06-03T16:45:00+00:00',
    queued_at: '2024-06-03T16:45:00.000000+00:00',
    start_date: '2024-06-03T16:45:02.111111+00:00',
    end_date: '2024-06-03T17:12:45.987654+00:00',
    data_interval_start: '2024-06-03T16:45:00+00:00',
    data_interval_end: '2024-06-03T16:45:00+00:00',
    run_after: '2024-06-03T16:45:00+00:00',
    last_scheduling_decision: '2024-06-03T16:45:02+00:00',
    run_type: 'manual',
    state: 'failed',
    triggered_by: 'user@example.com',
    conf: {},
    note: 'Insufficient memory during alignment step',
    dag_versions: [
        {
            id: 'variant-calling-v1-ghi789',
            version_number: 1,
            dag_id: 'variant_calling_workflow',
            bundle_name: 'variant-calling-bundle-v1',
            created_at: '2024-05-20T09:00:00+00:00'
        }
    ]
};

// Queued workflow (not started yet)
export const mockQueuedWorkflow: WorkflowRun = {
    dag_run_id: 'manual+2024-06-05T15:00:00+00:00',
    dag_id: 'annotation_workflow',
    logical_date: '2024-06-05T15:00:00+00:00',
    queued_at: '2024-06-05T15:00:00.555555+00:00',
    start_date: null,
    end_date: null,
    data_interval_start: '2024-06-05T15:00:00+00:00',
    data_interval_end: '2024-06-05T15:00:00+00:00',
    run_after: '2024-06-05T15:00:00+00:00',
    last_scheduling_decision: null,
    run_type: 'manual',
    state: 'queued',
    triggered_by: 'user@example.com',
    conf: {},
    dag_versions: [
        {
            id: 'annotation-v3-jkl012',
            version_number: 3,
            dag_id: 'annotation_workflow',
            bundle_name: 'annotation-bundle-v3',
            created_at: '2024-06-02T14:00:00+00:00'
        }
    ]
};

// Task instances for running workflow
export const mockRunningTaskInstances: TaskInstancesResponse = {
    task_instances: [
        {
            id: 'task-uuid-1',
            task_id: 'gather_samples',
            dag_id: 'bactopia_workflow',
            dag_run_id: 'manual+2024-06-05T14:30:00+00:00',
            map_index: -1,
            logical_date: '2024-06-05T14:30:00+00:00',
            run_after: '2024-06-05T14:30:00+00:00',
            start_date: '2024-06-05T14:30:10+00:00',
            end_date: '2024-06-05T14:32:45+00:00',
            state: 'success',
            try_number: 1,
            max_tries: 3,
            task_display_name: 'Gather Samples',
            hostname: 'worker-node-1',
            unixname: 'airflow',
            pool: 'default_pool',
            pool_slots: 1,
            queue: 'default',
            priority_weight: 1,
            operator: 'PythonOperator',
            queued_when: '2024-06-05T14:30:05+00:00',
            scheduled_when: '2024-06-05T14:30:08+00:00',
            pid: 12345,
            executor_config: '{}',
            rendered_fields: {},
            dag_version: {
                id: 'bactopia-v1-abc123',
                version_number: 1,
                dag_id: 'bactopia_workflow',
                bundle_name: 'bactopia-bundle-v1',
                created_at: '2024-06-01T08:00:00+00:00'
            }
        },
        {
            id: 'task-uuid-2',
            task_id: 'quality_control',
            dag_id: 'bactopia_workflow',
            dag_run_id: 'manual+2024-06-05T14:30:00+00:00',
            map_index: -1,
            logical_date: '2024-06-05T14:30:00+00:00',
            run_after: '2024-06-05T14:32:45+00:00',
            start_date: '2024-06-05T14:32:50+00:00',
            end_date: '2024-06-05T14:38:22+00:00',
            state: 'success',
            try_number: 1,
            max_tries: 3,
            task_display_name: 'Quality Control',
            hostname: 'worker-node-2',
            unixname: 'airflow',
            pool: 'default_pool',
            pool_slots: 1,
            queue: 'default',
            priority_weight: 2,
            operator: 'BashOperator',
            queued_when: '2024-06-05T14:32:46+00:00',
            scheduled_when: '2024-06-05T14:32:48+00:00',
            pid: 12346,
            executor_config: '{}',
            rendered_fields: {},
            dag_version: {
                id: 'bactopia-v1-abc123',
                version_number: 1,
                dag_id: 'bactopia_workflow',
                bundle_name: 'bactopia-bundle-v1',
                created_at: '2024-06-01T08:00:00+00:00'
            }
        },
        {
            id: 'task-uuid-3',
            task_id: 'assembly',
            dag_id: 'bactopia_workflow',
            dag_run_id: 'manual+2024-06-05T14:30:00+00:00',
            map_index: -1,
            logical_date: '2024-06-05T14:30:00+00:00',
            run_after: '2024-06-05T14:38:22+00:00',
            start_date: '2024-06-05T14:38:25+00:00',
            end_date: null,
            state: 'running',
            try_number: 1,
            max_tries: 3,
            task_display_name: 'Genome Assembly',
            hostname: 'worker-node-3',
            unixname: 'airflow',
            pool: 'default_pool',
            pool_slots: 2,
            queue: 'high_memory',
            priority_weight: 3,
            operator: 'BashOperator',
            queued_when: '2024-06-05T14:38:23+00:00',
            scheduled_when: '2024-06-05T14:38:24+00:00',
            pid: 12347,
            executor_config: '{}',
            rendered_fields: {},
            dag_version: {
                id: 'bactopia-v1-abc123',
                version_number: 1,
                dag_id: 'bactopia_workflow',
                bundle_name: 'bactopia-bundle-v1',
                created_at: '2024-06-01T08:00:00+00:00'
            }
        },
        {
            id: 'task-uuid-4',
            task_id: 'annotation',
            dag_id: 'bactopia_workflow',
            dag_run_id: 'manual+2024-06-05T14:30:00+00:00',
            map_index: -1,
            logical_date: '2024-06-05T14:30:00+00:00',
            run_after: '2024-06-05T14:38:25+00:00',
            start_date: null,
            end_date: null,
            state: 'queued',
            try_number: 0,
            max_tries: 3,
            task_display_name: 'Genome Annotation',
            hostname: '',
            unixname: 'airflow',
            pool: 'default_pool',
            pool_slots: 1,
            queue: 'default',
            priority_weight: 4,
            operator: 'PythonOperator',
            queued_when: null,
            scheduled_when: null,
            pid: null,
            executor_config: '{}',
            rendered_fields: {},
            dag_version: {
                id: 'bactopia-v1-abc123',
                version_number: 1,
                dag_id: 'bactopia_workflow',
                bundle_name: 'bactopia-bundle-v1',
                created_at: '2024-06-01T08:00:00+00:00'
            }
        },
        {
            id: 'task-uuid-5',
            task_id: 'generate_report',
            dag_id: 'bactopia_workflow',
            dag_run_id: 'manual+2024-06-05T14:30:00+00:00',
            map_index: -1,
            logical_date: '2024-06-05T14:30:00+00:00',
            run_after: '2024-06-05T14:38:25+00:00',
            start_date: null,
            end_date: null,
            state: null,
            try_number: 0,
            max_tries: 3,
            task_display_name: 'Generate Report',
            hostname: '',
            unixname: 'airflow',
            pool: 'default_pool',
            pool_slots: 1,
            queue: 'default',
            priority_weight: 5,
            operator: 'PythonOperator',
            queued_when: null,
            scheduled_when: null,
            pid: null,
            executor_config: '{}',
            rendered_fields: {},
            dag_version: {
                id: 'bactopia-v1-abc123',
                version_number: 1,
                dag_id: 'bactopia_workflow',
                bundle_name: 'bactopia-bundle-v1',
                created_at: '2024-06-01T08:00:00+00:00'
            }
        }
    ],
    total_entries: 5
};

// Task instances for successful workflow (all completed)
export const mockSuccessTaskInstances: TaskInstancesResponse = {
    task_instances: [
        {
            id: 'task-uuid-6',
            task_id: 'quality_check',
            dag_id: 'assembly_qc_workflow',
            dag_run_id: 'manual+2024-06-04T10:15:00+00:00',
            map_index: -1,
            logical_date: '2024-06-04T10:15:00+00:00',
            run_after: '2024-06-04T10:15:00+00:00',
            start_date: '2024-06-04T10:15:05+00:00',
            end_date: '2024-06-04T10:28:12+00:00',
            state: 'success',
            try_number: 1,
            max_tries: 3,
            task_display_name: 'Quality Check',
            hostname: 'worker-node-1',
            unixname: 'airflow',
            pool: 'default_pool',
            pool_slots: 1,
            queue: 'default',
            priority_weight: 1,
            operator: 'BashOperator',
            queued_when: '2024-06-04T10:15:03+00:00',
            scheduled_when: '2024-06-04T10:15:04+00:00',
            pid: 23456,
            executor_config: '{}',
            rendered_fields: {},
            dag_version: {
                id: 'assembly-qc-v2-def456',
                version_number: 2,
                dag_id: 'assembly_qc_workflow',
                bundle_name: 'assembly-qc-bundle-v2',
                created_at: '2024-05-28T12:00:00+00:00'
            }
        },
        {
            id: 'task-uuid-7',
            task_id: 'contamination_screen',
            dag_id: 'assembly_qc_workflow',
            dag_run_id: 'manual+2024-06-04T10:15:00+00:00',
            map_index: -1,
            logical_date: '2024-06-04T10:15:00+00:00',
            run_after: '2024-06-04T10:28:12+00:00',
            start_date: '2024-06-04T10:28:15+00:00',
            end_date: '2024-06-04T11:12:33+00:00',
            state: 'success',
            try_number: 1,
            max_tries: 3,
            task_display_name: 'Contamination Screen',
            hostname: 'worker-node-2',
            unixname: 'airflow',
            pool: 'default_pool',
            pool_slots: 2,
            queue: 'high_memory',
            priority_weight: 2,
            operator: 'PythonOperator',
            queued_when: '2024-06-04T10:28:13+00:00',
            scheduled_when: '2024-06-04T10:28:14+00:00',
            pid: 23457,
            executor_config: '{}',
            rendered_fields: {},
            dag_version: {
                id: 'assembly-qc-v2-def456',
                version_number: 2,
                dag_id: 'assembly_qc_workflow',
                bundle_name: 'assembly-qc-bundle-v2',
                created_at: '2024-05-28T12:00:00+00:00'
            }
        },
        {
            id: 'task-uuid-8',
            task_id: 'finalize_report',
            dag_id: 'assembly_qc_workflow',
            dag_run_id: 'manual+2024-06-04T10:15:00+00:00',
            map_index: -1,
            logical_date: '2024-06-04T10:15:00+00:00',
            run_after: '2024-06-04T11:12:33+00:00',
            start_date: '2024-06-04T11:12:36+00:00',
            end_date: '2024-06-04T11:45:22+00:00',
            state: 'success',
            try_number: 1,
            max_tries: 3,
            task_display_name: 'Finalize Report',
            hostname: 'worker-node-1',
            unixname: 'airflow',
            pool: 'default_pool',
            pool_slots: 1,
            queue: 'default',
            priority_weight: 3,
            operator: 'PythonOperator',
            queued_when: '2024-06-04T11:12:34+00:00',
            scheduled_when: '2024-06-04T11:12:35+00:00',
            pid: 23458,
            executor_config: '{}',
            rendered_fields: {},
            dag_version: {
                id: 'assembly-qc-v2-def456',
                version_number: 2,
                dag_id: 'assembly_qc_workflow',
                bundle_name: 'assembly-qc-bundle-v2',
                created_at: '2024-05-28T12:00:00+00:00'
            }
        }
    ],
    total_entries: 3
};

// Task instances for failed workflow
export const mockFailedTaskInstances: TaskInstancesResponse = {
    task_instances: [
        {
            id: 'task-uuid-9',
            task_id: 'prepare_data',
            dag_id: 'variant_calling_workflow',
            dag_run_id: 'manual+2024-06-03T16:45:00+00:00',
            map_index: -1,
            logical_date: '2024-06-03T16:45:00+00:00',
            run_after: '2024-06-03T16:45:00+00:00',
            start_date: '2024-06-03T16:45:05+00:00',
            end_date: '2024-06-03T16:52:18+00:00',
            state: 'success',
            try_number: 1,
            max_tries: 3,
            task_display_name: 'Prepare Data',
            hostname: 'worker-node-3',
            unixname: 'airflow',
            pool: 'default_pool',
            pool_slots: 1,
            queue: 'default',
            priority_weight: 1,
            operator: 'PythonOperator',
            queued_when: '2024-06-03T16:45:02+00:00',
            scheduled_when: '2024-06-03T16:45:04+00:00',
            pid: 34567,
            executor_config: '{}',
            rendered_fields: {},
            dag_version: {
                id: 'variant-calling-v1-ghi789',
                version_number: 1,
                dag_id: 'variant_calling_workflow',
                bundle_name: 'variant-calling-bundle-v1',
                created_at: '2024-05-20T09:00:00+00:00'
            }
        },
        {
            id: 'task-uuid-10',
            task_id: 'alignment',
            dag_id: 'variant_calling_workflow',
            dag_run_id: 'manual+2024-06-03T16:45:00+00:00',
            map_index: -1,
            logical_date: '2024-06-03T16:45:00+00:00',
            run_after: '2024-06-03T16:52:18+00:00',
            start_date: '2024-06-03T16:52:20+00:00',
            end_date: '2024-06-03T17:12:45+00:00',
            state: 'failed',
            try_number: 3,
            max_tries: 3,
            task_display_name: 'Sequence Alignment',
            hostname: 'worker-node-4',
            unixname: 'airflow',
            pool: 'default_pool',
            pool_slots: 4,
            queue: 'high_memory',
            priority_weight: 2,
            operator: 'BashOperator',
            queued_when: '2024-06-03T16:52:19+00:00',
            scheduled_when: '2024-06-03T16:52:19+00:00',
            pid: 34568,
            executor_config: '{}',
            rendered_fields: {},
            dag_version: {
                id: 'variant-calling-v1-ghi789',
                version_number: 1,
                dag_id: 'variant_calling_workflow',
                bundle_name: 'variant-calling-bundle-v1',
                created_at: '2024-05-20T09:00:00+00:00'
            }
        },
        {
            id: 'task-uuid-11',
            task_id: 'variant_calling',
            dag_id: 'variant_calling_workflow',
            dag_run_id: 'manual+2024-06-03T16:45:00+00:00',
            map_index: -1,
            logical_date: '2024-06-03T16:45:00+00:00',
            run_after: '2024-06-03T17:12:45+00:00',
            start_date: null,
            end_date: null,
            state: 'upstream_failed',
            try_number: 0,
            max_tries: 3,
            task_display_name: 'Variant Calling',
            hostname: '',
            unixname: 'airflow',
            pool: 'default_pool',
            pool_slots: 2,
            queue: 'high_memory',
            priority_weight: 3,
            operator: 'PythonOperator',
            queued_when: null,
            scheduled_when: null,
            pid: null,
            executor_config: '{}',
            rendered_fields: {},
            dag_version: {
                id: 'variant-calling-v1-ghi789',
                version_number: 1,
                dag_id: 'variant_calling_workflow',
                bundle_name: 'variant-calling-bundle-v1',
                created_at: '2024-05-20T09:00:00+00:00'
            }
        }
    ],
    total_entries: 3
};

// Task instances for queued workflow (not started)
export const mockQueuedTaskInstances: TaskInstancesResponse = {
    task_instances: [],
    total_entries: 0
};

// Stored workflow runs for list view
export const mockStoredRuns: StoredWorkflowRun[] = [
    {
        dagId: 'bactopia_workflow',
        dagRunId: 'manual+2024-06-05T14:30:00+00:00',
        submittedAt: '2024-06-05T14:30:00.000Z'
    },
    {
        dagId: 'annotation_workflow',
        dagRunId: 'manual+2024-06-05T15:00:00+00:00',
        submittedAt: '2024-06-05T15:00:00.000Z'
    },
    {
        dagId: 'assembly_qc_workflow',
        dagRunId: 'manual+2024-06-04T10:15:00+00:00',
        submittedAt: '2024-06-04T10:15:00.000Z'
    },
    {
        dagId: 'variant_calling_workflow',
        dagRunId: 'manual+2024-06-03T16:45:00+00:00',
        submittedAt: '2024-06-03T16:45:00.000Z'
    }
];

// Unavailable workflow run (older, removed from system)
export const mockUnavailableStoredRun: StoredWorkflowRun = {
    dagId: 'old_test_workflow',
    dagRunId: 'manual+2024-05-01T08:00:00+00:00',
    submittedAt: '2024-05-01T08:00:00.000Z'
};

/**
 * Mock API response lookup
 * Maps dagId + dagRunId to mock workflow run and task instances
 */
export const mockApiResponses: Record<
    string,
    {
        workflowRun: WorkflowRun;
        taskInstances: TaskInstancesResponse;
    }
> = {
    'bactopia_workflow::manual+2024-06-05T14:30:00+00:00': {
        workflowRun: mockRunningWorkflow,
        taskInstances: mockRunningTaskInstances
    },
    'annotation_workflow::manual+2024-06-05T15:00:00+00:00': {
        workflowRun: mockQueuedWorkflow,
        taskInstances: mockQueuedTaskInstances
    },
    'assembly_qc_workflow::manual+2024-06-04T10:15:00+00:00': {
        workflowRun: mockSuccessWorkflow,
        taskInstances: mockSuccessTaskInstances
    },
    'variant_calling_workflow::manual+2024-06-03T16:45:00+00:00': {
        workflowRun: mockFailedWorkflow,
        taskInstances: mockFailedTaskInstances
    }
};
