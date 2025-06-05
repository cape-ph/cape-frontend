import { UserManager } from "oidc-client-ts";
import type { UserManagerSettings } from "oidc-client-ts";
import { env }from "$env/dynamic/public";


const defaultConfig = {
    authority: env.PUBLIC_COGNITO_AUTHORITY || "",
    client_id: env.PUBLIC_COGNITO_CLIENT_ID || "",
    response_type: "code",
    scope: "email openid phone"
};

type RequireRedirectUri<T extends { redirect_uri?: string }> =
    Partial<T> & Pick<T, 'redirect_uri'>;
 
/**
 * Create a new instance of the UserManager class with the provided configuration. 
 * 
 * @param settings - An object containing the configuration options for the UserManager instance
 * @returns the user manager instance
 */ 
export function createUserManager(settings:RequireRedirectUri<UserManagerSettings>): UserManager {
    return new UserManager({
        ...defaultConfig,
        ...settings
    });
}
