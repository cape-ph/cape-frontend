import { fireEvent, render, screen, waitFor } from '@testing-library/svelte';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

function reportHtml(title: string, body: string): string {
    return `<html><head><title>${title}</title></head><body>${body}</body></html>`;
}

describe('Report.svelte', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        axiosMocks.cancelSources.length = 0;
        axiosMocks.isCancel.mockImplementation((err: unknown) => {
            return Boolean(err && typeof err === 'object' && '__CANCEL__' in err);
        });
    });

    afterEach(() => {
        vi.useRealTimers();
    });

    it('shows a distinct placeholder before anything has been searched', async () => {
        render(Report, {
            props: {
                baseUrl: 'https://api.example.test'
            }
        });

        expect(
            screen.getByText('Enter a sample ID and load reports to get started')
        ).toBeInTheDocument();
        expect(axios.get).not.toHaveBeenCalled();
    });

    it('auto-loads reports for a sample id supplied via initialSampleId', async () => {
        vi.mocked(axios.get).mockResolvedValue({
            data: { rabits: reportHtml('RABiTS', 'report') }
        });

        const onSampleLoad = vi.fn();
        render(Report, {
            props: {
                baseUrl: 'https://api.example.test',
                initialSampleId: 'caerbannog-test-01',
                onSampleLoad
            }
        });

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('https://api.example.test/report/get', {
                params: { sampleId: 'caerbannog-test-01' },
                cancelToken: axiosMocks.cancelSources[0].token
            });
        });

        expect(await screen.findByText('RABiTS')).toBeInTheDocument();
        expect(screen.getByLabelText('Sample ID')).toHaveValue('caerbannog-test-01');
        // The URL is not re-synced for a URL-driven load; the param is already set.
        expect(onSampleLoad).not.toHaveBeenCalled();
    });

    it('reflects a user-initiated load into the URL via onSampleLoad', async () => {
        vi.mocked(axios.get).mockResolvedValue({ data: {} });

        const onSampleLoad = vi.fn();
        render(Report, {
            props: {
                baseUrl: 'https://api.example.test',
                onSampleLoad
            }
        });

        await fireEvent.input(screen.getByLabelText('Sample ID'), {
            target: { value: 'sample-123' }
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Load Reports' }));

        await waitFor(() => {
            expect(onSampleLoad).toHaveBeenCalledWith('sample-123');
        });
    });

    it('requires a sample id before loading reports', async () => {
        render(Report, {
            props: {
                baseUrl: 'https://api.example.test'
            }
        });

        expect(screen.getByLabelText('Sample ID')).toHaveAttribute('name', 'report-sample-id');

        await fireEvent.click(screen.getByRole('button', { name: 'Load Reports' }));

        expect(axios.get).not.toHaveBeenCalled();
        expect(toaster.error).toHaveBeenCalledWith({
            title: 'Missing a sample id.'
        });
    });

    it('loads reports, titles each accordion from the report HTML, and expands them', async () => {
        vi.mocked(axios.get).mockResolvedValue({
            data: {
                rabits: reportHtml('RABiTS Sample Results - caerbannog-test-01', 'RABiTS report'),
                'bactopia-single-sample-analysis': reportHtml(
                    'Bactopia Single Sample Analysis',
                    'Bactopia report'
                )
            }
        });

        render(Report, {
            props: {
                baseUrl: 'https://api.example.test'
            }
        });

        await fireEvent.input(screen.getByLabelText('Sample ID'), {
            target: { value: 'sample-123' }
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Load Reports' }));

        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('https://api.example.test/report/get', {
                params: {
                    sampleId: 'sample-123'
                },
                cancelToken: axiosMocks.cancelSources[0].token
            });
        });

        // Accordion headings come from the report document's <title>.
        expect(
            await screen.findByText('RABiTS Sample Results - caerbannog-test-01')
        ).toBeInTheDocument();
        expect(screen.getByText('Bactopia Single Sample Analysis')).toBeInTheDocument();

        // Reports default to expanded.
        for (const details of document.querySelectorAll('details')) {
            expect(details).toHaveAttribute('open');
        }

        // A manual Refresh control is available after a load.
        expect(screen.getByRole('button', { name: 'Refresh reports' })).toBeInTheDocument();
    });

    it('shows an empty state and auto-refresh indicator when no reports are available', async () => {
        vi.mocked(axios.get).mockResolvedValue({ data: {} });

        render(Report, {
            props: {
                baseUrl: 'https://api.example.test'
            }
        });

        await fireEvent.input(screen.getByLabelText('Sample ID'), {
            target: { value: 'sample-123' }
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Load Reports' }));

        expect(await screen.findByText('No reports available at this time')).toBeInTheDocument();
        expect(screen.getByText('Auto-refreshes every 30s')).toBeInTheDocument();
    });

    it('keeps auto-refreshing every 30 seconds and loads reports that appear later', async () => {
        vi.useFakeTimers();
        vi.mocked(axios.get).mockResolvedValue({ data: {} });

        render(Report, {
            props: {
                baseUrl: 'https://api.example.test'
            }
        });

        await fireEvent.input(screen.getByLabelText('Sample ID'), {
            target: { value: 'sample-123' }
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Load Reports' }));

        // Initial load fetch.
        await vi.waitFor(() => expect(axios.get).toHaveBeenCalledTimes(1));

        // A poll with no new reports still fires and targets the loaded sample.
        await vi.advanceTimersByTimeAsync(30000);
        expect(axios.get).toHaveBeenCalledTimes(2);
        expect(axios.get).toHaveBeenLastCalledWith('https://api.example.test/report/get', {
            params: { sampleId: 'sample-123' }
        });

        // A later poll picks up a newly generated report.
        vi.mocked(axios.get).mockResolvedValue({
            data: { rabits: reportHtml('RABiTS', 'report') }
        });
        await vi.advanceTimersByTimeAsync(30000);
        expect(axios.get).toHaveBeenCalledTimes(3);

        // Polling continues even after reports exist, so additional reports load.
        await vi.advanceTimersByTimeAsync(30000);
        expect(axios.get).toHaveBeenCalledTimes(4);
    });

    it('preserves user collapse state across a refresh and expands newly arrived reports', async () => {
        vi.mocked(axios.get).mockResolvedValue({
            data: { rabits: reportHtml('RABiTS', 'report') }
        });

        render(Report, {
            props: {
                baseUrl: 'https://api.example.test'
            }
        });

        await fireEvent.input(screen.getByLabelText('Sample ID'), {
            target: { value: 'sample-123' }
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Load Reports' }));

        const firstDetails = await waitFor(() => {
            const details = document.querySelector('details');
            if (!details) {
                throw new Error('report accordion not rendered yet');
            }
            return details as HTMLDetailsElement;
        });

        // User collapses the first report.
        firstDetails.open = false;
        await fireEvent(firstDetails, new Event('toggle'));
        expect(firstDetails).not.toHaveAttribute('open');

        // A refresh brings a second report alongside the existing one.
        vi.mocked(axios.get).mockResolvedValue({
            data: {
                rabits: reportHtml('RABiTS', 'report'),
                gambit: reportHtml('GAMBIT', 'gambit report')
            }
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Refresh reports' }));

        await waitFor(() => {
            expect(screen.getByText('GAMBIT')).toBeInTheDocument();
        });

        const allDetails = Array.from(document.querySelectorAll('details')) as HTMLDetailsElement[];
        const rabitsDetails = allDetails.find((d) => d.textContent?.includes('RABiTS'));
        const gambitDetails = allDetails.find((d) => d.textContent?.includes('GAMBIT'));

        // The report the user collapsed stays collapsed; the new one is expanded.
        expect(rabitsDetails).not.toHaveAttribute('open');
        expect(gambitDetails).toHaveAttribute('open');
    });

    it('loads reports when Enter is pressed while the sample id can be submitted', async () => {
        const request = deferred<{ data: Record<string, string> }>();
        vi.mocked(axios.get).mockReturnValue(request.promise);

        render(Report, {
            props: {
                baseUrl: 'https://api.example.test'
            }
        });

        const sampleInput = screen.getByLabelText('Sample ID');
        await fireEvent.input(sampleInput, {
            target: { value: 'sample-123' }
        });
        await fireEvent.keyDown(sampleInput, { key: 'Enter' });

        expect(screen.getByRole('button', { name: 'Loading Reports...' })).toBeDisabled();
        await waitFor(() => {
            expect(axios.get).toHaveBeenCalledWith('https://api.example.test/report/get', {
                params: {
                    sampleId: 'sample-123'
                },
                cancelToken: axiosMocks.cancelSources[0].token
            });
        });

        request.resolve({
            data: { rabits: reportHtml('RABiTS', 'report') }
        });
    });

    it('re-enables the button for changed input and keeps the new request loading after cancelling the old one', async () => {
        const firstRequest = deferred<{ data: Record<string, string> }>();
        const secondRequest = deferred<{ data: Record<string, string> }>();

        vi.mocked(axios.get)
            .mockReturnValueOnce(firstRequest.promise)
            .mockReturnValueOnce(secondRequest.promise);

        render(Report, {
            props: {
                baseUrl: 'https://api.example.test'
            }
        });

        await fireEvent.input(screen.getByLabelText('Sample ID'), {
            target: { value: 'abcdef' }
        });
        await fireEvent.click(screen.getByRole('button', { name: 'Load Reports' }));

        expect(screen.getByRole('button', { name: 'Loading Reports...' })).toBeDisabled();

        await fireEvent.input(screen.getByLabelText('Sample ID'), {
            target: { value: 'abcdefghij' }
        });

        const resubmitButton = screen.getByRole('button', { name: 'Load Reports' });
        expect(resubmitButton).toBeEnabled();

        await fireEvent.click(resubmitButton);

        expect(axiosMocks.cancelSources[0].cancel).toHaveBeenCalledWith('New request initiated');
        expect(screen.getByRole('button', { name: 'Loading Reports...' })).toBeDisabled();
        expect(axios.get).toHaveBeenLastCalledWith('https://api.example.test/report/get', {
            params: {
                sampleId: 'abcdefghij'
            },
            cancelToken: axiosMocks.cancelSources[1].token
        });

        firstRequest.reject({ __CANCEL__: true });

        await waitFor(() => {
            expect(axios.isCancel).toHaveBeenCalledWith({ __CANCEL__: true });
        });
        expect(screen.getByRole('button', { name: 'Loading Reports...' })).toBeDisabled();

        secondRequest.resolve({
            data: { rabits: reportHtml('RABiTS', 'Loaded report') }
        });

        expect(await screen.findByTitle('Report: rabits')).toBeInTheDocument();
        expect(screen.getByRole('button', { name: 'Load Reports' })).toBeEnabled();
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
