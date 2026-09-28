import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('$lib/apiClient', () => ({
    capi: { get: vi.fn() }
}));

import { capi } from '$lib/apiClient';
import { getReportCount } from './report';

describe('getReportCount', () => {
    beforeEach(() => {
        vi.mocked(capi.get).mockReset();
    });

    it('counts legacy strings and nested reports with usable bodies', async () => {
        vi.mocked(capi.get).mockResolvedValue({
            data: {
                legacy: '<html>legacy</html>',
                nested: { createdAt: '2026-08-18T12:00:00Z', body: '<html>nested</html>' },
                malformed: { createdAt: '2026-08-18T12:00:00Z', body: 42 },
                empty: { createdAt: '2026-08-18T12:00:00Z' }
            }
        });

        await expect(getReportCount('https://api.example.test', 'sample-123')).resolves.toBe(2);
        expect(capi.get).toHaveBeenCalledWith('https://api.example.test/report/get', {
            params: { sampleId: 'sample-123' }
        });
    });

    it('returns zero for a non-object response', async () => {
        vi.mocked(capi.get).mockResolvedValue({ data: null });

        await expect(getReportCount('https://api.example.test', 'sample-123')).resolves.toBe(0);
    });
});
