import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime, distinctUntilChanged, filter, Subscription } from 'rxjs';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import {
  GlobalSearchHit,
  GlobalSearchResult,
  GlobalService,
  RecentSearchItem,
  SearchBookmark,
} from '../../../../core/services/global.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { PageHeaderComponent } from '../../../../shared/components/page-header/page-header.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';

const TYPE_LABELS: Record<string, string> = {
  employees: 'Employees',
  departments: 'Departments',
  branches: 'Branches',
  candidates: 'Candidates',
  jobs: 'Jobs',
  files: 'Files',
  users: 'Users',
};

@Component({
  selector: 'app-search-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    EmptyStateComponent,
    PageHeaderComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './search-page.component.html',
  styleUrl: './search-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchPageComponent implements OnInit {
  private inflight: Subscription | null = null;
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly global = inject(GlobalService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly result = signal<GlobalSearchResult | null>(null);
  readonly recent = signal<RecentSearchItem[]>([]);
  readonly bookmarks = signal<SearchBookmark[]>([]);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    q: [''],
    types: [[] as string[]],
    sortBy: ['relevance' as 'relevance' | 'title' | 'updatedAt' | 'type'],
    sortDir: ['desc' as 'asc' | 'desc'],
    status: [''],
    category: [''],
  });

  readonly typeOptions = [
    { value: 'employees', label: 'Employees' },
    { value: 'departments', label: 'Departments' },
    { value: 'branches', label: 'Branches' },
    { value: 'candidates', label: 'Candidates' },
    { value: 'jobs', label: 'Jobs' },
    { value: 'files', label: 'Files' },
    { value: 'users', label: 'Users' },
  ];

  readonly statusOptions = [
    { value: '', label: 'Any status' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'DRAFT', label: 'Draft' },
    { value: 'ON_LEAVE', label: 'On leave' },
    { value: 'PROBATION', label: 'Probation' },
    { value: 'NOTICE_PERIOD', label: 'Notice period' },
    { value: 'TERMINATED', label: 'Terminated' },
    { value: 'RESIGNED', label: 'Resigned' },
    { value: 'INACTIVE', label: 'Inactive' },
  ];

  readonly categoryOptions = [
    { value: '', label: 'Any category' },
    { value: 'GENERAL', label: 'General' },
    { value: 'EMPLOYEE_DOCUMENT', label: 'Employee document' },
    { value: 'RESUME', label: 'Resume' },
    { value: 'AVATAR', label: 'Avatar' },
    { value: 'POLICY', label: 'Policy' },
    { value: 'OTHER', label: 'Other' },
  ];

  ngOnInit(): void {
    this.loadSidePanels();
    this.route.queryParamMap.subscribe((params) => {
      const q = params.get('q') ?? '';
      const types = (params.get('types') ?? '')
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      this.form.patchValue(
        {
          q,
          types,
          sortBy: (params.get('sortBy') as typeof this.form.value.sortBy) || 'relevance',
          sortDir: (params.get('sortDir') as typeof this.form.value.sortDir) || 'desc',
          status: params.get('status') ?? '',
          category: params.get('category') ?? '',
        },
        { emitEvent: false },
      );
      if (q.trim()) {
        this.runSearch();
      } else {
        this.result.set(null);
      }
    });

    this.form.controls.q.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe((q) => {
        if (q.trim().length >= 2) {
          this.applyQueryToUrl();
        }
      });
  }

  private loadSidePanels(): void {
    this.global.listRecent().subscribe({
      next: (res) => this.recent.set(res.items),
      error: () => this.recent.set([]),
    });
    this.global.listBookmarks().subscribe({
      next: (res) => this.bookmarks.set(res.items),
      error: () => this.bookmarks.set([]),
    });
  }

  applyQueryToUrl(): void {
    const raw = this.form.getRawValue();
    void this.router.navigate(['/search'], {
      queryParams: {
        q: raw.q.trim() || null,
        types: raw.types.length ? raw.types.join(',') : null,
        sortBy: raw.sortBy !== 'relevance' ? raw.sortBy : null,
        sortDir: raw.sortDir !== 'desc' ? raw.sortDir : null,
        status: raw.status.trim() || null,
        category: raw.category.trim() || null,
      },
    });
  }

  /** True when the next search was asked for on purpose, so it is worth remembering. */
  private explicitSearch = false;

  submit(): void {
    this.explicitSearch = true;
    this.applyQueryToUrl();
  }

  runSearch(): void {
    const raw = this.form.getRawValue();
    const q = raw.q.trim();
    if (!q) return;
    const save = this.explicitSearch;
    this.explicitSearch = false;
    this.loading.set(true);
    this.error.set(null);
    this.inflight?.unsubscribe();
    this.inflight = this.global
      .search({
        q,
        types: raw.types.length ? raw.types.join(',') : undefined,
        sortBy: raw.sortBy,
        sortDir: raw.sortDir,
        status: raw.status.trim() || undefined,
        category: raw.category.trim() || undefined,
        page: 1,
        pageSize: 30,
        saveRecent: save,
      })
      .subscribe({
        next: (data) => {
          this.result.set(data);
          this.loading.set(false);
          this.loadSidePanels();
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.error.set(err?.error?.message || err?.message || 'Search failed.');
          this.loading.set(false);
        },
      });
  }

  useRecent(item: RecentSearchItem): void {
    this.form.patchValue({
      q: item.query,
      types: item.types ?? [],
    });
    this.explicitSearch = true;
    this.applyQueryToUrl();
  }

  clearRecent(): void {
    this.confirm
      .open({
        title: 'Clear recent searches?',
        message: 'This removes your recent search history for this account.',
        confirmLabel: 'Clear',
        destructive: true,
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.global.clearRecent().subscribe({
          next: () => {
            this.recent.set([]);
            this.toast.success('Recent searches cleared.');
          },
          error: () => this.toast.error('Unable to clear recent searches.'),
        });
      });
  }

  removeRecent(id: string, event: Event): void {
    event.stopPropagation();
    this.global.deleteRecent(id).subscribe({
      next: () => {
        this.recent.update((list) => list.filter((item) => item.id !== id));
      },
      error: () => this.toast.error('Unable to remove recent search.'),
    });
  }

  bookmarkHit(hit: GlobalSearchHit): void {
    this.global
      .createBookmark({
        title: hit.title,
        route: hit.route,
        entityType: hit.type,
        entityId: hit.id,
        query: this.form.controls.q.value,
        icon: hit.icon,
      })
      .subscribe({
        next: () => {
          this.toast.success('Bookmarked.');
          this.loadSidePanels();
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.toast.error(err?.error?.message || err?.message || 'Unable to bookmark.');
        },
      });
  }

  removeBookmark(id: string): void {
    this.global.deleteBookmark(id).subscribe({
      next: () => {
        this.bookmarks.update((list) => list.filter((b) => b.id !== id));
        this.toast.success('Bookmark removed.');
      },
      error: () => this.toast.error('Unable to remove bookmark.'),
    });
  }

  toggleType(value: string, checked: boolean): void {
    const current = [...this.form.controls.types.value];
    if (checked && !current.includes(value)) current.push(value);
    if (!checked) {
      const idx = current.indexOf(value);
      if (idx >= 0) current.splice(idx, 1);
    }
    this.form.controls.types.setValue(current);
  }

  isTypeChecked(value: string): boolean {
    return this.form.controls.types.value.includes(value);
  }

  typeLabel(type: string): string {
    return TYPE_LABELS[type] ?? type;
  }
}
