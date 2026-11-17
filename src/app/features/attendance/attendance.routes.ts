import { Routes } from '@angular/router';

export const ATTENDANCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/attendance-shell/attendance-shell.component').then(
        (m) => m.AttendanceShellComponent,
      ),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'today',
      },
      {
        path: 'today',
        loadComponent: () =>
          import('./pages/today/attendance-today-page.component').then(
            (m) => m.AttendanceTodayPageComponent,
          ),
      },
      {
        path: 'daily',
        loadComponent: () =>
          import('./pages/daily/attendance-daily-page.component').then(
            (m) => m.AttendanceDailyPageComponent,
          ),
      },
      {
        path: 'timesheet',
        loadComponent: () =>
          import('./pages/timesheet/attendance-timesheet-page.component').then(
            (m) => m.AttendanceTimesheetPageComponent,
          ),
      },
      {
        path: 'shifts',
        loadComponent: () =>
          import('./pages/shifts/attendance-shifts-page.component').then(
            (m) => m.AttendanceShiftsPageComponent,
          ),
      },
      {
        path: 'holidays',
        loadComponent: () =>
          import('./pages/holidays/attendance-holidays-page.component').then(
            (m) => m.AttendanceHolidaysPageComponent,
          ),
      },
      {
        path: 'overtime',
        loadComponent: () =>
          import('./pages/overtime/attendance-overtime-page.component').then(
            (m) => m.AttendanceOvertimePageComponent,
          ),
      },
    ],
  },
];
