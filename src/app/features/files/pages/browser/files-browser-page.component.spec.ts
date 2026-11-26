import { TestBed } from '@angular/core/testing';
import { Observable, Subject, of } from 'rxjs';
import { describe, expect, it } from 'vitest';
import { AuthService } from '../../../../core/services/auth.service';
import { FilesListResult, FilesService, StoredFileItem } from '../../../../core/services/files.service';
import { FilesBrowserPageComponent, fileIcon } from './files-browser-page.component';

const FILE = {
  id: 'f1',
  category: 'GENERAL',
  originalName: 'handbook.pdf',
  title: 'Employee handbook',
  mimeType: 'application/pdf',
  sizeBytes: 2048,
  previewable: true,
  createdAt: '2026-01-02T03:04:05.000Z',
} as unknown as StoredFileItem;

function result(items: StoredFileItem[], page = 1, total = items.length): FilesListResult {
  return { items, pagination: { page, pageSize: 25, total, totalPages: Math.max(1, Math.ceil(total / 25)) } };
}

function setup(responses: Array<Observable<FilesListResult>>) {
  const calls: Array<Record<string, unknown>> = [];
  TestBed.configureTestingModule({
    providers: [
      { provide: AuthService, useValue: { hasPermission: () => true } },
      {
        provide: FilesService,
        useValue: {
          list: (params: Record<string, unknown>) => {
            calls.push(params);
            return responses[Math.min(calls.length - 1, responses.length - 1)];
          },
          formatBytes: (n: number) => `${n} B`,
          formatDateTime: () => 'Jan 2, 2026',
        },
      },
    ],
  });
  const fixture = TestBed.createComponent(FilesBrowserPageComponent);
  document.body.appendChild(fixture.nativeElement);
  fixture.detectChanges();
  return { fixture, el: fixture.nativeElement as HTMLElement, calls };
}

describe('fileIcon', () => {
  it('picks an icon by file type', () => {
    expect(fileIcon('application/pdf')).toBe('picture_as_pdf');
    expect(fileIcon('image/png')).toBe('image');
    expect(fileIcon('text/csv')).toBe('table_chart');
    expect(fileIcon('application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')).toBe('table_chart');
    expect(fileIcon('application/msword')).toBe('description');
    expect(fileIcon('application/zip')).toBe('folder_zip');
    expect(fileIcon('application/octet-stream')).toBe('insert_drive_file');
  });
});

describe('FilesBrowserPageComponent', () => {
  it('keeps the search box in the DOM while results reload', async () => {
    const second = new Subject<FilesListResult>();
    const { fixture, el, calls } = setup([of(result([FILE])), second]);

    const input = el.querySelector<HTMLInputElement>('input[type="search"]')!;
    expect(input).toBeTruthy();
    expect(el.textContent).toContain('Employee handbook');

    fixture.componentInstance.search.setValue('hand');
    await new Promise((resolve) => setTimeout(resolve, 350));
    fixture.detectChanges();

    expect(calls.length).toBe(2);
    expect(calls[1]['search']).toBe('hand');
    expect(el.querySelector('input[type="search"]')).toBe(input);
    expect(el.textContent).toContain('Employee handbook');

    second.next(result([]));
    second.complete();
    fixture.detectChanges();
    expect(el.textContent).toContain('No matching files');
  });

  it('offers an upload action when there are no files and nothing is filtered', () => {
    const { el } = setup([of(result([]))]);
    expect(el.textContent).toContain('No files yet');
    expect(el.textContent).toContain('Upload a file');
  });

  it('asks the server for the next page', () => {
    const { fixture, calls } = setup([of(result([FILE], 1, 30))]);
    fixture.componentInstance.pager.nextPage();
    expect(calls[1]['page']).toBe(2);
  });
});
