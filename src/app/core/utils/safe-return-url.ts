/**
 * Returns the given return URL only when it is a same-origin app path
 * (single leading '/', no '//' or backslash tricks, not an auth page); otherwise the fallback.
 */
export function safeReturnUrl(value: string | null | undefined, fallback = '/dashboard'): string {
  if (
    value &&
    value.startsWith('/') &&
    !value.startsWith('//') &&
    !value.includes('\\') &&
    !value.startsWith('/auth')
  ) {
    return value;
  }
  return fallback;
}
