import { Routes } from '@angular/router';

export const NOTIFICATIONS_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/notifications-shell/notifications-shell.component').then(
        (m) => m.NotificationsShellComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'inbox',
      },
      {
        path: 'inbox',
        loadComponent: () =>
          import('./pages/inbox/notifications-inbox-page.component').then(
            (m) => m.NotificationsInboxPageComponent,
          ),
      },
      {
        path: 'preferences',
        loadComponent: () =>
          import('./pages/preferences/notifications-preferences-page.component').then(
            (m) => m.NotificationsPreferencesPageComponent,
          ),
      },
      {
        path: 'templates',
        loadComponent: () =>
          import('./pages/templates/notifications-templates-page.component').then(
            (m) => m.NotificationsTemplatesPageComponent,
          ),
      },
      {
        path: 'devices',
        loadComponent: () =>
          import('./pages/devices/notifications-devices-page.component').then(
            (m) => m.NotificationsDevicesPageComponent,
          ),
      },
    ],
  },
];
