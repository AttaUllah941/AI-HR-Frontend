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
  AttendanceRecord,
  AttendanceService,
  AttendanceStatus,
  Shift,
} from '../../../core/services/attendance.service';
import { EmployeeListItem, EmployeeService } from '../../../core/services/employee.service';
import { ToastService } from '../../../core/services/toast.service';

export interface AttendanceRecordDialogData {
  record: AttendanceRecord | null;
  viewOnly?: boolean;
  defaultDate?: string;
}

const STATUS_OPTIONS: AttendanceStatus[] = [
  'PRESENT',
  'ABSENT',
  'LATE',
  'HALF_DAY',
  'ON_LEAVE',
  'HOLIDAY',
  'WEEKEND',
  'REMOTE',
  'EARLY_LEAVE',
];

function toDateInput(value: string | null | undefined, fallback = ''): string {
  if (!value) {
    return fallback;
  }
  return value.slice(0, 10);
}

function toDateTimeLocal(value: string | null | undefined): string {
  if (!value) {
    return '';
  }
  const date = new Date(value);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function fromDateTimeLocal(value: string): string | null {
  if (!value.trim()) {
    return null;
  }
  return new Date(value).toISOString();
}

@Component({
  selector: 'app-attendance-record-form-dialog',
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
  templateUrl: './attendance-record-form-dialog.component.html',
  styleUrl: './attendance-record-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AttendanceRecordFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly attendance = inject(AttendanceService);
  private readonly employeesApi = inject(EmployeeService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<AttendanceRecordFormDialogComponent, boolean>);
  readonly data = inject<AttendanceRecordDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly employees = signal<EmployeeListItem[]>([]);
  readonly shifts = signal<Shift[]>([]);
  readonly statusOptions = STATUS_OPTIONS;
  readonly viewOnly = this.data.viewOnly === true;

  readonly form = this.fb.nonNullable.group({
    employeeId: [this.data.record?.employeeId ?? '', Validators.required],
    date: [
      toDateInput(this.data.record?.date, this.data.defaultDate ?? new Date().toISOString().slice(0, 10)),
      Validators.required,
    ],
    checkInAt: [toDateTimeLocal(this.data.record?.checkInAt)],
    checkOutAt: [toDateTimeLocal(this.data.record?.checkOutAt)],
    status: [this.data.record?.status ?? ('' as AttendanceStatus | '')],
    notes: [this.data.record?.notes ?? ''],
    shiftId: [this.data.record?.shiftId ?? ''],
  });

  constructor() {
    this.employeesApi.list({ page: 1, pageSize: 100, sortBy: 'lastName', sortDir: 'asc' }).subscribe({
      next: (data) => this.employees.set(data.items),
    });
    this.attendance.listShifts().subscribe({
      next: (items) => this.shifts.set(items),
    });
    if (this.viewOnly) {
      this.form.disable();
    }
  }

  submit(): void {
    if (this.viewOnly || this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body: Record<string, unknown> = {
      employeeId: raw.employeeId,
      date: raw.date,
      checkInAt: fromDateTimeLocal(raw.checkInAt),
      checkOutAt: fromDateTimeLocal(raw.checkOutAt),
      notes: raw.notes.trim() || null,
      shiftId: raw.shiftId || null,
    };
    if (raw.status) {
      body['status'] = raw.status;
    }

    const request$ = this.data.record
      ? this.attendance.updateRecord(this.data.record.id, body)
      : this.attendance.createRecord(body);

    request$.subscribe({
      next: () => {
        this.toast.success(this.data.record ? 'Attendance updated' : 'Attendance created');
        this.dialogRef.close(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast.error(err.message || 'Unable to save attendance');
      },
    });
  }

  statusLabel(status: string): string {
    return status.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
