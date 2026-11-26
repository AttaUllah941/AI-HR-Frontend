import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, FormControl, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { map } from 'rxjs';
import {
  NOTIFICATION_CATEGORIES,
  NOTIFICATION_CHANNELS,
  NotificationCategory,
  NotificationChannel,
  NotificationsService,
  describeSendResult,
} from '../../../core/services/notifications.service';
import { AuthService } from '../../../core/services/auth.service';
import { SettingsService } from '../../../core/services/settings.service';
import { ToastService } from '../../../core/services/toast.service';
import { guardDirtyDialog } from '../../../core/guards/unsaved-changes.guard';
import { ButtonSpinnerDirective } from '../../../shared/button-spinner/button-spinner.directive';
import {
  PersonOption,
  PickerValue,
  displayPerson,
  mustPickOption,
  personSuggestions,
  pickedId,
} from '../../../shared/forms/person-picker';

export interface SendNotificationDialogData {
  templateCode?: string;
  userId?: string;
  /** Prefill the title and body with test text (used by the template "Send test" actions). */
  prefillTest?: boolean;
}

@Component({
  selector: 'app-send-notification-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatAutocompleteModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    ButtonSpinnerDirective,
  ],
  templateUrl: './send-notification-dialog.component.html',
  styleUrl: './send-notification-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SendNotificationDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly notifications = inject(NotificationsService);
  private readonly settings = inject(SettingsService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<SendNotificationDialogComponent, boolean>);

  constructor() {
    guardDirtyDialog(this.dialogRef, () => (this.form.dirty || this.recipient.dirty) && !this.saving());
  }

  readonly data = inject<SendNotificationDialogData>(MAT_DIALOG_DATA, { optional: true }) ?? {};
  readonly saving = signal(false);
  /** True when the user search failed, typically because the account may not list users. */
  readonly searchFailed = signal(false);
  readonly categories = NOTIFICATION_CATEGORIES;
  readonly channels = NOTIFICATION_CHANNELS;
  readonly limits = { title: 200, body: 4000 } as const;
  readonly displayPerson = displayPerson;

  /** Starts on the sender, so a test goes to yourself unless you pick someone else. */
  readonly recipient = new FormControl<PickerValue>(this.initialRecipient(), {
    validators: [Validators.required, mustPickOption],
  });
  readonly recipientOptions = personSuggestions(
    this.recipient,
    (search) =>
      this.settings.listUsers({ search, page: 1, pageSize: 10 }).pipe(
        map((res) =>
          res.items.map((u) => ({
            id: u.id,
            name: `${u.firstName} ${u.lastName}`.trim() || u.email,
            detail: u.email,
          })),
        ),
      ),
    () => this.searchFailed.set(true),
  );

  readonly form = this.fb.nonNullable.group({
    title: [
      this.data.prefillTest ? 'Test notification' : '',
      [Validators.required, Validators.maxLength(this.limits.title)],
    ],
    body: [
      this.data.prefillTest ? 'This is a test notification from Zenith HR.' : '',
      [Validators.required, Validators.maxLength(this.limits.body)],
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
    this.form.markAllAsTouched();
    this.recipient.markAsTouched();
    const userId = pickedId(this.recipient.value);
    if (!userId || this.form.invalid || this.recipient.invalid || this.saving()) {
      return;
    }
    const raw = this.form.getRawValue();
    this.saving.set(true);
    this.notifications
      .send({
        userId,
        title: raw.title.trim(),
        body: raw.body.trim(),
        category: raw.category,
        channels: raw.channels,
        templateCode: raw.templateCode.trim() || undefined,
      })
      .subscribe({
        next: (res) => {
          const message = describeSendResult(res);
          if (res.count) {
            this.toast.success(message);
          } else {
            this.toast.info(message);
          }
          this.dialogRef.close(true);
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.toast.error(err?.error?.message || err?.message || 'Send failed.');
          this.saving.set(false);
        },
      });
  }

  private initialRecipient(): PersonOption | null {
    const me = this.auth.user();
    const id = this.data.userId ?? me?.id;
    if (!id) {
      return null;
    }
    if (me && id === me.id) {
      return { id, name: `${me.firstName} ${me.lastName}`.trim() || me.email, detail: `${me.email} (you)` };
    }
    return { id, name: 'Selected user', detail: '' };
  }
}
