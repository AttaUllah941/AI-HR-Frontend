import { Routes } from '@angular/router';

export const FILES_ROUTES: Routes = [
  {
    path: '',
    loadComponent: () =>
      import('./pages/files-shell/files-shell.component').then((m) => m.FilesShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'overview' },
      {
        path: 'overview',
        loadComponent: () =>
          import('./pages/overview/files-overview-page.component').then(
            (m) => m.FilesOverviewPageComponent,
          ),
      },
      {
        path: 'library',
        loadComponent: () =>
          import('./pages/library/files-library-page.component').then(
            (m) => m.FilesLibraryPageComponent,
          ),
      },
      {
        path: 'documents',
        loadComponent: () =>
          import('./pages/documents/files-documents-page.component').then(
            (m) => m.FilesDocumentsPageComponent,
          ),
      },
      {
        path: 'resumes',
        loadComponent: () =>
          import('./pages/resumes/files-resumes-page.component').then(
            (m) => m.FilesResumesPageComponent,
          ),
      },
    ],
  },
];
