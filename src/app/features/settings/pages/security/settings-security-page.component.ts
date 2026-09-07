import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../../core/services/auth.service';
import {
  LoginAttemptItem,
  SecurityReviewCheck,
  SecurityService,
  SecurityStatus,
} from '../../../../core/services/security.service';
import { ToastService } from '../../../../core/services/toast.service';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';

@Component({
  selector: 'app-settings-security-page',
  standalone: true,
  imports: [
    DatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    OrganizationStatusComponent,
  ],
  templateUrl: './settings-security-page.component.html',
  styleUrl: './settings-security-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsSecurityPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly security = inject(SecurityService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly status = signal<SecurityStatus | null>(null);
  readonly checks = signal<SecurityReviewCheck[]>([]);
  readonly attempts = signal<LoginAttemptItem[]>([]);
  readonly canUpdate = this.auth.hasPermission('settings:update');

  readonly form = this.fb.nonNullable.group({
    maxFailedLogins: [5, [Validators.required, Validators.min(1), Validators.max(50)]],
    lockoutMinutes: [15, [Validators.required, Validators.min(1), Validators.max(1440)]],
    passwordMinLength: [8, [Validators.required, Validators.min(8), Validators.max(128)]],
    passwordRequireLetter: [true],
    passwordRequireNumber: [true],
    passwordRequireSpecial: [false],
    requireMfaForPrivileged: [false],
    allowSelfRegistration: [true],
    refreshRateLimitPerWindow: [60, [Validators.required, Validators.min(5)]],
    ipAllowlistText: [''],
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.security.getStatus().subscribe({
      next: (status) => {
        this.status.set(status);
        const p = status.policy;
        this.form.reset({
          maxFailedLogins: p.maxFailedLogins,
          lockoutMinutes: p.lockoutMinutes,
          passwordMinLength: p.passwordMinLength,
          passwordRequireLetter: p.passwordRequireLetter,
          passwordRequireNumber: p.passwordRequireNumber,
          passwordRequireSpecial: p.passwordRequireSpecial,
          requireMfaForPrivileged: p.requireMfaForPrivileged,
          allowSelfRegistration: p.allowSelfRegistration,
          refreshRateLimitPerWindow: p.refreshRateLimitPerWindow,
          ipAllowlistText: (p.ipAllowlist ?? []).join('\n'),
        });
        if (!this.canUpdate) this.form.disable();
        this.security.getReview().subscribe({
          next: (review) => this.checks.set(review.checks),
          error: () => this.checks.set([]),
        });
        this.security.listLoginAttempts({ page: 1, pageSize: 20 }).subscribe({
          next: (res) => this.attempts.set(res.items),
          error: () => this.attempts.set([]),
        });
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load security settings.');
        this.loading.set(false);
      },
    });
  }

  save(): void {
    if (!this.canUpdate || this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const ipAllowlist = raw.ipAllowlistText
      .split(/[\n,]+/)
      .map((s) => s.trim())
      .filter(Boolean);

    this.security
      .updatePolicy({
        maxFailedLogins: raw.maxFailedLogins,
        lockoutMinutes: raw.lockoutMinutes,
        passwordMinLength: raw.passwordMinLength,
        passwordRequireLetter: raw.passwordRequireLetter,
        passwordRequireNumber: raw.passwordRequireNumber,
        passwordRequireSpecial: raw.passwordRequireSpecial,
        requireMfaForPrivileged: raw.requireMfaForPrivileged,
        allowSelfRegistration: raw.allowSelfRegistration,
        refreshRateLimitPerWindow: raw.refreshRateLimitPerWindow,
        ipAllowlist,
      })
      .subscribe({
        next: () => {
          this.toast.success('Security policy saved.');
          this.saving.set(false);
          this.reload();
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.toast.error(err?.error?.message || err?.message || 'Unable to save policy.');
          this.saving.set(false);
        },
      });
  }
}
