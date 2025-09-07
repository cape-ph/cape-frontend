import { env } from '$env/dynamic/public';

function envar(variable: string, value: string | undefined): string {
    if (value === undefined) {
        throw new Error(`Missing environment variable ${variable}`);
    }
    return value;
}

// Check for required envars
export const PUBLIC_COGNITO_AUTHORITY = envar('PUBLIC_COGNITO_AUTHORITY', env.PUBLIC_COGNITO_AUTHORITY);
export const PUBLIC_COGNITO_CLIENT_ID = envar('PUBLIC_COGNITO_CLIENT_ID', env.PUBLIC_COGNITO_CLIENT_ID);
export const PUBLIC_CONGNITO_REDIRECT_URI = envar(
    'PUBLIC_CONGNITO_REDIRECT_URI',
    env.PUBLIC_COGNITO_REDIRECT_URI
);


export const API_BASE = env.API_BASE ?? "https://api.cape-dev.org/capi-dev";
