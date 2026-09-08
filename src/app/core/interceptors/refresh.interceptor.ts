import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, finalize, shareReplay, switchMap, throwError, type Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';
import type { AuthSessionData } from '../models/api.models';

let refreshRequest$: Observable<AuthSessionData> | null = null;

/**
 * Attempts a single shared token refresh on 401 for authenticated API calls.
 * Must sit closer to the HTTP backend than errorInterceptor so refresh runs
 * before any 401 session-clear / redirect logic.
 * Auth endpoints themselves are excluded to avoid loops.
 */
export const refreshInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const isAuthEndpoint =
    /\/auth\/(login|register|refresh|forgot-password|reset-password|verify-email|mfa\/verify)/.test(
      req.url,
    );

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
