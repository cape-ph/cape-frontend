import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import axios from 'axios';
import Report from './Report.svelte';
import { toaster } from '$lib/toaster';

const axiosMocks = vi.hoisted(() => {
    const cancelSources: Array<{
        token: { id: number };
        cancel: ReturnType<typeof vi.fn>;
    }> = [];

    return {
        cancelSources,
        get: vi.fn(),
        isCancel: vi.fn((err: unknown) => {
            return Boolean(err && typeof err === 'object' && '__CANCEL__' in err);
        }),
        source: vi.fn(() => {
            const source = {
                token: { id: cancelSources.length + 1 },
                cancel: vi.fn()
            };
            cancelSources.push(source);
            return source;
        })
    };
});

vi.mock('axios', () => ({
    default: {
        get: axiosMocks.get,
        CancelToken: {
            source: axiosMocks.source
        },
        isCancel: axiosMocks.isCancel
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
        axiosMocks.cancelSources.length = 0;
        axiosMocks.isCancel.mockImplementation((err: unknown) => {
            return Boolean(err && typeof err === 'object' && '__CANCEL__' in err);
        });
    });

    it('requires a sample id before loading a report', async () => {
        render(Report, {
            props: {
                baseUrl: 'https://api.example.test',
                reportId: 'example-report'
            }
        });

        expect(screen.getByLabelText('Sample ID')).toHaveAttribute('name', 'report-sample-id');

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
                headers: { Accept: 'text/html' },
                cancelToken: axiosMocks.cancelSources[0].token
            });
        });

        expect(await screen.findByTitle('Embedded Report')).toHaveAttribute(
            'srcdoc',
            '<html><body>Report body</body></html>'
        );
    });

    it('loads a report when Enter is pressed while the sample id can be submitted', async () => {
        const request = deferred<{ data: string }>();
        vi.mocked(axios.get).mockReturnValue(request.promise);

        render(Report, {
            props: {
                baseUrl: 'https://api.example.test',
                reportId: 'example-report'
            }
        });

        const sampleInput = screen.getByLabelText('Sample ID');
        await fireEvent.input(sampleInput, {
            target: { value: 'sample-123' }
        });
        await fireEvent.keyDown(sampleInput, { key: 'Enter' });

        expect(screen.getByRole('button', { name: 'Loading Report...' })).toBeDisabled();
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('https://api.example.test/report/create', {
                params: {
                    format: 'html',
                    reportId: 'example-report',
                    sampleId: 'sample-123'
                },
                responseType: 'text',
                headers: { Accept: 'text/html' },
                cancelToken: axiosMocks.cancelSources[0].token
            });
        });

        request.resolve({
            data: '<html><body>Report body</body></html>'
        });
    });

    it('re-enables the button for changed input and keeps the new request loading after cancelling the old one', async () => {
        const firstRequest = deferred<{ data: string }>();
        const secondRequest = deferred<{ data: string }>();

        vi.mocked(axios.get)
            .mockReturnValueOnce(firstRequest.promise)
            .mockReturnValueOnce(secondRequest.promise);

        render(Report, {
            props: {
                baseUrl: 'https://api.example.test',
                reportId: 'example-report'
            }
        });

        await fireEvent.input(screen.getByLabelText('Sample ID'), {
            target: { value: 'abcdef' }
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Load Report' }));

        expect(screen.getByRole('button', { name: 'Loading Report...' })).toBeDisabled();

        await fireEvent.input(screen.getByLabelText('Sample ID'), {
            target: { value: 'abcdefghij' }
        });

        const resubmitButton = screen.getByRole('button', { name: 'Load Report' });
        expect(resubmitButton).toBeEnabled();

        await fireEvent.click(resubmitButton);

        expect(axiosMocks.cancelSources[0].cancel).toHaveBeenCalledWith('New request initiated');
        expect(screen.getByRole('button', { name: 'Loading Report...' })).toBeDisabled();
        expect(axios.get).toHaveBeenLastCalledWith('https://api.example.test/report/create', {
            params: {
                format: 'html',
                reportId: 'example-report',
                sampleId: 'abcdefghij'
            },
            responseType: 'text',
            headers: { Accept: 'text/html' },
            cancelToken: axiosMocks.cancelSources[1].token
        });

        firstRequest.reject({ __CANCEL__: true });

        await waitFor(() => {
            expect(axios.isCancel).toHaveBeenCalledWith({ __CANCEL__: true });
        });
        expect(screen.getByRole('button', { name: 'Loading Report...' })).toBeDisabled();

        secondRequest.resolve({
            data: '<html><body>Loaded report</body></html>'
        });

        expect(await screen.findByTitle('Embedded Report')).toHaveAttribute(
            'srcdoc',
            '<html><body>Loaded report</body></html>'
        );
        expect(screen.getByRole('button', { name: 'Load Report' })).toBeEnabled();
        expect(toaster.error).not.toHaveBeenCalled();
    });
});

function deferred<T>() {
    let resolve!: (value: T) => void;
    let reject!: (reason?: unknown) => void;
    const promise = new Promise<T>((res, rej) => {
        resolve = res;
        reject = rej;
    });

    return { promise, resolve, reject };
}
