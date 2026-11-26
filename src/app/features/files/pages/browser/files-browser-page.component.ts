import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  OnInit,
  computed,
  inject,
  input,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { Subscription, debounceTime, filter, tap } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import {
  FILE_CATEGORIES,
  FILE_CATEGORY_LABELS,
  FileCategory,
  FilesService,
  StoredFileItem,
} from '../../../../core/services/files.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { downloadBlob } from '../../../../shared/utils/download-blob';
import { OrganizationListFooterComponent } from '../../../organization/components/organization-list-footer/organization-list-footer.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { ORG_PAGE_SIZES, type OrgPagerControls } from '../../../organization/utils/org-list';
import { UploadFileDialogComponent } from '../../dialogs/upload-file-dialog.component';

type ApiError = { error?: { message?: string }; message?: string };

/** Material icon that best matches a stored file's type. */
export function fileIcon(mimeType: string): string {
  const mime = (mimeType || '').toLowerCase();
  if (mime === 'application/pdf') return 'picture_as_pdf';
  if (mime.startsWith('image/')) return 'image';
  if (mime.includes('spreadsheet') || mime.includes('excel') || mime === 'text/csv') return 'table_chart';
  if (mime.includes('word') || mime.startsWith('text/')) return 'description';
  if (mime.includes('zip')) return 'folder_zip';
  return 'insert_drive_file';
}

