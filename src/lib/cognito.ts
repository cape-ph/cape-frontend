import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import type { UserManagerSettings } from 'oidc-client-ts';
import {
    PUBLIC_COGNITO_AUTHORITY,
    PUBLIC_COGNITO_CLIENT_ID,
    PUBLIC_COGNITO_REDIRECT_URI
} from './env';
import { setUser, clearUser } from './user.svelte';
import { browser } from '$app/environment';

const config: UserManagerSettings | undefined = browser
    ? {
          authority: PUBLIC_COGNITO_AUTHORITY,
          client_id: PUBLIC_COGNITO_CLIENT_ID,
          redirect_uri: PUBLIC_COGNITO_REDIRECT_URI,
          response_mode: 'query',
          response_type: 'code',
          scope: 'email openid',
          // Renew the access token in the background using the Cognito refresh
          // token (issued for the authorization-code + PKCE flow) shortly before
          // it expires, so a long-lived session never sends a stale JWT.
          automaticSilentRenew: true,
          accessTokenExpiringNotificationTimeInSeconds: 60,
          userStore: new WebStorageStateStore({ store: window.localStorage })
      }
    : undefined;

export const userManager = config ? new UserManager(config) : undefined;

// Keep the reactive user store in sync with every token lifecycle event. Without
// this a background silent renew would refresh the stored token but leave the
// in-memory `auth.user` (and thus the API bearer token) stale.
if (userManager) {
    userManager.events.addUserLoaded((user) => setUser(user));
    userManager.events.addUserUnloaded(() => clearUser());
    userManager.events.addSilentRenewError((err) => {
        console.error('OIDC silent renew failed', err);
    });
}
