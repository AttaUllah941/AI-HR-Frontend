import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
  NotificationCategory,
  NotificationChannel,
  NotificationsService,
} from '../../../core/services/notifications.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

export interface SendNotificationDialogData {
  templateCode?: string;
  userId?: string;
}

@Component({
  selector: 'app-send-notification-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './send-notification-dialog.component.html',
  styleUrl: './send-notification-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendNotificationDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(
    MatDialogRef<SendNotificationDialogComponent, boolean>,
  );
  readonly data = inject<SendNotificationDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};

  readonly saving = signal(false);
  readonly categories = NOTIFICATION_CATEGORIES;
  readonly channels = NOTIFICATION_CHANNELS;

  readonly form = this.fb.nonNullable.group({
    userId: [
      this.data.userId ?? this.auth.user()?.id ?? '',
      [Validators.required, Validators.minLength(10)],
    ],
    title: ['Test notification', [Validators.required, Validators.maxLength(200)]],
    body: [
      'This is a test notification from Zenith HR.',
      [Validators.required, Validators.maxLength(4000)],
    ],
    category: ['SYSTEM' as NotificationCategory, Validators.required],
    channels: [['IN_APP'] as NotificationChannel[], Validators.required],
    templateCode: [this.data.templateCode ?? ''],
  });

  categoryLabel(category: string): string {
    return this.notifications.categoryLabel(category);
  }

  channelLabel(channel: string): string {
    return this.notifications.channelLabel(channel);
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    const raw = this.form.getRawValue();
    if (!raw.channels.length) {
      this.toast.error('Select at least one channel.');
      return;
    }
    this.saving.set(true);
    this.notifications
      .send({
        userId: raw.userId.trim(),
        title: raw.title.trim(),
        body: raw.body.trim(),
        category: raw.category,
        channels: raw.channels,
        templateCode: raw.templateCode.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          this.toast.success(
            res.count ? `Dispatched ${res.count} notification(s).` : 'No channels delivered.',
          );
          this.dialogRef.close(true);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.toast.error(err?.error?.message || err?.message || 'Send failed.');
          this.saving.set(false);
        },
      });
  }
}
