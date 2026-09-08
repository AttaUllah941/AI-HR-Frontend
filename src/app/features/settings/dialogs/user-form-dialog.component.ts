import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import {
  CreateUserResult,
  SettingsRole,
  SettingsService,
  SettingsUser,
} from '../../../core/services/settings.service';
import { ToastService } from '../../../core/services/toast.service';

export interface UserFormDialogData {
  user?: SettingsUser | null;
  roles: SettingsRole[];
  mode: 'create' | 'edit';
}

export type UserFormDialogResult = boolean | { created: true; temporaryPassword?: string };

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './user-form-dialog.component.html',
  styleUrl: './user-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class UserFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly settings = inject(SettingsService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(
    MatDialogRef<UserFormDialogComponent, UserFormDialogResult>,
  );
  readonly data = inject<UserFormDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly isEdit = this.data.mode === 'edit';

  readonly form = this.fb.nonNullable.group({
    firstName: [
      this.data.user?.firstName ?? '',
      [Validators.required, Validators.maxLength(100)],
    ],
    lastName: [this.data.user?.lastName ?? '', [Validators.required, Validators.maxLength(100)]],
    email: [
      this.data.user?.email ?? '',
      this.isEdit ? [] : [Validators.required, Validators.email],
    ],
    phone: [this.data.user?.phone ?? ''],
    status: [this.data.user?.status ?? 'ACTIVE'],
    roleCodes: [
      this.data.user?.roles.map((r) => r.code) ?? ([] as string[]),
      [Validators.required, Validators.minLength(1)],
    ],
    temporaryPassword: [''],
  });

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();

    if (this.isEdit && this.data.user) {
      this.settings
        .updateUser(this.data.user.id, {
          firstName: raw.firstName.trim(),
          lastName: raw.lastName.trim(),
          phone: raw.phone.trim() || null,
          status: raw.status as 'ACTIVE' | 'INACTIVE' | 'SUSPENDED',
          roleCodes: raw.roleCodes,
        })
        .subscribe({
          next: () => {
            this.toast.success('User updated.');
            this.dialogRef.close(true);
          },
          error: (err: { error?: { message?: string }; message?: string }) => {
            this.toast.error(err?.error?.message || err?.message || 'Unable to update user.');
            this.saving.set(false);
          },
        });
      return;
    }

    this.settings
      .createUser({
        email: raw.email.trim(),
        firstName: raw.firstName.trim(),
        lastName: raw.lastName.trim(),
        phone: raw.phone.trim() || null,
        roleCodes: raw.roleCodes,
        temporaryPassword: raw.temporaryPassword.trim() || undefined,
      })
      .subscribe({
        next: (res: CreateUserResult) => {
          this.toast.success('User created.');
          this.dialogRef.close({
            created: true,
            temporaryPassword: res.temporaryPassword,
          });
        },
        error: (err: { error?: { message?: string }; message?: string }) => {
          this.toast.error(err?.error?.message || err?.message || 'Unable to create user.');
          this.saving.set(false);
        },
      });
  }
}
