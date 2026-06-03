import type { AnySchema } from 'ajv';
import axios from 'axios';
export { compile, validate } from '$lib/schema';

export interface Pipeline {
    pipeline_name: string;
    pipeline_type: string;
    project: string;
    version: string;
}

export interface PipelineProfile {
    parametersSchema: AnySchema;
    pipelineName: string;
    pipelineDescription: string;
    project: string;
    submission: {
        encoding: string;
        optionsFieldName: string;
    };
    pipelineType: string;
    version: string;
    pipelineRunnable?: boolean;
    pipelineId?: string;
    uiSchema?: unknown;
}

export interface WorkflowDAG {
    dag_id: string;
    dag_display_name: string;
    description: string;
    is_paused: boolean;
}

/**
 * Get an array of all of the pipelines supported by the CAPE API
 *
 * @param {string} baseUrl - the API base URL
 * @returns {Promise<Pipeline[]>} - an array of pipelines
 */
export async function getPipelines(baseUrl: string): Promise<Pipeline[]> {
    const url = `${baseUrl}/dap/pipelines`;
    const response = await axios.get(url);
    const pipelines: Pipeline[] = response.data;
    return pipelines;
}

/**
 * Get an array of all available workflows
 *
 * @param {string} baseUrl - the API base URL
 * @returns {Promise<WorkflowDAG[]>} - an array of workflow DAGs
 */
export async function getWorkflows(baseUrl: string): Promise<WorkflowDAG[]> {
    const url = `${baseUrl}/workflows`;
    const response = await axios.get(url);
    const workflows: WorkflowDAG[] = response.data.dags || [];
    return workflows;
}

/**
 * Get the profile of a pipeline
 *
 * @param baseUrl - the API base URL
 * @param pipeline - the pipeline to get the profile of
 * @returns {Promise<PipelineProfile>} - the pipeline profile
 */
export async function getPipelineProfile(
    baseUrl: string,
    pipeline: Pipeline
): Promise<PipelineProfile> {
    const url = `${baseUrl}/dap/pipelineprofile`;
    const params = {
        pipeline: pipeline.pipeline_name,
        version: pipeline.version
    };
    const response = await axios.get(url, { params: params });
    const profile: PipelineProfile = response.data;
    return profile;
}

/**
 * Get the profiles for all stages in a workflow
 *
 * @param baseUrl - the API base URL
 * @param dagId - the workflow DAG ID
 * @returns {Promise<PipelineProfile[]>} - array of profiles (one per stage)
 */
export async function getWorkflowProfiles(
    baseUrl: string,
    dagId: string
): Promise<PipelineProfile[]> {
    const url = `${baseUrl}/workflows/pipelineprofiles`;
    const params = { dagId };
    const response = await axios.get(url, { params });
    const profiles: PipelineProfile[] = response.data;
    return profiles;
}
