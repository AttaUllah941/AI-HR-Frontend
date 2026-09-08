// this file is used to define the routes for the app
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';

export const routes: Routes = [
  {
    path: '',
    pathMatch: 'full',
    redirectTo: 'dashboard',
  },
  {
    path: 'auth',
    loadChildren: () => import('./features/auth/auth.routes').then((m) => m.AUTH_ROUTES),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./layouts/main-layout/main-layout.component').then((m) => m.MainLayoutComponent),
    children: [
      {
        path: 'dashboard',
        loadChildren: () =>
          import('./features/dashboard/dashboard.routes').then((m) => m.DASHBOARD_ROUTES),
      },
      {
        path: 'mfa-setup',
        loadComponent: () =>
          import('./features/auth/pages/mfa-setup/mfa-setup-page.component').then(
            (m) => m.MfaSetupPageComponent,
          ),
      },
      {
        path: 'organization',
        loadChildren: () =>
          import('./features/organization/organization.routes').then((m) => m.ORGANIZATION_ROUTES),
      },
      {
        path: 'employees',
        loadChildren: () =>
          import('./features/employees/employees.routes').then((m) => m.EMPLOYEES_ROUTES),
      },
      {
        path: 'attendance',
        loadChildren: () =>
          import('./features/attendance/attendance.routes').then((m) => m.ATTENDANCE_ROUTES),
      },
      {
        path: 'leave',
        loadChildren: () =>
          import('./features/leave/leave.routes').then((m) => m.LEAVE_ROUTES),
      },
      {
        path: 'payroll',
        loadChildren: () =>
          import('./features/payroll/payroll.routes').then((m) => m.PAYROLL_ROUTES),
      },
      {
        path: 'recruitment',
        loadChildren: () =>
          import('./features/recruitment/recruitment.routes').then((m) => m.RECRUITMENT_ROUTES),
      },
      {
        path: 'performance',
        loadChildren: () =>
          import('./features/performance/performance.routes').then((m) => m.PERFORMANCE_ROUTES),
      },
      {
        path: 'ai',
        loadComponent: () =>
          import('./features/ai/ai-placeholder.component').then((m) => m.AiPlaceholderComponent),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/reports/reports-placeholder.component').then(
            (m) => m.ReportsPlaceholderComponent,
          ),
      },
      {
        path: 'notifications',
        loadComponent: () =>
          import('./features/notifications/notifications-placeholder.component').then(
            (m) => m.NotificationsPlaceholderComponent,
          ),
      },
      {
        path: 'profile',
        loadComponent: () =>
          import('./features/profile/profile-placeholder.component').then(
            (m) => m.ProfilePlaceholderComponent,
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./features/settings/settings-placeholder.component').then(
            (m) => m.SettingsPlaceholderComponent,
          ),
      },
      {
        path: 'files',
        loadComponent: () =>
          import('./features/files/files-placeholder.component').then(
            (m) => m.FilesPlaceholderComponent,
          ),
      },
      {
        path: 'policies',
        loadComponent: () =>
          import('./features/policies/policies-placeholder.component').then(
            (m) => m.PoliciesPlaceholderComponent,
          ),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
