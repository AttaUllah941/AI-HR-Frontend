import { Routes } from '@angular/router';

export const RECRUITMENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/recruitment-shell/recruitment-shell.component').then(
        (m) => m.RecruitmentShellComponent,
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
          import('./pages/overview/recruitment-overview-page.component').then(
            (m) => m.RecruitmentOverviewPageComponent,
          ),
      },
      {
        path: 'jobs',
        loadComponent: () =>
          import('./pages/jobs/recruitment-jobs-page.component').then(
            (m) => m.RecruitmentJobsPageComponent,
          ),
      },
      {
        path: 'candidates',
        loadComponent: () =>
          import('./pages/candidates/recruitment-candidates-page.component').then(
            (m) => m.RecruitmentCandidatesPageComponent,
          ),
      },
      {
        path: 'pipeline',
        loadComponent: () =>
          import('./pages/pipeline/recruitment-pipeline-page.component').then(
            (m) => m.RecruitmentPipelinePageComponent,
          ),
      },
      {
        path: 'interviews',
        loadComponent: () =>
          import('./pages/interviews/recruitment-interviews-page.component').then(
            (m) => m.RecruitmentInterviewsPageComponent,
          ),
      },
      {
        path: 'offers',
        loadComponent: () =>
          import('./pages/offers/recruitment-offers-page.component').then(
            (m) => m.RecruitmentOffersPageComponent,
          ),
      },
    ],
  },
];
