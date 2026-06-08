import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import type { User } from 'oidc-client-ts';
import Navbar from './Navbar.svelte';

const links = [
    { key: 'upload', label: 'Upload' },
    { key: 'submit', label: 'Submit' }
];

describe('Navbar.svelte', () => {
    it('renders brand, user email, fallback avatar initial, and menu links', async () => {
        const onSelect = vi.fn();
        const user = {
            profile: {
                email: 'scientist@example.org'
            }
        } as User;

        render(Navbar, {
            props: {
                user,
                logo: '/logo.svg',
                links,
                activeKey: 'upload',
                onSelect
            }
        });

        expect(screen.getByAltText('Cape Logo')).toHaveAttribute('src', '/logo.svg');
        expect(screen.getByText('scientist@example.org')).toBeInTheDocument();
        expect(screen.getByText('S')).toBeInTheDocument();

        await fireEvent.click(screen.getAllByRole('button', { name: 'Submit' })[0]);

        expect(onSelect).toHaveBeenCalledWith('submit');
    });
});
