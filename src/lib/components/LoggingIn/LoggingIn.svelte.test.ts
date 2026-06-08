import { render, screen } from '@testing-library/svelte';
import { describe, expect, it } from 'vitest';
import LoggingIn from './LoggingIn.svelte';

describe('LoggingIn.svelte', () => {
    it('renders the logging-in status', () => {
        render(LoggingIn);

        expect(screen.getByRole('heading', { name: 'Logging In ...' })).toBeInTheDocument();
    });
});
