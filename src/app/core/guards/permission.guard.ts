import { CanActivateFn, Router } from '@angular/router';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';

export const permissionGuard = (...permissions: string[]): CanActivateFn => {
  return () => {
    const auth = inject(AuthService);
    const router = inject(Router);

    if (!auth.isAuthenticated()) {
      return router.createUrlTree(['/auth/login']);
    }

    const allowed = permissions.every((permission) => auth.hasPermission(permission));
    // Profile is always reachable for authenticated users (no permission gate).
    return allowed ? true : router.createUrlTree(['/profile']);
  };
};
