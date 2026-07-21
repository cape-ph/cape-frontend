import { describe, it, expect, beforeEach, vi } from 'vitest';

// Mock the user store so the interceptor's identity source is controllable and
// this test does not depend on Svelte rune runtime.
vi.mock('$lib/user.svelte', () => ({
    auth: { user: undefined } as { user?: { access_token?: string } }
}));

import { auth } from '$lib/user.svelte';
import { capi } from './apiClient';

// `auth` is mocked above with a minimal shape; alias to that shape so test
// assignments do not need the full oidc-client-ts `User` type.
const authState = auth as unknown as { user?: { access_token?: string } };

type RequestConfig = { headers?: Record<string, string> };
type InterceptorHandler = { fulfilled: (config: RequestConfig) => RequestConfig };

function runRequestInterceptor(config: RequestConfig): RequestConfig {
    const handlers = (capi.interceptors.request as unknown as { handlers: InterceptorHandler[] })
        .handlers;
    return handlers[0].fulfilled(config);
}

describe('capi request interceptor', () => {
    beforeEach(() => {
        authState.user = undefined;
    });

    it('attaches a bearer token when a user is signed in', () => {
        authState.user = { access_token: 'tok-123' };
        const result = runRequestInterceptor({ headers: {} });
        expect(result.headers?.Authorization).toBe('Bearer tok-123');
    });

    it('creates a headers object when none is present', () => {
        authState.user = { access_token: 'tok-abc' };
        const result = runRequestInterceptor({});
        expect(result.headers?.Authorization).toBe('Bearer tok-abc');
    });

    it('does not attach an Authorization header when no user is signed in', () => {
        const result = runRequestInterceptor({ headers: {} });
        expect(result.headers?.Authorization).toBeUndefined();
    });
});