@Component({
  selector: 'app-files-browser-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatIconModule,
    EmptyStateComponent,
    OrganizationListFooterComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './files-browser-page.component.html',
  styleUrl: './files-browser-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class FilesBrowserPageComponent implements OnInit {
  private inflight: Subscription | null = null;
  private readonly destroyRef = inject(DestroyRef);
  private readonly filesApi = inject(FilesService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly confirm = inject(ConfirmDialogService);

  /** When set, locks the category filter (documents / resumes pages). */
  readonly lockedCategory = input<FileCategory | null>(null);
  readonly heading = input('Library');
  readonly subtitle = input('Browse and manage stored files.');
  /** Plural noun for the empty states and the pager, e.g. "resumes". */
  readonly noun = input('files');

  readonly items = signal<StoredFileItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal<number>(25);
  readonly totalPages = signal(1);
  /** File whose download or preview is in flight (its row buttons are disabled meanwhile). */
  readonly busyId = signal<string | null>(null);
  readonly deletingId = signal<string | null>(null);

  readonly canCreate = this.auth.hasPermission('files:create');
  readonly canDelete = this.auth.hasPermission('files:delete');
  readonly categories = FILE_CATEGORIES;
  readonly categoryLabels = FILE_CATEGORY_LABELS;
  readonly search = new FormControl('', { nonNullable: true });
  readonly category = new FormControl('', { nonNullable: true });

  private readonly searchText = signal('');
  private readonly categoryValue = signal('');
  /** True while the list is narrowed by something the user typed or picked (a locked category does not count). */
  readonly hasFilters = computed(
    () => this.searchText().trim() !== '' || (!this.lockedCategory() && this.categoryValue() !== ''),
  );

  /** Server-side paging, exposed in the shape the shared footer expects. */
  readonly pager: OrgPagerControls = {
    total: this.total,
    currentPage: this.page,
    totalPages: this.totalPages,
    pageSize: this.pageSize,
    rangeStart: computed(() => (this.total() === 0 ? 0 : (this.page() - 1) * this.pageSize() + 1)),
    rangeEnd: computed(() => Math.min(this.page() * this.pageSize(), this.total())),
    setPageSize: (value) => {
      const size = Number(value);
      if (!(ORG_PAGE_SIZES as readonly number[]).includes(size)) return;
      this.pageSize.set(size);
      this.page.set(1);
      this.reload();
    },
    prevPage: () => this.goToPage(this.page() - 1),
    nextPage: () => this.goToPage(this.page() + 1),
  };

  ngOnInit(): void {
    const locked = this.lockedCategory();
    if (locked) {
      this.category.setValue(locked);
      this.category.disable();
    }
    this.search.valueChanges
      .pipe(
        tap((value) => this.searchText.set(value)),
        debounceTime(300),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(() => this.resetAndReload());
    this.category.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      this.categoryValue.set(value);
      this.resetAndReload();
    });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    const locked = this.lockedCategory();
    this.inflight?.unsubscribe();
    this.inflight = this.filesApi
      .list({
        search: this.search.value.trim() || undefined,
        category: locked || this.category.value || undefined,
        page: this.page(),
        pageSize: this.pageSize(),
      })
      .subscribe({
        next: (res) => {
          const { total, totalPages } = res.pagination;
          // The last file of the last page was deleted: step back instead of showing an empty page.
          if (res.items.length === 0 && total > 0 && this.page() > 1) {
            this.page.set(Math.max(1, totalPages));
            this.reload();
            return;
          }
          this.items.set(res.items);
          this.total.set(total);
          this.totalPages.set(Math.max(1, totalPages));
          this.loading.set(false);
        },
        error: (err: ApiError) => {
          this.error.set(err?.error?.message || err?.message || 'Unable to load files.');
          this.loading.set(false);
        },
      });
  }

  clearFilters(): void {
    // Quietly, then reload once instead of once per control.
    this.search.setValue('', { emitEvent: false });
    this.searchText.set('');
    if (!this.lockedCategory()) {
      this.category.setValue('', { emitEvent: false });
      this.categoryValue.set('');
    }
    this.resetAndReload();
  }

  openUpload(): void {
    if (!this.canCreate) return;
    this.dialog
      .open(UploadFileDialogComponent, {
        width: '34rem',
        maxHeight: '90vh',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
        data: { defaultCategory: this.lockedCategory() ?? 'GENERAL' },
      })
      .afterClosed()
      .subscribe((ok) => {
        if (ok) this.reload();
      });
  }

  download(file: StoredFileItem): void {
    if (this.busyId()) return;
    this.busyId.set(file.id);
    this.filesApi.downloadBlob(file.id).subscribe({
      next: (blob) => {
        downloadBlob(blob, file.originalName);
        this.busyId.set(null);
      },
      error: () => {
        this.busyId.set(null);
        this.toast.error('Download failed.');
      },
    });
  }

  preview(file: StoredFileItem): void {
    if (!file.previewable) {
      this.toast.error('Preview is not available for this file type.');
      return;
    }
    if (this.busyId()) return;
    // Open the tab inside the click so pop-up blockers allow it, then point it at the file once loaded.
    const tab = window.open('', '_blank');
    if (!tab) {
      this.toast.error('Allow pop-ups for this site to preview files.');
      return;
    }
    tab.opener = null;
    this.busyId.set(file.id);
    this.filesApi.previewBlob(file.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        tab.location.href = url;
        setTimeout(() => URL.revokeObjectURL(url), 60_000);
        this.busyId.set(null);
      },
      error: () => {
        tab.close();
        this.busyId.set(null);
        this.toast.error('Preview failed.');
      },
    });
  }

  remove(file: StoredFileItem): void {
    if (!this.canDelete) return;
    this.confirm
      .open({
        title: 'Delete file?',
        message: `Delete “${file.title || file.originalName}”? The file will be removed from storage.`,
        confirmLabel: 'Delete',
        destructive: true,
        icon: 'delete_forever',
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.deletingId.set(file.id);
        this.filesApi.remove(file.id).subscribe({
          next: () => {
            this.deletingId.set(null);
            this.toast.success('File deleted.');
            this.reload();
          },
          error: (err: ApiError) => {
            this.deletingId.set(null);
            this.toast.error(err?.error?.message || err?.message || 'Unable to delete file.');
          },
        });
      });
  }

  categoryLabel(category: string): string {
    return this.categoryLabels[category as FileCategory] ?? category;
  }

  icon(file: StoredFileItem): string {
    return fileIcon(file.mimeType);
  }

  formatBytes(n: number): string {
    return this.filesApi.formatBytes(n);
  }

  formatDate(iso: string): string {
    return this.filesApi.formatDateTime(iso);
  }

  private resetAndReload(): void {
    this.page.set(1);
    this.reload();
  }

  private goToPage(target: number): void {
    const next = Math.min(Math.max(1, target), this.totalPages());
    if (next === this.page()) return;
    this.page.set(next);
    this.reload();
  }
}
