import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, throwError } from 'rxjs';
import { LoadingService } from '../services/loading.service';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';

/**
 * Global loading + user-facing error toasts.
 * 401 session clearing is handled by refreshInterceptor after a failed refresh;
 * this interceptor only redirects when a 401 still surfaces (refresh already failed
 * or no refresh token was available).
 */
export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const loading = inject(LoadingService);
  const toast = inject(ToastService);
  const auth = inject(AuthService);
  const router = inject(Router);

  const skipLoading = req.headers.has('X-Skip-Loading');
  const skipErrorToast = req.headers.has('X-Skip-Error-Toast');

  if (!skipLoading) {
    loading.show();
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const message = extractErrorMessage(error);

      const isAuthRoute = req.url.includes('/auth/');

      if (error.status === 401 && !isAuthRoute) {
        if (auth.isAuthenticated()) {
          auth.clearSession();
        }
        void router.navigate(['/auth/login']);
        if (!skipErrorToast) {
          toast.error('Session expired. Please sign in again.');
        }
      } else if (error.status >= 400 && !skipErrorToast) {
        toast.error(message);
      }

      return throwError(() => error);
    }),
    finalize(() => {
      if (!skipLoading) {
        loading.hide();
      }
    }),
  );
};

function extractErrorMessage(error: HttpErrorResponse): string {
  const body = error.error;
  if (!body || typeof body !== 'object') {
    return error.message || 'Something went wrong';
  }

  const fieldErrors =
    'errors' in body &&
    body.errors &&
    typeof body.errors === 'object' &&
    'fieldErrors' in (body.errors as object)
      ? ((body.errors as { fieldErrors: Record<string, string[]> }).fieldErrors ?? {})
      : null;

  if (fieldErrors) {
    const details = Object.values(fieldErrors)
      .flat()
      .filter(Boolean);
    if (details.length > 0) {
      return details.join('. ');
    }
  }

  if ('message' in body && body.message) {
    return String(body.message);
  }

  return error.message || 'Something went wrong';
}
