import { HttpContextToken } from '@angular/common/http';

/**
 * Set on an HttpContext to keep a request out of the global loading indicator
 * (polling, background refreshes, type-ahead).
 *
 *   http.get(url, { context: new HttpContext().set(SKIP_LOADING, true) })
 */
export const SKIP_LOADING = new HttpContextToken<boolean>(() => false);
