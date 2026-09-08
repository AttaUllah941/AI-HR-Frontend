import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { LeaveBalance, LeaveService, LeaveType } from '../../../core/services/leave.service';
import { EmployeeListItem, EmployeeService } from '../../../core/services/employee.service';
import { ToastService } from '../../../core/services/toast.service';

export interface LeaveBalanceFormDialogData {
  balance?: LeaveBalance | null;
  year: number;
}

@Component({
  selector: 'app-leave-balance-form-dialog',
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
  templateUrl: './leave-balance-form-dialog.component.html',
  styleUrl: './leave-balance-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveBalanceFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly leave = inject(LeaveService);
  private readonly employeesApi = inject(EmployeeService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<LeaveBalanceFormDialogComponent, boolean>);
  readonly data = inject<LeaveBalanceFormDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly employees = signal<EmployeeListItem[]>([]);
  readonly leaveTypes = signal<LeaveType[]>([]);
  readonly isEdit = !!this.data.balance;

  readonly form = this.fb.nonNullable.group({
    employeeId: [this.data.balance?.employeeId ?? '', Validators.required],
    leaveTypeId: [this.data.balance?.leaveTypeId ?? '', Validators.required],
    year: [this.data.balance?.year ?? this.data.year, [Validators.required, Validators.min(2000)]],
    entitled: [
      this.data.balance?.entitled ?? 0,
      [Validators.required, Validators.min(0), Validators.max(365)],
    ],
    carriedForward: [
      this.data.balance?.carriedForward ?? 0,
      [Validators.required, Validators.min(0), Validators.max(365)],
    ],
  });

  constructor() {
    this.leave.listTypes().subscribe({
      next: (items) => this.leaveTypes.set(items),
    });
    this.employeesApi.list({ page: 1, pageSize: 100, sortBy: 'lastName', sortDir: 'asc' }).subscribe({
      next: (res) => this.employees.set(res.items),
    });

    if (this.isEdit) {
      this.form.controls.employeeId.disable();
      this.form.controls.leaveTypeId.disable();
      this.form.controls.year.disable();
    }
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    this.leave
      .upsertBalance({
        employeeId: raw.employeeId,
        leaveTypeId: raw.leaveTypeId,
        year: Number(raw.year),
        entitled: Number(raw.entitled),
        carriedForward: Number(raw.carriedForward),
      })
      .subscribe({
        next: () => {
          this.toast.success(this.isEdit ? 'Balance updated' : 'Balance saved');
          this.dialogRef.close(true);
        },
        error: (err: Error) => {
          this.saving.set(false);
          this.toast.error(err.message || 'Unable to save balance');
        },
      });
  }
}
