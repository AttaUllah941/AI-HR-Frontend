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
        loadComponent: () =>
          import('./features/organization/organization-placeholder.component').then(
            (m) => m.OrganizationPlaceholderComponent,
          ),
      },
      {
        path: 'employees',
        loadComponent: () =>
          import('./features/employees/employees-placeholder.component').then(
            (m) => m.EmployeesPlaceholderComponent,
          ),
      },
      {
        path: 'attendance',
        loadComponent: () =>
          import('./features/attendance/attendance-placeholder.component').then(
            (m) => m.AttendancePlaceholderComponent,
          ),
      },
      {
        path: 'leave',
        loadComponent: () =>
          import('./features/leave/leave-placeholder.component').then(
            (m) => m.LeavePlaceholderComponent,
          ),
      },
      {
        path: 'payroll',
        loadComponent: () =>
          import('./features/payroll/payroll-placeholder.component').then(
            (m) => m.PayrollPlaceholderComponent,
          ),
      },
      {
        path: 'recruitment',
        loadComponent: () =>
          import('./features/recruitment/recruitment-placeholder.component').then(
            (m) => m.RecruitmentPlaceholderComponent,
          ),
      },
      {
        path: 'performance',
        loadComponent: () =>
          import('./features/performance/performance-placeholder.component').then(
            (m) => m.PerformancePlaceholderComponent,
          ),
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
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
