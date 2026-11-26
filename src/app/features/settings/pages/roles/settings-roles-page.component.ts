import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { forkJoin } from 'rxjs';
import {
  SettingsPermission,
  SettingsRole,
  SettingsService,
} from '../../../../core/services/settings.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';

/** Order actions the way people read them: look, change, remove, then the special ones. */
const ACTION_ORDER = ['view', 'create', 'update', 'delete', 'approve', 'export', 'manage'];

@Component({
  selector: 'app-settings-roles-page',
  standalone: true,
  imports: [MatIconModule, EmptyStateComponent, OrganizationStatusComponent],
  templateUrl: './settings-roles-page.component.html',
  styleUrl: './settings-roles-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsRolesPageComponent implements OnInit {
  private readonly settings = inject(SettingsService);

  readonly roles = signal<SettingsRole[]>([]);
  readonly permissions = signal<SettingsPermission[]>([]);
  readonly selectedRoleId = signal<string | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly selectedRole = computed(() => this.roles().find((r) => r.id === this.selectedRoleId()) ?? null);
  private readonly grantedCodes = computed(
    () => new Set(this.selectedRole()?.permissions.map((p) => p.code) ?? []),
  );

  /** Every module with each of its actions, marked granted or not for the selected role. */
  readonly modules = computed(() => {
    const granted = this.grantedCodes();
    const byModule = new Map<string, Array<{ id: string; action: string; granted: boolean }>>();
    for (const p of this.permissions()) {
      const list = byModule.get(p.module) ?? [];
      list.push({ id: p.id, action: p.action.toLowerCase(), granted: granted.has(p.code) });
      byModule.set(p.module, list);
    }
    return [...byModule.entries()]
      .map(([module, actions]) => ({
        module,
        label: this.moduleLabel(module),
        actions: actions.sort((a, b) => this.rank(a.action) - this.rank(b.action)),
        grantedCount: actions.filter((a) => a.granted).length,
      }))
      .sort((a, b) => a.label.localeCompare(b.label));
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    forkJoin({ roles: this.settings.listRoles(), permissions: this.settings.listPermissions() }).subscribe({
      next: ({ roles, permissions }) => {
        this.roles.set(roles.items);
        this.permissions.set(permissions.items);
        const current = this.selectedRoleId();
        if (!current || !roles.items.some((r) => r.id === current)) {
          this.selectedRoleId.set(roles.items[0]?.id ?? null);
        }
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load roles.');
        this.loading.set(false);
      },
    });
  }

  selectRole(role: SettingsRole): void {
    this.selectedRoleId.set(role.id);
  }

  moduleLabel(module: string): string {
    return module.replace(/[_-]/g, ' ').replace(/^\w/, (c) => c.toUpperCase());
  }

  private rank(action: string): number {
    const i = ACTION_ORDER.indexOf(action);
    return i === -1 ? ACTION_ORDER.length : i;
  }
}
