import axios from 'axios';
import { auth } from '$lib/user.svelte';

/**
 * Shared axios instance for CAPE API calls.
 *
 * A request interceptor attaches the authenticated user's Cognito access token
 * as a Bearer `Authorization` header when a user is signed in. The CAPE API
 * authorizer resolves the caller identity from this token (e.g. to record which
 * user triggered a workflow run), so all workflow-related calls must go through
 * this client rather than the bare `axios` default.
 *
 * NOTE: the Cognito access token carries `sub` and `cognito:username` but not
 * necessarily `email`. If human-readable emails are required server-side, either
 * request the `email` scope so it is present on the access token, or switch to
 * sending `id_token` here.
 */
export const capi = axios.create();

capi.interceptors.request.use((config) => {
    const token = auth.user?.access_token;
    if (token) {
        config.headers = config.headers ?? {};
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});
