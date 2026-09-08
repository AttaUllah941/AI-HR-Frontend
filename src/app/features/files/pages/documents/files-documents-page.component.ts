import { ChangeDetectionStrategy, Component } from '@angular/core';
import { FilesBrowserPageComponent } from '../browser/files-browser-page.component';

@Component({
  selector: 'app-files-documents-page',
  standalone: true,
  imports: [FilesBrowserPageComponent],
  template: `
    <app-files-browser-page
      lockedCategory="EMPLOYEE_DOCUMENT"
      heading="Employee documents"
      subtitle="HR documents linked to employee records."
    />
  `,
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilesDocumentsPageComponent {}
