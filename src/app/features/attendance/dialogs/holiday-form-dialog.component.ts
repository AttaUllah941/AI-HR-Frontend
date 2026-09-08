import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AttendanceService, Holiday } from '../../../core/services/attendance.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-holiday-form-dialog',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './holiday-form-dialog.component.html',
  styleUrl: './holiday-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HolidayFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly attendance = inject(AttendanceService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<HolidayFormDialogComponent, boolean>);
  readonly data = inject<{ holiday: Holiday | null }>(MAT_DIALOG_DATA);

  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: [this.data.holiday?.name ?? '', [Validators.required, Validators.maxLength(200)]],
    date: [
      this.data.holiday?.date?.slice(0, 10) ?? new Date().toISOString().slice(0, 10),
      Validators.required,
    ],
    isOptional: [this.data.holiday?.isOptional ?? false],
    description: [this.data.holiday?.description ?? ''],
  });

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body = {
      name: raw.name,
      date: raw.date,
      isOptional: raw.isOptional,
      description: raw.description.trim() || null,
    };
    const request$ = this.data.holiday
      ? this.attendance.updateHoliday(this.data.holiday.id, body)
      : this.attendance.createHoliday(body);

    request$.subscribe({
      next: () => {
        this.toast.success(this.data.holiday ? 'Holiday updated' : 'Holiday created');
        this.dialogRef.close(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast.error(err.message || 'Unable to save holiday');
      },
    });
  }
}
