import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, shareReplay, switchMap, throwError, type Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import type { AuthSessionData } from '../models/api.models';
import { isPublicAuthEndpoint } from './auth-endpoints';

let refreshRequest$: Observable<AuthSessionData> | null = null;

/**
 * Attempts a single shared token refresh on 401 for authenticated API calls.
 * Must sit closer to the HTTP backend than errorInterceptor so refresh runs
 * before any 401 session-clear / redirect logic.
 * Public auth endpoints are excluded to avoid loops.
 * The session is cleared only when the refresh call itself is rejected (400/401);
 * errors from the retried request propagate unchanged.
 */
export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isAuthEndpoint = isPublicAuthEndpoint(req.url);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthEndpoint || !auth.getRefreshToken()) {
        return throwError(() => error);
      }

      if (!refreshRequest$) {
        refreshRequest$ = auth.refresh().pipe(
          finalize(() => {
            refreshRequest$ = null;
          }),
          shareReplay({ bufferSize: 1, refCount: false }),
        );
      }

      return refreshRequest$.pipe(
        catchError((refreshError: unknown) => {
          if (
            refreshError instanceof HttpErrorResponse &&
            (refreshError.status === 400 || refreshError.status === 401)
          ) {
            auth.clearSession();
          }
          return throwError(() => refreshError);
        }),
        switchMap((session) =>
          next(
            req.clone({
              setHeaders: {
                Authorization: `Bearer ${session.accessToken}`,
              },
            }),
          ),
        ),
      );
    }),
  );
};
