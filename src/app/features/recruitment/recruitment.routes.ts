import { Routes } from '@angular/router';

export const RECRUITMENT_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/recruitment-home/recruitment-home.component').then(
        (m) => m.RecruitmentHomeComponent,
      ),
  },
];
