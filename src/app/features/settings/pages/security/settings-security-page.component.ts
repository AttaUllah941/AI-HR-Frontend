import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { debounceTime, distinctUntilChanged, filter } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import {
  LoginAttemptItem,
  SecurityReview,
  SecurityReviewCheck,
  SecurityService,
  SecurityStatus,
} from '../../../../core/services/security.service';
import { ToastService } from '../../../../core/services/toast.service';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { ButtonSpinnerDirective } from '../../../../shared/button-spinner/button-spinner.directive';
import { HasUnsavedChanges } from '../../../../core/guards/unsaved-changes.guard';
import { AppDatePipe } from '../../../../shared/pipes/app-date.pipe';
import { ipListValidator, parseIpList } from '../../../../shared/forms/validators';

type ApiError = { error?: { message?: string }; message?: string };

@Component({
  selector: 'app-settings-security-page',
  standalone: true,
  imports: [
    AppDatePipe,
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    OrganizationStatusComponent,
    ButtonSpinnerDirective,
  ],
  templateUrl: './settings-security-page.component.html',
  styleUrl: './settings-security-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsSecurityPageComponent implements OnInit, HasUnsavedChanges {
  private readonly fb = inject(FormBuilder);
  private readonly security = inject(SecurityService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly loading = signal(true);
  /** True once the first load finished, so a reload after saving keeps the page on screen. */
  readonly loaded = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly status = signal<SecurityStatus | null>(null);
  readonly review = signal<SecurityReview | null>(null);
  readonly checks = signal<SecurityReviewCheck[]>([]);
  readonly attempts = signal<LoginAttemptItem[]>([]);
  readonly canUpdate = this.auth.hasPermission('settings:update');
  /** The allowlist as loaded, to tell whether saving would change who can sign in. */
  private savedAllowlist: string[] = [];

  readonly attemptEmail = new FormControl('', { nonNullable: true });
  readonly attemptSuccess = new FormControl<'all' | 'true' | 'false'>('all', { nonNullable: true });

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
    ipAllowlistText: ['', ipListValidator],
  });

  ngOnInit(): void {
    this.reload();
    this.attemptEmail.valueChanges
      .pipe(debounceTime(300), distinctUntilChanged())
      .subscribe(() => this.reloadAttempts());
    this.attemptSuccess.valueChanges.subscribe(() => this.reloadAttempts());
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.security.getStatus().subscribe({
      next: (status) => {
        this.status.set(status);
        const p = status.policy;
        this.savedAllowlist = p.ipAllowlist ?? [];
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
          ipAllowlistText: this.savedAllowlist.join('\n'),
        });
        if (!this.canUpdate) this.form.disable();
        // Sign-up is decided by the server, so this flag is shown but cannot be changed.
        this.form.controls.allowSelfRegistration.disable();
        this.security.getReview().subscribe({
          next: (review) => {
            this.review.set(review);
            this.checks.set(review.checks);
          },
          error: () => {
            this.review.set(null);
            this.checks.set([]);
          },
        });
        this.reloadAttempts();
        this.loading.set(false);
        this.loaded.set(true);
      },
      error: (err: ApiError) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load security settings.');
        this.loading.set(false);
      },
    });
  }

  reloadAttempts(): void {
    const success =
      this.attemptSuccess.value === 'all' ? undefined : this.attemptSuccess.value === 'true';
    this.security
      .listLoginAttempts({
        page: 1,
        pageSize: 20,
        email: this.attemptEmail.value.trim() || undefined,
        success,
      })
      .subscribe({
        next: (res) => this.attempts.set(res.items),
        error: () => this.attempts.set([]),
      });
  }

  save(): void {
    if (!this.canUpdate || this.saving()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const ipAllowlist = parseIpList(this.form.getRawValue().ipAllowlistText);
    // A new or changed allowlist can lock people out of signing in, so make that explicit first.
    if (ipAllowlist.length > 0 && !this.sameList(ipAllowlist, this.savedAllowlist)) {
      this.confirm
        .open({
          title: 'Restrict where people can sign in?',
          message:
            `Only these ${ipAllowlist.length === 1 ? 'network' : `${ipAllowlist.length} networks`} will be able to sign in: ` +
            `${ipAllowlist.join(', ')}. Anyone signing in from elsewhere will be refused, including you. ` +
            'Check that your own network is on the list.',
          confirmLabel: 'Save allowlist',
          destructive: true,
          icon: 'warning',
        })
        .pipe(filter(Boolean))
        .subscribe(() => this.persist(ipAllowlist));
      return;
    }
    this.persist(ipAllowlist);
  }

  private persist(ipAllowlist: string[]): void {
    this.saving.set(true);
    const raw = this.form.getRawValue();
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
          this.form.markAsPristine();
          this.toast.success('Security policy saved.');
          this.saving.set(false);
          this.reload();
        },
        error: (err: ApiError) => {
          this.toast.error(err?.error?.message || err?.message || 'Unable to save policy.');
          this.saving.set(false);
        },
      });
  }

  statusLabel(status: string): string {
    if (status === 'pass') return 'Pass';
    if (status === 'fail') return 'Fail';
    return 'Warn';
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saving();
  }

  private sameList(a: readonly string[], b: readonly string[]): boolean {
    return a.length === b.length && [...a].sort().every((v, i) => v === [...b].sort()[i]);
  }
}
