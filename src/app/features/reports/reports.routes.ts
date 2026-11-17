import { Routes } from '@angular/router';

export const REPORTS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/reports-shell/reports-shell.component').then(
        (m) => m.ReportsShellComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'overview',
      },
      {
        path: 'overview',
        loadComponent: () =>
          import('./pages/overview/reports-overview-page.component').then(
            (m) => m.ReportsOverviewPageComponent,
          ),
      },
      {
        path: 'attendance',
        loadComponent: () =>
          import('./pages/attendance/reports-attendance-page.component').then(
            (m) => m.ReportsAttendancePageComponent,
          ),
      },
      {
        path: 'leave',
        loadComponent: () =>
          import('./pages/leave/reports-leave-page.component').then(
            (m) => m.ReportsLeavePageComponent,
          ),
      },
      {
        path: 'payroll',
        loadComponent: () =>
          import('./pages/payroll/reports-payroll-page.component').then(
            (m) => m.ReportsPayrollPageComponent,
          ),
      },
      {
        path: 'recruitment',
        loadComponent: () =>
          import('./pages/recruitment/reports-recruitment-page.component').then(
            (m) => m.ReportsRecruitmentPageComponent,
          ),
      },
      {
        path: 'performance',
        loadComponent: () =>
          import('./pages/performance/reports-performance-page.component').then(
            (m) => m.ReportsPerformancePageComponent,
          ),
      },
      {
        path: 'employees',
        loadComponent: () =>
          import('./pages/employees/reports-employees-page.component').then(
            (m) => m.ReportsEmployeesPageComponent,
          ),
      },
    ],
  },
];
