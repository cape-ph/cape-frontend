import { describe, it, expect, beforeEach, vi } from 'vitest';

const signinSilent = vi.fn();

// Mock the OIDC manager so the interceptor's silent-renew path is controllable
// without a real UserManager (which needs the browser and Cognito env vars).
vi.mock('$lib/cognito', () => ({
    userManager: { signinSilent }
}));

// Mock the user store so the interceptor's identity source is controllable and
// this test does not depend on the Svelte rune runtime.
vi.mock('$lib/user.svelte', () => {
    const state = { user: undefined } as {
        user?: { access_token?: string; expired?: boolean };
    };
    return {
        auth: state,
        setUser: vi.fn((u: { access_token?: string; expired?: boolean } | undefined) => {
            state.user = u;
        })
    };
});

import { auth } from '$lib/user.svelte';
import { capi } from './apiClient';

// `auth` is mocked above with a minimal shape; alias to that shape so test
// assignments do not need the full oidc-client-ts `User` type.
const authState = auth as unknown as { user?: { access_token?: string; expired?: boolean } };

type RequestConfig = { headers?: Record<string, string> };
type InterceptorHandler = {
    fulfilled: (config: RequestConfig) => RequestConfig | Promise<RequestConfig>;
};

function runRequestInterceptor(config: RequestConfig): Promise<RequestConfig> {
    const handlers = (capi.interceptors.request as unknown as { handlers: InterceptorHandler[] })
        .handlers;
    return Promise.resolve(handlers[0].fulfilled(config));
}

describe('capi request interceptor', () => {
    beforeEach(() => {
        authState.user = undefined;
        signinSilent.mockReset();
    });

    it('attaches a bearer token when a user is signed in', async () => {
        authState.user = { access_token: 'tok-123' };
        const result = await runRequestInterceptor({ headers: {} });
        expect(result.headers?.Authorization).toBe('Bearer tok-123');
    });

    it('creates a headers object when none is present', async () => {
        authState.user = { access_token: 'tok-abc' };
        const result = await runRequestInterceptor({});
        expect(result.headers?.Authorization).toBe('Bearer tok-abc');
    });

    it('does not attach an Authorization header when no user is signed in', async () => {
        const result = await runRequestInterceptor({ headers: {} });
        expect(result.headers?.Authorization).toBeUndefined();
    });

    it('silently renews an expired token before attaching it', async () => {
        authState.user = { access_token: 'stale', expired: true };
        signinSilent.mockResolvedValue({ access_token: 'fresh', expired: false });

        const result = await runRequestInterceptor({ headers: {} });

        expect(signinSilent).toHaveBeenCalledOnce();
        expect(result.headers?.Authorization).toBe('Bearer fresh');
    });

    it('falls back to the existing token when silent renew yields nothing', async () => {
        authState.user = { access_token: 'stale', expired: true };
        signinSilent.mockResolvedValue(null);

        const result = await runRequestInterceptor({ headers: {} });

        expect(signinSilent).toHaveBeenCalledOnce();
        expect(result.headers?.Authorization).toBe('Bearer stale');
    });
});
