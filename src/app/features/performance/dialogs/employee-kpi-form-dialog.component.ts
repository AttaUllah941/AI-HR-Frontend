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
  EmployeeKpi,
  PerformanceKpi,
  PerformanceService,
} from '../../../core/services/performance.service';
import { EmployeeListItem, EmployeeService } from '../../../core/services/employee.service';
import { ToastService } from '../../../core/services/toast.service';

export interface EmployeeKpiFormDialogData {
  assignment?: EmployeeKpi | null;
  year?: number;
  kpis?: PerformanceKpi[];
}

@Component({
  selector: 'app-employee-kpi-form-dialog',
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
  templateUrl: './employee-kpi-form-dialog.component.html',
  styleUrl: './employee-kpi-form-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class EmployeeKpiFormDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly api = inject(PerformanceService);
  private readonly employeesApi = inject(EmployeeService);
  private readonly toast = inject(ToastService);
  private readonly dialogRef = inject(MatDialogRef<EmployeeKpiFormDialogComponent, boolean>);
  readonly data = inject<EmployeeKpiFormDialogData>(MAT_DIALOG_DATA);

  readonly saving = signal(false);
  readonly isEdit = !!this.data.assignment;
  readonly employees = signal<EmployeeListItem[]>([]);
  readonly kpis = signal<PerformanceKpi[]>(this.data.kpis ?? []);
  readonly quarters = [1, 2, 3, 4];
  readonly currentYear = this.data.year ?? new Date().getFullYear();

  readonly form = this.fb.nonNullable.group({
    employeeId: [this.data.assignment?.employeeId ?? '', Validators.required],
    kpiId: [this.data.assignment?.kpiId ?? '', Validators.required],
    year: [this.data.assignment?.year ?? this.currentYear, Validators.required],
    quarter: [this.data.assignment?.quarter ?? null as number | null],
    targetValue: [this.data.assignment?.targetValue ?? 0, [Validators.min(0)]],
    actualValue: [this.data.assignment?.actualValue ?? 0, [Validators.min(0)]],
    score: [this.data.assignment?.score ?? null as number | null],
    notes: [this.data.assignment?.notes ?? ''],
  });

  constructor() {
    this.employeesApi.list({ page: 1, pageSize: 100, sortBy: 'lastName', sortDir: 'asc' }).subscribe({
      next: (res) => this.employees.set(res.items),
      error: () => this.employees.set([]),
    });
    if (!this.data.kpis?.length) {
      this.api.listKpis().subscribe({
        next: (items) => this.kpis.set(items.filter((k) => k.isActive)),
        error: () => this.kpis.set([]),
      });
    }
    if (this.isEdit) {
      this.form.controls.employeeId.disable();
      this.form.controls.kpiId.disable();
      this.form.controls.year.disable();
      this.form.controls.quarter.disable();
    }
  }

  employeeLabel(emp: EmployeeListItem): string {
    return `${emp.firstName} ${emp.lastName} (${emp.employeeCode})`;
  }

  submit(): void {
    if (this.form.invalid || this.saving()) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const raw = this.form.getRawValue();
    const body = {
      employeeId: raw.employeeId,
      kpiId: raw.kpiId,
      year: Number(raw.year),
      quarter: raw.quarter === null || raw.quarter === ('' as unknown) ? null : Number(raw.quarter),
      targetValue: Number(raw.targetValue) || 0,
      actualValue: Number(raw.actualValue) || 0,
      score: raw.score === null || raw.score === ('' as unknown) ? null : Number(raw.score),
      notes: raw.notes.trim() || null,
    };

    this.api.upsertEmployeeKpi(body).subscribe({
      next: () => {
        this.toast.success(this.isEdit ? 'Assignment updated' : 'KPI assigned');
        this.dialogRef.close(true);
      },
      error: (err: Error) => {
        this.saving.set(false);
        this.toast.error(err.message || 'Unable to save assignment');
      },
    });
  }
}
