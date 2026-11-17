import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FilesBrowserPageComponent } from '../browser/files-browser-page.component';

@Component({
  selector: 'app-files-resumes-page',
  standalone: true,
  imports: [FilesBrowserPageComponent],
  templateUrl: './files-resumes-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilesResumesPageComponent {}
