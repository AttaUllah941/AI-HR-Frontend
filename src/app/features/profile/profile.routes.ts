import { Routes } from '@angular/router';

export const PROFILE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/profile-shell/profile-shell.component').then(
        (m) => m.ProfileShellComponent,
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
          import('./pages/overview/profile-overview-page.component').then(
            (m) => m.ProfileOverviewPageComponent,
          ),
      },
      {
        path: 'security',
        loadComponent: () =>
          import('./pages/security/profile-security-page.component').then(
            (m) => m.ProfileSecurityPageComponent,
          ),
      },
      {
        path: 'sessions',
        loadComponent: () =>
          import('./pages/sessions/profile-sessions-page.component').then(
            (m) => m.ProfileSessionsPageComponent,
          ),
      },
      {
        path: 'preferences',
        loadComponent: () =>
          import('./pages/preferences/profile-preferences-page.component').then(
            (m) => m.ProfilePreferencesPageComponent,
          ),
      },
      {
        path: 'activity',
        loadComponent: () =>
          import('./pages/activity/profile-activity-page.component').then(
            (m) => m.ProfileActivityPageComponent,
          ),
      },
    ],
  },
];
