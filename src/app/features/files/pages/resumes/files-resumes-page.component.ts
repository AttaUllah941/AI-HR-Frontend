import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FilesBrowserPageComponent } from '../browser/files-browser-page.component';

@Component({
  selector: 'app-files-resumes-page',
  standalone: true,
  imports: [FilesBrowserPageComponent],
  template: `
    <app-files-browser-page
      lockedCategory="RESUME"
      heading="Resumes"
      subtitle="Candidate resumes attached from recruitment."
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilesResumesPageComponent {}
