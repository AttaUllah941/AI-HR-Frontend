import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ProfileService, ProfileSession } from '../../../../core/services/profile.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { ButtonSpinnerDirective } from '../../../../shared/button-spinner/button-spinner.directive';

type ApiError = { error?: { message?: string }; message?: string };

/** Plain words for a session's state. */
export function sessionStatusLabel(status: string): string {
  switch ((status || '').toUpperCase()) {
    case 'ACTIVE':
      return 'Active';
    case 'EXPIRED':
      return 'Expired';
    case 'REVOKED':
      return 'Signed out';
    default:
      return status || '—';
  }
}

@Component({
  selector: 'app-profile-sessions-page',
  standalone: true,
  imports: [
    MatButtonModule,
    MatIconModule,
    MatTooltipModule,
    EmptyStateComponent,
    OrganizationStatusComponent,
    ButtonSpinnerDirective,
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
  /** True once the first load finished, so a revoke keeps the page on screen. */
  readonly loaded = signal(false);
  readonly revokingOthers = signal(false);
  readonly revokingId = signal<string | null>(null);
  readonly error = signal<string | null>(null);

  /** This device first, then the other active ones, then ended sessions, newest first within each. */
  readonly sessions = computed(() => {
    const rank = (s: ProfileSession) => (s.current ? 0 : s.active ? 1 : 2);
    return [...this.items()].sort(
      (a, b) => rank(a) - rank(b) || b.createdAt.localeCompare(a.createdAt),
    );
  });
  /** Other devices that are still signed in; the "sign out others" action only makes sense for them. */
  readonly otherActive = computed(() => this.items().filter((s) => !s.current && s.active).length);

  protected readonly statusLabel = sessionStatusLabel;

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
        this.loaded.set(true);
      },
      error: (err: ApiError) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load sessions.');
        this.loading.set(false);
      },
    });
  }

  revokeSession(session: ProfileSession): void {
    if (session.current) {
      this.toast.error('Use sign out to end the session on this device.');
      return;
    }
    this.confirm
      .open({
        title: 'Sign out this device?',
        message: `${session.deviceLabel || 'That device'} will be signed out and will need to sign in again.`,
        confirmLabel: 'Sign out device',
        destructive: true,
        icon: 'logout',
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.revokingId.set(session.id);
        this.profile.revokeSession(session.id).subscribe({
          next: () => {
            this.revokingId.set(null);
            this.toast.success('Device signed out.');
            this.reload();
          },
          error: (err: ApiError) => {
            this.revokingId.set(null);
            this.toast.error(err?.error?.message || err?.message || 'Unable to sign out that device.');
          },
        });
      });
  }

  revokeOthers(): void {
    if (this.otherActive() === 0) {
      return;
    }
    this.confirm
      .open({
        title: 'Sign out your other devices?',
        message: `${this.otherActive() === 1 ? '1 other device' : `${this.otherActive()} other devices`} will be signed out. This device stays signed in.`,
        confirmLabel: 'Sign out others',
        destructive: true,
        icon: 'logout',
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.revokingOthers.set(true);
        this.profile.revokeOtherSessions().subscribe({
          next: (res) => {
            this.toast.success(
              res.revoked > 0
                ? `Signed out ${res.revoked} other device${res.revoked === 1 ? '' : 's'}.`
                : 'No other devices were signed in.',
            );
            this.revokingOthers.set(false);
            this.reload();
          },
          error: (err: ApiError) => {
            this.toast.error(err?.error?.message || err?.message || 'Unable to sign out other devices.');
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
