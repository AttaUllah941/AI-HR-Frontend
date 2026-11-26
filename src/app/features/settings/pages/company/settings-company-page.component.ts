import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { filter } from 'rxjs';
import { AuthService } from '../../../../core/services/auth.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { ToastService } from '../../../../core/services/toast.service';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { ButtonSpinnerDirective } from '../../../../shared/button-spinner/button-spinner.directive';
import { HasUnsavedChanges } from '../../../../core/guards/unsaved-changes.guard';
import { TIME_ZONES, localeValidator, timeZoneValidator } from '../../../../shared/forms/validators';

/** Optional http(s) address. Empty is fine. */
const URL_PATTERN = /^$|^https?:\/\/[^\s/$.?#][^\s]*$/i;

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
    OrganizationStatusComponent,
    ButtonSpinnerDirective,
  ],
  templateUrl: './settings-company-page.component.html',
  styleUrl: './settings-company-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsCompanyPageComponent implements OnInit, HasUnsavedChanges {
  private readonly fb = inject(FormBuilder);
  private readonly settings = inject(SettingsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  /** Whether the company was active when last loaded or saved; turning it off needs a confirmation. */
  private readonly wasActive = signal(true);
  readonly canUpdate = this.auth.hasPermission('settings:update');
  readonly timeZones = TIME_ZONES;

  readonly form = this.fb.nonNullable.group({
    name: ['', [Validators.required, Validators.maxLength(200)]],
    legalName: ['', Validators.maxLength(200)],
    email: ['', Validators.email],
    phone: ['', Validators.maxLength(50)],
    website: ['', Validators.pattern(URL_PATTERN)],
    logoUrl: ['', Validators.pattern(URL_PATTERN)],
    timezone: ['UTC', [Validators.required, timeZoneValidator]],
    locale: ['en-US', [Validators.required, localeValidator]],
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
        this.wasActive.set(data.isActive ?? true);
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
    if (!this.canUpdate || this.saving()) {
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    if (this.wasActive() && !raw.isActive) {
      // Deactivating blocks every sign-in for the company, including the person pressing Save.
      this.confirm
        .open({
          title: 'Deactivate this company?',
          message:
            'Everyone in this company, including you, will be signed out and unable to sign in until the platform administrator turns it back on.',
          confirmLabel: 'Deactivate company',
          destructive: true,
          icon: 'warning',
        })
        .pipe(filter(Boolean))
        .subscribe(() => this.persist());
      return;
    }
    this.persist();
  }

  private persist(): void {
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
          this.form.markAsPristine();
          this.wasActive.set(raw.isActive);
          this.toast.success('Company profile updated.');
          this.saving.set(false);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.toast.error(err?.error?.message || err?.message || 'Unable to save company.');
          this.saving.set(false);
        },
      });
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saving();
  }
}
