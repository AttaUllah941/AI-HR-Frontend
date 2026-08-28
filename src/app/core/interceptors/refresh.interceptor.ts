import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

let refreshInFlight = false;

/**
 * Attempts a single token refresh on 401 for authenticated API calls.
 * Auth endpoints themselves are excluded to avoid loops.
 */
export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isAuthEndpoint = /\/auth\/(login|register|refresh|forgot-password|reset-password|verify-email|mfa\/verify)/.test(
    req.url,
  );

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthEndpoint || refreshInFlight || !auth.getRefreshToken()) {
        return throwError(() => error);
      }

      refreshInFlight = true;

      return auth.refresh().pipe(
        switchMap((session) => {
          refreshInFlight = false;
          return next(
            req.clone({
              setHeaders: {
                Authorization: `Bearer ${session.accessToken}`,
              },
            }),
          );
        }),
        catchError((refreshError) => {
          refreshInFlight = false;
          auth.clearSession();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
