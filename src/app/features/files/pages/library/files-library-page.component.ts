import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FilesBrowserPageComponent } from '../browser/files-browser-page.component';

@Component({
  selector: 'app-files-library-page',
  standalone: true,
  imports: [FilesBrowserPageComponent],
  templateUrl: './files-library-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilesLibraryPageComponent {}
