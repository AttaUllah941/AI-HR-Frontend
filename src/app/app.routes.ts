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
        loadChildren: () =>
          import('./features/reports/reports.routes').then((m) => m.REPORTS_ROUTES),
      },
      {
        path: 'notifications',
        canActivate: [permissionGuard('notifications:view')],
        loadChildren: () =>
          import('./features/notifications/notifications.routes').then(
            (m) => m.NOTIFICATIONS_ROUTES,
          ),
      },
      {
        path: 'profile',
        loadChildren: () =>
          import('./features/profile/profile.routes').then((m) => m.PROFILE_ROUTES),
      },
      {
        path: 'settings',
        canActivate: [permissionGuard('settings:view')],
        loadChildren: () =>
          import('./features/settings/settings.routes').then((m) => m.SETTINGS_ROUTES),
      },
      {
        path: 'files',
        canActivate: [permissionGuard('files:view')],
        loadChildren: () =>
          import('./features/files/files.routes').then((m) => m.FILES_ROUTES),
      },
    ],
  },
  {
    path: '**',
    redirectTo: 'dashboard',
  },
];
