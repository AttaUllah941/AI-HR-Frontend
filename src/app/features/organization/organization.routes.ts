import { Routes } from '@angular/router';

export const ORGANIZATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/organization-home/organization-home.component').then(
        (m) => m.OrganizationHomeComponent,
      ),
  },
];
