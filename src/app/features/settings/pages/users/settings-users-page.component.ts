import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { debounceTime, filter, Subscription, tap } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import {
  SettingsRole,
  SettingsService,
  SettingsUser,
} from '../../../../core/services/settings.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationListFooterComponent } from '../../../organization/components/organization-list-footer/organization-list-footer.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { ORG_PAGE_SIZES, type OrgPagerControls } from '../../../organization/utils/org-list';
import {
  UserFormDialogComponent,
  UserFormDialogResult,
} from '../../dialogs/user-form-dialog.component';
import { USER_STATUS_FILTERS, userStatusLabel, userStatusTone } from '../../utils/labels';

type ApiError = { error?: { message?: string }; message?: string };

@Component({
  selector: 'app-settings-users-page',
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
  templateUrl: './settings-users-page.component.html',
  styleUrl: './settings-users-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsUsersPageComponent implements OnInit {
  private inflight: Subscription | null = null;
  private readonly settings = inject(SettingsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);
  private readonly confirm = inject(ConfirmDialogService);

  readonly items = signal<SettingsUser[]>([]);
  readonly roles = signal<SettingsRole[]>([]);
  readonly loading = signal(true);
  /** True once the first load finished, so filtering and paging never swap the page for a skeleton. */
  readonly loaded = signal(false);
  readonly error = signal<string | null>(null);
  readonly total = signal(0);
  readonly page = signal(1);
  readonly pageSize = signal<number>(25);
  readonly totalPages = signal(1);
  readonly generatedPassword = signal<string | null>(null);
  readonly passwordEmailed = signal(false);

  readonly canCreate = this.auth.hasPermission('users:create');
  readonly canUpdate = this.auth.hasPermission('users:update');
  readonly canDelete = this.auth.hasPermission('users:delete');
  readonly canViewRoles = this.auth.hasPermission('roles:view');

  readonly search = new FormControl('', { nonNullable: true });
  readonly status = new FormControl('', { nonNullable: true });
  readonly statusFilters = USER_STATUS_FILTERS;

  private readonly searchText = signal('');
  private readonly statusValue = signal('');
  readonly hasFilters = computed(() => this.searchText().trim() !== '' || this.statusValue() !== '');
  readonly myId = computed(() => this.auth.user()?.id ?? null);

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

  protected readonly statusLabel = userStatusLabel;
  protected readonly statusTone = userStatusTone;

  ngOnInit(): void {
    this.search.valueChanges
      .pipe(
        tap((value) => this.searchText.set(value)),
        debounceTime(300),
      )
      .subscribe(() => this.resetAndReload());
    this.status.valueChanges.subscribe((value) => {
      this.statusValue.set(value);
      this.resetAndReload();
    });
    this.loadRoles();
    this.reload();
  }

  private loadRoles(): void {
    if (!this.canViewRoles) return;
    this.settings.listRoles().subscribe({
      next: (res) => this.roles.set(res.items),
      error: () => undefined,
    });
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.inflight?.unsubscribe();
    this.inflight = this.settings
      .listUsers({
        search: this.search.value.trim() || undefined,
        status: this.status.value || undefined,
        page: this.page(),
        pageSize: this.pageSize(),
      })
      .subscribe({
        next: (res) => {
          const { total, totalPages } = res.pagination;
          // The last user on the last page was deleted: step back instead of showing an empty page.
          if (res.items.length === 0 && total > 0 && this.page() > 1) {
            this.page.set(Math.max(1, totalPages));
            this.reload();
            return;
          }
          this.items.set(res.items);
          this.total.set(total);
          this.totalPages.set(Math.max(1, totalPages));
          this.loading.set(false);
          this.loaded.set(true);
        },
        error: (err: ApiError) => {
          this.error.set(err?.error?.message || err?.message || 'Unable to load users.');
          this.loading.set(false);
        },
      });
  }

  clearFilters(): void {
    this.search.setValue('', { emitEvent: false });
    this.status.setValue('', { emitEvent: false });
    this.searchText.set('');
    this.statusValue.set('');
    this.resetAndReload();
  }

  isSelf(user: SettingsUser): boolean {
    return user.id === this.myId();
  }

  openCreate(): void {
    if (!this.canCreate) return;
    this.dialog
      .open(UserFormDialogComponent, {
        width: '34rem',
        maxHeight: '90vh',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
        data: { mode: 'create', roles: this.roles(), user: null },
      })
      .afterClosed()
      .subscribe((result: UserFormDialogResult) => {
        if (!result) return;
        if (typeof result === 'object' && result.created) {
          this.generatedPassword.set(result.temporaryPassword ?? null);
          this.passwordEmailed.set(Boolean(result.temporaryPasswordEmailed));
          this.reload();
        } else if (result === true) {
          this.reload();
        }
      });
  }

  openEdit(user: SettingsUser): void {
    if (!this.canUpdate) return;
    this.dialog
      .open(UserFormDialogComponent, {
        width: '34rem',
        maxHeight: '90vh',
        autoFocus: 'first-tabbable',
        restoreFocus: true,
        data: { mode: 'edit', roles: this.roles(), user },
      })
      .afterClosed()
      .subscribe((result: UserFormDialogResult) => {
        if (result) this.reload();
      });
  }

  remove(user: SettingsUser): void {
    if (!this.canDelete || this.isSelf(user)) return;
    this.confirm
      .open({
        title: 'Delete user?',
        message: `Delete ${user.firstName} ${user.lastName} (${user.email})? They will no longer be able to sign in.`,
        confirmLabel: 'Delete user',
        destructive: true,
        icon: 'delete_forever',
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.settings.deleteUser(user.id).subscribe({
          next: () => {
            this.toast.success('User deleted.');
            this.reload();
          },
          error: (err: ApiError) => {
            this.toast.error(err?.error?.message || err?.message || 'Unable to delete user.');
          },
        });
      });
  }

  async copyPassword(): Promise<void> {
    const password = this.generatedPassword();
    if (!password) return;
    try {
      await navigator.clipboard.writeText(password);
      this.toast.success('Password copied.');
    } catch {
      this.toast.error('Could not copy. Select the password and copy it manually.');
    }
  }

  fullName(user: SettingsUser): string {
    return `${user.firstName} ${user.lastName}`.trim() || user.email;
  }

  formatDate(iso: string | null | undefined): string {
    return this.settings.formatDateTime(iso);
  }

  dismissPassword(): void {
    this.generatedPassword.set(null);
    this.passwordEmailed.set(false);
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
