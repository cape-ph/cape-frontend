import Ajv from 'ajv';
import type { AnySchema, ErrorObject, ValidateFunction } from 'ajv';
import axios from 'axios';

/** Global AJV state */
const ajv = new Ajv({
    allErrors: true,
    strict: false
});

/**
 * Format Ajv errors into a readable string.
 */
function formatAjvErrors(errors: ErrorObject[] | null | undefined): string {
    if (!errors || errors.length === 0) {
        return 'Unknown validation error';
    }

    return errors
        .map((err) => {
            const path = err.instancePath || '(root)';
            return `${path} ${err.message ?? 'is invalid'}`;
        })
        .join('; ');
}

/**
 * Compile a schema validation function.
 *
 * @param {AnySchema} schema - The JSON schema
 * @returns {ValidateFunction} - The validation callback
 */
export function compile(schema: AnySchema): ValidateFunction {
    const valid = ajv.validateSchema(schema);
    if (!valid) {
        throw new Error(`Invalid pipeline schema: ${formatAjvErrors(ajv.errors)}`);
    }
    return ajv.compile(schema);
}

/**
 * Validate an object using a validation callback function.
 *
 * @param {ValidateFunction} isValid - The validation callback function.
 * @param {unknown} obj - The object to validate.
 * @returns {T} - The validated object.
 */
export function validate<T = unknown>(isValid: ValidateFunction, obj: unknown): T {
    const valid = isValid(obj);
    if (valid) {
        throw new Error(`Failed validation: ${formatAjvErrors(isValid.errors)}`);
    }
    return obj as T;
}

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
