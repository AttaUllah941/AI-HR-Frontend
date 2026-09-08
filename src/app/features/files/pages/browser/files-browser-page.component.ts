import { ChangeDetectionStrategy, Component, OnInit, inject, input, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import {
  FILE_CATEGORIES,
  FileCategory,
  FilesService,
  StoredFileItem,
} from '../../../../core/services/files.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { UploadFileDialogComponent } from '../../dialogs/upload-file-dialog.component';

@Component({
  selector: 'app-files-browser-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    EmptyStateComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './files-browser-page.component.html',
  styleUrl: './files-browser-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilesBrowserPageComponent implements OnInit {
  private readonly filesApi = inject(FilesService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  /** When set, locks the category filter (documents / resumes pages). */
  readonly lockedCategory = input<FileCategory | null>(null);
  readonly heading = input('Library');
  readonly subtitle = input('Browse and manage stored files.');

  readonly items = signal<StoredFileItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly total = signal(0);

  readonly canCreate = this.auth.hasPermission('files:create');
  readonly canDelete = this.auth.hasPermission('files:delete');
  readonly categories = FILE_CATEGORIES;

  readonly search = new FormControl('', { nonNullable: true });
  readonly category = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    const locked = this.lockedCategory();
    if (locked) {
      this.category.setValue(locked);
      this.category.disable();
    }
    this.search.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.reload();
    });
    this.category.valueChanges.subscribe(() => this.reload());
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const locked = this.lockedCategory();
    this.filesApi
      .list({
        search: this.search.value.trim() || undefined,
        category: locked || this.category.value || undefined,
        page: 1,
        pageSize: 50,
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.total.set(res.pagination.total);
          this.loading.set(false);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.error.set(err?.error?.message || err?.message || 'Unable to load files.');
          this.loading.set(false);
        },
      });
  }

  openUpload(): void {
    if (!this.canCreate) return;
    this.dialog
      .open(UploadFileDialogComponent, {
        width: '34rem',
        data: { defaultCategory: this.lockedCategory() ?? 'GENERAL' },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) this.reload();
      });
  }

  download(file: StoredFileItem): void {
    this.filesApi.downloadBlob(file.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = file.originalName;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.toast.error('Download failed.'),
    });
  }

  preview(file: StoredFileItem): void {
    if (!file.previewable) {
      this.toast.error('Preview is not available for this file type.');
      return;
    }
    this.filesApi.previewBlob(file.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener');
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
      },
      error: () => this.toast.error('Preview failed.'),
    });
  }

  remove(file: StoredFileItem): void {
    if (!this.canDelete) return;
    if (!confirm(`Delete ${file.originalName}?`)) return;
    this.filesApi.remove(file.id).subscribe({
      next: () => {
        this.toast.success('File deleted.');
        this.reload();
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.toast.error(err?.error?.message || err?.message || 'Unable to delete file.');
      },
    });
  }

  formatBytes(n: number): string {
    return this.filesApi.formatBytes(n);
  }

  formatDate(iso: string): string {
    return this.filesApi.formatDateTime(iso);
  }
}
