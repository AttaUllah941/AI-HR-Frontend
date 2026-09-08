import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AttendanceService, Shift } from '../../../core/services/attendance.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-shift-form-dialog',
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
  templateUrl: './shift-form-dialog.component.html',
  styleUrl: './shift-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ShiftFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly attendance = inject(AttendanceService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<ShiftFormDialogComponent, boolean>);
  readonly data = inject<{ shift: Shift | null }>(MAT_DIALOG_DATA);

  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    name: [this.data.shift?.name ?? '', [Validators.required, Validators.maxLength(150)]],
    code: [this.data.shift?.code ?? '', [Validators.required, Validators.maxLength(50)]],
    startTime: [
      this.data.shift?.startTime ?? '09:00',
      [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)],
    ],
    endTime: [
      this.data.shift?.endTime ?? '17:00',
      [Validators.required, Validators.pattern(/^([01]\d|2[0-3]):[0-5]\d$/)],
    ],
    breakMinutes: [this.data.shift?.breakMinutes ?? 60, [Validators.required, Validators.min(0)]],
    graceMinutes: [this.data.shift?.graceMinutes ?? 15, [Validators.required, Validators.min(0)]],
    isDefault: [this.data.shift?.isDefault ?? false],
  });

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const request$ = this.data.shift
      ? this.attendance.updateShift(this.data.shift.id, raw)
      : this.attendance.createShift(raw);

    request$.subscribe({
      next: () => {
        this.toast.success(this.data.shift ? 'Shift updated' : 'Shift created');
        this.dialogRef.close(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast.error(err.message || 'Unable to save shift');
      },
    });
  }
}
