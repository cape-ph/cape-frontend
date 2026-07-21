import { describe, it, expect, beforeEach, vi } from 'vitest';

vi.mock('$lib/apiClient', () => ({
    capi: { get: vi.fn(), post: vi.fn(), patch: vi.fn() }
}));

import { capi } from '$lib/apiClient';
import { getWorkflowProfilesCached } from './pipeline';

describe('getWorkflowProfilesCached', () => {
    beforeEach(() => {
        vi.mocked(capi.get).mockReset();
    });

    it('fetches once per (baseUrl, dagId) and serves cached results', async () => {
        vi.mocked(capi.get).mockResolvedValue({ data: [{ pipelineId: 'stage-1' }] });

        const first = await getWorkflowProfilesCached('https://api.example.test', 'dag-cache-1');
        const second = await getWorkflowProfilesCached('https://api.example.test', 'dag-cache-1');

        expect(first).toEqual(second);
        expect(capi.get).toHaveBeenCalledTimes(1);
    });

    it('does not cache failures so a later call can retry', async () => {
        vi.mocked(capi.get).mockRejectedValueOnce(new Error('boom'));
        vi.mocked(capi.get).mockResolvedValueOnce({ data: [{ pipelineId: 'stage-2' }] });

        await expect(
            getWorkflowProfilesCached('https://api.example.test', 'dag-cache-2')
        ).rejects.toThrow('boom');

        const retry = await getWorkflowProfilesCached('https://api.example.test', 'dag-cache-2');
        expect(retry).toEqual([{ pipelineId: 'stage-2' }]);
        expect(capi.get).toHaveBeenCalledTimes(2);
    });
});
