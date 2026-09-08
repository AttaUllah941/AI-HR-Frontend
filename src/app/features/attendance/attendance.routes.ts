import { Routes } from '@angular/router';

export const ATTENDANCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/attendance-home/attendance-home.component').then(
        (m) => m.AttendanceHomeComponent,
      ),
  },
];
