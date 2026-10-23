import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ProfileService, UserProfile } from '../../../../core/services/profile.service';
import { ToastService } from '../../../../core/services/toast.service';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';

@Component({
  selector: 'app-profile-security-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    OrganizationStatusComponent,
  ],
  templateUrl: './profile-security-page.component.html',
  styleUrl: './profile-security-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileSecurityPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly profile = inject(ProfileService);
  private readonly toast = inject(ToastService);

  readonly profileData = signal<UserProfile | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    currentPassword: ['', [Validators.required]],
    newPassword: ['', [Validators.required, Validators.maxLength(128)]],
    confirmPassword: ['', [Validators.required]],
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.profile.getProfile().subscribe({
      next: (data) => {
        this.profileData.set(data);
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load security details.');
        this.loading.set(false);
      },
    });
  }

  changePassword(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    if (raw.newPassword !== raw.confirmPassword) {
      this.toast.error('New password and confirmation do not match.');
      return;
    }
    this.saving.set(true);
    this.profile
      .changePassword({
        currentPassword: raw.currentPassword,
        newPassword: raw.newPassword,
      })
      .subscribe({
        next: (res) => {
          this.form.reset({
            currentPassword: '',
            newPassword: '',
            confirmPassword: '',
          });
          const revoked =
            typeof res.otherSessionsRevoked === 'number'
              ? res.otherSessionsRevoked
              : res.otherSessionsRevoked
                ? 1
                : 0;
          this.toast.success(
            revoked > 0
              ? `Password changed. Revoked ${revoked} other session${revoked === 1 ? '' : 's'}.`
              : 'Password changed.',
          );
          this.saving.set(false);
          this.reload();
        },
        // The global error interceptor already toasts the server's password-policy message.
        error: () => this.saving.set(false),
      });
  }

  formatDate(iso: string | null | undefined): string {
    return this.profile.formatDateTime(iso);
  }
}
