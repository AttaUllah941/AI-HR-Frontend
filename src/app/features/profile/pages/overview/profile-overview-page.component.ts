import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { startWith } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { ProfileService, UserProfile } from '../../../../core/services/profile.service';
import { ToastService } from '../../../../core/services/toast.service';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { ButtonSpinnerDirective } from '../../../../shared/button-spinner/button-spinner.directive';
import { HasUnsavedChanges } from '../../../../core/guards/unsaved-changes.guard';
import { humanizeCode } from '../../../../shared/utils/text';

/** Digits with the usual separators, up to 30 characters. Empty is fine. */
const PHONE_PATTERN = /^[+()\d\s.-]{0,30}$/;
/** An https address or a path on this site (not //host). Empty is fine. */
const AVATAR_PATTERN = /^$|^https:\/\/[^\s/$.?#][^\s]*$|^\/(?!\/)[^\s]*$/i;

@Component({
  selector: 'app-profile-overview-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    OrganizationStatusComponent,
    ButtonSpinnerDirective,
  ],
  templateUrl: './profile-overview-page.component.html',
  styleUrl: './profile-overview-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileOverviewPageComponent implements OnInit, HasUnsavedChanges {
  private readonly fb = inject(FormBuilder);
  private readonly profile = inject(ProfileService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly profileData = signal<UserProfile | null>(null);
  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    firstName: ['', [Validators.required, Validators.maxLength(80)]],
    lastName: ['', [Validators.required, Validators.maxLength(80)]],
    phone: ['', Validators.pattern(PHONE_PATTERN)],
    avatarUrl: ['', Validators.pattern(AVATAR_PATTERN)],
  });

  private readonly avatarValue = toSignal(
    this.form.controls.avatarUrl.valueChanges.pipe(startWith(this.form.controls.avatarUrl.value)),
    { initialValue: '' },
  );
  /** Which address failed to load, so a fixed address gets a fresh try. */
  private readonly failedAvatar = signal<string | null>(null);
  /** A preview only for secure addresses that passed validation. */
  readonly previewUrl = computed(() => {
    const url = this.avatarValue().trim();
    return /^https:\/\//i.test(url) && AVATAR_PATTERN.test(url) ? url : null;
  });
  readonly previewFailed = computed(() => this.failedAvatar() === this.previewUrl());

  readonly statusLabel = (status: string) => humanizeCode(status, true);

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.profile.getProfile().subscribe({
      next: (data) => {
        this.profileData.set(data);
        this.resetForm(data);
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load profile.');
        this.loading.set(false);
      },
    });
  }

  save(): void {
    if (this.saving()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.profile
      .updateProfile({
        firstName: raw.firstName.trim(),
        lastName: raw.lastName.trim(),
        phone: raw.phone.trim() || null,
        avatarUrl: raw.avatarUrl.trim() || null,
      })
      .subscribe({
        next: (data) => {
          this.profileData.set(data);
          this.resetForm(data);
          // Refreshes the name and picture shown in the header and the app bar.
          this.auth.me().subscribe({ error: () => undefined });
          this.toast.success('Profile updated.');
          this.saving.set(false);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.toast.error(err?.error?.message || err?.message || 'Unable to update profile.');
          this.saving.set(false);
        },
      });
  }

  markPreviewFailed(): void {
    this.failedAvatar.set(this.previewUrl());
  }

  formatDate(iso: string | null | undefined): string {
    return this.profile.formatDateTime(iso);
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saving();
  }

  private resetForm(data: UserProfile): void {
    this.form.reset({
      firstName: data.firstName ?? '',
      lastName: data.lastName ?? '',
      phone: data.phone ?? '',
      avatarUrl: data.avatarUrl ?? '',
    });
  }
}
