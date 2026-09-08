import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, switchMap, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

/**
 * Attempts token refresh on 401 for authenticated API calls.
 * Concurrent 401s share a single in-flight refresh via AuthService.
 * Auth credential endpoints are excluded to avoid loops.
 */
export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isAuthEndpoint =
    /\/auth\/(login|register|refresh|forgot-password|reset-password|verify-email|mfa\/verify)$/.test(
      req.url,
    );

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthEndpoint || !auth.getRefreshToken()) {
        return throwError(() => error);
      }

      return auth.refresh().pipe(
        switchMap((session) =>
          next(
            req.clone({
              setHeaders: {
                Authorization: `Bearer ${session.accessToken}`,
              },
            }),
          ),
        ),
        catchError((refreshError) => {
          auth.clearSession();
          return throwError(() => refreshError);
        }),
      );
    }),
  );
};
