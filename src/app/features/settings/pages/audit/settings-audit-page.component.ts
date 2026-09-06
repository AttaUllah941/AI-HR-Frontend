import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { debounceTime, distinctUntilChanged } from 'rxjs';
import { AuditLogItem, SettingsService } from '../../../../core/services/settings.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';

@Component({
  selector: 'app-settings-audit-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    EmptyStateComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './settings-audit-page.component.html',
  styleUrl: './settings-audit-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsAuditPageComponent implements OnInit {
  private readonly settings = inject(SettingsService);

  readonly items = signal<AuditLogItem[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly total = signal(0);

  readonly search = new FormControl('', { nonNullable: true });

  ngOnInit(): void {
    this.search.valueChanges.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => {
      this.reload();
    });
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.settings
      .listAuditLogs({
        search: this.search.value.trim() || undefined,
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
          this.error.set(err?.error?.message || err?.message || 'Unable to load audit logs.');
          this.loading.set(false);
        },
      });
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
}
