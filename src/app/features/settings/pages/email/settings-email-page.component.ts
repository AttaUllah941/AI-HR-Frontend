import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AuthService } from '../../../../core/services/auth.service';
import { SettingsService } from '../../../../core/services/settings.service';
import { ToastService } from '../../../../core/services/toast.service';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';

@Component({
  selector: 'app-settings-email-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    OrganizationStatusComponent,
  ],
  templateUrl: './settings-email-page.component.html',
  styleUrl: './settings-email-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsEmailPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly settings = inject(SettingsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly apiKeySet = signal(false);
  readonly canUpdate = this.auth.hasPermission('settings:update');

  readonly form = this.fb.nonNullable.group({
    emailProvider: ['console' as 'console' | 'smtp', Validators.required],
    emailFrom: [''],
    emailSmtpUrl: [''],
    emailApiKey: [''],
    clearApiKey: [false],
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.settings.getConfig().subscribe({
      next: (cfg) => {
        this.apiKeySet.set(cfg.email.apiKeySet);
        this.form.reset({
          emailProvider: (cfg.email.provider as 'console' | 'smtp') || 'console',
          emailFrom: cfg.email.from ?? '',
          emailSmtpUrl: cfg.email.smtpUrl ?? '',
          emailApiKey: '',
          clearApiKey: false,
        });
        if (!this.canUpdate) this.form.disable();
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load email settings.');
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
      .updateEmail({
        emailProvider: raw.emailProvider,
        emailFrom: raw.emailFrom.trim() || null,
        emailSmtpUrl: raw.emailSmtpUrl.trim() || null,
        emailApiKey: raw.emailApiKey.trim() || null,
        clearApiKey: raw.clearApiKey || undefined,
      })
      .subscribe({
        next: (cfg) => {
          this.apiKeySet.set(cfg.email.apiKeySet);
          this.form.patchValue({ emailApiKey: '', clearApiKey: false });
          this.toast.success('Email settings updated.');
          this.saving.set(false);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.toast.error(err?.error?.message || err?.message || 'Unable to save email settings.');
          this.saving.set(false);
        },
      });
  }
}
