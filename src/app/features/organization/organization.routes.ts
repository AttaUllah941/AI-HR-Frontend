import { Routes } from '@angular/router';

export const ORGANIZATION_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/organization-shell/organization-shell.component').then(
        (m) => m.OrganizationShellComponent,
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
          import('./pages/organization-overview/organization-overview.component').then(
            (m) => m.OrganizationOverviewComponent,
          ),
      },
      {
        path: 'branches',
        loadComponent: () =>
          import('./pages/branches/branches-page.component').then((m) => m.BranchesPageComponent),
      },
      {
        path: 'departments',
        loadComponent: () =>
          import('./pages/departments/departments-page.component').then(
            (m) => m.DepartmentsPageComponent,
          ),
      },
      {
        path: 'teams',
        loadComponent: () =>
          import('./pages/teams/teams-page.component').then((m) => m.TeamsPageComponent),
      },
      {
        path: 'designations',
        loadComponent: () =>
          import('./pages/designations/designations-page.component').then(
            (m) => m.DesignationsPageComponent,
          ),
      },
      {
        path: 'chart',
        loadComponent: () =>
          import('./pages/org-chart/org-chart-page.component').then((m) => m.OrgChartPageComponent),
      },
    ],
  },
];
