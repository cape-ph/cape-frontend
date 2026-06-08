import { fireEvent, render, screen } from '@testing-library/svelte';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import FileUpload from './FileUpload.svelte';
import { toaster } from '$lib/toaster';

vi.mock('$lib/toaster', () => ({
    toaster: {
        error: vi.fn(),
        info: vi.fn(),
        success: vi.fn()
    }
}));

vi.mock('$lib/mpu', () => ({
    multiPartUpload: vi.fn()
}));

vi.mock('$lib/stream', () => ({
    tarSize: vi.fn(() => 0),
    tarPack: vi.fn(),
    chunkStream: vi.fn()
}));

describe('FileUpload.svelte', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders metadata fields and upload controls', () => {
        render(FileUpload, {
            props: {
                baseUrl: 'https://api.example.test',
                bucket: 'example-bucket'
            }
        });

        expect(screen.getByRole('heading', { name: 'File Upload' })).toBeInTheDocument();
        expect(screen.getByLabelText('Sample ID')).toHaveAttribute('name', 'sample-id');
        expect(screen.getByLabelText('Sample Type')).toHaveAttribute('name', 'sample-type');
        expect(screen.getByLabelText('Sample Matrix')).toHaveAttribute('name', 'sample-matrix');
        expect(screen.getByLabelText('Sample Collection Location')).toHaveAttribute(
            'name',
            'sample-collection-location'
        );
        expect(screen.getByLabelText('Sample Collection Date')).toHaveAttribute(
            'name',
            'sample-collection-date'
        );
        expect(screen.getByRole('button', { name: 'Upload' })).toBeInTheDocument();
    });

    it('shows an error when upload is clicked without selected files', async () => {
        render(FileUpload, {
            props: {
                baseUrl: 'https://api.example.test',
                bucket: 'example-bucket'
            }
        });

        await fireEvent.click(screen.getByRole('button', { name: 'Upload' }));

        expect(toaster.error).toHaveBeenCalledWith({
            title: 'No file selected'
        });
    });
});
