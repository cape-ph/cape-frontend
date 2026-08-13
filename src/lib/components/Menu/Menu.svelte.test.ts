import { fireEvent, render, screen } from '@testing-library/svelte';
import { describe, expect, it, vi } from 'vitest';
import Menu from './Menu.svelte';

const links = [
    { key: 'upload', label: 'Upload' },
    { key: 'submit', label: 'Submit' },
    { key: 'report', label: 'Report' }
];

describe('Menu.svelte', () => {
    it('marks the active link and calls onSelect when a link is selected', async () => {
        const onSelect = vi.fn();

        render(Menu, {
            props: {
                links,
                activeKey: 'submit',
                onSelect
            }
        });

        expect(screen.getAllByRole('button', { name: 'Submit' })[0]).toHaveAttribute(
            'aria-current',
            'page'
        );

        await fireEvent.click(screen.getAllByRole('button', { name: 'Report' })[0]);

        expect(onSelect).toHaveBeenCalledWith('report');
    });

    it('toggles the mobile menu open and closed', async () => {
        render(Menu, {
            props: {
                links,
                activeKey: 'upload',
                onSelect: vi.fn()
            }
        });

        const toggle = screen.getByRole('button', { expanded: false });

        await fireEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'true');

        await fireEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });

    it('closes the mobile menu when the backdrop is clicked', async () => {
        render(Menu, {
            props: {
                links,
                activeKey: 'upload',
                onSelect: vi.fn()
            }
        });

        const toggle = screen.getByRole('button', { expanded: false });
        await fireEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'true');

        await fireEvent.click(screen.getByRole('button', { name: 'Close navigation menu' }));
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByRole('button', { name: 'Close navigation menu' })).toBeNull();
    });

    it('closes the mobile menu when Escape is pressed', async () => {
        render(Menu, {
            props: {
                links,
                activeKey: 'upload',
                onSelect: vi.fn()
            }
        });

        const toggle = screen.getByRole('button', { expanded: false });
        await fireEvent.click(toggle);
        expect(toggle).toHaveAttribute('aria-expanded', 'true');

        await fireEvent.keyDown(window, { key: 'Escape' });
        expect(toggle).toHaveAttribute('aria-expanded', 'false');
    });
});
