import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../../core/services/auth.service';
import { ProfileService, UserProfile } from '../../../../core/services/profile.service';
import { ToastService } from '../../../../core/services/toast.service';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';

@Component({
  selector: 'app-profile-overview-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    OrganizationStatusComponent,
  ],
  templateUrl: './profile-overview-page.component.html',
  styleUrl: './profile-overview-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProfileOverviewPageComponent implements OnInit {
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
    phone: [''],
    avatarUrl: [''],
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
        this.form.reset({
          firstName: data.firstName ?? '',
          lastName: data.lastName ?? '',
          phone: data.phone ?? '',
          avatarUrl: data.avatarUrl ?? '',
        });
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load profile.');
        this.loading.set(false);
      },
    });
  }

  save(): void {
    if (this.form.invalid || this.saving()) {
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
          this.form.reset({
            firstName: data.firstName ?? '',
            lastName: data.lastName ?? '',
            phone: data.phone ?? '',
            avatarUrl: data.avatarUrl ?? '',
          });
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

  formatDate(iso: string | null | undefined): string {
    return this.profile.formatDateTime(iso);
  }
}
