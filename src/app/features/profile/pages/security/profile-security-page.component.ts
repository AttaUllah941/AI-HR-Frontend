import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { startWith } from 'rxjs';
import { ProfileService, UserProfile } from '../../../../core/services/profile.service';
import { ToastService } from '../../../../core/services/toast.service';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { ButtonSpinnerDirective } from '../../../../shared/button-spinner/button-spinner.directive';

/** The new password has to differ from the current one, and the confirmation has to repeat it. */
export function passwordRules(group: AbstractControl): ValidationErrors | null {
  const current = String(group.get('currentPassword')?.value ?? '');
  const next = String(group.get('newPassword')?.value ?? '');
  const confirm = String(group.get('confirmPassword')?.value ?? '');
  const errors: ValidationErrors = {};
  if (next && current && next === current) {
    errors['sameAsCurrent'] = true;
  }
  if (confirm && next !== confirm) {
    errors['mismatch'] = true;
  }
  return Object.keys(errors).length ? errors : null;
}

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
    OrganizationStatusComponent,
    ButtonSpinnerDirective,
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
  /** True once the first load finished, so a reload after changing the password keeps the page on screen. */
  readonly loaded = signal(false);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group(
    {
      currentPassword: ['', [Validators.required]],
      newPassword: ['', [Validators.required, Validators.maxLength(128)]],
      confirmPassword: ['', [Validators.required]],
    },
    { validators: passwordRules },
  );

  /** Which password fields are showing their text. */
  readonly visible = signal({ current: false, next: false, confirm: false });

  private readonly values = toSignal(this.form.valueChanges.pipe(startWith(this.form.getRawValue())), {
    initialValue: this.form.getRawValue(),
  });
  /** Live feedback under the confirmation field: nothing until they start typing it. */
  readonly matchState = computed<'idle' | 'match' | 'mismatch'>(() => {
    const { newPassword, confirmPassword } = this.values();
    if (!confirmPassword) {
      return 'idle';
    }
    return newPassword === confirmPassword ? 'match' : 'mismatch';
  });
  readonly sameAsCurrent = computed(() => {
    const { currentPassword, newPassword } = this.values();
    return !!newPassword && newPassword === currentPassword;
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
        this.loaded.set(true);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load security details.');
        this.loading.set(false);
      },
    });
  }

  toggle(field: 'current' | 'next' | 'confirm'): void {
    this.visible.update((v) => ({ ...v, [field]: !v[field] }));
  }

  changePassword(): void {
    if (this.saving()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    this.saving.set(true);
    this.profile
      .changePassword({
        currentPassword: raw.currentPassword,
        newPassword: raw.newPassword,
      })
      .subscribe({
        next: (res) => {
          this.form.reset({ currentPassword: '', newPassword: '', confirmPassword: '' });
          this.visible.set({ current: false, next: false, confirm: false });
          const revoked =
            typeof res.otherSessionsRevoked === 'number' ? res.otherSessionsRevoked : res.otherSessionsRevoked ? 1 : 0;
          this.toast.success(
            revoked > 0
              ? `Password changed. Signed out ${revoked} other session${revoked === 1 ? '' : 's'}.`
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
