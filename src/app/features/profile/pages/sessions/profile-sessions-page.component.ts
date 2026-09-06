import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ProfileService, ProfileSession } from '../../../../core/services/profile.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';

@Component({
  selector: 'app-profile-sessions-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    EmptyStateComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './profile-sessions-page.component.html',
  styleUrl: './profile-sessions-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSessionsPageComponent implements OnInit {
  private readonly profile = inject(ProfileService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly items = signal<ProfileSession[]>([]);
  readonly loading = signal(true);
  readonly revokingOthers = signal(false);
  readonly error = signal<string | null>(null);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.profile.listSessions().subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load sessions.');
        this.loading.set(false);
      },
    });
  }

  revokeSession(session: ProfileSession): void {
    if (session.current) {
      this.toast.error('Use logout to end the current session.');
      return;
    }
    this.confirm
      .open({
        title: 'Revoke session?',
        message: `This will sign out ${session.deviceLabel || 'that device'}.`,
        confirmLabel: 'Revoke',
        destructive: true,
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.profile.revokeSession(session.id).subscribe({
          next: () => {
            this.toast.success('Session revoked.');
            this.reload();
          },
          error: (err: { error?: { message?: string }; message?: string }) => {
            this.toast.error(err?.error?.message || err?.message || 'Unable to revoke session.');
          },
        });
      });
  }

  revokeOthers(): void {
    this.confirm
      .open({
        title: 'Revoke other sessions?',
        message: 'All sessions except this device will be signed out.',
        confirmLabel: 'Revoke others',
        destructive: true,
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.revokingOthers.set(true);
        this.profile.revokeOtherSessions().subscribe({
          next: (res) => {
            this.toast.success(
              res.revoked > 0
                ? `Revoked ${res.revoked} other session${res.revoked === 1 ? '' : 's'}.`
                : 'No other sessions to revoke.',
            );
            this.revokingOthers.set(false);
            this.reload();
          },
          error: (err: { error?: { message?: string }; message?: string }) => {
            this.toast.error(
              err?.error?.message || err?.message || 'Unable to revoke other sessions.',
            );
            this.revokingOthers.set(false);
          },
        });
      });
  }

  statusTone(status: string): 'success' | 'pending' | 'info' | 'error' {
    return this.profile.statusTone(status);
  }

  formatDate(iso: string | null | undefined): string {
    return this.profile.formatDateTime(iso);
  }
}
