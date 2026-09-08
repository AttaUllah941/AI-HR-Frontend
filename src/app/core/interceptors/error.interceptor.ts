import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, finalize, throwError } from 'rxjs';
import { LoadingService } from '../services/loading.service';
import { ToastService } from '../services/toast.service';
import { AuthService } from '../services/auth.service';

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
      const message =
        (error.error && typeof error.error === 'object' && 'message' in error.error
          ? String((error.error as { message: string }).message)
          : null) ||
        error.message ||
        'Something went wrong';

      const isAuthRoute = /\/auth\//.test(req.url);
      const isRefreshFailure = /\/auth\/refresh$/.test(req.url);

      // Let refreshInterceptor handle recoverable 401s; only force login after refresh fails
      // or when there is no session left to recover.
      if (error.status === 401 && (!isAuthRoute || isRefreshFailure)) {
        if (!auth.getRefreshToken() || isRefreshFailure) {
          auth.clearSession();
          void router.navigate(['/auth/login']);
          if (!skipErrorToast) {
            toast.error('Session expired. Please sign in again.');
          }
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
