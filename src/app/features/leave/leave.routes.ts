import { Routes } from '@angular/router';

export const LEAVE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/leave-home/leave-home.component').then((m) => m.LeaveHomeComponent),
  },
];
