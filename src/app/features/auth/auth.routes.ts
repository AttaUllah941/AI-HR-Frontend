import { Routes } from '@angular/router';
import { guestGuard } from '../../core/guards/auth.guard';

export const AUTH_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('../../layouts/auth-layout/auth-layout.component').then((m) => m.AuthLayoutComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'login' },
      {
        path: 'login',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./pages/login/login-page.component').then((m) => m.LoginPageComponent),
      },
      {
        path: 'register',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./pages/register/register-page.component').then((m) => m.RegisterPageComponent),
      },
      {
        path: 'forgot-password',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./pages/forgot-password/forgot-password-page.component').then(
            (m) => m.ForgotPasswordPageComponent,
          ),
      },
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./pages/reset-password/reset-password-page.component').then(
            (m) => m.ResetPasswordPageComponent,
          ),
      },
      {
        path: 'verify-email',
        loadComponent: () =>
          import('./pages/verify-email/verify-email-page.component').then(
            (m) => m.VerifyEmailPageComponent,
          ),
      },
      {
        path: 'mfa',
        canActivate: [guestGuard],
        loadComponent: () =>
          import('./pages/mfa/mfa-page.component').then((m) => m.MfaPageComponent),
      },
    ],
  },
];
