import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { AttendanceService } from '../../../core/services/attendance.service';
import { EmployeeListItem, EmployeeService } from '../../../core/services/employee.service';
import { ToastService } from '../../../core/services/toast.service';

@Component({
  selector: 'app-overtime-form-dialog',
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
  templateUrl: './overtime-form-dialog.component.html',
  styleUrl: './overtime-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OvertimeFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly attendance = inject(AttendanceService);
  private readonly employeesApi = inject(EmployeeService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<OvertimeFormDialogComponent, boolean>);
  readonly data = inject<{ }>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly employees = signal<EmployeeListItem[]>([]);

  readonly form = this.fb.nonNullable.group({
    employeeId: ['', Validators.required],
    date: [new Date().toISOString().slice(0, 10), Validators.required],
    minutes: [60, [Validators.required, Validators.min(1)]],
    reason: [''],
  });

  constructor() {
    this.employeesApi.list({ page: 1, pageSize: 100, sortBy: 'lastName', sortDir: 'asc' }).subscribe({
      next: (res) => this.employees.set(res.items),
    });
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.attendance
      .createOvertime({
        employeeId: raw.employeeId,
        date: raw.date,
        minutes: Number(raw.minutes),
        reason: raw.reason.trim() || null,
      })
      .subscribe({
        next: () => {
          this.toast.success('Overtime request created');
          this.dialogRef.close(true);
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.toast.error(err.message || 'Unable to create overtime request');
        },
      });
  }
}
