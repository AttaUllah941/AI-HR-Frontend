import { LowerCasePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../../core/services/auth.service';
import {
  SettingsPermission,
  SettingsRole,
  SettingsService,
} from '../../../../core/services/settings.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';

@Component({
  selector: 'app-settings-roles-page',
  standalone: true,
  imports: [
    LowerCasePipe,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
    EmptyStateComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './settings-roles-page.component.html',
  styleUrl: './settings-roles-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsRolesPageComponent implements OnInit {
  private readonly settings = inject(SettingsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly roles = signal<SettingsRole[]>([]);
  readonly permissions = signal<SettingsPermission[]>([]);
  readonly selectedRoleId = signal<string | null>(null);
  readonly selectedCodes = signal<Set<string>>(new Set());
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly canManage = this.auth.hasPermission('roles:manage');

  readonly selectedRole = computed(() =>
    this.roles().find((r) => r.id === this.selectedRoleId()) ?? null,
  );

  readonly permissionModules = computed(() => {
    const map = new Map<string, SettingsPermission[]>();
    for (const p of this.permissions()) {
      const list = map.get(p.module) ?? [];
      list.push(p);
      map.set(p.module, list);
    }
    return [...map.entries()].map(([module, items]) => ({ module, items }));
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.settings.listRoles().subscribe({
      next: (rolesRes) => {
        this.roles.set(rolesRes.items);
        this.settings.listPermissions().subscribe({
          next: (permRes) => {
            this.permissions.set(permRes.items);
            if (!this.selectedRoleId() && rolesRes.items.length) {
              this.selectRole(rolesRes.items[0]);
            } else {
              const current = rolesRes.items.find((r) => r.id === this.selectedRoleId());
              if (current) this.selectRole(current);
            }
            this.loading.set(false);
          },
          error: (err: { error?: { message?: string }; message?: string }) => {
            this.error.set(err?.error?.message || err?.message || 'Unable to load permissions.');
            this.loading.set(false);
          },
        });
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load roles.');
        this.loading.set(false);
      },
    });
  }

  selectRole(role: SettingsRole): void {
    this.selectedRoleId.set(role.id);
    this.selectedCodes.set(new Set(role.permissions.map((p) => p.code)));
  }

  isChecked(code: string): boolean {
    return this.selectedCodes().has(code);
  }

  toggle(code: string, checked: boolean): void {
    if (!this.canManage) return;
    const next = new Set(this.selectedCodes());
    if (checked) next.add(code);
    else next.delete(code);
    this.selectedCodes.set(next);
  }

  save(): void {
    const role = this.selectedRole();
    if (!role || !this.canManage || this.saving()) return;
    if (role.code === 'SUPER_ADMIN') {
      this.toast.error('Super Admin permissions cannot be edited.');
      return;
    }
    this.saving.set(true);
    this.settings.updateRolePermissions(role.id, [...this.selectedCodes()]).subscribe({
      next: (updated) => {
        this.roles.update((list) => list.map((r) => (r.id === updated.id ? updated : r)));
        this.selectRole(updated);
        this.toast.success('Role permissions saved.');
        this.saving.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.toast.error(err?.error?.message || err?.message || 'Unable to save permissions.');
        this.saving.set(false);
      },
    });
  }
}
