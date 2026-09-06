import { Routes } from '@angular/router';

export const SETTINGS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/settings-shell/settings-shell.component').then(
        (m) => m.SettingsShellComponent,
      ),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      {
        path: 'overview',
        loadComponent: () =>
          import('./pages/overview/settings-overview-page.component').then(
            (m) => m.SettingsOverviewPageComponent,
          ),
      },
      {
        path: 'company',
        loadComponent: () =>
          import('./pages/company/settings-company-page.component').then(
            (m) => m.SettingsCompanyPageComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./pages/users/settings-users-page.component').then(
            (m) => m.SettingsUsersPageComponent,
          ),
      },
      {
        path: 'roles',
        loadComponent: () =>
          import('./pages/roles/settings-roles-page.component').then(
            (m) => m.SettingsRolesPageComponent,
          ),
      },
      {
        path: 'email',
        loadComponent: () =>
          import('./pages/email/settings-email-page.component').then(
            (m) => m.SettingsEmailPageComponent,
          ),
      },
      {
        path: 'storage',
        loadComponent: () =>
          import('./pages/storage/settings-storage-page.component').then(
            (m) => m.SettingsStoragePageComponent,
          ),
      },
      {
        path: 'system',
        loadComponent: () =>
          import('./pages/system/settings-system-page.component').then(
            (m) => m.SettingsSystemPageComponent,
          ),
      },
      {
        path: 'audit',
        loadComponent: () =>
          import('./pages/audit/settings-audit-page.component').then(
            (m) => m.SettingsAuditPageComponent,
          ),
      },
    ],
  },
];
