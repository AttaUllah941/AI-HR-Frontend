// this file is used to define the routes for the app
import { Routes } from '@angular/router';
import { authGuard } from './core/guards/auth.guard';
import { permissionGuard } from './core/guards/permission.guard';

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
        canActivate: [permissionGuard('dashboard:view')],
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
        canActivate: [permissionGuard('organization:view')],
        loadChildren: () =>
          import('./features/organization/organization.routes').then((m) => m.ORGANIZATION_ROUTES),
      },
      {
        path: 'employees',
        canActivate: [permissionGuard('employees:view')],
        loadChildren: () =>
          import('./features/employees/employees.routes').then((m) => m.EMPLOYEES_ROUTES),
      },
      {
        path: 'attendance',
        canActivate: [permissionGuard('attendance:view')],
        loadChildren: () =>
          import('./features/attendance/attendance.routes').then((m) => m.ATTENDANCE_ROUTES),
      },
      {
        path: 'leave',
        canActivate: [permissionGuard('leave:view')],
        loadChildren: () =>
          import('./features/leave/leave.routes').then((m) => m.LEAVE_ROUTES),
      },
      {
        path: 'payroll',
        canActivate: [permissionGuard('payroll:view')],
        loadChildren: () =>
          import('./features/payroll/payroll.routes').then((m) => m.PAYROLL_ROUTES),
      },
      {
        path: 'recruitment',
        canActivate: [permissionGuard('recruitment:view')],
        loadChildren: () =>
          import('./features/recruitment/recruitment.routes').then((m) => m.RECRUITMENT_ROUTES),
      },
      {
        path: 'performance',
        canActivate: [permissionGuard('performance:view')],
        loadChildren: () =>
          import('./features/performance/performance.routes').then((m) => m.PERFORMANCE_ROUTES),
      },
      {
        path: 'ai',
        canActivate: [permissionGuard('ai:view')],
        loadChildren: () =>
          import('./features/ai/ai.routes').then((m) => m.AI_ROUTES),
      },
      {
        path: 'reports',
        canActivate: [permissionGuard('reports:view')],
        loadComponent: () =>
          import('./features/reports/reports-placeholder.component').then(
            (m) => m.ReportsPlaceholderComponent,
          ),
      },
      {
        path: 'notifications',
        canActivate: [permissionGuard('notifications:view')],
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
        canActivate: [permissionGuard('settings:view')],
        loadComponent: () =>
          import('./features/settings/settings-placeholder.component').then(
            (m) => m.SettingsPlaceholderComponent,
          ),
      },
      {
        path: 'files',
        canActivate: [permissionGuard('files:view')],
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
