import { Routes } from '@angular/router';

export const PAYROLL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/payroll-shell/payroll-shell.component').then((m) => m.PayrollShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'overview',
      },
      {
        path: 'overview',
        loadComponent: () =>
          import('./pages/overview/payroll-overview-page.component').then(
            (m) => m.PayrollOverviewPageComponent,
          ),
      },
      {
        path: 'runs',
        loadComponent: () =>
          import('./pages/runs/payroll-runs-page.component').then(
            (m) => m.PayrollRunsPageComponent,
          ),
      },
      {
        path: 'structures',
        loadComponent: () =>
          import('./pages/structures/payroll-structures-page.component').then(
            (m) => m.PayrollStructuresPageComponent,
          ),
      },
      {
        path: 'components',
        loadComponent: () =>
          import('./pages/components/payroll-components-page.component').then(
            (m) => m.PayrollComponentsPageComponent,
          ),
      },
      {
        path: 'payslips',
        loadComponent: () =>
          import('./pages/payslips/payroll-payslips-page.component').then(
            (m) => m.PayrollPayslipsPageComponent,
          ),
      },
      {
        path: 'tax',
        loadComponent: () =>
          import('./pages/tax/payroll-tax-page.component').then((m) => m.PayrollTaxPageComponent),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./pages/reports/payroll-reports-page.component').then(
            (m) => m.PayrollReportsPageComponent,
          ),
      },
    ],
  },
];
