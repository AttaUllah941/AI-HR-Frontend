import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AbstractControl, FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { LeaveDayType, LeaveRequest, LeaveService, LeaveType } from '../../../core/services/leave.service';
import { EmployeeListItem, EmployeeService } from '../../../core/services/employee.service';
import { AuthService } from '../../../core/services/auth.service';
import { ToastService } from '../../../core/services/toast.service';

export interface LeaveRequestFormDialogData {
  request?: LeaveRequest | null;
  /** When true, form fields are read-only. */
  viewOnly?: boolean;
}

const DAY_TYPE_OPTIONS: Array<{ value: LeaveDayType; label: string }> = [
  { value: 'FULL_DAY', label: 'Full day' },
  { value: 'HALF_DAY_AM', label: 'Half day (AM)' },
  { value: 'HALF_DAY_PM', label: 'Half day (PM)' },
];

function dateRangeValidator(group: AbstractControl): ValidationErrors | null {
  const start = group.get('startDate')?.value as string | undefined;
  const end = group.get('endDate')?.value as string | undefined;
  if (!start || !end) {
    return null;
  }
  if (end < start) {
    return { dateRange: true };
  }
  return null;
}

@Component({
  selector: 'app-leave-request-form-dialog',
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
  templateUrl: './leave-request-form-dialog.component.html',
  styleUrl: './leave-request-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LeaveRequestFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly leave = inject(LeaveService);
  private readonly employeesApi = inject(EmployeeService);
  private readonly auth = inject(AuthService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<LeaveRequestFormDialogComponent, boolean>);
  readonly data = inject<LeaveRequestFormDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly employees = signal<EmployeeListItem[]>([]);
  readonly leaveTypes = signal<LeaveType[]>([]);
  readonly selectedLeaveTypeId = signal(this.data.request?.leaveTypeId ?? '');
  readonly canAssignEmployee =
    this.auth.hasPermission('leave:update') || this.auth.hasPermission('leave:approve');
  readonly viewOnly = !!this.data.viewOnly;
  readonly isEdit = !!this.data.request && !this.data.viewOnly;

  readonly form = this.fb.nonNullable.group(
    {
      employeeId: [this.data.request?.employeeId ?? ''],
      leaveTypeId: [this.data.request?.leaveTypeId ?? '', Validators.required],
      startDate: [
        this.toDateInput(this.data.request?.startDate) || new Date().toISOString().slice(0, 10),
        Validators.required,
      ],
      endDate: [
        this.toDateInput(this.data.request?.endDate) || new Date().toISOString().slice(0, 10),
        Validators.required,
      ],
      dayType: [this.data.request?.dayType ?? ('FULL_DAY' as LeaveDayType), Validators.required],
      reason: [this.data.request?.reason ?? ''],
    },
    { validators: dateRangeValidator },
  );

  readonly dayTypeOptions = computed(() => {
    const typeId = this.selectedLeaveTypeId();
    const selected = this.leaveTypes().find((t) => t.id === typeId);
    if (selected && !selected.allowHalfDay) {
      return DAY_TYPE_OPTIONS.filter((o) => o.value === 'FULL_DAY');
    }
    return DAY_TYPE_OPTIONS;
  });

  constructor() {
    if (this.viewOnly) {
      this.form.disable();
    }

    this.leave.listTypes().subscribe({
      next: (items) =>
        this.leaveTypes.set(
          items.filter((t) => t.isActive || t.id === this.data.request?.leaveTypeId),
        ),
    });

    if (this.canAssignEmployee) {
      this.employeesApi
        .list({ page: 1, pageSize: 100, sortBy: 'lastName', sortDir: 'asc' })
        .subscribe({
          next: (res) => this.employees.set(res.items),
        });
    }

    this.form.controls.leaveTypeId.valueChanges.subscribe((typeId) => {
      this.selectedLeaveTypeId.set(typeId);
      const selected = this.leaveTypes().find((t) => t.id === typeId);
      if (selected && !selected.allowHalfDay && this.form.controls.dayType.value !== 'FULL_DAY') {
        this.form.controls.dayType.setValue('FULL_DAY');
      }
    });
  }

  submit(): void {
    if (this.viewOnly || this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();
    const selected = this.leaveTypes().find((t) => t.id === raw.leaveTypeId);
    if (selected && !selected.allowHalfDay && raw.dayType !== 'FULL_DAY') {
      this.toast.error('Half-day leave is not allowed for this leave type');
      return;
    }
    if (raw.dayType !== 'FULL_DAY' && raw.startDate !== raw.endDate) {
      this.toast.error('Half-day leave must be for a single date');
      return;
    }

    this.saving.set(true);
    const body: Record<string, unknown> = {
      leaveTypeId: raw.leaveTypeId,
      startDate: raw.startDate,
      endDate: raw.endDate,
      dayType: raw.dayType,
      reason: raw.reason.trim() || null,
    };
    if (this.canAssignEmployee && raw.employeeId) {
      body['employeeId'] = raw.employeeId;
    }

    const request$ = this.data.request
      ? this.leave.updateRequest(this.data.request.id, body)
      : this.leave.createRequest(body);

    request$.subscribe({
      next: () => {
        this.toast.success(this.data.request ? 'Leave request updated' : 'Leave request submitted');
        this.dialogRef.close(true);
      },
      error: (err: { error?: { message?: string }; message?: string }) => {
        this.saving.set(false);
        this.toast.error(err?.error?.message || err?.message || 'Unable to save leave request');
      },
    });
  }

  private toDateInput(value?: string | null): string {
    if (!value) {
      return '';
    }
    return value.slice(0, 10);
  }
}
