import { Routes } from '@angular/router';

export const AI_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/ai-shell/ai-shell.component').then((m) => m.AiShellComponent),
    children: [
      {
        path: '',
        pathMatch: 'full',
        redirectTo: 'overview',
      },
      {
        path: 'overview',
        loadComponent: () =>
          import('./pages/overview/ai-overview-page.component').then(
            (m) => m.AiOverviewPageComponent,
          ),
      },
      {
        path: 'assistant',
        loadComponent: () =>
          import('./pages/assistant/ai-assistant-page.component').then(
            (m) => m.AiAssistantPageComponent,
          ),
      },
      {
        path: 'screening',
        loadComponent: () =>
          import('./pages/screening/ai-screening-page.component').then(
            (m) => m.AiScreeningPageComponent,
          ),
      },
      {
        path: 'appraisals',
        loadComponent: () =>
          import('./pages/appraisals/ai-appraisals-page.component').then(
            (m) => m.AiAppraisalsPageComponent,
          ),
      },
      {
        path: 'policies',
        loadComponent: () =>
          import('./pages/policies/ai-policies-page.component').then(
            (m) => m.AiPoliciesPageComponent,
          ),
      },
      {
        path: 'recommendations',
        loadComponent: () =>
          import('./pages/recommendations/ai-recommendations-page.component').then(
            (m) => m.AiRecommendationsPageComponent,
          ),
      },
    ],
  },
];
