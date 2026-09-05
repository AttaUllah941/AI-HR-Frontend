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
  GoalPriority,
  GoalStatus,
  PerformanceGoal,
  PerformanceService,
} from '../../../core/services/performance.service';
import { EmployeeListItem, EmployeeService } from '../../../core/services/employee.service';
import { ToastService } from '../../../core/services/toast.service';

export interface GoalFormDialogData {
  goal?: PerformanceGoal | null;
}

@Component({
  selector: 'app-goal-form-dialog',
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
  templateUrl: './goal-form-dialog.component.html',
  styleUrl: './goal-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class GoalFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PerformanceService);
  private readonly employeesApi = inject(EmployeeService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<GoalFormDialogComponent, boolean>);
  readonly data = inject<GoalFormDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly isEdit = !!this.data.goal;
  readonly employees = signal<EmployeeListItem[]>([]);
  readonly statuses: GoalStatus[] = ['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED'];
  readonly priorities: GoalPriority[] = ['LOW', 'MEDIUM', 'HIGH'];

  readonly form = this.fb.nonNullable.group({
    employeeId: [this.data.goal?.employeeId ?? '', Validators.required],
    title: [this.data.goal?.title ?? '', [Validators.required, Validators.maxLength(200)]],
    description: [this.data.goal?.description ?? ''],
    targetValue: [this.data.goal?.targetValue ?? null as number | null],
    currentValue: [this.data.goal?.currentValue ?? 0],
    unit: [this.data.goal?.unit ?? ''],
    progress: [this.data.goal?.progress ?? 0, [Validators.min(0), Validators.max(100)]],
    priority: [(this.data.goal?.priority ?? 'MEDIUM') as GoalPriority],
    status: [(this.data.goal?.status ?? 'DRAFT') as GoalStatus],
    startDate: [this.toDateInput(this.data.goal?.startDate)],
    dueDate: [this.toDateInput(this.data.goal?.dueDate)],
  });

  constructor() {
    this.employeesApi.list({ page: 1, pageSize: 100, sortBy: 'lastName', sortDir: 'asc' }).subscribe({
      next: (res) => this.employees.set(res.items),
      error: () => this.employees.set([]),
    });
    if (this.isEdit) {
      this.form.controls.employeeId.disable();
    }
  }

  employeeLabel(emp: EmployeeListItem): string {
    return `${emp.firstName} ${emp.lastName} (${emp.employeeCode})`;
  }

  statusLabel(status: string): string {
    return this.api.statusLabel(status);
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body: Record<string, unknown> = {
      title: raw.title.trim(),
      description: raw.description.trim() || null,
      targetValue: raw.targetValue === null || raw.targetValue === ('' as unknown) ? null : Number(raw.targetValue),
      currentValue: Number(raw.currentValue) || 0,
      unit: raw.unit.trim() || null,
      progress: Number(raw.progress) || 0,
      priority: raw.priority,
      status: raw.status,
      startDate: raw.startDate ? new Date(raw.startDate).toISOString() : null,
      dueDate: raw.dueDate ? new Date(raw.dueDate).toISOString() : null,
    };
    if (!this.isEdit) {
      body['employeeId'] = raw.employeeId;
    }

    const request$ = this.data.goal
      ? this.api.updateGoal(this.data.goal.id, body)
      : this.api.createGoal(body);

    request$.subscribe({
      next: () => {
        this.toast.success(this.data.goal ? 'Goal updated' : 'Goal created');
        this.dialogRef.close(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast.error(err.message || 'Unable to save goal');
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
