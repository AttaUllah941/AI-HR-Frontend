import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
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
  SettingsRole,
  SettingsService,
  SettingsUser,
} from '../../../../core/services/settings.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import {
  UserFormDialogComponent,
  UserFormDialogResult,
} from '../../dialogs/user-form-dialog.component';

@Component({
  selector: 'app-settings-users-page',
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
  templateUrl: './settings-users-page.component.html',
  styleUrl: './settings-users-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsUsersPageComponent implements OnInit {
  private readonly settings = inject(SettingsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly dialog = inject(MatDialog);

  readonly items = signal<SettingsUser[]>([]);
  readonly roles = signal<SettingsRole[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly total = signal(0);
  readonly generatedPassword = signal<string | null>(null);

  readonly canCreate = this.auth.hasPermission('users:create');
  readonly canUpdate = this.auth.hasPermission('users:update');
  readonly canDelete = this.auth.hasPermission('users:delete');
  readonly canViewRoles = this.auth.hasPermission('roles:view');

  readonly search = new FormControl('', { nonNullable: true });
  readonly status = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    this.search.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.reload();
    });
    this.status.valueChanges.subscribe(() => this.reload());
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
    this.settings
      .listUsers({
        search: this.search.value.trim() || undefined,
        status: this.status.value || undefined,
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
          this.error.set(err?.error?.message || err?.message || 'Unable to load users.');
          this.loading.set(false);
        },
      });
  }

  openCreate(): void {
    if (!this.canCreate) return;
    this.dialog
      .open(UserFormDialogComponent, {
        width: '32rem',
        data: { mode: 'create', roles: this.roles(), user: null },
      })
      .afterClosed()
      .subscribe((result: UserFormDialogResult) => {
        if (!result) return;
        if (typeof result === 'object' && result.created) {
          this.generatedPassword.set(result.temporaryPassword ?? null);
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
        width: '32rem',
        data: { mode: 'edit', roles: this.roles(), user },
      })
      .afterClosed()
      .subscribe((result: UserFormDialogResult) => {
        if (result) this.reload();
      });
  }

  remove(user: SettingsUser): void {
    if (!this.canDelete) return;
    if (!confirm(`Delete user ${user.email}?`)) return;
    this.settings.deleteUser(user.id).subscribe({
      next: () => {
        this.toast.success('User deleted.');
        this.reload();
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.toast.error(err?.error?.message || err?.message || 'Unable to delete user.');
      },
    });
  }

  formatDate(iso: string | null | undefined): string {
    return this.settings.formatDateTime(iso);
  }

  dismissPassword(): void {
    this.generatedPassword.set(null);
  }
}
