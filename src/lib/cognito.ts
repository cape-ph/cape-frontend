import { UserManager, WebStorageStateStore } from 'oidc-client-ts';
import type { UserManagerSettings } from 'oidc-client-ts';
import {
    PUBLIC_COGNITO_AUTHORITY,
    PUBLIC_COGNITO_CLIENT_ID,
    PUBLIC_CONGNITO_REDIRECT_URI
} from './env';
import { browser } from '$app/environment';

const config: UserManagerSettings | undefined = browser
    ? {
          authority: PUBLIC_COGNITO_AUTHORITY,
          client_id: PUBLIC_COGNITO_CLIENT_ID,
          redirect_uri: PUBLIC_CONGNITO_REDIRECT_URI,
          response_mode: 'query',
          response_type: 'code',
          scope: 'email openid',
          userStore: new WebStorageStateStore({ store: window.localStorage })
      }
    : undefined;

export const userManager = config ? new UserManager(config) : undefined;
