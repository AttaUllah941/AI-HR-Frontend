import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { debounceTime, distinctUntilChanged } from 'rxjs';
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
    MatProgressSpinnerModule,
    EmptyStateComponent,
    PageHeaderComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './search-page.component.html',
  styleUrl: './search-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SearchPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly global = inject(GlobalService);
  private readonly toast = inject(ToastService);

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
      .pipe(debounceTime(400), distinctUntilChanged())
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

  submit(): void {
    this.applyQueryToUrl();
  }

  runSearch(): void {
    const raw = this.form.getRawValue();
    const q = raw.q.trim();
    if (!q) return;
    this.loading.set(true);
    this.error.set(null);
    this.global
      .search({
        q,
        types: raw.types.length ? raw.types.join(',') : undefined,
        sortBy: raw.sortBy,
        sortDir: raw.sortDir,
        status: raw.status.trim() || undefined,
        category: raw.category.trim() || undefined,
        page: 1,
        pageSize: 30,
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
    this.applyQueryToUrl();
  }

  clearRecent(): void {
    this.global.clearRecent().subscribe({
      next: () => {
        this.recent.set([]);
        this.toast.success('Recent searches cleared.');
      },
      error: () => this.toast.error('Unable to clear recent searches.'),
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
}
