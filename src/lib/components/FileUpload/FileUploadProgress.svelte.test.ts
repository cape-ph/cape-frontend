import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import FileUploadProgress from './FileUploadProgress.svelte';

describe('FileUploadProgress.svelte', () => {
    it('renders filename, byte counts, and progress percentage', () => {
        render(FileUploadProgress, {
            props: {
                filename: 'sample-123.tar',
                upload: {
                    state: 'uploading',
                    bytesSent: 512,
                    totalBytes: 1024
                }
            }
        });

        expect(screen.getByText('sample-123.tar')).toBeInTheDocument();
        expect(screen.getByText('512 B / 1.0 KB')).toBeInTheDocument();
        expect(
            screen.getByRole('progressbar', { name: 'Uploading sample-123.tar' })
        ).toHaveAttribute('aria-valuenow', '50');
    });
});
