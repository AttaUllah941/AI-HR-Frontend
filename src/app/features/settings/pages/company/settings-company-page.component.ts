import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../../../core/services/auth.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { ToastService } from '../../../../core/services/toast.service';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';

@Component({
  selector: 'app-settings-company-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
    OrganizationStatusComponent,
  ],
  templateUrl: './settings-company-page.component.html',
  styleUrl: './settings-company-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsCompanyPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly settings = inject(SettingsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly canUpdate = this.auth.hasPermission('settings:update');

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    legalName: [''],
    email: [''],
    phone: [''],
    website: [''],
    logoUrl: [''],
    timezone: ['UTC', [Validators.required]],
    locale: ['en-US', [Validators.required]],
    isActive: [true],
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.settings.getCompany().subscribe({
      next: (data) => {
        this.form.reset({
          name: data.name ?? '',
          legalName: data.legalName ?? '',
          email: data.email ?? '',
          phone: data.phone ?? '',
          website: data.website ?? '',
          logoUrl: data.logoUrl ?? '',
          timezone: data.timezone ?? 'UTC',
          locale: data.locale ?? 'en-US',
          isActive: data.isActive ?? true,
        });
        if (!this.canUpdate) {
          this.form.disable();
        }
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load company.');
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
    this.settings
      .updateCompany({
        name: raw.name.trim(),
        legalName: raw.legalName.trim() || null,
        email: raw.email.trim() || null,
        phone: raw.phone.trim() || null,
        website: raw.website.trim() || null,
        logoUrl: raw.logoUrl.trim() || null,
        timezone: raw.timezone.trim(),
        locale: raw.locale.trim(),
        isActive: raw.isActive,
      })
      .subscribe({
        next: () => {
          this.toast.success('Company profile updated.');
          this.saving.set(false);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.toast.error(err?.error?.message || err?.message || 'Unable to save company.');
          this.saving.set(false);
        },
      });
  }
}
