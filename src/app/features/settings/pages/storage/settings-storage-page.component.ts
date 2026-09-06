import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
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
  selector: 'app-settings-storage-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    OrganizationStatusComponent,
  ],
  templateUrl: './settings-storage-page.component.html',
  styleUrl: './settings-storage-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SettingsStoragePageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly settings = inject(SettingsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);

  readonly loading = signal(true);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);
  readonly canUpdate = this.auth.hasPermission('settings:update');

  readonly form = this.fb.nonNullable.group({
    storageProvider: ['local' as 'local' | 's3' | 'azure' | 'gcs', Validators.required],
    storageBucket: [''],
    storageRegion: [''],
    storagePublicBaseUrl: [''],
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.settings.getConfig().subscribe({
      next: (cfg) => {
        this.form.reset({
          storageProvider:
            (cfg.storage.provider as 'local' | 's3' | 'azure' | 'gcs') || 'local',
          storageBucket: cfg.storage.bucket ?? '',
          storageRegion: cfg.storage.region ?? '',
          storagePublicBaseUrl: cfg.storage.publicBaseUrl ?? '',
        });
        if (!this.canUpdate) this.form.disable();
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load storage settings.');
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
      .updateStorage({
        storageProvider: raw.storageProvider,
        storageBucket: raw.storageBucket.trim() || null,
        storageRegion: raw.storageRegion.trim() || null,
        storagePublicBaseUrl: raw.storagePublicBaseUrl.trim() || null,
      })
      .subscribe({
        next: () => {
          this.toast.success('Storage settings updated.');
          this.saving.set(false);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.toast.error(
            err?.error?.message || err?.message || 'Unable to save storage settings.',
          );
          this.saving.set(false);
        },
      });
  }
}
