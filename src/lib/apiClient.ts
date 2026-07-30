import axios from 'axios';
import type { User } from 'oidc-client-ts';
import { auth, setUser } from '$lib/user.svelte';

/**
 * Shared axios instance for CAPE API calls.
 *
 * A request interceptor attaches the authenticated user's Cognito access token
 * as a Bearer `Authorization` header when a user is signed in. The CAPE API
 * authorizer resolves the caller identity from this token (e.g. to record which
 * user triggered a workflow run), so all workflow-related calls must go through
 * this client rather than the bare `axios` default.
 *
 * Tokens are normally kept fresh by `automaticSilentRenew` (see `cognito.ts`).
 * As a safety net for a tab that wakes past expiry before the renew timer
 * fires, the interceptor performs an on-demand silent renew when the in-memory
 * token has already expired, so a stale JWT is never sent.
 *
 * NOTE: the Cognito access token carries `sub` and `cognito:username` but not
 * necessarily `email`. If human-readable emails are required server-side, either
 * request the `email` scope so it is present on the access token, or switch to
 * sending `id_token` here.
 */
export const capi = axios.create();

// Many requests can fire while a single silent renew is in flight; share one
// promise so concurrent requests do not each trigger their own renewal.
let renewInFlight: Promise<User | null> | null = null;

function renewToken(): Promise<User | null> {
    if (!renewInFlight) {
        // Import cognito lazily so merely constructing the API client does not
        // pull the OIDC manager (and its browser/env dependencies) into every
        // module graph that imports `capi`.
        renewInFlight = import('$lib/cognito')
            .then(({ userManager }) => userManager?.signinSilent() ?? null)
            .finally(() => {
                renewInFlight = null;
            });
    }
    return renewInFlight;
}

capi.interceptors.request.use(async (config) => {
    let token = auth.user?.access_token;

    if (auth.user?.expired) {
        try {
            const renewed = await renewToken();
            if (renewed) {
                setUser(renewed);
                token = renewed.access_token;
            }
        } catch (err) {
            console.error('Failed to renew access token before request', err);
        }
    }

    if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
