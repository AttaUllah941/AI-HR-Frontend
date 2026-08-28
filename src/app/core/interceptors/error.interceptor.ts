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

      const isAuthRoute = req.url.includes('/auth/');

      if (error.status === 401 && !isAuthRoute) {
        auth.clearSession();
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
