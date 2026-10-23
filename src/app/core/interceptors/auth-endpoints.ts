/**
 * Public auth endpoints that must never trigger a token refresh or session redirect.
 * Authenticated /auth/* calls (e.g. /auth/me, /auth/mfa/setup) are intentionally not matched.
 */
const PUBLIC_AUTH_ENDPOINT =
  /\/auth\/(login|register|refresh|forgot-password|reset-password|verify-email|mfa\/verify)(?:[/?#]|$)/;

export function isPublicAuthEndpoint(url: string): boolean {
  return PUBLIC_AUTH_ENDPOINT.test(url);
}
