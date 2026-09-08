import { Routes } from '@angular/router';

export const PERFORMANCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/performance-home/performance-home.component').then(
        (m) => m.PerformanceHomeComponent,
      ),
  },
];
