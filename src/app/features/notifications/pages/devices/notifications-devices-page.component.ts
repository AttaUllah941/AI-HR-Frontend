import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { filter } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  PUSH_PLATFORMS,
  PushDevice,
  PushPlatform,
  NotificationsService,
} from '../../../../core/services/notifications.service';
import { ConfirmDialogService } from '../../../../core/services/confirm-dialog.service';
import { ToastService } from '../../../../core/services/toast.service';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { OrganizationStatusComponent } from '../../../organization/components/organization-status/organization-status.component';

@Component({
  selector: 'app-notifications-devices-page',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
    EmptyStateComponent,
    OrganizationStatusComponent,
  ],
  templateUrl: './notifications-devices-page.component.html',
  styleUrl: './notifications-devices-page.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NotificationsDevicesPageComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationsService);
  private readonly toast = inject(ToastService);
  private readonly confirm = inject(ConfirmDialogService);

  readonly items = signal<PushDevice[]>([]);
  readonly loading = signal(true);
  readonly registering = signal(false);
  readonly error = signal<string | null>(null);

  readonly platforms = PUSH_PLATFORMS;

  readonly form = this.fb.nonNullable.group({
    token: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(512)]],
    platform: ['WEB' as PushPlatform, Validators.required],
    label: [''],
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set(null);
    this.notifications.listDevices().subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.loading.set(false);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.error.set(err?.error?.message || err?.message || 'Unable to load devices.');
        this.loading.set(false);
      },
    });
  }

  register(): void {
    if (this.form.invalid || this.registering()) {
      this.form.markAllAsTouched();
      return;
    }
    this.registering.set(true);
    const raw = this.form.getRawValue();
    this.notifications
      .registerDevice({
        token: raw.token.trim(),
        platform: raw.platform,
        label: raw.label.trim() || null,
      })
      .subscribe({
        next: () => {
          this.toast.success('Device registered.');
          this.form.reset({ token: '', platform: 'WEB', label: '' });
          this.registering.set(false);
          this.reload();
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.toast.error(err?.error?.message || err?.message || 'Unable to register device.');
          this.registering.set(false);
        },
      });
  }

  removeDevice(device: PushDevice): void {
    this.confirm
      .open({
        title: 'Remove device?',
        message: 'This device will no longer receive push notifications.',
        confirmLabel: 'Remove',
        destructive: true,
      })
      .pipe(filter(Boolean))
      .subscribe(() => {
        this.notifications.removeDevice(device.id).subscribe({
          next: () => {
            this.toast.success('Device removed.');
            this.reload();
          },
          error: () => this.toast.error('Unable to remove device.'),
        });
      });
  }

  createdLabel(iso: string): string {
    try {
      return new Date(iso).toLocaleString();
    } catch {
      return iso;
    }
  }
}
