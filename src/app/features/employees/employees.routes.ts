import { Routes } from '@angular/router';

export const EMPLOYEES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/employees-list/employees-list-page.component').then(
        (m) => m.EmployeesListPageComponent,
      ),
  },
  {
    path: ':id',
    loadComponent: () =>
      import('./pages/employee-detail/employee-detail-page.component').then(
        (m) => m.EmployeeDetailPageComponent,
      ),
  },
];
