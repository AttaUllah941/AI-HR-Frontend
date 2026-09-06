import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FilesBrowserPageComponent } from '../browser/files-browser-page.component';

@Component({
  selector: 'app-files-library-page',
  standalone: true,
  imports: [FilesBrowserPageComponent],
  template: `
    <app-files-browser-page
      heading="Library"
      subtitle="All company files with secure download and preview."
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilesLibraryPageComponent {}
