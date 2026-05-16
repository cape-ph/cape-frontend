import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import Report from './Report.svelte';
import { toaster } from '$lib/toaster';

vi.mock('axios', () => ({
    default: {
        get: vi.fn()
    }
}));

vi.mock('$lib/toaster', () => ({
    toaster: {
        error: vi.fn()
    }
}));

describe('Report.svelte', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('requires a sample id before loading a report', async () => {
        render(Report, {
            props: {
                baseUrl: 'https://api.example.test',
                reportId: 'example-report'
            }
        });

        await fireEvent.click(screen.getByRole('button', { name: 'Load Report' }));

        expect(axios.get).not.toHaveBeenCalled();
        expect(toaster.error).toHaveBeenCalledWith({
            title: 'Missing a sample id.'
        });
    });

    it('loads report html and renders it in an iframe', async () => {
        vi.mocked(axios.get).mockResolvedValue({
            data: '<html><body>Report body</body></html>'
        });

        render(Report, {
            props: {
                baseUrl: 'https://api.example.test',
                reportId: 'example-report'
            }
        });

        await fireEvent.input(screen.getByLabelText('Sample ID'), {
            target: { value: 'sample-123' }
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Load Report' }));

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('https://api.example.test/report/create', {
                params: {
                    format: 'html',
                    reportId: 'example-report',
                    sampleId: 'sample-123'
                },
                responseType: 'text',
                headers: { Accept: 'text/html' }
            });
        });

        expect(await screen.findByTitle('Embedded Report')).toHaveAttribute(
            'srcdoc',
            '<html><body>Report body</body></html>'
        );
    });
});
