import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { debounceTime, Subscription, tap } from 'rxjs';
import { AuditLogItem, SettingsService } from '../../../../core/services/settings.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationListFooterComponent } from '../../../organization/components/organization-list-footer/organization-list-footer.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { ORG_PAGE_SIZES, type OrgPagerControls } from '../../../organization/utils/org-list';

@Component({
  selector: 'app-settings-audit-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatIconModule,
    EmptyStateComponent,
    OrganizationListFooterComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './settings-audit-page.component.html',
  styleUrl: './settings-audit-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsAuditPageComponent implements OnInit {
  private inflight: Subscription | null = null;
  private readonly settings = inject(SettingsService);

  readonly items = signal<AuditLogItem[]>([]);
  readonly loading = signal(true);
  /** True once the first load finished, so searching and paging never swap the page for a skeleton. */
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal<number>(25);
  readonly totalPages = signal(1);
  readonly search = new FormControl('', { nonNullable: true });
  private readonly searchText = signal('');
  readonly hasFilters = computed(() => this.searchText().trim() !== '');

  /** Server-side paging in the shape the shared footer expects. */
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
    this.search.valueChanges
      .pipe(
        tap((value) => this.searchText.set(value)),
        debounceTime(300),
      )
      .subscribe(() => {
        this.page.set(1);
        this.reload();
      });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.inflight?.unsubscribe();
    this.inflight = this.settings
      .listAuditLogs({
        search: this.search.value.trim() || undefined,
        page: this.page(),
        pageSize: this.pageSize(),
      })
      .subscribe({
        next: (res) => {
          this.items.set(res.items);
          this.total.set(res.pagination.total);
          this.totalPages.set(Math.max(1, res.pagination.totalPages));
          this.loading.set(false);
          this.loaded.set(true);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.error.set(err?.error?.message || err?.message || 'Unable to load audit logs.');
          this.loading.set(false);
        },
      });
  }

  clearSearch(): void {
    this.search.setValue('', { emitEvent: false });
    this.searchText.set('');
    this.page.set(1);
    this.reload();
  }

  formatDate(iso: string | null | undefined): string {
    return this.settings.formatDateTime(iso);
  }

  relative(iso: string | null | undefined): string {
    return this.settings.relativeTime(iso);
  }

  actorLabel(item: AuditLogItem): string {
    if (!item.actor) return 'System';
    return `${item.actor.firstName} ${item.actor.lastName}`.trim() || item.actor.email;
  }

  private goToPage(target: number): void {
    const next = Math.min(Math.max(1, target), this.totalPages());
    if (next === this.page()) return;
    this.page.set(next);
    this.reload();
  }
}
