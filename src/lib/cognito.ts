import { UserManager } from 'oidc-client-ts';
import type { UserManagerSettings } from 'oidc-client-ts';
import { env } from '$env/dynamic/public';

function envar(variable: string, value: string | undefined): string {
    if (value === undefined) {
        throw new Error(`Missing environment variable ${variable}`);
    }
    return value;
}

// Check for required envars
const PUBLIC_COGNITO_AUTHORITY = envar('PUBLIC_COGNITO_AUTHORITY', env.PUBLIC_COGNITO_AUTHORITY);
const PUBLIC_COGNITO_CLIENT_ID = envar('PUBLIC_COGNITO_CLIENT_ID', env.PUBLIC_COGNITO_CLIENT_ID);
const PUBLIC_CONGNITO_REDIRECT_URI = envar(
    'PUBLIC_CONGNITO_REDIRECT_URI',
    env.PUBLIC_COGNITO_REDIRECT_URI
);

const config: UserManagerSettings = {
    authority: PUBLIC_COGNITO_AUTHORITY,
    client_id: PUBLIC_COGNITO_CLIENT_ID,
    redirect_uri: PUBLIC_CONGNITO_REDIRECT_URI,
    response_mode: 'query',
    response_type: 'code',
    scope: 'email openid phone'
};

export const userManager = new UserManager(config);
