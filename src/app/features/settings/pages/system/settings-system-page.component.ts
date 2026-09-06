import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
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
  selector: 'app-settings-system-page',
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
  templateUrl: './settings-system-page.component.html',
  styleUrl: './settings-system-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsSystemPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly settings = inject(SettingsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly savingSystem = signal(false);
  readonly savingIntegrations = signal(false);
  readonly error = signal<string | null>(null);
  readonly canUpdate = this.auth.hasPermission('settings:update');

  readonly systemForm = this.fb.nonNullable.group({
    maintenanceMode: [false],
    allowSelfRegistration: [false],
    defaultTimezone: ['UTC'],
    defaultLocale: ['en-US'],
  });

  readonly integrationsForm = this.fb.nonNullable.group({
    slackWebhookUrl: [''],
    googleWorkspaceDomain: [''],
    microsoftTenantId: [''],
    webhookSigningSecretSet: [false],
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.settings.getConfig().subscribe({
      next: (cfg) => {
        const system = cfg.system ?? {};
        this.systemForm.reset({
          maintenanceMode: Boolean(system['maintenanceMode']),
          allowSelfRegistration: Boolean(system['allowSelfRegistration']),
          defaultTimezone: String(system['defaultTimezone'] ?? 'UTC'),
          defaultLocale: String(system['defaultLocale'] ?? 'en-US'),
        });
        const integrations = cfg.integrations ?? {};
        this.integrationsForm.reset({
          slackWebhookUrl: String(integrations['slackWebhookUrl'] ?? ''),
          googleWorkspaceDomain: String(integrations['googleWorkspaceDomain'] ?? ''),
          microsoftTenantId: String(integrations['microsoftTenantId'] ?? ''),
          webhookSigningSecretSet: Boolean(integrations['webhookSigningSecretSet']),
        });
        if (!this.canUpdate) {
          this.systemForm.disable();
          this.integrationsForm.disable();
        }
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load system settings.');
        this.loading.set(false);
      },
    });
  }

  saveSystem(): void {
    if (!this.canUpdate || this.savingSystem()) return;
    this.savingSystem.set(true);
    const raw = this.systemForm.getRawValue();
    this.settings
      .updateSystem({
        maintenanceMode: raw.maintenanceMode,
        allowSelfRegistration: raw.allowSelfRegistration,
        defaultTimezone: raw.defaultTimezone.trim() || 'UTC',
        defaultLocale: raw.defaultLocale.trim() || 'en-US',
      })
      .subscribe({
        next: () => {
          this.toast.success('System settings saved.');
          this.savingSystem.set(false);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.toast.error(err?.error?.message || err?.message || 'Unable to save system settings.');
          this.savingSystem.set(false);
        },
      });
  }

  saveIntegrations(): void {
    if (!this.canUpdate || this.savingIntegrations()) return;
    this.savingIntegrations.set(true);
    const raw = this.integrationsForm.getRawValue();
    this.settings
      .updateIntegrations({
        slackWebhookUrl: raw.slackWebhookUrl.trim() || null,
        googleWorkspaceDomain: raw.googleWorkspaceDomain.trim() || null,
        microsoftTenantId: raw.microsoftTenantId.trim() || null,
        webhookSigningSecretSet: raw.webhookSigningSecretSet,
      })
      .subscribe({
        next: () => {
          this.toast.success('Integrations saved.');
          this.savingIntegrations.set(false);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.toast.error(err?.error?.message || err?.message || 'Unable to save integrations.');
          this.savingIntegrations.set(false);
        },
      });
  }
}
