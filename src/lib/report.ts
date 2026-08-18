import { capi } from '$lib/apiClient';

/**
 * Count the analysis reports currently available for a sample.
 *
 * Reports are generated asynchronously and more can appear over time (including
 * while a workflow is still running), so callers poll this on their existing
 * refresh cadence to decide whether to surface a "view reports" affordance.
 *
 * The endpoint returns a `{ reportId: { createdAt, body } }` map (tolerating a
 * legacy plain-string value). Only entries with a usable body are counted so a
 * malformed payload cannot inflate the count.
 *
 * @param baseUrl - API base URL
 * @param sampleId - the sample whose reports to count
 * @returns Promise<number> - the number of available reports
 */
export async function getReportCount(baseUrl: string, sampleId: string): Promise<number> {
    const url = `${baseUrl}/report/get`;
    const response = await capi.get(url, { params: { sampleId } });
    const data = response.data;
    if (!data || typeof data !== 'object') {
        return 0;
    }
    let count = 0;
    for (const value of Object.values(data as Record<string, unknown>)) {
        if (typeof value === 'string') {
            count += 1;
        } else if (
            value &&
            typeof value === 'object' &&
            typeof (value as { body?: unknown }).body === 'string'
        ) {
            count += 1;
        }
    }
    return count;
}
