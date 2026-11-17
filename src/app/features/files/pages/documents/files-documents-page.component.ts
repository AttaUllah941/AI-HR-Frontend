import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FilesBrowserPageComponent } from '../browser/files-browser-page.component';

@Component({
  selector: 'app-files-documents-page',
  standalone: true,
  imports: [FilesBrowserPageComponent],
  templateUrl: './files-documents-page.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilesDocumentsPageComponent {}
