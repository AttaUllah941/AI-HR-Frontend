import { Routes } from '@angular/router';

export const LEAVE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/leave-shell/leave-shell.component').then((m) => m.LeaveShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'overview',
      },
      {
        path: 'overview',
        loadComponent: () =>
          import('./pages/overview/leave-overview-page.component').then(
            (m) => m.LeaveOverviewPageComponent,
          ),
      },
      {
        path: 'requests',
        loadComponent: () =>
          import('./pages/requests/leave-requests-page.component').then(
            (m) => m.LeaveRequestsPageComponent,
          ),
      },
      {
        path: 'calendar',
        loadComponent: () =>
          import('./pages/calendar/leave-calendar-page.component').then(
            (m) => m.LeaveCalendarPageComponent,
          ),
      },
      {
        path: 'types',
        loadComponent: () =>
          import('./pages/types/leave-types-page.component').then((m) => m.LeaveTypesPageComponent),
      },
      {
        path: 'balances',
        loadComponent: () =>
          import('./pages/balances/leave-balances-page.component').then(
            (m) => m.LeaveBalancesPageComponent,
          ),
      },
      {
        path: 'policy',
        loadComponent: () =>
          import('./pages/policy/leave-policy-page.component').then(
            (m) => m.LeavePolicyPageComponent,
          ),
      },
    ],
  },
];
