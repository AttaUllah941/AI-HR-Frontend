import { Routes } from '@angular/router';

export const PAYROLL_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/payroll-home/payroll-home.component').then((m) => m.PayrollHomeComponent),
  },
];
