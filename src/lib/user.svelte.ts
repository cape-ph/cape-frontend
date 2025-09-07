import type { User } from 'oidc-client-ts';

export const auth = $state<{ user ?: User}>({});

export function getUser() {
  return auth.user;
}

export function setUser(u: User | undefined) {
  auth.user = u; 
}

export function clearUser() {
  auth.user = undefined;
}