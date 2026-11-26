import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../../../core/services/auth.service';
import { NotificationsService } from '../../../../core/services/notifications.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { ToastService } from '../../../../core/services/toast.service';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';
import { ButtonSpinnerDirective } from '../../../../shared/button-spinner/button-spinner.directive';
import { HasUnsavedChanges } from '../../../../core/guards/unsaved-changes.guard';
import { emailProviderLabel } from '../../utils/labels';

/** Optional http(s) address. Empty is fine. */
const HTTP_URL = /^$|^https?:\/\/[^\s/$.?#][^\s]*$/i;

@Component({
  selector: 'app-settings-email-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    OrganizationStatusComponent,
    ButtonSpinnerDirective,
  ],
  templateUrl: './settings-email-page.component.html',
  styleUrl: './settings-email-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsEmailPageComponent implements OnInit, HasUnsavedChanges {
  private readonly fb = inject(FormBuilder);
  private readonly settings = inject(SettingsService);
  private readonly notifications = inject(NotificationsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly apiKeySet = signal(false);
  /** Credentials in the stored relay URL are masked by the server, so it is never prefilled. */
  readonly maskedSmtpUrl = signal<string | null>(null);
  /** What the server really sends through (from its environment); null when it could not be checked. */
  readonly runtimeProvider = signal<string | null>(null);
  readonly canUpdate = this.auth.hasPermission('settings:update');
  protected readonly providerLabel = emailProviderLabel;

  readonly form = this.fb.nonNullable.group({
    emailProvider: ['console' as 'console' | 'smtp', Validators.required],
    emailFrom: ['', Validators.email],
    emailSmtpUrl: ['', [Validators.pattern(HTTP_URL), (c: AbstractControl) => this.relayRequired(c)]],
  });

  ngOnInit(): void {
    // The relay URL becomes mandatory when the relay is chosen and none is stored yet.
    this.form.controls.emailProvider.valueChanges.subscribe(() =>
      this.form.controls.emailSmtpUrl.updateValueAndValidity(),
    );
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.settings.getConfig().subscribe({
      next: (cfg) => {
        this.apiKeySet.set(cfg.email.apiKeySet);
        this.maskedSmtpUrl.set(cfg.email.smtpUrl ?? null);
        this.form.reset({
          emailProvider: (cfg.email.provider as 'console' | 'smtp') || 'console',
          emailFrom: cfg.email.from ?? '',
          emailSmtpUrl: '',
        });
        if (!this.canUpdate) this.form.disable();
        this.loading.set(false);
        this.notifications.getStatus().subscribe({
          next: (status) => this.runtimeProvider.set(status.emailProvider),
          error: () => this.runtimeProvider.set(null),
        });
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load email settings.');
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
    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.settings
      .updateEmail({
        emailProvider: raw.emailProvider,
        emailFrom: raw.emailFrom.trim() || null,
        // Only a newly typed URL is sent; an empty field keeps the stored (masked) one.
        emailSmtpUrl: raw.emailSmtpUrl.trim() || undefined,
      })
      .subscribe({
        next: (cfg) => {
          this.form.markAsPristine();
          this.apiKeySet.set(cfg.email.apiKeySet);
          this.maskedSmtpUrl.set(cfg.email.smtpUrl ?? null);
          this.form.patchValue({ emailSmtpUrl: '' });
          this.toast.success('Email settings saved.');
          this.saving.set(false);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.toast.error(err?.error?.message || err?.message || 'Unable to save email settings.');
          this.saving.set(false);
        },
      });
  }

  hasUnsavedChanges(): boolean {
    return this.form.dirty && !this.saving();
  }

  private relayRequired(control: AbstractControl): ValidationErrors | null {
    const provider = this.form?.controls.emailProvider.value;
    const typed = String(control.value ?? '').trim();
    return provider === 'smtp' && !typed && !this.maskedSmtpUrl() ? { relayRequired: true } : null;
  }
}
