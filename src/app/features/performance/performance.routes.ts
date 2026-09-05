import { Routes } from '@angular/router';

export const PERFORMANCE_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/performance-shell/performance-shell.component').then(
        (m) => m.PerformanceShellComponent,
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
          import('./pages/overview/performance-overview-page.component').then(
            (m) => m.PerformanceOverviewPageComponent,
          ),
      },
      {
        path: 'goals',
        loadComponent: () =>
          import('./pages/goals/performance-goals-page.component').then(
            (m) => m.PerformanceGoalsPageComponent,
          ),
      },
      {
        path: 'kpis',
        loadComponent: () =>
          import('./pages/kpis/performance-kpis-page.component').then(
            (m) => m.PerformanceKpisPageComponent,
          ),
      },
      {
        path: 'reviews',
        loadComponent: () =>
          import('./pages/reviews/performance-reviews-page.component').then(
            (m) => m.PerformanceReviewsPageComponent,
          ),
      },
      {
        path: 'feedback',
        loadComponent: () =>
          import('./pages/feedback/performance-feedback-page.component').then(
            (m) => m.PerformanceFeedbackPageComponent,
          ),
      },
      {
        path: 'promotions',
        loadComponent: () =>
          import('./pages/promotions/performance-promotions-page.component').then(
            (m) => m.PerformancePromotionsPageComponent,
          ),
      },
    ],
  },
];
