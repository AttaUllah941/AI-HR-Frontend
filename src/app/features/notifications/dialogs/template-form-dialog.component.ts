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
  NotificationTemplate,
  NotificationsService,
} from '../../../core/services/notifications.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-template-form-dialog',
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
  templateUrl: './template-form-dialog.component.html',
  styleUrl: './template-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TemplateFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationsService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<TemplateFormDialogComponent, boolean>);
  readonly data = inject<{ template: NotificationTemplate | null }>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly isEdit = !!this.data.template;
  readonly categories = NOTIFICATION_CATEGORIES;
  readonly channels = NOTIFICATION_CHANNELS;

  readonly form = this.fb.nonNullable.group({
    code: [
      this.data.template?.code ?? '',
      [Validators.required, Validators.minLength(1), Validators.maxLength(80)],
    ],
    name: [
      this.data.template?.name ?? '',
      [Validators.required, Validators.minLength(1), Validators.maxLength(120)],
    ],
    category: [
      (this.data.template?.category as NotificationCategory) ?? 'SYSTEM',
      Validators.required,
    ],
    channel: [
      (this.data.template?.channel as NotificationChannel) ?? 'IN_APP',
      Validators.required,
    ],
    subject: [this.data.template?.subject ?? ''],
    bodyTemplate: [
      this.data.template?.bodyTemplate ?? '',
      [Validators.required, Validators.maxLength(8000)],
    ],
    isActive: [this.data.template?.isActive ?? true],
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
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body = {
      code: raw.code.trim(),
      name: raw.name.trim(),
      category: raw.category,
      channel: raw.channel,
      subject: raw.subject.trim() || null,
      bodyTemplate: raw.bodyTemplate,
      isActive: raw.isActive,
    };

    const request$ = this.data.template
      ? this.notifications.updateTemplate(this.data.template.id, body)
      : this.notifications.createTemplate(body);

    request$.subscribe({
      next: () => {
        this.toast.success(this.data.template ? 'Template updated.' : 'Template created.');
        this.dialogRef.close(true);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.toast.error(err?.error?.message || err?.message || 'Unable to save template.');
        this.saving.set(false);
      },
    });
  }
}
